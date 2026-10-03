import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flame, Hand, Check, ArrowLeft } from 'lucide-react';
import { GeneratedVoicing, HandProfile, Shape, explainCost, shapeKey, toRiffForgeTab } from '../lib/engine';
import {
  PlayableBassFilter,
  PlayableGroup,
  SharedShape,
  bassFilterMatches,
  fingerChart,
  positionLabel,
  voicingLabel,
} from '../lib/playable';
import { HAND_PROFILE_DISCLAIMER } from '../lib/handProfileStorage';

interface PlayableVoicingsProps {
  groups: PlayableGroup[];
  profile: HandProfile;
  isCustomProfile: boolean;
  bassFilter: PlayableBassFilter;
  /** Bass filter chip text, e.g. "6th (E)". */
  bassFilterLabel: string;
  selectedShape: Shape | null;
  /** The selected generated voicing and its group label, when it is in `groups`. */
  selected: { voicing: GeneratedVoicing; groupLabel: string } | null;
  /** Set when the selected shape is not among the generated voicings (for example from a shared link). */
  sharedShape: SharedShape | null;
  curatedName: string | null;
  /** True while a related chord is previewed on the fretboard. */
  disabled: boolean;
  onSelect: (shape: Shape) => void;
  onBackToCurated: () => void;
  onOpenProfile: () => void;
}

const SCROLL_STYLE: React.CSSProperties = { scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' };

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-bg-abyss';

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-bone/75 leading-snug bg-bone/5 border border-crimson/10 rounded-md px-3 py-2">{children}</p>
);

export const PlayableVoicings: React.FC<PlayableVoicingsProps> = ({
  groups,
  profile,
  isCustomProfile,
  bassFilter,
  bassFilterLabel,
  selectedShape,
  selected,
  sharedShape,
  curatedName,
  disabled,
  onSelect,
  onBackToCurated,
  onOpenProfile,
}) => {
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const selectedKey = selectedShape ? shapeKey(selectedShape) : null;

  const active = selected
    ? {
        title: `On the fretboard · ${selected.groupLabel}`,
        name: selected.voicing.name,
        shape: selected.voicing.shape,
        degrees: selected.voicing.degrees,
        fingering: selected.voicing.fingering,
        why: explainCost(selected.voicing.breakdown, selected.voicing.fingering, profile).join(', '),
        problem: undefined as string | undefined,
      }
    : sharedShape
      ? {
          title: 'Shared shape',
          name: sharedShape.name,
          shape: sharedShape.shape,
          degrees: sharedShape.degrees,
          fingering: sharedShape.fingering,
          why: '',
          problem: sharedShape.problem,
        }
      : null;

  const announcement = active ? `Showing ${active.name}, ${positionLabel(active.shape)}, on the fretboard.` : '';

  return (
    <motion.section
      aria-labelledby={headingId}
      initial={reduceMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 id={headingId} className="text-xs font-semibold text-bone/60 uppercase tracking-[0.2em] font-metal flex items-center gap-2">
          <Flame className="w-3 h-3 text-ember" aria-hidden="true" />
          Playable for me
        </h3>
        <button
          type="button"
          onClick={onOpenProfile}
          aria-haspopup="dialog"
          className={`flex items-center gap-1.5 px-3 h-11 sm:h-8 rounded text-[11px] font-mono border transition-all bg-bone/5 border-bone/10 text-bone/80 hover:bg-bone/10 hover:text-bone ${FOCUS_RING}`}
        >
          <Hand className="w-3.5 h-3.5 text-ember" aria-hidden="true" />
          Hand profile
          <span className="text-bone/60">· {isCustomProfile ? 'custom' : 'default'}</span>
        </button>
      </div>
      <p className="text-xs text-bone/60 mb-4 leading-relaxed">
        {profile.noBarre ? 'No-barre voicings' : 'Voicings'} that fit your hand profile, easiest first.
        {bassFilter !== 'all' && ` Bass on the ${bassFilterLabel} string, as filtered above.`}
      </p>

      {groups.map(group => {
        const visible = group.voicings.filter(v => bassFilterMatches(v, bassFilter));
        const groupHeadingId = `${headingId}-${group.id}`;
        return (
          <div key={group.id} className="mb-4">
            <div className="flex items-baseline gap-x-2 gap-y-0.5 mb-2 flex-wrap">
              <h4 id={groupHeadingId} className="text-[11px] font-mono uppercase tracking-wider text-bone/80">
                {group.label}
              </h4>
              {group.note && <span className="text-[11px] text-bone/60">{group.note}</span>}
            </div>
            {group.empty ? (
              <EmptyNote>{group.empty}</EmptyNote>
            ) : visible.length === 0 ? (
              <EmptyNote>
                None of these {group.voicings.length} voicings has its bass on the {bassFilterLabel} string. Set the bass
                filter to All to see them.
              </EmptyNote>
            ) : (
              <div
                role="group"
                aria-labelledby={groupHeadingId}
                // Padding (offset by negative margins) keeps the 4px focus ring inside the scroll clip
                className={`flex gap-2 overflow-x-auto px-1 pt-1 pb-2 -mx-1 -mt-1 transition-opacity ${disabled ? 'opacity-40' : ''}`}
                style={SCROLL_STYLE}
              >
                {visible.map(voicing => {
                  const isSelected = selectedKey !== null && shapeKey(voicing.shape) === selectedKey;
                  const hasBarre = voicing.fingering.barres.length > 0;
                  return (
                    <motion.button
                      key={shapeKey(voicing.shape)}
                      type="button"
                      whileHover={reduceMotion || disabled ? undefined : { scale: 1.03 }}
                      whileTap={reduceMotion || disabled ? undefined : { scale: 0.97 }}
                      onClick={() => (isSelected ? onBackToCurated() : onSelect(voicing.shape))}
                      disabled={disabled}
                      aria-pressed={isSelected}
                      title={explainCost(voicing.breakdown, voicing.fingering, profile).join(', ')}
                      className={`flex-shrink-0 px-3 py-2 rounded-md text-left whitespace-nowrap transition-all border font-mono ${FOCUS_RING} ${
                        isSelected
                          ? 'bg-crimson/20 border-crimson text-hellfire shadow-[0_0_10px_rgba(220,20,60,0.3)]'
                          : 'bg-bone/5 border-bone/10 text-bone/70 hover:bg-bone/10 hover:text-bone'
                      } ${disabled ? 'cursor-not-allowed' : ''}`}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
                        {voicingLabel(voicing)}
                      </span>
                      <span className={`block text-[11px] mt-0.5 ${isSelected ? 'text-bone/80' : 'text-bone/60'}`}>
                        {voicing.name}
                        {hasBarre && ' · barre'}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {active && (
        <div className="p-3 bg-bg-steel/60 border border-crimson/15 rounded-lg">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-wider text-bone/60">{active.title}</p>
              <p className="text-base font-mono text-hellfire">
                {active.name} <span className="text-sm text-bone/70">{positionLabel(active.shape)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToCurated}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-3 h-11 sm:h-8 rounded text-[11px] font-mono border transition-all bg-bone/5 border-bone/10 text-bone/80 hover:bg-bone/10 hover:text-bone disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Back to curated{curatedName ? `: ${curatedName}` : ''}
            </button>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
            <dt className="text-bone/60">Tab</dt>
            <dd className="text-bone">
              {toRiffForgeTab(active.shape)} <span className="text-bone/60">(low E to high e)</span>
            </dd>
            <dt className="text-bone/60">Degrees</dt>
            <dd className="text-bone">{active.degrees}</dd>
            {active.fingering && (
              <>
                <dt className="text-bone/60">Fingers</dt>
                <dd className="text-bone">{fingerChart(active.shape, active.fingering)}</dd>
              </>
            )}
            {active.why && (
              <>
                <dt className="text-bone/60">Why</dt>
                <dd className="text-bone/80 font-industrial text-sm leading-snug">{active.why}</dd>
              </>
            )}
          </dl>
          {sharedShape && !selected && (
            <p className="mt-2 text-xs text-bone/70 leading-relaxed">
              {sharedShape.fingering
                ? 'Not among the generated voicings for this chord and hand profile; a fingering within your profile exists.'
                : `Not playable with your hand profile: ${active.problem ?? 'no fingering fits'}.`}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-[11px] text-bone/60 leading-relaxed">{HAND_PROFILE_DISCLAIMER}</p>
    </motion.section>
  );
};
