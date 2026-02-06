export enum ChannelStatus {
  LIVE = 'LIVE',
  SUSPENDED = 'SUSPENDED',
  WARNING = 'WARNING'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'LEADER' | 'USER';
  leaderId?: string;
  avatarUrl?: string;
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  assignedChannelIds: string[];
}

// --- [SỬA LỖI] THÊM INTERFACE NÀY VÀO ---
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
// ----------------------------------------

export interface Channel {
  id: string;
  name: string;
  niche: string;
  subscriberCount: number;
  viewCount: number;
  status: ChannelStatus;
  gmail: string;
  lastChecked: string;
  thumbnailUrl?: string;
  uploadsPlaylistId?: string;
  isMonetized?: boolean;
  assignedStaffId?: string;
  networkName?: string;
  revenueSharePercent?: number;
  channelCategory?: string;
  channelOrigin?: 'COLD' | 'NET';
  manualRevenueData?: Record<number, number[]>;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  scheduledTime?: string;
  thumbnailUrl?: string;
}

export interface UploadTask {
  id: string;
  channelId: string;
  videoTitle: string;
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  progress: number;
}

export interface QuotaStatus {
  apiKey: string;
  used: number;
  limit: number;
}

export interface AnalyticsReport {
  day: string;
  estimatedRevenue: number;
  views: number;
  subscribersGained: number;
}

export interface HourlyViewReport {
  hour: string;
  views: number;
}

export interface MusicAsset {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  mood: string;
  bpm: number;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
}

export interface MusicGenre {
  id: number;
  name: string;
  slug: string;
  color: string;
}
