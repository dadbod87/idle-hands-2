export const INKWOOD_HOOD = 'inkwood' as const;
export const CLERK_CAP = 'clerk' as const;
export const EARNED_HEADWEAR = [INKWOOD_HOOD, CLERK_CAP] as const;
export type EarnedHeadwear = typeof EARNED_HEADWEAR[number];
export type TownHeadwear = { owned: boolean; clerkOwned?: boolean; worn: EarnedHeadwear | null };

export function ownsHeadwear(headwear: TownHeadwear, item: EarnedHeadwear): boolean {
  return item === INKWOOD_HOOD ? headwear.owned : headwear.clerkOwned === true;
}

export function townHeadwear(hoodOwned: boolean, worn: unknown, clerkOwned: boolean): TownHeadwear {
  const wardrobe: TownHeadwear = { owned: hoodOwned, clerkOwned, worn: null };
  if ((worn === INKWOOD_HOOD || worn === CLERK_CAP) && ownsHeadwear(wardrobe, worn)) wardrobe.worn = worn;
  return wardrobe;
}
