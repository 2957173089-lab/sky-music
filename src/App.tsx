import { useEffect, useState, useCallback } from 'react';
import { useStore, formatDuration, formatCount, type Song } from './store';
import { PlayerBar } from './components/Player';
import {
  Home, Search, Music, Play, TrendingUp, Loader2, Heart,
  Trash2, X, RefreshCw, AlertCircle, Settings, ListPlus,
  Plus, ChevronRight, Disc3, Zap, FolderPlus, UserCircle2,
} from 'lucide-react';

// ─── Song Row ───
function SongRow({ song, index, songs, showIndex = true }: { song: Song; index: number; songs: Song[]; showIndex?: boolean }) {
  const { playSong, currentSong, isPlaying, toggleLike, isLiked, openPlaylistModal, loading, playError } = useStore();
  const active = currentSong?.id === song.id;
  const liked = isLiked(song.id);
  const hasError = active && !!playError;
  return (
    <div onClick={() => playSong(song, songs)}
      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group active:scale-[0.99] ${
        active ? (hasError ? 'glass border-amber-200/50 shadow-sm' : 'glass border-blue-300/50 shadow-sm') : 'hover:bg-white/30 border border-transparent'
      }`}>
      {showIndex && (
        <div className="w-7 text-center flex-shrink-0">
          {active && isPlaying ? (
            <div className="flex items-end justify-center gap-[2px] h-4">
              <div className="w-[3px] bg-blue-500 rounded-full animate-bar1" />
              <div className="w-[3px] bg-blue-500 rounded-full animate-bar2" />
              <div className="w-[3px] bg-blue-500 rounded-full animate-bar3" />
            </div>
          ) : active && loading ? (
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          ) : (
            <span className={`text-sm tabular-nums ${active ? 'text-blue-500 font-bold' : 'text-slate-400'}`}>
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </div>
      )}
      {song.cover ? (
        <img src={song.cover} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-300 to-sky-200 flex items-center justify-center flex-shrink-0">
          <Music size={14} className="text-white" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${hasError ? 'text-amber-600 font-semibold' : active ? 'text-blue-600 font-semibold' : 'text-slate-700'}`}>{song.name}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {hasError ? <span className="text-amber-500 text-[10px]">⚠ 无法播放</span> : <>{song.artist}{song.album ? ` · ${song.album}` : ''}</>}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-[11px] text-slate-300 tabular-nums hidden sm:inline mr-1">{formatDuration(song.duration)}</span>
        <button onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart size={13} className={liked ? 'text-red-500 fill-red-500' : 'text-slate-400'} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); openPlaylistModal(song); }}
          className="w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ListPlus size={13} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function SongList({ songs, showIndex = true }: { songs: Song[]; showIndex?: boolean }) {
  return (
    <div className="space-y-0.5">
      {songs.map((song, i) => <SongRow key={`${song.id}-${i}`} song={song} index={i} songs={songs} showIndex={showIndex} />)}
    </div>
  );
}

// ─── Home ───
function HomePage() {
  const { hotSongs, recommendations, hotSearches, loading, setView, search, apiStatus, playSong } = useStore();
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
      {apiStatus === 'error' && (
        <div className="glass rounded-2xl p-4 flex items-start gap-3 border-red-200/50">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-500 text-sm font-medium">API连接异常</p>
            <p className="text-slate-400 text-xs mt-1">请前往设置配置可用的API</p>
          </div>
          <button onClick={() => setView('settings')} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs">去设置</button>
        </div>
      )}
      {apiStatus === 'checking' && (
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Loader2 size={18} className="text-blue-500 animate-spin" />
          <p className="text-slate-500 text-sm">正在检测API...</p>
        </div>
      )}

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-500 via-sky-400 to-cyan-400 p-6 md:p-10 shadow-xl shadow-blue-200/40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
        <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2">发现好音乐 ✨</h1>
          <p className="text-white/80 text-sm md:text-base max-w-md">百万曲库，在线畅听</p>
          <button onClick={() => setView('search')}
            className="mt-4 px-5 py-2.5 bg-white/25 hover:bg-white/35 backdrop-blur text-white text-sm rounded-full transition border border-white/30">
            <Search size={14} className="inline mr-2 -mt-0.5" />搜索歌曲
          </button>
        </div>
      </div>

      {/* Hot Searches */}
      {hotSearches.length > 0 && (
        <section>
          <h2 className="text-slate-700 font-bold text-base mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-400" />热门搜索
          </h2>
          <div className="flex flex-wrap gap-2">
            {hotSearches.map((item, i) => (
              <button key={i} onClick={() => { search(item.searchWord); setView('search'); }}
                className="px-3.5 py-1.5 rounded-full glass text-slate-600 text-xs hover:bg-white/70 transition active:scale-95">
                <span className={`mr-1.5 font-bold ${i < 3 ? 'text-orange-400' : 'text-slate-400'}`}>{i + 1}</span>
                {item.searchWord}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Playlists */}
      {recommendations.length > 0 && (
        <section>
          <h2 className="text-slate-700 font-bold text-base mb-3 flex items-center gap-2">
            <Disc3 size={16} className="text-blue-500" />推荐歌单
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {recommendations.map((item) => (
              <div key={item.id} className="group cursor-pointer">
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-2 shadow-md shadow-blue-100/40">
                  <img src={item.picUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <Play size={16} className="text-blue-600 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur rounded-lg px-1.5 py-0.5 text-[9px] text-white flex items-center gap-0.5">
                    <Play size={7} fill="white" />{formatCount(item.playCount)}
                  </div>
                </div>
                <p className="text-slate-600 text-xs leading-snug line-clamp-2">{item.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New Songs */}
      <section>
        <h2 className="text-slate-700 font-bold text-base mb-3 flex items-center gap-2">
          <Music size={16} className="text-blue-500" />最新音乐
        </h2>
        {loading && hotSongs.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 size={24} className="text-blue-400 animate-spin" />
            <span className="mt-3 text-slate-400 text-sm">加载中...</span>
          </div>
        ) : hotSongs.length > 0 ? (
          <>
            {/* Quick play button for first 5 songs */}
            <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
              {hotSongs.slice(0, 6).map(song => (
                <div key={song.id} onClick={() => playSong(song, hotSongs)}
                  className="flex-shrink-0 w-28 cursor-pointer group">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-md shadow-blue-100/30 mb-1.5 relative">
                    {song.cover ? (
                      <img src={song.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-300 to-sky-200 flex items-center justify-center">
                        <Music size={24} className="text-white/60" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={20} className="text-white" fill="white" />
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs font-medium truncate">{song.name}</p>
                  <p className="text-slate-400 text-[10px] truncate">{song.artist}</p>
                </div>
              ))}
            </div>
            <SongList songs={hotSongs} />
          </>
        ) : null}
      </section>
    </div>
  );
}

// ─── Search ───
function SearchPage() {
  const { searchResults, searchQuery, search, searchLoading, hotSearches, errorMsg, apiStatus, setView } = useStore();
  const [query, setQuery] = useState(searchQuery);
  const handleSearch = useCallback(() => { if (query.trim()) search(query.trim()); }, [query, search]);
  useEffect(() => { if (searchQuery && searchQuery !== query) setQuery(searchQuery); }, [searchQuery]);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      {apiStatus === 'error' && (
        <div className="mb-4 glass rounded-2xl p-3 flex items-center gap-2 border-amber-200/50">
          <AlertCircle size={14} className="text-amber-500" />
          <p className="text-amber-600 text-xs flex-1">API未连接</p>
          <button onClick={() => setView('settings')} className="text-amber-500 text-xs underline">去设置</button>
        </div>
      )}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索歌曲、歌手、专辑..."
            className="w-full glass rounded-2xl py-3 pl-11 pr-10 text-slate-700 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300/50 transition-all"
            autoFocus />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center">
              <X size={12} className="text-slate-500" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={!query.trim() || searchLoading || apiStatus !== 'ok'}
          className="px-5 bg-blue-500 text-white rounded-2xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition disabled:opacity-40 flex-shrink-0 shadow-lg shadow-blue-500/20">
          {searchLoading ? <Loader2 size={16} className="animate-spin" /> : '搜索'}
        </button>
      </div>

      {searchLoading ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 size={24} className="text-blue-400 animate-spin" />
          <span className="mt-3 text-slate-400 text-sm">搜索中...</span>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="animate-fade-in">
          <p className="text-slate-400 text-sm mb-4">
            找到 <span className="text-blue-500 font-medium">{searchResults.length}</span> 首 "{searchQuery}"
          </p>
          <SongList songs={searchResults} />
        </div>
      ) : searchQuery && errorMsg ? (
        <div className="text-center py-20">
          <AlertCircle size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{errorMsg}</p>
          <button onClick={handleSearch} className="mt-4 px-4 py-2 rounded-xl bg-blue-50 text-blue-500 text-sm inline-flex items-center gap-2">
            <RefreshCw size={14} />重试
          </button>
        </div>
      ) : (
        <div className="animate-fade-in">
          {hotSearches.length > 0 && (
            <>
              <h3 className="text-slate-600 font-semibold mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-orange-400" />热门搜索
              </h3>
              <div className="flex flex-wrap gap-2 mb-8">
                {hotSearches.map((item, i) => (
                  <button key={i} onClick={() => { setQuery(item.searchWord); search(item.searchWord); }}
                    className="px-3.5 py-2 rounded-full glass text-slate-600 text-sm hover:bg-white/70 transition active:scale-95">
                    <span className={`mr-1.5 font-bold text-xs ${i < 3 ? 'text-orange-400' : 'text-slate-400'}`}>{i + 1}</span>
                    {item.searchWord}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="text-center pt-8">
            <Search size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">输入关键词搜索音乐</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Liked Songs ───
function LikedPage() {
  const { likedSongs } = useStore();
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center shadow-lg shadow-red-200/40">
          <Heart size={20} className="text-white" fill="white" />
        </div>
        <div>
          <h2 className="text-slate-800 font-bold text-xl">我喜欢的</h2>
          <p className="text-slate-400 text-sm">{likedSongs.length} 首歌曲</p>
        </div>
      </div>
      {likedSongs.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">还没有喜欢的歌曲</p>
          <p className="text-slate-300 text-xs mt-1">点击 ♥ 添加喜欢的歌曲</p>
        </div>
      ) : <SongList songs={likedSongs} />}
    </div>
  );
}

// ─── Playlists ───
function PlaylistsPage() {
  const { userPlaylists, deletePlaylist, playSong, currentSong, isPlaying } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { createPlaylist } = useStore();

  const handleCreate = () => {
    if (newName.trim()) { createPlaylist(newName.trim()); setNewName(''); setShowCreate(false); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-200/40">
            <FolderPlus size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-slate-800 font-bold text-xl">我的歌单</h2>
            <p className="text-slate-400 text-sm">{userPlaylists.length} 个歌单</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white active:scale-95">
          <Plus size={18} />
        </button>
      </div>

      {showCreate && (
        <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="歌单名称..." autoFocus
            className="w-full bg-white/50 rounded-xl py-2.5 px-4 text-slate-700 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300/50 mb-3" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 rounded-xl text-slate-500 text-sm">取消</button>
            <button onClick={handleCreate} disabled={!newName.trim()}
              className="px-4 py-1.5 rounded-xl bg-blue-500 text-white text-sm disabled:opacity-40">创建</button>
          </div>
        </div>
      )}

      {userPlaylists.length === 0 && !showCreate ? (
        <div className="text-center py-20">
          <FolderPlus size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">还没有创建歌单</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2 rounded-xl bg-blue-50 text-blue-500 text-sm inline-flex items-center gap-2">
            <Plus size={14} />创建歌单
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {userPlaylists.map(pl => (
            <div key={pl.id} className="glass rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === pl.id ? null : pl.id)}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-200 to-sky-200 flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 font-semibold text-sm truncate">{pl.name}</p>
                  <p className="text-slate-400 text-xs">{pl.songs.length} 首歌曲</p>
                </div>
                {pl.songs.length > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); playSong(pl.songs[0], pl.songs); }}
                    className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 mr-1">
                    <Play size={14} fill="white" className="ml-0.5" />
                  </button>
                )}
                <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedId === pl.id ? 'rotate-90' : ''}`} />
              </div>
              {expandedId === pl.id && (
                <div className="border-t border-white/40 px-4 pb-3 animate-fade-in">
                  {pl.songs.length > 0 ? (
                    <div className="mt-2 space-y-0.5">
                      {pl.songs.map((song, i) => {
                        const active = currentSong?.id === song.id;
                        return (
                          <div key={song.id} onClick={() => playSong(song, pl.songs)}
                            className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition ${active ? 'bg-blue-50' : 'hover:bg-white/30'}`}>
                            <span className="text-[11px] text-slate-400 w-5 text-center">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs truncate ${active && isPlaying ? 'text-blue-500 font-semibold' : 'text-slate-600'}`}>{song.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{song.artist}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-slate-400 text-xs py-3 text-center">歌单为空</p>}
                  <button onClick={() => deletePlaylist(pl.id)}
                    className="mt-2 w-full py-2 rounded-xl text-red-400 text-xs flex items-center justify-center gap-1.5 hover:bg-red-50 transition">
                    <Trash2 size={12} />删除歌单
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Me Page (Profile & Auth) ───
function MePage() {
  const { user, signUp, signIn, signOut, authLoading, authError, syncFavoritesToCloud, syncPlaylistsToCloud, 
          backendUser, backendSignIn, backendSignOut, backendAuthLoading, backendAuthError,
          syncToBackend, syncFromBackend,
          likedSongs, userPlaylists, playHistory, setView } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const MyContent = () => (
    <>
      {/* Quick Nav Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setView('liked')} className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/40 transition active:scale-95 shadow-sm shadow-blue-100/30">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <Heart size={20} className="text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 text-xs font-semibold">我喜欢</p>
            <p className="text-slate-400 text-[10px]">{likedSongs.length}</p>
          </div>
        </button>
        <button onClick={() => setView('playlists')} className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/40 transition active:scale-95 shadow-sm shadow-blue-100/30">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <FolderPlus size={20} className="text-blue-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 text-xs font-semibold">我的歌单</p>
            <p className="text-slate-400 text-[10px]">{userPlaylists.length}</p>
          </div>
        </button>
        <button onClick={() => setView('history')} className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/40 transition active:scale-95 shadow-sm shadow-blue-100/30">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
            <Zap size={20} className="text-purple-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-700 text-xs font-semibold">播放历史</p>
            <p className="text-slate-400 text-[10px]">{playHistory.length}</p>
          </div>
        </button>
      </div>

      {backendUser ? (
        <>
          <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-lg text-white font-bold text-xl">
              {backendUser.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-semibold text-base truncate">{backendUser.email}</p>
              <p className="text-slate-400 text-xs mt-0.5">已登录并开启云同步</p>
            </div>
            <button onClick={backendSignOut} disabled={backendAuthLoading} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition">
              {backendAuthLoading ? <Loader2 size={12} className="animate-spin" /> : '退出'}
            </button>
          </div>

          <div className="glass rounded-2xl p-4 mb-6 space-y-2">
            <h3 className="text-slate-700 text-xs font-semibold mb-2 px-1">数据同步</h3>
            <button onClick={syncToBackend} disabled={backendAuthLoading} className="w-full text-left px-4 py-3 rounded-xl bg-white/40 hover:bg-white/60 transition flex items-center justify-between group">
              <span className="text-slate-600 text-sm">同步到服务器</span>
              <RefreshCw size={14} className={`text-blue-500 group-hover:rotate-180 transition-transform ${backendAuthLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={syncFromBackend} disabled={backendAuthLoading} className="w-full text-left px-4 py-3 rounded-xl bg-white/40 hover:bg-white/60 transition flex items-center justify-between group">
              <span className="text-slate-600 text-sm">从服务器同步</span>
              <RefreshCw size={14} className={`text-blue-500 group-hover:rotate-180 transition-transform ${backendAuthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </>
      ) : user ? (
        <>
          <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-lg text-white font-bold text-xl">
              {user.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-semibold text-base truncate">{user.email}</p>
              <p className="text-slate-400 text-xs mt-0.5">已登录并开启云同步</p>
            </div>
            <button onClick={signOut} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition">
              退出
            </button>
          </div>

          <div className="glass rounded-2xl p-4 mb-6 space-y-2">
            <h3 className="text-slate-700 text-xs font-semibold mb-2 px-1">数据同步</h3>
            <button onClick={syncFavoritesToCloud} className="w-full text-left px-4 py-3 rounded-xl bg-white/40 hover:bg-white/60 transition flex items-center justify-between group">
              <span className="text-slate-600 text-sm">同步喜欢的歌曲</span>
              <RefreshCw size={14} className="text-blue-500 group-hover:rotate-180 transition-transform" />
            </button>
            <button onClick={syncPlaylistsToCloud} className="w-full text-left px-4 py-3 rounded-xl bg-white/40 hover:bg-white/60 transition flex items-center justify-between group">
              <span className="text-slate-600 text-sm">同步我的歌单</span>
              <RefreshCw size={14} className="text-blue-500 group-hover:rotate-180 transition-transform" />
            </button>
          </div>
        </>
      ) : (
        <div className="glass-strong rounded-3xl p-6 shadow-xl shadow-blue-200/30 mb-6">
          <div className="text-center mb-5">
            <h2 className="text-slate-800 font-bold text-lg">{isLogin ? '登录账号' : '注册账号'}</h2>
            <p className="text-slate-400 text-[10px] mt-1">云端同步收藏与歌单</p>
          </div>
          {authError && (
            <div className="bg-red-50 text-red-500 text-[10px] p-2 rounded-xl mb-4 text-center">
              {authError}
            </div>
          )}
          <div className="space-y-3 mb-5">
            <input type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/60 rounded-xl py-2.5 px-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
            <input type="password" placeholder="密码 (至少6位)" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/60 rounded-xl py-2.5 px-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
          </div>
          <button onClick={() => isLogin ? signIn(email, password) : signUp(email, password)} disabled={authLoading || !email || !password}
            className="w-full py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm disabled:opacity-50 hover:bg-blue-600 transition flex justify-center items-center gap-2 mb-3">
            {authLoading && <Loader2 size={14} className="animate-spin" />}
            {isLogin ? '登 录' : '注 册'}
          </button>
          <div className="text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-blue-500 text-xs hover:underline">
              {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-slate-800 font-bold text-xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircle2 size={24} className="text-blue-500" /> 我的音乐
        </div>
        <button onClick={() => setView('settings')} className="text-slate-400 hover:text-blue-500">
          <Settings size={20} />
        </button>
      </h2>
      <MyContent />
    </div>
  );
}

// ─── History ───
function HistoryPage() {
  const { playHistory, setView } = useStore();
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('me')} className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-slate-500 hover:bg-white/80 transition">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div>
          <h2 className="text-slate-800 font-bold text-xl">播放历史</h2>
          <p className="text-slate-400 text-sm">{playHistory.length} 首歌曲</p>
        </div>
      </div>
      {playHistory.length === 0 ? (
        <div className="text-center py-20">
          <Zap size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">还没有播放过歌曲</p>
        </div>
      ) : <SongList songs={playHistory} />}
    </div>
  );
}

// ─── Settings ───
function SettingsPage() {
  const { apiStatus, apiEndpoint, setCustomApi, initApi, queue, clearQueue, probeLogs } = useStore();
  const [inputUrl, setInputUrl] = useState(localStorage.getItem('sky_api_ep') || '');
  const [showLogs, setShowLogs] = useState(false);
  const presets = [
    { url: 'https://api.music.areschang.top', label: 'AresChang (推荐)', tag: '推荐' },
    { url: 'http://iwenwiki.com:3000', label: 'iWenWiki', tag: '需代理' },
    { url: 'https://netease-cloud-music-api-five-roan.vercel.app', label: 'Vercel #1' },
    { url: 'https://neteasecloudmusicapi.vercel.app', label: 'Vercel #2' },
    { url: 'https://cloud-music-api-rust.vercel.app', label: 'Vercel #3' },
    { url: 'https://music-api.heheda.top', label: 'Heheda' },
    { url: 'https://netease-cloud-music-api-mauve-mu.vercel.app', label: 'Vercel #4' },
    { url: 'https://netease-cloud-music-api-orpin.vercel.app', label: 'Vercel #5' },
  ];
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl animate-fade-in">
      <h2 className="text-slate-800 font-bold text-xl mb-1 flex items-center gap-2">
        <Settings size={20} className="text-blue-500" />设置
      </h2>
      <p className="text-slate-400 text-sm mb-6">配置API和管理播放列表</p>

      {/* Status Card */}
      <div className={`glass rounded-2xl p-4 mb-5 ${apiStatus === 'ok' ? 'border-green-200/60' : apiStatus === 'error' ? 'border-red-200/60' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${apiStatus === 'ok' ? 'bg-green-400' : apiStatus === 'error' ? 'bg-red-400' : apiStatus === 'checking' ? 'bg-blue-400 animate-pulse' : 'bg-slate-300'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${apiStatus === 'ok' ? 'text-green-600' : apiStatus === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
              {apiStatus === 'ok' ? '已连接' : apiStatus === 'error' ? '连接失败' : apiStatus === 'checking' ? '正在探测...' : '未检测'}
            </p>
            {apiEndpoint && <p className="text-slate-400 text-xs truncate mt-0.5">{apiEndpoint}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {probeLogs.length > 0 && (
              <button onClick={() => setShowLogs(!showLogs)} className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs">
                日志
              </button>
            )}
            {apiStatus !== 'checking' && (
              <button onClick={initApi} className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-500 text-xs flex items-center gap-1">
                <RefreshCw size={11} />重试
              </button>
            )}
          </div>
        </div>
        {/* Checking progress */}
        {apiStatus === 'checking' && (
          <div className="mt-3 flex items-center gap-2">
            <Loader2 size={12} className="text-blue-500 animate-spin" />
            <p className="text-blue-500 text-xs">正在检测多个API端点，请稍候...</p>
          </div>
        )}
      </div>

      {/* Probe Logs */}
      {showLogs && probeLogs.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-5 max-h-48 overflow-y-auto custom-scrollbar">
          <p className="text-slate-600 text-xs font-semibold mb-2">探测日志</p>
          {probeLogs.map((l, i) => (
            <p key={i} className={`text-[11px] font-mono py-0.5 ${l.includes('✅') ? 'text-green-600' : l.includes('❌') ? 'text-red-400' : 'text-slate-400'}`}>{l}</p>
          ))}
        </div>
      )}

      {/* Custom API Input */}
      <div className="mb-5">
        <label className="text-slate-700 text-sm font-medium mb-2 block">自定义API地址</label>
        <div className="flex gap-2">
          <input type="text" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setCustomApi(inputUrl)}
            placeholder="https://your-api.vercel.app"
            className="flex-1 glass rounded-2xl py-2.5 px-4 text-slate-700 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300/50" />
          <button onClick={() => setCustomApi(inputUrl)} disabled={!inputUrl.trim() || apiStatus === 'checking'}
            className="px-4 bg-blue-500 text-white rounded-2xl text-sm hover:bg-blue-600 transition disabled:opacity-40 flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
            {apiStatus === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}测试
          </button>
        </div>
        <p className="text-slate-400 text-[10px] mt-1.5 px-1">HTTP地址（如 iwenwiki.com）会自动通过CORS代理访问</p>
      </div>

      {/* Preset Endpoints */}
      <div className="mb-5">
        <label className="text-slate-700 text-sm font-medium mb-2 block">可用API端点</label>
        <div className="space-y-1.5">
          {presets.map(({ url, label, tag }) => {
            const isActive = apiEndpoint.includes(url.replace('https://', '').replace('http://', ''));
            return (
              <button key={url} onClick={() => { setInputUrl(url); setCustomApi(url); }}
                disabled={apiStatus === 'checking'}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition glass disabled:opacity-40 ${
                  isActive ? 'border-blue-300/60 bg-blue-50/60' : 'hover:bg-white/60'
                }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-700 text-sm font-medium">{label}</p>
                    {tag && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        tag === '推荐' ? 'bg-blue-100 text-blue-500' : 'bg-amber-100 text-amber-600'
                      }`}>{tag}</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] truncate mt-0.5">{url}</p>
                </div>
                {isActive && <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="glass rounded-2xl p-4 mb-5 border-blue-200/40">
        <h3 className="text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">
          <Zap size={14} className="text-blue-500" />播放策略
        </h3>
        <div className="text-slate-500 text-xs space-y-1">
          <p>• 自动探测多个API端点，选择最快可用的</p>
          <p>• HTTP端点自动通过CORS代理访问</p>
          <p>• 附带realIP参数绕过地域限制</p>
          <p>• 播放URL多端点并行获取，提高成功率</p>
          <p>• 失败自动跳到下一首</p>
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-700 text-sm font-medium">播放队列 ({queue.length})</p>
            <button onClick={clearQueue} className="text-red-400 text-xs flex items-center gap-1">
              <Trash2 size={11} />清空
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
            {queue.map(s => (
              <p key={s.id} className="text-slate-500 text-xs truncate py-1">{s.name} - {s.artist}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add to Playlist Modal ───
function PlaylistModal() {
  const { showPlaylistModal, closePlaylistModal, modalSong, userPlaylists, addToPlaylist, createPlaylist } = useStore();
  const [newName, setNewName] = useState('');
  if (!showPlaylistModal || !modalSong) return null;
  const handleCreate = () => {
    if (newName.trim()) {
      createPlaylist(newName.trim());
      setNewName('');
    }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={closePlaylistModal}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative w-full sm:w-96 max-h-[70vh] glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
        <h3 className="text-slate-800 font-bold text-lg mb-1">添加到歌单</h3>
        <p className="text-slate-400 text-xs mb-4 truncate">{modalSong.name} - {modalSong.artist}</p>

        <div className="flex gap-2 mb-4">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="新建歌单..." className="flex-1 bg-white/50 rounded-xl py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300/50" />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="px-3 bg-blue-500 text-white rounded-xl text-sm disabled:opacity-40">
            <Plus size={16} />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1.5">
          {userPlaylists.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">暂无歌单，请先新建</p>
          ) : userPlaylists.map(pl => {
            const exists = pl.songs.some(s => s.id === modalSong.id);
            return (
              <button key={pl.id} onClick={() => !exists && addToPlaylist(pl.id, modalSong)}
                disabled={exists}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${exists ? 'opacity-50' : 'hover:bg-white/40 active:scale-[0.99]'}`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-200 to-sky-200 flex items-center justify-center flex-shrink-0">
                  <Music size={12} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-slate-400 text-[10px]">{pl.songs.length} 首</p>
                </div>
                {exists && <span className="text-slate-400 text-[10px]">已添加</span>}
              </button>
            );
          })}
        </div>

        <button onClick={closePlaylistModal}
          className="mt-4 w-full py-2.5 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium">取消</button>
      </div>
    </div>
  );
}

// ─── Sidebar ───
function Sidebar() {
  const { currentView, setView, queue, apiStatus, likedSongs, userPlaylists } = useStore();
  const navItems = [
    { id: 'home' as const, icon: Home, label: '发现' },
    { id: 'search' as const, icon: Search, label: '搜索' },
    { id: 'liked' as const, icon: Heart, label: '喜欢', badge: likedSongs.length || undefined },
    { id: 'playlists' as const, icon: FolderPlus, label: '歌单', badge: userPlaylists.length || undefined },
    { id: 'me' as const, icon: UserCircle2, label: '我的' },
    { id: 'settings' as const, icon: Settings, label: '设置', dot: apiStatus === 'error' },
  ];
  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-60 glass-sidebar flex-shrink-0">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-400/30">
          <Music size={18} className="text-white" />
        </div>
        <div>
          <span className="text-slate-800 font-extrabold text-lg tracking-tight">SkyMusic</span>
          <p className="text-slate-400 text-[10px] -mt-0.5">天空音乐</p>
        </div>
      </div>
      <div className="px-5 mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]">
          <div className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'ok' ? 'bg-green-400' : apiStatus === 'error' ? 'bg-red-400 animate-pulse' : 'bg-slate-300'}`} />
          <span className={`${apiStatus === 'ok' ? 'text-green-500' : apiStatus === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
            {apiStatus === 'ok' ? 'API 正常' : apiStatus === 'error' ? 'API 异常' : '检测中...'}
          </span>
        </div>
      </div>
      <nav className="px-3 space-y-0.5">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${
              currentView === item.id
                ? 'bg-blue-500/10 text-blue-600 font-semibold shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
            }`}>
            <item.icon size={17} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && <span className="text-[10px] bg-blue-100 text-blue-500 rounded-full px-1.5 py-0.5">{item.badge}</span>}
            {'dot' in item && item.dot && <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
          </button>
        ))}
      </nav>
      {queue.length > 0 && (
        <div className="mt-5 px-3 flex-1 min-h-0 flex flex-col">
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-medium px-3 mb-2">播放队列</p>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
            {queue.slice(0, 15).map(song => {
              const active = useStore.getState().currentSong?.id === song.id;
              return (
                <button key={song.id} onClick={() => useStore.getState().playSong(song)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs truncate transition ${
                    active ? 'text-blue-500 bg-blue-50 font-medium' : 'text-slate-500 hover:bg-white/30'
                  }`}>{song.name}</button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Mobile Nav ───
function MobileNav() {
  const { currentView, setView, setPlayMode, playSong, hotSongs, setShowFullPlayer, currentSong, isPlaying } = useStore();
  
  const handleMusicClick = () => {
    setPlayMode('random');
    if (!currentSong) {
      if (hotSongs.length > 0) {
        const randomSong = hotSongs[Math.floor(Math.random() * hotSongs.length)];
        playSong(randomSong, hotSongs);
      }
    }
    setShowFullPlayer(true);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom rounded-t-[2rem] shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-3xl border-t border-white/50 flex pb-1">
      <button onClick={() => setView('home')}
        className={`flex-1 flex flex-col items-center py-3 transition relative ${
          currentView === 'home' ? 'text-blue-500' : 'text-slate-500'
        }`}>
        {currentView === 'home' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-blue-500 rounded-full" />}
        <Home size={22} className="mb-1" />
        <span className="text-[11px] font-medium">发现</span>
      </button>

      <div className="flex-1 flex justify-center -mt-6">
        <button onClick={handleMusicClick}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_10px_20px_rgba(59,130,246,0.4)] flex items-center justify-center text-white border-4 border-white/80 backdrop-blur-md active:scale-95 transition-transform relative">
          {isPlaying && (
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring" />
          )}
          <Music size={26} className="relative z-10 ml-0.5" />
        </button>
      </div>

      <button onClick={() => setView('me')}
        className={`flex-1 flex flex-col items-center py-3 transition relative ${
          currentView === 'me' ? 'text-blue-500' : 'text-slate-500'
        }`}>
        {currentView === 'me' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-blue-500 rounded-full" />}
        <UserCircle2 size={22} className="mb-1" />
        <span className="text-[11px] font-medium">我的</span>
      </button>
    </nav>
  );
}

// ─── Toast ───
function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-toast-in">
      <div className="glass-strong text-slate-700 text-sm px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap max-w-[90vw] truncate">
        {toast}
      </div>
    </div>
  );
}

// ─── App ───
export default function App() {
  const { currentView, initAudio, initApi, currentSong, loadSession, loadBackendSession } = useStore();
  useEffect(() => { initAudio(); initApi(); loadSession(); loadBackendSession(); }, [initAudio, initApi, loadSession, loadBackendSession]);
  const renderPage = () => {
    switch (currentView) {
      case 'search': return <SearchPage />;
      case 'liked': return <LikedPage />;
      case 'playlists': return <PlaylistsPage />;
      case 'settings': return <SettingsPage />;
      case 'history': return <HistoryPage />;
      case 'me': return <MePage />;
      default: return <HomePage />;
    }
  };
  const hasPlayer = !!currentSong;
  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 text-slate-800">
      <div className="flex h-full">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto custom-scrollbar ${hasPlayer ? 'pb-[140px] md:pb-[84px]' : 'pb-[80px] md:pb-0'}`}>
          {renderPage()}
        </main>
      </div>
      <PlayerBar />
      <MobileNav />
      <PlaylistModal />
      <Toast />
    </div>
  );
}
