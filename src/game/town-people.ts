import type {SharedObjective} from './shared-guidance.ts';
/** Authored fictional residents. Dialogue describes progress; it never mutates it. */
export type TownPersonId = 'clerk' | 'caretaker' | 'courier';
export type TownPerson = {
  id: TownPersonId;
  name: string;
  role: string;
  rig: 'aster' | 'bea' | 'casey';
  point: { x: number; y: number };
  doorArea: [number, number, number, number];
};
export const TOWN_PEOPLE: readonly TownPerson[] = [
  { id: 'clerk', name: 'Marlow', role: 'Town clerk', rig: 'aster', point: { x: 18, y: 24 }, doorArea: [17.9, 22.65, 1.2, 1.95] },
  { id: 'caretaker', name: 'Jun', role: 'Grounds caretaker', rig: 'bea', point: { x: 32, y: 24 }, doorArea: [31.9, 22.65, 1.2, 1.95] },
  { id: 'courier', name: 'Pip', role: 'Town courier', rig: 'casey', point: { x: 26, y: 25 }, doorArea: [25.9, 23.65, 1.2, 1.95] }
];
export type DialogueContext = {
  room: 'square' | 'workshop';
  questStage: 'gather' | 'craft' | 'place' | 'bridge' | 'complete';
  job: 'none' | 'planter' | 'bridge-kit';
  jobReady: boolean;
  bridgeRestored: boolean;
  guidance?:SharedObjective;
  bridgePhase?:'collecting'|'building'|'open';trailStamps?:number;pennantOwned?:boolean;maintenanceSatisfied?:boolean;
  shared: boolean;
  phase: string;
};
export type TownDialogue = {
  title: string;
  lines: string[];
  action?: { label: string; destination: 'workshop' | 'bench' | 'bridge' | 'journal' };
};
const journal = () => ({ label: 'Open journal', destination: 'journal' as const });
const bench = (context: DialogueContext) => context.room === 'workshop'
  ? { label: 'Walk to your bench', destination: 'bench' as const }
  : { label: 'Walk to your workshop', destination: 'workshop' as const };
const bridge = () => ({ label: 'Walk to the bridge committee', destination: 'bridge' as const });
function shiftGreeting(phase: string): string {
  if (phase === 'night') return 'Night shift. The moon has not submitted its timesheet.';
  if (phase === 'dawn' || phase === 'morning') return 'Morning rounds. The forms are fresh; the coffee is a historical document.';
  if (phase === 'dusk' || phase === 'evening') return 'Evening rounds. I am delivering tomorrow’s postponements ahead of schedule.';
  return 'Afternoon rounds. Every parcel is marked urgent, which is wonderfully unhelpful.';
}
export function dialogueFor(id: string, context: DialogueContext): TownDialogue | undefined {
  if (id === 'clerk') {
    const title = 'Marlow · Town clerk';
    if (context.job !== 'none' && context.jobReady) return {
      title,
      lines: ['Your bench has finished something. I have checked twice; this is apparently allowed.', 'Collect the finished job at the bench. It waits for you and will not start another job by itself.'],
      action: bench(context)
    };
    if (context.questStage === 'gather') return {
      title,
      lines: ['Welcome. Your orientation has been postponed until you are experienced.', 'Start with the scrap, timber and supply depots beside the square. Tap a depot to walk over and collect its available materials. Your journal lists the first recipe.'],
      action: journal()
    };
    if (context.questStage === 'craft') return {
      title,
      lines: context.job === 'planter'
        ? ['Your first planter is on the bench. A five-second apprenticeship; the certificate takes considerably longer.', 'Collect it when it is ready. Later planters take eight hours, so this quick lesson is a one-time introduction.']
        : ['Take your materials to the workshop bench and make your first planter.', 'The first planter takes five seconds. Later planters take eight hours. This is orientation, not an unlimited express lane.'],
      action: bench(context)
    };
    if (context.questStage === 'place') return {
      title,
      lines: ['A planter. Excellent. We now have evidence that something can be completed here.', 'Inside your workshop, open Bag, choose the planter and preview an empty nook. Confirm Place here when you are happy. Previewing, cancelling and moving furniture cost no materials.'],
      action: journal()
    };
    if(context.shared&&context.guidance)return{title,lines:[context.guidance.title+'. The memo has been stapled to itself.',context.guidance.detail],action:context.guidance.destination==='bridge'?bridge():context.guidance.destination==='bench'?bench(context):journal()};
    if (context.questStage === 'bridge') return {
      title,
      lines: context.shared?[context.maintenanceSatisfied?'Your participation is already recorded. Your next ordinary kit can go toward a home.':'The bench offers a once-only maintenance lesson: one of each material and sixty real seconds. It earns participation, not an inventory kit.','An ordinary kit takes twelve hours. Queue it at the bench, then return later to collect it. Keeping the game open does not make it finish sooner.']:['Your next bench recipe is a bridge repair kit. The committee has approved useful work in principle.', 'A kit takes twelve hours. Queue it at the bench, then return later to collect it. Keeping the game open does not make it finish sooner.'],
      action: bench(context)
    };
    if (context.job === 'bridge-kit') return {
      title,
      lines: ['The bridge kit is working. I have sent the committee a memo asking them not to supervise it.', 'This is a twelve-hour job, with no automatic repeats. It finishes while you are away and waits for collection at the bench. You can arrange your furnishings while you wait.'],
      action: journal()
    };
    return {
      title,
      lines: ['Orientation is complete. The paperwork remains aspirational.', 'Keep gathering, making and arranging your workshop. A queued job finishes while you are away and waits for you at the bench.'],
      action: journal()
    };
  }
  if (id === 'caretaker') {
    const title = 'Jun · Grounds caretaker';
    if (!context.shared) return {
      title,
      lines: ['I look after the grounds. The grounds have declined to provide a reference.', 'This bridge is only a preview in browser practice. To help repair the town’s bridge, use the shared town.', 'Your rented allotment grows radishes and marigolds. Nella’s free saw lesson opens fallen pine work. Shared practice keeps the separate bridge and trail; fruit harvesting is not open.'],
      action: context.questStage === 'gather' ? journal() : bridge()
    };
    if (context.bridgeRestored) return {
      title,
      lines: ['The bridge is repaired. I have framed the committee’s first accurate estimate.',context.pennantOwned?'Three field notes. One pennant. It waits for your home wall, which is now more qualified than most of the committee.':context.trailStamps?'You have '+context.trailStamps+' of three field notes. The Inkwood trail has a stump, an old sign and a birdwatching board left to investigate.':'The Inkwood trail is open. Inspect its stump, retired sign and birdwatching board; your own field notebook earns a home pennant.'],
      action: bridge()
    };
    if(context.bridgePhase==='building')return{title,lines:['The materials are funded. Now the crew must build the part that is not paperwork.','The committee shows a fixed six-hour construction deadline. It keeps running while you are away; extra donations cannot restart or shorten it.'],action:bridge()};
    if (context.job === 'bridge-kit' && !context.jobReady) return {
      title,
      lines: ['Your repair kit needs its twelve hours at the bench. The bridge is not going anywhere. That is part of the problem.', 'Once the kit is finished, collect it and bring it to the bridge committee. You can leave it working while you are away.'],
      action: bench(context)
    };
    return {
      title,
      lines: ['It takes three repair credits to fund this bridge. A finished kit counts as one, or your once-only paid maintenance lesson can help.', context.jobReady
        ? 'Your bench has finished work. Collect it before bringing a kit to the committee.'
        : 'If you have a completed kit, take it to the bridge committee. If not, your workshop bench lists the recipe. The committee accepts materials, not enthusiasm.'],
      action: context.jobReady ? bench(context) : bridge()
    };
  }
  if(id==='cafe')return{title:'The Almost Open Café',lines:['The menu has passed its review. The kitchen has requested a second opinion. No shop or indoor service is open yet.',context.shared&&context.guidance?context.guidance.detail:'The three square depots hold scrap, timber and supplies. Your workshop bench makes a first planter in five seconds; later work uses real hours.','Town time changes the light, not your production. There is no attendance window or penalty for leaving your work here.'],action:context.shared&&context.guidance?(context.guidance.destination==='bridge'?bridge():context.guidance.destination==='bench'?bench(context):journal()):bench(context)};
  if (id === 'courier') return {
    title: 'Pip · Town courier',
    lines: [shiftGreeting(context.phase), 'Officially, I deliver the post. Unofficially, opinions travel faster.',
      context.shared
        ? 'Weekly scores start fresh, but your inventory, queued job and decoration stay with you.'
        : 'Browser practice and the shared town have separate saves; your practice work stays in this browser.',
      context.shared?'Your earned home and workroom can be visited. Trail discoveries add a pennant. My optional addressed route and letterbox plan are available now; wider shops are not.':'Housing belongs to the separate shared town; the sample house in the art study is not ready to visit. Here, your browser keeps your workshop, allotment, pine work and my optional addressed route. Shops are not open.'],
    action: context.questStage === 'place' ? journal() : bench(context)
  };
  return undefined;
}
