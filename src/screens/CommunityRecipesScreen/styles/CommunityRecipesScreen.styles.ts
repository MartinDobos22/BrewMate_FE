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
  recipeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  recipeTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  recipeDevice: {
    color: '#666',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});
