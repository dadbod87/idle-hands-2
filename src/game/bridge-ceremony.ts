type BridgeObservation = {
 playerId: string;
 serverInstance?: string;
 serverTime: number;
 bridge: {
  restored: boolean;
  phase?: 'collecting'|'building'|'open';
  readyAt?: number|null;
  openedAt?: number|null;
  grandfathered?: boolean;
 };
 projectJournal?: Array<{kind: 'opened'|'grandfathered'; effectiveAt: number|null; recordedAt: number}>;
};

export const BRIDGE_CEREMONY_RECENCY_MS = 30_000;

/** A presentation cue for one freshly observed, recorded opening on the same resident/boot. */
export function freshBridgeOpening(previous: BridgeObservation|null, current: BridgeObservation): boolean {
 if (!previous?.serverInstance || previous.serverInstance!==current.serverInstance || previous.playerId!==current.playerId) return false;
 const now=current.serverTime,bridge=current.bridge,opened=bridge.openedAt;
 if (previous.bridge.phase!=='building'||previous.bridge.restored||bridge.phase!=='open'||!bridge.restored||
     bridge.grandfathered||typeof opened!=='number'||!Number.isSafeInteger(opened)||!Number.isSafeInteger(now)||
     previous.bridge.readyAt!==opened||bridge.readyAt!==opened||now<opened||
     now<previous.serverTime||now-opened>BRIDGE_CEREMONY_RECENCY_MS) return false;
 return current.projectJournal?.some(event=>event.kind==='opened'&&event.effectiveAt===opened&&
  event.recordedAt>=opened&&event.recordedAt<=now)??false;
}
