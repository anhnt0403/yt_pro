import React, { useState, useEffect } from 'react';
// THÊM: BrowserRouter vào dòng import
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, BrowserRouter } from 'react-router-dom';
import { 
  BarChart3, Settings, LogOut, Bell, Video, Menu, HelpCircle,
  Users as TeamIcon, Music, Globe, LayoutDashboard
} from 'lucide-react';

import ChannelsPage from './pages/ChannelsPage';
import ChannelDetailPage from './pages/ChannelDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SystemPage from './pages/SystemPage';
import UsersPage from './pages/UsersPage';
import MusicPage from './pages/MusicPage';
import LoginPage from './pages/LoginPage';
import OAuthCallback from './pages/OAuthCallback'; 

import { dbService } from './services/dbService';
import { UserProfile } from './types';

export const translations = {
  vi: {
    dashboard: 'Tổng quan',
    channels: 'Kênh',
    analytics: 'Phân tích',
    team: 'Nhân sự',
    music: 'Kho Nhạc',
    settings: 'Cài đặt',
    support: 'Hỗ trợ',
    signout: 'Đăng xuất',
    manager: 'Quản lý Pro',
    admin: 'Quản trị viên',
    leader: 'Trưởng nhóm',
    user: 'Nhân viên',
    langVi: 'Tiếng Việt',
    langEn: 'English',
    searchPlaceholder: 'Tìm kiếm...',
    loading: 'Đang tải...',
    noData: 'Không có dữ liệu',
    cancel: 'Hủy bỏ',
    confirm: 'Xác nhận',
    save: 'Lưu thay đổi',
    delete: 'Xóa',
    edit: 'Sửa',
    back: 'Quay lại',
    channelManagement: 'QUẢN LÝ KÊNH',
    addChannel: 'THÊM KÊNH',
    channelType: 'Kênh / Loại',
    staffInCharge: 'Người phụ trách',
    net: 'Net',
    origin: 'Gốc Kênh',
    revenueShare: '% Doanh thu',
    monetization: 'Kiếm tiền',
    actions: 'Hành động',
    monetizedOn: 'BẬT',
    monetizedOff: 'TẮT',
    connectNew: 'KẾT NỐI KÊNH MỚI',
    oauthMode: 'XÁC THỰC OAUTH',
    manualMode: 'ID KÊNH THỦ CÔNG',
    opInfo: 'THÔNG TIN VẬN HÀNH',
    aged: 'Kênh Cổ',
    managed: 'Kênh Net',
    staffPlaceholder: '-- Chọn nhân viên --',
    netPlaceholder: 'Vd: MVN, OHENE...',
    category: 'PHÂN LOẠI NỘI DUNG',
    categoryPlaceholder: '-- Chọn danh mục --',
    inputType: 'LOẠI KÊNH ĐẦU VÀO',
    inputTypePlaceholder: '-- Chọn nguồn gốc --',
    revenuePercentLabel: 'PHẦN TRĂM DOANH THU ĐÓNG GÓP (%)',
    analyticsSystem: 'HỆ THỐNG PHÂN TÍCH',
    periodic: 'Định kỳ',
    custom: 'Tùy chỉnh',
    realRevenue: 'Doanh thu thực',
    totalViews: 'Tổng lượt xem',
    monetizedNodes: 'Nút kiếm tiền',
    syncQuality: 'Chất lượng đồng bộ',
    chartTitle: 'BIỂU ĐỒ HIỆU QUẢ HỆ THỐNG',
    detailedStats: 'THỐNG KÊ DOANH THU CHI TIẾT',
    rank: 'Thứ tự',
    channelNiche: 'Kênh / Niche',
    status: 'Trạng thái',
    revenuePeriod: 'Doanh thu kỳ',
    staffTeam: 'ĐỘI NGŨ CẦM KÊNH',
    addStaff: 'Thêm Nhân Sự',
    staffNote: 'Ghi chú nhân sự phụ trách vận hành hệ thống',
    assignedChannels: 'Kênh đang cầm',
    reassign: 'Phân công lại',
    staffName: 'Họ và Tên',
    staffRole: 'Vị trí đảm nhiệm',
    assignRights: 'Phân công kênh quản lý',
    revenueReport: 'BÁO CÁO DOANH THU HỆ THỐNG',
    member: 'Thành Viên',
    total: 'Tổng',
    year: 'Năm',
    bankInfo: 'Thông tin TK',
    systemConfig: 'CẤU HÌNH HỆ THỐNG',
    redirectUri: 'Redirect URI',
    testUsers: 'Test Users',
    securityBypass: 'Security Bypass',
    outputLogs: 'System Output Logs',
    oauthApiKeys: 'OAuth & API Keys',
    saveConfig: 'LƯU CẤU HÌNH CORE',
    resetDb: 'RESET CORE DATABASE'
  },
  en: {
    dashboard: 'Dashboard',
    channels: 'Channels',
    analytics: 'Analytics',
    team: 'Team',
    music: 'Music Library',
    settings: 'Settings',
    support: 'Support',
    signout: 'Sign Out',
    manager: 'Manager Pro',
    admin: 'Administrator',
    leader: 'Team Leader',
    user: 'User',
    langVi: 'Vietnamese',
    langEn: 'English',
    searchPlaceholder: 'Search...',
    loading: 'Loading...',
    noData: 'No Data',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save Changes',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    channelManagement: 'CHANNEL MANAGEMENT',
    addChannel: 'ADD CHANNEL',
    channelType: 'Channel / Type',
    staffInCharge: 'Staff in Charge',
    net: 'Network',
    origin: 'Origin',
    revenueShare: '% Revenue',
    monetization: 'Monetized',
    actions: 'Actions',
    monetizedOn: 'ON',
    monetizedOff: 'OFF',
    connectNew: 'CONNECT NEW CHANNEL',
    oauthMode: 'OAUTH AUTH',
    manualMode: 'MANUAL ID',
    opInfo: 'OPERATION INFO',
    aged: 'Aged Channel',
    managed: 'Managed Net',
    staffPlaceholder: '-- Select staff --',
    netPlaceholder: 'Ex: MVN, OHENE...',
    category: 'CONTENT CATEGORY',
    categoryPlaceholder: '-- Select category --',
    inputType: 'INPUT CHANNEL TYPE',
    inputTypePlaceholder: '-- Select origin --',
    revenuePercentLabel: 'REVENUE CONTRIBUTION PERCENTAGE (%)',
    analyticsSystem: 'ANALYTICS SYSTEM',
    periodic: 'Periodic',
    custom: 'Custom',
    realRevenue: 'Real Revenue',
    totalViews: 'Total Views',
    monetizedNodes: 'Monetized Nodes',
    syncQuality: 'Sync Quality',
    chartTitle: 'SYSTEM PERFORMANCE CHART',
    detailedStats: 'DETAILED REVENUE STATS',
    rank: 'Rank',
    channelNiche: 'Channel / Niche',
    status: 'Status',
    revenuePeriod: 'Period Revenue',
    staffTeam: 'CHANNEL STAFF TEAM',
    addStaff: 'Add Staff',
    staffNote: 'Personnel in charge of system operation',
    assignedChannels: 'Assigned Channels',
    reassign: 'Reassign',
    staffName: 'Full Name',
    staffRole: 'Position/Role',
    assignRights: 'Assign Management Channels',
    revenueReport: 'SYSTEM REVENUE REPORT',
    member: 'Member',
    total: 'Total',
    year: 'Year',
    bankInfo: 'Bank Info',
    systemConfig: 'SYSTEM CONFIGURATION',
    redirectUri: 'Redirect URI',
    testUsers: 'Test Users',
    securityBypass: 'Security Bypass',
    outputLogs: 'System Output Logs',
    oauthApiKeys: 'OAuth & API Keys',
    saveConfig: 'SAVE CORE CONFIG',
    resetDb: 'RESET CORE DATABASE'
  }
};

const Sidebar = ({ lang, user, onLogout }: { lang: 'vi' | 'en', user: UserProfile, onLogout: () => void }) => {
  const location = useLocation();
  const t = translations[lang];
  
  const navItems = [
    { name: t.channels, path: '/channels', icon: Video, roles: ['ADMIN', 'LEADER', 'USER'] },
    { name: t.analytics, path: '/analytics', icon: BarChart3, roles: ['ADMIN', 'LEADER', 'USER'] },
    { name: t.music, path: '/music', icon: Music, roles: ['ADMIN', 'LEADER', 'USER'] },
    { name: t.team, path: '/users', icon: TeamIcon, roles: ['ADMIN', 'LEADER', 'USER'] },
    { name: t.settings, path: '/system', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user.role));

  const getRoleLabel = (role: string) => {
     if(role === 'ADMIN') return t.admin;
     if(role === 'LEADER') return t.leader;
     return t.user;
  };

  return (
    <div className="w-64 bg-[#111111] text-[#aaaaaa] flex flex-col h-screen fixed left-0 top-0 border-r border-white/5 z-50">
      <div className="h-16 flex items-center px-6 gap-4">
        <Menu size={20} className="text-[#aaaaaa] cursor-pointer hover:text-white" />
        <div className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded-sm">
            <Video size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tighter">Studio</span>
        </div>
      </div>

      <div className="px-6 py-6 flex flex-col items-center text-center border-b border-white/5 mx-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-[#111] border-2 border-red-600/20 overflow-hidden mb-4 shadow-2xl">
           <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} className="w-full h-full object-cover opacity-90" alt="" />
        </div>
        <p className="text-white font-black text-xs uppercase tracking-widest">{user.name}</p>
        <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic ${user.role === 'ADMIN' ? 'text-red-500' : user.role === 'LEADER' ? 'text-blue-500' : 'text-slate-500'}`}>
          {getRoleLabel(user.role)}
        </p>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/channels' && location.pathname.startsWith('/channels/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-1">
        <button className="flex items-center gap-4 w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors">
          <HelpCircle size={18} />
          <span>{t.support}</span>
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center gap-4 w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-600/10 hover:text-red-500 rounded-xl transition-colors"
        >
          <LogOut size={18} />
          <span>{t.signout}</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ lang, setLang }: { lang: 'vi' | 'en', setLang: (l: 'vi' | 'en') => void }) => (
  <header className="h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-end px-8 sticky top-0 z-40">
    <div className="flex items-center gap-6">
      <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/5">
        <button 
          onClick={() => setLang('vi')}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${lang === 'vi' ? 'bg-white text-black shadow-lg scale-105' : 'text-[#555] hover:text-[#888]'}`}
        >
          <img src="https://flagcdn.com/w20/vn.png" className="w-3 h-2.5 object-cover rounded-sm" alt="VN" />
          VI
        </button>
        <button 
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${lang === 'en' ? 'bg-white text-black shadow-lg scale-105' : 'text-[#555] hover:text-[#888]'}`}
        >
          <img src="https://flagcdn.com/w20/us.png" className="w-3 h-2.5 object-cover rounded-sm" alt="EN" />
          EN
        </button>
      </div>

      <div className="h-6 w-px bg-white/5"></div>

      <button className="relative text-[#aaaaaa] hover:text-white p-2 transition-colors">
        <Bell size={22} />
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-[#0f0f0f]"></span>
      </button>

      <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden cursor-pointer border-2 border-white/10 hover:border-red-600 transition-all shadow-xl">
        <img src={`https://i.pravatar.cc/150?u=current-user`} className="w-full h-full object-cover" alt="User" />
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [lang, setLang] = useState<'vi' | 'en'>(dbService.getLanguage());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(dbService.getCurrentUser());

  const handleSetLang = (newLang: 'vi' | 'en') => {
    setLang(newLang);
    dbService.setLanguage(newLang);
  };

  const handleLogout = () => {
    dbService.logout();
    setCurrentUser(null);
  };

  const handleLoginSuccess = () => {
    setCurrentUser(dbService.getCurrentUser());
  };

  // --- [SỬA LỖI] PHÁT HIỆN CALLBACK TỪ GOOGLE ---
  // Kiểm tra 'pathname' thay vì 'hash' vì Google trả về đường dẫn chuẩn (không có #)
  if (window.location.pathname === '/oauth2callback') {
     return (
        // Dùng BrowserRouter để đọc được URL chuẩn từ Google
        <BrowserRouter>
           <Routes>
              <Route path="/oauth2callback" element={<OAuthCallback />} />
           </Routes>
        </BrowserRouter>
     );
  }
  // ---------------------------------------------

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-[#0f0f0f] text-white">
        <Sidebar lang={lang} user={currentUser} onLogout={handleLogout} />
        <main className="flex-1 ml-64 min-h-screen flex flex-col">
          <Header lang={lang} setLang={handleSetLang} />
          <div className="flex-1 p-0">
            <Routes>
              <Route path="/" element={<Navigate to={currentUser.role === 'USER' ? "/users" : "/channels"} replace />} />
              <Route path="/channels" element={<ChannelsPage lang={lang} />} />
              <Route path="/channels/:id" element={<ChannelDetailPage lang={lang} />} />
              <Route path="/analytics" element={<AnalyticsPage lang={lang} />} />
              <Route path="/music" element={<MusicPage lang={lang} />} />
              <Route path="/users" element={<UsersPage lang={lang} user={currentUser} />} />
              <Route path="/system" element={currentUser.role === 'ADMIN' ? <SystemPage lang={lang} /> : <Navigate to="/" replace />} />
              
              {/* Vẫn giữ Route này cho trường hợp dùng Hash trong tương lai */}
              <Route path="/oauth2callback" element={<OAuthCallback />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;