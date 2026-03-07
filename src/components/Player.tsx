import { useCallback, useRef, useState } from 'react';
import { useStore, formatTime } from '../store';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX,
  ChevronDown, Music, Heart, ListPlus, ChevronUp, AlertTriangle, Repeat, Shuffle
} from 'lucide-react';

const SOURCE_LABELS: Record<string, string> = {
  '主源': '',
  '备用源': '备用源',
  '直链': '直链',
  'fallback': '',
};

function CoverImg({ cover, name, spinning, size }: { cover: string; name: string; spinning: boolean; size: 'sm' | 'lg' }) {
  const cls = size === 'lg'
    ? `w-56 h-56 sm:w-64 sm:h-64 rounded-full shadow-2xl shadow-blue-500/20 border-[6px] border-white/20`
    : `w-11 h-11 rounded-xl shadow`;
  if (cover) return <img src={cover} alt={name} className={`${cls} object-cover ${spinning ? 'animate-spin-slow' : ''}`} />;
  return (
    <div className={`${cls} bg-gradient-to-br from-blue-400 to-sky-300 flex items-center justify-center ${spinning ? 'animate-spin-slow' : ''}`}>
      <Music size={size === 'lg' ? 48 : 18} className="text-white/70" />
    </div>
  );
}

function ProgressBar({ className = '' }: { className?: string }) {
  const { currentTime, duration, seekTo } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const handle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!ref.current || !duration) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    seekTo(Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * duration);
  }, [duration, seekTo]);
  return (
    <div ref={ref} className={`progress-bar h-1 bg-blue-200/50 rounded-full group ${className}`} onClick={handle} onTouchMove={handle}>
      <div className="h-full bg-blue-500 rounded-full relative transition-[width] duration-100" style={{ width: `${pct}%` }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-blue-200" />
      </div>
    </div>
  );
}

// ── Desktop Player Bar ──
function DesktopPlayer() {
  const { currentSong, isPlaying, togglePlay, nextSong, prevSong, currentTime, duration, loading, volume, setVolume, toggleLike, isLiked, openPlaylistModal, playError, playSource, playMode, togglePlayMode } = useStore();
  const volRef = useRef<HTMLDivElement>(null);
  if (!currentSong) return null;
  const liked = isLiked(currentSong.id);
  const VIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const sourceLabel = SOURCE_LABELS[playSource] || '';
  return (
    <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-20 glass-strong items-center px-5 z-50 shadow-lg shadow-blue-100/20">
      <div className="flex items-center gap-3 w-[280px] min-w-0 flex-shrink-0">
        <CoverImg cover={currentSong.cover} name={currentSong.name} spinning={isPlaying} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-slate-800 text-sm font-semibold truncate">{currentSong.name}</p>
          <div className="flex items-center gap-1">
            <p className="text-slate-400 text-xs truncate">{currentSong.artist}</p>
            {playError && <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />}
            {sourceLabel && !playError && (
              <span className="text-[9px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full flex-shrink-0">{sourceLabel}</span>
            )}
          </div>
        </div>
        <button onClick={() => toggleLike(currentSong)} className="flex-shrink-0 p-1">
          <Heart size={16} className={liked ? 'text-red-500 fill-red-500' : 'text-slate-400 hover:text-red-400'} />
        </button>
        <button onClick={() => openPlaylistModal(currentSong)} className="flex-shrink-0 p-1">
          <ListPlus size={16} className="text-slate-400 hover:text-blue-500" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center max-w-[560px] mx-auto">
        <div className="flex items-center gap-5 mb-2">
          <button onClick={togglePlayMode} className="text-slate-400 hover:text-blue-500 transition mr-2">
            {playMode === 'random' ? <Shuffle size={16} /> : playMode === 'single' ? <Repeat size={16} className="text-blue-500" /> : <Repeat size={16} />}
          </button>
          <button onClick={prevSong} className="text-slate-500 hover:text-slate-800 transition"><SkipBack size={18} fill="currentColor" /></button>
          <button onClick={togglePlay} disabled={loading}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 active:scale-95 transition shadow-lg shadow-blue-500/30 disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : isPlaying ? <Pause size={17} className="text-white" fill="white" />
              : <Play size={17} className="text-white ml-0.5" fill="white" />}
          </button>
          <button onClick={nextSong} className="text-slate-500 hover:text-slate-800 transition"><SkipForward size={18} fill="currentColor" /></button>
        </div>
        <div className="flex items-center gap-3 w-full">
          <span className="text-[11px] text-slate-400 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
          <ProgressBar className="flex-1" />
          <span className="text-[11px] text-slate-400 w-10 tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="w-[200px] flex justify-end flex-shrink-0 items-center gap-2">
        <VIcon size={16} className="text-slate-400 cursor-pointer" onClick={() => setVolume(volume > 0 ? 0 : 0.7)} />
        <div ref={volRef} className="w-20 h-1 bg-blue-100 rounded-full cursor-pointer group"
          onClick={(e) => { if (!volRef.current) return; const r = volRef.current.getBoundingClientRect(); setVolume((e.clientX - r.left) / r.width); }}>
          <div className="h-full bg-blue-400 rounded-full relative" style={{ width: `${volume * 100}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Mini Player ──
function MobileMiniPlayer() {
  const { currentSong, isPlaying, togglePlay, setShowFullPlayer, currentTime, duration, loading, playError, playSource } = useStore();
  if (!currentSong) return null;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const sourceLabel = SOURCE_LABELS[playSource] || '';
  return (
    <div className="md:hidden fixed bottom-14 left-3 right-3 h-14 glass-strong rounded-2xl flex items-center px-3 z-40 shadow-lg shadow-blue-200/30"
      onClick={() => setShowFullPlayer(true)}>
      <div className="absolute top-0 left-3 right-3 h-[2px] bg-blue-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-[width] duration-200 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <CoverImg cover={currentSong.cover} name={currentSong.name} spinning={isPlaying} size="sm" />
      <div className="flex-1 min-w-0 mx-3">
        <p className="text-slate-800 text-sm font-semibold truncate">{currentSong.name}</p>
        <p className="text-slate-400 text-xs truncate">
          {playError ? <span className="text-amber-500 text-[10px]">⚠ 正在跳过...</span>
            : sourceLabel ? <><span>{currentSong.artist}</span><span className="text-[9px] text-blue-400 ml-1">({sourceLabel})</span></>
            : currentSong.artist}
        </p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-9 h-9 flex items-center justify-center">
        {loading ? <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          : isPlaying ? <Pause size={20} className="text-slate-700" fill="currentColor" />
          : <Play size={20} className="text-slate-700 ml-0.5" fill="currentColor" />}
      </button>
    </div>
  );
}

// ── Mobile Full Player with Swipe ──
function MobileFullPlayer() {
  const {
    currentSong, isPlaying, togglePlay, nextSong, prevSong,
    currentTime, duration, seekTo, showFullPlayer, setShowFullPlayer,
    loading, toggleLike, isLiked, openPlaylistModal, playError, playSource,
    lyrics, currentLyricIndex, playMode, togglePlayMode,
    showLyricsView, setShowLyricsView
  } = useStore();

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [swiping, setSwiping] = useState(false);

  if (!showFullPlayer || !currentSong) return null;
  const liked = isLiked(currentSong.id);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const sourceLabel = SOURCE_LABELS[playSource] || '';

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientY - touchStart);
  };
  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 80) {
      if (touchDelta < 0) nextSong();
      else prevSong();
    }
    setTouchStart(null); setTouchDelta(0); setSwiping(false);
  };

  const translateStyle = swiping && Math.abs(touchDelta) > 10
    ? { transform: `translateY(${touchDelta * 0.3}px)`, transition: 'none' }
    : { transform: 'translateY(0)', transition: 'transform 0.3s ease' };

  return (
    <div className="md:hidden fixed inset-0 z-[100] animate-slide-up">
      {/* BG */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-blue-50 to-white">
        {currentSong.cover && (
          <div className="absolute inset-0 opacity-20 player-bg-blur" style={{ backgroundImage: `url(${currentSong.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
      </div>

      <div className="relative h-full flex flex-col"
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button onClick={() => setShowFullPlayer(false)} className="w-10 h-10 flex items-center justify-center text-slate-500">
            <ChevronDown size={26} />
          </button>
          <div className="text-center flex-1">
            <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">
              正在播放{sourceLabel ? ` · ${sourceLabel}` : ''}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Swipe hint */}
        <div className="flex justify-center mb-2 flex-shrink-0">
          <div className="flex flex-col items-center text-slate-400/70 animate-swipe-hint">
            <ChevronUp size={24} />
            <span className="text-sm font-medium tracking-widest mt-1">滑动切歌</span>
          </div>
        </div>

        {/* Middle Area */}
        <div className="flex-1 flex flex-col items-stretch justify-center px-6 min-h-0 relative" style={translateStyle}>
          
          {!showLyricsView ? (
            <>
              {/* Top preview (previous song hint) */}
              <div className="h-8 flex items-end justify-center text-sm font-medium text-slate-400 transition-opacity" style={{ opacity: touchDelta > 20 ? Math.min(1, touchDelta / 100) : 0 }}>
                <span>↑ 上一首</span>
              </div>
              
              <div className="glass-strong bg-white/40 backdrop-blur-2xl rounded-[2rem] p-6 shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] border border-white/60 flex flex-col items-center flex-shrink-0 mx-auto w-full max-w-[320px]">
                <div className="relative">
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-pulse-ring" />
                  )}
                  <CoverImg cover={currentSong.cover} name={currentSong.name} spinning={isPlaying} size="lg" />
                </div>
              </div>

              {/* 2-line Lyrics Preview */}
              <div className="mt-6 mb-2 flex-shrink-0 cursor-pointer h-12 flex flex-col items-center justify-center overflow-hidden" onClick={() => setShowLyricsView(true)}>
                {lyrics && lyrics.length > 0 ? (
                  <>
                    <p className="text-blue-600 font-bold text-sm truncate w-full text-center transition-all">
                      {lyrics[currentLyricIndex]?.text || ''}
                    </p>
                    <p className="text-slate-500 text-xs truncate w-full text-center mt-1 transition-all opacity-80">
                      {lyrics[currentLyricIndex + 1]?.text || ''}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">暂无歌词</p>
                )}
              </div>
              
              {/* Bottom preview (next song hint) */}
              <div className="h-8 flex items-start justify-center text-sm font-medium text-slate-400 transition-opacity" style={{ opacity: touchDelta < -20 ? Math.min(1, Math.abs(touchDelta) / 100) : 0 }}>
                <span>↓ 下一首</span>
              </div>
            </>
          ) : (
            /* Full Lyrics View */
            <div className="absolute inset-0 flex flex-col pt-4 pb-8 px-2" onClick={() => setShowLyricsView(false)}>
              <div className="flex-1 overflow-y-auto custom-scrollbar text-center mask-v-fade" id="lyrics-container">
                {lyrics && lyrics.length > 0 ? (
                  <div className="py-[30vh]">
                    {lyrics.map((line, idx) => {
                      const isActive = idx === currentLyricIndex;
                      return (
                        <p
                          key={idx}
                          className={`text-base leading-loose mb-6 transition-all duration-300 ${
                            isActive
                              ? 'text-blue-600 font-bold scale-110'
                              : 'text-slate-500/80 scale-100 hover:text-slate-500'
                          }`}
                          ref={(el) => {
                            if (isActive && el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-slate-400">暂无歌词</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Play error hint */}
        {playError && (
          <div className="mx-8 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 backdrop-blur z-10">
            <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
            <span className="text-amber-600 text-[11px] truncate">{playError}</span>
          </div>
        )}

        {/* Song Info + Like/Add */}
        <div className="px-8 mb-4 flex-shrink-0 flex items-start justify-between z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-slate-800 text-xl font-bold truncate">{currentSong.name}</h2>
            <p className="text-slate-400 text-sm truncate mt-0.5">{currentSong.artist}</p>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0 pt-1">
            <button onClick={() => toggleLike(currentSong)}>
              <Heart size={22} className={liked ? 'text-red-500 fill-red-500' : 'text-slate-400'} />
            </button>
            <button onClick={() => openPlaylistModal(currentSong)}>
              <ListPlus size={22} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-8 mb-3 flex-shrink-0 z-10">
          <div className="progress-bar h-1.5 bg-blue-100 rounded-full"
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration); }}
            onTouchMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.max(0, Math.min(1, (e.touches[0].clientX - r.left) / r.width)) * duration); }}>
            <div className="h-full bg-blue-500 rounded-full relative transition-[width] duration-100" style={{ width: `${pct}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500" />
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-slate-400 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[11px] text-slate-400 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-8 pb-10 pt-2 flex-shrink-0 safe-bottom z-10">
          <button onClick={togglePlayMode} className="text-slate-400 hover:text-blue-500 active:scale-90 transition w-10 flex justify-center">
            {playMode === 'random' ? <Shuffle size={22} /> : playMode === 'single' ? <Repeat size={22} className="text-blue-500" /> : <Repeat size={22} />}
          </button>
          
          <div className="flex items-center justify-center gap-8 flex-1">
            <button onClick={prevSong} className="text-slate-700 active:scale-90 transition">
              <SkipBack size={32} fill="currentColor" />
            </button>
            <button onClick={togglePlay} disabled={loading}
              className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center active:scale-95 transition shadow-xl shadow-blue-500/30 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : isPlaying ? <Pause size={28} className="text-white" fill="white" />
                : <Play size={28} className="text-white ml-1" fill="white" />}
            </button>
            <button onClick={nextSong} className="text-slate-700 active:scale-90 transition">
              <SkipForward size={32} fill="currentColor" />
            </button>
          </div>
          
          <button onClick={() => openPlaylistModal(currentSong)} className="text-slate-400 hover:text-blue-500 active:scale-90 transition w-10 flex justify-center">
            <ListPlus size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlayerBar() {
  return (<><DesktopPlayer /><MobileMiniPlayer /><MobileFullPlayer /></>);
}
