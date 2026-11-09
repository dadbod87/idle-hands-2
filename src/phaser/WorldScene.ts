import Phaser from 'phaser';
import { Session } from '../game/session.ts';
import { TILE, worlds } from '../game/world.ts';
const ink = 0x343b35;
export class WorldScene extends Phaser.Scene {
  actor!: Phaser.GameObjects.Container;
  private keys = new Set<string>();
  private room = '';
  private lastFrame = 0;
  frameSamples: number[] = [];
  onFrame?: () => void;
  constructor(public session: Session) { super('world'); }
  create() {
    this.room = this.session.room;
    const w = worlds[this.session.room], g = this.add.graphics();
    const rect = (x: number, y: number, width: number, height: number, fill: number, outline = false) => {
      g.fillStyle(fill).fillRect(x, y, width, height);
      if (outline) g.lineStyle(2, ink).strokeRect(x, y, width, height);
    };
    const cell = (x: number, y: number, width: number, height: number, fill: number, outline = false) => rect(x * TILE, y * TILE, width * TILE, height * TILE, fill, outline);
    const label = (x: number, y: number, text: string, size = 13, background = '#343b35') => this.add.text(x * TILE, y * TILE, text, { fontFamily: 'monospace', fontSize: size, color: '#fff5dc', backgroundColor: background, padding: { x: 7, y: 5 }, align: 'center' }).setOrigin(.5);
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) cell(x, y, 1, 1, this.room === 'square' ? ((x + y) % 2 ? 0xa8b597 : 0xa3b090) : ((x + y) % 2 ? 0xe3cfac : 0xdfc9a3));
    if (this.room === 'square') {
      cell(14, 22, 23, 7, 0xded2b9); cell(23, 12, 3, 22, 0xded2b9);
      cell(0, 10, 48, 2, 0x7ba5ad); // Not yet bridged: boundary stays blocked.
      for (let x = 0; x < 48; x += 2) { cell(x, 10, 1, .12, 0x93b7bc); cell(x + .4, 11, 1, .08, 0x93b7bc); }
      const building = (x: number, title: string, color: number, roof: number) => {
        cell(x + .15, 16.3, 6, 6, 0x79836c); cell(x, 16, 6, 6, color, true);
        cell(x - .2, 15.5, 6.4, 2, roof, true); cell(x + 2.5, 20, 1, 2, 0x596a60, true);
        for (const wx of [x + .6, x + 4.2]) { cell(wx, 18.3, 1.2, 1.2, 0x8eafbd, true); cell(wx + .58, 18.3, .07, 1.2, 0xece3cb); }
        label(x + 3, 18.1, title, 13);
      };
      building(17, 'WORKSHOP', 0xe9d7af, 0xb97760); building(28, 'ALMOST OPEN', 0xe5d9b7, 0x637d77);
      cell(27, 30, 8, 5, 0x8f9e7b, true);
      for (let x = 27; x <= 35; x++) { cell(x, 30, .12, 5, 0xf4e9ca); cell(x, 30, .26, .26, 0xf4e9ca); }
      cell(27, 30.8, 8, .1, 0xf4e9ca); cell(27, 34, 8, .1, 0xf4e9ca);
      label(31, 31.4, 'A PLACE OF YOUR OWN', 13); label(31, 32.6, 'Housing · planned', 11, '#59664c');
      label(24.5, 13.2, 'BRIDGE COMMITTEE', 12); label(24.5, 14, 'Please form a queue.', 11, '#69775f');
      for (const [x, y] of [[17, 26], [34, 26], [14, 17], [37, 19], [13, 30], [37, 33]]) {
        cell(x + .8, y + .8, .4, 1.2, 0x8c7357);
        g.fillStyle(0x8b9d76).fillEllipse((x + 1) * TILE, (y + .5) * TILE, 65, 49);
        g.lineStyle(2, ink).strokeEllipse((x + 1) * TILE, (y + .5) * TILE, 65, 49);
        g.fillStyle(0xb3bf8d).fillEllipse((x + .65) * TILE, (y + .2) * TILE, 25, 22);
      }
      label(24.5, 27.9, 'THE TOWN SQUARE', 13); label(24.5, 28.7, 'Under new mismanagement.', 11, '#69775f');
      // Paving details stay quiet so interactables read first.
      for (let x = 19; x < 34; x += 3) cell(x, 24.5, .45, .05, 0xc6b9a2);
    } else {
      cell(1, 1, 16, 1.5, 0x748775, true); label(9, 1.8, 'YOUR WORKSHOP', 17);
      cell(3, 3, 5, 2, 0xa57d57, true); cell(3, 3, 5, .3, 0xdbc49c, true);
      cell(3.3, 3.4, 1, 1.2, 0x627f7b, true); cell(6, 3.4, .8, .6, 0xe9d8ad, true);
      label(5.5, 3.8, 'BENCH', 11);
      cell(11, 3, 4, 3, 0x8c9d82, true);
      for (let y = 3; y < 6; y++) cell(11, y + .75, 4, .15, 0x6c7e66);
      cell(3, 8, 2, 2, 0xb78361, true); label(4, 8.8, 'BOXES', 10);
      cell(8, 13, 3, 2, 0x8b755a, true); label(9.5, 14, 'SQUARE ↓', 11);
      label(9, 7.4, 'Great things take time.', 14, '#6a795e'); label(9, 8.3, 'This bench is extremely optimistic.', 11, '#6a795e');
    }
    const figure = this.add.graphics();
    figure.fillStyle(0x333c32, .2).fillEllipse(0, 8, 28, 10);
    figure.fillStyle(0x40484a).fillRect(-8, -9, 6, 15).fillRect(2, -9, 6, 15);
    figure.fillStyle(0x547c78).fillRoundedRect(-12, -29, 24, 23, 3);
    figure.lineStyle(2, ink).strokeRoundedRect(-12, -29, 24, 23, 3);
    figure.fillStyle(0xead2a8).fillRoundedRect(-11, -49, 22, 23, 3);
    figure.lineStyle(2, ink).strokeRoundedRect(-11, -49, 22, 23, 3);
    figure.fillStyle(ink).fillRect(-6, -40, 3, 3).fillRect(4, -40, 3, 3);
    figure.lineStyle(1.5, ink).lineBetween(-4, -32, 4, -32);
    figure.fillStyle(0xe5bd67).fillCircle(5, -19, 3);
    this.actor = this.add.container(0, 0, [figure]).setDepth(100);
    this.cameras.main.setBackgroundColor(this.room === 'square' ? '#a3b090' : '#d2bd98');
    this.cameras.main.setBounds(0, 0, w.width * TILE, w.height * TILE);
    this.cameras.main.startFollow(this.actor, true, 1, 1);
    const onDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button,input,dialog')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { this.keys.add(e.key); e.preventDefault(); }
    };
    const onUp = (e: KeyboardEvent) => this.keys.delete(e.key);
    const clear = () => { this.keys.clear(); this.session.stop(); };
    document.addEventListener('keydown', onDown); document.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const pos = this.cameras.main.getWorldPoint(p.x, p.y);
      const to = { x: Math.floor(pos.x / TILE), y: Math.floor(pos.y / TILE) };
      this.session.walk(to);
    });
    this.events.once('shutdown', () => { document.removeEventListener('keydown', onDown); document.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); });
  }
  update(time: number, delta: number) {
    if (this.room !== this.session.room) { this.scene.restart(); return; }
    const pressed = (...keys: string[]) => keys.some(key => this.keys.has(key));
    let direction;
    if (pressed('ArrowUp', 'w')) direction = { x: 0, y: -1 };
    else if (pressed('ArrowDown', 's')) direction = { x: 0, y: 1 };
    else if (pressed('ArrowLeft', 'a')) direction = { x: -1, y: 0 };
    else if (pressed('ArrowRight', 'd')) direction = { x: 1, y: 0 };
    if (this.session.locked) this.keys.clear();
    this.session.tick(delta, direction);
    this.actor.setPosition((this.session.position.x + .5) * TILE, (this.session.position.y + .5) * TILE);
    if (this.lastFrame && !document.hidden) { this.frameSamples.push(time - this.lastFrame); if (this.frameSamples.length > 600) this.frameSamples.shift(); }
    this.lastFrame = time;
    this.onFrame?.();
  }
}
