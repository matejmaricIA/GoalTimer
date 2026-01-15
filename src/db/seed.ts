import { ActivityRepo } from '../repos/types';

const seedActivities = [
  { name: 'Thesis', color: '#2A9D8F', defaultGoalMinutes: 90 },
  { name: 'Reading', color: '#E76F51', defaultGoalMinutes: 45 },
  { name: 'Writing', color: '#264653', defaultGoalMinutes: 60 },
];

export const seedIfNeeded = async (activityRepo: ActivityRepo): Promise<void> => {
  const existing = await activityRepo.list();
  if (existing.length > 0) {
    return;
  }
  for (const seed of seedActivities) {
    await activityRepo.create(seed);
  }
};
