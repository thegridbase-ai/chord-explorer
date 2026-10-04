import { describe, it, expect } from 'vitest';
import {
  getPlayableFamilies,
  generatePlayable,
  bassFilterMatches,
  classifyCurated,
  curatedBadge,
  parseGvParam,
  toGvParam,
  shapeToFretPositions,
  shapeNoteNames,
  fingerLabels,
  fingerChart,
  positionLabel,
  voicingLabel,
  describeSharedShape,
  findGeneratedVoicing,
  chordTypeForShape,
  chooseGeneratedShape,
  chooseInversion,
  PlayableBassFilter,
  CuratedClass,
} from './playable';
import {
  DEFAULT_HAND_PROFILE,
  DEFAULT_CALIBRATION,
  E_STANDARD,
  HandProfile,
  Shape,
  findBestFingering,
  fromChordExplorerFrets,
  fromRiffForgeTab,
  pitchClass,
  profileFromCalibration,
  shapeToMidi,
  validateHandProfile,
} from './engine';
import { getAllChordVoicings } from './musicTheory';
import { CHORD_TYPES, CHORD_TYPE_IDS, GUITAR_VOICINGS, NOTES, ChordType, Note, VoicingDefinition } from '../constants/musicData';

const tab = (text: string): Shape => {
  const shape = fromRiffForgeTab(text);
  if (!shape) throw new Error(`bad tab ${text}`);
  return shape;
};

const pitchClassSet = (shape: Shape): number[] =>
  [...new Set(shapeToMidi(shape, E_STANDARD).map(pitchClass))].sort((a, b) => a - b);

const intervalsAbove = (rootPc: number, intervals: readonly number[]): number[] =>
  [...new Set(intervals.map(i => (rootPc + i) % 12))].sort((a, b) => a - b);

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A noticeably smaller hand than the default (pinky to fret 3 from fret 1, fret 9 from fret 7).
const SMALL_PROFILE = profileFromCalibration({ ...DEFAULT_CALIBRATION, lowPinkyFret: 3, highPinkyFret: 9 });

// App.tsx's matchesBassFilter, restated on the curated bass string number.
const curatedBassMatches = (bassString: number, filter: PlayableBassFilter): boolean =>
  filter === 'all' || bassString === filter || (filter === 4 && bassString < 4);

const curatedDefinitions = (): { root: Note; type: ChordType; index: number; def: VoicingDefinition }[] =>
  NOTES.flatMap(root =>
    CHORD_TYPE_IDS.flatMap(type =>
      (GUITAR_VOICINGS[`${root}_${type}`] ?? []).map((def, index) => ({ root, type, index, def })),
    ),
  );

describe('getPlayableFamilies', () => {
  it('maps triads and sus chords to one engine family, any inversion', () => {
    const expected: [ChordType, string][] = [
      ['Major', 'major'],
      ['minor', 'minor'],
      ['sus2', 'sus2'],
      ['sus4', 'sus4'],
      ['dim', 'dim'],
      ['aug', 'aug'],
    ];
    for (const [type, familyId] of expected) {
      const groups = getPlayableFamilies(type);
      expect(groups.map(g => g.id), type).toEqual(['full']);
      expect(groups[0].family.id, type).toBe(familyId);
      expect(groups[0].family.bass, type).toBe('any');
    }
  });

  it('offers a full four-note group and an engine shell for 7, m7 and maj7', () => {
    for (const type of ['7', 'm7', 'maj7'] as const) {
      const groups = getPlayableFamilies(type);
      expect(groups.map(g => g.id), type).toEqual(['full', 'shell']);
      const [full, shell] = groups;
      expect(full.family.minNotes, type).toBe(4);
      expect(full.family.bass, type).toBe('any');
      expect(full.family.preferredBass, type).toBe(0);
      expect(shell.family.id, type).toBe(type);
    }
  });

  it('offers a full and a rootless group for dim7', () => {
    const [full, rootless] = getPlayableFamilies('dim7');
    expect(full.id).toBe('full');
    expect(rootless.id).toBe('rootless');
    expect([...rootless.family.required].sort((a, b) => a - b)).toEqual([3, 6, 9]);
    expect(rootless.family.optional).toEqual([]);
  });

  it('requires exactly the chord formula in every full group', () => {
    for (const type of CHORD_TYPE_IDS) {
      const full = getPlayableFamilies(type).find(g => g.id === 'full')!;
      expect([...full.family.required].sort((a, b) => a - b), type).toEqual(CHORD_TYPES[type].intervals);
      expect(full.family.optional, type).toEqual([]);
    }
  });
});

describe('generatePlayable', () => {
  it('returns no-barre A minor voicings that sound their shapes', () => {
    const groups = generatePlayable('A', 'minor', DEFAULT_HAND_PROFILE);
    expect(groups).toHaveLength(1);
    const [full] = groups;
    expect(full.voicings.length).toBeGreaterThanOrEqual(1);
    expect(full.voicings.length).toBeLessThanOrEqual(12);
    expect(full.empty).toBeUndefined();
    for (const v of full.voicings) {
      expect(v.midi).toEqual(shapeToMidi(v.shape, E_STANDARD));
      expect(v.fingering.barres).toEqual([]);
      expect(pitchClassSet(v.shape)).toEqual([0, 4, 9]);
    }
  });

  it('keeps every voicing inside its recipe and names full chords as the chord itself', () => {
    for (const root of NOTES) {
      const rootPc = NOTES.indexOf(root);
      for (const type of CHORD_TYPE_IDS) {
        const symbolPattern = new RegExp(`^${escapeRegExp(root + CHORD_TYPES[type].symbol)}(/[A-G]#?)?$`);
        for (const group of generatePlayable(root, type, DEFAULT_HAND_PROFILE)) {
          const label = `${root} ${type} ${group.id}`;
          if (group.voicings.length === 0) {
            expect(group.empty, label).toMatch(/\S/);
            continue;
          }
          const required = intervalsAbove(rootPc, group.family.required);
          const allowed = intervalsAbove(rootPc, [...group.family.required, ...group.family.optional]);
          for (const v of group.voicings) {
            const present = pitchClassSet(v.shape);
            expect(required.every(pc => present.includes(pc)), label).toBe(true);
            expect(present.every(pc => allowed.includes(pc)), label).toBe(true);
            expect(v.fingering.barres, label).toEqual([]);
            if (group.id === 'full') expect(v.symbol, label).toMatch(symbolPattern);
            if (group.id === 'shell') expect(v.name, label).toContain('(no5)');
            if (group.id === 'rootless') expect(v.name, label).toContain('(no root)');
          }
        }
      }
    }
  });

  it('is deterministic and honours the limit', () => {
    expect(generatePlayable('C', '7', DEFAULT_HAND_PROFILE)).toEqual(generatePlayable('C', '7', DEFAULT_HAND_PROFILE));
    for (const group of generatePlayable('C', '7', DEFAULT_HAND_PROFILE, { limit: 3 })) {
      expect(group.voicings.length).toBeLessThanOrEqual(3);
    }
  });

  it('changes with the hand profile', () => {
    const key = (profile: HandProfile) =>
      CHORD_TYPE_IDS.map(type =>
        generatePlayable('C', type, profile).map(g => g.voicings.map(v => v.shape.join(',')).join(';')).join('|'),
      ).join('#');
    expect(key(SMALL_PROFILE)).not.toBe(key(DEFAULT_HAND_PROFILE));
  });

  it("reports the engine's binding constraint for an empty group, and that complete dim7 shapes are rare", () => {
    const cramped = validateHandProfile({
      ...DEFAULT_HAND_PROFILE,
      reachAtLowMm: 30,
      reachAtHighMm: 30,
      allowOpenStrings: false,
    });
    const [full] = generatePlayable('C', 'dim7', cramped);
    expect(full.voicings).toEqual([]);
    expect(full.empty).toMatch(/^No .+ voicing on C in E Standard: /);
    expect(full.empty).toContain('rare');
  });
});

describe('bassFilterMatches', () => {
  it("agrees with App.tsx's bass filter on every curated voicing", () => {
    const filters: PlayableBassFilter[] = ['all', 6, 5, 4];
    for (const root of NOTES) {
      for (const type of CHORD_TYPE_IDS) {
        const meta = getAllChordVoicings(root, type);
        GUITAR_VOICINGS[`${root}_${type}`].forEach((def, i) => {
          const shape = fromChordExplorerFrets(def.frets);
          for (const filter of filters) {
            expect(bassFilterMatches({ shape }, filter), `${root}_${type} ${def.name} ${filter}`).toBe(
              curatedBassMatches(meta[i].bassString, filter),
            );
          }
        });
      }
    }
  });

  it('uses the lowest sounding string, skipping muted ones', () => {
    expect(bassFilterMatches({ shape: tab('0 2 2 1 0 0') }, 6)).toBe(true);
    expect(bassFilterMatches({ shape: tab('x 3 2 0 1 0') }, 5)).toBe(true);
    expect(bassFilterMatches({ shape: tab('x 3 2 0 1 0') }, 6)).toBe(false);
    expect(bassFilterMatches({ shape: tab('x x 0 2 3 2') }, 4)).toBe(true);
    expect(bassFilterMatches({ shape: tab('x x x 2 3 2') }, 4)).toBe(true);
    expect(bassFilterMatches({ shape: tab('x x x 2 3 2') }, 5)).toBe(false);
    expect(bassFilterMatches({ shape: tab('x x x 2 3 2') }, 'all')).toBe(true);
  });
});

describe('classifyCurated', () => {
  const find = (key: string, name: string): VoicingDefinition => {
    const def = GUITAR_VOICINGS[key].find(d => d.name === name);
    if (!def) throw new Error(`${key} ${name} missing`);
    return def;
  };

  it('classifies known shapes', () => {
    expect(classifyCurated(find('F_Major', 'Barre 1st'), DEFAULT_HAND_PROFILE)).toBe('needs-barre');
    expect(classifyCurated(find('C_Major', 'Open'), DEFAULT_HAND_PROFILE)).toBe('no-barre');
    // Index on low E fret 1, pinky on D fret 8: no barre would help.
    expect(classifyCurated({ name: 'Wide', frets: [-1, -1, -1, 8, -1, 1], startFret: 1 }, DEFAULT_HAND_PROFILE)).toBe(
      'out-of-reach',
    );
  });

  it('puts every curated voicing in exactly one class', () => {
    const counts: Record<CuratedClass, number> = { 'no-barre': 0, 'needs-barre': 0, 'out-of-reach': 0 };
    const all = curatedDefinitions();
    for (const { def } of all) counts[classifyCurated(def, DEFAULT_HAND_PROFILE)]++;
    expect(counts['no-barre'] + counts['needs-barre'] + counts['out-of-reach']).toBe(all.length);
    expect(counts['no-barre']).toBeGreaterThan(0);
    expect(counts['needs-barre']).toBeGreaterThan(0);
  });
});

describe('curatedBadge', () => {
  const find = (key: string, name: string): VoicingDefinition => {
    const def = GUITAR_VOICINGS[key].find(d => d.name === name);
    if (!def) throw new Error(`${key} ${name} missing`);
    return def;
  };

  it('labels curated voicings and puts the engine reason in the title', () => {
    expect(curatedBadge(find('C_Major', 'Open'), DEFAULT_HAND_PROFILE)).toMatchObject({ kind: 'no-barre', label: 'no barre' });

    const barre = curatedBadge(find('F_Major', 'Barre 1st'), DEFAULT_HAND_PROFILE);
    expect(barre).toMatchObject({ kind: 'needs-barre', label: 'needs barre' });
    expect(barre.title).toContain('6 fretted notes');

    // x x 2 4 5 4: index-middle is over its pair limit for the default hand, with or without a barre.
    const wide = curatedBadge(find('E_Major', 'D Shape'), DEFAULT_HAND_PROFILE);
    expect(wide).toMatchObject({ kind: 'out-of-reach', label: 'stretch' });
    expect(wide.title).toContain('index-middle');
  });

  it('agrees with classifyCurated on every curated voicing', () => {
    for (const { root, type, index, def } of curatedDefinitions()) {
      expect(curatedBadge(def, SMALL_PROFILE).kind, `${root} ${type} #${index}`).toBe(classifyCurated(def, SMALL_PROFILE));
    }
  });

  it('only says "stretch" when reach is the problem', () => {
    const noOpenStrings = validateHandProfile({ ...DEFAULT_HAND_PROFILE, allowOpenStrings: false });
    const open = curatedBadge(find('C_Major', 'Open'), noOpenStrings);
    expect(open.kind).toBe('out-of-reach');
    expect(open.label).toBe('out of profile');
  });

  it('never calls a voicing safe', () => {
    for (const { def } of curatedDefinitions()) {
      expect(curatedBadge(def, DEFAULT_HAND_PROFILE).title).not.toMatch(/safe/i);
    }
  });
});

describe('gv URL param', () => {
  it('parses low -> high frets with x for muted strings', () => {
    expect(parseGvParam('0-2-2-x-x-x')).toEqual([0, 2, 2, null, null, null]);
    expect(parseGvParam('x-3-2-0-1-0')).toEqual([null, 3, 2, 0, 1, 0]);
    expect(parseGvParam('X-12-14-14-13-x')).toEqual([null, 12, 14, 14, 13, null]);
    expect(parseGvParam('24-x-x-x-x-x')).toEqual([24, null, null, null, null, null]);
  });

  it('rejects anything that is not a six-string shape in frets 0..24', () => {
    const bad = [
      null,
      undefined,
      '',
      '0-2-2-x-x',
      '0-2-2-x-x-x-x',
      '0-2-25-x-x-x',
      '0-2-2-x-x-a',
      '0--2-x-x-x',
      '-1-2-2-x-x-x',
      '02-2-2-x-x-x',
      '0-2-2-x-x-x ',
      '0 2 2 x x x',
      '0-2.5-2-x-x-x',
      'x-x-x-x-x-x',
    ];
    for (const value of bad) expect(parseGvParam(value), String(value)).toBeNull();
  });

  it('round-trips with toGvParam', () => {
    for (const text of ['0-2-2-x-x-x', 'x-3-2-0-1-0', 'x-x-10-12-11-0']) {
      expect(toGvParam(parseGvParam(text)!)).toBe(text);
    }
    expect(toGvParam(tab('8 7 8 0 x x'))).toBe('8-7-8-0-x-x');
  });
});

describe('chordTypeForShape', () => {
  it('names a shape by the chord type its pitch classes spell exactly', () => {
    expect(chordTypeForShape(parseGvParam('x-0-2-2-1-0')!, 9)).toBe('minor');
    expect(chordTypeForShape(parseGvParam('x-3-2-0-1-0')!, 0)).toBe('Major');
    expect(chordTypeForShape(parseGvParam('0-2-0-1-0-0')!, 4)).toBe('7');
    expect(chordTypeForShape(parseGvParam('x-0-2-2-3-0')!, 9)).toBe('sus4');
    expect(chordTypeForShape(parseGvParam('x-x-0-1-0-1')!, 2)).toBe('dim7');
  });

  it('returns null for power chords, dyads, quartal stacks, clusters and a wrong root', () => {
    expect(chordTypeForShape(parseGvParam('0-2-2-x-x-x')!, 4)).toBeNull();
    expect(chordTypeForShape(parseGvParam('0-x-2-x-x-x')!, 4)).toBeNull();
    expect(chordTypeForShape(parseGvParam('0-0-0-x-x-x')!, 4)).toBeNull();
    expect(chordTypeForShape(parseGvParam('x-x-x-9-7-3')!, 4)).toBeNull();
    expect(chordTypeForShape(parseGvParam('x-0-2-2-1-0')!, 0)).toBeNull();
  });
});

describe('generated voicing and inversion choice', () => {
  it('a generated pick resets the inversion, an inversion clears the pick', () => {
    const shape: Shape = [null, 0, 2, 2, 1, 0];
    expect(chooseGeneratedShape(shape)).toEqual({ generatedShape: shape, inversion: 0 });
    expect(chooseInversion(2)).toEqual({ generatedShape: null, inversion: 2 });
    expect(chooseInversion(0)).toEqual({ generatedShape: null, inversion: 0 });
  });
});

describe('shapeToFretPositions', () => {
  it('uses string 0 = low E, like the curated voicings', () => {
    const positions = shapeToFretPositions(tab('x 3 2 0 1 0'), NOTES.indexOf('C'));
    expect(positions).toEqual([
      { string: 1, fret: 3, interval: 'Root' },
      { string: 2, fret: 2, interval: 'Major 3rd' },
      { string: 3, fret: 0, interval: 'Perfect 5th' },
      { string: 4, fret: 1, interval: 'Root' },
      { string: 5, fret: 0, interval: 'Major 3rd' },
    ]);
  });

  it('matches getAllChordVoicings for every curated voicing', () => {
    const order = (v: { string: number; fret: number }[]) => [...v].sort((a, b) => a.string - b.string);
    for (const { root, type, index, def } of curatedDefinitions()) {
      const expected = getAllChordVoicings(root, type)[index].voicing;
      const actual = shapeToFretPositions(fromChordExplorerFrets(def.frets), NOTES.indexOf(root));
      expect(order(actual), `${root}_${type} ${def.name}`).toEqual(order(expected));
    }
  });

  it('never labels a non-root note as the root', () => {
    // E + F: the minor second has no CE interval name of its own.
    const positions = shapeToFretPositions(tab('0 x x x x 1'), NOTES.indexOf('E'));
    expect(positions[1]).toEqual({ string: 5, fret: 1, interval: 'Major 2nd' });
  });
});

describe('playback and display helpers', () => {
  it('names the sounding notes low -> high from shapeToMidi', () => {
    expect(shapeNoteNames(tab('x 0 2 2 1 0'))).toEqual(['A2', 'E3', 'A3', 'C4', 'E4']);
    expect(shapeNoteNames(tab('x 1 3 3 x x'))).toEqual(['A#2', 'F3', 'A#3']);
  });

  it('labels fretted notes with their finger, keyed by string and fret', () => {
    const shape = tab('0 2 2 1 0 0');
    const result = findBestFingering(shape, DEFAULT_HAND_PROFILE);
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      const labels = fingerLabels(shape, result.fingering);
      expect(Object.keys(labels).sort()).toEqual(['1-2', '2-2', '3-1']);
      expect(labels['3-1']).toBe('1');
      expect(Object.values(labels).every(l => /^[1-4]$/.test(l))).toBe(true);
    }
  });

  it('describes the hand position', () => {
    expect(positionLabel(tab('x 0 2 2 1 0'))).toBe('open');
    expect(positionLabel(tab('0 0 0 x x x'))).toBe('open');
    expect(positionLabel(tab('8 7 8 0 x x'))).toBe('fr 7');
    expect(positionLabel(tab('x 3 5 5 5 x'))).toBe('fr 3');
    expect(positionLabel(tab('0 0 10 x x x'))).toBe('fr 10');
  });

  it('builds the button label from position and degrees', () => {
    const [v] = generatePlayable('A', 'minor', DEFAULT_HAND_PROFILE)[0].voicings;
    expect(voicingLabel(v)).toBe(`${positionLabel(v.shape)} · ${v.degrees}`);
  });

  it('writes a finger chart low -> high: x muted, o open, finger numbers for fretted notes', () => {
    const shape = tab('x 0 2 2 1 0');
    const result = findBestFingering(shape, DEFAULT_HAND_PROFILE);
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      const chart = fingerChart(shape, result.fingering);
      expect(chart).toMatch(/^x o [1-4] [1-4] [1-4] o$/);
      expect(chart.split(' ')[4]).toBe('1');
    }
    expect(fingerChart(tab('x 3 2 0 1 0'), null)).toBe('x - - o - o');
  });
});

describe('shared shapes', () => {
  it('finds a shared shape among the generated voicings', () => {
    const groups = generatePlayable('A', 'minor', DEFAULT_HAND_PROFILE);
    const target = groups[0].voicings[2];
    const found = findGeneratedVoicing(groups, [...target.shape]);
    expect(found?.groupId).toBe('full');
    expect(found?.voicing).toBe(target);
    expect(findGeneratedVoicing(groups, tab('x x x x x 0'))).toBeNull();
  });

  it('names a shared shape honestly and fingers it when the hand allows', () => {
    const power = describeSharedShape(tab('0 2 2 x x x'), NOTES.indexOf('E'), DEFAULT_HAND_PROFILE);
    expect(power.name).toBe('E5');
    expect(power.degrees).toBe('1 5 1');
    expect(power.fingering).not.toBeNull();
    expect(power.problem).toBeUndefined();

    const wide = describeSharedShape(tab('1 x 8 x x x'), NOTES.indexOf('F'), DEFAULT_HAND_PROFILE);
    expect(wide.fingering).toBeNull();
    expect(wide.problem).toMatch(/\S/);
  });
});
