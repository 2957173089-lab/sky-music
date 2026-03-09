import { createClient, User } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

// Supabase 配置（可选）
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// 自定义后端 API 配置
const backendApiUrl = env.VITE_BACKEND_API_URL || 'http://localhost:5000';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const hasBackendConfig = Boolean(backendApiUrl);

// Supabase 客户端（如果配置）
export const supabase = hasSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// 自定义后端客户端
export const backendClient = hasBackendConfig
  ? {
      baseUrl: backendApiUrl,
      async request(path: string, options: RequestInit = {}) {
        const url = `${backendApiUrl}${path}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        
        // 添加用户ID（如果已登录）
        const userId = localStorage.getItem('sky_user_id');
        if (userId) {
          headers['X-User-ID'] = userId;
        }
        
        const response = await fetch(url, { ...options, headers });
        const data = await response.json();
        
        return { data, error: !response.ok ? data : null };
      },
      async register(email: string, username: string, password: string) {
        return this.request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, username, password })
        });
      },
      async login(email: string, password: string) {
        const result = await this.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        
        if (!result.error && result.data?.user_id) {
          localStorage.setItem('sky_user_id', result.data.user_id.toString());
          localStorage.setItem('sky_username', result.data.username);
          localStorage.setItem('sky_email', result.data.email);
        }
        
        return result;
      },
      async logout() {
        localStorage.removeItem('sky_user_id');
        localStorage.removeItem('sky_username');
        localStorage.removeItem('sky_email');
        return this.request('/api/auth/logout', { method: 'POST' });
      },
      async getProfile() {
        return this.request('/api/auth/profile');
      },
      async getPlaylists() {
        return this.request('/api/playlists');
      },
      async createPlaylist(name: string, description?: string, coverUrl?: string) {
        return this.request('/api/playlists', {
          method: 'POST',
          body: JSON.stringify({ name, description, cover_url: coverUrl })
        });
      },
      async getPlaylist(playlistId: number) {
        return this.request(`/api/playlists/${playlistId}`);
      },
      async updatePlaylist(playlistId: number, data: any) {
        return this.request(`/api/playlists/${playlistId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      },
      async deletePlaylist(playlistId: number) {
        return this.request(`/api/playlists/${playlistId}`, {
          method: 'DELETE'
        });
      },
      async addSongToPlaylist(playlistId: number, song: any) {
        return this.request(`/api/playlists/${playlistId}/songs`, {
          method: 'POST',
          body: JSON.stringify(song)
        });
      },
      async removeSongFromPlaylist(playlistId: number, songId: number) {
        return this.request(`/api/playlists/${playlistId}/songs/${songId}`, {
          method: 'DELETE'
        });
      },
      async moveSongInPlaylist(playlistId: number, songId: number, toPosition: number) {
        return this.request(`/api/playlists/${playlistId}/songs/move`, {
          method: 'PUT',
          body: JSON.stringify({ song_id: songId, to_position: toPosition })
        });
      },
      async getFavorites() {
        return this.request('/api/favorites');
      },
      async addFavorite(song: any) {
        return this.request('/api/favorites', {
          method: 'POST',
          body: JSON.stringify(song)
        });
      },
      async removeFavorite(songId: number) {
        return this.request(`/api/favorites/${songId}`, {
          method: 'DELETE'
        });
      },
      async checkFavorite(songId: number) {
        return this.request(`/api/favorites/${songId}`);
      },
      async getHistory(limit: number = 50) {
        return this.request(`/api/history?limit=${limit}`);
      },
      async addHistory(song: any) {
        return this.request('/api/history', {
          method: 'POST',
          body: JSON.stringify(song)
        });
      },
      async clearHistory() {
        return this.request('/api/history/clear', {
          method: 'POST'
        });
      },
      async syncData(data: any) {
        return this.request('/api/sync', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },
      async getSyncData() {
        return this.request('/api/sync');
      }
    }
  : null;

export type { User as SupabaseUser };
