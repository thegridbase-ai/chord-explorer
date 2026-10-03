import * as Tone from 'tone';
import type { Chord, ChordVoicing } from '../constants/musicData';
import { NOTES, CHORD_TYPES } from '../constants/musicData';

let pianoSynth: Tone.PolySynth | null = null;
let guitarSynth: Tone.PluckSynth | null = null;
let reverb: Tone.Reverb | null = null;
let isInitialized = false;
let currentSequence: Tone.Part | null = null;

const resumeAudioContext = async (): Promise<void> => {
  const context = Tone.getContext();
  if (context.state === 'suspended') {
    await context.resume();
  }
};

const initializeAudio = async (): Promise<void> => {
  // Always try to start/resume Tone for mobile compatibility
  await Tone.start();
  await resumeAudioContext();

  if (isInitialized) return;

  reverb = new Tone.Reverb({
    decay: 2.5,
    wet: 0.3,
    preDelay: 0.01,
  }).toDestination();

  await reverb.generate();

  pianoSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: 'triangle8',
    },
    envelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0.4,
      release: 1.2,
    },
  }).connect(reverb);
  pianoSynth.volume.value = -6;

  guitarSynth = new Tone.PluckSynth({
    attackNoise: 1.2,
    dampening: 3500,
    resonance: 0.96,
    release: 1.5,
  }).connect(reverb);
  guitarSynth.volume.value = -3;

  isInitialized = true;
};

const noteToFrequency = (note: string, octave: number): string => {
  return `${note}${octave}`;
};

const getChordNotesForPlayback = (chord: Chord, baseOctave: number = 4): string[] => {
  const rootIndex = NOTES.indexOf(chord.root);
  const formula = CHORD_TYPES[chord.type];
  if (!formula) return [];

  return formula.intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const octaveOffset = Math.floor((rootIndex + interval) / 12);
    const note = NOTES[noteIndex];
    return noteToFrequency(note, baseOctave + octaveOffset);
  });
};

const STRUM_SECONDS = 0.03;
let lastStrumAttack = 0;

// Strum start times on the audio clock, 30 ms per string and always after the previous strum's last attack.
// PluckSynth's noise source throws when a start does not strictly follow the previous one, which a
// setTimeout strum hit whenever two callbacks fired late in the same task and read the same clock.
export const strumStartTimes = (count: number, now: number, previousAttack: number): number[] => {
  const first = Math.max(now, previousAttack + STRUM_SECONDS);
  return Array.from({ length: count }, (_, i) => first + i * STRUM_SECONDS);
};

const strumGuitar = (notes: string[]): void => {
  if (!guitarSynth) return;
  strumStartTimes(notes.length, Tone.now(), lastStrumAttack).forEach((time, i) => {
    guitarSynth?.triggerAttackRelease(notes[i], '2n', time);
    lastStrumAttack = time;
  });
};

export const playChord = async (
  notes: string[],
  instrument: 'piano' | 'guitar'
): Promise<void> => {
  await initializeAudio();

  if (instrument === 'piano' && pianoSynth) {
    pianoSynth.triggerAttackRelease(notes, '2n');
  } else if (instrument === 'guitar' && guitarSynth) {
    strumGuitar(notes);
  }
};

export const playProgression = async (
  chords: Chord[],
  bpm: number,
  instrument: 'piano' | 'guitar'
): Promise<void> => {
  await initializeAudio();

  stopPlayback();

  // BPM controls everything - one beat = 60/bpm seconds
  // Arpeggio: each note is one beat apart
  // Chord change: after all notes in chord are played (based on note count)
  Tone.getTransport().bpm.value = bpm;

  // Calculate chord start times based on note counts
  // Each chord starts after previous chord's notes finish (1 beat per note)
  let currentBeat = 0;
  const events = chords.map((chord) => {
    const notes = getChordNotesForPlayback(chord);
    const event = {
      time: `0:${currentBeat}:0`,
      notes,
      chord,
    };
    // Next chord starts after this chord's notes (1 beat per note)
    currentBeat += notes.length;
    return event;
  });

  const totalBeats = currentBeat;

  currentSequence = new Tone.Part((time, event) => {
    const beatDuration = 60 / bpm; // seconds per beat

    if (instrument === 'piano' && pianoSynth) {
      event.notes.forEach((note: string, i: number) => {
        pianoSynth?.triggerAttackRelease(note, '2n', time + i * beatDuration);
      });
    } else if (instrument === 'guitar' && guitarSynth) {
      event.notes.forEach((note: string, i: number) => {
        guitarSynth?.triggerAttackRelease(note, '2n', time + i * beatDuration);
      });
    }
  }, events);

  currentSequence.start(0);

  // Enable looping
  currentSequence.loop = true;
  currentSequence.loopEnd = `0:${totalBeats}:0`;

  Tone.getTransport().start();
};

export const stopPlayback = (): void => {
  if (currentSequence) {
    currentSequence.stop();
    currentSequence.dispose();
    currentSequence = null;
  }

  Tone.getTransport().stop();
  Tone.getTransport().position = 0;

  if (pianoSynth) {
    pianoSynth.releaseAll();
  }
};

export const ensureAudioContext = async (): Promise<void> => {
  // Must be called in response to user gesture for mobile browsers
  await Tone.start();
  await resumeAudioContext();
  await initializeAudio();
};

export const playChordFromChord = async (
  chord: Chord,
  instrument: 'piano' | 'guitar' = 'guitar',
  bpm: number = 120
): Promise<void> => {
  await initializeAudio();

  const notes = getChordNotesForPlayback(chord);
  const beatDuration = 60 / bpm; // seconds per beat

  if (instrument === 'piano' && pianoSynth) {
    notes.forEach((note, i) => {
      setTimeout(() => {
        pianoSynth?.triggerAttackRelease(note, '2n');
      }, i * beatDuration * 1000);
    });
  } else if (instrument === 'guitar' && guitarSynth) {
    notes.forEach((note, i) => {
      setTimeout(() => {
        guitarSynth?.triggerAttackRelease(note, '2n');
      }, i * beatDuration * 1000);
    });
  }
};

// Standard tuning open-string MIDI by FretPosition.string: 0 = low E ... 5 = high e
const STRING_MIDI_BASE = [40, 45, 50, 55, 59, 64];

const fretPositionToNote = (string: number, fret: number): string => {
  const midi = STRING_MIDI_BASE[string] + fret;
  const noteName = NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
};

// Note names in strum order, lowest string first
export const voicingToNoteNames = (voicing: ChordVoicing): string[] =>
  [...voicing].sort((a, b) => a.string - b.string).map(pos => fretPositionToNote(pos.string, pos.fret));

export const playVoicing = async (
  voicing: ChordVoicing,
  instrument: 'piano' | 'guitar' = 'guitar'
): Promise<void> => {
  await initializeAudio();

  const notes = voicingToNoteNames(voicing);

  if (instrument === 'guitar' && guitarSynth) {
    strumGuitar(notes);
  } else if (instrument === 'piano' && pianoSynth) {
    pianoSynth.triggerAttackRelease(notes, '2n');
  }
};

export const playNote = async (
  note: string,
  octave: number,
  duration: string = '8n'
): Promise<void> => {
  await initializeAudio();

  if (pianoSynth) {
    const noteWithOctave = `${note}${octave}`;
    pianoSynth.triggerAttackRelease(noteWithOctave, duration);
  }
};
