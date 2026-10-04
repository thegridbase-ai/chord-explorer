
import React, { useMemo } from 'react';
import { ChordVoicing, FretPosition, NoteWithInterval, Note } from '../constants/musicData';
import { ScaleNote } from '../lib/scaleTheory';

interface FretboardProps {
  voicing: ChordVoicing;
  chordNotes?: NoteWithInterval[];
  scaleNotes?: ScaleNote[];
  isPreview?: boolean;
  /** Text drawn inside active dots (finger numbers), keyed `${string}-${fret}`. */
  labels?: Record<string, string>;
  /** Strings (0 = low E) drawn with an "x" at the nut. */
  mutedStrings?: number[];
}

const FRET_COUNT = 15;
const STRING_COUNT = 6;
const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21];

// Standard tuning matching voicing convention: string 0 = low E (E2), string 5 = high E (E4)
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
const NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INTERVAL_COLORS: Record<string, string> = {
  'Root': '#ef4444',
  'Major 2nd': '#7c3aed',
  'Minor 3rd': '#7c3aed',
  'Major 3rd': '#7c3aed',
  'Perfect 4th': '#7c3aed',
  'Perfect 5th': '#22c55e',
  'Diminished 5th': '#22c55e',
  'Augmented 5th': '#22c55e',
  'Minor 7th': '#f97316',
  'Major 7th': '#f97316',
  '9th': '#DC143C',
  '11th': '#DC143C',
  '13th': '#DC143C',
};

const DEFAULT_DOT_COLOR = '#888888';
const DARK_LABEL = '#050508';
const LIGHT_LABEL = '#ffffff';

// WCAG relative luminance of a #rrggbb color.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Dark or light label text, whichever contrasts more with the dot.
const labelColorFor = (dotColor: string): string => {
  const l = luminance(dotColor);
  const darkContrast = (l + 0.05) / (luminance(DARK_LABEL) + 0.05);
  const lightContrast = 1.05 / (l + 0.05);
  return darkContrast >= lightContrast ? DARK_LABEL : LIGHT_LABEL;
};
const SCALE_COLOR = '#DAA520';
const EXTENSION_COLOR = '#ff6600';

interface GhostDot {
  string: number;
  fret: number;
  interval: string;
  color: string;
}

interface ScaleDot {
  string: number;
  fret: number;
  intervalName: string;
  color: string;
  isExtension: boolean;
}

const Fretboard: React.FC<FretboardProps> = ({ voicing, chordNotes, scaleNotes, isPreview = false, labels, mutedStrings }) => {
  const activePositions = useMemo(() => {
    const set = new Set<string>();
    voicing.forEach(pos => set.add(`${pos.string}-${pos.fret}`));
    return set;
  }, [voicing]);

  // Widen the board only for voicings above the 15th fret (shared or generated shapes go up to 24)
  const fretCount = useMemo(() => Math.max(FRET_COUNT, ...voicing.map(pos => pos.fret)), [voicing]);

  // Ghost chord dots (existing behavior)
  const ghostDots = useMemo(() => {
    if (!chordNotes || chordNotes.length === 0) return [];
    const noteIntervalMap = new Map<Note, string>();
    chordNotes.forEach(n => noteIntervalMap.set(n.note, n.interval));

    const dots: GhostDot[] = [];
    for (let string = 0; string < STRING_COUNT; string++) {
      for (let fret = 0; fret <= fretCount; fret++) {
        if (activePositions.has(`${string}-${fret}`)) continue;
        const midi = OPEN_STRING_MIDI[string] + fret;
        const noteName = NOTES[midi % 12];
        const interval = noteIntervalMap.get(noteName);
        if (interval) {
          const color = INTERVAL_COLORS[interval] || DEFAULT_DOT_COLOR;
          dots.push({ string, fret, interval, color });
        }
      }
    }
    return dots;
  }, [chordNotes, activePositions, fretCount]);

  // Scale dots (ALL scale notes including chord tones, for complete pattern visibility)
  const scaleDots = useMemo(() => {
    if (!scaleNotes || scaleNotes.length === 0) return [];

    const scaleNoteMap = new Map<Note, ScaleNote>();
    scaleNotes.forEach(sn => scaleNoteMap.set(sn.note, sn));

    const dots: ScaleDot[] = [];
    for (let string = 0; string < STRING_COUNT; string++) {
      for (let fret = 0; fret <= fretCount; fret++) {
        if (activePositions.has(`${string}-${fret}`)) continue;
        const midi = OPEN_STRING_MIDI[string] + fret;
        const noteName = NOTES[midi % 12];
        const scaleInfo = scaleNoteMap.get(noteName);
        if (scaleInfo) {
          dots.push({
            string,
            fret,
            intervalName: scaleInfo.intervalName,
            color: scaleInfo.isExtension ? EXTENSION_COLOR : SCALE_COLOR,
            isExtension: scaleInfo.isExtension,
          });
        }
      }
    }
    return dots;
  }, [scaleNotes, activePositions, fretCount]);

  return (
    <div className={`bg-bg-steel border rounded-xl p-3 md:p-6 select-none transition-all duration-200 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${isPreview ? 'border-crimson ring-1 ring-crimson/30' : 'border-crimson/10'}`}>
      <div className="relative">
        {/* Nut */}
        <div className="absolute top-0 -left-1 h-full w-1.5 md:w-2 bg-bone/50 rounded-sm"></div>

        {/* Frets */}
        <div className="flex justify-between">
          {[...Array(fretCount + 1)].map((_, i) => (
            <div key={i} className="w-px h-20 md:h-28 bg-bone/15"></div>
          ))}
        </div>

        {/* Strings */}
        <div className="absolute top-0 left-0 right-0 flex flex-col justify-between h-full">
          {[...Array(STRING_COUNT)].map((_, i) => (
            <div key={i} className="bg-bone/25" style={{ height: `${i*0.3 + 1}px` }}></div>
          ))}
        </div>

        {/* Fret Markers */}
        <div className="absolute -bottom-4 md:-bottom-5 left-0 right-0 flex justify-around">
            {[...Array(fretCount)].map((_, i) => (
                 <div key={i} className="w-full text-center text-[10px] md:text-xs text-bone/60 font-mono">
                    {FRET_MARKERS.includes(i + 1) ? (i + 1) : ''}
                </div>
            ))}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-around">
            {[...Array(fretCount)].map((_, i) => (
                 <div key={i} className="w-full text-center">
                    {FRET_MARKERS.includes(i + 1) && (i + 1) !== 12 && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-crimson/10 mx-auto"></div>}
                    {(i+1) === 12 && <div className="flex justify-center gap-2 md:gap-4"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-crimson/10"></div><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-crimson/10"></div></div>}
                </div>
            ))}
        </div>

        {/* Scale Diamond Notes (behind everything) */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
            {scaleDots.map((dot, i) => {
                const top = `${((STRING_COUNT - 1 - dot.string) / (STRING_COUNT - 1)) * 100}%`;
                const left = dot.fret === 0 ? `-1.5%` : `${((dot.fret - 0.5) / fretCount) * 100}%`;
                return (
                    <div
                        key={`scale-${i}`}
                        className="absolute w-2.5 h-2.5 md:w-3 md:h-3 transform -translate-x-1/2 -translate-y-1/2 rotate-45"
                        style={{
                            top,
                            left,
                            border: `1.5px solid ${dot.color}`,
                            backgroundColor: `${dot.color}20`,
                            opacity: 0.5,
                        }}
                    />
                );
            })}
        </div>

        {/* Ghost Chord Notes */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
            {ghostDots.map((dot, i) => {
                const top = `${((STRING_COUNT - 1 - dot.string) / (STRING_COUNT - 1)) * 100}%`;
                const left = dot.fret === 0 ? `-1.5%` : `${((dot.fret - 0.5) / fretCount) * 100}%`;
                return (
                    <div
                        key={`ghost-${i}`}
                        className="absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            top,
                            left,
                            backgroundColor: dot.color,
                            opacity: 0.2,
                        }}
                    />
                );
            })}
        </div>

        {/* Muted string markers at the nut */}
        {mutedStrings && mutedStrings.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bottom-0" aria-hidden="true">
            {mutedStrings.map(string => (
              <div
                key={`muted-${string}`}
                className="absolute w-3.5 h-3.5 md:w-5 md:h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-bg-abyss border border-bone/40 text-bone/80 font-mono text-[9px] md:text-[11px] leading-none"
                style={{ top: `${((STRING_COUNT - 1 - string) / (STRING_COUNT - 1)) * 100}%`, left: '-1.5%' }}
              >
                x
              </div>
            ))}
          </div>
        )}

        {/* Active Voicing Notes */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
            {voicing.map((pos, i) => {
                const top = `${((STRING_COUNT - 1 - pos.string) / (STRING_COUNT - 1)) * 100}%`;
                const left = pos.fret === 0 ? `-1.5%` : `${((pos.fret - 0.5) / fretCount) * 100}%`;
                const dotColor = INTERVAL_COLORS[pos.interval] || DEFAULT_DOT_COLOR;
                const label = labels?.[`${pos.string}-${pos.fret}`];

                return (
                    <div
                        key={i}
                        className={`absolute ${label ? 'w-4 h-4' : 'w-3.5 h-3.5'} md:w-5 md:h-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center border border-bone/20`}
                        style={{
                            top,
                            left,
                            backgroundColor: dotColor,
                            boxShadow: `0 0 8px ${dotColor}50, 0 0 16px ${dotColor}20`
                        }}
                    >
                        {label && (
                          <span className="font-mono font-bold text-[10px] md:text-[11px] leading-none" style={{ color: labelColorFor(dotColor) }}>
                            {label}
                          </span>
                        )}
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};

export default Fretboard;
