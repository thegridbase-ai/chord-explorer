import { describe, it, expect } from 'vitest';
import { displayNote, getRomanNumeral, getChordNotes, keyUsesFlats, invertChordNotes, chordDisplayName, clampInversion } from './musicTheory';
import { NOTES, CHORD_TYPES, Note, ChordType } from '../constants/musicData';

describe('displayNote (enharmonic spelling)', () => {
  it('keeps sharps when no key context is given', () => {
    expect(displayNote('A#')).toBe('A#');
    expect(displayNote('C#')).toBe('C#');
    expect(displayNote('F')).toBe('F');
  });

  it('keeps sharps in sharp keys', () => {
    // C, G, D, A, E, B major have no flats
    expect(displayNote('F#', 'D', 'Major')).toBe('F#');
    expect(displayNote('C#', 'A', 'Major')).toBe('C#');
    expect(displayNote('A#', 'B', 'Major')).toBe('A#');
    // A minor, E minor are sharp-side relative minors
    expect(displayNote('F#', 'E', 'minor')).toBe('F#');
    expect(displayNote('G#', 'A', 'minor')).toBe('G#');
  });

  it('spells with flats in flat major keys', () => {
    expect(displayNote('A#', 'F', 'Major')).toBe('Bb'); // Bb is the IV of F major
    expect(displayNote('D#', 'A#', 'Major')).toBe('Eb'); // Eb in Bb major
    expect(displayNote('A#', 'D#', 'Major')).toBe('Bb'); // Bb in Eb major
    expect(displayNote('C#', 'G#', 'Major')).toBe('Db'); // Db in Ab major
    expect(displayNote('F#', 'C#', 'Major')).toBe('Gb'); // Gb in Db major
    expect(displayNote('G#', 'F#', 'Major')).toBe('Ab'); // Ab in Gb major
  });

  it('spells with flats in flat minor keys (relative minors of flat majors)', () => {
    expect(displayNote('A#', 'D', 'minor')).toBe('Bb'); // Dm (relative of F major)
    expect(displayNote('A#', 'G', 'minor')).toBe('Bb'); // Gm (Bb major)
    expect(displayNote('D#', 'C', 'minor')).toBe('Eb'); // Cm (Eb major)
    expect(displayNote('C#', 'F', 'minor')).toBe('Db'); // Fm (Ab major)
    expect(displayNote('G#', 'A#', 'minor')).toBe('Ab'); // Bbm (Db major)
    expect(displayNote('F#', 'D#', 'm7')).toBe('Gb'); // Ebm7 treated as minor key
  });

  it('leaves natural notes untouched in flat keys', () => {
    for (const natural of ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as Note[]) {
      expect(displayNote(natural, 'F', 'Major')).toBe(natural);
    }
  });

  it('classifies key signatures correctly', () => {
    expect(keyUsesFlats('F', 'Major')).toBe(true);
    expect(keyUsesFlats('F', 'minor')).toBe(true);
    expect(keyUsesFlats('D', 'minor')).toBe(true);
    expect(keyUsesFlats('D', 'Major')).toBe(false);
    expect(keyUsesFlats('C', 'Major')).toBe(false);
    expect(keyUsesFlats('G', 'Major')).toBe(false);
  });
});

describe('getRomanNumeral with key context', () => {
  it('produces correct degrees in C major', () => {
    const expected: [Note, ChordType, string][] = [
      ['C', 'Major', 'I'],
      ['D', 'minor', 'ii'],
      ['E', 'minor', 'iii'],
      ['F', 'Major', 'IV'],
      ['G', 'Major', 'V'],
      ['A', 'minor', 'vi'],
      ['B', 'dim', 'vii°'],
    ];
    for (const [root, type, numeral] of expected) {
      expect(getRomanNumeral(root, type, 'C', 'Major')).toBe(numeral);
    }
  });

  it('produces correct degrees in A minor', () => {
    const expected: [Note, ChordType, string][] = [
      ['A', 'minor', 'i'],
      ['B', 'dim', 'ii°'],
      ['C', 'Major', 'III'],
      ['D', 'minor', 'iv'],
      ['E', 'minor', 'v'],
      ['F', 'Major', 'VI'],
      ['G', 'Major', 'VII'],
    ];
    for (const [root, type, numeral] of expected) {
      expect(getRomanNumeral(root, type, 'A', 'minor')).toBe(numeral);
    }
  });

  it('reflects chord quality for seventh chords', () => {
    expect(getRomanNumeral('D', 'm7', 'C', 'Major')).toBe('ii');
    expect(getRomanNumeral('G', '7', 'C', 'Major')).toBe('V');
    expect(getRomanNumeral('B', 'dim7', 'C', 'Major')).toBe('vii°');
  });

  it('returns ? for non-diatonic roots', () => {
    expect(getRomanNumeral('C#', 'Major', 'C', 'Major')).toBe('?');
    expect(getRomanNumeral('A#', 'minor', 'A', 'minor')).toBe('?');
  });

  it('defaults to treating the chord as tonic of its own key', () => {
    expect(getRomanNumeral('A', 'minor')).toBe('i');
    expect(getRomanNumeral('C', 'Major')).toBe('I');
    expect(getRomanNumeral('B', 'dim')).toBe('i°');
  });
});

describe('chord formulas', () => {
  it('defines sus2 and sus4 correctly', () => {
    expect(CHORD_TYPES['sus2'].intervals).toEqual([0, 2, 7]);
    expect(CHORD_TYPES['sus4'].intervals).toEqual([0, 5, 7]);
  });

  it('spells sus chords from any root', () => {
    expect(getChordNotes('C', 'sus2').map(n => n.note)).toEqual(['C', 'D', 'G']);
    expect(getChordNotes('C', 'sus4').map(n => n.note)).toEqual(['C', 'F', 'G']);
    expect(getChordNotes('A', 'sus4').map(n => n.note)).toEqual(['A', 'D', 'E']);
    expect(getChordNotes('E', 'sus2').map(n => n.note)).toEqual(['E', 'F#', 'B']);
  });

  it('labels sus intervals correctly', () => {
    expect(getChordNotes('C', 'sus2').map(n => n.interval)).toEqual(['Root', 'Major 2nd', 'Perfect 5th']);
    expect(getChordNotes('C', 'sus4').map(n => n.interval)).toEqual(['Root', 'Perfect 4th', 'Perfect 5th']);
  });

  it('keeps existing triad and seventh formulas intact', () => {
    expect(getChordNotes('A', 'minor').map(n => n.note)).toEqual(['A', 'C', 'E']);
    expect(getChordNotes('C', 'Major').map(n => n.note)).toEqual(['C', 'E', 'G']);
    expect(getChordNotes('G', '7').map(n => n.note)).toEqual(['G', 'B', 'D', 'F']);
    expect(getChordNotes('B', 'dim').map(n => n.note)).toEqual(['B', 'D', 'F']);
    expect(getChordNotes('C', 'aug').map(n => n.note)).toEqual(['C', 'E', 'G#']);
  });

  it('has a formula for every declared chord type', () => {
    for (const root of NOTES) {
      for (const type of Object.keys(CHORD_TYPES) as ChordType[]) {
        const notes = getChordNotes(root, type);
        expect(notes.length).toBe(CHORD_TYPES[type].intervals.length);
      }
    }
  });
});

const pitches = (ns: ReturnType<typeof invertChordNotes>) => ns.map(n => `${n.note}${n.octave}`);
const isAscending = (ns: ReturnType<typeof invertChordNotes>) =>
  ns.every((n, i) => i === 0 || n.midi > ns[i - 1].midi);

describe('invertChordNotes', () => {
  it('stacks C major in all three positions', () => {
    const root = invertChordNotes('C', 'Major', 0);
    expect(pitches(root)).toEqual(['C4', 'E4', 'G4']);

    const first = invertChordNotes('C', 'Major', 1);
    expect(pitches(first)).toEqual(['E4', 'G4', 'C5']);
    expect(first[0].note).toBe('E'); // bass note

    const second = invertChordNotes('C', 'Major', 2);
    expect(pitches(second)).toEqual(['G4', 'C5', 'E5']);
    expect(second[0].note).toBe('G'); // bass note
  });

  it('keeps ascending order and correct pitch classes for every inversion', () => {
    for (let inv = 0; inv < 3; inv++) {
      const notes = invertChordNotes('C', 'Major', inv);
      expect(isAscending(notes)).toBe(true);
      expect(new Set(notes.map(n => n.note))).toEqual(new Set(['C', 'E', 'G']));
    }
  });

  it('handles all four Am7 inversions', () => {
    expect(pitches(invertChordNotes('A', 'm7', 0))).toEqual(['A4', 'C5', 'E5', 'G5']);
    expect(pitches(invertChordNotes('A', 'm7', 1))).toEqual(['C5', 'E5', 'G5', 'A5']);
    expect(pitches(invertChordNotes('A', 'm7', 2))).toEqual(['E5', 'G5', 'A5', 'C6']);
    // 3rd inversion would top out above C6, so the stack shifts an octave down
    expect(pitches(invertChordNotes('A', 'm7', 3))).toEqual(['G4', 'A4', 'C5', 'E5']);
    for (let inv = 0; inv < 4; inv++) {
      const notes = invertChordNotes('A', 'm7', inv);
      expect(isAscending(notes)).toBe(true);
      expect(new Set(notes.map(n => n.note))).toEqual(new Set(['A', 'C', 'E', 'G']));
    }
  });

  it('handles the three sus4 positions', () => {
    expect(pitches(invertChordNotes('C', 'sus4', 0))).toEqual(['C4', 'F4', 'G4']);
    expect(pitches(invertChordNotes('C', 'sus4', 1))).toEqual(['F4', 'G4', 'C5']);
    expect(pitches(invertChordNotes('C', 'sus4', 2))).toEqual(['G4', 'C5', 'F5']);
  });

  it('preserves interval identity when a tone moves to the bass', () => {
    const first = invertChordNotes('C', 'Major', 1);
    expect(first[0].interval).toBe('Major 3rd'); // 3rd in the bass is still a 3rd
    expect(first[2].interval).toBe('Root');
  });

  it('keeps every note within the C4-C6 piano range', () => {
    for (const root of NOTES) {
      for (const type of Object.keys(CHORD_TYPES) as ChordType[]) {
        const size = CHORD_TYPES[type].intervals.length;
        for (let inv = 0; inv < size; inv++) {
          const notes = invertChordNotes(root, type, inv);
          for (const n of notes) {
            const pitch = n.octave * 12 + NOTES.indexOf(n.note);
            expect(pitch).toBeGreaterThanOrEqual(48); // C4
            expect(pitch).toBeLessThanOrEqual(72); // C6
          }
          expect(isAscending(notes)).toBe(true);
        }
      }
    }
  });

  it('clamps out-of-range inversions', () => {
    expect(clampInversion(5, 'Major')).toBe(2);
    expect(clampInversion(-1, 'Major')).toBe(0);
    expect(clampInversion(3, 'm7')).toBe(3);
    expect(clampInversion(3, 'sus4')).toBe(2);
    expect(pitches(invertChordNotes('C', 'Major', 5))).toEqual(pitches(invertChordNotes('C', 'Major', 2)));
    expect(pitches(invertChordNotes('C', 'Major', -1))).toEqual(pitches(invertChordNotes('C', 'Major', 0)));
  });
});

describe('chordDisplayName', () => {
  it('uses plain names in root position', () => {
    expect(chordDisplayName('C', 'Major', 0)).toBe('C');
    expect(chordDisplayName('A', 'minor', 0)).toBe('Am');
    expect(chordDisplayName('A', 'm7', 0)).toBe('Am7');
  });

  it('uses slash notation for inversions', () => {
    expect(chordDisplayName('C', 'Major', 1)).toBe('C/E');
    expect(chordDisplayName('C', 'Major', 2)).toBe('C/G');
    expect(chordDisplayName('A', 'm7', 3)).toBe('Am7/G');
    expect(chordDisplayName('C', 'sus4', 1)).toBe('Csus4/F');
  });

  it('respects the enharmonic key context for both letters', () => {
    // In F major: Dm first inversion has F in the bass
    expect(chordDisplayName('D', 'minor', 1, 'F', 'Major')).toBe('Dm/F');
    // In F major context: Gm/A# is spelled Gm/Bb
    expect(chordDisplayName('G', 'minor', 1, 'F', 'Major')).toBe('Gm/Bb');
    // Flat key respells the chord root too: A# minor -> Bbm/Db
    expect(chordDisplayName('A#', 'minor', 1, 'A#', 'minor')).toBe('Bbm/Db');
    // Sharp key keeps sharps
    expect(chordDisplayName('B', 'Major', 1, 'B', 'Major')).toBe('B/D#');
  });

  it('clamps invalid inversions to the valid range', () => {
    expect(chordDisplayName('C', 'Major', -1)).toBe('C');
    expect(chordDisplayName('C', 'Major', 5)).toBe('C/G');
  });
});
