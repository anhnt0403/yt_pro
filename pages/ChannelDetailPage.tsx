
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  DollarSign, 
  RefreshCw, 
  Globe, 
  Lock, 
  Edit3, 
  Youtube,
  MoreVertical, 
  TrendingUp, 
  ArrowLeft,
  Eye, 
  X, 
  Loader2, 
  FileVideo,
  AlertTriangle,
  Download,
  Calendar,
  Check,
  Ban,
  Clock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { dbService } from '../services/dbService';
import { youtubeService } from '../services/youtubeService';
import { Channel, ChannelStatus } from '../types';
import { translations } from '../App';

const VideoAnalyticsModal: React.FC<{ channelId: string, video: any, onClose: () => void, oauthToken: string, isMonetized: boolean }> = ({ channelId, video, onClose, oauthToken, isMonetized }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'views' | 'revenue'>('views');
  const [hasMonetaryData, setHasMonetaryData] = useState(isMonetized);
  
  const [presetDays, setPresetDays] = useState(28);

  const fetchVideoStats = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const startDate = new Date(now.getTime() - (presetDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      
      let report;
      if (isMonetized) {
        try {
          report = await youtubeService.fetchVideoAnalytics(oauthToken, channelId, video.id, startDate, endDate);
          setHasMonetaryData(true);
        } catch (e) {
          report = await youtubeService.fetchVideoBasicAnalytics(oauthToken, channelId, video.id, startDate, endDate);
          setHasMonetaryData(false);
          setMetric('views');
        }
      } else {
        report = await youtubeService.fetchVideoBasicAnalytics(oauthToken, channelId, video.id, startDate, endDate);
        setHasMonetaryData(false);
        setMetric('views');
      }

      const rows = (report.rows || []).map((r: any) => ({
        date: r[0],
        views: parseInt(r[1]) || 0,
        revenue: hasMonetaryData ? (parseFloat(r[2]) || 0) : 0,
      }));
      setData(rows);
      setError(null);
    } catch (e: any) {
      setError("Dữ liệu đang được YouTube cập nhật.");
    } finally {
      setLoading(false);
    }
  }, [video.id, channelId, oauthToken, presetDays, isMonetized, hasMonetaryData]);

  useEffect(() => {
    fetchVideoStats();
  }, [fetchVideoStats]);

  const summary = useMemo(() => {
    return data.reduce((acc, curr) => ({
      views: acc.views + curr.views,
      revenue: acc.revenue + curr.revenue
    }), { views: 0, revenue: 0 });
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
       <div className="bg-[#0f0f0f] border border-white/10 w-full max-w-4xl rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <img src={video.thumbnail} className="w-16 h-10 object-cover rounded border border-white/10" />
                <div>
                   <h3 className="text-lg font-black truncate max-w-md">{video.title}</h3>
                   <p className="text-[10px] text-[#666] font-black uppercase tracking-widest">Video Analysis</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
          </div>

          <div className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-[#141414] rounded-3xl border border-white/5">
                   <p className="text-[10px] text-[#444] font-black uppercase mb-1">Views</p>
                   <p className="text-3xl font-black">{summary.views.toLocaleString()}</p>
                </div>
                <div className="p-6 bg-[#141414] rounded-3xl border border-white/5">
                   <p className="text-[10px] text-[#444] font-black uppercase mb-1">Revenue</p>
                   <p className={`text-3xl font-black ${hasMonetaryData ? 'text-green-500' : 'text-[#222]'}`}>{hasMonetaryData ? `$${summary.revenue.toFixed(2)}` : 'N/A'}</p>
                </div>
             </div>

             <div className="h-64 bg-[#141414] rounded-3xl border border-white/5 p-6">
                {loading ? (
                   <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{backgroundColor: '#000', border: 'none'}} />
                      <Area type="monotone" dataKey={metric} stroke={metric === 'revenue' ? '#22c55e' : '#3ea6ff'} fillOpacity={0.1} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

const ChannelDetailPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
  const t = translations[lang];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Analytics' | 'Content' | 'Revenue'>('Analytics');
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [manualRevenue, setManualRevenue] = useState<number[]>(new Array(12).fill(0));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const channels = await dbService.getChannels();
      const found = channels.find(c => c.id === id);
      if (found) {
        setChannel(found);
        
        // Load manual revenue
        const revData = await dbService.getManualRevenue(selectedYear, id);
        const monthly = new Array(12).fill(0);
        revData.forEach((r: any) => {
          monthly[r.month - 1] = parseFloat(r.amount);
        });
        setManualRevenue(monthly);

        // Try to get token (simplified)
        const accounts = await dbService.getGoogleAccounts();
        const account = accounts.find(a => a.ownedChannelIds?.includes(id));
        if (account) {
          setOauthToken(account.accessToken);
          const vData = await youtubeService.fetchDetailedVideos(id, { accessToken: account.accessToken });
          setVideos(vData.items || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveRevenue = async () => {
    if (!id) return;
    try {
      await dbService.updateChannelRevenue(id, selectedYear, manualRevenue);
      alert("Đã cập nhật doanh thu!");
    } catch (e) {
      alert("Lỗi lưu doanh thu");
    }
  };

  if (loading && !channel) {
    return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-red-600" size={48} /></div>;
  }

  if (!channel) return <div className="p-20 text-center">Channel not found</div>;

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center gap-6">
        <button onClick={() => navigate('/channels')} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-all"><ArrowLeft size={24} /></button>
        <img src={channel.thumbnailUrl} className="w-20 h-20 rounded-[32px] border border-white/10 shadow-2xl" />
        <div>
           <h1 className="text-4xl font-black italic uppercase tracking-tighter">{channel.name}</h1>
           <p className="text-[10px] text-[#444] font-black uppercase tracking-widest">{channel.id}</p>
        </div>
      </div>

      <div className="flex border-b border-white/5">
        {(['Analytics', 'Content', 'Revenue'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-white' : 'text-[#444] hover:text-white'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {activeTab === 'Analytics' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#111] p-10 rounded-[48px] border border-white/5 h-[500px]">
                 <div className="flex items-center gap-3 mb-10">
                    <TrendingUp className="text-red-600" />
                    <h3 className="text-xl font-black italic uppercase">Performance Cloud</h3>
                 </div>
                 <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={manualRevenue.map((val, i) => ({ month: i + 1, amount: val }))}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                       <XAxis dataKey="month" hide />
                       <YAxis hide />
                       <Tooltip contentStyle={{backgroundColor: '#000', border: 'none'}} />
                       <Area type="monotone" dataKey="amount" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={4} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
              <div className="space-y-6">
                 <div className="bg-[#111] p-8 rounded-[32px] border border-white/5 shadow-xl">
                    <p className="text-[10px] text-[#444] font-black uppercase mb-2">Subscribers</p>
                    <p className="text-4xl font-black tabular-nums">{channel.subscriberCount.toLocaleString()}</p>
                 </div>
                 <div className="bg-[#111] p-8 rounded-[32px] border border-white/5 shadow-xl">
                    <p className="text-[10px] text-[#444] font-black uppercase mb-2">Total Views</p>
                    <p className="text-4xl font-black tabular-nums">{channel.viewCount.toLocaleString()}</p>
                 </div>
                 <div className="bg-[#111] p-8 rounded-[32px] border border-white/5 shadow-xl">
                    <p className="text-[10px] text-[#444] font-black uppercase mb-2">Monetization</p>
                    <div className="flex items-center gap-2">
                       {channel.isMonetized ? <Check className="text-green-500" /> : <Ban className="text-red-500" />}
                       <p className="text-xl font-black uppercase italic">{channel.isMonetized ? 'ENABLED' : 'DISABLED'}</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'Content' && (
           <div className="bg-[#111] rounded-[48px] border border-white/5 overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-black/20 text-[10px] font-black text-[#333] uppercase border-b border-white/5">
                    <tr>
                       <th className="px-10 py-6">Video</th>
                       <th className="px-10 py-6">Status</th>
                       <th className="px-10 py-6 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {videos.map(v => (
                       <tr key={v.id} className="group hover:bg-white/5 transition-all">
                          <td className="px-10 py-6">
                             <div className="flex items-center gap-4">
                                <img src={v.thumbnail} className="w-24 h-14 object-cover rounded-xl border border-white/5" />
                                <div className="min-w-0">
                                   <p className="font-black text-white truncate text-sm">{v.title}</p>
                                   <p className="text-[9px] text-[#444] font-black uppercase">{v.id}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-6">
                             <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase">{v.visibility}</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                             <button 
                                onClick={() => setSelectedVideo(v)}
                                className="p-3 bg-red-600/10 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                             >
                                <BarChart3 size={20} />
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}

        {activeTab === 'Revenue' && (
           <div className="bg-white p-12 rounded-[48px] shadow-2xl space-y-8 max-w-2xl">
              <div className="flex items-center justify-between">
                 <h2 className="text-3xl font-black italic text-black uppercase">Manual Revenue</h2>
                 <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-slate-100 p-3 rounded-xl font-black">
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                 {manualRevenue.map((val, idx) => (
                    <div key={idx} className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase">Tháng {idx + 1}</label>
                       <input 
                         type="number" 
                         value={val} 
                         onChange={e => {
                           const newRev = [...manualRevenue];
                           newRev[idx] = parseFloat(e.target.value) || 0;
                           setManualRevenue(newRev);
                         }}
                         className="w-full p-4 bg-slate-100 rounded-xl text-black font-black text-sm outline-none focus:ring-2 ring-red-600/20"
                       />
                    </div>
                 ))}
              </div>

              <button 
                onClick={handleSaveRevenue}
                className="w-full py-6 bg-black text-white rounded-3xl font-black uppercase hover:bg-red-600 transition-all shadow-xl"
              >
                 SAVE REVENUE DATA
              </button>
           </div>
        )}
      </div>

      {selectedVideo && oauthToken && (
        <VideoAnalyticsModal 
          channelId={id!} 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
          oauthToken={oauthToken} 
          isMonetized={!!channel.isMonetized} 
        />
      )}
    </div>
  );
};

export default ChannelDetailPage;
