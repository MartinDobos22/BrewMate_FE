/**
 * Generuje zoznam odporúčaných káv na základe preferencií používateľa.
 * @param {object} preferences - Preferencie používateľa.
 * @returns {Promise<Array>} Zoznam odporúčaní.
 */
export const generateRecommendations = async (preferences) => {
  const coffees = [
    { name: 'Colombia Geisha', rating: 4.8, match: 95, origin: 'Colombia' },
    { name: 'Ethiopia Yirgacheffe', rating: 4.6, match: 88, origin: 'Ethiopia' },
    { name: 'Brazil Santos', rating: 4.5, match: 82, origin: 'Brazil' },
    { name: 'Guatemala Antigua', rating: 4.7, match: 90, origin: 'Guatemala' },
    { name: 'Kenya AA', rating: 4.9, match: 93, origin: 'Kenya' },
  ];

  // Filtruj podľa preferencií ak existujú
  let filtered = coffees;
  if (preferences) {
    // Tu môžete pridať logiku filtrovania
  }

  return filtered.slice(0, 3).map((coffee) => ({
    id: Math.random().toString(),
    name: coffee.name,
    rating: coffee.rating,
    match: coffee.match,
    timestamp: new Date(),
    isRecommended: true,
  }));
};
