export function fieldGuideContents(inside: boolean, shared: boolean, returnToSquare: boolean) {
  const workshopAction = returnToSquare ? 'Return to the square' : inside ? 'Inspect your bench' : 'Enter your workshop';
  return `
    <section class="guide-current" data-guide-objective>
      <h3 data-guide-title></h3>
      <div class="guide-actions">
        <button type="button" id="guide-places" class="destination primary" hidden>Find material depots&nbsp;→</button>
        <button type="button" id="guide-workshop" class="destination">${workshopAction}&nbsp;→</button>
        <button type="button" id="guide-journal" class="destination">Open Journal&nbsp;→</button>
      </div>
      <p data-guide-detail></p>
    </section>
    <details class="sky-notes">
      <summary>${shared ? 'Bridge and trail' : 'Your first planter'}</summary>
      ${shared ? `<div class="guide-restoration">
        <img src="/art/original/bridge-neglected.svg" alt="Bridge awaiting repair" loading="lazy">
        <span aria-hidden="true">→</span>
        <img src="/art/original/bridge-restored.svg" alt="Repaired bridge" loading="lazy">
      </div>
      <p>Fund the bridge together and give the builders six real hours. The Inkwood trail has three discoveries and a pennant to earn. Check your Journal for progress.</p>` :
      '<p>Collect materials at the three depots and make a planter on the bench. Open Bag to place it. Browser and shared practice save separately.</p>'}
    </details>`;
}
