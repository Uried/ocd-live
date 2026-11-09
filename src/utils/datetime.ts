export const LOME_TIME_ZONE = 'Africa/Lome';

const pad = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateKey = (key: string) => {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDaysToKey = (key: string, days: number) => {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

export function lomeNowParts(): { dateKey: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LOME_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return { dateKey: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

export function addMinutesToTime(time: string, minutes: number): { end: string; endDateOffset: number } {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return { end: `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`, endDateOffset: Math.floor(total / 1440) };
}

export function slotIsPast(dateKey: string, time: string): boolean {
  const now = lomeNowParts();
  return dateKey < now.dateKey || (dateKey === now.dateKey && time < now.time);
}

export function timeToMinutes(time: string): number {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
}
