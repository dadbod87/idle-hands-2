import type {TownClient} from './town-client.ts';

type Host = {
  open: (title: string) => void;
  body: HTMLElement;
  walk: () => void;
};

export function showCafeParcelNote(host: Host, town: Pick<TownClient, 'snackShelf' | 'serverNow'>) {
  host.open('Café parcels');
  const dialog = host.body.closest('dialog');
  const note = document.createElement('section');
  note.className = 'quest-card';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const walk = document.createElement('button');
  walk.type = 'button';
  walk.className = 'destination';
  walk.textContent = 'Walk to the café';
  walk.addEventListener('click', host.walk);

  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'destination';
  check.textContent = 'Check again';
  const read = async () => {
    check.disabled = true;
    status.textContent = 'Checking the parcel shelf…';
    try {
      const shelf = await town.snackShelf();
      if (!dialog?.open || !note.isConnected) return;
      const now = Math.max(shelf.serverTime, town.serverNow());
      const waiting = shelf.incoming.filter(parcel => parcel.expiresAt > now).length;
      const message = waiting === 1 ? 'One snack was waiting for you.'
        : waiting > 1 ? `${waiting} snacks were waiting for you.`
        : 'No snacks were waiting for you.';
      status.textContent = message;
      check.disabled = false;
    } catch {
      if (!dialog?.open || !note.isConnected) return;
      status.textContent = 'The parcel shelf could not be checked.';
      check.disabled = false;
    }
  };
  check.addEventListener('click', () => void read());
  note.append(status);
  host.body.append(note, walk, check);
  dialog?.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')?.focus({preventScroll:true});
  void read();
}
