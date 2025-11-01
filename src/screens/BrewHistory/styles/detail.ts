import { StyleSheet } from 'react-native';

export const detailStyles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: '#F6F4F1',
  },
  heroCard: {
    backgroundColor: '#2F2D2A',
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D6CBBF',
    marginBottom: 6,
  },
  heroMeta: {
    fontSize: 14,
    color: '#E9E4DC',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#3C342B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F6F4F1',
    borderRadius: 12,
    padding: 14,
  },
  metricCardSpacer: {
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B6F64',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F2D2A',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  timelineBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B4423',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineIndex: {
    color: '#FFF',
    fontWeight: '700',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C342B',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#51453A',
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: '#4C4137',
    lineHeight: 20,
  },
});
