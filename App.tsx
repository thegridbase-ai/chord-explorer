
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, LayoutGrid, Circle as CircleIcon, Volume2, Info, Skull, Flame, Music } from 'lucide-react';
import ChordSelector from './components/ChordSelector';
import Piano from './components/Piano';
import Fretboard from './components/Fretboard';
import RelativeChords from './components/RelativeChords';
import ProgressionBuilder from './components/ProgressionBuilder';
import CircleOfFifths from './components/CircleOfFifths';
import CAGEDView from './components/CAGEDView';
import EmberParticles from './components/EmberParticles';
import ScaleSelector from './components/ScaleSelector';
import SongTabViewer from './components/SongTabViewer';
import { getChordNotes, getAllChordVoicings, getRelativeChords, getRomanNumeral, displayNote, invertChordNotes, chordDisplayName, VoicingWithMeta } from './lib/musicTheory';
import { readStateFromUrl, writeStateToUrl } from './lib/urlState';
import { loadStoredProgression, saveStoredProgression } from './lib/storage';
import { getScaleNotes } from './lib/scaleTheory';
import { ChordType, Note, Chord as AppChord, ProgressionChord } from './constants/musicData';
import { ScaleType, CHORD_TO_SCALE } from './constants/scaleData';
import { playVoicing, playChord, ensureAudioContext } from './lib/audioEngine';

const INVERSION_LABELS = ['Root', '1st', '2nd', '3rd'];

type BassFilter = 'all' | 6 | 5 | 4;

const BASS_FILTER_OPTIONS: { value: BassFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 6, label: '6th (E)' },
  { value: 5, label: '5th (A)' },
  { value: 4, label: '4th (D)' },
];

// The 4th-string bucket also catches the rare voicing whose bass sits higher.
const matchesBassFilter = (voicing: VoicingWithMeta, filter: BassFilter): boolean =>
  filter === 'all' || voicing.bassString === filter || (filter === 4 && voicing.bassString < 4);

// Pick the voicing to select after the chord or filter changes: same shape
// name first, otherwise the closest neck position, staying on the requested
// bass string when possible.
const pickVoicingIndex = (
  voicings: VoicingWithMeta[],
  previous: VoicingWithMeta | undefined,
  bassFilter: BassFilter
): number => {
  if (voicings.length === 0) return 0;
  let pool = voicings.map((v, i) => ({ v, i })).filter(c => matchesBassFilter(c.v, bassFilter));
  if (pool.length === 0) pool = voicings.map((v, i) => ({ v, i }));
  if (previous) {
    const byName = pool.find(c => c.v.name === previous.name);
    if (byName) return byName.i;
    return pool.reduce((best, c) =>
      Math.abs(c.v.startFret - previous.startFret) < Math.abs(best.v.startFret - previous.startFret) ? c : best
    ).i;
  }
  return pool[0].i;
};

const App: React.FC = () => {
  const [initialUrlState] = useState(readStateFromUrl);
  const [rootNote, setRootNote] = useState<Note>(initialUrlState.root ?? 'A');
  const [chordType, setChordType] = useState<ChordType>(initialUrlState.type ?? 'minor');
  const [hoveredChord, setHoveredChord] = useState<AppChord | null>(null);
  const [showCircleOfFifths, setShowCircleOfFifths] = useState(false);
  const [showCAGED, setShowCAGED] = useState(false);
  const [showSongTabs, setShowSongTabs] = useState(false);
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState(initialUrlState.voicing ?? 0);
  const [bassFilter, setBassFilter] = useState<BassFilter>('all');
  const [progression, setProgression] = useState<ProgressionChord[]>(loadStoredProgression);
  const [showRelativeChords, setShowRelativeChords] = useState(false);
  const [scaleActive, setScaleActive] = useState(initialUrlState.scale !== undefined);
  const [scaleType, setScaleType] = useState<ScaleType>(initialUrlState.scale ?? 'pentatonic_minor');
  const [activeExtensions, setActiveExtensions] = useState<string[]>([]);
  const [inversion, setInversion] = useState(initialUrlState.inv ?? 0);

  const selectedChord = useMemo(() => ({ root: rootNote, type: chordType }), [rootNote, chordType]);
  const chordNotes = useMemo(() => getChordNotes(rootNote, chordType), [rootNote, chordType]);
  const allVoicings = useMemo(() => getAllChordVoicings(rootNote, chordType), [rootNote, chordType]);
  const relativeChords = useMemo(() => getRelativeChords(rootNote, chordType), [rootNote, chordType]);

  const scaleNotes = useMemo(() => {
    if (!scaleActive) return undefined;
    const chordNoteNames = chordNotes.map(n => n.note);
    return getScaleNotes(rootNote, scaleType, activeExtensions, chordNoteNames);
  }, [scaleActive, rootNote, scaleType, activeExtensions, chordNotes]);

  const currentVoicingIndex = selectedVoicingIndex >= allVoicings.length ? 0 : selectedVoicingIndex;
  const currentVoicing = allVoicings[currentVoicingIndex];

  const visibleVoicings = useMemo(
    () => allVoicings
      .map((voicing, index) => ({ voicing, index }))
      .filter(({ voicing }) => matchesBassFilter(voicing, bassFilter)),
    [allVoicings, bassFilter]
  );

  // 0..(chordTones - 1); anything else falls back to root position
  const currentInversion = inversion > 0 && inversion < chordNotes.length ? inversion : 0;
  const invertedNotes = useMemo(
    () => invertChordNotes(rootNote, chordType, currentInversion),
    [rootNote, chordType, currentInversion]
  );

  // Keep sharable state in the URL query string
  useEffect(() => {
    writeStateToUrl(rootNote, chordType, currentVoicingIndex, scaleActive, scaleType, currentInversion);
  }, [rootNote, chordType, currentVoicingIndex, scaleActive, scaleType, currentInversion]);

  // Persist the progression across sessions
  useEffect(() => {
    saveStoredProgression(progression);
  }, [progression]);

  const displayVoicing = useMemo(() => {
    if (hoveredChord) {
      const hoverVoicings = getAllChordVoicings(hoveredChord.root, hoveredChord.type);
      return hoverVoicings[0]?.voicing || [];
    }
    return currentVoicing?.voicing || [];
  }, [hoveredChord, currentVoicing]);

  const handleAddChordToProgression = (chord: AppChord) => {
    if (progression.length < 8) {
      const voicingIdx = (chord.root === rootNote && chord.type === chordType)
        ? currentVoicingIndex
        : 0;
      setProgression([...progression, { ...chord, voicingIndex: voicingIdx }]);
    }
  };

  const handleUpdateProgressionVoicing = (index: number, voicingIndex: number) => {
    setProgression(progression.map((chord, i) =>
      i === index ? { ...chord, voicingIndex } : chord
    ));
  };

  const handleClearProgression = () => {
    setProgression([]);
  };

  const handleChordTypeChange = (newType: ChordType) => {
    const newVoicings = getAllChordVoicings(rootNote, newType);
    setChordType(newType);
    setSelectedVoicingIndex(pickVoicingIndex(newVoicings, currentVoicing, bassFilter));
    setInversion(0);
    // Auto-suggest scale when chord type changes
    const suggested = CHORD_TO_SCALE[newType];
    if (suggested) setScaleType(suggested);
    setActiveExtensions([]);
  };

  const handleRootChange = (root: Note) => {
    setRootNote(root);
    setSelectedVoicingIndex(pickVoicingIndex(getAllChordVoicings(root, chordType), undefined, bassFilter));
    setInversion(0);
  };

  const handleBassFilterChange = (filter: BassFilter) => {
    setBassFilter(filter);
    if (currentVoicing && !matchesBassFilter(currentVoicing, filter)) {
      setSelectedVoicingIndex(pickVoicingIndex(allVoicings, currentVoicing, filter));
    }
  };

  const handleToggleExtension = (extId: string) => {
    setActiveExtensions(prev =>
      prev.includes(extId) ? prev.filter(id => id !== extId) : [...prev, extId]
    );
  };

  const handleSelectChord = (root: Note, type: ChordType) => {
    setRootNote(root);
    setChordType(type);
    setSelectedVoicingIndex(0);
    setInversion(0);
  }

  const handleCircleKeySelect = (key: Note, isMinor: boolean) => {
    setRootNote(key);
    setChordType(isMinor ? 'minor' : 'Major');
    setInversion(0);
  }

  const handlePlayChord = async () => {
    await ensureAudioContext();
    if (currentInversion > 0 && !hoveredChord) {
      // Play the inverted note stack on the piano synth
      playChord(invertedNotes.map(n => `${n.note}${n.octave}`), 'piano');
    } else {
      playVoicing(displayVoicing, 'guitar');
    }
  };

  const TheoryNote: React.FC<{ chord: AppChord }> = ({ chord }) => {
    const roman = getRomanNumeral(chord.root, chord.type);
    const notes = getChordNotes(chord.root, chord.type).map(n => displayNote(n.note, chord.root, chord.type)).join(', ');
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blood/15 border border-crimson/20 rounded-lg p-5 mt-6 flex gap-4 border-flicker"
      >
        <div className="mt-0.5">
          <Skull className="w-5 h-5 text-crimson" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-hellfire mb-1 font-metal">Theory Note</h4>
          <p className="text-sm text-bone/70 leading-relaxed">
            <span className="font-mono text-hellfire">{chordDisplayName(chord.root, chord.type, currentInversion, chord.root, chord.type)}</span> ({roman}) consists of the notes: <span className="font-mono text-ember">{notes}</span>.
            It serves as the '{roman}' chord in its relative major key.
            This chord has a {chord.type === 'minor' ? 'dark, melancholic' : 'powerful, commanding'} quality.
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-bg-abyss text-bone min-h-screen flex flex-col relative">
      {/* Background texture - no fixed attachment for performance */}
      <div
        className="fixed inset-0 z-0 opacity-15"
        style={{
          backgroundImage: 'url(/metal-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-bg-abyss/80 via-bg-abyss/90 to-bg-abyss" />

      {/* Ember particles */}
      <EmberParticles />

      {/* Header */}
      <header className="relative h-20 border-b border-crimson/20 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(/metal-header.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-abyss via-bg-abyss/95 to-bg-abyss/90" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-crimson/50 to-transparent" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-crimson/50 flame-glow">
            <img src="/metal-icon.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-gothic tracking-[0.2em] text-bone glow-text-crimson">
              CHORD EXPLORER
            </h1>
            <div className="h-0.5 w-full bg-gradient-to-r from-crimson via-ember to-transparent mt-0.5" />
          </div>
        </div>
        <div className="flex gap-2 md:gap-3 relative z-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCAGED(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-md bg-crimson/10 hover:bg-crimson/20 border border-crimson/20 hover:border-crimson/40 transition-colors text-sm font-metal font-semibold text-bone/80 hover:text-bone"
          >
            <LayoutGrid className="w-4 h-4 text-crimson" />
            <span className="hidden md:inline">CAGED</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCircleOfFifths(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-md bg-purple-dark/30 hover:bg-purple-dark/50 border border-purple-dark/40 hover:border-purple-dark/60 transition-colors text-sm font-metal font-semibold text-bone/80 hover:text-bone"
          >
            <CircleIcon className="w-4 h-4 text-purple-dark" />
            <span className="hidden md:inline">Circle of Fifths</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSongTabs(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-md bg-ember/10 hover:bg-ember/20 border border-ember/30 hover:border-ember/50 transition-colors text-sm font-metal font-semibold text-bone/80 hover:text-bone"
          >
            <Music className="w-4 h-4 text-ember" />
            <span className="hidden md:inline">Song Tabs</span>
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row relative z-10">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-crimson/10 p-6 overflow-y-auto bg-bg-steel/50">
          <ChordSelector
            selectedRoot={rootNote}
            selectedType={chordType}
            onRootChange={handleRootChange}
            onTypeChange={handleChordTypeChange}
          />
        </aside>

        {/* Mobile Chord Selector */}
        <div className="lg:hidden border-b border-crimson/10 p-3 bg-bg-steel/50">
          <ChordSelector
            selectedRoot={rootNote}
            selectedType={chordType}
            onRootChange={handleRootChange}
            onTypeChange={handleChordTypeChange}
            compact
          />
        </div>

        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto pb-36 lg:pb-32">
          <div className="w-full max-w-5xl mx-auto">
            {/* Chord Title */}
            <motion.div
              key={`${rootNote}-${chordType}-${currentInversion}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="mb-8 flex items-end justify-between"
            >
              <div>
                <h2 className="text-3xl md:text-5xl font-gothic font-bold text-bone tracking-wider flex items-center gap-3">
                  <span className="text-crimson glow-text-crimson">{chordDisplayName(rootNote, chordType, currentInversion, rootNote, chordType)}</span>
                  <span className="text-lg md:text-xl font-normal text-bone/40 font-mono">
                    ({displayNote(rootNote, rootNote, chordType)} {chordType})
                  </span>
                </h2>
                <p className="text-bone/50 mt-2 text-sm font-industrial">
                  {chordType === 'minor' ? 'A dark chord forged in shadow and sorrow.' :
                   chordType === 'Major' ? 'A powerful chord commanding presence and might.' :
                   chordType === 'm7' ? 'A haunting minor seventh, echoing through the void.' :
                   chordType === 'maj7' ? 'A majestic seventh, resonating with dark beauty.' :
                   chordType === '7' ? 'A dominant force pulling all toward its resolve.' :
                   chordType === 'dim' ? 'A diminished specter of tension and unrest.' :
                   chordType === 'aug' ? 'An augmented cry, suspended between worlds.' :
                   chordType === 'sus2' ? 'An open suspension, hovering before the storm.' :
                   chordType === 'sus4' ? 'A restless suspension, aching to resolve.' :
                   `The ${displayNote(rootNote, rootNote, chordType)} ${chordType} chord, forged in fire.`}
                </p>
                <div className="h-0.5 w-32 bg-gradient-to-r from-crimson/60 to-transparent mt-3" />
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePlayChord}
                aria-label="Play chord"
                className="w-12 h-12 rounded-full bg-crimson/15 text-crimson border border-crimson/30 flex items-center justify-center hover:bg-crimson/25 transition-colors flame-glow"
              >
                <Volume2 className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Piano */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <h3 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] mb-4 font-metal flex items-center gap-2">
                <Flame className="w-3 h-3 text-ember" />
                Piano View
              </h3>
              <Piano notes={invertedNotes} scaleNotes={scaleNotes} keyRoot={rootNote} keyType={chordType} />
            </motion.div>

            {/* Voicing Selector */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] font-metal flex items-center gap-2">
                  <Flame className="w-3 h-3 text-ember" />
                  Guitar Voicings
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-bone/30 font-mono uppercase tracking-wider">Bass</span>
                  <div className="flex gap-1">
                    {BASS_FILTER_OPTIONS.map(({ value, label }) => {
                      const count = value === 'all'
                        ? allVoicings.length
                        : allVoicings.filter(v => matchesBassFilter(v, value)).length;
                      return (
                        <button
                          key={String(value)}
                          onClick={() => handleBassFilterChange(value)}
                          disabled={count === 0 || !!hoveredChord}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                            bassFilter === value
                              ? 'bg-crimson/20 border-crimson text-crimson'
                              : count === 0
                                ? 'bg-bone/5 border-bone/5 text-bone/20 cursor-not-allowed'
                                : 'bg-bone/5 border-bone/10 text-bone/50 hover:bg-bone/10 hover:text-bone'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className={`flex gap-2 overflow-x-auto pb-2 transition-opacity ${hoveredChord ? 'opacity-40' : ''}`}>
                {visibleVoicings.length > 0 ? (
                  visibleVoicings.map(({ voicing, index }) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedVoicingIndex(index)}
                      disabled={!!hoveredChord}
                      className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border font-mono ${
                        currentVoicingIndex === index
                          ? 'bg-crimson/20 border-crimson text-crimson shadow-[0_0_10px_rgba(220,20,60,0.3)]'
                          : 'bg-bone/5 border-bone/10 text-bone/60 hover:bg-bone/10 hover:text-bone'
                      } ${hoveredChord ? 'cursor-not-allowed' : ''}`}
                    >
                      {voicing.name}
                      {voicing.startFret > 0 && (
                        <span className="ml-1 text-xs opacity-70">({voicing.startFret}fr)</span>
                      )}
                    </motion.button>
                  ))
                ) : (
                  <span className="text-sm text-bone/40 font-mono">{allVoicings[0]?.name || 'Default'}</span>
                )}
                {hoveredChord && (
                  <span className="ml-2 text-xs text-bone/40 italic self-center">Preview</span>
                )}
              </div>
            </motion.div>

            {/* Inversion Selector */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-bone/40 uppercase tracking-[0.2em] font-metal flex items-center gap-2">
                  <Flame className="w-3 h-3 text-ember" />
                  Inversion
                </h3>
                <span className="text-xs text-bone/30 font-mono">
                  {chordNotes.length} position{chordNotes.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={`flex gap-2 overflow-x-auto pb-2 transition-opacity ${hoveredChord ? 'opacity-40' : ''}`}>
                {chordNotes.map((tone, index) => {
                  const bass = displayNote(tone.note, rootNote, chordType);
                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setInversion(index)}
                      disabled={!!hoveredChord}
                      className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border font-mono text-left ${
                        currentInversion === index
                          ? 'bg-crimson/20 border-crimson text-crimson shadow-[0_0_10px_rgba(220,20,60,0.3)]'
                          : 'bg-bone/5 border-bone/10 text-bone/60 hover:bg-bone/10 hover:text-bone'
                      } ${hoveredChord ? 'cursor-not-allowed' : ''}`}
                    >
                      <span className="block">{INVERSION_LABELS[index]}</span>
                      <span className="block text-[10px] opacity-70">{bass} in bass</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Scale Selector */}
            <ScaleSelector
              active={scaleActive}
              scaleType={scaleType}
              activeExtensions={activeExtensions}
              onToggle={() => setScaleActive(!scaleActive)}
              onScaleTypeChange={(type) => { setScaleType(type); setActiveExtensions([]); }}
              onToggleExtension={handleToggleExtension}
            />

            {/* Fretboard */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Fretboard voicing={displayVoicing} chordNotes={chordNotes} scaleNotes={scaleNotes} isPreview={hoveredChord !== null} />
              {currentInversion > 0 && (
                <p className="mt-2 text-xs text-bone/30 font-mono italic">Guitar voicings shown in root position</p>
              )}
            </motion.div>

            {/* Theory Note */}
            <div className="hidden md:block">
              <TheoryNote chord={selectedChord} />
            </div>

            {/* Mobile Related Chords Toggle */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRelativeChords(!showRelativeChords)}
              className="lg:hidden w-full mt-6 p-3 bg-crimson/5 border border-crimson/15 rounded-lg flex items-center justify-between font-mono text-sm hover:bg-crimson/10 transition-colors"
            >
              <span>Related Chords ({relativeChords.length})</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${showRelativeChords ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.button>

            {/* Mobile Related Chords */}
            <AnimatePresence>
              {showRelativeChords && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden mt-3 bg-crimson/5 border border-crimson/10 rounded-lg p-3 overflow-hidden"
                >
                  <RelativeChords
                    chords={relativeChords}
                    selectedChord={selectedChord}
                    progression={progression}
                    onSelectChord={handleSelectChord}
                    onAddToProgression={handleAddChordToProgression}
                    onHoverChord={setHoveredChord}
                    compact
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block w-80 flex-shrink-0 border-l border-crimson/10 bg-bg-steel/60 backdrop-blur-sm p-6 overflow-y-auto pb-32">
          <RelativeChords
            chords={relativeChords}
            selectedChord={selectedChord}
            progression={progression}
            onSelectChord={handleSelectChord}
            onAddToProgression={handleAddChordToProgression}
            onHoverChord={setHoveredChord}
          />
        </aside>
      </div>

      <ProgressionBuilder
        progression={progression}
        onClear={handleClearProgression}
        onRemove={(index) => setProgression(progression.filter((_, i) => i !== index))}
        onUpdateVoicing={handleUpdateProgressionVoicing}
      />

      <AnimatePresence>
        {showCircleOfFifths && (
          <CircleOfFifths
            selectedKey={rootNote}
            isMinor={chordType === 'minor' || chordType === 'm7'}
            onSelectKey={handleCircleKeySelect}
            onClose={() => setShowCircleOfFifths(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCAGED && (
          <CAGEDView
            rootNote={rootNote}
            chordType={chordType}
            onSelectShape={(shape) => {
              console.log('Selected CAGED shape:', shape.name, 'at fret', shape.fret);
            }}
            onClose={() => setShowCAGED(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSongTabs && (
          <SongTabViewer onClose={() => setShowSongTabs(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
