import { StyleSheet } from 'react-native';

export const formStyles = StyleSheet.create({
  badge: { position: 'absolute', right: -6, bottom: -6 },
  // La couleur du texte dépend du thème : elle est ajoutée par le champ (`useColors().text`).
  inline: { fontSize: 16, padding: 0 },
  notes: { minHeight: 48, textAlignVertical: 'top' },
});
