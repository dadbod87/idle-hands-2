export const ARRIVAL_STORIES = {
  transferred: {
    label: 'Office transfer',
    note: 'Transfer approved. The committee denies meeting.',
  },
  maker: {
    label: 'Independent maker',
    note: 'Your tools were approved. Nobody knows what they do.',
  },
  returning: {
    label: 'Returning local',
    note: 'Welcome back. We renamed three streets and little else.',
  },
} as const;

export type ArrivalStory = keyof typeof ARRIVAL_STORIES;

export function isArrivalStory(value: unknown): value is ArrivalStory {
  return typeof value === 'string' && Object.hasOwn(ARRIVAL_STORIES, value);
}
