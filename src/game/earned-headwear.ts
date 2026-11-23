export const INKWOOD_HOOD = 'inkwood' as const;
export type EarnedHeadwear = typeof INKWOOD_HOOD;
export type TownHeadwear = { owned: boolean; worn: EarnedHeadwear | null };

export function townHeadwear(owned: boolean, worn: unknown): TownHeadwear {
  return { owned, worn: owned && worn === INKWOOD_HOOD ? INKWOOD_HOOD : null };
}
