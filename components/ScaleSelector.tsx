
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, X } from 'lucide-react';
import { ScaleType, SCALE_TYPES, SCALES, MODES } from '../constants/scaleData';
import { getAvailableExtensions } from '../lib/scaleTheory';

interface ScaleSelectorProps {
  active: boolean;
  scaleType: ScaleType;
  activeExtensions: string[];
  onToggle: () => void;
  onScaleTypeChange: (type: ScaleType) => void;
  onToggleExtension: (extId: string) => void;
}

const ScaleSelector: React.FC<ScaleSelectorProps> = ({
  active,
  scaleType,
  activeExtensions,
  onToggle,
  onScaleTypeChange,
  onToggleExtension,
}) => {
  const availableExtensions = getAvailableExtensions(scaleType);

  return (
    <div className="mb-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-2.5 md:py-1.5 rounded-md text-xs font-mono font-medium transition-all border ${
          active
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(218,165,32,0.15)]'
            : 'bg-bone/5 border-bone/10 text-bone/40 hover:text-bone/60 hover:border-bone/20'
        }`}
      >
        {active ? <X className="w-3 h-3" /> : <Music className="w-3 h-3" />}
        {active ? 'Hide Scale' : 'Scale Overlay'}
      </motion.button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 bg-bg-steel/60 border border-crimson/10 rounded-lg">
              {/* Scales row */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SCALES.map((id) => (
                  <button
                    key={id}
                    onClick={() => onScaleTypeChange(id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                      scaleType === id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-bone/5 border-bone/8 text-bone/40 hover:text-bone/60 hover:bg-bone/10'
                    }`}
                  >
                    {SCALE_TYPES[id].shortName}
                  </button>
                ))}
              </div>

              {/* Modes row */}
              <span className="text-[10px] text-bone/30 font-mono uppercase tracking-wider">Modes</span>
              <div className="flex flex-wrap gap-1.5 mt-1 mb-3">
                {MODES.map((id) => (
                  <button
                    key={id}
                    onClick={() => onScaleTypeChange(id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all border ${
                      scaleType === id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-bone/5 border-bone/8 text-bone/40 hover:text-bone/60 hover:bg-bone/10'
                    }`}
                  >
                    {SCALE_TYPES[id].shortName}
                  </button>
                ))}
              </div>

              {/* Extension toggles */}
              {availableExtensions.length > 0 && (
                <div>
                  <span className="text-[10px] text-bone/30 font-mono uppercase tracking-wider">Extensions</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {availableExtensions.map((ext) => {
                      const isActive = activeExtensions.includes(ext.id);
                      return (
                        <button
                          key={ext.id}
                          onClick={() => onToggleExtension(ext.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all border ${
                            isActive
                              ? 'bg-ember/20 border-ember/50 text-ember'
                              : 'bg-bone/5 border-bone/8 text-bone/30 hover:text-bone/50 hover:bg-bone/10'
                          }`}
                        >
                          {ext.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScaleSelector;
