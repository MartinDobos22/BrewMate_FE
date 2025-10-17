import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  actionsRow: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  addButton: {
    backgroundColor: '#6B4423',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: { color: 'white', fontWeight: '600' },
  filters: { flexDirection: 'row', marginBottom: 12 },
  devicePicker: { flex: 1 },
  dateInput: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginLeft: 8, flex: 1 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  itemTitle: { fontWeight: 'bold' },
  notes: { fontStyle: 'italic' },
});
