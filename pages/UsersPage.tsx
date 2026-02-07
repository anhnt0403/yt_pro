import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  UserPlus, X, Trash2, Save,
  Table as TableIcon, Calendar, RefreshCw,
  Users as UsersIcon, Edit2, Check,
  Filter, ChevronDown, Camera, Loader2, Trophy, Shield, ShieldCheck,
  Users as GroupIcon, Layers, TrendingUp, BarChart3, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { dbService } from '../services/dbService';
import { youtubeService } from '../services/youtubeService';
import { UserProfile, Channel } from '../types';
import { translations } from '../App';

type MonthlyRevenue = number[];
type YearlyMap = Record<number, MonthlyRevenue>;
type GlobalRevenueMap = Record<string, YearlyMap>;

const UsersPage: React.FC<{ lang: 'vi' | 'en', user: UserProfile }> = ({ lang, user }) => {
  const t = translations[lang];
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  const syncInProgress = useRef(false);

  // PHÂN QUYỀN
  const isAdmin = user.role === 'ADMIN';
  const isLeader = user.role === 'LEADER';
  const isManager = isAdmin || isLeader || user.role === 'USER';

  // Xác định ID của Team mà user này thuộc về (để set mặc định)
  const myTeamId = isLeader ? user.id : (user.leaderId || user.id);

  // Filter State
  // Nếu là Admin -> Mặc định là ALL (So sánh). Nếu không phải Admin -> Mặc định là Team của họ.
  const [activeFilter, setActiveFilter] = useState<string>(isAdmin ? 'ALL' : myTeamId);

  // Chart State
  const [chartFilterMode, setChartFilterMode] = useState<'PERIOD' | 'CUSTOM'>('PERIOD');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState<number | 'ALL'>(new Date().getMonth() + 1);
  const [chartStartDate, setChartStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [chartEndDate, setChartEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [revenueData, setRevenueData] = useState<GlobalRevenueMap>({});
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [editingChannelRevenue, setEditingChannelRevenue] = useState<{ id: string, name: string, data: number[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '', email: '', password: '', role: 'USER', status: 'ACTIVE', avatarUrl: '', leaderId: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uData, cData] = await Promise.all([
        dbService.getUsers(),
        dbService.getChannels()
      ]);
      setStaff(uData);
      setChannels(cData);
    } catch (e) {
      console.error("Load data failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- PHÂN LOẠI DANH SÁCH MENU ---
  
  // 1. Chỉ lấy danh sách Leader (để hiển thị các nút Team)
  const onlyLeaders = useMemo(() => staff.filter(s => s.role === 'LEADER'), [staff]);
  
  // 2. Tìm tài khoản Admin (để hiển thị nút Hệ thống tổng)
  const systemAdmin = useMemo(() => staff.find(s => s.role === 'ADMIN'), [staff]);

  // --- LOGIC HIỂN THỊ ---

  // 1. Label hiển thị
  const currentFilterLabel = useMemo(() => {
    if (activeFilter === 'ALL') return "SO SÁNH CÁC TEAM";
    
    const leader = staff.find(s => s.id === activeFilter);
    if (!leader) return "TEAM";

    if (leader.role === 'ADMIN') {
      return `TOÀN BỘ HỆ THỐNG`;
    }
    
    return `CHI TIẾT TEAM ${leader.name.toUpperCase()}`;
  }, [activeFilter, staff]);

  // 2. Logic lọc danh sách nhân viên hiển thị (Grid Card)
  const filteredStaff = useMemo(() => {
    // MODE: SO SÁNH CÁC TEAM (Chỉ Admin mới thấy mode này)
    if (activeFilter === 'ALL') {
      return onlyLeaders; 
    }

    // MODE: KHI CHỌN 1 NÚT CỤ THỂ
    const currentFilterUser = staff.find(s => s.id === activeFilter);
    
    // Nếu nút được chọn là ADMIN -> Hiện TOÀN BỘ nhân viên
    if (currentFilterUser?.role === 'ADMIN') return staff;

    // Nếu nút được chọn là Leader -> Hiện team của họ
    return staff.filter(s => s.id === activeFilter || s.leaderId === activeFilter);
  }, [staff, activeFilter, onlyLeaders]);


  // --- FETCH DATA ---
  const fetchRevenueForYear = useCallback(async (year: number): Promise<Record<string, number[]>> => {
    let accounts: any[] = [];
    if (isManager) {
      try {
        accounts = await dbService.getGoogleAccounts();
      } catch (e) { console.warn("Google accounts access restricted"); }
    }

    const managedChannels = channels;

    const results = await Promise.all(managedChannels.map(async (channel) => {
      const monthData = Array(12).fill(0);
      try {
        const manualRev = await dbService.getManualRevenue(year, channel.id);
        if (Array.isArray(manualRev)) {
          manualRev.forEach((r: any) => {
            monthData[r.month - 1] = parseFloat(r.amount) || 0;
          });
        }

        if (isManager && accounts.length > 0) {
          const account = accounts.find(a => a.ownedChannelIds?.includes(channel.id));
          if (account && channel.isMonetized) {
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            const report = await youtubeService.fetchDailyRevenue(account.accessToken, channel.id, start, end);
            if (report?.rows) {
              report.rows.forEach((row: any) => {
                const dateVal = new Date(row[0]);
                if (!isNaN(dateVal.getTime())) {
                  const month = dateVal.getMonth();
                  monthData[month] += parseFloat(row[1]) || 0;
                }
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Error on channel ${channel.name}:`, err);
      }
      return { id: channel.id, data: monthData };
    }));

    const yearRevenueMap: Record<string, number[]> = {};
    results.forEach(res => {
      yearRevenueMap[res.id] = res.data;
    });
    return yearRevenueMap;
  }, [channels, isManager]);

  const syncRevenue = useCallback(async () => {
    if (channels.length === 0 || syncInProgress.current) return;
    syncInProgress.current = true;
    setIsSyncing(true);
    try {
      const yearsToFetch = new Set<number>();
      yearsToFetch.add(selectedYear);
      if (chartFilterMode === 'PERIOD') yearsToFetch.add(chartYear);
      else {
        const startY = new Date(chartStartDate).getFullYear();
        const endY = new Date(chartEndDate).getFullYear();
        if (!isNaN(startY) && !isNaN(endY)) {
          for (let y = startY; y <= endY; y++) yearsToFetch.add(y);
        }
      }
      const yearsArray = Array.from(yearsToFetch);
      const yearlyResults = await Promise.all(yearsArray.map(async (year) => {
        const data = await fetchRevenueForYear(year);
        return { year, data };
      }));
      setRevenueData(prev => {
        const nextMap: any = { ...prev };
        yearlyResults.forEach(({ year, data }) => {
          Object.entries(data).forEach(([chId, monthData]) => {
            if (!nextMap[chId]) nextMap[chId] = {};
            nextMap[chId][year] = monthData;
          });
        });
        return nextMap as GlobalRevenueMap;
      });
    } catch (e) {
      console.error("Sync process failed", e);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [selectedYear, chartYear, chartFilterMode, chartStartDate, chartEndDate, fetchRevenueForYear, channels.length]);

  useEffect(() => {
    syncRevenue();
  }, [syncRevenue]);

  // --- LOGIC TÍNH TOÁN QUAN TRỌNG ---
  const getChannelRevenue = (channelId: string, sharePercent: number) => {
    const channelYearlyData = revenueData[channelId] || {};
    const shareRate = (sharePercent || 100) / 100;
    let val = 0;

    if (chartFilterMode === 'PERIOD') {
      const yearData = channelYearlyData[chartYear] || Array(12).fill(0);
      if (chartMonth === 'ALL') val = yearData.reduce((a: number, b: number) => a + b, 0);
      else val = yearData[chartMonth - 1] || 0;
    } else {
      const start = new Date(chartStartDate);
      const end = new Date(chartEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          const y = current.getFullYear();
          const m = current.getMonth();
          val += (channelYearlyData[y]?.[m] || 0);
          current.setMonth(current.getMonth() + 1);
        }
      }
    }
    return val * shareRate;
  };

  // 1. BIỂU ĐỒ: 
  const chartVisualizationData = useMemo(() => {
    let subjects: UserProfile[] = [];

    if (activeFilter === 'ALL') {
      subjects = onlyLeaders; 
    } else {
      subjects = filteredStaff; 
    }

    subjects = subjects.filter(s => s.role !== 'ADMIN');

    return subjects.map(subject => {
      let total = 0;

      if (activeFilter === 'ALL') {
        const teamMembers = staff.filter(s => s.leaderId === subject.id || s.id === subject.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        const teamChannels = channels.filter(c => teamMemberIds.includes(c.assignedStaffId || ''));

        teamChannels.forEach(ch => {
          total += getChannelRevenue(ch.id, ch.revenueSharePercent || 100);
        });

      } else {
        const memberChannels = channels.filter(c => c.assignedStaffId === subject.id);
        memberChannels.forEach(ch => {
          total += getChannelRevenue(ch.id, ch.revenueSharePercent || 100);
        });
      }

      return {
        name: (subject.name.split(' ').pop() || subject.name).toUpperCase(),
        fullName: subject.name,
        displayName: activeFilter === 'ALL' ? `TEAM ${subject.name.split(' ').pop()?.toUpperCase()}` : subject.name,
        revenue: parseFloat(total.toFixed(2))
      };
    }).sort((a, b) => b.revenue - a.revenue);

  }, [activeFilter, filteredStaff, onlyLeaders, channels, revenueData, chartMonth, chartYear, chartFilterMode, chartStartDate, chartEndDate]);


  // 2. BẢNG BÁO CÁO (Table):
  const reportData = useMemo(() => {
    let subjects: UserProfile[] = [];

    if (activeFilter === 'ALL') {
      subjects = onlyLeaders; 
    } else {
      subjects = filteredStaff; 
    }

    subjects = subjects.filter(s => s.role !== 'ADMIN');

    const rows = subjects.map(subject => {
      let targetChannels: Channel[] = [];

      if (activeFilter === 'ALL') {
        const teamMembers = staff.filter(s => s.leaderId === subject.id || s.id === subject.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        targetChannels = channels.filter(c => teamMemberIds.includes(c.assignedStaffId || ''));
      } else {
        targetChannels = channels.filter(c => c.assignedStaffId === subject.id);
      }

      const monthlyNetTotals = Array.from({ length: 12 }, (_, monthIdx) => {
        return targetChannels.reduce((sum, ch) => {
          const rawRev = revenueData[ch.id]?.[selectedYear]?.[monthIdx] || 0;
          const shareRate = (ch.revenueSharePercent || 100) / 100;
          return sum + (rawRev * shareRate);
        }, 0);
      });

      const yearlyNetTotal = monthlyNetTotals.reduce((a, b) => a + b, 0);

      return {
        id: subject.id,
        name: activeFilter === 'ALL' ? `TEAM ${subject.name.toUpperCase()}` : subject.name,
        isTeamRow: activeFilter === 'ALL',
        monthlyNetTotals,
        yearlyNetTotal,
        channels: activeFilter === 'ALL' ? [] : targetChannels
      };
    });

    const systemMonthlyTotals = Array.from({ length: 12 }, (_, monthIdx) => {
      return rows.reduce((sum, row) => sum + row.monthlyNetTotals[monthIdx], 0);
    });

    return {
      rows,
      systemMonthlyTotals,
      systemYearlyTotal: systemMonthlyTotals.reduce((a, b) => a + b, 0)
    };
  }, [activeFilter, filteredStaff, onlyLeaders, channels, revenueData, selectedYear, staff]);

  const formatMoney = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ... (Phần Modal giữ nguyên) ...
  const handleOpenModal = (member?: UserProfile) => {
    if (!isAdmin && !isLeader) return;
    if (member) {
      setEditingStaff(member);
      setFormData({ ...member, password: '', leaderId: member.leaderId || '' });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', email: '', password: '', role: 'USER', status: 'ACTIVE', avatarUrl: '', leaderId: isLeader ? user.id : '' });
    }
    setShowModal(true);
  };
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { ...formData };
      payload.avatarUrl = formData.avatarUrl || `https://i.pravatar.cc/150?u=${formData.email}`;
      if (isLeader && !isAdmin) { payload.role = 'USER'; payload.leaderId = user.id; }
      if (!payload.password) delete payload.password;
      if (editingStaff) await dbService.updateUser(editingStaff.id, payload);
      else await dbService.addUser(payload);
      setShowModal(false);
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };
  const handleDelete = async (id: string) => {
    if (!isAdmin && !isLeader) return;
    if (!confirm("Xóa nhân sự này?")) return;
    await dbService.deleteUser(id);
    loadData();
  };
  const handleOpenRevenueEdit = (channel: Channel) => {
    if (!isManager) return;
    const currentData = revenueData[channel.id]?.[selectedYear] || Array(12).fill(0);
    setEditingChannelRevenue({ id: channel.id, name: channel.name, data: [...currentData] });
    setShowRevenueModal(true);
  };
  const saveManualRevenue = async () => {
    if (!editingChannelRevenue || !isManager) return;
    setLoading(true);
    try {
      await dbService.updateChannelRevenue(editingChannelRevenue.id, selectedYear, editingChannelRevenue.data);
      setShowRevenueModal(false);
      setEditingChannelRevenue(null);
      syncRevenue();
    } catch (e) { alert("Lỗi lưu doanh thu"); }
    finally { setLoading(false); }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size < 2 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full bg-[#0a0a0a] min-h-screen text-white font-inter">
      <div className="w-full px-4 md:px-10 py-8 md:py-12 mx-auto space-y-10 md:space-y-16 pb-32">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-red-600"><UsersIcon size={32} strokeWidth={2.5} className="md:w-11 md:h-11" /></div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">{t.staffTeam}</h1>
              <p className="text-[#444] font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em] mt-2 italic">{t.staffNote}</p>
            </div>
          </div>
          {(isAdmin || isLeader) && (
            <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-3 px-8 py-4 md:px-10 md:py-5 bg-red-600 text-white rounded-[24px] font-black text-[11px] md:text-[12px] uppercase hover:bg-red-700 shadow-[0_0_50px_rgba(220,38,38,0.4)] transition-all active:scale-95 group w-full md:w-auto">
              <UserPlus size={20} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
              {t.addStaff}
            </button>
          )}
        </div>

        {/* NAVIGATION / FILTER BAR */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 md:mx-0 md:px-0">
          
          {/* Nút SO SÁNH CÁC TEAM - CHỈ ADMIN MỚI THẤY */}
          {isAdmin && (
            <>
              <button onClick={() => setActiveFilter('ALL')} className={`px-6 md:px-10 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] whitespace-nowrap font-black uppercase tracking-widest transition-all border shrink-0 italic ${activeFilter === 'ALL' ? 'bg-red-600 border-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'bg-white/5 border-white/5 text-[#444] hover:text-white'}`}>
                SO SÁNH CÁC TEAM
              </button>
              <div className="w-px h-6 bg-white/10 mx-2 shrink-0 hidden md:block"></div>
            </>
          )}
          
          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-[#222] italic mr-4 shrink-0">
            <Layers size={14} /> <span className="hidden md:inline">Chi tiết Team:</span>
          </div>
          
          {/* DANH SÁCH LEADER */}
          {onlyLeaders.map(leader => {
            // Nếu là Admin thì hiện hết. Nếu không phải Admin thì chỉ hiện tab của chính họ
            if (!isAdmin && leader.id !== myTeamId) return null;

            return (
              <button key={leader.id} onClick={() => setActiveFilter(leader.id)} className={`px-6 md:px-8 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] whitespace-nowrap font-black uppercase tracking-widest transition-all border shrink-0 italic flex items-center gap-3 ${activeFilter === leader.id ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/5 text-[#444] hover:text-white'}`}>
                <img src={leader.avatarUrl || `https://i.pravatar.cc/150?u=${leader.id}`} className="w-5 h-5 rounded-full object-cover grayscale" />
                {leader.name}
              </button>
            )
          })}

          {/* NÚT HỆ THỐNG TOÀN BỘ (ADMIN) - CHỈ ADMIN MỚI THẤY */}
          {isAdmin && systemAdmin && (
             <button onClick={() => setActiveFilter(systemAdmin.id)} className={`ml-4 px-6 md:px-8 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] whitespace-nowrap font-black uppercase tracking-widest transition-all border shrink-0 italic flex items-center gap-3 ${activeFilter === systemAdmin.id ? 'bg-[#333] border-[#333] text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 text-[#444] hover:text-white'}`}>
               <img src={systemAdmin.avatarUrl || `https://i.pravatar.cc/150?u=${systemAdmin.id}`} className="w-5 h-5 rounded-full object-cover grayscale" />
               {systemAdmin.name} (HỆ THỐNG)
             </button>
          )}

        </div>

        {/* STAFF GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-8">
          {filteredStaff.map(member => (
            <div key={member.id} className="bg-[#111] rounded-[32px] md:rounded-[48px] border border-white/5 p-6 md:p-10 space-y-6 md:space-y-8 flex flex-col shadow-2xl group hover:border-red-600/30 transition-all hover:-translate-y-2">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#1a1a1a] border-2 border-white/5 overflow-hidden shadow-2xl relative shrink-0">
                  <img src={member.avatarUrl || `https://i.pravatar.cc/150?u=${member.id}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                  {member.role === 'LEADER' && <div className="absolute top-0 right-0 bg-blue-600 p-1 rounded-full border-2 border-[#111]"><Shield size={10} className="text-white" /></div>}
                  {member.role === 'ADMIN' && <div className="absolute top-0 right-0 bg-red-600 p-1 rounded-full border-2 border-[#111]"><ShieldCheck size={10} className="text-white" /></div>}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg md:text-xl font-black italic text-white uppercase tracking-tight truncate leading-none">{member.name}</h3>
                  <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic ${member.role === 'ADMIN' ? 'text-red-500' : member.role === 'LEADER' ? 'text-blue-500' : 'text-slate-500'}`}>{member.role}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 md:space-y-4">
                <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#222]"><span>Kênh phụ trách</span><span className="text-white">{(channels.filter(c => c.assignedStaffId === member.id)).length}</span></div>
                <div className="flex items-center justify-between text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#222]"><span>Trạng thái</span><span className={member.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}>{member.status}</span></div>
              </div>
              {(isAdmin || (isLeader && member.leaderId === user.id)) && member.id !== user.id && (
                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <button onClick={() => handleOpenModal(member)} className="flex-1 py-3 md:py-4 rounded-2xl bg-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 text-white/60">Thiết lập</button>
                  <button onClick={() => handleDelete(member.id)} className="p-3 md:p-4 rounded-2xl bg-white/5 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                </div>
              )}
              {member.id === user.id && (
                <div className="flex items-center justify-center pt-6 border-t border-white/5">
                  <span className="text-[9px] font-black uppercase text-[#222] italic tracking-[0.3em]">Cá nhân (Bạn)</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* VISUALIZATION SECTION */}
        <div className="pt-10 md:pt-16 border-t border-white/5 space-y-8 md:space-y-12">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-red-600"><TrendingUp size={36} strokeWidth={2.5} /></div>
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">PHÂN TÍCH: {currentFilterLabel}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex bg-[#111] p-1.5 rounded-full border border-white/5">
                <button onClick={() => setChartFilterMode('PERIOD')} className={`px-6 md:px-8 py-3 rounded-full text-[10px] font-black uppercase italic ${chartFilterMode === 'PERIOD' ? 'bg-white text-black' : 'text-[#444]'}`}>Định kỳ</button>
                <button onClick={() => setChartFilterMode('CUSTOM')} className={`px-6 md:px-8 py-3 rounded-full text-[10px] font-black uppercase italic ${chartFilterMode === 'CUSTOM' ? 'bg-white text-black' : 'text-[#444]'}`}>Tùy chỉnh</button>
              </div>
              {chartFilterMode === 'PERIOD' ? (
                <div className="flex items-center gap-3 bg-[#111] px-6 py-3 rounded-full border border-white/5 shadow-2xl">
                  <select value={chartYear} onChange={e => setChartYear(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black text-white outline-none uppercase italic cursor-pointer">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#111]">{y}</option>)}
                  </select>
                  <div className="w-px h-4 bg-white/10 mx-2"></div>
                  <select value={chartMonth} onChange={e => setChartMonth(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))} className="bg-transparent text-[11px] font-black text-white outline-none uppercase italic cursor-pointer">
                    <option value="ALL" className="bg-[#111]">Toàn năm</option>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1} className="bg-[#111]">Tháng {i + 1}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3 md:gap-6 bg-[#111] px-4 md:px-8 py-3 rounded-[24px] border border-white/5 shadow-2xl">
                  <input type="date" value={chartStartDate} onChange={e => setChartStartDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} className="bg-transparent text-[13px] font-black text-white outline-none uppercase italic cursor-pointer [color-scheme:dark] w-28 md:w-auto" />
                  <ArrowRight size={20} className="text-[#222]" />
                  <input type="date" value={chartEndDate} onChange={e => setChartEndDate(e.target.value)} onClick={(e) => e.currentTarget.showPicker()} className="bg-transparent text-[13px] font-black text-white outline-none uppercase italic cursor-pointer [color-scheme:dark] w-28 md:w-auto" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-white/5 rounded-[32px] md:rounded-[48px] p-4 md:p-12 shadow-2xl min-h-[350px]">
            {loading || isSyncing ? (
              <div className="h-[350px] flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 size={48} className="animate-spin text-red-600" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] italic">Đang đồng bộ dữ liệu hạ tầng...</p>
              </div>
            ) : chartVisualizationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartVisualizationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="displayName" axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 10, fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 10, fontWeight: 900 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      backgroundColor: '#0f0f0f',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{
                      color: '#4ade80',
                      textShadow: '0 0 15px rgba(74, 222, 128, 0.6)',
                      fontSize: '14px',
                      fontWeight: '900',
                      fontStyle: 'italic',
                      textTransform: 'uppercase'
                    }}
                    labelStyle={{
                      color: '#666',
                      fontSize: '10px',
                      fontWeight: '900',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'DOANH THU']}
                  />
                  <Bar dataKey="revenue" radius={[12, 12, 0, 0]} barSize={60}>
                    {chartVisualizationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : index < 3 ? '#991b1b' : '#1a1a1a'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[350px] flex items-center justify-center opacity-10 uppercase text-2xl font-black italic tracking-widest">No Data Available</div>}
          </div>
        </div>

        {/* REVENUE REPORT TABLE */}
        <div className="space-y-8 md:space-y-10 pt-10 md:pt-16 border-t border-white/5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">BÁO CÁO: {currentFilterLabel}</h2>
            <div className="flex items-center gap-4">
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-[#111] px-6 py-4 rounded-[24px] border border-white/5 text-[13px] font-black text-white uppercase cursor-pointer">
                {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#111]">{y}</option>)}
              </select>
              <button onClick={syncRevenue} className={`p-5 bg-[#111] border border-white/5 rounded-[24px] ${isSyncing ? 'animate-spin text-red-600' : 'text-[#444]'}`}><RefreshCw size={24} /></button>
            </div>
          </div>

          <div className="w-full bg-[#0c0c0c] border border-white/5 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[2000px] w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[#161616] text-white font-black text-[11px] uppercase tracking-[0.2em] border-b border-white/10">
                    <th className="px-6 md:px-10 py-14 text-left sticky left-0 bg-[#161616] z-10 italic">
                      {activeFilter === 'ALL' ? 'TEAM / ' : 'NHÂN SỰ / '} {selectedYear}
                    </th>
                    {Array.from({ length: 12 }).map((_, i) => <th key={i} className="px-6 py-14 italic">Tháng {i + 1}</th>)}
                    <th className="px-12 py-14 bg-red-600 text-white font-black text-4xl italic shadow-2xl">TOTAL NET</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-[#1a1a1a] border-b-4 border-red-600/20 z-20 relative">
                    <td className="px-6 md:px-10 py-8 text-left sticky left-0 bg-[#1a1a1a] z-30 font-black italic text-lg md:text-xl text-red-500 uppercase tracking-widest shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
                      {activeFilter === 'ALL' ? 'TỔNG TOÀN HỆ THỐNG' : `TỔNG TEAM`}
                    </td>
                    {reportData.systemMonthlyTotals.map((val, i) => (
                      <td key={i} className="px-6 py-8 border-r border-white/5 font-black italic text-xl tabular-nums text-white">
                        {val > 0 ? formatMoney(val) : '-'}
                      </td>
                    ))}
                    <td className="px-10 py-8 bg-red-600 text-white font-black text-3xl italic shadow-2xl tracking-tighter tabular-nums">
                      {formatMoney(reportData.systemYearlyTotal)}
                    </td>
                  </tr>

                  {reportData.rows.map(row => (
                    <React.Fragment key={row.id}>
                      <tr className="bg-white/[0.03] border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 md:px-10 py-12 text-left sticky left-0 bg-[#121212] z-10 font-black italic text-2xl md:text-3xl text-white uppercase tracking-tighter">
                          {row.name}
                        </td>
                        {row.monthlyNetTotals.map((val: number, i: number) => (
                          <td key={i} className={`px-6 py-12 border-r border-white/5 tabular-nums italic text-lg ${val > 0 ? 'text-[#3ea6ff]' : 'text-[#222]'}`}>{formatMoney(val)}</td>
                        ))}
                        <td className="px-10 py-12 bg-white/5 font-black text-3xl text-white tabular-nums italic">{formatMoney(row.yearlyNetTotal)}</td>
                      </tr>

                      {/* Chỉ hiển thị kênh chi tiết nếu KHÔNG phải chế độ so sánh Team */}
                      {!row.isTeamRow && row.channels.map((channel: Channel) => {
                        const chData = revenueData[channel.id]?.[selectedYear] || Array(12).fill(0);
                        const shareRate = (channel.revenueSharePercent || 100) / 100;
                        return (
                          <tr key={channel.id} className="border-b border-white/5 group hover:bg-white/[0.02]">
                            <td className="px-6 md:px-10 py-6 text-left sticky left-0 bg-[#0c0c0c] z-10 italic text-sm text-[#555] group-hover:text-white uppercase font-black tracking-widest pl-16">
                              ↳ {channel.name}
                            </td>
                            {chData.map((v: number, i: number) => (
                              <td key={i} className="px-6 py-6 border-r border-white/5 text-white italic font-black text-xs">{(v * shareRate) > 0 ? formatMoney(v * shareRate) : ''}</td>
                            ))}
                            <td className="px-10 py-6 bg-white/[0.01] text-right">
                              {isManager && <button onClick={() => handleOpenRevenueEdit(channel)} className="p-3 text-[#111] hover:text-[#3ea6ff] transition-all"><Edit2 size={16} /></button>}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SỬA/XÓA NHÂN SỰ */}
      {showModal && isManager && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-[#0c0c0c] border-t md:border border-white/5 w-full md:max-w-4xl rounded-t-[32px] md:rounded-[40px] overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 md:p-12 pb-6 flex items-center justify-between shrink-0">
              <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{editingStaff ? 'CẬP NHẬT' : 'THÊM MỚI'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-[#333] hover:text-white transition-all"><X size={32} md:size={44} strokeWidth={1.5} /></button>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 md:p-12 pt-0 space-y-8 md:space-y-12 no-scrollbar">
              <div className="flex flex-col items-center gap-6 pb-6 border-b border-white/5">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#1a1a1a] border-4 border-white/5 overflow-hidden shadow-2xl relative">
                    <img src={formData.avatarUrl || `https://i.pravatar.cc/150?u=${formData.email || 'placeholder'}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Preview" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-2 rounded-full border-2 border-[#0c0c0c]"><Camera size={14} strokeWidth={3} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-[#444] ml-6 italic">Họ và Tên</label>
                  <input type="text" placeholder="Họ và Tên" className="w-full py-4 md:py-6 px-6 md:px-10 bg-white rounded-full text-base md:text-lg font-black text-black outline-none italic" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-[#444] ml-6 italic">Tài khoản đăng nhập</label>
                  <input type="text" placeholder="Username / Email" className="w-full py-4 md:py-6 px-6 md:px-10 bg-white rounded-full text-base md:text-lg font-black text-black outline-none italic" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-[#444] ml-6 italic">Vị trí đảm nhiệm</label>
                  <select
                    disabled={isLeader && !isAdmin}
                    className="w-full py-4 md:py-6 px-6 md:px-10 bg-white rounded-full text-base md:text-lg font-black text-black outline-none appearance-none cursor-pointer italic"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  >
                    <option value="USER">{t.user}</option>
                    <option value="LEADER">{t.leader}</option>
                    <option value="ADMIN">{t.admin}</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-[#444] ml-6 italic">Người quản lý trực tiếp</label>
                  <select
                    disabled={!isAdmin}
                    className="w-full py-4 md:py-6 px-6 md:px-10 bg-white rounded-full text-base md:text-lg font-black text-black outline-none appearance-none cursor-pointer italic"
                    value={formData.leaderId}
                    onChange={e => setFormData({ ...formData, leaderId: e.target.value })}
                  >
                    {isAdmin ? (
                      <>
                        <option value="">-- Hệ thống Core --</option>
                        {/* Lưu ý: Dùng onlyLeaders ở đây nếu muốn chỉ hiện Leader, hoặc giữ logic cũ */}
                        {staff.filter(s => s.role === 'LEADER' || s.role === 'ADMIN').map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.role})</option>
                        ))}
                      </>
                    ) : (
                      <option value={user.id}>{user.name} (Tôi)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-[#444] ml-6 italic">Mật khẩu mới (Bỏ trống nếu giữ nguyên)</label>
                  <input type="password" placeholder="••••••••" className="w-full py-4 md:py-6 px-6 md:px-10 bg-white rounded-full text-base md:text-lg font-black text-black outline-none italic" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              </div>

              <div className="p-6 md:p-12 border-t border-white/5 flex items-center justify-between shrink-0 mb-safe">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 md:px-10 py-4 md:py-6 text-[12px] md:text-[14px] font-black uppercase text-[#444] hover:text-white transition-all italic">BỎ QUA</button>
                <button type="submit" disabled={loading} className="px-8 md:px-14 py-4 md:py-6 bg-red-600 text-white rounded-full text-[12px] md:text-[14px] font-black uppercase shadow-2xl flex items-center gap-3 transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={24} />} LƯU THAY ĐỔI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA DOANH THU */}
      {showRevenueModal && editingChannelRevenue && isManager && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[200] flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl rounded-[32px] md:rounded-[64px] overflow-hidden flex flex-col h-[85vh]">
            <div className="p-6 md:p-12 border-b border-white/5 flex items-center justify-between">
              <div><h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Doanh thu thủ công</h2></div>
              <button onClick={() => setShowRevenueModal(false)} className="p-2 md:p-4 text-[#333] hover:text-white transition-all"><X size={32} md:size={44} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 no-scrollbar">
              {editingChannelRevenue.data.map((val, idx) => (
                <div key={idx} className="bg-[#141414] p-4 md:p-8 rounded-[24px] md:rounded-[40px] border border-white/5 space-y-2 md:space-y-4">
                  <label className="text-[10px] md:text-[11px] font-black text-[#333] uppercase italic">Tháng {idx + 1}</label>
                  <input type="number" className="bg-black/40 p-4 md:p-6 rounded-[16px] md:rounded-[24px] border border-white/5 outline-none text-base md:text-lg font-black text-white w-full italic" value={val || ''} placeholder="0.00" onChange={(e) => {
                    const newData = [...editingChannelRevenue.data];
                    newData[idx] = parseFloat(e.target.value) || 0;
                    setEditingChannelRevenue({ ...editingChannelRevenue, data: newData });
                  }} />
                </div>
              ))}
            </div>
            <div className="p-6 md:p-12 border-t border-white/5 flex gap-4 md:gap-8 bg-[#0c0c0c]">
              <button onClick={() => setShowRevenueModal(false)} className="flex-1 py-4 md:py-8 rounded-full font-black uppercase text-[#444] hover:text-white">Hủy bỏ</button>
              <button onClick={saveManualRevenue} disabled={loading} className="flex-1 py-4 md:py-8 bg-amber-600 text-white rounded-full font-black uppercase flex items-center justify-center gap-4 shadow-2xl transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <Check size={24} />} Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;