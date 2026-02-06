
import React, { useState, useEffect } from 'react';
import { 
  FileVideo, Plus, SlidersHorizontal, Search, RefreshCw, 
  Globe, Lock, Edit3, BarChart, MessageSquare, Youtube, 
  MoreVertical, Eye, ThumbsUp, X, ChevronDown, CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { dbService } from '../services/dbService';
import { youtubeService } from '../services/youtubeService';
import { UploadTask, Channel } from '../types';

const ContentPage: React.FC = () => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [activeTab, setActiveTab] = useState('Uploads');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fix: Handle asynchronous data loading in useEffect
  useEffect(() => {
    const initData = async () => {
      const data = await dbService.getChannels();
      setChannels(data);
      if (data.length > 0) setSelectedChannel(data[0].id);
      
      const taskData = await dbService.getTasks();
      setTasks(taskData);
    };
    initData();
    
    const handler = async () => {
       const taskData = await dbService.getTasks();
       setTasks(taskData);
       const chData = await dbService.getChannels();
       setChannels(chData);
    };
    window.addEventListener('db_updated', handler);
    return () => window.removeEventListener('db_updated', handler);
  }, []);

  const toggleSelectAll = () => {
    if (selectedVideos.length === tasks.length) setSelectedVideos([]);
    else setSelectedVideos(tasks.map(t => t.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedVideos.includes(id)) setSelectedVideos(selectedVideos.filter(v => v !== id));
    else setSelectedVideos([...selectedVideos, id]);
  };

  return (
    <div className="space-y-0 -mx-8 -mt-8 bg-[#0f0f0f] min-h-screen text-white">
      {/* STUDIO HEADER */}
      <div className="h-16 px-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0f0f0f] z-20">
        <h1 className="text-xl font-bold">Channel content</h1>
        <div className="flex items-center gap-4">
          <select 
            className="bg-[#1e1e1e] border border-white/10 text-xs font-bold px-3 py-2 rounded-lg text-[#aaaaaa]"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
          >
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] border border-white/10 rounded-lg text-xs font-bold text-[#3ea6ff] hover:bg-[#333] transition-all">
            <Plus size={16} /> CREATE
          </button>
        </div>
      </div>

      {/* SUB TABS */}
      <div className="px-8 flex border-b border-white/5 bg-[#0f0f0f]">
        {['Uploads', 'Live', 'Posts', 'Playlists'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-sm font-bold transition-all relative ${
              activeTab === tab ? 'text-red-500' : 'text-[#aaaaaa] hover:text-white'
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"></div>}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="px-8 py-2 border-b border-white/5 flex items-center gap-6">
         <button className="flex items-center gap-2 text-[#aaaaaa] hover:text-white transition-colors">
            <SlidersHorizontal size={18} />
            <span className="text-xs font-bold">Filter</span>
         </button>
         <div className="flex-1 flex items-center gap-3 text-[#aaaaaa]">
            <Search size={18} />
            <input className="bg-transparent border-none outline-none text-sm w-full" placeholder="Search across your content" />
         </div>
         <button className="p-2 rounded-full hover:bg-white/5">
           <RefreshCw size={18} className="text-[#aaaaaa]" />
         </button>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedVideos.length > 0 && (
        <div className="h-14 px-8 bg-[#1e1e1e] border-b border-red-600/30 flex items-center gap-6 animate-in slide-in-from-top duration-200 sticky top-16 z-10">
           <div className="flex items-center gap-4">
              <button onClick={() => setSelectedVideos([])} className="p-1"><X size={18} /></button>
              <span className="text-sm font-bold">{selectedVideos.length} selected</span>
           </div>
           <div className="h-6 w-px bg-white/10"></div>
           <div className="flex gap-4">
              <button className="text-xs font-bold text-white hover:text-blue-400">EDIT</button>
              <button className="text-xs font-bold text-white hover:text-blue-400">ADD TO PLAYLIST</button>
              <button className="text-xs font-bold text-white hover:text-blue-400 flex items-center gap-1">MORE ACTIONS <ChevronDown size={14} /></button>
           </div>
        </div>
      )}

      {/* TABLE CONTENT */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead className="bg-[#0f0f0f] text-[#aaaaaa] font-bold border-b border-white/5 uppercase tracking-tighter">
            <tr>
              <th className="pl-8 py-3 w-14">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded-sm border-white/20 bg-transparent"
                  checked={selectedVideos.length === tasks.length && tasks.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 min-w-[320px]">Video</th>
              <th className="px-4 py-3">Visibility</th>
              <th className="px-4 py-3">Restrictions</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3 text-right">Comments</th>
              <th className="pr-8 py-3 text-right">Likes (vs. dislikes)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.length > 0 ? tasks.map(task => (
              <tr key={task.id} className={`group hover:bg-[#1e1e1e] transition-colors ${selectedVideos.includes(task.id) ? 'bg-[#1e1e1e]' : ''}`}>
                <td className="pl-8 py-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded-sm border-white/20 bg-transparent"
                    checked={selectedVideos.includes(task.id)}
                    onChange={() => toggleSelect(task.id)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-4 relative">
                    <div className="relative shrink-0 w-32 h-18 bg-[#111] rounded overflow-hidden flex items-center justify-center">
                       {task.status === 'COMPLETED' ? (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <FileVideo size={24} className="text-slate-600" />
                          </div>
                       ) : (
                         <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <RefreshCw size={16} className="animate-spin mb-1" />
                            <span className="text-[10px] font-bold">{task.progress}%</span>
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col min-w-0 pr-12">
                      <p className="font-bold text-white line-clamp-2 leading-tight mb-1 group-hover:text-[#3ea6ff] cursor-pointer">{task.videoTitle}</p>
                      <div className="hidden group-hover:flex items-center gap-4 text-[#aaaaaa] mt-1">
                         <button title="Edit" className="hover:text-white"><Edit3 size={16} /></button>
                         <button title="Analytics" className="hover:text-white"><BarChart size={16} /></button>
                         <button title="Comments" className="hover:text-white"><MessageSquare size={16} /></button>
                         <button title="View on YouTube" className="hover:text-white"><Youtube size={16} /></button>
                         <button title="Options" className="hover:text-white"><MoreVertical size={16} /></button>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className={`flex items-center gap-2 ${task.status === 'COMPLETED' ? 'text-green-500' : 'text-[#aaaaaa]'}`}>
                     {task.status === 'COMPLETED' ? <Globe size={14} /> : <Lock size={14} />}
                     <span>{task.status === 'COMPLETED' ? 'Public' : 'Pending'}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[#aaaaaa]">None</td>
                <td className="px-4 py-4 flex flex-col">
                   <span className="text-white">{new Date().toLocaleDateString()}</span>
                   <span className="text-[#aaaaaa] text-[11px]">Uploaded</span>
                </td>
                <td className="px-4 py-4 text-right text-white font-medium">0</td>
                <td className="px-4 py-4 text-right text-white font-medium">0</td>
                <td className="pr-8 py-4 text-right">
                   <div className="flex flex-col items-end">
                      <span className="text-white font-medium">—</span>
                      <div className="w-16 h-1 bg-white/5 mt-1 rounded-full"></div>
                   </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-32 text-center text-[#aaaaaa]">
                  <div className="flex flex-col items-center gap-4">
                     <FileVideo size={48} className="text-white/10" />
                     <p>No content available to show.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentPage;
