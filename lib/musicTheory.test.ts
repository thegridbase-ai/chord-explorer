import { describe, it, expect } from 'vitest';
import { displayNote, getRomanNumeral, getChordNotes, keyUsesFlats } from './musicTheory';
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
