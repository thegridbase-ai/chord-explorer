
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Chord, CHORD_TYPES, Note, ChordType } from '../constants/musicData';
import { getChordVoicing, getRomanNumeral, displayNote, getChordCompatibilityScore, detectProgressionPattern, findCompatibleKeys, ChordCompatibility, CommonProgression, Key } from '../lib/musicTheory';
import { playChordFromChord, ensureAudioContext } from '../lib/audioEngine';
import MiniFretboard from './MiniFretboard';
import { Plus, Flame } from 'lucide-react';

interface RelativeChordsProps {
  chords: Chord[];
  selectedChord: Chord;
  progression: Chord[];
  onSelectChord: (root: Note, type: ChordType) => void;
  onAddToProgression: (chord: Chord) => void;
  onHoverChord?: (chord: Chord | null) => void;
  compact?: boolean;
}

const isChordEqual = (a: Chord, b: Chord): boolean => a.root === b.root && a.type === b.type;

type CompatibilityRank = 'gold' | 'default' | 'dimmed';

const getCompatibilityRank = (score: number): CompatibilityRank => {
  if (score >= 1) return 'gold';
  if (score >= 0.5) return 'default';
  return 'dimmed';
};

interface ChordWithCompatibility {
  chord: Chord;
  compatibility: ChordCompatibility;
  rank: CompatibilityRank;
}

const ProgressionPatternBadge: React.FC<{ pattern: CommonProgression }> = ({ pattern }) => (
  <div className="mb-4 p-3 bg-crimson/10 border border-crimson/20 rounded-lg flex items-center gap-3 border-flicker">
    <div className="w-7 h-7 rounded-full bg-crimson/20 flex items-center justify-center flex-shrink-0">
      <Flame className="w-3 h-3 text-crimson" />
    </div>
    <div>
      <p className="text-sm font-semibold text-crimson font-metal">{pattern.name}</p>
      <p className="text-xs text-crimson/50 font-mono">
        {pattern.pattern.join(' - ')}
      </p>
    </div>
  </div>
);

const CompatibleKeysBadge: React.FC<{ keys: Key[] }> = ({ keys }) => {
  if (keys.length === 0) return null;

  const displayKeys = keys.slice(0, 4);
  const remaining = keys.length - displayKeys.length;

  return (
    <div className="mb-4 p-2.5 bg-bone/[0.03] border border-crimson/10 rounded-lg">
      <p className="text-[10px] text-bone/30 mb-1.5 uppercase tracking-wider font-metal">Compatible keys</p>
      <div className="flex flex-wrap gap-1.5">
        {displayKeys.map((key, i) => (
          <span key={i} className="text-xs px-2 py-0.5 bg-crimson/10 text-bone/60 rounded font-mono border border-crimson/10">
            {key.root} {key.mode}
          </span>
        ))}
        {remaining > 0 && (
          <span className="text-xs px-2 py-0.5 text-bone/25 font-mono">+{remaining}</span>
        )}
      </div>
    </div>
  );
};

const RelativeChords: React.FC<RelativeChordsProps> = ({ chords, selectedChord, progression, onSelectChord, onAddToProgression, onHoverChord, compact = false }) => {
  const hasMultipleChords = progression.length > 1;

  const detectedPattern = useMemo(() => {
    return detectProgressionPattern(progression);
  }, [progression]);

  const compatibleKeys = useMemo(() => {
    if (!hasMultipleChords) return [];
    return findCompatibleKeys(progression);
  }, [progression, hasMultipleChords]);

  const chordsWithCompatibility: ChordWithCompatibility[] = useMemo(() => {
    return chords.map(chord => {
      const compatibility = hasMultipleChords
        ? getChordCompatibilityScore(chord, progression)
        : { score: 1, matchingKeys: [], totalMatchingKeys: 0 };
      const rank = hasMultipleChords ? getCompatibilityRank(compatibility.score) : 'default';
      return { chord, compatibility, rank };
    });
  }, [chords, progression, hasMultipleChords]);

  const sortedChords = useMemo(() => {
    if (!hasMultipleChords) return chordsWithCompatibility;

    return [...chordsWithCompatibility].sort((a, b) => {
      const rankOrder = { gold: 0, default: 1, dimmed: 2 };
      return rankOrder[a.rank] - rankOrder[b.rank];
    });
  }, [chordsWithCompatibility, hasMultipleChords]);

  return (
    <div>
      {detectedPattern && !compact && (
        <ProgressionPatternBadge pattern={detectedPattern} />
      )}

      {!compact && (
        <h2 className="text-lg font-bold mb-4 font-metal text-bone/80 tracking-wider">
          Relative Chords
        </h2>
      )}

      {hasMultipleChords && compatibleKeys.length > 0 && !compact && (
        <CompatibleKeysBadge keys={compatibleKeys} />
      )}

      <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-2"}>
        {sortedChords.map(({ chord, compatibility, rank }, index) => {
          const isSelected = isChordEqual(chord, selectedChord);
          const isInProgression = progression.some(p => isChordEqual(p, chord));
          return (
            <ChordCard
              key={`${chord.root}-${chord.type}-${index}`}
              chord={chord}
              keyRoot={selectedChord.root}
              keyType={selectedChord.type}
              isSelected={isSelected}
              isInProgression={isInProgression}
              compatibilityRank={hasMultipleChords ? rank : undefined}
              matchingKeysCount={compatibility.totalMatchingKeys}
              onSelect={() => onSelectChord(chord.root, chord.type)}
              onAdd={() => onAddToProgression(chord)}
              onHover={onHoverChord}
              compact={compact}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ChordCardProps {
    chord: Chord;
    keyRoot: Note;
    keyType: ChordType;
    isSelected: boolean;
    isInProgression: boolean;
    compatibilityRank?: CompatibilityRank;
    matchingKeysCount?: number;
    onSelect: () => void;
    onAdd: () => void;
    onHover?: (chord: Chord | null) => void;
    compact?: boolean;
}

const ChordCard: React.FC<ChordCardProps> = ({ chord, keyRoot, keyType, isSelected, isInProgression, compatibilityRank, matchingKeysCount, onSelect, onAdd, onHover, compact = false }) => {
    const voicing = getChordVoicing(chord.root, chord.type);
    const romanNumeral = getRomanNumeral(chord.root, chord.type, keyRoot, keyType);
    const chordName = `${displayNote(chord.root, keyRoot, keyType)}${CHORD_TYPES[chord.type].symbol}`;

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await ensureAudioContext();
        playChordFromChord(chord, 'guitar');
    };

    const handleMouseEnter = () => {
        onHover?.(chord);
    };

    const handleMouseLeave = () => {
        onHover?.(null);
    };

    const isGold = compatibilityRank === 'gold';
    const isDimmed = compatibilityRank === 'dimmed';

    const opacityClass = isDimmed ? 'opacity-35' : '';

    if (compact) {
        return (
            <motion.div
                whileTap={{ scale: 0.97 }}
                className={`group bg-bone/[0.03] border border-crimson/10 rounded-lg p-2.5 transition-all duration-150 active:bg-bone/[0.06] relative ${opacityClass} ${isSelected ? 'bg-crimson/5 border-l-2 border-l-crimson' : ''}`}
                onClick={onSelect}
            >
                {isInProgression && (
                    <div className="absolute top-1.5 right-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-ember" />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className={`font-bold font-mono text-sm ${isSelected ? 'text-crimson' : 'text-bone'}`}>{chordName}</p>
                            {isGold && <Flame className="w-3 h-3 text-ember" />}
                        </div>
                        <p className="text-[11px] text-bone/30 font-mono">{romanNumeral}</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdd(); }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-crimson/10 hover:bg-crimson/20 active:scale-95 transition-all text-bone/40 hover:text-crimson"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ x: 2 }}
            className={`group relative rounded-lg transition-all duration-150 cursor-pointer ${opacityClass} ${
              isSelected
                ? 'bg-crimson/5 border-l-2 border-l-crimson pl-3 pr-4 py-2'
                : 'hover:bg-bone/[0.04] px-4 py-2'
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={onSelect}
        >
            {isGold && (
                <div className="absolute top-1.5 right-1.5">
                  <Flame className="w-3 h-3 text-ember" />
                </div>
            )}

            {isInProgression && !isSelected && (
                <div className="absolute top-1.5 right-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-ember" />
                </div>
            )}

            <div className="flex items-center">
                <MiniFretboard voicing={voicing} />
                <div className="flex-1 ml-4 min-w-0">
                    <p className={`font-bold font-mono text-lg ${isSelected ? 'text-crimson' : 'text-bone'}`}>
                      {chordName}
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-bone/30 font-mono">{romanNumeral}</p>
                        {matchingKeysCount !== undefined && matchingKeysCount > 0 && (
                            <p className="text-[10px] text-bone/60 font-mono">
                                {matchingKeysCount} key{matchingKeysCount > 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handlePlay}
                        className="w-7 h-7 flex items-center justify-center rounded bg-crimson/10 hover:bg-crimson/20 transition-colors text-bone/40 hover:text-crimson"
                        title="Play chord"
                    >
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                            <path d="M0 0V12L10 6L0 0Z" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdd(); }}
                        className="w-7 h-7 flex items-center justify-center rounded bg-crimson/10 hover:bg-crimson/20 transition-colors text-bone/40 hover:text-crimson"
                        title="Add to progression"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default RelativeChords;
