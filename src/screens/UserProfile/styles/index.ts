import { StyleSheet } from 'react-native';
import { BOTTOM_NAV_CONTENT_OFFSET } from '../../../components/navigation/BottomNav';
import { getSafeAreaBottom, getSafeAreaTop, scale, verticalScale } from '../../../components/utils/safeArea';

export const palette = {
  espresso: '#2C1810',
  darkRoast: '#3E2723',
  medium: '#6B4C3A',
  mocha: '#8D6E63',
  latte: '#A67C52',
  caramel: '#C8A882',
  cream: '#F5DDD0',
  foam: '#FFF8F4',
  accentGold: '#FFB300',
  accentAmber: '#FFA000',
  accentOrange: '#FF8C42',
  accentCoral: '#FF6B6B',
  accentMint: '#7FB069',
  accentPurple: '#9C27B0',
};

const cardShadow = {
  shadowColor: 'rgba(44, 24, 16, 0.18)',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 12,
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.foam,
  },
  content: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    paddingTop: getSafeAreaTop(),
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(18),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
    borderRadius: scale(26),
    backgroundColor: 'rgba(255, 248, 244, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    ...cardShadow,
  },
  iconButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(14),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  iconButtonGhost: {
    opacity: 0,
  },
  iconButtonText: {
    color: palette.espresso,
    fontSize: scale(18),
    fontWeight: '700',
  },
  headerTitle: {
    color: palette.espresso,
    fontSize: scale(18),
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom:
      getSafeAreaBottom() + BOTTOM_NAV_CONTENT_OFFSET + verticalScale(24),
  },
  card: {
    borderRadius: scale(28),
    padding: scale(20),
    backgroundColor: '#FFFFFF',
    marginBottom: verticalScale(18),
    ...cardShadow,
  },
  profileCard: {
    alignItems: 'center',
    paddingTop: verticalScale(28),
    overflow: 'hidden',
  },
  avatarRing: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    bottom: -scale(90),
    left: -scale(70),
  },
  avatarWrapper: {
    borderRadius: scale(60),
    padding: scale(4),
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: verticalScale(14),
  },
  avatar: {
    width: scale(108),
    height: scale(108),
    borderRadius: scale(54),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: scale(32),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: scale(22),
    fontWeight: '800',
    color: palette.espresso,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: scale(13),
    color: '#6B6B6B',
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  levelBadge: {
    marginTop: verticalScale(12),
    borderRadius: scale(999),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(12),
  },
  tasteCard: {
    width: '100%',
    marginTop: verticalScale(20),
    backgroundColor: '#FFF8F4',
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    padding: scale(16),
  },
  tasteTitle: {
    fontSize: scale(14),
    fontWeight: '700',
    color: palette.espresso,
    marginBottom: verticalScale(12),
  },
  radarWrapper: {
    alignItems: 'center',
  },
  emptyTasteText: {
    fontSize: scale(12),
    color: '#6B6B6B',
    lineHeight: verticalScale(18),
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(20),
  },
  actionCard: {
    flex: 1,
  },
  actionCardFirst: {
    marginRight: scale(12),
  },
  actionInner: {
    borderRadius: scale(20),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  actionInnerPrimary: {
    borderRadius: scale(20),
  },
  actionInnerSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.35)',
  },
  actionIcon: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  actionIconSecondary: {
    backgroundColor: 'rgba(107, 68, 35, 0.08)',
  },
  actionIconText: {
    fontSize: scale(22),
  },
  actionText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: palette.espresso,
  },
  actionTextPrimary: {
    color: '#FFFFFF',
  },
  sectionCard: {
    paddingBottom: verticalScale(10),
  },
  sectionTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: palette.espresso,
    marginBottom: verticalScale(12),
  },
  sectionDescription: {
    fontSize: scale(12),
    color: '#6B6B6B',
    marginBottom: verticalScale(12),
    lineHeight: verticalScale(18),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAF7F5',
    borderRadius: scale(16),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginHorizontal: scale(4),
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
  },
  statEmoji: {
    fontSize: scale(22),
    marginBottom: verticalScale(6),
  },
  statValue: {
    fontSize: scale(14),
    fontWeight: '700',
    color: palette.medium,
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: scale(11),
    color: '#6B6B6B',
  },
  aiCard: {
    paddingBottom: verticalScale(18),
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  aiTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: palette.espresso,
  },
  aiRefreshButton: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 168, 130, 0.2)',
  },
  aiRefreshText: {
    fontSize: scale(16),
  },
  tipCard: {
    padding: scale(20),
    borderRadius: scale(26),
  },
  tipTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: verticalScale(8),
  },
  tipText: {
    fontSize: scale(13),
    color: '#FFFFFF',
    lineHeight: verticalScale(20),
  },
  dataCard: {
    paddingBottom: verticalScale(18),
  },
  primaryButton: {
    backgroundColor: palette.espresso,
    borderRadius: scale(18),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(13),
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  dangerButton: {
    backgroundColor: '#C62828',
  },
  dataConsentHint: {
    fontSize: scale(11),
    color: '#7A6957',
    marginTop: verticalScale(12),
    lineHeight: verticalScale(16),
  },
  signOutCard: {
    paddingVertical: verticalScale(18),
  },
  signOutButton: {
    width: '100%',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  statusCard: {
    backgroundColor: 'rgba(255, 248, 244, 0.95)',
    borderRadius: scale(26),
    padding: scale(28),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 130, 0.25)',
    ...cardShadow,
  },
  statusText: {
    fontSize: scale(14),
    color: palette.medium,
    textAlign: 'center',
    marginTop: verticalScale(12),
    lineHeight: verticalScale(20),
  },
  statusEmoji: {
    fontSize: scale(48),
  },
  statusButton: {
    marginTop: verticalScale(20),
    backgroundColor: palette.espresso,
    borderRadius: scale(18),
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(12),
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: scale(13),
  },
});



