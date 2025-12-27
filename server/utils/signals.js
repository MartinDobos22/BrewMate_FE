export const normalizeSignalRow = (row) => ({
  id: row.coffee_id,
  name: row.coffee_name,
  scans: Number(row.scans) || 0,
  repeats: Number(row.repeats) || 0,
  favorites: Number(row.favorites) || 0,
  ignores: Number(row.ignores) || 0,
  consumed: Number(row.consumed) || 0,
  lastFeedback: row.last_feedback || null,
  lastFeedbackReason: row.last_feedback_reason || null,
  lastSeen: row.last_seen,
  updatedAt: row.updated_at,
  version: Number(row.version) || 0,
});

export const applySignalEvent = (current, payload) => {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const next = {
    ...current,
    coffee_name: payload.coffeeName || current.coffee_name || 'Neznáma káva',
    last_seen: timestamp,
    updated_at: timestamp,
    version: (current.version || 0) + 1,
  };

  switch (payload.event) {
    case 'scan': {
      const scans = (current.scans || 0) + 1;
      next.scans = scans;
      next.repeats = scans > 1 ? (current.repeats || 0) + 1 : current.repeats || 0;
      break;
    }
    case 'ignore':
      next.ignores = (current.ignores || 0) + 1;
      break;
    case 'favorite':
      if (payload.isFavorite) {
        next.favorites = (current.favorites || 0) + 1;
      }
      break;
    case 'consumption':
      next.consumed = (current.consumed || 0) + 1;
      break;
    case 'feedback':
      next.last_feedback = payload.feedback || null;
      next.last_feedback_reason = payload.feedbackReason || null;
      break;
    default:
      break;
  }

  return next;
};
