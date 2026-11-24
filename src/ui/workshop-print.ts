import { WORKSHOP_PRINTS, type WorkshopPrint } from '../game/workshop-print.ts';

type Prints = { choose: (spot: WorkshopPrint | null) => boolean; visit: () => void; inWorkshop: () => boolean };

export class WorkshopPrintControls {
  readonly root = document.createElement('section');
  private readonly select = document.createElement('select');
  private readonly use = document.createElement('button');
  private readonly remove = document.createElement('button');
  private readonly visit = document.createElement('button');
  private readonly status = document.createElement('p');
  private readonly mounted = document.createElement('p');
  private readonly preview = document.createElement('img');
  private earned = '';

  constructor(private readonly actions: Prints) {
    this.root.className = 'river-print-controls';
    const title = document.createElement('h4');
    title.textContent = 'Workshop display';
    const label = document.createElement('label');
    this.select.id = 'river-print-choice';
    label.htmlFor = this.select.id;
    label.textContent = 'Choose a workshop print';
    this.use.type = this.remove.type = this.visit.type = 'button';
    this.use.textContent = 'Display print';
    this.remove.textContent = 'Take print down';
    this.visit.textContent = 'See it in the workshop';
    this.status.setAttribute('role', 'status');
    this.preview.alt = '';
    this.preview.width = 96;
    this.preview.height = 80;
    this.preview.loading = 'lazy';
    this.preview.className = 'workshop-print-preview';
    this.select.onchange = () => this.previewChoice();
    this.use.onclick = () => this.choose(this.select.value as WorkshopPrint);
    this.remove.onclick = () => this.choose(null);
    this.visit.onclick = actions.visit;
    const controls = document.createElement('div');
    controls.className = 'river-print-actions';
    controls.append(this.use, this.remove);
    this.root.append(title, this.mounted, label, this.select, this.preview, controls, this.status, this.visit);
  }

  private choose(spot: WorkshopPrint | null) {
    const saved = this.actions.choose(spot);
    this.status.textContent = saved ? spot ? 'Print displayed.' : 'Print taken down.' : 'The print change could not be saved.';
  }

  private previewChoice() {
    const print = WORKSHOP_PRINTS[this.select.value as WorkshopPrint];
    this.preview.hidden = !print;
    if (print && this.preview.getAttribute('src') !== print.art) this.preview.src = print.art;
  }

  update(recorded: readonly WorkshopPrint[], selected: WorkshopPrint | null) {
    const key = recorded.join(',');
    if (key !== this.earned) {
      this.earned = key;
      const current = this.select.value;
      this.select.replaceChildren(...recorded.map(spot => new Option(WORKSHOP_PRINTS[spot].name, spot)));
      if (recorded.some(spot => spot === current)) this.select.value = current;
      else if (selected) this.select.value = selected;
      this.previewChoice();
    }
    const mounted = selected ? 'On display · ' + WORKSHOP_PRINTS[selected].name : 'No print on display.';
    if (this.mounted.textContent !== mounted) this.mounted.textContent = mounted;
    if (this.remove.disabled === !!selected) this.remove.disabled = !selected;
    const showVisit = !!selected && !this.actions.inWorkshop();
    if (this.visit.hidden === showVisit) this.visit.hidden = !showVisit;
    if (this.use.disabled === !!recorded.length) this.use.disabled = !recorded.length;
  }
}
