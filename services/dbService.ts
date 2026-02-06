import { UserProfile, Channel, MusicAsset, MusicGenre, UploadTask } from '../types';

// Tự động nhận diện IP của server dựa trên địa chỉ trình duyệt
const API_HOSTNAME = window.location.hostname;
const API_BASE_URL = `http://${API_HOSTNAME}:5000/api`;

const TOKEN_KEY = 'yt_manager_jwt_token';
const USER_KEY = 'yt_manager_current_user';
const LANG_KEY = 'yt_manager_lang';

export interface GoogleAccount {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  ownedChannelIds?: string[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}

const getHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'API Error');
  }
  return res.json();
};

export const dbService = {
  // ---------- AUTH ----------
  login: async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.reload();
  },

  getCurrentUser: (): UserProfile | null => {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  /* ================= USERS ================= */
  getUsers: async (): Promise<UserProfile[]> => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  addUser: async (user: Partial<UserProfile>) => {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user)
    });
    return handleResponse(res);
  },

  updateUser: async (id: string, payload: Partial<UserProfile>) => {
    if (!id) throw new Error('Missing user id');
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // ---------- CHANNELS ----------
  getChannels: async (): Promise<Channel[]> => {
    const res = await fetch(`${API_BASE_URL}/channels`, { headers: getHeaders() });
    const data = await res.json();
    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      niche: c.niche,
      subscriberCount: Number(c.subscriber_count),
      viewCount: Number(c.view_count),
      status: c.status,
      gmail: c.gmail,
      thumbnailUrl: c.thumbnail_url,
      isMonetized: !!c.is_monetized,
      assignedStaffId: c.assigned_staff_id,
      networkName: c.network_name,
      revenueSharePercent: Number(c.revenue_share_percent),
      channelCategory: c.channel_category,
      channelOrigin: c.channel_origin,
    }));
  },

  addChannel: async (channel: any) => {
    const res = await fetch(`${API_BASE_URL}/channels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(channel),
    });
    const result = await handleResponse(res);
    window.dispatchEvent(new CustomEvent('db_updated'));
    return result;
  },

  deleteChannel: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/channels/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const result = await handleResponse(res);
    window.dispatchEvent(new CustomEvent('db_updated'));
    return result;
  },

  assignChannelsToStaff: async (staffId: string, channelIds: string[]) => {
    const res = await fetch(`${API_BASE_URL}/channels/assign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ staffId, channelIds }),
    });
    return handleResponse(res);
  },

  // ---------- REVENUE ----------
  getManualRevenue: async (year: number, channelId?: string) => {
    let url = `${API_BASE_URL}/manual-revenue?year=${year}`;
    if (channelId) url += `&channelId=${channelId}`;
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
  },

  updateChannelRevenue: async (
    channelId: string,
    year: number,
    monthlyData: number[]
  ) => {
    const res = await fetch(`${API_BASE_URL}/manual-revenue`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ channelId, year, monthlyData }),
    });
    return res.json();
  },

  // ---------- SYSTEM ----------
  getSystemConfig: async () => {
    const res = await fetch(`${API_BASE_URL}/system/config`, {
      headers: getHeaders(),
    });
    const d = await res.json();
    // Server đã trả về camelCase nhờ SQL Aliases
    return {
      clientId: d.clientId || '',
      clientSecret: d.clientSecret || '',
      apiKeys: d.apiKeys ? (typeof d.apiKeys === 'string' ? JSON.parse(d.apiKeys) : d.apiKeys) : [],
      language: d.language || 'vi',
      redirectUriOverride: d.redirectUriOverride || '',
    };
  },

  saveSystemConfig: async (config: any) => {
    const res = await fetch(`${API_BASE_URL}/system/config`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config),
    });
    const result = await handleResponse(res);
    window.dispatchEvent(new CustomEvent('db_updated'));
    return result;
  },

  getLogs: async (): Promise<SystemLog[]> => {
    const res = await fetch(`${API_BASE_URL}/system/logs`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  addLog: async (level: string, message: string) => {
    await fetch(`${API_BASE_URL}/system/logs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ level, message }),
    });
    window.dispatchEvent(new CustomEvent('db_updated'));
  },

  clearLogs: async () => {
    await fetch(`${API_BASE_URL}/system/logs`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    window.dispatchEvent(new CustomEvent('db_updated'));
  },

  setLanguage: (lang: 'vi' | 'en') => {
    localStorage.setItem(LANG_KEY, lang);
  },

  getLanguage: (): 'vi' | 'en' =>
    (localStorage.getItem(LANG_KEY) as 'vi' | 'en') || 'vi',

  // ---------- TASKS / GOOGLE ----------
  getTasks: async (): Promise<UploadTask[]> => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getGoogleAccounts: async (): Promise<GoogleAccount[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/google-accounts`, {
        headers: getHeaders()
      });

      // Nếu server trả về lỗi (như 403), trả về mảng rỗng thay vì ném lỗi
      if (!res.ok) {
        console.warn(`Google Accounts API error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch google accounts:", error);
      return [];
    }
  },

  saveAccount: async (account: GoogleAccount, channelIds: string[]) => {
    const res = await fetch(`${API_BASE_URL}/google-accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...account, channelIds })
    });
    return handleResponse(res);
  },

  // ---------- MUSIC ASSETS ----------
  // ---------- MUSIC ----------
  getMusic: async (): Promise<MusicAsset[]> => {
    const res = await fetch(`${API_BASE_URL}/music`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getMusicGenres: async (): Promise<MusicGenre[]> => {
    const res = await fetch(`${API_BASE_URL}/music/genres`, { headers: getHeaders() });
    return handleResponse(res);
  },

  uploadMusicFile: async (formData: FormData) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/music/upload`, {
      method: 'POST',
      headers: { 
        // Lưu ý: Không để Content-Type là json khi gửi FormData
        Authorization: token ? `Bearer ${token}` : '' 
      },
      body: formData,
    });
    return handleResponse(res);
  },

  deleteMusic: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/music/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  addMusicGenre: async (genre: { name: string }) => {
    const res = await fetch(`${API_BASE_URL}/music/genres`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(genre),
    });
    return handleResponse(res);
  },

  deleteMusicGenre: async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/music/genres/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  }
};



