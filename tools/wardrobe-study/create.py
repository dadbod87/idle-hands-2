#!/usr/bin/env python3
"""Build an isolated, original headwear rehearsal from the existing character rigs."""
from __future__ import annotations

from argparse import ArgumentParser
from hashlib import sha256
from html import escape
from itertools import product
from math import sin, pi
from pathlib import Path
from runpy import run_path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
ORIGINAL = ROOT / 'public/art/variety'
SOURCE = ROOT / 'tools/wardrobe-study'
FACINGS = ('south', 'north', 'east', 'west')
HATS = ('none', 'clerk', 'inkwood')
RIGS = run_path(str(ROOT / 'tools/create-town-variety.py'))
INK = '#343c36'


def path(d, fill='none', stroke=INK, width=1.65):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def ticket(x, y):
    return path(f'M{x} {y}h5v4h-5Z', '#e4c27b', INK, .8) + path(f'M{x+1} {y+2}h3', stroke='#705638', width=.7)


def clerk_cap(facing):
    if facing == 'north':
        return (
            path('M17 18Q17 9 23 6Q31 1 41 7Q46 10 47 18L43 20H21Z', '#55716e')
            + path('M19 17Q31 14 45 17L44 21Q31 19 20 21Z', '#78928a', width=1.05)
            + path('M31 5Q30 10 31 16', stroke='#c3ceaf', width=.9)
            + path('M27 20h10v3H27Z', '#516961', width=1.0)
        )
    if facing in ('east', 'west'):
        return (
            path('M16 18Q16 8 24 5Q34 1 43 8Q47 12 47 18Z', '#55716e')
            + path('M20 17Q31 14 46 17Q55 17 54 20L45 22H22Z', '#859d90', width=1.2)
            + path('M26 6Q27 13 32 16', stroke='#c3ceaf', width=.9)
            + ticket(38, 12)
        )
    return (
        path('M17 17Q17 9 23 6Q31 1 41 7Q46 10 47 17L43 19H21Z', '#55716e')
        + path('M17 16Q31 13 47 16L45 19Q32 20 19 19Z', '#859d90', width=1.2)
        + path('M31 5Q30 10 31 15', stroke='#c3ceaf', width=.9)
        + ticket(29, 12)
    )


def trail_hood(facing):
    if facing == 'north':
        return (
            path('M16 26L17 13Q19 4 30 4Q43 3 47 12L49 27Q47 33 38 36L32 34L25 37Q17 32 16 26Z', '#7b6758')
            + path('M32 6Q35 19 32 34M18 26Q24 30 31 32M34 32Q41 29 47 26', stroke='#c8a983', width=1.25)
        )
    if facing in ('east', 'west'):
        return (
            path('M15 23Q15 9 25 5Q38 2 47 11L47 17Q41 12 36 14Q32 17 33 28L37 33Q27 38 17 29Z', '#7b6758')
            + path('M47 15Q42 11 36 13Q31 18 32 28L36 33', stroke='#e1c495', width=1.4)
            + path('M18 15Q21 19 27 20M20 27L27 31', stroke='#ac896b', width=1)
            + path('M34 33L39 38L35 40L31 36Z', '#b48357', width=1)
        )
    return (
        path('M16 24L17 14Q19 4 30 4Q43 3 47 12L49 25L43 33L39 34L42 23Q43 14 37 13H26Q21 16 22 24L26 34L20 33Z', '#7b6758')
        + path('M26 33Q19 19 25 14Q32 10 39 14Q45 19 39 33', stroke='#e1c495', width=1.45)
        + path('M26 34L31 35L37 34L38 38L33 40L27 38Z', '#b48357', width=1.1)
        + path('M14 24L18 26M45 22L48 20', stroke='#ac896b', width=1)
    )


def overlay(hat, facing, pose):
    facing_art = clerk_cap(facing) if hat == 'clerk' else trail_hood(facing)
    if facing == 'west':
        facing_art = f'<g transform="translate(64 0) scale(-1 1)">{facing_art}</g>'
    bob = abs(sin(2 * pi * (pose - 1) / 6)) * .8 if pose else 0
    return f'<g transform="translate(0 {-bob:.2f})">{facing_art}</g>'


def opening_sheet(rig, hat):
    authored = RIGS['resident']
    outfit = RIGS['RESIDENTS'][rig]
    cells = []
    for row, facing in enumerate(FACINGS):
        for pose in range(7):
            number = row * 7 + pose
            cells.append(
                f'<g transform="translate({number * 64} 0)">{authored(outfit, facing, pose)}'
                f'{overlay(hat, facing, pose)}</g>'
            )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1792" height="80" viewBox="0 0 1792 80">'
        f'<title>{escape(rig.capitalize() + " " + hat)}</title>{"".join(cells)}</svg>\n'
    )


def create(destination):
    assets = destination / 'sheets'
    assets.mkdir(parents=True, exist_ok=True)
    generated = {}
    for rig, hat in product(RIGS['RESIDENTS'], HATS):
        name = f'{rig}-{hat}.svg'
        if hat == 'none':
            shutil.copyfile(ORIGINAL / f'resident-{rig}.svg', assets / name)
        else:
            (assets / name).write_text(opening_sheet(rig, hat))
        generated[name] = sha256((assets / name).read_bytes()).hexdigest()
    for name in ('index.html', 'wardrobe.css', 'wardrobe.mjs'):
        shutil.copyfile(SOURCE / name, destination / name)
    (destination / 'art.json').write_text(json.dumps({
        'classification': 'Original project headwear on byte-identical base resident sheets. Standalone study only.',
        'width': 64, 'height': 80, 'foot': [32, 72],
        'facings': FACINGS, 'posesPerFacing': 7, 'files': generated,
    }, indent=2) + '\n')


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('--out', type=Path, default=ROOT / 'test-results/browser/wardrobe-study')
    create(parser.parse_args().out)
