import { create } from 'zustand';
import { supabase, hasSupabaseConfig, type SupabaseUser } from './supabaseClient';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════
export interface Song {
  id: number; name: string; artist: string; album: string; cover: string; duration: number;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}
export interface Playlist { id: string; name: string; songs: Song[]; createdAt: number; }
export interface HotSearch { searchWord: string; score: number; }
export interface RecPlaylist { id: number; name: string; picUrl: string; playCount: number; }

// ═══════════════════════════════════════════
// API Configuration
// ═══════════════════════════════════════════
const API_ENDPOINTS = [
  'https://api.music.areschang.top',
  'https://neteasecloudmusicapi.vercel.app',
  'https://netease-cloud-music-api-five-roan.vercel.app',
  'https://cloud-music-api-rust.vercel.app',
  'https://netease-cloud-music-api-mauve-mu.vercel.app',
  'https://netease-cloud-music-api-orpin.vercel.app',
  'https://music-api.heheda.top',
  'https://netease-cloud-music-api-eta-five.vercel.app',
  'http://iwenwiki.com:3000',
];

const REAL_IP = '116.25.146.177';

// Runtime
let workingEndpoint = '';
let proxyForEndpoint: string | null = null;
let allVerified: { ep: string; proxy: string | null }[] = [];
const logs: string[] = [];

function log(msg: string) {
  const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  logs.push(`[${t}] ${msg}`);
  console.log(`[SkyMusic] ${msg}`);
}

// ═══════════════════════════════════════════
// Network — Simplified & Robust
// ═══════════════════════════════════════════
async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    return r;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

function isHttpEndpoint(ep: string) {
  return ep.startsWith('http:') && window.location.protocol === 'https:';
}

// Build proxy URL — only use simple, reliable proxies
function makeProxyUrl(rawUrl: string, proxyBase: string): string {
  return `${proxyBase}${encodeURIComponent(rawUrl)}`;
}

const PROXY_PREFIXES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

function makeUrl(ep: string, path: string, proxy: string | null): string {
  const raw = `${ep}${path}`;
  if (proxy) return makeProxyUrl(raw, proxy);
  if (isHttpEndpoint(ep)) return makeProxyUrl(raw, PROXY_PREFIXES[0]);
  return raw;
}

// ═══════════════════════════════════════════
// API Detection
// ═══════════════════════════════════════════

// Quick single probe — returns JSON or null
async function quickProbe(url: string, timeout = 5000): Promise<any> {
  try {
    const r = await fetchWithTimeout(url, timeout);
    if (!r.ok) return null;
    const j = await r.json();
    return j;
  } catch {
    return null;
  }
}

// Probe one endpoint (try direct, then with proxies)
async function probeOne(ep: string): Promise<{ ok: boolean; proxy: string | null }> {
  const ts = `&_t=${Date.now()}`;
  const testPaths = [
    `/search?keywords=hello&limit=1${ts}`,
    `/search/hot${ts.replace('&','?')}`,
  ];

  // 1) Direct (skip if HTTP on HTTPS page)
  if (!isHttpEndpoint(ep)) {
    for (const p of testPaths) {
      const url = `${ep}${p}`;
      log(`直连测试 ${ep}...`);
      const d = await quickProbe(url, 5000);
      if (d && (d.code === 200 || d.result || d.data)) {
        log(`✅ ${ep} 直连成功`);
        return { ok: true, proxy: null };
      }
    }
    log(`❌ ${ep} 直连失败`);
  }

  // 2) Via proxies
  for (const px of PROXY_PREFIXES) {
    const pxName = new URL(px.replace('?url=', '').replace('?quest=', '')).hostname;
    for (const p of testPaths.slice(0, 1)) {
      const raw = `${ep}${p}`;
      const url = makeProxyUrl(raw, px);
      log(`代理测试 ${ep} via ${pxName}...`);
      const d = await quickProbe(url, 8000);
      if (d && (d.code === 200 || d.result || d.data)) {
        log(`✅ ${ep} 通过 ${pxName} 成功`);
        return { ok: true, proxy: px };
      }
    }
  }

  log(`❌ ${ep} 全部失败`);
  return { ok: false, proxy: null };
}

async function detectApi(): Promise<boolean> {
  logs.length = 0;
  allVerified = [];
  log('开始探测API...');

  // Phase 1: Try saved endpoint
  const saved = localStorage.getItem('sky_api_ep');
  const savedProxy = localStorage.getItem('sky_api_px');
  if (saved) {
    log(`尝试上次成功: ${saved}`);
    // Quick re-verify
    const ts = Date.now();
    const testUrl = makeUrl(saved, `/search?keywords=test&limit=1&_t=${ts}`, savedProxy || null);
    const d = await quickProbe(testUrl, 5000);
    if (d && (d.code === 200 || d.result)) {
      workingEndpoint = saved;
      proxyForEndpoint = savedProxy || null;
      allVerified.push({ ep: saved, proxy: proxyForEndpoint });
      log(`✅ 使用已保存: ${saved}`);
      bgProbe(saved);
      return true;
    }
    log(`❌ 已保存端点失效`);
  }

  // Phase 2: Try priority endpoints one by one
  const priority = ['https://api.music.areschang.top'];
  for (const ep of priority) {
    const r = await probeOne(ep);
    if (r.ok) {
      workingEndpoint = ep;
      proxyForEndpoint = r.proxy;
      allVerified.push({ ep, proxy: r.proxy });
      saveEndpoint(ep, r.proxy);
      bgProbe(ep);
      return true;
    }
  }

  // Phase 3: Parallel batch probe remaining
  const rest = API_ENDPOINTS.filter(e => !priority.includes(e) && e !== saved);
  // Batch of 4
  for (let i = 0; i < rest.length; i += 4) {
    const batch = rest.slice(i, i + 4);
    log(`批量探测 ${batch.length} 个端点...`);
    const results = await Promise.allSettled(
      batch.map(async (ep) => {
        const r = await probeOne(ep);
        if (r.ok) return { ep, proxy: r.proxy };
        throw new Error('fail');
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        allVerified.push({ ep: r.value.ep, proxy: r.value.proxy });
        if (!workingEndpoint) {
          workingEndpoint = r.value.ep;
          proxyForEndpoint = r.value.proxy;
          saveEndpoint(r.value.ep, r.value.proxy);
          log(`✅ 使用: ${r.value.ep}`);
          bgProbe(r.value.ep);
          return true;
        }
      }
    }
  }

  log('❌ 所有API均不可用');
  return false;
}

function saveEndpoint(ep: string, proxy: string | null) {
  localStorage.setItem('sky_api_ep', ep);
  if (proxy) localStorage.setItem('sky_api_px', proxy);
  else localStorage.removeItem('sky_api_px');
}

async function bgProbe(exclude: string) {
  for (const ep of API_ENDPOINTS) {
    if (ep === exclude || allVerified.some(v => v.ep === ep)) continue;
    const r = await probeOne(ep);
    if (r.ok) allVerified.push({ ep, proxy: r.proxy });
  }
  log(`后台探测完成, ${allVerified.length} 个可用`);
}

// ═══════════════════════════════════════════
// API Fetch
// ═══════════════════════════════════════════
async function apiFetch(path: string, timeout = 10000): Promise<any> {
  if (!workingEndpoint) throw new Error('No API');
  const url = makeUrl(workingEndpoint, path, proxyForEndpoint);
  const r = await fetchWithTimeout(url, timeout);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function parseSong(r: any): Song {
  return {
    id: r.id,
    name: r.name || '未知歌曲',
    artist: (r.ar || r.artists || []).map((a: any) => a.name).join(' / ') || '未知',
    album: r.al?.name || r.album?.name || '',
    cover: r.al?.picUrl || r.album?.picUrl || r.album?.blurPicUrl || '',
    duration: r.dt || r.duration || 0,
  };
}

function loadJSON<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(key: string, val: any) { localStorage.setItem(key, JSON.stringify(val)); }

// ═══════════════════════════════════════════
// Audio
// ═══════════════════════════════════════════
const audio = typeof window !== 'undefined' ? new Audio() : null;
if (audio) { audio.crossOrigin = 'anonymous'; audio.preload = 'auto'; }

// ═══════════════════════════════════════════
// Play URL Resolution — multi-endpoint parallel
// ═══════════════════════════════════════════

async function getUrlFrom(ep: string, proxy: string | null, id: number): Promise<string | null> {
  const ip = `&realIP=${REAL_IP}`;
  // v1 API
  for (const lv of ['standard', 'higher', 'exhigh']) {
    try {
      const url = makeUrl(ep, `/song/url/v1?id=${id}&level=${lv}${ip}`, proxy);
      const r = await fetchWithTimeout(url, 6000);
      if (!r.ok) continue;
      const d = await r.json();
      const u = d?.data?.[0]?.url;
      if (u) return window.location.protocol === 'https:' ? u.replace(/^http:\/\//, 'https://') : u;
    } catch { }
  }
  // Old API
  for (const br of [128000, 320000]) {
    try {
      const url = makeUrl(ep, `/song/url?id=${id}&br=${br}${ip}`, proxy);
      const r = await fetchWithTimeout(url, 6000);
      if (!r.ok) continue;
      const d = await r.json();
      const u = d?.data?.[0]?.url;
      if (u) return window.location.protocol === 'https:' ? u.replace(/^http:\/\//, 'https://') : u;
    } catch { }
  }
  return null;
}

function parseLrc(raw: string): LyricLine[] {
  const lines = raw.split(/\r?\n/);
  const res: LyricLine[] = [];
  const timeTag = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?\]/;
  for (const line of lines) {
    const m = line.match(timeTag);
    if (!m) continue;
    const min = parseInt(m[1], 10) || 0;
    const sec = parseInt(m[2], 10) || 0;
    const ms = m[3] ? parseInt(m[3], 10) * 10 : 0;
    const text = line.replace(timeTag, '').trim();
    if (!text) continue;
    res.push({ time: min * 60 + sec + ms / 1000, text });
  }
  return res.sort((a, b) => a.time - b.time);
}

async function resolvePlayUrl(song: Song): Promise<{ url: string | null; source: string }> {
  const id = song.id;

  // 1) Primary endpoint
  if (workingEndpoint) {
    const u = await getUrlFrom(workingEndpoint, proxyForEndpoint, id);
    if (u) return { url: u, source: '主源' };
  }

  // 2) Other verified endpoints in parallel
  const others = allVerified.filter(v => v.ep !== workingEndpoint).slice(0, 3);
  if (others.length > 0) {
    const results = await Promise.allSettled(
      others.map(v => getUrlFrom(v.ep, v.proxy, id))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) return { url: r.value, source: '备用源' };
    }
  }

  // 3) Direct link (163)
  const direct = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  return { url: direct, source: '直链' };
}

// ═══════════════════════════════════════════
// Store
// ═══════════════════════════════════════════
interface Store {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  searchResults: Song[];
  hotSongs: Song[];
  recommendations: RecPlaylist[];
  hotSearches: HotSearch[];
  currentView: 'home' | 'search' | 'liked' | 'playlists' | 'settings' | 'me' | 'history';
  searchQuery: string;
  loading: boolean;
  searchLoading: boolean;
  showFullPlayer: boolean;
  initialized: boolean;
  toast: string;
  apiStatus: 'idle' | 'checking' | 'ok' | 'error';
  apiEndpoint: string;
  errorMsg: string;
  likedSongs: Song[];
  userPlaylists: Playlist[];
  showPlaylistModal: boolean;
  modalSong: Song | null;
  recommendedSongs: Song[];
  swipeDirection: 'up' | 'down' | null;
  playError: string;
  playSource: string;
  probeLogs: string[];

  // Play Mode & History
  playMode: 'sequence' | 'random' | 'single';
  togglePlayMode: () => void;
  playHistory: Song[];

  // Lyrics
  lyrics: LyricLine[];
  currentLyricIndex: number;
  showLyricsView: boolean;
  setShowLyricsView: (show: boolean) => void;

  // Auth / user
  user: SupabaseUser | null;
  authLoading: boolean;
  authError: string;

  initAudio: () => void;
  initApi: () => Promise<void>;
  setCustomApi: (url: string) => Promise<void>;
  playSong: (song: Song, list?: Song[]) => Promise<void>;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setVolume: (v: number) => void;
  seekTo: (t: number) => void;
  search: (q: string) => Promise<void>;
  fetchHotSongs: () => Promise<void>;
  fetchRecommendations: () => Promise<void>;
  fetchHotSearches: () => Promise<void>;
  setView: (v: Store['currentView']) => void;
  setShowFullPlayer: (s: boolean) => void;
  showToast: (m: string) => void;
  toggleLike: (song: Song) => void;
  isLiked: (id: number) => boolean;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: number) => void;
  deletePlaylist: (id: string) => void;
  openPlaylistModal: (song: Song) => void;
  closePlaylistModal: () => void;
  fetchSimilar: (song: Song) => Promise<void>;
  setSwipeDirection: (d: 'up' | 'down' | null) => void;
  clearQueue: () => void;
  setPlayMode: (mode: 'sequence' | 'random' | 'single') => void;

  // Auth
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;

  // Cloud sync (noop if no Supabase)
  syncFavoritesToCloud: () => Promise<void>;
  syncPlaylistsToCloud: () => Promise<void>;
}

let skipCount = 0;

export const useStore = create<Store>((set, get) => ({
  currentSong: null, queue: [], isPlaying: false, volume: 0.7,
  currentTime: 0, duration: 0, searchResults: [], hotSongs: [],
  recommendations: [], hotSearches: [], currentView: 'home',
  searchQuery: '', loading: false, searchLoading: false,
  showFullPlayer: false, initialized: false, toast: '',
  apiStatus: 'idle', apiEndpoint: '', errorMsg: '',
  likedSongs: loadJSON<Song[]>('sky_liked', []),
  userPlaylists: loadJSON<Playlist[]>('sky_playlists', []),
  showPlaylistModal: false, modalSong: null,
  recommendedSongs: [], swipeDirection: null,
  playError: '', playSource: '', probeLogs: [],
  playMode: 'sequence', playHistory: loadJSON<Song[]>('sky_history', []),
  togglePlayMode: () => {
    const modes: ('sequence' | 'random' | 'single')[] = ['sequence', 'random', 'single'];
    const current = get().playMode;
    const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ playMode: nextMode });
    get().showToast(`已切换至${nextMode === 'random' ? '随机播放' : nextMode === 'single' ? '单曲循环' : '顺序播放'}`);
  },
  lyrics: [], currentLyricIndex: 0, showLyricsView: false, setShowLyricsView: (s) => set({ showLyricsView: s }),
  user: null, authLoading: false, authError: '',

  initApi: async () => {
    set({ apiStatus: 'checking', probeLogs: [] });
    const interval = setInterval(() => set({ probeLogs: [...logs] }), 400);

    const ok = await detectApi();
    clearInterval(interval);
    set({ probeLogs: [...logs] });

    if (ok && workingEndpoint) {
      const label = proxyForEndpoint ? `${workingEndpoint} (代理)` : workingEndpoint;
      set({ apiStatus: 'ok', apiEndpoint: label });
      get().fetchHotSearches();
      get().fetchHotSongs();
      get().fetchRecommendations();
    } else {
      set({
        apiStatus: 'error',
        apiEndpoint: '',
        errorMsg: '所有API均不可用',
        hotSearches: [
          { searchWord: '周杰伦', score: 100 }, { searchWord: '林俊杰', score: 90 },
          { searchWord: '薛之谦', score: 85 }, { searchWord: '邓紫棋', score: 80 },
          { searchWord: '陈奕迅', score: 75 }, { searchWord: '五月天', score: 70 },
          { searchWord: '毛不易', score: 65 }, { searchWord: '许嵩', score: 60 },
        ],
      });
    }
  },

  setCustomApi: async (url: string) => {
    const u = url.trim().replace(/\/+$/, '');
    if (!u) return;
    set({ apiStatus: 'checking' });
    log(`手动测试: ${u}`);
    const r = await probeOne(u);
    set({ probeLogs: [...logs] });
    if (r.ok) {
      workingEndpoint = u;
      proxyForEndpoint = r.proxy;
      saveEndpoint(u, r.proxy);
      if (!allVerified.some(v => v.ep === u)) allVerified.unshift({ ep: u, proxy: r.proxy });
      set({ apiStatus: 'ok', apiEndpoint: r.proxy ? `${u} (代理)` : u });
      get().showToast('✅ API连接成功');
      get().fetchHotSearches();
      get().fetchHotSongs();
      get().fetchRecommendations();
    } else {
      set({ apiStatus: 'error', errorMsg: `无法连接 ${u}` });
      get().showToast('❌ 连接失败');
    }
  },

  initAudio: () => {
    if (!audio || get().initialized) return;
    audio.addEventListener('timeupdate', () => {
      const t = audio.currentTime;
      const state = get();
      let idx = state.currentLyricIndex;
      if (state.lyrics.length > 0) {
        while (idx + 1 < state.lyrics.length && state.lyrics[idx + 1].time <= t + 0.15) idx++;
        while (idx > 0 && state.lyrics[idx].time > t + 0.25) idx--;
      }
      set({ currentTime: t, currentLyricIndex: idx });
    });
    audio.addEventListener('loadedmetadata', () => set({ duration: audio.duration }));
    audio.addEventListener('ended', () => { skipCount = 0; get().nextSong(); });
    audio.addEventListener('play', () => set({ isPlaying: true, playError: '' }));
    audio.addEventListener('pause', () => set({ isPlaying: false }));
    audio.addEventListener('canplay', () => set({ loading: false }));
    audio.addEventListener('error', () => {
      const s = get().currentSong;
      if (!s) return;
      set({ isPlaying: false, loading: false, playError: '播放失败' });
      skipCount++;
      if (skipCount < 5 && get().queue.length > 1) {
        get().showToast(`⚠️「${s.name}」无法播放`);
        setTimeout(() => get().nextSong(), 600);
      } else if (skipCount >= 5) {
        get().showToast('连续多首无法播放');
        skipCount = 0;
      }
    });
    audio.volume = 0.7;
    set({ initialized: true });
  },

  playSong: async (song, list) => {
    if (!audio) return;
    if (!workingEndpoint) {
      get().showToast('请先配置API');
      set({ currentView: 'settings' });
      return;
    }
    skipCount = 0;
    set({ currentSong: song, loading: true, playError: '', playSource: '' });
    if (list?.length) set({ queue: list });
    else {
      const q = get().queue;
      if (!q.find(s => s.id === song.id)) set({ queue: [...q, song] });
    }

    // Add to history
    const history = get().playHistory.filter(s => s.id !== song.id);
    const newHistory = [song, ...history].slice(0, 100);
    set({ playHistory: newHistory });
    saveJSON('sky_history', newHistory);

    try {
      const res = await resolvePlayUrl(song);
      if (!res.url) {
        set({ loading: false, playError: '无可用音源' });
        get().showToast(`⚠️ 暂无音源`);
        skipCount++;
        if (skipCount < 5 && get().queue.length > 1) setTimeout(() => get().nextSong(), 800);
        return;
      }
      if (get().currentSong?.id !== song.id) return;
      set({ playSource: res.source });
      audio.src = res.url;
      try {
        await audio.play();
        set({ isPlaying: true, loading: false });
      } catch (e: any) {
        if (e?.name === 'NotAllowedError') {
          set({ loading: false });
          get().showToast('请点击播放按钮');
        } else { set({ loading: false }); }
        return;
      }
      // bg: fetch lyrics
      try {
        const d = await apiFetch(`/lyric?id=${song.id}`);
        const raw = d?.lrc?.lyric || d?.klyric?.lyric || '';
        if (raw && get().currentSong?.id === song.id) {
          const parsed = parseLrc(raw);
          set({ lyrics: parsed, currentLyricIndex: 0 });
        } else {
          set({ lyrics: [], currentLyricIndex: 0 });
        }
      } catch {
        set({ lyrics: [], currentLyricIndex: 0 });
      }

      // bg: fetch cover
      if (!song.cover) {
        try {
          const d = await apiFetch(`/song/detail?ids=${song.id}`);
          const c = d?.songs?.[0]?.al?.picUrl;
          if (c && get().currentSong?.id === song.id) {
            const u = { ...song, cover: c };
            set(s => ({
              currentSong: s.currentSong?.id === song.id ? u : s.currentSong,
              queue: s.queue.map(x => x.id === song.id ? { ...x, cover: c } : x),
            }));
          }
        } catch { }
      }
      get().fetchSimilar(song);
    } catch {
      set({ loading: false, playError: '播放出错' });
      skipCount++;
      if (skipCount < 5 && get().queue.length > 1) {
        get().showToast('⚠️ 播放出错');
        setTimeout(() => get().nextSong(), 800);
      }
    }
  },

  togglePlay: () => {
    if (!audio || !get().currentSong) return;
    if (get().isPlaying) audio.pause();
    else audio.play().catch(() => { });
  },

  nextSong: () => {
    const { queue, currentSong, recommendedSongs, playMode } = get();
    const all = [...queue, ...recommendedSongs.filter(r => !queue.find(q => q.id === r.id))];
    if (!all.length) return;
    
    let next: Song | undefined;
    if (playMode === 'single' && currentSong) {
      next = currentSong;
    } else if (playMode === 'random' && all.length > 1) {
      const others = all.filter(s => s.id !== currentSong?.id);
      next = others[Math.floor(Math.random() * others.length)];
    } else {
      const idx = all.findIndex(s => s.id === currentSong?.id);
      next = all[(idx + 1) % all.length];
    }
    
    if (next) {
      if (next.id === currentSong?.id) {
         if (audio) { audio.currentTime = 0; audio.play(); }
      } else {
         get().playSong(next, all);
      }
    }
  },

  prevSong: () => {
    const { queue, currentSong, playMode } = get();
    if (!queue.length) return;
    
    let prev: Song | undefined;
    if (playMode === 'single' && currentSong) {
      prev = currentSong;
    } else if (playMode === 'random' && queue.length > 1) {
      const others = queue.filter(s => s.id !== currentSong?.id);
      prev = others[Math.floor(Math.random() * others.length)];
    } else {
      const idx = queue.findIndex(s => s.id === currentSong?.id);
      prev = queue[(idx - 1 + queue.length) % queue.length];
    }
    
    if (prev) {
      skipCount = 0;
      if (prev.id === currentSong?.id && audio) {
         audio.currentTime = 0; audio.play();
      } else {
         get().playSong(prev, queue);
      }
    }
  },

  setVolume: (v) => { if (audio) { const vol = Math.max(0, Math.min(1, v)); audio.volume = vol; set({ volume: vol }); } },
  seekTo: (t) => { if (audio && !isNaN(t)) { audio.currentTime = t; set({ currentTime: t }); } },

  search: async (q) => {
    if (!q.trim() || !workingEndpoint) { if (!workingEndpoint) get().showToast('请先配置API'); return; }
    set({ searchQuery: q, searchLoading: true, currentView: 'search', errorMsg: '' });
    let songs: Song[] = [];
    try {
      const d = await apiFetch(`/cloudsearch?keywords=${encodeURIComponent(q)}&limit=50`);
      if (d?.result?.songs?.length) songs = d.result.songs.map(parseSong);
    } catch { }
    if (!songs.length) {
      try {
        const d = await apiFetch(`/search?keywords=${encodeURIComponent(q)}&limit=50`);
        if (d?.result?.songs?.length) songs = d.result.songs.map(parseSong);
      } catch { }
    }
    set({ searchResults: songs, searchLoading: false, errorMsg: songs.length ? '' : '未找到结果' });
  },

  fetchHotSongs: async () => {
    if (!workingEndpoint) return;
    set({ loading: true });
    let songs: Song[] = [];
    try {
      const d = await apiFetch('/personalized/newsong?limit=30');
      if (d?.result?.length) songs = d.result.map((i: any) => parseSong(i.song || i));
    } catch { }
    if (!songs.length) {
      try {
        const d = await apiFetch('/top/song?type=0');
        if (d?.data?.length) songs = d.data.slice(0, 30).map(parseSong);
      } catch { }
    }
    set({ hotSongs: songs, loading: false });
  },

  fetchRecommendations: async () => {
    if (!workingEndpoint) return;
    try {
      const d = await apiFetch('/personalized?limit=12');
      if (d?.result?.length) set({ recommendations: d.result });
    } catch { }
  },

  fetchHotSearches: async () => {
    if (!workingEndpoint) return;
    try {
      const d = await apiFetch('/search/hot/detail');
      if (d?.data?.length) { set({ hotSearches: d.data.slice(0, 12) }); return; }
    } catch { }
    try {
      const d = await apiFetch('/search/hot');
      if (d?.result?.hots?.length) {
        set({ hotSearches: d.result.hots.slice(0, 12).map((h: any, i: number) => ({ searchWord: h.first, score: 100 - i })) });
      }
    } catch { }
  },

  setView: (v) => set({ currentView: v }),
  setShowFullPlayer: (s) => set({ showFullPlayer: s }),
  showToast: (m) => { set({ toast: m }); setTimeout(() => set(s => s.toast === m ? { toast: '' } : s), 3500); },

  toggleLike: (song) => {
    const { likedSongs } = get();
    const ex = likedSongs.find(s => s.id === song.id);
    const next = ex ? likedSongs.filter(s => s.id !== song.id) : [song, ...likedSongs];
    set({ likedSongs: next }); saveJSON('sky_liked', next);
    get().showToast(ex ? '已取消喜欢' : '❤️ 已喜欢');
    if (!ex) get().fetchSimilar(song);
  },
  isLiked: (id) => get().likedSongs.some(s => s.id === id),

  createPlaylist: (name) => {
    const pl: Playlist = { id: Date.now().toString(), name, songs: [], createdAt: Date.now() };
    const next = [...get().userPlaylists, pl];
    set({ userPlaylists: next }); saveJSON('sky_playlists', next);
    get().showToast(`已创建「${name}」`);
  },
  addToPlaylist: (pid, song) => {
    const pls = get().userPlaylists.map(p => {
      if (p.id !== pid || p.songs.find(s => s.id === song.id)) return p;
      return { ...p, songs: [...p.songs, song] };
    });
    set({ userPlaylists: pls, showPlaylistModal: false, modalSong: null });
    saveJSON('sky_playlists', pls);
    get().showToast('已添加到歌单');
  },
  removeFromPlaylist: (pid, sid) => {
    const pls = get().userPlaylists.map(p => p.id === pid ? { ...p, songs: p.songs.filter(s => s.id !== sid) } : p);
    set({ userPlaylists: pls }); saveJSON('sky_playlists', pls);
  },
  deletePlaylist: (id) => {
    const next = get().userPlaylists.filter(p => p.id !== id);
    set({ userPlaylists: next }); saveJSON('sky_playlists', next);
    get().showToast('已删除歌单');
  },
  openPlaylistModal: (song) => set({ showPlaylistModal: true, modalSong: song }),
  closePlaylistModal: () => set({ showPlaylistModal: false, modalSong: null }),

  fetchSimilar: async (song) => {
    if (!workingEndpoint) return;
    try {
      const d = await apiFetch(`/simi/song?id=${song.id}`);
      if (d?.songs?.length) { set({ recommendedSongs: d.songs.map(parseSong) }); return; }
    } catch { }
    const artist = song.artist.split(' / ')[0];
    if (artist && artist !== '未知') {
      try {
        const d = await apiFetch(`/search?keywords=${encodeURIComponent(artist)}&limit=20`);
        if (d?.result?.songs?.length) {
          set({ recommendedSongs: d.result.songs.map(parseSong).filter((s: Song) => s.id !== song.id) });
        }
      } catch { }
    }
  },

  setSwipeDirection: (d) => set({ swipeDirection: d }),
  clearQueue: () => {
    if (audio) { audio.pause(); audio.src = ''; }
    set({ queue: [], currentSong: null, isPlaying: false, currentTime: 0, duration: 0, playError: '', playSource: '' });
  },
  setPlayMode: (mode) => set({ playMode: mode }),

  // Auth implementations (basic email/password, max 10 users)
  signUp: async (email, password) => {
    if (!supabase || !hasSupabaseConfig) {
      get().showToast('\u8fd8\u672a\u914d\u7f6e Supabase');
      return;
    }
    set({ authLoading: true, authError: '' });
    try {
      // 备注：如果这里没有自定义的 users 或 profiles 表，这里可以做个简单的跳过或报错处理
      // 实际上我们这里假设服务端已有对应的 trigger/限制 或者我们仅靠前端拦截做演示
      // 此处为了避免在未建表的情况下报错，我们将直接允许注册，
      // 如果后端需要真正限制10人，请在 Supabase 的 Auth 配置中关闭随意注册或通过 Edge Function 实现。
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      set({ user: data.user ?? null, authLoading: false });
      get().showToast('\u6ce8\u518c\u6210\u529f');
    } catch (e: any) {
      set({ authLoading: false, authError: e?.message || 'Supabase error' });
    }
  },
  signIn: async (email, password) => {
    if (!supabase || !hasSupabaseConfig) {
      get().showToast('\u8fd8\u672a\u914d\u7f6e Supabase');
      return;
    }
    set({ authLoading: true, authError: '' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ user: data.user ?? null, authLoading: false });
      get().showToast('\u767b\u5f55\u6210\u529f');
    } catch (e: any) {
      set({ authLoading: false, authError: e?.message || 'Supabase error' });
    }
  },
  signOut: async () => {
    if (!supabase || !hasSupabaseConfig) {
      set({ user: null });
      return;
    }
    await supabase.auth.signOut();
    set({ user: null });
  },
  loadSession: async () => {
    if (!supabase || !hasSupabaseConfig) return;
    const { data } = await supabase.auth.getUser();
    set({ user: data.user ?? null });
  },
  syncFavoritesToCloud: async () => {
    if (!supabase || !hasSupabaseConfig) return;
    const u = get().user;
    if (!u) return;
    const liked = get().likedSongs;
    await supabase.from('favorites').upsert({ user_id: u.id, data: liked });
  },
  syncPlaylistsToCloud: async () => {
    if (!supabase || !hasSupabaseConfig) return;
    const u = get().user;
    if (!u) return;
    const pls = get().userPlaylists;
    await supabase.from('playlists').upsert({ user_id: u.id, data: pls });
  },
}));

// ═══════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════
export function formatTime(s: number): string {
  if (isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}
export function formatDuration(ms: number): string { return formatTime(ms / 1000); }
export function formatCount(c: number): string {
  if (c >= 1e8) return `${(c / 1e8).toFixed(1)}亿`;
  if (c >= 1e4) return `${Math.floor(c / 1e4)}万`;
  return c.toString();
}
