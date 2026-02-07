import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, BrowserRouter } from 'react-router-dom';
import { 
  BarChart3, Settings, LogOut, Bell, Video, Menu, HelpCircle,
  Users as TeamIcon, Music, Globe, LayoutDashboard, X, 
  ChevronLeft, ChevronRight 
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

// --- TRANSLATIONS (Giữ nguyên như cũ) ---
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

interface SidebarProps {
  lang: 'vi' | 'en';
  user: UserProfile;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const Sidebar = ({ lang, user, onLogout, isOpen, onClose, isCollapsed, toggleCollapse }: SidebarProps) => {
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
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-50
        bg-[#111111] text-[#aaaaaa] flex flex-col h-screen border-r border-white/5
        transition-all duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}>
        <div className={`h-16 flex items-center ${isCollapsed ? 'lg:justify-center' : 'px-6 justify-between'} transition-all`}>
           <div className="flex items-center gap-2">
             <div className="bg-red-600 p-1.5 rounded-lg shrink-0">
               <Video size={18} className="text-white" />
             </div>
             <span className={`font-bold text-lg text-white tracking-tighter transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : 'w-auto opacity-100'}`}>
               Studio
             </span>
           </div>
           <button onClick={onClose} className="lg:hidden text-white hover:text-red-500">
             <X size={24} />
           </button>
        </div>

        <div className={`
            flex flex-col items-center text-center border-b border-white/5 mx-4 mb-4 transition-all duration-300
            ${isCollapsed ? 'py-4' : 'py-6 px-2'}
        `}>
          <div className={`
              rounded-full bg-[#111] border-2 border-red-600/20 overflow-hidden shadow-2xl transition-all duration-300
              ${isCollapsed ? 'w-10 h-10 mb-0' : 'w-20 h-20 mb-4'}
          `}>
             <img src={user.avatarUrl || `https://i.pravatar.cc/150?u=${user.id}`} className="w-full h-full object-cover opacity-90" alt="" />
          </div>
          
          <div className={`transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
            <p className="text-white font-black text-xs uppercase tracking-widest truncate max-w-[150px]">{user.name}</p>
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic ${user.role === 'ADMIN' ? 'text-red-500' : user.role === 'LEADER' ? 'text-blue-500' : 'text-slate-500'}`}>
                {getRoleLabel(user.role)}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/channels' && location.pathname.startsWith('/channels/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose()} 
                title={isCollapsed ? item.name : ''}
                className={`
                  flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all group relative
                  ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'hover:bg-white/5 hover:text-white'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon size={20} className="shrink-0" />
                
                <span className={`
                    text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300
                    ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : 'w-auto opacity-100'}
                `}>
                    {item.name}
                </span>

                {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-[#222] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 hidden lg:block">
                        {item.name}
                    </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
            <button 
                title={t.support}
                className={`
                    flex items-center gap-4 w-full px-3 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-xl transition-colors
                    ${isCollapsed ? 'justify-center' : ''}
                `}>
                <HelpCircle size={20} className="shrink-0" />
                <span className={`transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : 'w-auto opacity-100'}`}>{t.support}</span>
            </button>
            <button 
                onClick={onLogout}
                title={t.signout}
                className={`
                    flex items-center gap-4 w-full px-3 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-600/10 hover:text-red-500 rounded-xl transition-colors
                    ${isCollapsed ? 'justify-center' : ''}
                `}>
                <LogOut size={20} className="shrink-0" />
                <span className={`transition-all duration-300 ${isCollapsed ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden' : 'w-auto opacity-100'}`}>{t.signout}</span>
            </button>
        </div>

        <button 
            onClick={toggleCollapse}
            className="hidden lg:flex absolute -right-3 top-20 bg-red-600 text-white p-1 rounded-full border-4 border-[#0f0f0f] hover:scale-110 transition-transform shadow-lg z-50"
        >
            {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
        </button>

      </div>
    </>
  );
};

const Header = ({ lang, setLang, onOpenMenu }: { lang: 'vi' | 'en', setLang: (l: 'vi' | 'en') => void, onOpenMenu: () => void }) => (
  <header className="h-16 bg-[#0f0f0f] border-b border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
    <div className="flex items-center gap-4">
      <button onClick={onOpenMenu} className="lg:hidden text-white p-2 hover:bg-white/5 rounded-lg">
        <Menu size={24} />
      </button>
    </div>

    <div className="flex items-center gap-4 lg:gap-6">
      <div className="hidden sm:flex items-center bg-white/5 p-1 rounded-full border border-white/5">
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

      <div className="h-6 w-px bg-white/5 hidden sm:block"></div>

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  if (window.location.pathname === '/oauth2callback') {
     return (
        <BrowserRouter>
           <Routes>
              <Route path="/oauth2callback" element={<OAuthCallback />} />
           </Routes>
        </BrowserRouter>
     );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <div className="flex w-full min-h-screen bg-[#0f0f0f] text-white">
        
        <Sidebar 
          lang={lang} 
          user={currentUser} 
          onLogout={handleLogout} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          isCollapsed={isSidebarCollapsed} 
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />

        {/* THAY ĐỔI: Thêm overflow-x-hidden và max-w-full để đảm bảo không bị vỡ layout */}
        <main className={`
            flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-300 
            ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} 
        `}>
          <Header lang={lang} setLang={handleSetLang} onOpenMenu={() => setIsSidebarOpen(true)} />
          <div className="flex-1 p-0">
            <Routes>
              <Route path="/" element={<Navigate to={currentUser.role === 'USER' ? "/users" : "/channels"} replace />} />
              <Route path="/channels" element={<ChannelsPage lang={lang} />} />
              <Route path="/channels/:id" element={<ChannelDetailPage lang={lang} />} />
              <Route path="/analytics" element={<AnalyticsPage lang={lang} />} />
              <Route path="/music" element={<MusicPage lang={lang} />} />
              <Route path="/users" element={<UsersPage lang={lang} user={currentUser} />} />
              <Route path="/system" element={currentUser.role === 'ADMIN' ? <SystemPage lang={lang} /> : <Navigate to="/" replace />} />
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