import { getBrewLogs } from './brewLogService';
import { BrewLog } from '../types/BrewLog';

/**
 * Exports brew log history to a CSV string for sharing or external analysis.
 *
 * @param {string} [recipeId] - Optional recipe identifier to filter logs; when
 * omitted all brew logs are exported.
 * @returns {Promise<string>} CSV content including headers and one row per log
 * with newline characters stripped from notes.
 * @throws {Error} Propagates failures from {@link getBrewLogs} or string
 * serialization issues.
 */
export const exportBrewLogsToCSV = async (recipeId?: string): Promise<string> => {
  const logs: BrewLog[] = await getBrewLogs(recipeId);
  const headers = [
    'date',
    'brewDevice',
    'waterTemp',
    'grindSize',
    'coffeeDose',
    'waterVolume',
    'brewTime',
    'notes',
  ];
  const rows = logs.map((log) =>
    [
      log.date,
      log.brewDevice,
      log.waterTemp,
      log.grindSize,
      log.coffeeDose,
      log.waterVolume,
      log.brewTime,
      log.notes?.replace(/\n/g, ' '),
    ].join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};
