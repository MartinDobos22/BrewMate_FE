import { getBrewLogs } from './brewLogService';
import { BrewLog } from '../types/BrewLog';

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
