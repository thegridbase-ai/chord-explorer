
import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, LayoutGrid, Flame } from 'lucide-react';
import { Note, ChordType, CHORD_TYPES } from '../constants/musicData';
import { displayNote } from '../lib/musicTheory';
import { calculateCAGEDPositions, cagedShapeToVoicing, CAGEDShape } from '../lib/cagedSystem';

interface CAGEDViewProps {
  rootNote: Note;
  chordType: ChordType;
  onSelectShape: (shape: CAGEDShape) => void;
  onClose: () => void;
}

const INTERVAL_COLORS: Record<string, string> = {
  'Root': '#ef4444',
  'Minor 3rd': '#7c3aed',
  'Major 3rd': '#7c3aed',
  'Perfect 5th': '#22c55e',
};

const MiniCAGEDFretboard: React.FC<{
  shape: CAGEDShape;
  rootNote: Note;
  isMinor: boolean;
  isSelected: boolean;
  onClick: () => void;
}> = ({ shape, rootNote, isMinor, isSelected, onClick }) => {
  const voicing = useMemo(
    () => cagedShapeToVoicing(shape, rootNote, isMinor),
    [shape, rootNote, isMinor]
  );

  const startFret = shape.fret;
  const fretCount = 5;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-crimson/40 bg-crimson/10'
          : 'border-crimson/10 bg-bone/5 hover:bg-crimson/5'
      }`}
    >
      <div
        className="text-2xl font-bold font-mono mb-1"
        style={{ color: shape.color }}
      >
        {shape.name}
      </div>
      <div className="text-xs text-bone/30 mb-2 font-mono">
        {shape.fret}. fret
      </div>

      <div className="relative w-16 h-20 bg-bg-abyss rounded border border-crimson/10">
        {startFret === 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-bone/40" />
        )}

        {[1, 2, 3, 4].map(fret => (
          <div
            key={fret}
            className="absolute w-full h-px bg-bone/15"
            style={{ top: `${fret * 20}%` }}
          />
        ))}

        {[0, 1, 2, 3, 4, 5].map(string => (
          <div
            key={string}
            className="absolute h-full bg-bone/15"
            style={{
              left: `${(string / 5) * 100}%`,
              width: '1px',
            }}
          />
        ))}

        {voicing.map((pos, idx) => {
          const relativeFret = pos.fret - startFret;
          if (relativeFret < 0 || relativeFret >= fretCount) return null;

          const x = ((5 - pos.string) / 5) * 100;
          const y = pos.fret === 0
            ? 5
            : startFret === 0
              ? (relativeFret - 1) * 20 + 10
              : relativeFret * 20 + 10;

          return (
            <div
              key={idx}
              className="absolute w-2.5 h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-bone/20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: INTERVAL_COLORS[pos.interval] || shape.color,
                boxShadow: `0 0 6px ${INTERVAL_COLORS[pos.interval] || shape.color}50`,
              }}
            />
          );
        })}

        {shape.pattern.map((fret, stringIdx) => {
          if (fret !== -1) return null;
          const x = ((5 - stringIdx) / 5) * 100;
          return (
            <div
              key={`mute-${stringIdx}`}
              className="absolute text-[8px] text-bone/30 transform -translate-x-1/2"
              style={{ left: `${x}%`, top: '-12px' }}
            >
              x
            </div>
          );
        })}
      </div>

      {isSelected && (
        <div className="mt-2 text-xs text-crimson font-mono">Selected</div>
      )}
    </motion.button>
  );
};

const FullFretboardView: React.FC<{
  shapes: CAGEDShape[];
  selectedShape: CAGEDShape | null;
  onSelectShape: (shape: CAGEDShape) => void;
  rootNote: Note;
  isMinor: boolean;
}> = ({ shapes, selectedShape, onSelectShape, rootNote, isMinor }) => {
  const maxFret = 15;
  const stringCount = 6;
  const topPadding = 15;
  const stringSpacing = 11;

  return (
    <div className="relative h-32 bg-bg-abyss rounded-xl border border-crimson/10 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-6 w-1.5 bg-bone/30" />

      {Array.from({ length: maxFret + 1 }).map((_, fret) => (
        <div
          key={fret}
          className="absolute h-[calc(100%-24px)] w-px bg-bone/10"
          style={{ left: `${(fret / maxFret) * 100}%` }}
        />
      ))}

      {[0, 1, 2, 3, 4, 5].map(string => (
        <div
          key={string}
          className="absolute w-full bg-bone/15"
          style={{
            top: `${topPadding + string * stringSpacing}%`,
            height: string < 3 ? '1px' : '2px',
          }}
        />
      ))}

      {[3, 5, 7, 9, 12, 15].map(fret => (
        <React.Fragment key={fret}>
          <div
            className="absolute w-2 h-2 rounded-full bg-crimson/10 transform -translate-x-1/2"
            style={{
              left: `${((fret - 0.5) / maxFret) * 100}%`,
              top: `${topPadding + 2.5 * stringSpacing}%`,
            }}
          />
          <div
            className="absolute bottom-1 text-[10px] text-bone/60 font-mono transform -translate-x-1/2"
            style={{ left: `${((fret - 0.5) / maxFret) * 100}%` }}
          >
            {fret}
          </div>
        </React.Fragment>
      ))}

      {shapes.map((shape) => {
        const startFret = shape.fret;
        const endFret = Math.min(startFret + 4, maxFret);
        const isSelected = selectedShape?.name === shape.name;
        const voicing = cagedShapeToVoicing(shape, rootNote, isMinor);

        return (
          <React.Fragment key={shape.name}>
            <button
              onClick={() => onSelectShape(shape)}
              className={`absolute top-1 rounded transition-all ${
                isSelected ? 'border-2' : 'border hover:border-2'
              }`}
              style={{
                left: `${(startFret / maxFret) * 100}%`,
                width: `${((endFret - startFret) / maxFret) * 100}%`,
                height: 'calc(100% - 28px)',
                borderColor: shape.color,
                backgroundColor: `${shape.color}15`,
              }}
            >
              <span
                className="absolute top-0.5 left-1 text-xs font-bold font-mono"
                style={{ color: shape.color }}
              >
                {shape.name}
              </span>
            </button>

            {voicing.map((pos, idx) => {
              const x = pos.fret === 0 ? 1 : ((pos.fret - 0.5) / maxFret) * 100;
              const y = topPadding + pos.string * stringSpacing;

              return (
                <div
                  key={`${shape.name}-${idx}`}
                  className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 border border-bone/20 transition-all ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-40 scale-75'
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    backgroundColor: INTERVAL_COLORS[pos.interval] || shape.color,
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const CAGEDView: React.FC<CAGEDViewProps> = ({
  rootNote,
  chordType,
  onSelectShape,
  onClose,
}) => {
  const isMinor = chordType === 'minor' || chordType === 'm7';
  const shapes = useMemo(
    () => calculateCAGEDPositions(rootNote, chordType),
    [rootNote, chordType]
  );

  const [selectedShape, setSelectedShape] = useState<CAGEDShape>(shapes[0]);

  const chordName = `${displayNote(rootNote, rootNote, chordType)}${CHORD_TYPES[chordType].symbol}`;

  const handleSelectAndClose = (shape: CAGEDShape) => {
    onSelectShape(shape);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-bg-steel border border-crimson/20 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-[0_0_60px_rgba(220,20,60,0.15)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crimson/15 sticky top-0 bg-bg-steel/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-6 h-6 text-crimson" />
            <h2 className="text-xl font-bold text-bone font-metal tracking-wider">CAGED System <span className="text-bone/30 font-normal ml-2">| {chordName}</span></h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-crimson/10 text-bone/40 hover:text-crimson transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          {/* Explanation */}
          <div className="bg-crimson/10 border border-crimson/20 rounded-xl p-5 mb-8 border-flicker">
            <h3 className="text-sm font-bold text-crimson mb-2 font-metal flex items-center gap-2">
              <Flame className="w-4 h-4" />
              How it works
            </h3>
            <p className="text-sm text-bone/60 leading-relaxed">
              The <span className="text-bone font-bold">CAGED</span> system shows how to play the same chord
              in 5 different positions across the fretboard. Each shape is derived from open chords (
              <span style={{color: '#22c55e'}}>C</span>,
              <span style={{color: '#7c3aed'}}> A</span>,
              <span style={{color: '#DC143C'}}> G</span>,
              <span style={{color: '#ef4444'}}> E</span>,
              <span style={{color: '#DAA520'}}> D</span>
              ) and connects together to cover the entire neck.
            </p>
          </div>

          {/* Full fretboard visualization */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] mb-4 font-metal">
              Full Neck Map - {chordName}
            </h3>
            <FullFretboardView
              shapes={shapes}
              selectedShape={selectedShape}
              onSelectShape={setSelectedShape}
              rootNote={rootNote}
              isMinor={isMinor}
            />
            <p className="text-xs text-bone/30 mt-2 text-center">
              Click a region to see details
            </p>
          </div>

          {/* 5 CAGED shapes */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] mb-4 font-metal">5 Positions</h3>
            <div className="grid grid-cols-5 gap-3">
              {shapes.map((shape) => (
                <MiniCAGEDFretboard
                  key={shape.name}
                  shape={shape}
                  rootNote={rootNote}
                  isMinor={isMinor}
                  isSelected={selectedShape?.name === shape.name}
                  onClick={() => setSelectedShape(shape)}
                />
              ))}
            </div>
          </div>

          {/* Selected shape details */}
          {selectedShape && (
            <motion.div
              key={selectedShape.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bone/5 border border-crimson/10 rounded-xl p-5 mb-8"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-xl text-bone"
                      style={{ backgroundColor: selectedShape.color }}
                    >
                      {selectedShape.name}
                    </span>
                    <div>
                      <p className="font-mono text-lg text-bone">
                        {selectedShape.name} Shape - {selectedShape.fret}. fret
                      </p>
                      <p className="text-sm text-bone/40">{selectedShape.description}</p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectAndClose(selectedShape)}
                  className="px-4 py-2 bg-crimson hover:bg-hellfire text-bone rounded-lg text-sm font-mono transition-colors font-medium shadow-[0_0_15px_rgba(220,20,60,0.3)]"
                >
                  Select Position
                </motion.button>
              </div>

              <div className="mt-4 p-3 bg-bg-abyss rounded-lg border border-crimson/10">
                <p className="text-xs text-bone/50">
                  <span className="text-ember font-bold">Tip:</span> To learn the {selectedShape.name} shape,
                  first play the open {selectedShape.name} {isMinor ? 'minor' : 'Major'} chord, then slide the same finger
                  position to fret {selectedShape.fret}. The root note (red) always stays on the same string.
                </p>
              </div>
            </motion.div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 p-4 bg-bone/5 rounded-lg border border-crimson/10 text-xs">
            <span className="font-semibold text-bone/40 uppercase tracking-widest font-metal">Legend:</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-root"></span>
              <span className="text-bone/50">Root</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-3rd"></span>
              <span className="text-bone/50">3rd</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-5th"></span>
              <span className="text-bone/50">5th</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CAGEDView;
