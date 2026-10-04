import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X, Hand, Info, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  CALIBRATION_HIGH_INDEX_FRET,
  CALIBRATION_HIGH_PINKY_RANGE,
  CALIBRATION_LOW_INDEX_FRET,
  CALIBRATION_LOW_PINKY_RANGE,
  HandProfile,
  STRETCH_TOLERANCE_ALLOW,
  calibrationFromProfile,
  handProfileHash,
} from '../lib/engine';
import {
  HAND_PROFILE_DISCLAIMER,
  QuickCalibration,
  applyCalibration,
  importHandProfile,
  isDefaultHandProfile,
} from '../lib/handProfileStorage';

interface HandProfileModalProps {
  profile: HandProfile;
  onChange: (profile: HandProfile) => void;
  onReset: () => void;
  onClose: () => void;
}

type Status = { tone: 'ok' | 'error'; text: string } | null;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SCROLL_STYLE: React.CSSProperties = { scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' };

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-bg-steel';

const STRETCH_PERCENT = Math.round((STRETCH_TOLERANCE_ALLOW - 1) * 100);

const range = ([lo, hi]: readonly [number, number]): number[] => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const quickAnswers = (profile: HandProfile): QuickCalibration => {
  const { lowPinkyFret, highPinkyFret, allowStretches, noBarre } = calibrationFromProfile(profile);
  return { lowPinkyFret, highPinkyFret, allowStretches, noBarre };
};

const reachSummary = (profile: HandProfile): string =>
  `${Math.round(profile.reachAtLowMm)} mm at fret ${profile.lowRefFret}, ${Math.round(profile.reachAtHighMm)} mm at fret ${profile.highRefFret}`;

const stretchText = (tolerance: number): string => {
  if (tolerance > 1) return `allowed (+${Math.round((tolerance - 1) * 100)} percent reach)`;
  if (tolerance < 1) return `reduced (${Math.round((1 - tolerance) * 100)} percent less reach)`;
  return 'off';
};

const SectionTitle: React.FC<{ id?: string; children: React.ReactNode }> = ({ id, children }) => (
  <h3 id={id} className="text-xs font-mono text-bone/70 uppercase tracking-wider mb-3">
    {children}
  </h3>
);

const StatusLine: React.FC<{ id?: string; status: Status }> = ({ id, status }) => (
  <p id={id} role="status" aria-live="polite" className="min-h-[1.25rem] mt-2 text-xs font-mono leading-snug">
    {status && (
      <span className={`inline-flex items-start gap-1.5 ${status.tone === 'ok' ? 'text-green' : 'text-hellfire'}`}>
        {status.tone === 'ok'
          ? <Check className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" />
          : <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" />}
        {status.text}
      </span>
    )}
  </p>
);

interface FretChoiceProps {
  name: string;
  legend: string;
  options: number[];
  value: number;
  onChange: (fret: number) => void;
}

// Native radios keep arrow-key navigation and a single tab stop per question.
const FretChoice: React.FC<FretChoiceProps> = ({ name, legend, options, value, onChange }) => (
  <fieldset>
    <legend className="text-sm text-bone/80 leading-snug mb-2.5">{legend}</legend>
    <div className="flex gap-1.5 flex-wrap">
      {options.map(fret => (
        <label key={fret} className="relative">
          <input
            type="radio"
            name={name}
            value={fret}
            checked={value === fret}
            onChange={() => onChange(fret)}
            className="peer sr-only"
          />
          <span className="flex items-center justify-center w-11 h-11 rounded-md border font-mono text-sm cursor-pointer transition-colors border-bone/10 bg-bone/5 text-bone/70 hover:bg-bone/10 hover:text-bone peer-checked:bg-crimson/20 peer-checked:border-crimson peer-checked:text-hellfire peer-checked:font-bold peer-checked:shadow-[inset_0_-2px_0_#ff1a1a] peer-focus-visible:ring-2 peer-focus-visible:ring-ember peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-steel">
            <span className="sr-only">Fret </span>
            {fret}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

const CheckRow: React.FC<{ label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <label className="flex items-start gap-3 min-h-[44px] py-2 px-3 rounded-md border border-bone/10 bg-bone/[0.03] cursor-pointer hover:bg-bone/[0.06] transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className={`mt-0.5 w-4 h-4 flex-shrink-0 accent-crimson cursor-pointer ${FOCUS_RING}`}
    />
    <span>
      <span className="block text-sm text-bone font-medium">{label}</span>
      <span className="block text-xs text-bone/70">{description}</span>
    </span>
  </label>
);

export const HandProfileModal: React.FC<HandProfileModalProps> = ({ profile, onChange, onReset, onClose }) => {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const disclaimerId = useId();
  const importStatusId = useId();
  const importFieldId = useId();
  const calibrationTitleId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [answers, setAnswers] = useState<QuickCalibration>(() => quickAnswers(profile));
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);

  const profileKey = handProfileHash(profile);
  const isDefault = isDefaultHandProfile(profile);
  const calibrationKnown = profile.lowRefFret === CALIBRATION_LOW_INDEX_FRET && profile.highRefFret === CALIBRATION_HIGH_INDEX_FRET;
  const current = quickAnswers(profile);

  // Keep the form in step with imports and resets (keyed by value, not object identity)
  useEffect(() => {
    setAnswers(quickAnswers(profile));
  }, [profileKey]);

  // Focus the dialog, trap Tab inside it, close on Escape, and hand focus back to the opener
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => !(el instanceof HTMLInputElement && el.type === 'radio' && !el.checked),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (e: FocusEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) closeRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  const calibrationChanged =
    answers.lowPinkyFret !== current.lowPinkyFret ||
    answers.highPinkyFret !== current.highPinkyFret ||
    answers.allowStretches !== current.allowStretches ||
    answers.noBarre !== current.noBarre;

  const handleApplyCalibration = () => {
    const next = applyCalibration(profile, answers);
    onChange(next);
    setProfileStatus({ tone: 'ok', text: `Saved. Reach is now ${reachSummary(next)}.` });
  };

  const handleImport = () => {
    const result = importHandProfile(importText);
    if (result.ok === true) {
      onChange(result.profile);
      setImportText('');
      setImportStatus({ tone: 'ok', text: `Imported: ${reachSummary(result.profile)}. The playable list now uses it.` });
      setProfileStatus(null);
    } else if (result.ok === false) {
      setImportStatus({ tone: 'error', text: result.error });
    }
  };

  const handleReset = () => {
    onReset();
    setImportStatus(null);
    setProfileStatus({ tone: 'ok', text: 'Back to the default profile.' });
  };

  const summary: [string, string][] = [
    [
      `Reach, index on fret ${profile.lowRefFret}`,
      `${Math.round(profile.reachAtLowMm)} mm${calibrationKnown ? ` (pinky to fret ${current.lowPinkyFret})` : ''}`,
    ],
    [
      `Reach, index on fret ${profile.highRefFret}`,
      `${Math.round(profile.reachAtHighMm)} mm${calibrationKnown ? ` (pinky to fret ${current.highPinkyFret})` : ''}`,
    ],
    ['Stretches', stretchText(profile.stretchTolerance)],
    ['Barres', profile.noBarre ? 'avoided (one finger per string)' : 'allowed'],
    ['Open strings', profile.allowOpenStrings ? 'allowed' : 'not used'],
    ['Highest fret', String(profile.maxFret)],
  ];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={disclaimerId}
        initial={reduceMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="bg-bg-steel border border-crimson/20 rounded-t-2xl md:rounded-2xl w-full md:max-w-xl max-h-[92vh] md:max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(220,20,60,0.15)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-crimson/15 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Hand className="w-6 h-6 text-ember flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-bold text-bone font-metal tracking-wider">
                Hand profile
              </h2>
              <p className="text-xs text-bone/70 font-mono">
                {isDefault ? 'Default profile' : 'Custom profile'} · saved in this browser
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close hand profile"
            className={`w-11 h-11 flex items-center justify-center rounded-full hover:bg-crimson/10 text-bone/70 hover:text-crimson transition-colors flex-shrink-0 ${FOCUS_RING}`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 space-y-7" style={SCROLL_STYLE}>
          <div className="bg-blood/15 border border-crimson/20 rounded-lg p-3 flex gap-3">
            <Info className="w-4 h-4 mt-0.5 text-ember flex-shrink-0" aria-hidden="true" />
            <div className="text-sm text-bone/85 leading-relaxed">
              <p id={disclaimerId}>{HAND_PROFILE_DISCLAIMER}</p>
              <p className="mt-1.5 text-bone/70">
                RiffForge and Chord Explorer keep separate profiles on this device. Changes in one app do not reach the
                other; import again after you recalibrate in RiffForge.
              </p>
            </div>
          </div>

          <section aria-label="Current profile">
            <SectionTitle>Current profile</SectionTitle>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {summary.map(([term, value]) => (
                <div key={term} className="flex sm:block justify-between gap-3 border-b border-bone/[0.06] pb-1.5 sm:border-0 sm:pb-0">
                  <dt className="text-xs text-bone/70">{term}</dt>
                  <dd className="text-sm font-mono text-bone text-right sm:text-left">{value}</dd>
                </div>
              ))}
            </dl>
            <StatusLine status={profileStatus} />
          </section>

          <section aria-labelledby={calibrationTitleId}>
            <SectionTitle id={calibrationTitleId}>Quick calibration</SectionTitle>
            <div className="space-y-5">
              <FretChoice
                name="ce-low-pinky"
                legend={`Index finger on fret ${CALIBRATION_LOW_INDEX_FRET} of the low string. Which is the highest fret your pinky reaches comfortably on the same string?`}
                options={range(CALIBRATION_LOW_PINKY_RANGE)}
                value={answers.lowPinkyFret}
                onChange={lowPinkyFret => setAnswers(a => ({ ...a, lowPinkyFret }))}
              />
              <FretChoice
                name="ce-high-pinky"
                legend={`Index finger on fret ${CALIBRATION_HIGH_INDEX_FRET} of the low string. Which is the highest fret your pinky reaches comfortably on the same string?`}
                options={range(CALIBRATION_HIGH_PINKY_RANGE)}
                value={answers.highPinkyFret}
                onChange={highPinkyFret => setAnswers(a => ({ ...a, highPinkyFret }))}
              />
              <div className="space-y-2">
                <CheckRow
                  label="No barre chords"
                  description="Every finger presses one string."
                  checked={answers.noBarre}
                  onChange={noBarre => setAnswers(a => ({ ...a, noBarre }))}
                />
                <CheckRow
                  label="Allow stretches"
                  description={`+${STRETCH_PERCENT} percent reach on top of your comfort.`}
                  checked={answers.allowStretches}
                  onChange={allowStretches => setAnswers(a => ({ ...a, allowStretches }))}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCalibration}
                disabled={!calibrationChanged}
                className={`px-4 h-11 rounded-md text-sm font-mono border transition-colors ${FOCUS_RING} ${
                  calibrationChanged
                    ? 'bg-crimson/20 border-crimson/50 text-bone hover:bg-crimson/30'
                    : 'bg-bone/5 border-bone/10 text-bone/60 cursor-not-allowed'
                }`}
              >
                Save calibration
              </button>
            </div>
          </section>

          <section aria-label="Import from RiffForge">
            <SectionTitle>Import from RiffForge</SectionTitle>
            <label htmlFor={importFieldId} className="block text-sm text-bone/80 mb-2 leading-snug">
              Paste the profile JSON copied from RiffForge's Hand profile drawer.
            </label>
            <textarea
              id={importFieldId}
              value={importText}
              onChange={e => {
                setImportText(e.target.value);
                if (importStatus?.tone === 'error') setImportStatus(null);
              }}
              rows={4}
              spellCheck={false}
              aria-describedby={importStatusId}
              aria-invalid={importStatus?.tone === 'error' ? true : undefined}
              placeholder='{ "app": "riffforge", "version": 1, "profile": { ... } }'
              className="w-full px-3 py-2 bg-bg-abyss/60 border border-crimson/15 rounded-lg text-bone font-mono text-xs placeholder:text-bone/60 focus:outline-none focus:border-crimson/50 focus:shadow-[0_0_15px_rgba(220,20,60,0.12)] transition-all resize-y"
              style={SCROLL_STYLE}
            />
            <div className="flex items-start gap-3 mt-2 flex-wrap">
              <button
                type="button"
                onClick={handleImport}
                className={`px-4 h-11 rounded-md text-sm font-mono border bg-crimson/20 border-crimson/50 text-bone hover:bg-crimson/30 transition-colors ${FOCUS_RING}`}
              >
                Import profile
              </button>
              <div className="flex-1 min-w-[10rem]">
                <StatusLine id={importStatusId} status={importStatus} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 border-t border-crimson/15 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefault}
            className={`flex items-center gap-2 px-3 h-11 rounded-md text-sm font-mono border transition-colors ${FOCUS_RING} ${
              isDefault
                ? 'bg-bone/5 border-bone/10 text-bone/60 cursor-not-allowed'
                : 'bg-bone/5 border-bone/15 text-bone/85 hover:bg-bone/10 hover:text-bone'
            }`}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 h-11 rounded-md text-sm font-metal font-semibold border bg-crimson/15 border-crimson/30 text-bone hover:bg-crimson/25 transition-colors ${FOCUS_RING}`}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
