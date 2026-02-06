import { Channel, ChannelStatus } from '../types';
import { dbService } from './dbService';

export const youtubeService = {
  // Hàm này xác định URI chuẩn duy nhất cho cả quá trình
  getRedirectUri: async () => {
    const config = await dbService.getSystemConfig();
    
    // 1. Ưu tiên lấy từ cấu hình Override (nếu có nhập)
    if (config.redirectUriOverride && config.redirectUriOverride.trim() !== '') {
      return config.redirectUriOverride.replace(/\/$/, '');
    }
    
    // 2. Nếu không nhập, lấy tự động theo trình duyệt (localhost hoặc domain thật)
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}/oauth2callback`;
  },

  generateAuthUrl: async (
    clientId: string,
    mode: 'basic' | 'analytics' | 'full' = 'full'
  ) => {
    const redirectUri = await youtubeService.getRedirectUri();
    
    console.log("🔵 STEP 1: Generating Auth URL with URI:", redirectUri); // Debug

    const scopeMap: Record<string, string[]> = {
      basic: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      analytics: [
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
      ],
      full: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    };

    const selectedMode = (mode && scopeMap[mode]) ? mode : 'full';
    const scopes = scopeMap[selectedMode];
    const scopeString = scopes.join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopeString,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  exchangeCodeForToken: async (params: {
    code: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  }): Promise<any> => {
    const config = await dbService.getSystemConfig();
    
    // QUAN TRỌNG: Lấy lại đúng cái URI đã dùng ở bước 1
    const redirectUri = await youtubeService.getRedirectUri();

    console.log("🟢 STEP 2: Exchanging Token using URI:", redirectUri); // Debug
    
    // Kiểm tra nhanh: Nếu đang ở localhost nhưng URI lại là nip.io (hoặc ngược lại) -> Báo lỗi ngay
    if (window.location.hostname === 'localhost' && redirectUri.includes('nip.io')) {
       console.warn("CẢNH BÁO: Bạn đang chạy Localhost nhưng cấu hình vẫn trỏ về nip.io!");
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: params.code,
        client_id: params.clientId || config.clientId,
        client_secret: params.clientSecret || config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ Token Exchange Failed:", data);
      throw new Error(data.error_description || `Lỗi Google (400): Redirect URI không khớp! (Đang gửi: ${redirectUri})`);
    }
    return data;
  },

  fetchUserEmail: async (accessToken: string): Promise<string> => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!res.ok || !data) throw new Error("Google API UserInfo Error");
      const email = data.email || data.email_address || data.sub;
      return email;
    } catch (err: any) {
      throw new Error("Lỗi lấy Email: " + err.message);
    }
  },

  fetchAuthorizedChannels: async (
    accessToken: string
  ): Promise<Channel[]> => {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    const channels: Channel[] = [];

    for (const item of data.items || []) {
      channels.push({
        id: item.id,
        name: item.snippet.title,
        niche: 'Authorized',
        subscriberCount: Number(item.statistics.subscriberCount) || 0,
        viewCount: Number(item.statistics.viewCount) || 0,
        status: ChannelStatus.LIVE,
        gmail: 'OAuth Managed',
        lastChecked: new Date().toISOString(),
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
        isMonetized: false // Mặc định false, sẽ check sau
      });
    }
    return channels;
  },


  fetchAnalyticsReport: async (
    accessToken: string,
    params: Record<string, string>
  ) => {
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams(params)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status !== 403) {
        dbService.addLog('ERROR', `Analytics API: ${data.error?.message}`);
      }
      throw new Error(data.error?.message || 'Analytics API Error');
    }
    return data;
  },

  fetchDailyRevenue: async (
    accessToken: string,
    channelId: string,
    startDate: string,
    endDate: string
  ) => {
    return youtubeService.fetchAnalyticsReport(accessToken, {
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'estimatedRevenue,views',
      dimensions: 'day',
      sort: 'day'
    });
  },

  fetchDailyBasicStats: async (accessToken: string, channelId: string, startDate: string, endDate: string) => {
    return youtubeService.fetchAnalyticsReport(accessToken, {
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'day',
      sort: 'day'
    });
  },

  fetchVideoAnalytics: async (accessToken: string, channelId: string, videoId: string, startDate: string, endDate: string) => {
    return youtubeService.fetchAnalyticsReport(accessToken, {
      ids: `channel==${channelId}`,
      filters: `video==${videoId}`,
      startDate,
      endDate,
      metrics: 'estimatedRevenue,views',
      dimensions: 'day',
      sort: 'day'
    });
  },

  fetchVideoBasicAnalytics: async (accessToken: string, channelId: string, videoId: string, startDate: string, endDate: string) => {
    return youtubeService.fetchAnalyticsReport(accessToken, {
      ids: `channel==${channelId}`,
      filters: `video==${videoId}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'day',
      sort: 'day'
    });
  },

  // fetchAuthorizedChannels: async (
  //   accessToken: string
  // ): Promise<Channel[]> => {
  //   const response = await fetch(
  //     'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
  //     { headers: { Authorization: `Bearer ${accessToken}` } }
  //   );

  //   const data = await response.json();
  //   const channels: Channel[] = [];

  //   for (const item of data.items || []) {
  //     let isMonetized = false;
  //     try {
  //       const now = new Date();
  //       const weekAgo = new Date(now.getTime() - 7 * 86400000);
  //       const report = await youtubeService.fetchAnalyticsReport(accessToken, {
  //         ids: `channel==${item.id}`,
  //         startDate: weekAgo.toISOString().split('T')[0],
  //         endDate: now.toISOString().split('T')[0],
  //         metrics: 'estimatedRevenue'
  //       });
  //       isMonetized = !!report.rows?.length;
  //     } catch { }

  //     channels.push({
  //       id: item.id,
  //       name: item.snippet.title,
  //       niche: 'Authorized',
  //       subscriberCount: Number(item.statistics.subscriberCount) || 0,
  //       viewCount: Number(item.statistics.viewCount) || 0,
  //       status: ChannelStatus.LIVE,
  //       gmail: 'OAuth Managed',
  //       lastChecked: new Date().toISOString(),
  //       thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
  //       uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  //       isMonetized
  //     });
  //   }

  //   return channels;
  // },

  callYoutubeApi: async (endpoint: string, params: Record<string, string>, auth: { apiKey?: string; accessToken?: string }) => {
    const urlParams = new URLSearchParams(params);
    if (auth.apiKey && !auth.accessToken) {
      urlParams.append('key', auth.apiKey);
    }

    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${urlParams.toString()}`;
    const headers: Record<string, string> = {};
    if (auth.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "YouTube API Error");
    }
    return data;
  },

  fetchChannelByIdOrHandle: async (input: string, auth: { apiKey?: string; accessToken?: string }): Promise<any> => {
    const isHandle = input.trim().startsWith('@');
    const params: Record<string, string> = {
      part: 'snippet,statistics,contentDetails'
    };
    if (isHandle) {
      params['forHandle'] = input.trim().replace('@', '');
    } else {
      params['id'] = input.trim();
    }
    const data = await youtubeService.callYoutubeApi('channels', params, auth);
    if (!data.items?.length) {
      throw new Error(`Không tìm thấy kênh: ${input}`);
    }
    const item = data.items[0];
    return {
      id: item.id,
      name: item.snippet.title,
      niche: 'Monitoring',
      subscriberCount: parseInt(item.statistics.subscriberCount) || 0,
      viewCount: parseInt(item.statistics.viewCount) || 0,
      status: ChannelStatus.LIVE,
      gmail: auth.accessToken ? 'OAuth Managed' : 'Public Info',
      lastChecked: new Date().toISOString(),
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
      isMonetized: false
    };
  },

  fetchDetailedVideos: async (resolvedChannelId: string, auth: { apiKey?: string; accessToken?: string }) => {
    try {
      const channelData = await youtubeService.callYoutubeApi('channels', {
        part: 'contentDetails',
        id: resolvedChannelId
      }, auth);

      let uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId && resolvedChannelId.startsWith('UC')) {
        uploadsPlaylistId = 'UU' + resolvedChannelId.substring(2);
      }

      if (!uploadsPlaylistId) return { items: [] };

      const videoMap = new Map();
      let nextPageToken = '';
      let safetyCounter = 0;

      do {
        const playlistData = await youtubeService.callYoutubeApi('playlistItems', {
          part: 'contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: '50',
          pageToken: nextPageToken
        }, auth);

        const videoIds = (playlistData.items || []).map((v: any) => v.contentDetails.videoId).join(',');

        if (videoIds) {
          const statsData = await youtubeService.callYoutubeApi('videos', {
            part: 'snippet,statistics,status,liveStreamingDetails',
            id: videoIds
          }, auth);

          (statsData.items || []).forEach((item: any) => {
            const broadcastStatus = item.snippet.liveBroadcastContent;
            const liveDetails = item.liveStreamingDetails;
            const hasLiveDetails = !!liveDetails;

            let isActualLive = false;
            let isPremiere = false;

            if (broadcastStatus === 'upcoming') {
              isPremiere = true;
            } else if (broadcastStatus === 'none' && hasLiveDetails) {
              const actualStart = new Date(liveDetails.actualStartTime).getTime();
              const scheduledStart = new Date(liveDetails.scheduledStartTime).getTime();
              const diff = Math.abs(actualStart - scheduledStart);
              if (diff < 2000) {
                isPremiere = true;
              } else {
                isActualLive = true;
              }
            } else if (broadcastStatus === 'live') {
              const actualStart = new Date(liveDetails.actualStartTime).getTime();
              const scheduledStart = new Date(liveDetails.scheduledStartTime).getTime();
              const diff = Math.abs(actualStart - scheduledStart);
              if (diff < 2000) isPremiere = true;
              else isActualLive = true;
            }

            videoMap.set(item.id, {
              id: item.id,
              title: item.snippet.title,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              views: parseInt(item.statistics.viewCount) || 0,
              publishedAt: item.snippet.publishedAt,
              visibility: item.status.privacyStatus,
              isLiveStream: isActualLive,
              isPremiere: isPremiere,
              status: broadcastStatus
            });
          });
        }
        nextPageToken = playlistData.nextPageToken || '';
        safetyCounter++;
      } while (nextPageToken && safetyCounter < 10);

      return { items: Array.from(videoMap.values()) };
    } catch (e) {
      console.error("Error fetching detailed videos:", e);
      return { items: [] };
    }
  },
};