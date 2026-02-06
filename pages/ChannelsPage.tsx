import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Youtube, Trash2, ChevronRight,
  Loader2, X, Check,
  Edit3, DollarSign, Ban,
  Download, Search, Filter, Monitor, Zap, Shield,
  Settings2, AlertTriangle
} from 'lucide-react';
import { Channel, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { youtubeService } from '../services/youtubeService';
import { translations } from '../App';

const ChannelsPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
  const t = translations[lang];
  const [channels, setChannels] = useState<Channel[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [addMode, setAddMode] = useState<'OAUTH' | 'MANUAL'>('OAUTH');
  
  const [authCodeInput, setAuthCodeInput] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForPopup, setIsWaitingForPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- [FIX] THÊM REF ĐỂ CHẶN GỬI TRÙNG MÃ ---
  const processedCodeRef = useRef<string | null>(null);
  // ------------------------------------------

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [revenuePercent, setRevenuePercent] = useState('100');
  const [channelCategory, setChannelCategory] = useState('');
  const [channelOrigin, setChannelOrigin] = useState<'COLD' | 'NET' | ''>('');
  const [systemConfig, setSystemConfig] = useState<any>(null);

  const currentUser = dbService.getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const categories = [
    "Vlog", "Music", "Kids", "Gaming", "News", "Education", "Entertainment", "Shorts", "Movie", "Reaction"
  ];

  const loadData = useCallback(async () => {
    setIsProcessing(true);
    try {
      const [chData, stData, confData] = await Promise.all([
        dbService.getChannels(),
        dbService.getUsers(),
        dbService.getSystemConfig()
      ]);
      setChannels(chData);
      setStaff(stData);
      setSystemConfig(confData);
    } catch (e) {
      console.error("Load data failed", e);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('db_updated', loadData);
    return () => window.removeEventListener('db_updated', loadData);
  }, [loadData]);

  // --- [UPDATED] LẮNG NGHE CODE VỚI CƠ CHẾ CHỐNG SPAM ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'OAUTH_CODE' && event.data.code) {
        const incomingCode = event.data.code;
        
        // KIỂM TRA QUAN TRỌNG: Nếu code này đã xử lý rồi thì bỏ qua ngay
        if (processedCodeRef.current === incomingCode) {
            console.warn("⚠️ Đã chặn duplicate code:", incomingCode);
            return; 
        }

        // Đánh dấu code này đã xử lý
        processedCodeRef.current = incomingCode;

        console.log("✅ Received New Auth Code:", incomingCode);
        setIsWaitingForPopup(false);
        handleFinalizeOAuth(incomingCode);
      }
    };

    window.addEventListener('message', handleMessage);

    const pendingCode = localStorage.getItem('pending_oauth_code');
    if (pendingCode) {
      localStorage.removeItem('pending_oauth_code');
      // Kiểm tra cả localStorage code
      if (processedCodeRef.current !== pendingCode) {
          processedCodeRef.current = pendingCode;
          handleFinalizeOAuth(pendingCode);
      }
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const filteredChannels = useMemo(() => {
    const visibleStaffIds = new Set(staff.map(s => s.id));
    let teamChannels = channels;
    if (!isAdmin) {
      teamChannels = channels.filter(c => c.assignedStaffId && visibleStaffIds.has(c.assignedStaffId));
    }
    return teamChannels.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, staff, searchQuery, isAdmin]);

  const extractedCode = useMemo(() => {
    if (!authCodeInput.trim()) return null;
    const match = authCodeInput.match(/code=([^&"\s\n\r]+)/);
    return match ? decodeURIComponent(match[1]) : (authCodeInput.length > 20 ? authCodeInput.trim() : null);
  }, [authCodeInput]);

  const resetModalInputs = () => {
    setAuthCodeInput('');
    setSelectedStaffId('');
    setNetworkName('');
    setRevenuePercent('100');
    setChannelCategory('');
    setChannelOrigin('');
    setError(null);
    setEditingChannel(null);
    setIsWaitingForPopup(false);
    processedCodeRef.current = null; // Reset bộ nhớ đệm khi đóng modal
  };

  const exportChannelsToCSV = () => {
    if (filteredChannels.length === 0) return;
    const headers = ["ID Kênh", "Tên Kênh", "Niche", "Người phụ trách", "Mạng (Net)", "Nguồn gốc", "% Chia sẻ", "Kiếm tiền"];
    const rows = filteredChannels.map(c => {
      const staffMember = staff.find(s => s.id === c.assignedStaffId);
      return [c.id, c.name, c.channelCategory || "N/A", staffMember ? staffMember.name : "Unassigned", c.networkName || "None", c.channelOrigin || "N/A", c.revenueSharePercent || 0, c.isMonetized ? "Bật" : "Tắt"];
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `YT_Channels_Team_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOAuthConnect = async () => {
    if (!systemConfig?.clientId) {
      alert(lang === 'vi' ? 'Lỗi: Chưa cấu hình Client ID tại trang Cài đặt' : 'Error: Client ID missing in Settings');
      return;
    }
    try {
      setIsProcessing(true);
      processedCodeRef.current = null; // Reset trước khi mở popup mới
      
      const url = await youtubeService.generateAuthUrl(systemConfig.clientId, 'full');
      
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      window.open(
        url, 
        'GoogleOAuth', 
        `width=${width},height=${height},top=${top},left=${left},status=yes,toolbar=no,menubar=no,location=no`
      );
      
      setIsWaitingForPopup(true);
      setIsProcessing(false);
      
    } catch (err: any) {
      alert(lang === 'vi' ? `Lỗi kết nối: ${err.message}` : `Connection Error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleFinalizeOAuth = async (codeOverride?: string) => {
    const codeToUse = codeOverride || extractedCode;
    
    if (!codeToUse) return;
    
    setIsProcessing(true);
    setIsWaitingForPopup(false);
    setError(null);

    try {
      const tokenData = await youtubeService.exchangeCodeForToken({ code: codeToUse });
      const authorizedChannels = await youtubeService.fetchAuthorizedChannels(tokenData.access_token);
      const channelIds = authorizedChannels.map(c => c.id);

      for (const c of authorizedChannels) {
        await dbService.addChannel({
          ...c,
          assignedStaffId: selectedStaffId || currentUser?.id,
          networkName: networkName,
          revenueSharePercent: parseFloat(revenuePercent) || 100,
          channelCategory: channelCategory,
          channelOrigin: channelOrigin as any
        });
      }

      await dbService.saveAccount({
        email: `OAuth-User-${Date.now()}@gmail.com`,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiryDate: Date.now() + (tokenData.expires_in * 1000)
      }, channelIds);

      dbService.addLog('SUCCESS', `Đã kết nối thành công ${authorizedChannels.length} kênh mới.`);
      setShowAddModal(false);
      resetModalInputs();
      loadData();
    } catch (err: any) {
      console.error("Finalize Error:", err);
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel) return;
    setIsProcessing(true);
    try {
      await dbService.addChannel({
        ...editingChannel,
        assignedStaffId: selectedStaffId,
        networkName: networkName,
        revenueSharePercent: parseFloat(revenuePercent) || 100,
        channelCategory: channelCategory,
        channelOrigin: channelOrigin as any
      });
      setShowAddModal(false);
      resetModalInputs();
      loadData();
    } catch (e) {
      setError("Failed to update channel");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setSelectedStaffId(channel.assignedStaffId || '');
    setNetworkName(channel.networkName || '');
    setRevenuePercent(channel.revenueSharePercent?.toString() || '100');
    setChannelCategory(channel.channelCategory || '');
    setChannelOrigin(channel.channelOrigin || '');
    setShowAddModal(true);
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] min-h-screen text-white font-inter">
      <div className="px-10 py-12 max-w-full mx-auto space-y-16 pb-32">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="text-red-600">
              <Youtube size={64} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-7xl font-black italic uppercase tracking-tighter leading-none">{t.channelManagement}</h1>
              <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.4em] mt-3 italic">Hệ thống kiểm soát đa kênh v4.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={exportChannelsToCSV}
              className="p-6 bg-[#111] border border-white/5 rounded-[28px] text-[#333] hover:text-white transition-all hover:bg-[#161616] group"
            >
              <Download size={24} className="group-active:scale-90" />
            </button>
            {isAdmin && (
              <button
                onClick={() => { setShowAddModal(true); resetModalInputs(); }}
                className="flex items-center gap-4 px-12 py-6 bg-red-600 text-white rounded-[32px] font-black text-[13px] uppercase hover:bg-red-700 shadow-[0_0_60px_rgba(220,38,38,0.4)] transition-all active:scale-95 group"
              >
                <Plus size={24} strokeWidth={4} className="group-hover:rotate-90 transition-transform" />
                {t.addChannel}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-6 bg-[#111] p-6 rounded-[40px] border border-white/5 shadow-2xl">
          <div className="flex-1 flex items-center gap-4 px-6">
            <Search className="text-[#333]" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm kênh theo tên hoặc ID..."
              className="bg-transparent border-none outline-none text-sm font-black text-white w-full uppercase placeholder:text-[#222] italic"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-px h-8 bg-white/5"></div>
          <div className="flex items-center gap-3 px-6">
            <Filter className="text-red-600" size={18} />
            <span className="text-[10px] font-black uppercase text-[#444] tracking-widest italic">Filters Active</span>
          </div>
        </div>

        <div className="bg-[#111] rounded-[48px] border border-white/5 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181818] border-b border-white/5 text-[11px] font-black text-[#444] uppercase tracking-[0.3em]">
                  <th className="px-10 py-10 italic">{t.channelType}</th>
                  <th className="px-8 py-10 text-center italic">{t.staffInCharge}</th>
                  <th className="px-8 py-10 text-center italic">{t.net}</th>
                  <th className="px-8 py-10 text-center italic">{t.origin}</th>
                  <th className="px-8 py-10 text-center italic">{t.revenueShare}</th>
                  <th className="px-8 py-10 text-center italic">{t.monetization}</th>
                  <th className="px-10 py-10 text-right italic">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredChannels.map((channel) => {
                  const assignedStaff = staff.find(s => s.id === channel.assignedStaffId);
                  return (
                    <tr key={channel.id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="relative shrink-0">
                            <img src={channel.thumbnailUrl} className="w-16 h-16 rounded-[24px] bg-black object-cover border border-white/10 shadow-2xl group-hover:border-red-600/50 transition-all" />
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#111] animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-white truncate text-xl uppercase italic tracking-tighter leading-tight group-hover:text-red-600 transition-colors">{channel.name}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-[#333] font-black uppercase tracking-tighter truncate max-w-[100px]">{channel.id}</span>
                              {channel.channelCategory && (
                                <span className="text-[9px] bg-white/5 text-[#555] px-3 py-1 rounded-full font-black uppercase border border-white/5 group-hover:border-white/10">{channel.channelCategory}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        {assignedStaff ? (
                          <div className="flex items-center justify-center gap-3 bg-black/40 px-5 py-2.5 rounded-[20px] border border-white/5 w-fit mx-auto group-hover:border-white/10 transition-all">
                            <img src={assignedStaff.avatarUrl} className="w-6 h-6 rounded-full grayscale group-hover:grayscale-0 transition-all" />
                            <span className="text-[11px] font-black text-white uppercase italic tracking-tight">{assignedStaff.name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#222] font-black uppercase italic tracking-widest">NONE</span>
                        )}
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="text-[13px] font-black text-[#333] group-hover:text-white uppercase tracking-[0.2em] transition-all italic">
                          {channel.networkName || '—'}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        {channel.channelOrigin ? (
                          <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border italic ${channel.channelOrigin === 'COLD' ? 'bg-amber-600/10 text-amber-500 border-amber-600/20' : 'bg-purple-600/10 text-purple-500 border-purple-600/20'}`}>
                            {channel.channelOrigin === 'COLD' ? t.aged : t.managed}
                          </span>
                        ) : <span className="text-[#222]">—</span>}
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-lg font-black tabular-nums text-white italic tracking-tighter">{channel.revenueSharePercent || 0}%</span>
                          <div className="w-20 h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-red-600 shadow-[0_0_10px_#dc2626]" style={{ width: `${channel.revenueSharePercent || 0}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        {channel.isMonetized ? (
                          <div className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-green-600/10 text-green-500 border border-green-600/20 flex items-center justify-center gap-2 mx-auto w-fit shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                            <DollarSign size={16} strokeWidth={3} /> {t.monetizedOn}
                          </div>
                        ) : (
                          <div className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-[#222] border border-white/5 flex items-center justify-center gap-2 mx-auto w-fit">
                            <Ban size={16} strokeWidth={3} /> {t.monetizedOff}
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <Link to={`/channels/${channel.id}`} className="p-4 bg-white/5 hover:bg-white text-[#444] hover:text-black rounded-[20px] transition-all">
                            <ChevronRight size={24} strokeWidth={3} />
                          </Link>
                          {isAdmin && (
                            <>
                              <button onClick={() => handleOpenEdit(channel)} className="p-4 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-[20px] transition-all">
                                <Edit3 size={24} strokeWidth={3} />
                              </button>
                              <button onClick={async () => { if (confirm("Xóa kênh này?")) { await dbService.deleteChannel(channel.id); loadData(); } }} className="p-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-[20px] transition-all">
                                <Trash2 size={24} strokeWidth={3} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredChannels.length === 0 && !isProcessing && (
            <div className="p-32 flex flex-col items-center justify-center grayscale opacity-10 space-y-6">
              <Monitor size={120} strokeWidth={1} />
              <p className="text-3xl font-black italic uppercase tracking-[0.5em]">{t.noData}</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <div className="bg-[#0c0c0c] border border-white/5 rounded-[64px] w-full max-w-4xl overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.8)]">
            <div className="p-16 space-y-12 max-h-[92vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{editingChannel ? `CẬP NHẬT KÊNH` : t.connectNew}</h3>
                  <p className="text-[11px] text-[#444] font-black uppercase tracking-[0.4em] mt-4 italic">{editingChannel ? editingChannel.name : 'Khởi tạo luồng dữ liệu API mới'}</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-4 hover:bg-white/5 rounded-full text-[#333] hover:text-white transition-all"><X size={44} strokeWidth={1.5} /></button>
              </div>

              {!editingChannel && (
                <div className="flex p-2 bg-black/40 rounded-[32px] border border-white/5">
                  <button onClick={() => setAddMode('OAUTH')} className={`flex-1 py-5 rounded-[24px] text-[12px] font-black uppercase italic tracking-widest transition-all ${addMode === 'OAUTH' ? 'bg-red-600 text-white shadow-2xl' : 'text-[#333]'}`}>{t.oauthMode}</button>
                  <button onClick={() => setAddMode('MANUAL')} className={`flex-1 py-5 rounded-[24px] text-[12px] font-black uppercase italic tracking-widest transition-all ${addMode === 'MANUAL' ? 'bg-blue-600 text-white shadow-2xl' : 'text-[#333]'}`}>{t.manualMode}</button>
                </div>
              )}

              <div className="bg-white/5 p-12 rounded-[56px] border border-white/5 space-y-12 shadow-inner">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-black/40 rounded-[20px] flex items-center justify-center text-red-600 border border-white/5"><Settings2 size={28} /></div>
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{t.opInfo}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em] italic ml-6">Phụ trách vận hành</label>
                    <select
                      value={selectedStaffId}
                      onChange={e => setSelectedStaffId(e.target.value)}
                      className="w-full p-6 bg-white rounded-full text-sm font-black text-black outline-none appearance-none cursor-pointer italic"
                    >
                      <option value="">{t.staffPlaceholder}</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em] italic ml-6">Tên Network / Net</label>
                    <input
                      type="text"
                      placeholder={t.netPlaceholder}
                      className="w-full p-6 bg-white rounded-full text-sm font-black text-black outline-none placeholder:text-slate-300 italic"
                      value={networkName}
                      onChange={e => setNetworkName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em] italic ml-6">Phân loại nội dung</label>
                    <select
                      value={channelCategory}
                      onChange={e => setChannelCategory(e.target.value)}
                      className="w-full p-6 bg-white rounded-full text-sm font-black text-black outline-none appearance-none cursor-pointer italic"
                    >
                      <option value="">{t.categoryPlaceholder}</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em] italic ml-6">Nguồn gốc đầu vào</label>
                    <select
                      value={channelOrigin}
                      onChange={e => setChannelOrigin(e.target.value as any)}
                      className="w-full p-6 bg-white rounded-full text-sm font-black text-black outline-none appearance-none cursor-pointer italic"
                    >
                      <option value="">{t.inputTypePlaceholder}</option>
                      <option value="COLD">{t.aged}</option>
                      <option value="NET">{t.managed}</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-[#444] uppercase tracking-[0.3em] italic ml-6">{t.revenuePercentLabel}</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full p-6 bg-white rounded-full text-sm font-black text-black outline-none"
                      value={revenuePercent}
                      onChange={e => setRevenuePercent(e.target.value)}
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">%</span>
                  </div>
                </div>
              </div>

              {editingChannel ? (
                <button onClick={handleUpdateChannel} disabled={isProcessing} className="w-full py-8 bg-white text-black rounded-full font-black text-sm uppercase italic tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Shield size={24} />} {t.save}
                </button>
              ) : (
                addMode === 'OAUTH' ? (
                  <div className="space-y-12">
                    <button
                      type="button"
                      onClick={handleOAuthConnect}
                      disabled={isProcessing || isWaitingForPopup}
                      className="w-full py-8 bg-red-600 text-white rounded-full font-black text-[16px] uppercase italic tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_0_80px_rgba(220,38,38,0.3)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={28} /> : <Zap size={28} strokeWidth={3} />} {t.oauthMode}
                    </button>

                    {isWaitingForPopup && (
                       <div className="flex flex-col items-center gap-4 text-center animate-pulse">
                          <Loader2 size={40} className="text-red-600 animate-spin" />
                          <div>
                            <p className="text-sm font-black text-white uppercase italic tracking-widest">Đang chờ xác thực từ cửa sổ Google...</p>
                            <p className="text-[10px] text-[#555] font-black uppercase tracking-[0.3em] mt-1">Vui lòng không đóng cửa sổ Popup</p>
                          </div>
                       </div>
                    )}

                    {isProcessing && !isWaitingForPopup && (
                       <div className="flex flex-col items-center gap-4 text-center">
                          <Loader2 size={40} className="text-blue-500 animate-spin" />
                          <p className="text-sm font-black text-white uppercase italic tracking-widest">Đang đồng bộ dữ liệu kênh...</p>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="p-16 border-2 border-dashed border-white/5 rounded-[48px] text-center space-y-6 grayscale opacity-20">
                    <AlertTriangle size={64} className="mx-auto text-amber-500" />
                    <p className="font-black uppercase tracking-[0.5em] text-xl italic">Manual Add Mode disabled in Sandbox</p>
                  </div>
                )
              )}

              {error && (
                <div className="p-6 bg-red-600/10 border border-red-600/20 rounded-[32px] animate-bounce">
                  <p className="text-[11px] font-black text-red-500 uppercase text-center italic tracking-widest">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelsPage;