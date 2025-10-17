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
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  devicePicker: {
    flex: 1,
    height: 44,
  },
  dateInput: {
    width: 120,
    height: 44,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  item: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  notes: {
    marginTop: 8,
    color: '#666',
  },
});
