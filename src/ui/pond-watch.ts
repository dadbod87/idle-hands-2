import {completePondWatch, POND_WATCH, POND_WATCH_IDS, pondSubjects, type PondWatch, type PondWatchId} from '../game/pond-watch.ts';
import './pond-watch.css';

type Host = {
  read: () => PondWatch | null;
  save: (id:PondWatchId, choice:string, active:()=>boolean) => Promise<string>;
  walk: (id:string) => void;
  previewPrint: () => void;
};

export function mountPondWatch(body: HTMLElement, host: Host, current?: PondWatchId) {
  const surface = document.createElement('section');
  surface.className = 'pond-watch';
  body.append(surface);
  const status = document.createElement('p');
  status.className = 'pond-watch-status';
  status.role = 'status';
  status.tabIndex = -1;
  const progress = document.createElement('p');
  progress.className = 'pond-watch-progress';
  const observation = document.createElement('div');
  const routes = document.createElement('div');
  routes.className = 'pond-watch-routes';
  const button = (text:string, action:()=>void) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'destination';
    control.textContent = text;
    control.onclick = action;
    return control;
  };
  const paragraph = (text:string) => {
    const item = document.createElement('p');
    item.textContent = text;
    return item;
  };
  function render() {
    const record = host.read();
    progress.textContent = record ? record.recorded.length+' of 3 observations saved' : 'The saved field notes could not be read.';
    if (current) {
      const spot = POND_WATCH[current];
      const art = document.createElement('img');
      art.alt = '';
      art.src = spot.art;
      art.width = 176;
      art.height = 105;
      const clue = paragraph(spot.clue);
      const study = document.createElement('div');
      study.className = 'pond-watch-study';
      study.append(art,clue);
      observation.replaceChildren(study);
      if (record?.recorded.includes(current)) observation.append(paragraph(spot.note));
      else if (record) {
        const options = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = 'What left this clue?';
        options.append(legend);
        for (const choice of pondSubjects) {
          options.append(button(choice,()=>void choose(current,choice,options)));
        }
        observation.append(options);
      }
    } else {
      const heading = document.createElement('h3');
      heading.textContent = 'Pond field walk';
      observation.replaceChildren(heading,paragraph('Three shores, three signs of life. Look closely and record what you find.'));
    }
    routes.replaceChildren();
    if (record) {
      const done = completePondWatch(record);
      if (done) routes.append(button('Preview your pond print',host.previewPrint));
      const others = POND_WATCH_IDS.filter(id=>id!==current);
      const unfinished = others.filter(id=>!record.recorded.includes(id));
      for (const id of current&&unfinished.length ? unfinished : others) {
        const spot = POND_WATCH[id];
        const saved = record.recorded.includes(id);
        routes.append(button((saved?'Revisit ':'Walk to ')+spot.name+(saved?' · recorded':''),()=>host.walk(id)));
      }
    }
    if (current) routes.append(button('Back to the pond sign',()=>host.walk('commons-pond')));
  }
  async function choose(id:PondWatchId, choice:string, options:HTMLFieldSetElement) {
    options.disabled = true;
    try {
      const message = await host.save(id,choice,()=>surface.isConnected&&surface.closest('dialog')?.open===true);
      if (!surface.isConnected) return;
      status.textContent = message;
      if (host.read()?.recorded.includes(id)) render();
      status.focus({preventScroll:true});
      const dialog = status.closest('dialog');
      const header = dialog?.querySelector('.dialog-head');
      const route = routes.querySelector('button');
      if (dialog && header) {
        const top = header.getBoundingClientRect().bottom + 8;
        const statusBounds = status.getBoundingClientRect();
        const bottom = dialog.getBoundingClientRect().bottom - 12;
        const following = route?.getBoundingClientRect().bottom ?? statusBounds.bottom;
        if (following-statusBounds.top<=bottom-top&&following>bottom) dialog.scrollTop += following-bottom;
        else if (statusBounds.bottom>bottom) dialog.scrollTop += statusBounds.bottom-bottom;
        if (status.getBoundingClientRect().top<top) dialog.scrollTop += status.getBoundingClientRect().top-top;
      }
    } finally {
      options.disabled = false;
    }
  }
  surface.append(progress,observation,status,routes);
  render();
}
