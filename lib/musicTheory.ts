
import { NOTES, CHORD_TYPES, GUITAR_VOICINGS, ChordType, Note, NoteWithInterval, Interval, ChordVoicing, FretPosition, Chord, VoicingDefinition } from '../constants/musicData';

export interface VoicingWithMeta {
  name: string;
  startFret: number;
  voicing: ChordVoicing;
  bassString: number; // 6 = low E, 5 = A, 4 = D (string carrying the bass note)
}

// frets order: [high e, B, G, D, A, low E] — the bass string is the last
// sounding entry; index i maps to string number i + 1 (index 5 = 6th string).
const getBassString = (frets: number[]): number => {
  for (let i = 5; i >= 0; i--) {
    if (frets[i] >= 0) return i + 1;
  }
  return 6;
};

export interface Key {
  root: Note;
  mode: 'major' | 'minor';
  chords: Chord[];
  romanNumerals: string[];
}

export interface ChordCompatibility {
  score: number;
  matchingKeys: string[];
  totalMatchingKeys: number;
}

export interface CommonProgression {
  name: string;
  genre: string;
  pattern: string[];
}

const getIntervalName = (semitones: number): Interval => {
  switch (semitones) {
    case 0: return 'Root';
    case 2: return 'Major 2nd';
    case 3: return 'Minor 3rd';
    case 4: return 'Major 3rd';
    case 5: return 'Perfect 4th';
    case 6: return 'Diminished 5th';
    case 7: return 'Perfect 5th';
    case 8: return 'Augmented 5th';
    case 9: return 'Diminished 5th'; // dim7 chord uses this
    case 10: return 'Minor 7th';
    case 11: return 'Major 7th';
    default: return 'Root';
  }
};

export const getChordNotes = (rootNote: Note, chordType: ChordType): NoteWithInterval[] => {
  const rootIndex = NOTES.indexOf(rootNote);
  const formula = CHORD_TYPES[chordType];
  if (!formula) return [];

  return formula.intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    const note = NOTES[noteIndex];
    return {
      note: note,
      octave: 4, // Default octave
      interval: getIntervalName(interval),
      midi: 60 + rootIndex + interval,
    };
  });
};

const convertFretsToVoicing = (frets: number[], rootNote: Note, chordType: ChordType): ChordVoicing => {
    const chordNotes = getChordNotes(rootNote, chordType).map(n => n.note);
    const rootIndex = NOTES.indexOf(rootNote);
    const openStringNotes = ['E', 'A', 'D', 'G', 'B', 'E'].reverse(); // low E to high e

    const voicing: ChordVoicing = [];
    frets.forEach((fret, stringIndex) => {
        if (fret > -1) {
            const openStringIndex = NOTES.indexOf(openStringNotes[stringIndex] as Note);
            const noteIndex = (openStringIndex + fret) % 12;
            const note = NOTES[noteIndex];

            const noteInChordIndex = chordNotes.indexOf(note);
            if(noteInChordIndex !== -1) {
                const rootDist = (noteIndex - rootIndex + 12) % 12;
                const interval = getIntervalName(rootDist);

                voicing.push({
                    string: 5 - stringIndex, // 0 for high E, 5 for low E
                    fret: fret,
                    interval: interval,
                });
            }
        }
    });

    return voicing;
};

export const getAllChordVoicings = (rootNote: Note, chordType: ChordType): VoicingWithMeta[] => {
    const key = `${rootNote}_${chordType}`;
    const voicingDefs = GUITAR_VOICINGS[key];

    if (!voicingDefs) {
        // Fallback for non-defined voicings - return single root position
        return [{
            name: 'Root Position',
            startFret: 0,
            bassString: 6,
            voicing: [{string: 5, fret: NOTES.indexOf(rootNote) % 12, interval: 'Root'}]
        }];
    }

    return voicingDefs.map((def: VoicingDefinition) => ({
        name: def.name,
        startFret: def.startFret,
        bassString: getBassString(def.frets),
        voicing: convertFretsToVoicing(def.frets, rootNote, chordType)
    }));
};

export const getChordVoicing = (rootNote: Note, chordType: ChordType): ChordVoicing => {
    const allVoicings = getAllChordVoicings(rootNote, chordType);
    return allVoicings.length > 0 ? allVoicings[0].voicing : [];
};

// --- Enharmonic display -----------------------------------------------------
// The internal NOTES array stays sharp-based; these helpers only affect what
// the UI shows when the effective key signature uses flats.
const FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Sharp-spelled internal roots of the flat keys:
// F, Bb, Eb, Ab, Db, Gb major and their relative minors Dm, Gm, Cm, Fm, Bbm, Ebm.
const FLAT_MAJOR_KEY_ROOTS: Note[] = ['F', 'A#', 'D#', 'G#', 'C#', 'F#'];
const FLAT_MINOR_KEY_ROOTS: Note[] = ['D', 'G', 'C', 'F', 'A#', 'D#'];

const MINOR_KEY_CHORD_TYPES: ChordType[] = ['minor', 'm7', 'dim', 'dim7'];

export const isMinorKeyType = (chordType?: ChordType): boolean =>
  chordType !== undefined && MINOR_KEY_CHORD_TYPES.includes(chordType);

export const keyUsesFlats = (keyRoot: Note, keyType?: ChordType): boolean =>
  isMinorKeyType(keyType)
    ? FLAT_MINOR_KEY_ROOTS.includes(keyRoot)
    : FLAT_MAJOR_KEY_ROOTS.includes(keyRoot);

// Returns the display spelling for a note. With no key context (or a sharp
// key) the sharp-based internal name is kept; in flat keys the note is
// respelled with flats (e.g. A# -> Bb in F major).
export const displayNote = (note: Note, keyRoot?: Note, keyType?: ChordType): string => {
  if (keyRoot === undefined || !keyUsesFlats(keyRoot, keyType)) return note;
  return FLAT_NOTE_NAMES[NOTES.indexOf(note)];
};

// --- Inversions -------------------------------------------------------------

// Clamps an inversion index into the valid range for a chord type:
// 0..(chordTones - 1). Out-of-range values snap to the nearest bound.
export const clampInversion = (inversion: number, chordType: ChordType): number => {
  const formula = CHORD_TYPES[chordType];
  if (!formula) return 0;
  return Math.min(Math.max(inversion, 0), formula.intervals.length - 1);
};

// Returns the chord tones re-stacked so that the tone at `inversion` is the
// lowest sounding note, with explicit octaves, ordered ascending. The stack is
// kept within a two-octave window starting at baseOctave (the piano's C4-C6
// range by default); if the top would spill over, the whole stack shifts down
// one octave. Interval identity is preserved per tone.
export const invertChordNotes = (
  rootNote: Note,
  chordType: ChordType,
  inversion: number,
  baseOctave: number = 4,
): NoteWithInterval[] => {
  const formula = CHORD_TYPES[chordType];
  if (!formula) return [];

  const inv = clampInversion(inversion, chordType);
  const rootIndex = NOTES.indexOf(rootNote);
  // Absolute pitch in semitones where C{baseOctave} = baseOctave * 12.
  const basePitch = baseOctave * 12 + rootIndex;
  const tones = formula.intervals.map(interval => ({
    interval,
    pitch: basePitch + interval,
  }));

  // Rotate: tones below the inversion point move up an octave.
  const stacked = [
    ...tones.slice(inv),
    ...tones.slice(0, inv).map(t => ({ ...t, pitch: t.pitch + 12 })),
  ];

  // Keep the stack inside [C{baseOctave}, C{baseOctave + 2}].
  const maxPitch = (baseOctave + 2) * 12;
  const shift = Math.max(...stacked.map(t => t.pitch)) > maxPitch ? -12 : 0;

  return stacked.map(t => {
    const pitch = t.pitch + shift;
    return {
      note: NOTES[pitch % 12],
      octave: Math.floor(pitch / 12),
      interval: getIntervalName(t.interval),
      midi: pitch + 12, // MIDI convention: C4 = 60
    };
  });
};

// Display name for a chord, using slash notation when inverted:
// C, Am7, C/E, Am7/G. Both letters respect the enharmonic key context.
export const chordDisplayName = (
  rootNote: Note,
  chordType: ChordType,
  inversion: number = 0,
  keyRoot?: Note,
  keyType?: ChordType,
): string => {
  const formula = CHORD_TYPES[chordType];
  const symbol = formula?.symbol ?? '';
  const base = `${displayNote(rootNote, keyRoot, keyType)}${symbol}`;
  if (!formula) return base;

  const inv = clampInversion(inversion, chordType);
  if (inv === 0) return base;

  const bassIndex = (NOTES.indexOf(rootNote) + formula.intervals[inv]) % 12;
  const bass = displayNote(NOTES[bassIndex], keyRoot, keyType);
  return `${base}/${bass}`;
};

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_SCALE_CHORD_TYPES: ChordType[] = ['Major', 'minor', 'minor', 'Major', 'Major', 'minor', 'dim'];
const ROMAN_NUMERALS_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MINOR_SCALE_CHORD_TYPES: ChordType[] = ['minor', 'dim', 'Major', 'minor', 'minor', 'Major', 'Major'];
const ROMAN_NUMERALS_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];


export const getRelativeChords = (rootNote: Note, chordType: ChordType): Chord[] => {
    const rootIndex = NOTES.indexOf(rootNote);
    let scaleIntervals: number[];
    let chordTypes: ChordType[];

    if (chordType.includes('minor') || chordType.includes('dim')) {
        // Use natural minor scale
        scaleIntervals = MINOR_SCALE_INTERVALS;
        chordTypes = MINOR_SCALE_CHORD_TYPES;
    } else {
        // Use major scale
        scaleIntervals = MAJOR_SCALE_INTERVALS;
        chordTypes = MAJOR_SCALE_CHORD_TYPES;
    }

    return scaleIntervals.map((interval, index) => {
        const noteIndex = (rootIndex + interval) % 12;
        return {
            root: NOTES[noteIndex],
            type: chordTypes[index],
        };
    });
};

// Roman numeral of a chord within a key context. When no key is given, the
// chord is treated as the tonic of its own key (previous behavior).
export const getRomanNumeral = (
    chordRoot: Note,
    chordType: ChordType,
    keyRoot: Note = chordRoot,
    keyType: ChordType = chordType,
): string => {
    const keyIsMinor = isMinorKeyType(keyType);
    const scaleIntervals = keyIsMinor ? MINOR_SCALE_INTERVALS : MAJOR_SCALE_INTERVALS;
    const numerals = keyIsMinor ? ROMAN_NUMERALS_MINOR : ROMAN_NUMERALS_MAJOR;

    const interval = (NOTES.indexOf(chordRoot) - NOTES.indexOf(keyRoot) + 12) % 12;
    const degreeIndex = scaleIntervals.indexOf(interval);
    if (degreeIndex === -1) return '?';

    // Case reflects the actual chord quality, not just the diatonic default.
    const base = numerals[degreeIndex].replace('°', '');
    if (chordType === 'dim' || chordType === 'dim7') return `${base.toLowerCase()}°`;
    if (chordType === 'minor' || chordType === 'm7') return base.toLowerCase();
    return base.toUpperCase();
};

export const getRomanNumeralInKey = (chord: Chord, keyRoot: Note, keyMode: 'major' | 'minor'): string | null => {
    const keyRootIndex = NOTES.indexOf(keyRoot);
    const chordRootIndex = NOTES.indexOf(chord.root);
    const scaleIntervals = keyMode === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
    const numerals = keyMode === 'major' ? ROMAN_NUMERALS_MAJOR : ROMAN_NUMERALS_MINOR;
    const chordTypes = keyMode === 'major' ? MAJOR_SCALE_CHORD_TYPES : MINOR_SCALE_CHORD_TYPES;

    const intervalFromRoot = (chordRootIndex - keyRootIndex + 12) % 12;
    const degreeIndex = scaleIntervals.indexOf(intervalFromRoot);

    if (degreeIndex === -1) return null;

    const expectedType = chordTypes[degreeIndex];
    const isBasicMatch = chord.type === expectedType ||
        (chord.type === '7' && expectedType === 'Major') ||
        (chord.type === 'm7' && expectedType === 'minor') ||
        (chord.type === 'maj7' && expectedType === 'Major') ||
        (chord.type === 'dim7' && expectedType === 'dim');

    if (!isBasicMatch) return null;

    return numerals[degreeIndex];
};

export const getAllKeys = (): Key[] => {
    const keys: Key[] = [];

    for (const root of NOTES) {
        const rootIndex = NOTES.indexOf(root);

        const majorChords = MAJOR_SCALE_INTERVALS.map((interval, index) => ({
            root: NOTES[(rootIndex + interval) % 12] as Note,
            type: MAJOR_SCALE_CHORD_TYPES[index],
        }));
        keys.push({
            root,
            mode: 'major',
            chords: majorChords,
            romanNumerals: ROMAN_NUMERALS_MAJOR,
        });

        const minorChords = MINOR_SCALE_INTERVALS.map((interval, index) => ({
            root: NOTES[(rootIndex + interval) % 12] as Note,
            type: MINOR_SCALE_CHORD_TYPES[index],
        }));
        keys.push({
            root,
            mode: 'minor',
            chords: minorChords,
            romanNumerals: ROMAN_NUMERALS_MINOR,
        });
    }

    return keys;
};

const isChordInKey = (chord: Chord, key: Key): boolean => {
    return key.chords.some(keyChord => {
        if (keyChord.root !== chord.root) return false;

        if (keyChord.type === chord.type) return true;
        if (chord.type === '7' && keyChord.type === 'Major') return true;
        if (chord.type === 'm7' && keyChord.type === 'minor') return true;
        if (chord.type === 'maj7' && keyChord.type === 'Major') return true;
        if (chord.type === 'dim7' && keyChord.type === 'dim') return true;

        return false;
    });
};

export const findCompatibleKeys = (chords: Chord[]): Key[] => {
    if (chords.length === 0) return [];

    const allKeys = getAllKeys();

    return allKeys.filter(key =>
        chords.every(chord => isChordInKey(chord, key))
    );
};

export const getChordCompatibilityScore = (
    chord: Chord,
    selectedChords: Chord[]
): ChordCompatibility => {
    if (selectedChords.length === 0) {
        return { score: 1, matchingKeys: [], totalMatchingKeys: 0 };
    }

    const compatibleKeys = findCompatibleKeys(selectedChords);

    if (compatibleKeys.length === 0) {
        return { score: 0.35, matchingKeys: [], totalMatchingKeys: 0 };
    }

    const keysWithChord = compatibleKeys.filter(key => isChordInKey(chord, key));

    const matchingKeyNames = keysWithChord.map(key =>
        `${key.root} ${key.mode}`
    );

    const score = keysWithChord.length / compatibleKeys.length;

    return {
        score,
        matchingKeys: matchingKeyNames,
        totalMatchingKeys: keysWithChord.length,
    };
};

export const COMMON_PROGRESSIONS: CommonProgression[] = [
    { name: 'Pop Progression', genre: 'Pop', pattern: ['I', 'V', 'vi', 'IV'] },
    { name: 'Axis Progression', genre: 'Pop', pattern: ['vi', 'IV', 'I', 'V'] },
    { name: 'Doo-Wop', genre: 'Pop', pattern: ['I', 'vi', 'IV', 'V'] },
    { name: 'Jazz ii-V-I', genre: 'Jazz', pattern: ['ii', 'V', 'I'] },
    { name: '12-Bar Blues (simplified)', genre: 'Blues', pattern: ['I', 'IV', 'I', 'V'] },
    { name: 'Blues Turnaround', genre: 'Blues', pattern: ['I', 'IV', 'I', 'V'] },
    { name: 'Andalusian Cadence', genre: 'Flamenco', pattern: ['i', 'VII', 'VI', 'V'] },
    { name: 'Canon Progression', genre: 'Classical', pattern: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'] },
    { name: 'Royal Road', genre: 'J-Pop', pattern: ['IV', 'V', 'iii', 'vi'] },
    { name: '50s Progression', genre: 'Rock', pattern: ['I', 'vi', 'ii', 'V'] },
];

export const detectProgressionPattern = (chords: Chord[]): CommonProgression | null => {
    if (chords.length < 3) return null;

    const allKeys = getAllKeys();

    for (const key of allKeys) {
        const romanNumerals: (string | null)[] = chords.map(chord =>
            getRomanNumeralInKey(chord, key.root, key.mode)
        );

        if (romanNumerals.some(rn => rn === null)) continue;

        const progressionPattern = romanNumerals as string[];

        for (const commonProg of COMMON_PROGRESSIONS) {
            if (progressionPattern.length < commonProg.pattern.length) continue;

            let matches = true;
            for (let i = 0; i < commonProg.pattern.length; i++) {
                const expected = commonProg.pattern[i].replace('°', '');
                const actual = progressionPattern[i].replace('°', '');
                if (expected.toLowerCase() !== actual.toLowerCase()) {
                    matches = false;
                    break;
                }
            }

            if (matches) {
                return commonProg;
            }

            if (progressionPattern.length >= commonProg.pattern.length) {
                const rotations = commonProg.pattern.length;
                for (let rot = 1; rot < rotations; rot++) {
                    const rotatedPattern = [
                        ...commonProg.pattern.slice(rot),
                        ...commonProg.pattern.slice(0, rot)
                    ];

                    let rotMatches = true;
                    for (let i = 0; i < rotatedPattern.length && i < progressionPattern.length; i++) {
                        const expected = rotatedPattern[i].replace('°', '');
                        const actual = progressionPattern[i].replace('°', '');
                        if (expected.toLowerCase() !== actual.toLowerCase()) {
                            rotMatches = false;
                            break;
                        }
                    }

                    if (rotMatches) {
                        return commonProg;
                    }
                }
            }
        }
    }

    return null;
};
