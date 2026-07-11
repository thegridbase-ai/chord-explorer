
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Search, Music, Loader2, ExternalLink, ArrowLeft } from 'lucide-react';
import { searchSongs, fetchTabData, SongResult, SongsterrTrack } from '../lib/songsterrApi';
import TabRenderer, { TabData } from './TabRenderer';

interface SongTabViewerProps {
  onClose: () => void;
}

const SongTabViewer: React.FC<SongTabViewerProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [tabData, setTabData] = useState<TabData | null>(null);
  const [loadingTab, setLoadingTab] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SongsterrTrack | null>(null);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const songs = await searchSongs(value);
        setResults(songs);
      } catch {
        setError('Search failed. Try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleSelectSong = (song: SongResult) => {
    setSelectedSong(song);
  };

  const handleBack = () => {
    if (tabData) {
      setTabData(null);
      setSelectedTrack(null);
    } else {
      setSelectedSong(null);
    }
  };

  const handleLoadTrack = async (song: SongResult, track: SongsterrTrack, trackIndex: number) => {
    setLoadingTab(true);
    setSelectedTrack(track);
    setError('');
    try {
      const data = await fetchTabData(song.songId, trackIndex);
      setTabData(data as TabData);
    } catch (err) {
      setError(`Failed to load tab: ${err instanceof Error ? err.message : String(err)}`);
      setTabData(null);
    } finally {
      setLoadingTab(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-bg-steel border border-crimson/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(220,20,60,0.15)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-crimson/15 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-ember" />
            <h2 className="text-xl font-bold text-bone font-metal tracking-wider">
              {selectedSong ? selectedSong.title : 'Song Tabs'}
            </h2>
            {selectedSong && (
              <span className="text-sm text-bone/40 font-mono">
                {selectedSong.artist}{selectedTrack ? ` — ${selectedTrack.instrument}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedSong && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono text-bone/50 hover:text-bone hover:bg-bone/10 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                {tabData ? 'Tracks' : 'Search'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-crimson/10 text-bone/40 hover:text-crimson transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedSong && tabData ? (
          // Tab View
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' }}>
            <TabRenderer data={tabData} />
          </div>
        ) : selectedSong && loadingTab ? (
          // Loading tab
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-crimson animate-spin mx-auto mb-3" />
              <p className="text-bone/40 text-sm font-mono">Loading tab...</p>
            </div>
          </div>
        ) : selectedSong ? (
          // Song Detail + Track List
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' }}>
            <div className="w-full max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-gothic text-bone mb-1">{selectedSong.title}</h3>
                <p className="text-bone/40 font-mono text-sm">{selectedSong.artist}</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-crimson/10 border border-crimson/20 rounded-lg">
                  <p className="text-crimson text-sm font-mono">{error}</p>
                </div>
              )}

              {/* Tracks */}
              <div className="space-y-2 mb-8">
                <h4 className="text-xs font-mono text-bone/60 uppercase tracking-wider mb-3">Select a track to view tab</h4>
                {selectedSong.tracks
                  .filter(t => t.difficulty !== undefined)
                  .sort((a, b) => (b.views || 0) - (a.views || 0))
                  .map((track) => {
                    const trackIndex = selectedSong.tracks.indexOf(track);
                    return (
                    <button
                      key={trackIndex}
                      onClick={() => handleLoadTrack(selectedSong, track, trackIndex)}
                      className="w-full text-left flex items-center justify-between p-3 bg-bone/[0.03] border border-bone/[0.06] rounded-lg hover:border-crimson/30 hover:bg-crimson/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          track.instrument.toLowerCase().includes('bass') ? 'bg-purple-dark/20 text-purple-dark' :
                          track.instrument.toLowerCase().includes('drum') ? 'bg-ember/20 text-ember' :
                          'bg-crimson/15 text-crimson'
                        }`}>
                          {track.instrument.toLowerCase().includes('bass') ? 'B' :
                           track.instrument.toLowerCase().includes('drum') ? 'D' : 'G'}
                        </div>
                        <div>
                          <p className="text-bone text-sm group-hover:text-crimson transition-colors">{track.name}</p>
                          <p className="text-bone/30 text-xs font-mono">{track.instrument}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {track.difficulty && (
                          <div className="flex gap-0.5">
                            {[...Array(6)].map((_, d) => (
                              <div key={d} className={`w-1.5 h-3 rounded-sm ${d < track.difficulty! ? 'bg-crimson/60' : 'bg-bone/10'}`} />
                            ))}
                          </div>
                        )}
                        <span className="text-bone/60 text-xs font-mono w-16 text-right">
                          {track.views ? `${(track.views / 1000).toFixed(0)}k` : ''}
                        </span>
                        <Music className="w-3.5 h-3.5 text-bone/10 group-hover:text-crimson/40 transition-colors" />
                      </div>
                    </button>
                    );
                  })}
              </div>

              <div className="text-center">
                <a
                  href={`https://www.songsterr.com/a/wsa/${selectedSong.artist.toLowerCase().replace(/\s+/g, '-')}-${selectedSong.title.toLowerCase().replace(/\s+/g, '-')}-tab-s${selectedSong.songId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-crimson/10 border border-crimson/20 text-crimson text-sm font-mono hover:bg-crimson/20 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Songsterr
                </a>
              </div>
            </div>
          </div>
        ) : (
          // Search View
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-crimson/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone/30" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search songs or artists..."
                  className="w-full pl-10 pr-4 py-3 bg-bg-abyss/50 border border-crimson/15 rounded-lg text-bone font-mono text-sm placeholder:text-bone/60 focus:outline-none focus:border-crimson/40 focus:shadow-[0_0_15px_rgba(220,20,60,0.1)] transition-all"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crimson animate-spin" />
                )}
              </div>
              {error && <p className="text-crimson/70 text-xs font-mono mt-2">{error}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,20,60,0.3) transparent' }}>
              {results.length > 0 ? (
                <div className="space-y-2">
                  {results.map((song) => (
                    <button
                      key={song.songId}
                      onClick={() => handleSelectSong(song)}
                      className="w-full text-left p-4 bg-bone/[0.03] border border-bone/[0.06] rounded-lg hover:border-crimson/30 hover:bg-crimson/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-bone font-medium text-sm group-hover:text-crimson transition-colors">
                            {song.title}
                          </h4>
                          <p className="text-bone/40 text-xs font-mono mt-0.5">
                            {song.artist}
                          </p>
                        </div>
                        <Music className="w-4 h-4 text-bone/10 group-hover:text-crimson/30 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : query && !loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-bone/60">
                  <Search className="w-8 h-8 mb-3" />
                  <p className="text-sm font-mono">No songs found</p>
                </div>
              ) : !query ? (
                <div className="flex flex-col items-center justify-center py-16 text-bone/60">
                  <Music className="w-8 h-8 mb-3" />
                  <p className="text-sm font-mono">Search for a song to view its tab</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SongTabViewer;
