// Provisional kit costs aligned with the six-week pacing study; no passive income multiplier.
export const PLOT_CLAIM_KITS=12;
export const PLOT_UPGRADE_KITS=24;
// Paid one-time teaching task. It is separate from normal bench production and kit inventory.
export const MAINTENANCE_MS=60_000;
export const MAINTENANCE_COST={scrap:1,timber:1,supplies:1} as const;
// Agent-selected first construction deadline; cosmetic town time never changes real elapsed time.
export const BRIDGE_BUILD_MS=6*60*60*1000;
export const TRAIL_PENNANT_AWARD='trail-pennant-v1';
