
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type Note = typeof NOTES[number];

export const CHORD_TYPE_IDS = ['Major', 'minor', 'sus2', 'sus4', 'dim', 'aug', '7', 'm7', 'maj7', 'dim7'] as const;
export type ChordType = typeof CHORD_TYPE_IDS[number];

export type ChordFormula = {
  name: string;
  symbol: string;
  intervals: number[];
};

export const CHORD_TYPES: Record<ChordType, ChordFormula> = {
  'Major': { name: 'Major', symbol: '', intervals: [0, 4, 7] },
  'minor': { name: 'minor', symbol: 'm', intervals: [0, 3, 7] },
  'sus2': { name: 'suspended 2nd', symbol: 'sus2', intervals: [0, 2, 7] },
  'sus4': { name: 'suspended 4th', symbol: 'sus4', intervals: [0, 5, 7] },
  'dim': { name: 'diminished', symbol: 'dim', intervals: [0, 3, 6] },
  'aug': { name: 'augmented', symbol: 'aug', intervals: [0, 4, 8] },
  '7': { name: 'Dominant 7th', symbol: '7', intervals: [0, 4, 7, 10] },
  'm7': { name: 'minor 7th', symbol: 'm7', intervals: [0, 3, 7, 10] },
  'maj7': { name: 'Major 7th', symbol: 'maj7', intervals: [0, 4, 7, 11] },
  'dim7': { name: 'diminished 7th', symbol: 'dim7', intervals: [0, 3, 6, 9] },
};

export interface Chord {
  root: Note;
  type: ChordType;
}

export interface ProgressionChord extends Chord {
  voicingIndex: number;
}

export type Interval = 'Root' | 'Major 2nd' | 'Minor 3rd' | 'Major 3rd' | 'Perfect 4th' | 'Perfect 5th' | 'Diminished 5th' | 'Augmented 5th' | 'Minor 7th' | 'Major 7th';

export interface NoteWithInterval {
  note: Note;
  octave: number;
  interval: Interval;
  midi: number;
}

export interface FretPosition {
  string: number; // 0=High E, 5=Low E
  fret: number; // 0 for open string
  interval: Interval;
}

export type ChordVoicing = FretPosition[];

export interface VoicingDefinition {
  name: string;
  frets: number[];
  startFret: number;
}

// A map of common chord voicings with multiple options per chord.
// string indices: 0: high e, 1: B, 2: G, 3: D, 4: A, 5: E
// fret: -1 means muted/not played.
export const GUITAR_VOICINGS: Record<string, VoicingDefinition[]> = {
  'C_Major': [
    { name: 'Open', frets: [0, 1, 0, 2, 3, -1], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 5, 5, 5, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 8, 9, 10, 10, 8], startFret: 8 },
  ],
  'G_Major': [
    { name: 'Open', frets: [3, 3, 0, 0, 2, 3], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 3, 4, 5, 5, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [-1, 12, 12, 12, 10, -1], startFret: 10 },
  ],
  'D_Major': [
    { name: 'Open', frets: [2, 3, 2, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 7, 7, 7, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 10, 11, 12, 12, 10], startFret: 10 },
  ],
  'A_Major': [
    { name: 'Open', frets: [0, 2, 2, 2, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 5, 6, 7, 7, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [-1, 14, 14, 14, 12, -1], startFret: 12 },
  ],
  'E_Major': [
    { name: 'Open', frets: [0, 0, 1, 2, 2, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [7, 9, 9, 9, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 12, 13, 14, 14, 12], startFret: 12 },
  ],
  'F_Major': [
    { name: 'Barre 1st', frets: [1, 1, 2, 3, 3, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [-1, 10, 10, 10, 8, -1], startFret: 8 },
  ],
  'F#_Major': [
    { name: 'Barre 2nd', frets: [2, 2, 3, 4, 4, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [-1, 11, 11, 11, 9, -1], startFret: 9 },
  ],
  'G#_Major': [
    { name: 'Barre 4th', frets: [4, 4, 5, 6, 6, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [-1, 13, 13, 13, 11, -1], startFret: 11 },
  ],
  'A#_Major': [
    { name: 'Barre 1st', frets: [1, 3, 3, 3, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 6, 7, 8, 8, 6], startFret: 6 },
  ],
  'B_Major': [
    { name: 'Barre 2nd', frets: [2, 4, 4, 4, 2, -1], startFret: 2 },
    { name: 'Barre 7th', frets: [7, 7, 8, 9, 9, 7], startFret: 7 },
  ],
  'D#_Major': [
    { name: 'Barre 6th', frets: [6, 8, 8, 8, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 11, 12, 13, 13, 11], startFret: 11 },
  ],
  'C#_Major': [
    { name: 'Barre 4th', frets: [4, 6, 6, 6, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 9, 10, 11, 11, 9], startFret: 9 },
  ],
  'A_minor': [
    { name: 'Open', frets: [0, 1, 2, 2, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 5, 5, 7, 7, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [-1, 13, 14, 14, 12, -1], startFret: 12 },
  ],
  'E_minor': [
    { name: 'Open', frets: [0, 0, 0, 2, 2, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [-1, 8, 9, 9, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 12, 12, 14, 14, 12], startFret: 12 },
  ],
  'D_minor': [
    { name: 'Open', frets: [1, 3, 2, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 6, 7, 7, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 10, 10, 12, 12, 10], startFret: 10 },
  ],
  'G_minor': [
    { name: 'Barre 3rd', frets: [3, 3, 3, 5, 5, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [-1, 11, 12, 12, 10, -1], startFret: 10 },
  ],
  'C_minor': [
    { name: 'Barre 3rd', frets: [3, 4, 5, 5, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 8, 8, 10, 10, 8], startFret: 8 },
  ],
  'F_minor': [
    { name: 'Barre 1st', frets: [1, 1, 1, 3, 3, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [-1, 9, 10, 10, 8, -1], startFret: 8 },
  ],
  'B_minor': [
    { name: 'Barre 2nd', frets: [2, 3, 4, 4, 2, -1], startFret: 2 },
    { name: 'Barre 7th', frets: [7, 7, 7, 9, 9, 7], startFret: 7 },
  ],
  'C_7': [
    { name: 'Open', frets: [0, 1, 3, 2, 3, -1], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 5, 3, 5, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 8, 9, 8, 10, 8], startFret: 8 },
  ],
  'G_7': [
    { name: 'Open', frets: [1, 0, 0, 0, 2, 3], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 3, 4, 3, 5, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [-1, 12, 10, 12, 10, -1], startFret: 10 },
  ],
  'D_7': [
    { name: 'Open', frets: [2, 1, 2, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 7, 5, 7, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 10, 11, 10, 12, 10], startFret: 10 },
  ],
  'A_7': [
    { name: 'Open', frets: [0, 2, 0, 2, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 5, 6, 5, 7, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [-1, 14, 12, 14, 12, -1], startFret: 12 },
  ],
  'E_7': [
    { name: 'Open', frets: [0, 0, 1, 0, 2, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [7, 9, 7, 9, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 12, 13, 12, 14, 12], startFret: 12 },
  ],
  'F_7': [
    { name: 'Barre 1st', frets: [1, 1, 2, 1, 3, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [8, 10, 8, 10, 8, -1], startFret: 8 },
  ],
  'F#_7': [
    { name: 'Barre 2nd', frets: [2, 2, 3, 2, 4, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [9, 11, 9, 11, 9, -1], startFret: 9 },
  ],
  'G#_7': [
    { name: 'Barre 4th', frets: [4, 4, 5, 4, 6, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [11, 13, 11, 13, 11, -1], startFret: 11 },
  ],
  'A#_7': [
    { name: 'Barre 1st', frets: [1, 3, 1, 3, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 6, 7, 6, 8, 6], startFret: 6 },
  ],
  'B_7': [
    { name: 'Open', frets: [2, 0, 2, 1, 2, -1], startFret: 0 },
    { name: 'Barre 7th', frets: [7, 7, 8, 7, 9, 7], startFret: 7 },
  ],
  'C#_7': [
    { name: 'Barre 4th', frets: [4, 6, 4, 6, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 9, 10, 9, 11, 9], startFret: 9 },
  ],
  'D#_7': [
    { name: 'Barre 6th', frets: [6, 8, 6, 8, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 11, 12, 11, 13, 11], startFret: 11 },
  ],
  'B_dim': [
    { name: 'Open', frets: [-1, 3, 4, 3, 2, -1], startFret: 0 },
    { name: 'Barre 7th', frets: [-1, -1, 7, 9, 8, 7], startFret: 7 },
  ],
  'F#_minor': [
    { name: 'Barre 2nd', frets: [2, 2, 2, 4, 4, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [-1, 10, 11, 11, 9, -1], startFret: 9 },
  ],
  'C#_minor': [
    { name: 'Barre 4th', frets: [4, 5, 6, 6, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 9, 9, 11, 11, 9], startFret: 9 },
  ],
  'G#_minor': [
    { name: 'Barre 4th', frets: [4, 4, 4, 6, 6, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [-1, 12, 13, 13, 11, -1], startFret: 11 },
  ],
  'D#_minor': [
    { name: 'Barre 6th', frets: [6, 7, 8, 8, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 11, 11, 13, 13, 11], startFret: 11 },
  ],
  'A#_minor': [
    { name: 'Barre 1st', frets: [1, 2, 3, 3, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 6, 6, 8, 8, 6], startFret: 6 },
  ],

  // Major 7th (maj7) voicings
  'C_maj7': [
    { name: 'Open', frets: [0, 0, 0, 2, 3, -1], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 5, 4, 5, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 8, 9, 9, 10, 8], startFret: 8 },
  ],
  'C#_maj7': [
    { name: 'Barre 4th', frets: [4, 6, 5, 6, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 9, 10, 10, 11, 9], startFret: 9 },
  ],
  'D_maj7': [
    { name: 'Open', frets: [2, 2, 2, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 7, 6, 7, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 10, 11, 11, 12, 10], startFret: 10 },
  ],
  'D#_maj7': [
    { name: 'Barre 6th', frets: [6, 8, 7, 8, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 11, 12, 12, 13, 11], startFret: 11 },
  ],
  'E_maj7': [
    { name: 'Open', frets: [0, 0, 1, 1, 2, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [7, 9, 8, 9, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 12, 13, 13, 14, 12], startFret: 12 },
  ],
  'F_maj7': [
    { name: 'Open', frets: [0, 1, 2, 3, -1, -1], startFret: 0 },
    { name: 'Barre 1st', frets: [1, 1, 2, 2, 3, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [8, 10, 9, 10, 8, -1], startFret: 8 },
  ],
  'F#_maj7': [
    { name: 'Barre 2nd', frets: [2, 2, 3, 3, 4, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [9, 11, 10, 11, 9, -1], startFret: 9 },
  ],
  'G_maj7': [
    { name: 'Open', frets: [2, 0, 0, 0, 2, 3], startFret: 0 },
    { name: 'Barre 3rd', frets: [3, 3, 4, 4, 5, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [10, 12, 11, 12, 10, -1], startFret: 10 },
  ],
  'G#_maj7': [
    { name: 'Barre 4th', frets: [4, 4, 5, 5, 6, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [11, 13, 12, 13, 11, -1], startFret: 11 },
  ],
  'A_maj7': [
    { name: 'Open', frets: [0, 2, 1, 2, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 5, 6, 6, 7, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [12, 14, 13, 14, 12, -1], startFret: 12 },
  ],
  'A#_maj7': [
    { name: 'Barre 1st', frets: [1, 3, 2, 3, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 6, 7, 7, 8, 6], startFret: 6 },
  ],
  'B_maj7': [
    { name: 'Barre 2nd', frets: [2, 4, 3, 4, 2, -1], startFret: 2 },
    { name: 'Barre 7th', frets: [7, 7, 8, 8, 9, 7], startFret: 7 },
  ],

  // Minor 7th (m7) voicings
  'C_m7': [
    { name: 'Barre 3rd', frets: [3, 4, 3, 5, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 8, 8, 8, 10, 8], startFret: 8 },
  ],
  'C#_m7': [
    { name: 'Barre 4th', frets: [4, 5, 4, 6, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 9, 9, 9, 11, 9], startFret: 9 },
  ],
  'D_m7': [
    { name: 'Open', frets: [1, 1, 2, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 6, 5, 7, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 10, 10, 10, 12, 10], startFret: 10 },
  ],
  'D#_m7': [
    { name: 'Barre 6th', frets: [6, 7, 6, 8, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 11, 11, 11, 13, 11], startFret: 11 },
  ],
  'E_m7': [
    { name: 'Open', frets: [0, 0, 0, 0, 2, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [7, 8, 7, 9, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 12, 12, 12, 14, 12], startFret: 12 },
  ],
  'F_m7': [
    { name: 'Barre 1st', frets: [1, 1, 1, 1, 3, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [8, 9, 8, 10, 8, -1], startFret: 8 },
  ],
  'F#_m7': [
    { name: 'Barre 2nd', frets: [2, 2, 2, 2, 4, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [9, 10, 9, 11, 9, -1], startFret: 9 },
  ],
  'G_m7': [
    { name: 'Barre 3rd', frets: [3, 3, 3, 3, 5, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [10, 11, 10, 12, 10, -1], startFret: 10 },
  ],
  'G#_m7': [
    { name: 'Barre 4th', frets: [4, 4, 4, 4, 6, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [11, 12, 11, 13, 11, -1], startFret: 11 },
  ],
  'A_m7': [
    { name: 'Open', frets: [0, 1, 0, 2, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 5, 5, 5, 7, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [12, 13, 12, 14, 12, -1], startFret: 12 },
  ],
  'A#_m7': [
    { name: 'Barre 1st', frets: [1, 2, 1, 3, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 6, 6, 6, 8, 6], startFret: 6 },
  ],
  'B_m7': [
    { name: 'Barre 2nd', frets: [2, 3, 2, 4, 2, -1], startFret: 2 },
    { name: 'Barre 7th', frets: [7, 7, 7, 7, 9, 7], startFret: 7 },
  ],

  // Diminished (dim) voicings
  'C_dim': [
    { name: 'Barre 3rd', frets: [-1, 4, 5, 4, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 7, 8, 10, -1, -1], startFret: 7 },
  ],
  'C#_dim': [
    { name: 'Barre 4th', frets: [-1, 5, 6, 5, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 8, 9, 11, -1, -1], startFret: 8 },
  ],
  'D_dim': [
    { name: 'Open', frets: [1, 3, 1, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [-1, 6, 7, 6, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 9, 10, 12, -1, -1], startFret: 9 },
  ],
  'D#_dim': [
    { name: 'Barre 6th', frets: [-1, 7, 8, 7, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 10, 11, 13, -1, -1], startFret: 10 },
  ],
  'E_dim': [
    { name: 'Open', frets: [-1, -1, 0, 2, 1, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [-1, 8, 9, 8, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 11, 12, 14, -1, -1], startFret: 11 },
  ],
  'F_dim': [
    { name: 'Barre 1st', frets: [-1, -1, 1, 3, 2, 1], startFret: 1 },
    { name: 'Barre 8th', frets: [-1, 9, 10, 9, 8, -1], startFret: 8 },
  ],
  'F#_dim': [
    { name: 'Barre 2nd', frets: [-1, -1, 2, 4, 3, 2], startFret: 2 },
    { name: 'Barre 9th', frets: [-1, 10, 11, 10, 9, -1], startFret: 9 },
  ],
  'G_dim': [
    { name: 'Barre 3rd', frets: [-1, -1, 3, 5, 4, 3], startFret: 3 },
    { name: 'Barre 10th', frets: [-1, 11, 12, 11, 10, -1], startFret: 10 },
  ],
  'G#_dim': [
    { name: 'Barre 4th', frets: [-1, -1, 4, 6, 5, 4], startFret: 4 },
    { name: 'Barre 11th', frets: [-1, 12, 13, 12, 11, -1], startFret: 11 },
  ],
  'A_dim': [
    { name: 'Open', frets: [-1, 1, 2, 1, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [-1, -1, 5, 7, 6, 5], startFret: 5 },
    { name: 'Barre 12th', frets: [-1, 13, 14, 13, 12, -1], startFret: 12 },
  ],
  'A#_dim': [
    { name: 'Barre 1st', frets: [-1, 2, 3, 2, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [-1, -1, 6, 8, 7, 6], startFret: 6 },
  ],
  // B_dim already exists above

  // Diminished 7th (dim7) voicings
  'C_dim7': [
    { name: 'Barre 3rd', frets: [-1, 4, 5, 4, 3, -1], startFret: 3 },
    { name: 'Barre 8th', frets: [8, 7, 8, 7, -1, -1], startFret: 7 },
  ],
  'C#_dim7': [
    { name: 'Barre 4th', frets: [-1, 5, 6, 5, 4, -1], startFret: 4 },
    { name: 'Barre 9th', frets: [9, 8, 9, 8, -1, -1], startFret: 8 },
  ],
  'D_dim7': [
    { name: 'Open', frets: [1, 0, 1, 0, -1, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [-1, 6, 7, 6, 5, -1], startFret: 5 },
    { name: 'Barre 10th', frets: [10, 9, 10, 9, -1, -1], startFret: 9 },
  ],
  'D#_dim7': [
    { name: 'Barre 6th', frets: [-1, 7, 8, 7, 6, -1], startFret: 6 },
    { name: 'Barre 11th', frets: [11, 10, 11, 10, -1, -1], startFret: 10 },
  ],
  'E_dim7': [
    { name: 'Open', frets: [0, 2, 0, 2, 1, 0], startFret: 0 },
    { name: 'Barre 7th', frets: [-1, 8, 9, 8, 7, -1], startFret: 7 },
    { name: 'Barre 12th', frets: [12, 11, 12, 11, -1, -1], startFret: 11 },
  ],
  'F_dim7': [
    { name: 'Barre 1st', frets: [1, 3, 1, 3, 2, 1], startFret: 1 },
    { name: 'Barre 7th', frets: [7, 9, 7, 9, 8, -1], startFret: 7 },
  ],
  'F#_dim7': [
    { name: 'Barre 2nd', frets: [2, 4, 2, 4, 3, 2], startFret: 2 },
    { name: 'Barre 8th', frets: [8, 10, 8, 10, 9, -1], startFret: 8 },
  ],
  'G_dim7': [
    { name: 'Barre 3rd', frets: [3, 5, 3, 5, 4, 3], startFret: 3 },
    { name: 'Barre 9th', frets: [9, 11, 9, 11, 10, -1], startFret: 9 },
  ],
  'G#_dim7': [
    { name: 'Barre 4th', frets: [4, 6, 4, 6, 5, 4], startFret: 4 },
    { name: 'Barre 10th', frets: [10, 12, 10, 12, 11, -1], startFret: 10 },
  ],
  'A_dim7': [
    { name: 'Open', frets: [-1, 1, 2, 1, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 7, 5, 7, 6, 5], startFret: 5 },
    { name: 'Barre 11th', frets: [11, 13, 11, 13, 12, -1], startFret: 11 },
  ],
  'A#_dim7': [
    { name: 'Barre 2nd', frets: [3, 2, 3, 2, -1, -1], startFret: 2 },
    { name: 'Barre 6th', frets: [6, 8, 6, 8, 7, 6], startFret: 6 },
  ],
  'B_dim7': [
    { name: 'Barre 1st', frets: [-1, 3, 1, 3, 2, -1], startFret: 1 },
    { name: 'Barre 7th', frets: [7, 9, 7, 9, 8, 7], startFret: 7 },
  ],

  // Augmented (aug) voicings
  'C_aug': [
    { name: 'Open', frets: [0, 1, 1, 2, 3, -1], startFret: 0 },
    { name: 'Barre 8th', frets: [8, 9, 9, 10, -1, 8], startFret: 8 },
  ],
  'C#_aug': [
    { name: 'Barre 1st', frets: [1, 2, 2, 3, -1, 1], startFret: 1 },
    { name: 'Barre 9th', frets: [9, 10, 10, 11, -1, 9], startFret: 9 },
  ],
  'D_aug': [
    { name: 'Open', frets: [2, 3, 3, 4, -1, 2], startFret: 0 },
    { name: 'Barre 10th', frets: [10, 11, 11, 12, -1, 10], startFret: 10 },
  ],
  'D#_aug': [
    { name: 'Barre 3rd', frets: [3, 4, 4, 5, -1, 3], startFret: 3 },
    { name: 'Barre 11th', frets: [11, 12, 12, 13, -1, 11], startFret: 11 },
  ],
  'E_aug': [
    { name: 'Open', frets: [0, 1, 1, 2, -1, 0], startFret: 0 },
    { name: 'Barre 12th', frets: [12, 13, 13, 14, -1, 12], startFret: 12 },
  ],
  'F_aug': [
    { name: 'Barre 1st', frets: [1, 2, 2, 3, -1, 1], startFret: 1 },
    { name: 'Barre 5th', frets: [5, 6, 6, 7, -1, 5], startFret: 5 },
  ],
  'F#_aug': [
    { name: 'Barre 2nd', frets: [2, 3, 3, 4, -1, 2], startFret: 2 },
    { name: 'Barre 6th', frets: [6, 7, 7, 8, -1, 6], startFret: 6 },
  ],
  'G_aug': [
    { name: 'Barre 3rd', frets: [3, 4, 4, 5, -1, 3], startFret: 3 },
    { name: 'Barre 7th', frets: [7, 8, 8, 9, -1, 7], startFret: 7 },
  ],
  'G#_aug': [
    { name: 'Barre 4th', frets: [4, 5, 5, 6, -1, 4], startFret: 4 },
    { name: 'Barre 8th', frets: [8, 9, 9, 10, -1, 8], startFret: 8 },
  ],
  'A_aug': [
    { name: 'Open', frets: [1, 2, 2, -1, 0, -1], startFret: 0 },
    { name: 'Barre 5th', frets: [5, 6, 6, 7, -1, 5], startFret: 5 },
  ],
  'A#_aug': [
    { name: 'Barre 1st', frets: [2, 3, 3, -1, 1, -1], startFret: 1 },
    { name: 'Barre 6th', frets: [6, 7, 7, 8, -1, 6], startFret: 6 },
  ],
  'B_aug': [
    { name: 'Barre 2nd', frets: [3, 4, 4, -1, 2, -1], startFret: 2 },
    { name: 'Barre 7th', frets: [7, 8, 8, 9, -1, 7], startFret: 7 },
  ],
};

// --- sus2 / sus4 voicings ---------------------------------------------------
// Derived from movable E-shape and A-shape barre forms; the barre fret for
// each root is computed from the root's position on the low E / A string, so
// every generated voicing contains exactly the {1,2,5} (sus2) or {1,4,5}
// (sus4) intervals. Frets arrays use the same [high e, B, G, D, A, low E]
// string order as the literal data above.
const ordinalFret = (n: number): string => {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

const susShapeName = (barreFret: number): string =>
  barreFret === 0 ? 'Open' : `Barre ${ordinalFret(barreFret)}`;

interface SusShape {
  openNoteIndex: number; // NOTES index of the shape's root string open note
  build: (n: number) => number[];
}

const SUS_SHAPES: Record<'sus2' | 'sus4', SusShape[]> = {
  sus4: [
    // E-shape: root on low E string (Esus4 open = 022200)
    { openNoteIndex: NOTES.indexOf('E'), build: n => [n, n, n + 2, n + 2, n + 2, n] },
    // A-shape: root on A string (Asus4 open = x02230)
    { openNoteIndex: NOTES.indexOf('A'), build: n => [n, n + 3, n + 2, n + 2, n, -1] },
  ],
  sus2: [
    // E-shape: root on low E string (Esus2 open = 024400)
    { openNoteIndex: NOTES.indexOf('E'), build: n => [n, n, n + 4, n + 4, n + 2, n] },
    // A-shape: root on A string (Asus2 open = x02200)
    { openNoteIndex: NOTES.indexOf('A'), build: n => [n, n, n + 2, n + 2, n, -1] },
  ],
};

for (const susType of ['sus2', 'sus4'] as const) {
  NOTES.forEach((root, rootIndex) => {
    GUITAR_VOICINGS[`${root}_${susType}`] = SUS_SHAPES[susType]
      .map(({ openNoteIndex, build }) => {
        const barreFret = (rootIndex - openNoteIndex + 12) % 12;
        return { name: susShapeName(barreFret), frets: build(barreFret), startFret: barreFret };
      })
      .sort((a, b) => a.startFret - b.startFret);
  });
}

// --- D-shape voicings (root on the 4th string) -------------------------------
// Movable top-4-string forms derived from the open D-family shapes, so every
// root/type combo has at least one voicing whose bass note is the root on the
// D string. Offsets are relative to the root fret n on the D string; frets
// arrays use the same [high e, B, G, D, A, low E] order as the data above.
// Appended after the curated voicings to keep existing voicing indices stable
// (URL state and stored progressions reference voicings by index).
const D_SHAPE_OFFSETS: Record<ChordType, [number, number, number, number]> = {
  'Major': [2, 3, 2, 0], // D:    xx0232
  'minor': [1, 3, 2, 0], // Dm:   xx0231
  'sus2':  [0, 3, 2, 0], // Dsus2: xx0230
  'sus4':  [3, 3, 2, 0], // Dsus4: xx0233
  'dim':   [1, 3, 1, 0], // Ddim:  xx0131
  'aug':   [2, 3, 3, 0], // Daug:  xx0332
  '7':     [2, 1, 2, 0], // D7:    xx0212
  'm7':    [1, 1, 2, 0], // Dm7:   xx0211
  'maj7':  [2, 2, 2, 0], // Dmaj7: xx0222
  'dim7':  [1, 0, 1, 0], // Ddim7: xx0101
};

const D_STRING_INDEX = NOTES.indexOf('D');

for (const type of CHORD_TYPE_IDS) {
  NOTES.forEach((root, rootIndex) => {
    const n = (rootIndex - D_STRING_INDEX + 12) % 12;
    const offsets = D_SHAPE_OFFSETS[type];
    const frets = [offsets[0] + n, offsets[1] + n, offsets[2] + n, offsets[3] + n, -1, -1];
    const key = `${root}_${type}`;
    const defs = GUITAR_VOICINGS[key] ?? (GUITAR_VOICINGS[key] = []);
    const isDuplicate = defs.some(def => def.frets.every((f, i) => f === frets[i]));
    if (!isDuplicate) {
      defs.push({ name: 'D Shape', frets, startFret: n });
    }
  });
}
