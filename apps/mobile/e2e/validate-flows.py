#!/usr/bin/env python3
"""Vérification statique des parcours Maestro (sans appareil) : python3 e2e/validate-flows.py depuis apps/mobile.

- chaque fichier YAML est bien formé : un en-tête (appId: ${MAESTRO_APP_ID}) puis une liste de commandes ;
- chaque parcours de e2e/flows commence par subflows/launch-clean.yaml (clearState) ;
- chaque runFlow pointe vers un fichier existant ;
- chaque sélecteur `id:` correspond à un testID présent dans src/ (littéral, ou préfixe suivi de « - »).
"""
import pathlib
import re
import sys

import yaml

E2E = pathlib.Path(__file__).resolve().parent
SRC = E2E.parent / 'src'
APP_ID = '${MAESTRO_APP_ID}'
LAUNCH = 'launch-clean.yaml'

# testID="a.b", testID={`a.b-${x}`}, testID: 'a.b', testID ? `${testID}-${o.key}` (préfixe déjà couvert par le littéral)
ID_LITERAL = re.compile(r"""testID(?:Prefix)?\s*[=:]\s*\{?\s*[`'"]([a-z0-9-]+\.[a-z0-9.-]*?)(?:\$\{|[`'"])""")
CANCEL_LITERAL = re.compile(r"""cancelTestID\s*=\s*"([a-z0-9-]+\.[a-z0-9-]+)\"""")


def known_ids() -> set[str]:
    ids: set[str] = set()
    for path in SRC.rglob('*.ts*'):
        text = path.read_text(encoding='utf-8')
        ids.update(ID_LITERAL.findall(text))
        ids.update(CANCEL_LITERAL.findall(text))
    return ids


def walk_ids(node, found: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'id' and isinstance(value, str):
                found.append(value)
            else:
                walk_ids(value, found)
    elif isinstance(node, list):
        for item in node:
            walk_ids(item, found)


def run_flow_files(node, found: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'runFlow':
                if isinstance(value, str):
                    found.append(value)
                elif isinstance(value, dict) and 'file' in value:
                    found.append(value['file'])
            run_flow_files(value, found)
    elif isinstance(node, list):
        for item in node:
            run_flow_files(item, found)


def id_exists(selector: str, ids: set[str]) -> bool:
    fixed = selector.split('${', 1)[0]
    if '${' not in selector and selector in ids:
        return True
    # Identifiant composé (`<préfixe>-<clé>`) ou paramétré par une variable Maestro.
    return any(fixed.startswith(f'{known}-') or (known.endswith('-') and fixed.startswith(known)) for known in ids)


def main() -> int:
    errors: list[str] = []
    ids = known_ids()
    files = sorted(E2E.rglob('*.yaml'))
    if not files:
        errors.append('aucun fichier .yaml dans e2e/')
    for path in files:
        rel = path.relative_to(E2E.parent)
        try:
            docs = list(yaml.safe_load_all(path.read_text(encoding='utf-8')))
        except yaml.YAMLError as error:
            errors.append(f'{rel}: YAML invalide : {error}')
            continue
        if len(docs) != 2 or not isinstance(docs[0], dict) or not isinstance(docs[1], list):
            errors.append(f'{rel}: attendu un en-tête puis une liste de commandes séparés par ---')
            continue
        header, commands = docs
        if header.get('appId') != APP_ID:
            errors.append(f'{rel}: appId doit valoir {APP_ID}')
        if path.parent.name == 'flows':
            first = commands[0] if commands else None
            target = first.get('runFlow') if isinstance(first, dict) else None
            target = target.get('file') if isinstance(target, dict) else target
            if not isinstance(target, str) or not target.endswith(LAUNCH):
                errors.append(f'{rel}: la première commande doit être runFlow {LAUNCH} (clearState)')
        refs: list[str] = []
        run_flow_files(commands, refs)
        for ref in refs:
            if not (path.parent / ref).resolve().is_file():
                errors.append(f'{rel}: runFlow introuvable : {ref}')
        selectors: list[str] = []
        walk_ids(commands, selectors)
        for selector in selectors:
            if not id_exists(selector, ids):
                errors.append(f'{rel}: testID inconnu dans src/ : {selector}')
        print(f'ok  {rel} ({len(commands)} commandes, {len(selectors)} sélecteurs id)')
    for error in errors:
        print(f'ERREUR  {error}', file=sys.stderr)
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
