
// import React, { useState, useEffect } from 'react';
// import { Users, PlayCircle, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
// import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
// import { dbService } from '../services/dbService';
// import { Channel } from '../types';

// const StatCard = ({ title, value, icon: Icon, change, isPositive }: any) => (
//   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
//     <div className="flex items-center justify-between mb-4">
//       <div className="p-3 bg-slate-50 rounded-xl"><Icon size={24} className="text-slate-600" /></div>
//       <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
//         {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
//         {change}%
//       </div>
//     </div>
//     <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
//     <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
//   </div>
// );

// const DashboardPage: React.FC = () => {
//   const [stats, setStats] = useState({ totalSubs: 0, totalViews: 0, channelCount: 0 });
//   const [channels, setChannels] = useState<Channel[]>([]);

//   // Fix: Properly handle asynchronous call to dbService.getChannels()
//   useEffect(() => {
//     const loadStats = async () => {
//       const chData = await dbService.getChannels();
//       const totalSubs = chData.reduce((acc, c) => acc + (c.subscriberCount || 0), 0);
//       const totalViews = chData.reduce((acc, c) => acc + (c.viewCount || 0), 0);
//       setStats({ totalSubs, totalViews, channelCount: chData.length });
//       setChannels(chData);
//     };
//     loadStats();
//     window.addEventListener('db_updated', loadStats);
//     return () => window.removeEventListener('db_updated', loadStats);
//   }, []);

//   return (
//     <div className="space-y-8">
//       <div className="flex justify-between items-end">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-800">Global Overview</h1>
//           <p className="text-slate-500">Real-time metrics from {stats.channelCount} active channels.</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard title="Total Subscribers" value={stats.totalSubs.toLocaleString()} icon={Users} change={5.2} isPositive={true} />
//         <StatCard title="Total Views" value={(stats.totalViews / 1000000).toFixed(1) + 'M'} icon={PlayCircle} change={8.2} isPositive={true} />
//         <StatCard title="Active Channels" value={stats.channelCount} icon={TrendingUp} change={stats.channelCount > 0 ? 100 : 0} isPositive={true} />
//         <StatCard title="System Alerts" value="Stable" icon={AlertCircle} change={0} isPositive={true} />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
//           <h3 className="text-lg font-bold text-slate-800 mb-6">Audience Growth</h3>
//           <ResponsiveContainer width="100%" height="80%">
//             <AreaChart data={[{n: 'M', v: 4000}, {n: 'T', v: 3000}, {n: 'W', v: 5000}, {n: 'T', v: 4500}, {n: 'F', v: 6000}]}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//               <XAxis dataKey="n" axisLine={false} tickLine={false} />
//               <YAxis hide />
//               <Tooltip />
//               <Area type="monotone" dataKey="v" stroke="#ef4444" fill="#fee2e2" strokeWidth={3} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
//           <h3 className="text-lg font-bold text-slate-800 mb-6">Niche Distribution</h3>
//           <ResponsiveContainer width="100%" height="80%">
//             {/* Fix: Use local state channels for reduce calculation */}
//             <BarChart data={channels.reduce((acc: any[], c) => {
//               const existing = acc.find(a => a.name === c.niche);
//               if (existing) existing.count++;
//               else acc.push({ name: c.niche || 'General', count: 1 });
//               return acc;
//             }, [])}>
//               <XAxis dataKey="name" axisLine={false} tickLine={false} />
//               <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DashboardPage;
