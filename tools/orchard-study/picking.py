#!/usr/bin/env python3
"""Build original fruit-picking pose sheets from the four existing resident rigs."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'tools/create-town-variety.py'
spec = importlib.util.spec_from_file_location('town_rigs', SOURCE)
rig = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rig)

FACINGS = ('south', 'north', 'east', 'west')
POSES = ('idle', 'reach', 'pick', 'pocket')
SIZE = (64, 80)
FOOT = (32, 72)
SVG = '{http://www.w3.org/2000/svg}'


def replace_once(frame, old, new):
    if frame.count(old) != 1:
        raise ValueError('Resident rig geometry changed. Review the picking pose before resuming.')
    return frame.replace(old, new)


def picking_pose(resident, facing, pose):
    if pose == 'idle':
        return rig.resident(resident, facing, 0), None

    side = facing in ('east', 'west')
    sx = 35 if side else 32 + resident['width'] / 2 - 2
    hx = 44 if side else 32 + resident['width'] / 2 + 1
    hy = 41 if facing == 'north' else 51
    old_arm = (rig.path(f'M{sx} 37Q{hx+3} 42 {hx} {hy}', stroke=resident['sleeve'], sw=6)
               + rig.ellipse(hx, hy, 3.2, 3.6, resident['skin'], rig.INK, 1.2))
    old_prop = (rig.path(f'M{hx-5} {hy-3}l10 1-2 8-9-2Z', '#d7b887', rig.INK, 1)
                + rig.path(f'M{hx-2} {hy+1}l5 1', stroke='#8f704e', sw=1))

    wrist_x, wrist_y = {
        'reach': (51, 25),
        'pick': (53, 20),
        'pocket': (40 if side else 43, 48),
    }[pose]
    elbow_y = 43 if pose == 'pocket' else 34
    arm = (rig.path(f'M{sx} 37Q{sx+6} {elbow_y} {wrist_x} {wrist_y}',
                    stroke=resident['sleeve'], sw=6)
           + rig.ellipse(wrist_x, wrist_y, 3.2, 3.6, resident['skin'], rig.INK, 1.2))
    fruit = ''
    if pose in ('pick', 'pocket'):
        fruit_x = wrist_x + 2
        fruit = (f'<g data-held="apple" transform="translate({fruit_x} {wrist_y-3})">'
                 + rig.path('M0 -2C-8 -7-8 6-2 6l2-1 2 1c6 0 6-13-2-8Z',
                            '#ba6553', rig.INK, 1)
                 + rig.path('M0 -1q0-5 4-6M1 -4q2-3 5-2', stroke='#60764f', sw=1.3)
                 + rig.path('M-4 0l-1 2', stroke='#f0ab87', sw=1.1) + '</g>')
    frame = replace_once(rig.resident(resident, facing, 0, 'finish'), old_arm, arm)
    frame = replace_once(frame, old_prop, fruit)
    return frame, (64 - wrist_x if facing == 'west' else wrist_x, wrist_y)


def sheet(name, resident):
    frames = []
    metadata = []
    for row, facing in enumerate(FACINGS):
        idle = rig.resident(resident, facing, 0)
        anchor = '<g transform="translate(0 0.00)">'
        idle_feet, boundary, _ = idle.partition(anchor)
        if not boundary:
            raise ValueError('Original resident foot layer could not be verified.')
        for column, pose in enumerate(POSES):
            frame, wrist = picking_pose(resident, facing, pose)
            if frame.partition(anchor)[0] != idle_feet:
                raise ValueError(f'{name} {facing} {pose} moved the feet.')
            index = row * len(POSES) + column
            frames.append(f'<g data-frame="{index}" transform="translate({column*SIZE[0]} {row*SIZE[1]})">{frame}</g>')
            metadata.append({
                'index': index, 'facing': facing, 'pose': pose, 'foot': FOOT,
                'wrist': wrist, 'holdsFruit': pose in ('pick', 'pocket'),
            })
    document = ('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320" viewBox="0 0 256 320">'
                f'<title>{name.title()} apple-picking study</title>'+''.join(frames)+'</svg>\n')
    parsed = ElementTree.fromstring(document)
    held = parsed.findall('.//' + SVG + 'g[@data-held="apple"]')
    if len(held) != len(FACINGS) * 2:
        raise ValueError('The apple must appear only at contact and on the way to the pocket.')
    return document, metadata


def build(out):
    out = out.resolve()
    if out.is_relative_to(ROOT / 'public'):
        raise ValueError('Candidate sheets belong outside public game assets.')
    out.mkdir(parents=True, exist_ok=True)
    catalog = {'frameSize': SIZE, 'foot': FOOT, 'facings': FACINGS, 'poses': POSES, 'sheets': {}}
    for name, resident in rig.RESIDENTS.items():
        document, metadata = sheet(name, resident)
        filename = name + '-picking.svg'
        data = document.encode('utf-8')
        (out / filename).write_bytes(data)
        catalog['sheets'][name] = {
            'file': filename, 'sha256': hashlib.sha256(data).hexdigest(), 'frames': metadata,
        }
    (out / 'catalog.json').write_text(json.dumps(catalog, indent=2) + '\n')
    print(f"Prepared {len(FACINGS) * len(POSES) * len(rig.RESIDENTS)} fruit-picking study poses.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True, type=Path)
    build(parser.parse_args().out)
