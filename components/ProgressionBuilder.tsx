
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Trash2, Plus, X, ChevronRight, Flame } from 'lucide-react';
import { ProgressionChord, CHORD_TYPES } from '../constants/musicData';
import MiniFretboard from './MiniFretboard';
import { getAllChordVoicings, getChordVoicing } from '../lib/musicTheory';
import { playProgression, stopPlayback, ensureAudioContext } from '../lib/audioEngine';

interface ProgressionBuilderProps {
  progression: ProgressionChord[];
  onClear: () => void;
  onRemove: (index: number) => void;
  onUpdateVoicing: (index: number, voicingIndex: number) => void;
}

const ProgressionBuilder: React.FC<ProgressionBuilderProps> = ({ progression, onClear, onRemove, onUpdateVoicing }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);

  const handlePlay = useCallback(async () => {
    if (progression.length === 0) return;

    await ensureAudioContext();
    setIsPlaying(true);
    await playProgression(progression, bpm, 'guitar');
  }, [progression, bpm]);

  const handleStop = useCallback(() => {
    stopPlayback();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const isDisabled = progression.length === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-28 bg-bg-abyss/95 backdrop-blur-xl border-t border-crimson/15 flex items-center px-4 md:px-6 z-30 shadow-[0_-10px_40px_rgba(220,20,60,0.08)]">
      {/* Subtle metal sheen */}
      <div className="absolute inset-0 metal-sheen pointer-events-none" />

      {/* Chord Blocks */}
      <div className="flex-1 flex items-center gap-2 md:gap-3 overflow-x-auto overflow-y-visible pr-4 md:pr-6 min-w-0 relative z-10 pt-2">
        <AnimatePresence>
          {progression.map((chord, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center"
            >
              <ProgressionChordBlock
                chord={chord}
                onRemove={() => onRemove(index)}
                onUpdateVoicing={(voicingIndex) => onUpdateVoicing(index, voicingIndex)}
              />
              {index < progression.length - 1 && (
                <ChevronRight className="w-4 h-4 text-crimson/30 mx-1 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {progression.length === 0 && (
          <div className="text-bone/30 text-xs md:text-sm whitespace-nowrap font-industrial">
            Tap + on chords to build your progression
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-auto md:w-72 border-l border-crimson/10 pl-4 md:pl-6 flex flex-col justify-center gap-3 flex-shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={isDisabled && !isPlaying}
              aria-label={isPlaying ? "Stop progression" : "Play progression"}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors ${
                isPlaying
                  ? 'bg-crimson hover:bg-hellfire animate-pulse text-bone shadow-[0_0_20px_rgba(220,20,60,0.5)]'
                  : isDisabled
                    ? 'bg-bone/5 cursor-not-allowed opacity-50 text-bone/40'
                    : 'bg-crimson/20 text-crimson hover:bg-crimson/30 flame-glow border border-crimson/30'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClear}
              aria-label="Clear progression"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-bone/5 text-bone/40 flex items-center justify-center hover:bg-crimson/10 hover:text-crimson transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xl md:text-2xl font-mono font-bold text-ember">{bpm}</span>
            <span className="text-xs text-bone/30 ml-1 uppercase tracking-widest font-metal">BPM</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <span className="text-[10px] font-mono text-bone/30">60</span>
          <input
            type="range"
            min="60"
            max="240"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo in BPM"
            className="flex-1"
          />
          <span className="text-[10px] font-mono text-bone/30">240</span>
        </div>
      </div>
    </div>
  );
};

interface ProgressionChordBlockProps {
    chord: ProgressionChord;
    onRemove: () => void;
    onUpdateVoicing: (voicingIndex: number) => void;
}

const ProgressionChordBlock: React.FC<ProgressionChordBlockProps> = ({ chord, onRemove, onUpdateVoicing }) => {
    const [showVoicings, setShowVoicings] = useState(false);
    const allVoicings = getAllChordVoicings(chord.root, chord.type);
    const currentVoicing = allVoicings[chord.voicingIndex] || allVoicings[0];

    const voicing = getChordVoicing(chord.root, chord.type);

    return (
        <div
            className="group relative flex-shrink-0 h-14 md:h-16 bg-bone/5 border border-crimson/15 rounded-lg hover:border-crimson/40 hover:bg-crimson/5 transition-all cursor-pointer flex items-center gap-1.5 px-1.5 md:px-2"
            onClick={() => setShowVoicings(!showVoicings)}
        >
            <div className="flex-shrink-0 w-8 h-10 md:w-9 md:h-11 overflow-hidden">
              <div className="scale-[0.55] md:scale-[0.6] origin-top-left">
                <MiniFretboard voicing={voicing} />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-mono font-bold text-xs md:text-sm text-bone leading-tight">{chord.root}{CHORD_TYPES[chord.type].symbol}</span>
              {allVoicings.length > 1 && (
                  <span className="text-[7px] md:text-[9px] text-bone/30 font-mono truncate leading-tight">{currentVoicing?.name}</span>
              )}
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-crimson/80 text-bone flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-crimson"
            >
                <X className="w-3 h-3" />
            </button>

            {showVoicings && allVoicings.length > 1 && (
                <div
                    className="absolute bottom-full left-0 mb-2 bg-bg-steel border border-crimson/20 rounded-lg p-2 shadow-[0_0_20px_rgba(220,20,60,0.1)] z-50 min-w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs text-bone/30 mb-1 font-mono">Voicing:</div>
                    <div className="flex flex-col gap-1">
                        {allVoicings.map((voicing, index) => (
                            <button
                                key={index}
                                onClick={() => { onUpdateVoicing(index); setShowVoicings(false); }}
                                className={`px-2 py-1 text-xs font-mono rounded transition-colors text-left ${
                                    chord.voicingIndex === index
                                        ? 'bg-crimson/20 text-crimson'
                                        : 'bg-bone/5 text-bone/60 hover:bg-bone/10'
                                }`}
                            >
                                {voicing.name}
                                {voicing.startFret > 0 && (
                                    <span className="ml-1 opacity-70">({voicing.startFret}fr)</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProgressionBuilder;
