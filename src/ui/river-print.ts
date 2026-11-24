import { RIVER_SPOTS, type RiverSpot } from '../game/river-survey.ts';

type Prints = { choose: (spot: RiverSpot | null) => boolean; visit: () => void; inWorkshop: () => boolean };

export class RiverPrintControls {
  readonly root = document.createElement('section');
  private readonly select = document.createElement('select');
  private readonly use = document.createElement('button');
  private readonly remove = document.createElement('button');
  private readonly visit = document.createElement('button');
  private readonly status = document.createElement('p');
  private readonly mounted = document.createElement('p');
  private earned = '';

  constructor(private readonly actions: Prints) {
    this.root.className = 'river-print-controls';
    const title = document.createElement('h4');
    title.textContent = 'Workshop display';
    const label = document.createElement('label');
    this.select.id = 'river-print-choice';
    label.htmlFor = this.select.id;
    label.textContent = 'Choose a river print';
    this.use.type = this.remove.type = this.visit.type = 'button';
    this.use.textContent = 'Display print';
    this.remove.textContent = 'Take print down';
    this.visit.textContent = 'See it in the workshop';
    this.status.setAttribute('role', 'status');
    this.use.onclick = () => this.choose(this.select.value as RiverSpot);
    this.remove.onclick = () => this.choose(null);
    this.visit.onclick = actions.visit;
    const controls = document.createElement('div');
    controls.className = 'river-print-actions';
    controls.append(this.use, this.remove);
    this.root.append(title, this.mounted, label, this.select, controls, this.status, this.visit);
  }

  private choose(spot: RiverSpot | null) {
    const saved = this.actions.choose(spot);
    this.status.textContent = saved ? spot ? 'Print displayed.' : 'Print taken down.' : 'The print change could not be saved.';
  }

  update(recorded: readonly RiverSpot[], selected: RiverSpot | null) {
    const key = recorded.join(',');
    if (key !== this.earned) {
      this.earned = key;
      const current = this.select.value;
      this.select.replaceChildren(...recorded.map(spot => new Option(RIVER_SPOTS[spot].find, spot)));
      if (recorded.some(spot => spot === current)) this.select.value = current;
      else if (selected) this.select.value = selected;
    }
    const mounted = selected ? 'On display · ' + RIVER_SPOTS[selected].find : 'No print on display.';
    if (this.mounted.textContent !== mounted) this.mounted.textContent = mounted;
    if (this.remove.disabled === !!selected) this.remove.disabled = !selected;
    const showVisit = !!selected && !this.actions.inWorkshop();
    if (this.visit.hidden === showVisit) this.visit.hidden = !showVisit;
    if (this.use.disabled === !!recorded.length) this.use.disabled = !recorded.length;
  }
}
