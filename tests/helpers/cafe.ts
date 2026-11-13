import { createWorkshop } from '../../src/game/workshop.ts';
import { migrateCafeCandidate } from '../../src/game/cafe-candidate.ts';
export const CAFE_FIXTURE_AT = 1_700_000_000_000;
/** Conserved, isolated harvested-stock fixture; no game/server/save is modified. */
export function cafeFixture(stock = 12) {
  const old = createWorkshop(CAFE_FIXTURE_AT);
  old.garden.produce.radish = stock; old.garden.harvested.radish = stock;
  old.garden.planted = stock; old.garden.practice = stock; old.garden.firstRadishUsed = stock > 0;
  const result = migrateCafeCandidate(old);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}
