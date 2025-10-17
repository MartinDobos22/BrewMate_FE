import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#2C2C2C',
  },
  retryButton: {
    backgroundColor: '#6B4423',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  tipCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  tipDate: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#EF5350',
    fontWeight: '600',
  },
});
