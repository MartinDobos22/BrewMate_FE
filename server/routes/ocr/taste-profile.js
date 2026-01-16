const resolveTasteVector = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }
  if (profile.taste_vector && typeof profile.taste_vector === 'object') {
    return profile.taste_vector;
  }
  if (profile.preferences && typeof profile.preferences === 'object') {
    return profile.preferences;
  }
  return profile;
};

const formatTasteProfileSummary = (profile) => {
  const vector = resolveTasteVector(profile);
  if (!vector || typeof vector !== 'object') {
    return null;
  }
  const { sweetness, acidity, bitterness, body, intensity, experimentalism } = vector;
  const values = [sweetness, acidity, bitterness, body, intensity, experimentalism];
  if (!values.some((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null;
  }
  const formatValue = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? `${value}/10` : 'neznáme';
  const summaryBits = [
    `sladkosť ${formatValue(sweetness)}`,
    `acidita ${formatValue(acidity)}`,
    `horkosť ${formatValue(bitterness)}`,
    `telo ${formatValue(body)}`,
  ];
  if (intensity !== undefined && intensity !== null) {
    summaryBits.push(`intenzita ${formatValue(intensity)}`);
  }
  if (experimentalism !== undefined && experimentalism !== null) {
    summaryBits.push(`experimentalnosť ${formatValue(experimentalism)}`);
  }
  return summaryBits.join(', ');
};

// OCR evaluation uses the 4D core; extra taste dimensions are accepted but ignored here.
const isTasteProfileComplete = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return false;
  }

  if (profile.is_complete === true || profile.taste_profile_completed === true) {
    return true;
  }

  const tasteVector =
    profile.taste_vector && typeof profile.taste_vector === 'object'
      ? profile.taste_vector
      : profile.preferences && typeof profile.preferences === 'object'
      ? profile.preferences
      : profile;

  const values = [
    tasteVector.sweetness,
    tasteVector.acidity,
    tasteVector.bitterness,
    tasteVector.body,
  ];

  return values.every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10
  );
};

const normalizeTasteProfileForEvaluation = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return profile;
  }

  const tasteVector =
    profile.taste_vector && typeof profile.taste_vector === 'object'
      ? profile.taste_vector
      : profile.preferences && typeof profile.preferences === 'object'
      ? profile.preferences
      : null;

  return tasteVector ? { ...profile, ...tasteVector } : profile;
};

export {
  formatTasteProfileSummary,
  isTasteProfileComplete,
  normalizeTasteProfileForEvaluation,
  resolveTasteVector,
};
