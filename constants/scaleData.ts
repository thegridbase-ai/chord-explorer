
export const SCALE_TYPE_IDS = [
  'pentatonic_minor',
  'pentatonic_major',
  'blues',
  'natural_minor',
  'major',
  'harmonic_minor',
  'melodic_minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'whole_tone',
  'diminished',
] as const;

export type ScaleType = typeof SCALE_TYPE_IDS[number];

export interface ScaleFormula {
  name: string;
  shortName: string;
  intervals: number[];
  intervalNames: string[];
}

export const SCALE_TYPES: Record<ScaleType, ScaleFormula> = {
  pentatonic_minor: {
    name: 'Minor Pentatonic',
    shortName: 'Pentatonic Minor',
    intervals: [0, 3, 5, 7, 10],
    intervalNames: ['1', 'b3', '4', '5', 'b7'],
  },
  pentatonic_major: {
    name: 'Major Pentatonic',
    shortName: 'Pentatonic Major',
    intervals: [0, 2, 4, 7, 9],
    intervalNames: ['1', '2', '3', '5', '6'],
  },
  blues: {
    name: 'Blues',
    shortName: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    intervalNames: ['1', 'b3', '4', 'b5', '5', 'b7'],
  },
  natural_minor: {
    name: 'Aeolian (Natural Minor)',
    shortName: 'Aeolian',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    intervalNames: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  },
  major: {
    name: 'Ionian (Major)',
    shortName: 'Ionian',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    intervalNames: ['1', '2', '3', '4', '5', '6', '7'],
  },
  harmonic_minor: {
    name: 'Harmonic Minor',
    shortName: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    intervalNames: ['1', '2', 'b3', '4', '5', 'b6', '7'],
  },
  melodic_minor: {
    name: 'Melodic Minor',
    shortName: 'Melodic Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    intervalNames: ['1', '2', 'b3', '4', '5', '6', '7'],
  },
  dorian: {
    name: 'Dorian',
    shortName: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    intervalNames: ['1', '2', 'b3', '4', '5', '6', 'b7'],
  },
  phrygian: {
    name: 'Phrygian',
    shortName: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    intervalNames: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
  },
  lydian: {
    name: 'Lydian',
    shortName: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    intervalNames: ['1', '2', '3', '#4', '5', '6', '7'],
  },
  mixolydian: {
    name: 'Mixolydian',
    shortName: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    intervalNames: ['1', '2', '3', '4', '5', '6', 'b7'],
  },
  locrian: {
    name: 'Locrian',
    shortName: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    intervalNames: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
  },
  whole_tone: {
    name: 'Whole Tone',
    shortName: 'Whole Tone',
    intervals: [0, 2, 4, 6, 8, 10],
    intervalNames: ['1', '2', '3', '#4', '#5', 'b7'],
  },
  diminished: {
    name: 'Diminished (H-W)',
    shortName: 'Diminished',
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    intervalNames: ['1', 'b2', 'b3', '3', 'b5', '5', '6', 'b7'],
  },
};

// Row 1: Scales
export const SCALES: ScaleType[] = [
  'pentatonic_minor', 'pentatonic_major', 'blues',
  'harmonic_minor', 'melodic_minor', 'whole_tone', 'diminished',
];

// Row 2: Modes (church modes)
export const MODES: ScaleType[] = [
  'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'natural_minor', 'locrian',
];

export interface ExtensionNote {
  id: string;
  name: string;
  semitones: number;
}

export const EXTENSION_NOTES: ExtensionNote[] = [
  { id: 'b5', name: 'b5', semitones: 6 },
  { id: '9', name: '9th', semitones: 2 },
  { id: 'b9', name: 'b9', semitones: 1 },
  { id: '#9', name: '#9', semitones: 3 },
  { id: '11', name: '11th', semitones: 5 },
  { id: '#11', name: '#11', semitones: 6 },
  { id: '13', name: '13th', semitones: 9 },
  { id: 'b13', name: 'b13', semitones: 8 },
];

// Default scale suggestion based on chord type
export const CHORD_TO_SCALE: Record<string, ScaleType> = {
  'minor': 'pentatonic_minor',
  'm7': 'pentatonic_minor',
  'Major': 'pentatonic_major',
  'maj7': 'pentatonic_major',
  'sus2': 'major',
  'sus4': 'mixolydian',
  '7': 'mixolydian',
  'dim': 'locrian',
  'dim7': 'diminished',
  'aug': 'whole_tone',
};
