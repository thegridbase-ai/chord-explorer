import { describe, it, expect } from 'vitest';
import { noteToMidi, vlq, encodeMidi, progressionToMidi, MidiNoteEvent } from './midi';

// --- Tiny test-side SMF parser ----------------------------------------------

interface ParsedNoteEvent {
  tick: number;
  type: 'noteOn' | 'noteOff';
  note: number;
  velocity: number;
}

const readVlq = (bytes: Uint8Array, offset: number): { value: number; next: number } => {
  let value = 0;
  let i = offset;
  for (;;) {
    const byte = bytes[i++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next: i };
};

const parseSmf = (bytes: Uint8Array) => {
  const trackLength = (bytes[18] << 24) | (bytes[19] << 16) | (bytes[20] << 8) | bytes[21];
  const trackStart = 22;
  const trackEnd = trackStart + trackLength;

  let tick = 0;
  let i = trackStart;
  let tempoUsPerQuarter = -1;
  const notes: ParsedNoteEvent[] = [];

  while (i < trackEnd) {
    const { value: delta, next } = readVlq(bytes, i);
    i = next;
    tick += delta;
    const status = bytes[i];
    if (status === 0xff) {
      const metaType = bytes[i + 1];
      const metaLength = bytes[i + 2];
      if (metaType === 0x51) {
        tempoUsPerQuarter = (bytes[i + 3] << 16) | (bytes[i + 4] << 8) | bytes[i + 5];
      }
      i += 3 + metaLength;
      if (metaType === 0x2f) break;
    } else if ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80) {
      notes.push({
        tick,
        type: (status & 0xf0) === 0x90 ? 'noteOn' : 'noteOff',
        note: bytes[i + 1],
        velocity: bytes[i + 2],
      });
      i += 3;
    } else {
      throw new Error(`Unexpected status byte 0x${status.toString(16)} at offset ${i}`);
    }
  }

  return { trackLength, trackEnd, tempoUsPerQuarter, notes };
};

// --- noteToMidi ---------------------------------------------------------------

describe('noteToMidi', () => {
  it.each([
    ['C4', 60],
    ['A4', 69],
    ['C#4', 61],
    ['B3', 59],
    ['C5', 72],
    ['C#5', 73],
  ])('%s -> %i', (name, expected) => {
    expect(noteToMidi(name)).toBe(expected);
  });

  it('rejects invalid note names', () => {
    expect(() => noteToMidi('H4')).toThrow();
    expect(() => noteToMidi('Db4')).toThrow();
    expect(() => noteToMidi('C')).toThrow();
  });
});

// --- vlq ----------------------------------------------------------------------

describe('vlq', () => {
  it('encodes 0 as a single zero byte', () => {
    expect(vlq(0)).toEqual([0x00]);
  });

  it('encodes 127 as a single byte', () => {
    expect(vlq(127)).toEqual([0x7f]);
  });

  it('encodes 128 as two bytes', () => {
    expect(vlq(128)).toEqual([0x81, 0x00]);
  });

  it('encodes 100000 in three bytes', () => {
    // 100000 = 0b110_0001101_0100000 -> [0x86, 0x8d, 0x20]
    expect(vlq(100000)).toEqual([0x86, 0x8d, 0x20]);
  });
});

// --- encodeMidi -----------------------------------------------------------------

describe('encodeMidi', () => {
  const events: MidiNoteEvent[] = [
    { delta: 0, type: 'noteOn', note: 60 },
    { delta: 480, type: 'noteOff', note: 60 },
  ];
  const bytes = encodeMidi(events, { bpm: 120, ticksPerQuarter: 480 });

  it('starts with a Format 0 header, 1 track, division 480', () => {
    expect([...bytes.slice(0, 14)]).toEqual([
      0x4d, 0x54, 0x68, 0x64, // "MThd"
      0x00, 0x00, 0x00, 0x06, // length 6
      0x00, 0x00, // format 0
      0x00, 0x01, // ntrks 1
      0x01, 0xe0, // division 480
    ]);
  });

  it('has an MTrk chunk whose length field matches the actual byte count', () => {
    expect([...bytes.slice(14, 18)]).toEqual([0x4d, 0x54, 0x72, 0x6b]); // "MTrk"
    const { trackLength, trackEnd } = parseSmf(bytes);
    expect(trackEnd).toBe(bytes.length);
    expect(trackLength).toBe(bytes.length - 22);
  });

  it('contains the tempo meta event for 120 bpm (07 A1 20)', () => {
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join(' ');
    expect(hex).toContain('ff 51 03 07 a1 20');
    expect(parseSmf(bytes).tempoUsPerQuarter).toBe(500000);
  });

  it('rounds the tempo for non-integer microsecond values', () => {
    const at140 = encodeMidi(events, { bpm: 140 });
    // 60000000 / 140 = 428571.43 -> 428571 = 0x06 0x8A 0x3B
    expect(parseSmf(at140).tempoUsPerQuarter).toBe(428571);
  });

  it('writes Note On with velocity 96 and Note Off with velocity 0 on channel 0', () => {
    const { notes } = parseSmf(bytes);
    expect(notes).toEqual([
      { tick: 0, type: 'noteOn', note: 60, velocity: 96 },
      { tick: 480, type: 'noteOff', note: 60, velocity: 0 },
    ]);
  });

  it('ends with End of Track (FF 2F 00)', () => {
    expect([...bytes.slice(-3)]).toEqual([0xff, 0x2f, 0x00]);
  });
});

// --- progressionToMidi -----------------------------------------------------------

describe('progressionToMidi', () => {
  it('renders C major then G major as quarter-note block chords', () => {
    const bytes = progressionToMidi(
      [
        { root: 'C', type: 'Major' },
        { root: 'G', type: 'Major' },
      ],
      120,
    );
    const { tempoUsPerQuarter, notes, trackEnd } = parseSmf(bytes);

    expect(tempoUsPerQuarter).toBe(500000);
    expect(trackEnd).toBe(bytes.length);

    const onsAt = (tick: number) =>
      new Set(notes.filter(n => n.type === 'noteOn' && n.tick === tick).map(n => n.note));
    const offsAt = (tick: number) =>
      new Set(notes.filter(n => n.type === 'noteOff' && n.tick === tick).map(n => n.note));

    // C major {60, 64, 67}: on at 0, off at 480.
    expect(onsAt(0)).toEqual(new Set([60, 64, 67]));
    expect(offsAt(480)).toEqual(new Set([60, 64, 67]));

    // G major {67, 71, 74}: on at 480, off at 960. Back-to-back.
    expect(onsAt(480)).toEqual(new Set([67, 71, 74]));
    expect(offsAt(960)).toEqual(new Set([67, 71, 74]));

    expect(notes).toHaveLength(12);
    expect(notes.every(n => n.type === 'noteOff' || n.velocity === 96)).toBe(true);
  });

  it('produces an empty but valid file for an empty progression', () => {
    const bytes = progressionToMidi([], 120);
    const { notes, trackEnd } = parseSmf(bytes);
    expect(notes).toEqual([]);
    expect(trackEnd).toBe(bytes.length);
    expect([...bytes.slice(-3)]).toEqual([0xff, 0x2f, 0x00]);
  });
});
