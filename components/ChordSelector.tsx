
import React from 'react';
import { motion } from 'motion/react';
import { NOTES, CHORD_TYPES, CHORD_TYPE_IDS, Note, ChordType } from '../constants/musicData';

interface ChordSelectorProps {
  selectedRoot: Note;
  selectedType: ChordType;
  onRootChange: (root: Note) => void;
  onTypeChange: (type: ChordType) => void;
  compact?: boolean;
}

const ChordSelector: React.FC<ChordSelectorProps> = ({ selectedRoot, selectedType, onRootChange, onTypeChange, compact = false }) => {
  const selectedIndex = NOTES.indexOf(selectedRoot);
  const fifthIndex = (selectedIndex + 7) % 12;
  const fourthIndex = (selectedIndex + 5) % 12;

  const getNoteStyle = (noteIndex: number, isSelected: boolean) => {
    if (isSelected) {
      return 'border-crimson bg-crimson/20 text-crimson shadow-[0_0_12px_rgba(220,20,60,0.4)]';
    }
    if (noteIndex === fifthIndex) {
      return 'border-green bg-green/10 text-green';
    }
    if (noteIndex === fourthIndex) {
      return 'border-gold bg-gold/10 text-gold';
    }
    return 'border-bone/10 bg-bg-abyss text-bone/60 hover:border-crimson/30 hover:text-bone';
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-semibold text-bone/40 font-metal uppercase tracking-[0.15em]">Root</h3>
            <div className="flex gap-1 text-[10px] font-mono">
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-full border border-green"></span>
                <span className="text-bone/40">5th</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-full border border-gold"></span>
                <span className="text-bone/40">4th</span>
              </span>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {NOTES.map((note, i) => {
              const isSelected = note === selectedRoot;
              return (
                <motion.button
                  key={note}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRootChange(note)}
                  className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold transition-all duration-200 font-mono
                    ${getNoteStyle(i, isSelected)}`}
                >
                  {note}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold mb-2 text-bone/40 font-metal uppercase tracking-[0.15em]">Type</h3>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {CHORD_TYPE_IDS.map(type => {
              const isSelected = type === selectedType;
              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onTypeChange(type)}
                  className={`flex-shrink-0 px-3 py-2.5 md:py-1.5 min-w-[2.75rem] md:min-w-0 rounded-md text-center text-xs transition-colors duration-200 border font-mono
                    ${isSelected
                      ? 'bg-crimson/20 border-crimson text-crimson shadow-[0_0_8px_rgba(220,20,60,0.3)]'
                      : 'bg-bone/5 border-bone/10 text-bone/60 hover:bg-bone/10 hover:text-bone'
                    }`}
                >
                  {CHORD_TYPES[type].symbol || type}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-8">
      <div>
        <h2 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] mb-6 font-metal">Root Note</h2>
        <div className="relative w-[220px] h-[220px] mx-auto mb-4">
          {NOTES.map((note, i) => {
            const angle = (i / NOTES.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 90;
            const center = 110;
            const x = Math.cos(angle) * radius + center;
            const y = Math.sin(angle) * radius + center;
            const isSelected = note === selectedRoot;
            return (
              <motion.button
                key={note}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onRootChange(note)}
                className={`absolute w-9 h-9 rounded-full border flex items-center justify-center text-xs font-medium transition-all duration-200 transform -translate-x-1/2 -translate-y-1/2 font-mono
                  ${getNoteStyle(i, isSelected)}`}
                style={{ left: `${x}px`, top: `${y}px` }}
              >
                {note}
              </motion.button>
            );
          })}
          {/* Pentagram-style dashed circle */}
          <svg className="absolute inset-0 w-full h-full -z-10 pointer-events-none opacity-15">
            <circle cx="110" cy="110" r="90" fill="none" stroke="#DC143C" strokeWidth="1" strokeDasharray="6 3" />
            <circle cx="110" cy="110" r="60" fill="none" stroke="#DC143C" strokeWidth="0.5" strokeDasharray="2 4" />
          </svg>
        </div>
        <div className="flex justify-center gap-4 text-xs font-mono mb-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-green"></span>
            <span className="text-bone/40">5th</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-gold"></span>
            <span className="text-bone/40">4th</span>
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] mb-4 font-metal">Chord Type</h2>
        <div className="grid grid-cols-2 gap-2">
          {CHORD_TYPE_IDS.map(type => {
            const isSelected = type === selectedType;
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onTypeChange(type)}
                className={`py-2 px-3 rounded-md text-center text-sm transition-colors duration-200 border font-mono
                  ${isSelected
                    ? 'bg-crimson/20 border-crimson text-crimson shadow-[0_0_8px_rgba(220,20,60,0.3)]'
                    : 'bg-bone/5 border-bone/10 text-bone/60 hover:bg-bone/10 hover:text-bone'
                  }`}
              >
                {CHORD_TYPES[type].symbol || type}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChordSelector;
