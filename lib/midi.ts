import { NOTES, Note, ChordType } from '../constants/musicData';
import { getChordNotes } from './musicTheory';

// --- Standard MIDI File writer (Format 0, single track) ---------------------
// Hand-rolled, no external dependency. Pitch convention: C4 = 60.

export interface MidiNoteEvent {
  /** Ticks since the previous event. */
  delta: number;
  type: 'noteOn' | 'noteOff';
  /** MIDI pitch 0-127. */
  note: number;
}

export interface EncodeMidiOptions {
  bpm: number;
  ticksPerQuarter?: number;
}

const NOTE_ON = 0x90; // channel 0
const NOTE_OFF = 0x80; // channel 0
const NOTE_ON_VELOCITY = 96;

/**
 * Scientific pitch name to MIDI number, sharps only (matching the app's
 * internal NOTES spelling). "C4" -> 60, "A4" -> 69, "C#5" -> 73.
 */
export const noteToMidi = (note: string): number => {
  const match = /^([A-G]#?)(-?\d+)$/.exec(note);
  if (!match) throw new Error(`Invalid note name: ${note}`);
  const noteIndex = NOTES.indexOf(match[1] as Note);
  if (noteIndex === -1) throw new Error(`Invalid note name: ${note}`);
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + noteIndex;
};

/**
 * MIDI variable-length quantity: 7 bits per byte, high bit set on all but
 * the last byte. 0 -> [0x00], 127 -> [0x7F], 128 -> [0x81, 0x00].
 */
export const vlq = (n: number): number[] => {
  if (n < 0 || !Number.isInteger(n)) throw new Error(`Invalid VLQ value: ${n}`);
  const bytes = [n & 0x7f];
  let rest = n >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
};

const u16 = (n: number): number[] => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n: number): number[] => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const ascii = (s: string): number[] => [...s].map(c => c.charCodeAt(0));

/**
 * Encodes note events into a valid Format 0 single-track Standard MIDI File.
 * Track layout: tempo meta event at delta 0, note events, End of Track.
 */
export const encodeMidi = (
  events: MidiNoteEvent[],
  { bpm, ticksPerQuarter = 480 }: EncodeMidiOptions,
): Uint8Array => {
  // Tempo meta event: FF 51 03 <microseconds per quarter, 24-bit BE>.
  const usPerQuarter = Math.round(60_000_000 / bpm);
  const track: number[] = [
    0x00, 0xff, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xff,
    (usPerQuarter >> 8) & 0xff,
    usPerQuarter & 0xff,
  ];

  for (const event of events) {
    track.push(...vlq(event.delta));
    if (event.type === 'noteOn') {
      track.push(NOTE_ON, event.note & 0x7f, NOTE_ON_VELOCITY);
    } else {
      track.push(NOTE_OFF, event.note & 0x7f, 0x00);
    }
  }

  // End of Track: FF 2F 00 at delta 0.
  track.push(0x00, 0xff, 0x2f, 0x00);

  const bytes = [
    ...ascii('MThd'), ...u32(6), ...u16(0), ...u16(1), ...u16(ticksPerQuarter),
    ...ascii('MTrk'), ...u32(track.length), ...track,
  ];
  return new Uint8Array(bytes);
};

/**
 * Renders a chord progression as block chords, one quarter note (480 ticks)
 * per chord, back-to-back. Chord tones come from the chord formula at
 * octave 4, root position.
 */
export const progressionToMidi = (
  chords: { root: Note; type: ChordType }[],
  bpm: number,
): Uint8Array => {
  const ticksPerQuarter = 480;
  const events: MidiNoteEvent[] = [];

  for (const chord of chords) {
    const pitches = getChordNotes(chord.root, chord.type).map(n => n.midi);
    for (const pitch of pitches) {
      events.push({ delta: 0, type: 'noteOn', note: pitch });
    }
    pitches.forEach((pitch, i) => {
      events.push({ delta: i === 0 ? ticksPerQuarter : 0, type: 'noteOff', note: pitch });
    });
  }

  return encodeMidi(events, { bpm, ticksPerQuarter });
};
