#!/usr/bin/env bash
# Lance les parcours Maestro sur un émulateur (ou un appareil de test explicitement autorisé).
# Usage, depuis apps/mobile : E2E_DEVICE=emulator-5554 MAESTRO_APP_ID=fr.smatou.abonnements e2e/run.sh [fichier ou dossier]
# Les parcours commencent par clearState : toutes les données de l'app sur l'appareil ciblé sont effacées.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
target="${1:-$here/flows}"

: "${MAESTRO_APP_ID:?Définir MAESTRO_APP_ID (paquet de l'APK installé, ex. fr.smatou.abonnements)}"
: "${E2E_DEVICE:?Définir E2E_DEVICE (numéro de série adb de l'émulateur, ex. emulator-5554)}"

if [[ "$MAESTRO_APP_ID" == "host.exp.exponent" ]]; then
  echo "Refusé : clearState sur Expo Go effacerait Expo Go lui-même. Installer un APK (release ou development build)." >&2
  exit 1
fi
if [[ "$E2E_DEVICE" != emulator-* && "${E2E_ALLOW_PHYSICAL:-0}" != "1" ]]; then
  echo "Refusé : $E2E_DEVICE n'est pas un émulateur. Sur un appareil de test SANS données réelles : E2E_ALLOW_PHYSICAL=1." >&2
  exit 1
fi

python3 -I "$here/validate-flows.py"
export MAESTRO_APP_ID
exec maestro --device "$E2E_DEVICE" test "$target"
