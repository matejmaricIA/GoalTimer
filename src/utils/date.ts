const pad = (value: number) => value.toString().padStart(2, '0');

export const toDateKey = (input: Date | number): string => {
  const date = typeof input === 'number' ? new Date(input) : input;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const fromDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map((value) => Number(value));
  return new Date(year, month - 1, day);
};

export const startOfDayTs = (input: Date | number | string): number => {
  const date = typeof input === 'string' ? fromDateKey(input) : new Date(input);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  return start.getTime();
};

export const endOfDayTs = (input: Date | number | string): number => {
  const date = typeof input === 'string' ? fromDateKey(input) : new Date(input);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return end.getTime();
};

export const getDatesBetween = (startTs: number, endTs: number): string[] => {
  const dates: string[] = [];
  const start = startOfDayTs(startTs);
  const end = startOfDayTs(endTs);
  for (let ts = start; ts <= end; ts += 24 * 60 * 60 * 1000) {
    dates.push(toDateKey(ts));
  }
  return dates;
};

export const formatTime = (input: Date | number): string => {
  const date = typeof input === 'number' ? new Date(input) : input;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateShort = (input: Date | number | string): string => {
  const date = typeof input === 'string' ? fromDateKey(input) : new Date(input);
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

export const addDays = (input: string | number | Date, offset: number): string => {
  const date = typeof input === 'string' ? fromDateKey(input) : new Date(input);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
  return toDateKey(next);
};

export const getDateKeysInRange = (startKey: string, endKey: string): string[] => {
  const startTs = startOfDayTs(startKey);
  const endTs = startOfDayTs(endKey);
  return getDatesBetween(startTs, endTs);
};

export const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m`;
  }
  return `${minutes}m ${pad(seconds)}s`;
};

export const minutesFromMs = (ms: number): number => Math.floor(ms / 60000);

export const secondsFromMs = (ms: number): number => Math.floor(ms / 1000);
