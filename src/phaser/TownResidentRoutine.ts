import type Phaser from 'phaser';
import type { TownPersonId } from '../game/town-people.ts';

const routines = {
  clerk: { start: 500, duration: 2100, lift: 6, turn: .10 },
  courier: { start: 2900, duration: 2100, lift: 10, turn: -.13 },
  caretaker: { start: 5350, duration: 2100, lift: 8, turn: .17 },
};
const cycleMs = 8400;

export function townResidentRoutine(id: TownPersonId, elapsedMs: number) {
  const routine = routines[id];
  const age = elapsedMs % cycleMs - routine.start;
  if (age < 0 || age >= routine.duration) return null;
  const lift = Math.sin(Math.PI * age / routine.duration);
  return { raise: lift * routine.lift, rotation: lift * routine.turn };
}

/** Original small props in the town's shared paper, ink and brass palette. */
export function drawTownResidentProp(scene: Phaser.Scene, id: TownPersonId) {
  const prop = scene.add.graphics().setVisible(false);
  prop.lineStyle(1.5, 0x343c36);
  if (id === 'clerk') {
    prop.fillStyle(0x8a714e).fillRoundedRect(-8, -11, 16, 23, 2);
    prop.strokeRoundedRect(-8, -11, 16, 23, 2);
    prop.fillStyle(0xf6e8bd).fillRect(-5, -8, 11, 16);
    prop.fillStyle(0xd4a751).fillRect(-3, -12, 6, 5);
    prop.lineStyle(1, 0x7b7057).lineBetween(-3, -4, 4, -4).lineBetween(-3, 0, 4, 0).lineBetween(-3, 4, 2, 4);
  } else if (id === 'courier') {
    prop.fillStyle(0xf4dda4).fillRoundedRect(-10, -6, 20, 13, 1);
    prop.strokeRoundedRect(-10, -6, 20, 13, 1);
    prop.lineBetween(-9, -5, 0, 1).lineBetween(0, 1, 9, -5);
    prop.fillStyle(0xb05f46).fillCircle(0, 1, 2.5);
  } else {
    prop.fillStyle(0xc8af78).fillRoundedRect(-7, -10, 14, 19, 2);
    prop.strokeRoundedRect(-7, -10, 14, 19, 2);
    prop.fillStyle(0xf4e6bc).fillRect(-5, -5, 10, 10);
    prop.lineStyle(1.5, 0x50714e).lineBetween(0, 4, 0, -4).lineBetween(0, 0, -3, -2).lineBetween(0, 1, 3, -1);
  }
  return prop;
}
