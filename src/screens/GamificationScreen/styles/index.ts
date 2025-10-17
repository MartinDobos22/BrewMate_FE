import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  levelText: { fontSize: 18, marginBottom: 10, textAlign: 'center' },
  progressBar: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: { height: '100%', backgroundColor: '#6B4423' },
  badgeGrid: { alignItems: 'center' },
  badge: { width: '30%', margin: '1.5%', alignItems: 'center' },
  badgeIcon: { fontSize: 32 },
  badgeText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', padding: 30, borderRadius: 10, alignItems: 'center' },
  modalEmoji: { fontSize: 48, marginBottom: 10 },
  modalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalBadgeTitle: { fontSize: 16 },
});
