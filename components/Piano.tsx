
import React, { useState, useCallback, useMemo } from 'react';
import { NoteWithInterval, Note } from '../constants/musicData';
import { ScaleNote } from '../lib/scaleTheory';
import { playNote, ensureAudioContext } from '../lib/audioEngine';

interface PianoProps {
  notes: NoteWithInterval[];
  scaleNotes?: ScaleNote[];
}

const PIANO_KEYS = [
  { note: 'C', type: 'white', octave: 4 }, { note: 'C#', type: 'black', octave: 4 },
  { note: 'D', type: 'white', octave: 4 }, { note: 'D#', type: 'black', octave: 4 },
  { note: 'E', type: 'white', octave: 4 }, { note: 'F', type: 'white', octave: 4 },
  { note: 'F#', type: 'black', octave: 4 }, { note: 'G', type: 'white', octave: 4 },
  { note: 'G#', type: 'black', octave: 4 }, { note: 'A', type: 'white', octave: 4 },
  { note: 'A#', type: 'black', octave: 4 }, { note: 'B', type: 'white', octave: 4 },
  { note: 'C', type: 'white', octave: 5 }, { note: 'C#', type: 'black', octave: 5 },
  { note: 'D', type: 'white', octave: 5 }, { note: 'D#', type: 'black', octave: 5 },
  { note: 'E', type: 'white', octave: 5 }, { note: 'F', type: 'white', octave: 5 },
  { note: 'F#', type: 'black', octave: 5 }, { note: 'G', type: 'white', octave: 5 },
  { note: 'G#', type: 'black', octave: 5 }, { note: 'A', type: 'white', octave: 5 },
  { note: 'A#', type: 'black', octave: 5 }, { note: 'B', type: 'white', octave: 5 },
  { note: 'C', type: 'white', octave: 6 },
];

const INTERVAL_COLORS: Record<string, string> = {
  'Root': '#ef4444',
  'Minor 3rd': '#7c3aed',
  'Major 3rd': '#7c3aed',
  'Perfect 5th': '#22c55e',
  'Diminished 5th': '#22c55e',
  'Augmented 5th': '#22c55e',
  'Minor 7th': '#f97316',
  'Major 7th': '#f97316',
};

const SCALE_COLOR = '#DAA520';
const EXTENSION_COLOR = '#ff6600';

const Piano: React.FC<PianoProps> = ({ notes, scaleNotes }) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const noteMap = useMemo(() => {
    const map = new Map<Note, NoteWithInterval>();
    notes.forEach(n => map.set(n.note, n));
    return map;
  }, [notes]);

  const activeKeys = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => set.add(`${n.note}${n.octave}`));
    return set;
  }, [notes]);

  // Scale notes by note name (all scale notes get rings for complete pattern)
  const scaleNoteMap = useMemo(() => {
    if (!scaleNotes) return new Map<Note, ScaleNote>();
    const map = new Map<Note, ScaleNote>();
    scaleNotes.forEach(sn => map.set(sn.note, sn));
    return map;
  }, [scaleNotes]);

  const whiteKeys = useMemo(() => PIANO_KEYS.filter(k => k.type === 'white'), []);
  const blackKeys = useMemo(() => PIANO_KEYS.filter(k => k.type === 'black'), []);

  const getIntervalColor = (interval: string): string => {
    return INTERVAL_COLORS[interval] || '#888888';
  };

  const handleKeyPress = useCallback(async (note: string, octave: number) => {
    const keyId = `${note}${octave}`;
    setPressedKey(keyId);
    await ensureAudioContext();
    await playNote(note, octave);
    setTimeout(() => setPressedKey(null), 150);
  }, []);

  const renderScaleRing = (noteName: Note, isBlack: boolean) => {
    const scaleInfo = scaleNoteMap.get(noteName);
    if (!scaleInfo) return null;
    const color = scaleInfo.isExtension ? EXTENSION_COLOR : SCALE_COLOR;
    const size = isBlack ? 'w-2.5 h-2.5 md:w-3 md:h-3' : 'w-3 h-3 md:w-4 md:h-4';
    return (
      <div
        className={`${size} rounded-full pointer-events-none ${isBlack ? '' : 'mb-4'}`}
        style={{
          border: `2px solid ${color}`,
          opacity: 0.6,
          backgroundColor: `${color}15`,
        }}
      />
    );
  };

  return (
    <div className="relative w-full h-28 md:h-36 border border-crimson/15 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(220,20,60,0.1)] bg-bg-steel select-none overflow-x-auto">
      <div className="relative h-full flex min-w-[500px] md:min-w-0">
        {whiteKeys.map((key, index) => {
          const noteInfo = noteMap.get(key.note as Note);
          const color = noteInfo ? getIntervalColor(noteInfo.interval) : '';
          const keyId = `${key.note}${key.octave}`;
          const isPressed = pressedKey === keyId;
          const isActive = activeKeys.has(keyId);
          const isGhost = noteInfo && !isActive;
          const hasScaleRing = scaleNoteMap.has(key.note as Note);
          return (
            <div
              key={`${key.note}${key.octave}-${index}`}
              onClick={() => handleKeyPress(key.note, key.octave)}
              className={`relative h-full flex-1 border-r border-bg-abyss/40 flex items-end justify-center pb-1 md:pb-2 cursor-pointer transition-all duration-75 active:scale-[0.98] ${
                isPressed ? 'bg-bone/80 scale-[0.98]' : 'bg-bone/90 hover:bg-bone/95'
              }`}
            >
              {noteInfo ? (
                <div className="relative pointer-events-none mb-4">
                  <div
                    className="w-3 h-3 md:w-4 md:h-4 rounded-full"
                    style={{
                      backgroundColor: color,
                      opacity: isGhost ? 0.3 : 1,
                      boxShadow: isGhost ? 'none' : `0 0 8px ${color}60, 0 0 16px ${color}20`,
                    }}
                  />
                  {hasScaleRing && (
                    <div className="absolute -inset-1 rounded-full pointer-events-none" style={{ border: `1.5px solid ${SCALE_COLOR}`, opacity: 0.5 }} />
                  )}
                </div>
              ) : hasScaleRing ? (
                renderScaleRing(key.note as Note, false)
              ) : null}
              <span className="absolute bottom-1 md:bottom-2 text-[10px] md:text-xs text-bg-abyss/70 font-mono font-bold pointer-events-none">{key.note === 'C' ? `${key.note}${key.octave}` : key.note}</span>
            </div>
          );
        })}
        {blackKeys.map((key, index) => {
          const noteInfo = noteMap.get(key.note as Note);
          const color = noteInfo ? getIntervalColor(noteInfo.interval) : '';
          let leftPosition = 0;
          switch (key.note) {
              case 'C#': leftPosition = (1/whiteKeys.length)*100 * 0.7; break;
              case 'D#': leftPosition = (1/whiteKeys.length)*100 * 1.7; break;
              case 'F#': leftPosition = (1/whiteKeys.length)*100 * 3.7; break;
              case 'G#': leftPosition = (1/whiteKeys.length)*100 * 4.7; break;
              case 'A#': leftPosition = (1/whiteKeys.length)*100 * 5.7; break;
              case 'C#': if(key.octave===5) leftPosition = (1/whiteKeys.length)*100 * 7.7; break;
              case 'D#': if(key.octave===5) leftPosition = (1/whiteKeys.length)*100 * 8.7; break;
              case 'F#': if(key.octave===5) leftPosition = (1/whiteKeys.length)*100 * 10.7; break;
              case 'G#': if(key.octave===5) leftPosition = (1/whiteKeys.length)*100 * 11.7; break;
              case 'A#': if(key.octave===5) leftPosition = (1/whiteKeys.length)*100 * 12.7; break;
              default: leftPosition = (index * (100/17)) + 2.5;
          }

          if (key.note.endsWith('#') && key.octave === 5) {
             switch (key.note) {
              case 'C#': leftPosition = (1/whiteKeys.length)*100 * 7.7; break;
              case 'D#': leftPosition = (1/whiteKeys.length)*100 * 8.7; break;
              case 'F#': leftPosition = (1/whiteKeys.length)*100 * 10.7; break;
              case 'G#': leftPosition = (1/whiteKeys.length)*100 * 11.7; break;
              case 'A#': leftPosition = (1/whiteKeys.length)*100 * 12.7; break;
            }
          }

          const keyId = `${key.note}${key.octave}`;
          const isPressed = pressedKey === keyId;
          const isActive = activeKeys.has(keyId);
          const isGhost = noteInfo && !isActive;
          const hasScaleRing = scaleNoteMap.has(key.note as Note);
          return (
            <div key={`${key.note}${key.octave}-${index}`}
                 onClick={() => handleKeyPress(key.note, key.octave)}
                 style={{ left: `${leftPosition}%`}}
                 className={`absolute top-0 w-[5%] h-2/3 rounded-b-md z-10 flex items-end justify-center pb-1 md:pb-2 cursor-pointer transition-all duration-75 active:scale-[0.98] border border-bg-abyss/70 shadow-lg ${
                   isPressed ? 'bg-bg-abyss scale-[0.98]' : 'bg-[#0a0a12] hover:bg-[#151520]'
                 }`}>
              {noteInfo ? (
                <div className="relative pointer-events-none">
                  <div
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full"
                    style={{
                      backgroundColor: color,
                      opacity: isGhost ? 0.3 : 1,
                      boxShadow: isGhost ? 'none' : `0 0 6px ${color}50, 0 0 12px ${color}20`,
                    }}
                  />
                  {hasScaleRing && (
                    <div className="absolute -inset-0.5 rounded-full pointer-events-none" style={{ border: `1.5px solid ${SCALE_COLOR}`, opacity: 0.5 }} />
                  )}
                </div>
              ) : hasScaleRing ? (
                renderScaleRing(key.note as Note, true)
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Piano;
