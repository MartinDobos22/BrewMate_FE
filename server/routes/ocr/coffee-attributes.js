const BRANDED_COFFEE_ALLOWLIST = ['Lavazza', 'Illy', 'Segafredo', 'Kimbo', 'Pellini', 'Bazzara'];

const normalizeCoffeeValue = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
};

const parseDelimitedList = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const items = value
    .split(/[,;|/]+/)
    .map((item) => item.replace(/[()\[\]]/g, '').trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
};

const extractCoffeeAttributesFromText = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      origin: null,
      roast_level: null,
      flavor_notes: null,
      processing: null,
      varietals: null,
      brand: null,
      keywords: null,
    };
  }

  const normalizedText = text.replace(/\r/g, '');
  const lowerText = normalizedText.toLowerCase();

  const extractLabelValue = (labels) => {
    for (const label of labels) {
      const regex = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n]+)`, 'i');
      const match = normalizedText.match(regex);
      if (match && match[1]) {
        return normalizeCoffeeValue(match[1]);
      }
    }
    return null;
  };

  const origin = extractLabelValue(['origin', 'pôvod', 'povod', 'country', 'region']) || null;
  const flavorNotesRaw = extractLabelValue([
    'flavor notes',
    'flavour notes',
    'tóny',
    'chut',
    'notes',
  ]);
  const varietalsRaw = extractLabelValue([
    'varietal',
    'varietals',
    'variety',
    'odroda',
    'odrody',
  ]);

  const processingKeywords = [
    { label: 'washed', keywords: ['washed', 'fully washed', 'wet process', 'mokre'] },
    { label: 'natural', keywords: ['natural', 'dry process', 'sušené', 'susene'] },
    { label: 'honey', keywords: ['honey', 'honey process', 'pulped natural'] },
    { label: 'anaerobic', keywords: ['anaerobic', 'anaeróbne', 'anaerobne'] },
    { label: 'semi-washed', keywords: ['semi-washed', 'semi washed', 'wet hulled'] },
    { label: 'carbonic maceration', keywords: ['carbonic', 'maceration'] },
  ];
  const processingKeywordMatch = processingKeywords.find(({ keywords }) =>
    keywords.some((keyword) => lowerText.includes(keyword))
  );
  const processing =
    extractLabelValue(['processing', 'process', 'spracovanie']) ||
    processingKeywordMatch?.label ||
    null;

  const roastLevelRaw = extractLabelValue(['roast', 'praženie', 'prazenie']);
  const roastLevelKeywords = [
    { label: 'light', keywords: ['light', 'svetla', 'cinnamon', 'blonde'] },
    { label: 'medium', keywords: ['medium', 'stredna', 'city'] },
    { label: 'medium-dark', keywords: ['medium-dark', 'medium dark', 'full city'] },
    { label: 'dark', keywords: ['dark', 'tmava', 'french', 'italian', 'espresso'] },
  ];
  const roastKeywordMatch = roastLevelKeywords.find(({ keywords }) =>
    keywords.some((keyword) => lowerText.includes(keyword))
  );
  const roastLevel =
    normalizeCoffeeValue(roastLevelRaw) ||
    roastKeywordMatch?.label ||
    null;

  const brandRaw = extractLabelValue([
    'brand',
    'roaster',
    'roastery',
    'roaster name',
    'pražiareň',
    'praziaren',
  ]);
  const brandAllowlistMatch = BRANDED_COFFEE_ALLOWLIST.find((brandName) =>
    lowerText.includes(brandName.toLowerCase())
  );
  const brand = normalizeCoffeeValue(brandRaw || brandAllowlistMatch);

  const keywordMatches = [
    roastKeywordMatch?.label,
    processingKeywordMatch?.label,
    brandAllowlistMatch ? `brand:${brandAllowlistMatch}` : null,
    lowerText.includes('single origin') ? 'single origin' : null,
    lowerText.includes('blend') ? 'blend' : null,
    lowerText.includes('arabica') ? 'arabica' : null,
    lowerText.includes('robusta') ? 'robusta' : null,
    lowerText.includes('espresso') ? 'espresso' : null,
    lowerText.includes('filter') ? 'filter' : null,
  ].filter(Boolean);

  return {
    origin,
    roast_level: roastLevel,
    flavor_notes: flavorNotesRaw ? parseDelimitedList(flavorNotesRaw) : null,
    processing: normalizeCoffeeValue(processing),
    varietals: varietalsRaw ? parseDelimitedList(varietalsRaw) : null,
    brand,
    keywords: keywordMatches.length > 0 ? keywordMatches : null,
  };
};

const formatCoffeeAttributesSummary = (attributes) => {
  if (!attributes || typeof attributes !== 'object') {
    return null;
  }
  const structured =
    attributes.structured_metadata && typeof attributes.structured_metadata === 'object'
      ? attributes.structured_metadata
      : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);

  const origin = getValue(attributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(attributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const processing =
    getValue(attributes, ['processing']) ?? getValue(structured, ['processing']);
  const roaster =
    getValue(attributes, ['roaster', 'roastery', 'brand']) ??
    getValue(structured, ['roaster', 'roastery', 'brand']);
  const flavorNotes =
    getValue(attributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const varietals =
    getValue(attributes, ['varietals']) ?? getValue(structured, ['varietals']);

  const summaryBits = [
    origin ? `pôvod ${origin}` : null,
    roastLevel ? `praženie ${roastLevel}` : null,
    processing ? `spracovanie ${processing}` : null,
    roaster ? `pražiareň ${roaster}` : null,
    Array.isArray(flavorNotes) && flavorNotes.length > 0
      ? `tóny ${flavorNotes.join(', ')}`
      : typeof flavorNotes === 'string' && flavorNotes.trim().length > 0
      ? `tóny ${flavorNotes}`
      : null,
    Array.isArray(varietals) && varietals.length > 0
      ? `odrody ${varietals.join(', ')}`
      : typeof varietals === 'string' && varietals.trim().length > 0
      ? `odrody ${varietals}`
      : null,
  ].filter(Boolean);

  return summaryBits.length > 0 ? summaryBits.join(', ') : null;
};

const hasMeaningfulCoffeeData = (coffeeAttributes) => {
  if (!coffeeAttributes || typeof coffeeAttributes !== 'object') {
    return false;
  }

  const { structured_metadata } = coffeeAttributes;
  const structured =
    structured_metadata && typeof structured_metadata === 'object' ? structured_metadata : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);
  const hasValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  };

  const origin = getValue(coffeeAttributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(coffeeAttributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const flavorNotes =
    getValue(coffeeAttributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const processing =
    getValue(coffeeAttributes, ['processing']) ?? getValue(structured, ['processing']);
  const varietals =
    getValue(coffeeAttributes, ['varietals']) ?? getValue(structured, ['varietals']);
  const brand =
    getValue(coffeeAttributes, ['brand', 'roaster', 'roastery', 'roaster_name']) ??
    getValue(structured, ['brand', 'roaster', 'roastery', 'roaster_name']);
  const keywords =
    getValue(coffeeAttributes, ['keywords']) ?? getValue(structured, ['keywords']);

  const hasCoreProfileDetails = [origin, flavorNotes, varietals].some(hasValue);
  const hasRoastOrProcessing = [roastLevel, processing].some(hasValue);
  const brandLabel = typeof brand === 'string' ? brand.trim().toLowerCase() : '';
  const isAllowlistedBrand = BRANDED_COFFEE_ALLOWLIST.some((allowed) =>
    brandLabel.includes(allowed.toLowerCase())
  );
  const hasKeywordSignals = Array.isArray(keywords) && keywords.length > 0;
  const hasBrandSignal = hasValue(brand);

  // Require structured attributes before AI evaluation.
  // Allow recognized brands with roast/processing data to pass the check.
  return (
    hasCoreProfileDetails ||
    hasRoastOrProcessing ||
    hasKeywordSignals ||
    (isAllowlistedBrand && hasRoastOrProcessing) ||
    hasBrandSignal
  );
};

const isMinimumCoffeeData = (coffeeAttributes) => {
  if (!coffeeAttributes || typeof coffeeAttributes !== 'object') {
    return false;
  }

  const { structured_metadata } = coffeeAttributes;
  const structured =
    structured_metadata && typeof structured_metadata === 'object' ? structured_metadata : {};

  const getValue = (record, keys) =>
    keys.reduce((acc, key) => (acc !== undefined ? acc : record?.[key]), undefined);
  const hasValue = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  };

  const origin = getValue(coffeeAttributes, ['origin']) ?? getValue(structured, ['origin']);
  const roastLevel =
    getValue(coffeeAttributes, ['roast_level', 'roastLevel']) ??
    getValue(structured, ['roast_level', 'roastLevel']);
  const flavorNotes =
    getValue(coffeeAttributes, ['flavor_notes', 'flavorNotes']) ??
    getValue(structured, ['flavor_notes', 'flavorNotes']);
  const processing =
    getValue(coffeeAttributes, ['processing']) ?? getValue(structured, ['processing']);
  const varietals =
    getValue(coffeeAttributes, ['varietals']) ?? getValue(structured, ['varietals']);

  const hasCoreProfileDetails = [origin, flavorNotes, varietals].some(hasValue);
  const hasRoastOrProcessing = [roastLevel, processing].some(hasValue);

  return hasRoastOrProcessing && !hasCoreProfileDetails;
};

export {
  BRANDED_COFFEE_ALLOWLIST,
  extractCoffeeAttributesFromText,
  formatCoffeeAttributesSummary,
  hasMeaningfulCoffeeData,
  isMinimumCoffeeData,
  normalizeCoffeeValue,
  parseDelimitedList,
};
