/** Group a newest-first list of dated items into "Today / Yesterday / weekday / date" sections. */

export type DaySection<T> = {title: string; data: T[]};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

export function dayLabel(date: Date, now: Date = new Date()): string {
  if (Number.isNaN(date.getTime())) {
    return 'Earlier';
  }
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, {weekday: 'long'});
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? {month: 'long', day: 'numeric'} : {month: 'long', day: 'numeric', year: 'numeric'});
}

export function groupByDay<T extends {timestamp: string}>(items: T[], now: Date = new Date()): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  for (const item of items) {
    const title = dayLabel(new Date(item.timestamp), now);
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.data.push(item);
    } else {
      sections.push({title, data: [item]});
    }
  }
  return sections;
}
