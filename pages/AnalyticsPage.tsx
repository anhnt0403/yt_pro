
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  RefreshCw,
  Activity,
  Eye,
  Loader2,
  Table,
  Download,
  Calendar as CalendarIcon,
  ChevronDown,
  Trophy,
  Crown,
  Medal
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { dbService } from '../services/dbService';
import { youtubeService } from '../services/youtubeService';
import { translations } from '../App';
import { UserProfile } from '../types';

interface ChannelStat {
  id: string;
  name: string;
  niche: string;
  thumbnail: string;
  revenue: number;
  views: number;
  isMonetized: boolean;
}

const AnalyticsPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyticsMetric, setAnalyticsMetric] = useState<'views' | 'revenue'>('views');
  const [apiStats, setApiStats] = useState<any[]>([]);
  const [channelStatsList, setChannelStatsList] = useState<ChannelStat[]>([]);
  const [statsSummary, setStatsSummary] = useState({
    totalRevenue: 0,
    totalViews: 0,
    monetizedChannels: 0,
    totalAccounts: 0
  });

  const currentUser = dbService.getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
  const maxDateStr = twoDaysAgo.toISOString().split('T')[0];

  const [filterMode, setFilterMode] = useState<'PERIOD' | 'CUSTOM'>('PERIOD');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonth);
  const [customStart, setCustomStart] = useState(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(maxDateStr);

  const dateRange = useMemo(() => {
    let start, end;
    if (filterMode === 'PERIOD') {
      if (selectedMonth === 'ALL') {
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
      } else {
        const monthStr = selectedMonth.toString().padStart(2, '0');
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        start = `${selectedYear}-${monthStr}-01`;
        end = `${selectedYear}-${monthStr}-${lastDay}`;
      }
    } else {
      start = customStart;
      end = customEnd;
    }
    return { start, end };
  }, [filterMode, selectedYear, selectedMonth, customStart, customEnd]);

  const fetchRealAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [accounts, allChannels, staff] = await Promise.all([
        dbService.getGoogleAccounts(),
        dbService.getChannels(),
        dbService.getUsers()
      ]);
      
      const visibleStaffIds = new Set(staff.map(s => s.id));
      
      // 1. Lọc danh sách kênh theo team
      let teamChannels = allChannels;
      if (!isAdmin) {
        teamChannels = allChannels.filter(c => c.assignedStaffId && visibleStaffIds.has(c.assignedStaffId));
      }
      
      const teamChannelIds = new Set(teamChannels.map(c => c.id));

      // 2. Lọc danh sách tài khoản chỉ bao gồm những tài khoản sở hữu kênh trong team
      const teamAccounts = accounts.filter(acc => 
        acc.ownedChannelIds && acc.ownedChannelIds.some(cid => teamChannelIds.has(cid))
      );

      if (teamAccounts.length === 0 && teamChannels.length === 0) {
        setError(lang === 'vi' ? "Không có dữ liệu kênh/tài khoản trong team" : "No channel/account data in your team");
        setLoading(false);
        return;
      }

      const aggregatedDaily = new Map<string, { revenue: number, views: number }>();
      const perChannelMap = new Map<string, ChannelStat>();
      let grandTotalRevenue = 0;
      let grandTotalViews = 0;

      for (const account of teamAccounts) {
        if (!account.accessToken || !account.ownedChannelIds) continue;
        
        for (const channelId of account.ownedChannelIds) {
          // Chỉ lấy dữ liệu cho những kênh thuộc team
          if (!teamChannelIds.has(channelId)) continue;
          
          const channelInfo = teamChannels.find(c => c.id === channelId);
          if (!channelInfo) continue;

          if (!perChannelMap.has(channelId)) {
            perChannelMap.set(channelId, {
              id: channelId,
              name: channelInfo.name,
              niche: channelInfo.channelCategory || 'N/A',
              thumbnail: channelInfo.thumbnailUrl || '',
              revenue: 0,
              views: 0,
              isMonetized: !!channelInfo.isMonetized
            });
          }
          
          try {
            let report;
            if (channelInfo.isMonetized) {
              report = await youtubeService.fetchDailyRevenue(account.accessToken, channelId, dateRange.start, dateRange.end);
            } else {
              report = await youtubeService.fetchDailyBasicStats(account.accessToken, channelId, dateRange.start, dateRange.end);
            }

            if (report && report.rows) {
              const currentStat = perChannelMap.get(channelId)!;
              
              report.rows.forEach((row: any) => {
                const date = row[0];
                let rev = 0;
                let vws = 0;
                
                if (channelInfo.isMonetized) {
                  rev = parseFloat(row[1]) || 0;
                  vws = parseInt(row[2]) || 0;
                } else {
                  vws = parseInt(row[1]) || 0;
                }

                const existing = aggregatedDaily.get(date) || { revenue: 0, views: 0 };
                aggregatedDaily.set(date, { 
                  revenue: existing.revenue + rev, 
                  views: existing.views + vws 
                });
                
                currentStat.revenue += rev;
                currentStat.views += vws;
                
                grandTotalRevenue += rev;
                grandTotalViews += vws;
              });
            }
          } catch (channelErr) {
            console.warn(`Error fetching for channel ${channelId}:`, channelErr);
          }
        }
      }

      const chartData = Array.from(aggregatedDaily.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const tableData = Array.from(perChannelMap.values())
        .sort((a, b) => b.revenue - a.revenue || b.views - a.views);

      setApiStats(chartData);
      setChannelStatsList(tableData);
      setStatsSummary({
        totalRevenue: grandTotalRevenue,
        totalViews: grandTotalViews,
        monetizedChannels: tableData.filter(c => c.isMonetized).length,
        totalAccounts: teamAccounts.length
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, lang, isAdmin]);

  useEffect(() => { 
    fetchRealAnalytics(); 
  }, [fetchRealAnalytics]);

  const top10Channels = useMemo(() => {
    return channelStatsList.slice(0, 10);
  }, [channelStatsList]);

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportToCSV = () => {
    if (channelStatsList.length === 0) return;
    const headers = ["Thứ tự", "ID Kênh", "Tên Kênh", "Niche", "Doanh thu", "Lượt xem", "Trạng thái"];
    const rows = channelStatsList.map((c, i) => [
      i + 1, 
      c.id, 
      c.name, 
      c.niche, 
      c.revenue.toFixed(2), 
      c.views, 
      c.isMonetized ? "Bật" : "Tắt"
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `YTManager_Analytics_Team_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-8 bg-[#0a0a0a] min-h-screen text-white pb-24">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
             <div className="text-red-600"><Activity size={32} strokeWidth={3} /></div>
             <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t.analyticsSystem}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-11">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
             <p className="text-[10px] text-[#555] font-black uppercase tracking-widest italic">Dữ liệu Team ({statsSummary.totalAccounts} tài khoản)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#111] p-1 rounded-full border border-white/5">
             <button onClick={() => setFilterMode('PERIOD')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all ${filterMode === 'PERIOD' ? 'bg-white text-black' : 'text-[#555] hover:text-white'}`}>{t.periodic}</button>
             <button onClick={() => setFilterMode('CUSTOM')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase transition-all ${filterMode === 'CUSTOM' ? 'bg-white text-black' : 'text-[#555] hover:text-white'}`}>{t.custom}</button>
          </div>
          <div className="flex items-center gap-3 bg-[#111] px-4 py-2 rounded-2xl border border-white/5">
             <CalendarIcon size={16} className="text-[#444]" />
             <div className="flex items-center gap-2">
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black text-white outline-none">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#111]">{y}</option>)}
                </select>
                <ChevronDown size={12} className="text-[#444]" />
             </div>
             <div className="w-px h-4 bg-white/10 mx-1"></div>
             <div className="flex items-center gap-2">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))} className="bg-transparent text-[11px] font-black text-white outline-none uppercase">
                  <option value="ALL" className="bg-[#111]">Tất cả</option>
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1} className="bg-[#111]">Tháng {i+1}</option>)}
                </select>
                <ChevronDown size={12} className="text-[#444]" />
             </div>
          </div>
          <button onClick={fetchRealAnalytics} className="p-3 bg-[#111] border border-white/5 rounded-full text-[#555] hover:text-white transition-all">
             <RefreshCw size={20} className={loading ? 'animate-spin text-red-600' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#111] p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group">
          <p className="text-[10px] text-[#444] font-black uppercase mb-3 tracking-[0.2em]">TEAM REVENUE</p>
          <h2 className="text-5xl font-black text-green-500 tabular-nums tracking-tighter">{formatCurrency(statsSummary.totalRevenue)}</h2>
        </div>
        <div className="bg-[#111] p-8 rounded-[40px] border border-white/5 shadow-2xl">
          <p className="text-[10px] text-[#444] font-black uppercase mb-3 tracking-[0.2em]">TEAM VIEWS (API)</p>
          <div className="flex items-end gap-2">
             <h2 className="text-5xl font-black text-white tabular-nums tracking-tighter">{statsSummary.totalViews.toLocaleString()}</h2>
             <div className="mb-2 text-[#444]"><Eye size={20} /></div>
          </div>
        </div>
        <div className="bg-[#111] p-8 rounded-[40px] border border-white/5 shadow-2xl">
          <p className="text-[10px] text-[#444] font-black uppercase mb-3 tracking-[0.2em]">MONETIZED NODES</p>
          <div className="flex items-end gap-3">
             <h2 className="text-5xl font-black text-blue-500 tabular-nums tracking-tighter">{statsSummary.monetizedChannels}</h2>
             <span className="mb-2 text-[10px] text-[#333] font-black uppercase">TEAM ACTIVE</span>
          </div>
        </div>
        <div className="bg-[#111] p-8 rounded-[40px] border border-white/5 shadow-2xl">
          <p className="text-[10px] text-[#444] font-black uppercase mb-3 tracking-[0.2em]">SYNC QUALITY</p>
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">HIGH SPEED</h2>
             </div>
             <p className="text-[9px] text-[#333] font-black uppercase tracking-widest">YOUTUBE REPORTING V2</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#111] rounded-[48px] border border-white/5 p-12 shadow-2xl min-h-[550px] flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-blue-500" size={28} />
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t.chartTitle}</h3>
              </div>
              <p className="text-[10px] text-[#444] font-black uppercase tracking-widest mt-1 ml-10">
                {filterMode === 'PERIOD' ? (selectedMonth === 'ALL' ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`) : `Từ ${dateRange.start} đến ${dateRange.end}`}
              </p>
            </div>
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
              <button onClick={() => setAnalyticsMetric('views')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${analyticsMetric === 'views' ? 'bg-[#3ea6ff] text-white shadow-lg' : 'text-[#444] hover:text-white'}`}>VIEWS</button>
              <button onClick={() => setAnalyticsMetric('revenue')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${analyticsMetric === 'revenue' ? 'bg-green-600 text-white shadow-lg' : 'text-[#444] hover:text-white'}`}>REVENUE</button>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                <Loader2 size={48} className="animate-spin text-red-600" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em]">Syncing Team Matrix...</p>
              </div>
            ) : apiStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apiStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={analyticsMetric === 'revenue' ? '#16a34a' : '#3ea6ff'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={analyticsMetric === 'revenue' ? '#16a34a' : '#3ea6ff'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#222', fontSize: 10, fontWeight: 900}} tickFormatter={(v) => v.split('-').reverse().slice(0, 2).join('/')} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#222', fontSize: 10, fontWeight: 900}} />
                  <Tooltip contentStyle={{backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px'}} labelStyle={{color: '#666', fontWeight: 900, marginBottom: '8px'}} itemStyle={{fontWeight: 900, textTransform: 'uppercase'}} />
                  <Area type="monotone" dataKey={analyticsMetric} stroke={analyticsMetric === 'revenue' ? '#16a34a' : '#3ea6ff'} fill="url(#colorMetric)" strokeWidth={4} animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-5">
                {error ? <p className="text-red-500 font-bold uppercase">{error}</p> : <Activity size={100} />}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#111] rounded-[48px] border border-white/5 p-10 shadow-2xl flex flex-col">
           <div className="flex items-center gap-4 mb-8">
              <Trophy size={28} className="text-amber-500" strokeWidth={2.5} />
              <div className="flex flex-col">
                 <h3 className="text-xl font-black text-white italic uppercase tracking-tighter leading-tight">Top Team Performance</h3>
                 <p className="text-[9px] text-[#444] font-black uppercase tracking-widest mt-0.5">Xếp hạng thực tế theo kỳ lọc</p>
              </div>
           </div>

           <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-1">
              {top10Channels.length > 0 ? top10Channels.map((c, idx) => (
                <div key={c.id} className="group flex items-center gap-4 bg-black/20 p-4 rounded-[28px] border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.02]">
                   <div className="relative shrink-0">
                      <img src={c.thumbnail} className="w-12 h-12 rounded-full object-cover border border-white/10 group-hover:border-white/20" />
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-black shadow-xl ${
                        idx === 0 ? 'bg-red-600 text-white' : 
                        idx === 1 ? 'bg-orange-500 text-white' : 
                        idx === 2 ? 'bg-amber-500 text-white' : 
                        'bg-slate-800 text-slate-400'
                      }`}>
                         {idx + 1}
                      </div>
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-white truncate uppercase italic tracking-tight">{c.name}</p>
                      <p className="text-[9px] text-[#444] font-black uppercase mt-0.5 tracking-widest">{c.niche}</p>
                   </div>
                   <div className="text-right">
                      <p className={`text-[13px] font-black tabular-nums tracking-tighter ${idx < 3 ? 'text-green-500' : 'text-white/60'}`}>
                        {formatCurrency(c.revenue)}
                      </p>
                   </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4 uppercase text-[10px] font-black italic tracking-widest">
                   <Medal size={40} />
                   <span>No Team Ranking</span>
                </div>
              )}
           </div>
           
           <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-4 opacity-40">
              <Crown size={14} className="text-amber-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Team Leaderboard Matrix</span>
           </div>
        </div>
      </div>

      <div className="bg-[#111] rounded-[48px] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-12 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
             <div className="flex items-center gap-3">
                <div className="text-red-600"><Table size={28} strokeWidth={3} /></div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t.detailedStats}</h3>
             </div>
             <p className="text-[10px] text-[#444] font-black uppercase tracking-widest mt-1 ml-10">PHÂN BỔ DOANH THU THỰC TẾ THEO TỪNG KÊNH TRONG TEAM</p>
          </div>
          <button onClick={exportToCSV} className="p-4 bg-white/5 border border-white/10 rounded-[20px] text-[#555] hover:bg-white hover:text-black transition-all group">
             <Download size={24} className="group-active:scale-90" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-[10px] font-black text-[#333] uppercase tracking-[0.3em] border-b border-white/5">
                <th className="px-12 py-8">{t.rank}</th>
                <th className="px-12 py-8">{t.channelNiche}</th>
                <th className="px-12 py-8 text-center">{t.status}</th>
                <th className="px-12 py-8 text-right">{t.revenuePeriod}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {channelStatsList.length > 0 ? channelStatsList.map((c, idx) => (
                <tr key={c.id} className="group hover:bg-white/5 transition-all">
                  <td className="px-12 py-8">
                     <span className="text-xl font-black italic text-[#222] group-hover:text-red-600/40 transition-colors">#{idx + 1}</span>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-5">
                      <img src={c.thumbnail} className="w-14 h-14 rounded-2xl bg-black object-cover border border-white/5 group-hover:border-red-600/30 transition-all shadow-xl" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base font-black text-white tracking-tight">{c.name}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-[#444] font-black uppercase tracking-widest">{c.id}</span>
                           <span className="bg-white/5 text-[8px] text-[#666] px-2 py-0.5 rounded-full font-black uppercase border border-white/5">{c.niche}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-8 text-center">
                     {c.isMonetized ? (
                       <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-green-600/10 text-green-500 border border-green-600/20">ACTIVE</span>
                     ) : (
                       <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-[#333] border border-white/5">INACTIVE</span>
                     )}
                  </td>
                  <td className="px-12 py-8 text-right">
                     <div className="flex flex-col items-end gap-1">
                        <span className="text-xl font-black text-white tabular-nums tracking-tighter group-hover:text-green-500 transition-colors">{formatCurrency(c.revenue)}</span>
                        <span className="text-[10px] text-[#444] font-black uppercase tracking-widest">{c.views.toLocaleString()} VIEWS</span>
                     </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-32 text-center opacity-10 font-black uppercase text-xs tracking-[0.5em] italic">
                    {t.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
