// import React, { useState, useEffect, useCallback } from 'react';
// import { 
//   ShieldCheck, Save, Trash2, Key, Terminal, RefreshCw, 
//   Copy, AlertTriangle, ExternalLink, Globe, CheckCircle2,
//   Lock, Settings2, UserPlus, Info, ChevronRight, Mail,
//   ShieldAlert, Eye, AlertCircle, Link as LinkIcon, Loader2
// } from 'lucide-react';
// // --- FIX IMPORT: SystemLog comes from types, not dbService ---
// import { dbService } from '../services/dbService';
// import { SystemLog } from '../types'; 
// import { translations } from '../App';

// const SystemPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
//   const t = translations[lang];
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [logs, setLogs] = useState<SystemLog[]>([]);
  
//   const [clientId, setClientId] = useState('');
//   const [clientSecret, setClientSecret] = useState('');
//   const [redirectUriInput, setRedirectUriInput] = useState('');
//   const [apiKeysInput, setApiKeysInput] = useState('');
//   const [currentLang, setCurrentLang] = useState<'vi' | 'en'>('vi');
  
//   const [copied, setCopied] = useState(false);
//   const [displayRedirectUri, setDisplayRedirectUri] = useState('');
//   const [isIpAddress, setIsIpAddress] = useState(false);

//   const loadSystemData = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [config, systemLogs] = await Promise.all([
//         dbService.getSystemConfig(),
//         dbService.getLogs()
//       ]);
      
//       setClientId(config.clientId || '');
//       setClientSecret(config.clientSecret || '');
//       setRedirectUriInput(config.redirectUriOverride || '');
//       setApiKeysInput((config.apiKeys || []).join('\n'));
//       setCurrentLang(config.language || 'vi');
//       setLogs(systemLogs);

//       let finalUri = "";
//       if (config.redirectUriOverride) {
//         finalUri = config.redirectUriOverride.replace(/\/$/, "");
//       } else {
//         const origin = window.location.origin.replace(/\/$/, "");
//         finalUri = `${origin}/oauth2callback`;
//       }
//       setDisplayRedirectUri(finalUri);
      
//       try {
//         const hostname = new URL(finalUri).hostname;
//         // Kiểm tra xem hostname có phải là định dạng IP 127.0.0.1, 192.168...
//         setIsIpAddress(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname));
//       } catch {
//         setIsIpAddress(false);
//       }

//     } catch (e) {
//       console.error("Failed to load system config", e);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadSystemData();
//   }, [loadSystemData]);

//   useEffect(() => {
//     let finalUri = "";
//     if (redirectUriInput) {
//       finalUri = redirectUriInput.replace(/\/$/, "");
//     } else {
//       const origin = window.location.origin.replace(/\/$/, "");
//       finalUri = `${origin}/oauth2callback`;
//     }
//     setDisplayRedirectUri(finalUri);

//     try {
//       const hostname = new URL(finalUri).hostname;
//       setIsIpAddress(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname));
//     } catch {
//       setIsIpAddress(false);
//     }
//   }, [redirectUriInput]);

//   const handleSave = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setSaving(true);
//     try {
//       const configPayload = {
//         clientId: clientId.trim(),
//         clientSecret: clientSecret.trim(),
//         redirectUriOverride: redirectUriInput.trim(),
//         apiKeys: apiKeysInput.split('\n').map(k => k.trim()).filter(k => k !== ''),
//         language: currentLang
//       };
      
//       await dbService.saveSystemConfig(configPayload);
//       await dbService.addLog('SUCCESS', 'Đã cập nhật cấu hình hệ thống Core.');
      
//       window.dispatchEvent(new CustomEvent('db_updated'));
      
//       alert(lang === 'vi' ? 'Đã lưu cấu hình vĩnh viễn!' : 'Configuration saved permanently!');
//       loadSystemData();
//     } catch (err: any) {
//       alert("Lỗi: " + err.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const handleResetDB = async () => {
//     if (!confirm(lang === 'vi' ? "Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống?" : "Are you sure you want to clear all system logs?")) return;
//     await dbService.clearLogs();
//     loadSystemData();
//   };

//   if (loading) {
//     return (
//       <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
//         <Loader2 size={64} className="text-red-600 animate-spin mb-4" />
//         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#333]">Booting System Core...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-10 max-w-[1600px] mx-auto space-y-16 pb-32 bg-[#0a0a0a] min-h-screen font-inter">
//       {/* HEADER SECTION */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
//         <div>
//           <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">{t.systemConfig}</h1>
//           <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.4em] mt-3 italic">Hệ thống quản trị hạ tầng v2.5.0</p>
//         </div>
//         <button 
//           onClick={handleResetDB} 
//           className="flex items-center gap-3 px-8 py-4 text-red-600 font-black uppercase text-[11px] tracking-widest hover:bg-red-600/10 rounded-2xl border border-red-600/20 transition-all active:scale-95"
//         >
//           <Trash2 size={18} /> {t.resetDb}
//         </button>
//       </div>

//       {/* SMART WARNING BOX FOR IP ADDRESS LIMITATION */}
//       {isIpAddress && (
//         <div className="bg-red-600/10 border-2 border-red-600/30 p-12 rounded-[56px] flex flex-col md:flex-row items-center gap-10 shadow-[0_0_80px_rgba(220,38,38,0.15)] animate-in fade-in zoom-in duration-500">
//            <div className="bg-red-600 p-8 rounded-[32px] text-white shadow-[0_0_40px_rgba(220,38,38,0.5)]">
//               <AlertTriangle size={48} strokeWidth={3} />
//            </div>
//            <div className="flex-1 space-y-4">
//               <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Google không chấp nhận địa chỉ IP!</h3>
//               <p className="text-sm text-slate-400 font-bold leading-relaxed">
//                 Google Cloud Console không cho phép sử dụng địa chỉ IP (như <span className="text-red-500 underline decoration-2 underline-offset-4">{new URL(displayRedirectUri).hostname}</span>) làm Redirect URI cho ứng dụng Web. 
//                 Bạn phải sử dụng <strong>Tên miền thật (Domain)</strong> (ví dụ: <span className="text-blue-500">dashboard.yourdomain.com</span>) hoặc <strong>localhost</strong>.
//               </p>
//               <div className="bg-white/5 p-6 rounded-[28px] border border-white/5 space-y-2">
//                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Mẹo xử lý cho mạng LAN:</p>
//                  <p className="text-xs font-mono text-slate-300">Sử dụng dịch vụ nip.io bằng cách đổi địa chỉ trong Google Console thành:<br/>
//                  <span className="text-white bg-red-600/20 px-2 py-1 rounded select-all">http://{new URL(displayRedirectUri).hostname}.nip.io{new URL(displayRedirectUri).port ? `:${new URL(displayRedirectUri).port}` : ''}/oauth2callback</span></p>
//               </div>
//            </div>
//         </div>
//       )}

//       {/* INFO CARDS GRID */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
//         <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-red-600/30 transition-all">
//           <div className="space-y-8">
//             <div className="w-14 h-14 bg-red-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-red-600/20">1</div>
//             <h3 className="font-black text-2xl uppercase italic text-white tracking-tighter">{t.redirectUri}</h3>
//             <div className="bg-black/60 p-6 rounded-[32px] border border-white/5 space-y-4">
//               <p className="text-[9px] text-[#444] font-black uppercase tracking-widest italic">URI dùng để khai báo Google Console:</p>
//               <code className="text-[12px] text-red-500 break-all block font-mono font-bold leading-relaxed">{displayRedirectUri}</code>
//               <button 
//                 onClick={() => copyToClipboard(displayRedirectUri)} 
//                 className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
//               >
//                 {copied ? 'COPIED TO CLIPBOARD!' : 'COPY REDIRECT URI'}
//               </button>
//             </div>
//           </div>
//         </div>

//         <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-amber-600/30 transition-all">
//           <div className="space-y-8">
//             <div className="w-14 h-14 bg-amber-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-amber-600/20">2</div>
//             <h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">{t.testUsers}</h3>
//             <p className="text-sm text-[#555] font-bold leading-relaxed italic uppercase">Cấu hình email thử nghiệm trong Google Console để bỏ qua các giới hạn phát triển và quyền truy cập API chưa xác minh.</p>
//           </div>
//           <div className="pt-8 flex justify-end">
//             <ExternalLink size={24} className="text-[#222] group-hover:text-amber-600 transition-colors" />
//           </div>
//         </div>

//         <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-blue-600/30 transition-all">
//           <div className="space-y-8">
//             <div className="w-14 h-14 bg-blue-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-blue-600/20">3</div>
//             <h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">{t.securityBypass}</h3>
//             <p className="text-sm text-[#555] font-bold leading-relaxed italic uppercase">Các bước để vượt qua cảnh báo "Ứng dụng chưa được xác minh" của Google trong quá trình ủy quyền OAuth2.</p>
//           </div>
//           <div className="pt-8 flex justify-end">
//             <ShieldAlert size={24} className="text-[#222] group-hover:text-blue-600 transition-colors" />
//           </div>
//         </div>
//       </div>

//       {/* FORM & LOGS SECTION */}
//       <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
//         <div className="bg-white p-14 rounded-[64px] shadow-[0_0_100px_rgba(0,0,0,0.3)] space-y-12 border border-white/10">
//           <div className="flex items-center gap-6">
//             <div className="w-16 h-16 bg-[#111] text-red-600 rounded-[28px] flex items-center justify-center shadow-2xl"><Lock size={32} strokeWidth={2.5} /></div>
//             <div>
//               <h3 className="text-3xl font-black text-black uppercase italic tracking-tighter">{t.oauthApiKeys}</h3>
//               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Cấu hình an toàn Google Cloud Platform</p>
//             </div>
//           </div>

//           <div className="space-y-8">
//             <div className="space-y-3">
//               <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">Google Client ID</label>
//               <input 
//                 type="text" 
//                 placeholder="Vd: 123456789-abc.apps.googleusercontent.com"
//                 className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
//                 value={clientId} 
//                 onChange={e => setClientId(e.target.value)} 
//               />
//             </div>
//             <div className="space-y-3">
//               <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">Client Secret Key</label>
//               <input 
//                 type="password" 
//                 placeholder="Nhập secret key của bạn..."
//                 className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
//                 value={clientSecret} 
//                 onChange={e => setClientSecret(e.target.value)} 
//               />
//             </div>
//             <div className="space-y-3">
//               <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2 flex items-center gap-2">
//                 <LinkIcon size={14} /> Custom Redirect URI (Override)
//               </label>
//               <input 
//                 type="text" 
//                 placeholder="https://dashboard.yourdomain.com/oauth2callback"
//                 className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
//                 value={redirectUriInput} 
//                 onChange={e => setRedirectUriInput(e.target.value)} 
//               />
//               <p className="text-[10px] text-slate-400 italic ml-4">Nhập Domain chính xác khớp với khai báo trên Google Console.</p>
//             </div>
//             <div className="space-y-3">
//               <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">YouTube API Keys (Rotation)</label>
//               <textarea 
//                 placeholder="Nhập API Keys, mỗi dòng một key để hệ thống tự động xoay vòng..."
//                 className="w-full p-8 bg-slate-50 rounded-[40px] text-sm font-mono h-48 outline-none focus:border-red-600 focus:bg-white text-black font-black resize-none transition-all shadow-inner leading-relaxed" 
//                 value={apiKeysInput} 
//                 onChange={e => setApiKeysInput(e.target.value)} 
//               />
//             </div>
//           </div>

//           <button 
//             type="submit" 
//             disabled={saving}
//             className="w-full py-7 bg-black text-white rounded-[32px] font-black text-base uppercase tracking-[0.2em] hover:bg-red-600 shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
//           >
//             {saving ? <Loader2 size={24} className="animate-spin" /> : <><Save size={24} strokeWidth={3} className="group-hover:rotate-12 transition-transform" /> {t.saveConfig}</>}
//           </button>
//         </div>

//         <div className="bg-[#111] rounded-[64px] p-14 border border-white/5 shadow-2xl flex flex-col h-full border-b-8 border-b-red-600/20">
//           <div className="flex items-center justify-between mb-12">
//             <div className="flex items-center gap-6">
//               <div className="w-16 h-16 bg-black/40 text-red-600 rounded-[28px] flex items-center justify-center border border-white/5 shadow-2xl"><Terminal size={32} strokeWidth={2.5} /></div>
//               <div>
//                 <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">{t.outputLogs}</h3>
//                 <p className="text-[10px] text-[#444] font-black uppercase tracking-widest italic">Monitor Core Activity</p>
//               </div>
//             </div>
//             <button type="button" onClick={loadSystemData} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all">
//               <RefreshCw size={24} className="text-[#333]" />
//             </button>
//           </div>

//           <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] no-scrollbar pr-2">
//             {logs.length > 0 ? logs.map(log => (
//               <div key={log.id} className="text-[12px] font-mono p-5 bg-black/60 rounded-[24px] border border-white/5 flex items-start gap-6 group hover:border-white/10 transition-all">
//                 <span className={`font-black uppercase shrink-0 italic pt-0.5 tracking-tighter ${
//                   log.level === 'ERROR' ? 'text-red-600' : 
//                   log.level === 'WARNING' ? 'text-amber-500' : 
//                   'text-green-500'
//                 }`}>
//                   [{log.level}]
//                 </span>
//                 <div className="flex flex-col gap-1 flex-1">
//                    <span className="text-[#888] group-hover:text-white transition-colors leading-relaxed font-bold">{log.message}</span>
//                    <span className="text-[9px] text-[#222] font-black uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
//                 </div>
//               </div>
//             )) : (
//               <div className="h-full flex flex-col items-center justify-center opacity-5 space-y-4 grayscale">
//                 <Terminal size={100} />
//                 <p className="uppercase text-2xl font-black italic tracking-[0.5em]">{t.noData}</p>
//               </div>
//             )}
//           </div>
          
//           <div className="mt-10 pt-8 border-t border-white/5 flex items-center gap-4 opacity-40">
//              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//              <span className="text-[10px] font-black uppercase tracking-widest text-[#555]">System Heartbeat: Online</span>
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default SystemPage;

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, Save, Trash2, Key, Terminal, RefreshCw, 
  Copy, AlertTriangle, ExternalLink, Globe, CheckCircle2,
  Lock, Settings2, UserPlus, Info, ChevronRight, Mail,
  ShieldAlert, Eye, AlertCircle, Link as LinkIcon, Loader2
} from 'lucide-react';
// --- FIX IMPORT: SystemLog comes from types, not dbService ---
import { dbService } from '../services/dbService';
import { SystemLog } from '../types'; 
import { translations } from '../App';

const SystemPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUriInput, setRedirectUriInput] = useState('');
  const [apiKeysInput, setApiKeysInput] = useState('');
  const [currentLang, setCurrentLang] = useState<'vi' | 'en'>('vi');
  
  const [copied, setCopied] = useState(false);
  const [displayRedirectUri, setDisplayRedirectUri] = useState('');
  const [isIpAddress, setIsIpAddress] = useState(false);

  const loadSystemData = useCallback(async () => {
    setLoading(true);
    try {
      const [config, systemLogs] = await Promise.all([
        dbService.getSystemConfig(),
        dbService.getLogs()
      ]);
      
      setClientId(config.clientId || '');
      setClientSecret(config.clientSecret || '');
      setRedirectUriInput(config.redirectUriOverride || '');
      setApiKeysInput((config.apiKeys || []).join('\n'));
      setCurrentLang(config.language || 'vi');
      setLogs(systemLogs);

      let finalUri = "";
      if (config.redirectUriOverride) {
        finalUri = config.redirectUriOverride.replace(/\/$/, "");
      } else {
        const origin = window.location.origin.replace(/\/$/, "");
        finalUri = `${origin}/oauth2callback`;
      }
      setDisplayRedirectUri(finalUri);
      
      try {
        const hostname = new URL(finalUri).hostname;
        // Kiểm tra xem hostname có phải là định dạng IP 127.0.0.1, 192.168...
        setIsIpAddress(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname));
      } catch {
        setIsIpAddress(false);
      }

    } catch (e) {
      console.error("Failed to load system config", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  useEffect(() => {
    let finalUri = "";
    if (redirectUriInput) {
      finalUri = redirectUriInput.replace(/\/$/, "");
    } else {
      const origin = window.location.origin.replace(/\/$/, "");
      finalUri = `${origin}/oauth2callback`;
    }
    setDisplayRedirectUri(finalUri);

    try {
      const hostname = new URL(finalUri).hostname;
      setIsIpAddress(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname));
    } catch {
      setIsIpAddress(false);
    }
  }, [redirectUriInput]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const configPayload = {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUriOverride: redirectUriInput.trim(),
        apiKeys: apiKeysInput.split('\n').map(k => k.trim()).filter(k => k !== ''),
        language: currentLang
      };
      
      await dbService.saveSystemConfig(configPayload);
      await dbService.addLog('SUCCESS', 'Đã cập nhật cấu hình hệ thống Core.');
      
      window.dispatchEvent(new CustomEvent('db_updated'));
      
      alert(lang === 'vi' ? 'Đã lưu cấu hình vĩnh viễn!' : 'Configuration saved permanently!');
      loadSystemData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDB = async () => {
    if (!confirm(lang === 'vi' ? "Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống?" : "Are you sure you want to clear all system logs?")) return;
    await dbService.clearLogs();
    loadSystemData();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 size={64} className="text-red-600 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#333]">Booting System Core...</p>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-16 pb-32 bg-[#0a0a0a] min-h-screen font-inter">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">{t.systemConfig}</h1>
          <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.4em] mt-3 italic">Hệ thống quản trị hạ tầng v2.5.0</p>
        </div>
        <button 
          onClick={handleResetDB} 
          className="flex items-center gap-3 px-8 py-4 text-red-600 font-black uppercase text-[11px] tracking-widest hover:bg-red-600/10 rounded-2xl border border-red-600/20 transition-all active:scale-95"
        >
          <Trash2 size={18} /> {t.resetDb}
        </button>
      </div>

      {/* SMART WARNING BOX FOR IP ADDRESS LIMITATION */}
      {isIpAddress && (
        <div className="bg-red-600/10 border-2 border-red-600/30 p-12 rounded-[56px] flex flex-col md:flex-row items-center gap-10 shadow-[0_0_80px_rgba(220,38,38,0.15)] animate-in fade-in zoom-in duration-500">
           <div className="bg-red-600 p-8 rounded-[32px] text-white shadow-[0_0_40px_rgba(220,38,38,0.5)]">
              <AlertTriangle size={48} strokeWidth={3} />
           </div>
           <div className="flex-1 space-y-4">
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Google không chấp nhận địa chỉ IP!</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">
                Google Cloud Console không cho phép sử dụng địa chỉ IP (như <span className="text-red-500 underline decoration-2 underline-offset-4">{new URL(displayRedirectUri).hostname}</span>) làm Redirect URI cho ứng dụng Web. 
                Bạn phải sử dụng <strong>Tên miền thật (Domain)</strong> (ví dụ: <span className="text-blue-500">dashboard.yourdomain.com</span>) hoặc <strong>localhost</strong>.
              </p>
              <div className="bg-white/5 p-6 rounded-[28px] border border-white/5 space-y-2">
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Mẹo xử lý cho mạng LAN:</p>
                 <p className="text-xs font-mono text-slate-300">Sử dụng dịch vụ nip.io bằng cách đổi địa chỉ trong Google Console thành:<br/>
                 <span className="text-white bg-red-600/20 px-2 py-1 rounded select-all">http://{new URL(displayRedirectUri).hostname}.nip.io{new URL(displayRedirectUri).port ? `:${new URL(displayRedirectUri).port}` : ''}/oauth2callback</span></p>
              </div>
           </div>
        </div>
      )}

      {/* INFO CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-red-600/30 transition-all">
          <div className="space-y-8">
            <div className="w-14 h-14 bg-red-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-red-600/20">1</div>
            <h3 className="font-black text-2xl uppercase italic text-white tracking-tighter">{t.redirectUri}</h3>
            <div className="bg-black/60 p-6 rounded-[32px] border border-white/5 space-y-4">
              <p className="text-[9px] text-[#444] font-black uppercase tracking-widest italic">URI dùng để khai báo Google Console:</p>
              <code className="text-[12px] text-red-500 break-all block font-mono font-bold leading-relaxed">{displayRedirectUri}</code>
              <button 
                onClick={() => copyToClipboard(displayRedirectUri)} 
                className="w-full py-4 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                {copied ? 'COPIED TO CLIPBOARD!' : 'COPY REDIRECT URI'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-amber-600/30 transition-all">
          <div className="space-y-8">
            <div className="w-14 h-14 bg-amber-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-amber-600/20">2</div>
            <h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">{t.testUsers}</h3>
            <p className="text-sm text-[#555] font-bold leading-relaxed italic uppercase">Cấu hình email thử nghiệm trong Google Console để bỏ qua các giới hạn phát triển và quyền truy cập API chưa xác minh.</p>
          </div>
          <div className="pt-8 flex justify-end">
            <ExternalLink size={24} className="text-[#222] group-hover:text-amber-600 transition-colors" />
          </div>
        </div>

        <div className="bg-[#111] rounded-[48px] p-12 border border-white/5 shadow-2xl flex flex-col justify-between group hover:border-blue-600/30 transition-all">
          <div className="space-y-8">
            <div className="w-14 h-14 bg-blue-600 rounded-[20px] flex items-center justify-center font-black text-2xl text-white shadow-2xl shadow-blue-600/20">3</div>
            <h3 className="font-black text-2xl text-white uppercase italic tracking-tighter">{t.securityBypass}</h3>
            <p className="text-sm text-[#555] font-bold leading-relaxed italic uppercase">Các bước để vượt qua cảnh báo "Ứng dụng chưa được xác minh" của Google trong quá trình ủy quyền OAuth2.</p>
          </div>
          <div className="pt-8 flex justify-end">
            <ShieldAlert size={24} className="text-[#222] group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* FORM & LOGS SECTION */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white p-14 rounded-[64px] shadow-[0_0_100px_rgba(0,0,0,0.3)] space-y-12 border border-white/10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#111] text-red-600 rounded-[28px] flex items-center justify-center shadow-2xl"><Lock size={32} strokeWidth={2.5} /></div>
            <div>
              <h3 className="text-3xl font-black text-black uppercase italic tracking-tighter">{t.oauthApiKeys}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Cấu hình an toàn Google Cloud Platform</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">Google Client ID</label>
              <input 
                type="text" 
                placeholder="Vd: 123456789-abc.apps.googleusercontent.com"
                className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
                value={clientId} 
                onChange={e => setClientId(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">Client Secret Key</label>
              <input 
                type="password" 
                placeholder="Nhập secret key của bạn..."
                className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
                value={clientSecret} 
                onChange={e => setClientSecret(e.target.value)} 
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2 flex items-center gap-2">
                <LinkIcon size={14} /> Custom Redirect URI (Override)
              </label>
              <input 
                type="text" 
                placeholder="https://dashboard.yourdomain.com/oauth2callback"
                className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] text-sm font-mono focus:border-red-600 focus:bg-white outline-none text-black font-black transition-all shadow-inner" 
                value={redirectUriInput} 
                onChange={e => setRedirectUriInput(e.target.value)} 
              />
              <p className="text-[10px] text-slate-400 italic ml-4">Nhập Domain chính xác khớp với khai báo trên Google Console.</p>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic ml-2">YouTube API Keys (Rotation)</label>
              <textarea 
                placeholder="Nhập API Keys, mỗi dòng một key để hệ thống tự động xoay vòng..."
                className="w-full p-8 bg-slate-50 rounded-[40px] text-sm font-mono h-48 outline-none focus:border-red-600 focus:bg-white text-black font-black resize-none transition-all shadow-inner leading-relaxed" 
                value={apiKeysInput} 
                onChange={e => setApiKeysInput(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full py-7 bg-black text-white rounded-[32px] font-black text-base uppercase tracking-[0.2em] hover:bg-red-600 shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
          >
            {saving ? <Loader2 size={24} className="animate-spin" /> : <><Save size={24} strokeWidth={3} className="group-hover:rotate-12 transition-transform" /> {t.saveConfig}</>}
          </button>
        </div>

        <div className="bg-[#111] rounded-[64px] p-14 border border-white/5 shadow-2xl flex flex-col h-full border-b-8 border-b-red-600/20">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-black/40 text-red-600 rounded-[28px] flex items-center justify-center border border-white/5 shadow-2xl"><Terminal size={32} strokeWidth={2.5} /></div>
              <div>
                <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter">{t.outputLogs}</h3>
                <p className="text-[10px] text-[#444] font-black uppercase tracking-widest italic">Monitor Core Activity</p>
              </div>
            </div>
            <button type="button" onClick={loadSystemData} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all">
              <RefreshCw size={24} className="text-[#333]" />
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] no-scrollbar pr-2">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="text-[12px] font-mono p-5 bg-black/60 rounded-[24px] border border-white/5 flex items-start gap-6 group hover:border-white/10 transition-all">
                <span className={`font-black uppercase shrink-0 italic pt-0.5 tracking-tighter ${
                  log.level === 'ERROR' ? 'text-red-600' : 
                  log.level === 'WARNING' ? 'text-amber-500' : 
                  'text-green-500'
                }`}>
                  [{log.level}]
                </span>
                <div className="flex flex-col gap-1 flex-1">
                   <span className="text-[#888] group-hover:text-white transition-colors leading-relaxed font-bold">{log.message}</span>
                   <span className="text-[9px] text-[#222] font-black uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center opacity-5 space-y-4 grayscale">
                <Terminal size={100} />
                <p className="uppercase text-2xl font-black italic tracking-[0.5em]">{t.noData}</p>
              </div>
            )}
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 flex items-center gap-4 opacity-40">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-[#555]">System Heartbeat: Online</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SystemPage;