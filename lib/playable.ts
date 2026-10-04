// "Playable for me": maps Chord Explorer chord types to playability-engine voicing families and turns
// generated shapes into what the existing UI understands (FretPosition voicings, note names, URL params).
import {
  E_STANDARD,
  Fingering,
  GeneratedVoicing,
  HandProfile,
  Shape,
  VoicingFamily,
  VoicingSort,
  classifyShape,
  findBestFingering,
  fromChordExplorerFrets,
  generateVoicings,
  getFamily,
  highestFret,
  intervalFrom,
  lowestFret,
  midiToName,
  nameVoicing,
  pitchClass,
  shapeKey,
  shapeToMidi,
  shapeToMidiByString,
} from './engine';
import { CHORD_TYPES, CHORD_TYPE_IDS, ChordType, ChordVoicing, Interval, Note, VoicingDefinition } from '../constants/musicData';

export type PlayableGroupId = 'full' | 'shell' | 'rootless';

export interface PlayableFamily {
  id: PlayableGroupId;
  label: string;
  note?: string;
  family: VoicingFamily;
}

export interface PlayableGroup {
  id: PlayableGroupId;
  label: string;
  note?: string;
  family: VoicingFamily;
  voicings: GeneratedVoicing[];
  /** Why nothing fits the hand profile (the engine's binding constraint); set only when `voicings` is empty. */
  empty?: string;
}

export interface PlayableOptions {
  limit?: number;
  sort?: VoicingSort;
}

/** Same buckets as App.tsx's bass filter: string numbers 6 = low E, 5 = A, 4 = D or higher. */
export type PlayableBassFilter = 'all' | 6 | 5 | 4;

export type CuratedClass = 'no-barre' | 'needs-barre' | 'out-of-reach';

const PLAYABLE_LIMIT = 12;

const engineFamily = (id: string): VoicingFamily => {
  const family = getFamily(id);
  if (!family) throw new Error(`Engine family "${id}" is missing`);
  return family;
};

// Chord Explorer's own recipes. Like the engine's triads they allow any inversion: preferredBass 0 ranks root
// position first and the engine's name states any other bass ("C7/E"). Complete four-note shapes without a barre
// are scarce in root position (default hand: Fm7 4, A#m7 5, D#m7 6), which is why the bass is not fixed to the root.
// 'legacy' only keeps the label out of descriptive names; these recipes always earn a real chord symbol.
const localFamily = (id: string, label: string, required: number[], minNotes: number, maxNotes: number): VoicingFamily =>
  Object.freeze({
    id: `ce:${id}`,
    label,
    description: `Chord Explorer ${label}: ${required.length} required notes, any inversion.`,
    group: 'legacy',
    required: Object.freeze(required),
    optional: Object.freeze([]),
    forbidden: Object.freeze([]),
    bass: 'any',
    preferredBass: 0,
    minNotes,
    maxNotes,
    tags: Object.freeze([]),
  });

const FULL_NOTE = 'Every chord tone, any inversion; the name shows a bass other than the root.';
const SHELL_NOTE = 'Root, 3rd and 7th with the root in the bass. No 5th, so the name says (no5).';

const full = (family: VoicingFamily): PlayableFamily => ({ id: 'full', label: 'Full chord', note: FULL_NOTE, family });
const shell = (familyId: string): PlayableFamily => ({
  id: 'shell',
  label: 'Shell',
  note: SHELL_NOTE,
  family: engineFamily(familyId),
});

const PLAYABLE_FAMILIES: Record<ChordType, readonly PlayableFamily[]> = {
  Major: [full(engineFamily('major'))],
  minor: [full(engineFamily('minor'))],
  sus2: [full(engineFamily('sus2'))],
  sus4: [full(engineFamily('sus4'))],
  dim: [full(engineFamily('dim'))],
  aug: [full(engineFamily('aug'))],
  '7': [full(localFamily('7', '7', [0, 4, 7, 10], 4, 6)), shell('7')],
  m7: [full(localFamily('m7', 'm7', [0, 3, 7, 10], 4, 6)), shell('m7')],
  maj7: [full(localFamily('maj7', 'maj7', [0, 4, 7, 11], 4, 6)), shell('maj7')],
  dim7: [
    full(localFamily('dim7', 'dim7', [0, 3, 6, 9], 4, 6)),
    {
      id: 'rootless',
      label: 'Rootless',
      note: 'b3, b5 and bb7 (shown as 6) without the root: a diminished triad on the b3, named dim7(no root).',
      family: localFamily('dim7-rootless', 'dim7 rootless', [3, 6, 9], 3, 4),
    },
  ],
};

const DIM7_RARE =
  ' Complete dim7 voicings without a barre are rare; the rootless group drops the root to fit the hand.';

export const getPlayableFamilies = (type: ChordType): readonly PlayableFamily[] => PLAYABLE_FAMILIES[type];

/** Engine voicings per group for the chord, E standard, clean (no distortion mud term), best first. */
export const generatePlayable = (
  root: Note,
  type: ChordType,
  profile: HandProfile,
  opts: PlayableOptions = {},
): PlayableGroup[] =>
  PLAYABLE_FAMILIES[type].map(({ id, label, note, family }) => {
    const result = generateVoicings({
      root,
      family,
      tuning: E_STANDARD,
      profile,
      distortion: false,
      limit: opts.limit ?? PLAYABLE_LIMIT,
      sort: opts.sort,
    });
    const group: PlayableGroup = { id, label, note, family, voicings: result.voicings };
    if (result.voicings.length === 0) {
      const reason = result.empty?.message ?? `No ${family.label} voicing fits this hand profile.`;
      group.empty = type === 'dim7' && id === 'full' && profile.noBarre ? reason + DIM7_RARE : reason;
    }
    return group;
  });

/** Lowest sounding string as Chord Explorer numbers it (6 = low E ... 1 = high e); 6 when nothing sounds. */
const bassStringNumber = (shape: Shape): number => {
  const lowest = shape.findIndex(fret => fret !== null);
  return lowest < 0 ? 6 : 6 - lowest;
};

/** App.tsx's bass filter for engine shapes; the 4th-string bucket also takes basses on higher strings. */
export const bassFilterMatches = (voicing: { shape: Shape }, filter: PlayableBassFilter): boolean => {
  if (filter === 'all') return true;
  const bass = bassStringNumber(voicing.shape);
  return bass === filter || (filter === 4 && bass < 4);
};

/** Curated library voicing vs the hand profile: playable without a barre, needs one, or out of reach anyway. */
export const classifyCurated = (def: VoicingDefinition, profile: HandProfile): CuratedClass => {
  const result = classifyShape(fromChordExplorerFrets(def.frets), profile);
  if (result.noBarre.ok === true) return 'no-barre';
  return result.needsBarre ? 'needs-barre' : 'out-of-reach';
};

export interface CuratedBadge {
  kind: CuratedClass;
  /** Short badge text; never the only signal, `title` carries the engine's reason. */
  label: string;
  title: string;
}

/** Badge for a curated voicing button. "stretch" only when reach or a finger-pair limit is what fails. */
export const curatedBadge = (def: VoicingDefinition, profile: HandProfile): CuratedBadge => {
  const result = classifyShape(fromChordExplorerFrets(def.frets), profile);
  const noBarre = result.noBarre;
  if (noBarre.ok === true) {
    return { kind: 'no-barre', label: 'no barre', title: 'Fits your hand profile without a barre' };
  }
  if (result.needsBarre) {
    return { kind: 'needs-barre', label: 'needs barre', title: `Needs a barre: ${noBarre.detail}` };
  }
  const stretch = noBarre.reason === 'REACH' || noBarre.reason === 'PAIR_STRETCH';
  return {
    kind: 'out-of-reach',
    label: stretch ? 'stretch' : 'out of profile',
    title: `Outside your hand profile: ${noBarre.detail}`,
  };
};

const GV_STRINGS = 6;
const GV_MAX_FRET = 24;
const GV_FRET = /^(?:0|[1-9]\d?)$/;

/** `gv` URL param: six low -> high frets joined by '-', 'x' muted, frets 0..24, at least one sounding string. */
export const parseGvParam = (value: string | null | undefined): Shape | null => {
  if (typeof value !== 'string') return null;
  const tokens = value.split('-');
  if (tokens.length !== GV_STRINGS) return null;
  const shape: (number | null)[] = [];
  for (const token of tokens) {
    if (token === 'x' || token === 'X') {
      shape.push(null);
    } else if (GV_FRET.test(token) && Number(token) <= GV_MAX_FRET) {
      shape.push(Number(token));
    } else {
      return null;
    }
  }
  return shape.some(fret => fret !== null) ? shape : null;
};

export const toGvParam = (shape: Shape): string => shape.map(fret => (fret === null ? 'x' : String(fret))).join('-');

/**
 * The chord type whose formula is exactly the shape's pitch classes above the root, or null when no type spells
 * it (a power chord, dyad, quartal stack or cluster), so a shape is never shown under a chord it is not.
 */
export const chordTypeForShape = (shape: Shape, rootPc: number): ChordType | null => {
  const sounding = new Set(shapeToMidi(shape, E_STANDARD).map(midi => intervalFrom(rootPc, pitchClass(midi))));
  const match = CHORD_TYPE_IDS.find(type => {
    const formula = CHORD_TYPES[type].intervals;
    return formula.length === sounding.size && formula.every(interval => sounding.has(interval));
  });
  return match ?? null;
};

/** A generated shape and an inversion never show together: picking either clears the other. */
export interface VoicingChoice {
  generatedShape: Shape | null;
  inversion: number;
}

export const chooseGeneratedShape = (shape: Shape | null): VoicingChoice => ({ generatedShape: shape, inversion: 0 });

export const chooseInversion = (inversion: number): VoicingChoice => ({ generatedShape: null, inversion });

// Interval names by semitones above the root, as lib/musicTheory.ts assigns them (9 = the dim7 bb7 there).
// CE has no b2 name; 'Major 2nd' is its closest neighbour and keeps the note off the root colour.
const CE_INTERVALS: readonly Interval[] = [
  'Root',
  'Major 2nd',
  'Major 2nd',
  'Minor 3rd',
  'Major 3rd',
  'Perfect 4th',
  'Diminished 5th',
  'Perfect 5th',
  'Augmented 5th',
  'Diminished 5th',
  'Minor 7th',
  'Major 7th',
];

/** Shape -> the Fretboard's ChordVoicing (string 0 = low E, sounding strings only, low -> high). */
export const shapeToFretPositions = (shape: Shape, rootPc: number): ChordVoicing =>
  shapeToMidiByString(shape, E_STANDARD).flatMap((midi, string) =>
    midi === null
      ? []
      : [{ string, fret: shape[string] as number, interval: CE_INTERVALS[intervalFrom(rootPc, pitchClass(midi))] }],
  );

/** Note names for playChord, low -> high string, from the engine's single shape -> pitch conversion. */
export const shapeNoteNames = (shape: Shape): string[] => shapeToMidi(shape, E_STANDARD).map(midiToName);

/** Finger numbers for the Fretboard's dots, keyed `${string}-${fret}`; 'T' is the thumb. Open strings get none. */
export const fingerLabels = (shape: Shape, fingering: Fingering): Record<string, string> => {
  const labels: Record<string, string> = {};
  shape.forEach((fret, string) => {
    const finger = fingering.fingers[string];
    if (fret === null || fret === 0 || finger === null || finger === undefined) return;
    labels[`${string}-${fret}`] = finger === 0 ? 'T' : String(finger);
  });
  return labels;
};

/** Text twin of the finger dots, low -> high: "x" muted, "o" open, 1-4 or T fretted, "-" when no fingering fits. */
export const fingerChart = (shape: Shape, fingering: Fingering | null): string =>
  shape
    .map((fret, string) => {
      if (fret === null) return 'x';
      if (fret === 0) return 'o';
      const finger = fingering?.fingers[string];
      if (finger === null || finger === undefined) return '-';
      return finger === 0 ? 'T' : String(finger);
    })
    .join(' ');

// Open strings with every fretted note in the first four frets read as an open chord.
const OPEN_POSITION_MAX_FRET = 4;

/** 'open' for first-position shapes with open strings, otherwise 'fr N' at the lowest fretted fret. */
export const positionLabel = (shape: Shape): string => {
  const low = lowestFret(shape);
  const high = highestFret(shape);
  if (low === null || (shape.includes(0) && (high ?? 0) <= OPEN_POSITION_MAX_FRET)) return 'open';
  return `fr ${low}`;
};

/** Button text: position and the sounding degrees low -> high, e.g. "fr 5 · 1 5 b7 3". */
export const voicingLabel = (voicing: GeneratedVoicing): string =>
  `${positionLabel(voicing.shape)} · ${voicing.degrees}`;

export const findGeneratedVoicing = (
  groups: readonly PlayableGroup[],
  shape: Shape,
): { groupId: PlayableGroupId; voicing: GeneratedVoicing } | null => {
  const key = shapeKey(shape);
  for (const group of groups) {
    const voicing = group.voicings.find(v => shapeKey(v.shape) === key);
    if (voicing) return { groupId: group.id, voicing };
  }
  return null;
};

export interface SharedShape {
  shape: Shape;
  name: string;
  symbol: string | null;
  degrees: string;
  /** null when the hand profile has no fingering for it; `problem` then says why. */
  fingering: Fingering | null;
  problem?: string;
}

/** A shape from a shared link that the generator did not return: honest name plus the best fingering, if any. */
export const describeSharedShape = (shape: Shape, rootPc: number, profile: HandProfile): SharedShape => {
  const naming = nameVoicing(shape, E_STANDARD, rootPc);
  const fingering = findBestFingering(shape, profile);
  const described: SharedShape = {
    shape,
    name: naming.name,
    symbol: naming.symbol,
    degrees: naming.degrees,
    fingering: fingering.ok === true ? fingering.fingering : null,
  };
  if (fingering.ok === false) described.problem = fingering.detail;
  return described;
};
