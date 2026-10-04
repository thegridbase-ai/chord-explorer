import { describe, it, expect } from 'vitest';
import { voicingToNoteNames, strumStartTimes } from './audioEngine';
import { getAllChordVoicings } from './musicTheory';
import { E_STANDARD, fromChordExplorerFrets, midiToName, shapeToMidi } from './engine';
import { CHORD_TYPE_IDS, GUITAR_VOICINGS, NOTES } from '../constants/musicData';

const curated = (key: string, name: string) => {
  const separator = key.lastIndexOf('_');
  const voicings = getAllChordVoicings(key.slice(0, separator) as never, key.slice(separator + 1) as never);
  const found = voicings.find(v => v.name === name);
  if (!found) throw new Error(`${key} ${name} missing`);
  return found.voicing;
};

describe('voicingToNoteNames', () => {
  it('plays A minor Open as A2 E3 A3 C4 E4', () => {
    expect(voicingToNoteNames(curated('A_minor', 'Open'))).toEqual(['A2', 'E3', 'A3', 'C4', 'E4']);
  });

  it('plays E major Open from the low E string up', () => {
    expect(voicingToNoteNames(curated('E_Major', 'Open'))).toEqual(['E2', 'B2', 'E3', 'G#3', 'B3', 'E4']);
  });

  it('does not depend on the input order', () => {
    const voicing = curated('A_minor', 'Open');
    expect(voicingToNoteNames([...voicing].reverse())).toEqual(voicingToNoteNames(voicing));
  });

  it("matches the engine's shape -> pitch conversion for every curated voicing", () => {
    for (const root of NOTES) {
      for (const type of CHORD_TYPE_IDS) {
        const voicings = getAllChordVoicings(root, type);
        GUITAR_VOICINGS[`${root}_${type}`].forEach((def, i) => {
          const expected = shapeToMidi(fromChordExplorerFrets(def.frets), E_STANDARD).map(midiToName);
          expect(voicingToNoteNames(voicings[i].voicing), `${root}_${type} ${def.name}`).toEqual(expected);
        });
      }
    }
  });
});

describe('strumStartTimes', () => {
  it('spaces the strings 30 ms apart from now', () => {
    const times = strumStartTimes(3, 10, 0);
    expect(times).toHaveLength(3);
    expect(times[0]).toBe(10);
    expect(times[1] - times[0]).toBeCloseTo(0.03, 9);
    expect(times[2] - times[1]).toBeCloseTo(0.03, 9);
  });

  it('never repeats a start time, even when the audio clock has not moved', () => {
    // Two strums computed at the same clock reading (the race behind "Start time must be strictly greater")
    const first = strumStartTimes(5, 2, 0);
    const second = strumStartTimes(5, 2, first[first.length - 1]);
    const all = [...first, ...second];
    for (let i = 1; i < all.length; i++) expect(all[i]).toBeGreaterThan(all[i - 1]);
  });

  it('returns nothing for an empty voicing', () => {
    expect(strumStartTimes(0, 1, 0)).toEqual([]);
  });
});
