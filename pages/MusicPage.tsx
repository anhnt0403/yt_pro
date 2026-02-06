
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Play, 
  Pause, 
  Volume2, 
  SkipForward, 
  SkipBack, 
  Heart,
  MoreHorizontal,
  X,
  Plus,
  Trash2,
  Loader2,
  UploadCloud,
  ListMusic,
  Shuffle,
  Music
} from 'lucide-react';
import { MusicAsset, UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { translations } from '../App';

// --- Sóng nhạc SoundCloud "Floating & Ultra-Tall" ---
const SoundCloudWaveform = ({ seed, progress, isActive, duration, currentTime, onClick }: { 
  seed: string, 
  progress: number, 
  isActive: boolean, 
  duration: string,
  currentTime: string,
  onClick?: (p: number) => void 
}) => {
  const bars = useMemo(() => {
    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // 160 nốt để đạt độ mảnh tinh khiết
    return Array.from({ length: 160 }).map((_, i) => {
      const noise = Math.abs(Math.sin(hash + i * 0.15)) * 0.7 + Math.abs(Math.cos(hash + i * 0.35)) * 0.3;
      const height = 10 + noise * 90; 
      return height;
    });
  }, [seed]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedProgress = (x / rect.width) * 100;
    onClick(clickedProgress);
  };

  return (
    <div 
      className="relative h-48 w-full cursor-pointer group/wave flex items-center" 
      onClick={handleSeek}
    >
      {/* Container chứa các nốt sóng - Không còn khung nền đen */}
      <div className="absolute inset-x-0 inset-y-0 flex items-center justify-between gap-[2px]">
        {bars.map((h, i) => {
          const isPlayed = progress > (i / bars.length) * 100 && isActive;
          return (
            <div key={i} className="flex-1 h-full flex flex-col items-center justify-center gap-[4px]">
              {/* Phần trên (Nốt chính - Cao vút và siêu mảnh) */}
              <div 
                className={`w-[1.5px] rounded-full transition-all duration-500 ease-out ${isPlayed ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]' : 'bg-[#151515] group-hover/wave:bg-[#222]'}`} 
                style={{ height: `${h * 0.48}%` }} 
              />
              {/* Phần dưới (Phản chiếu - Sâu và mờ ảo) */}
              <div 
                className={`w-[1.5px] rounded-full transition-all duration-500 ease-out ${isPlayed ? 'bg-red-600/30' : 'bg-[#151515]/10'}`} 
                style={{ height: `${h * 0.28}%` }} 
              />
            </div>
          );
        })}
      </div>

      {/* Đường trục trung tâm siêu mờ */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/[0.01] pointer-events-none" />

      {/* Thời gian hiển thị nổi bên dưới sóng */}
      <div className="absolute left-0 -bottom-2 z-10 opacity-0 group-hover/wave:opacity-100 transition-all translate-y-2 group-hover/wave:translate-y-0">
        <span className="bg-red-600 text-white px-2 py-1 rounded text-[8px] font-black tabular-nums shadow-lg">
          {isActive ? currentTime : '0:00'}
        </span>
      </div>
      <div className="absolute right-0 -bottom-2 z-10 opacity-40 group-hover/wave:opacity-100 transition-all translate-y-2 group-hover/wave:translate-y-0">
        <span className="text-white/40 text-[8px] font-black tabular-nums">
          {duration}
        </span>
      </div>

      {/* Seeker line Laser Neon */}
      <div className="absolute top-0 bottom-0 w-[1px] bg-red-600/80 opacity-0 group-hover/wave:opacity-100 pointer-events-none z-20 blur-[0.3px]" style={{ boxShadow: '0 0 25px rgba(220,38,38,1)' }} />
    </div>
  );
};

const MusicPage: React.FC<{ lang: 'vi' | 'en' }> = ({ lang }) => {
  const t = translations[lang];
  const [user] = useState<UserProfile | null>(dbService.getCurrentUser());
  const isAdmin = user?.role === 'ADMIN';

  const [musicLibrary, setMusicLibrary] = useState<MusicAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('Tất cả');
  
  const [currentTrack, setCurrentTrack] = useState<MusicAsset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const genres = ['Tất cả', 'Vlog', 'Gaming', 'Cinematic', 'Electronic', 'Hip Hop', 'SFX', 'Acoustic'];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const musicData = await dbService.getMusic();
      setMusicLibrary(musicData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('loadedmetadata', update);
    return () => {
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('loadedmetadata', update);
    };
  }, [currentTrack]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMusic = useMemo(() => {
    return musicLibrary.filter(track => {
      const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = activeGenre === 'Tất cả' || track.genre === activeGenre;
      return matchesSearch && matchesGenre;
    });
  }, [searchQuery, activeGenre, musicLibrary]);

  const handlePlay = (track: MusicAsset) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
      else { audioRef.current?.play(); setIsPlaying(true); }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
      }
    }
  };

  return (
    <div className="flex-1 bg-[#050505] min-h-screen text-white font-inter">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* Main Container */}
      <div className="px-16 py-16 w-full max-w-full space-y-16 pb-64">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="bg-red-600 p-6 rounded-[36px] shadow-[0_0_60px_rgba(220,38,38,0.4)]">
                 <Music size={44} className="text-white" />
              </div>
              <div>
                <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">Audio <span className="text-red-600">Forge</span></h1>
                <p className="text-[12px] text-[#333] font-black uppercase tracking-[0.6em] mt-4 italic">Hệ thống âm thanh Lucky98media</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
               <div className="relative group">
                  <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-[#111]" size={22} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm âm thanh..." 
                    className="bg-[#080808] border border-white/5 rounded-[40px] py-6 pl-18 pr-12 text-base font-bold focus:border-red-600/40 outline-none transition-all placeholder:text-[#111] min-w-[440px] shadow-inner"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
               </div>
               {isAdmin && (
                 <button onClick={() => setShowAddModal(true)} className="p-6 bg-red-600 text-white rounded-[40px] hover:bg-white hover:text-black transition-all shadow-2xl active:scale-90">
                   <Plus size={36} strokeWidth={3} />
                 </button>
               )}
            </div>
          </div>

          {/* GENRE NAV */}
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar pb-2">
            {genres.map(genre => (
              <button 
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`px-12 py-5 rounded-[28px] text-[13px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  activeGenre === genre 
                  ? 'bg-red-600 border-red-600 text-white shadow-2xl' 
                  : 'bg-white/5 border-white/5 text-[#222] hover:text-white'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* FEED LIST */}
        <div className="space-y-20">
          {loading && musicLibrary.length === 0 ? (
            <div className="py-32 flex flex-col items-center gap-8 opacity-10">
              <Loader2 className="animate-spin" size={64} />
              <p className="text-[16px] font-black uppercase tracking-[0.7em]">Synchronizing Matrix</p>
            </div>
          ) : filteredMusic.map((track) => (
            <div 
              key={track.id} 
              className={`flex items-center gap-16 p-12 rounded-[80px] transition-all group ${currentTrack?.id === track.id ? 'bg-white/[0.04] border border-white/5' : 'hover:bg-white/[0.01] border border-transparent'}`}
            >
              {/* Thumbnail (144x144) */}
              <div className="relative w-36 h-36 shrink-0 rounded-[48px] overflow-hidden bg-[#111] border border-white/5 group-hover:border-red-600/50 transition-all shadow-2xl">
                <img 
                  src={track.thumbnailUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${track.id}`} 
                  className="w-full h-full object-cover opacity-30 group-hover:opacity-100 transition-opacity duration-1000" 
                  alt="" 
                />
                <button 
                  onClick={() => handlePlay(track)}
                  className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-all ${currentTrack?.id === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${currentTrack?.id === track.id ? 'bg-white text-black scale-110' : 'bg-red-600 text-white shadow-2xl hover:scale-110'}`}>
                    {currentTrack?.id === track.id && isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-2" />}
                  </div>
                </button>
              </div>

              {/* Info & Ultra-Tall Waveform */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex items-center justify-between mb-10">
                   <div className="min-w-0">
                      <div className="flex items-center gap-8">
                        <h3 className={`text-4xl font-black uppercase tracking-tighter truncate leading-none ${currentTrack?.id === track.id ? 'text-red-600' : 'text-white'}`}>{track.title}</h3>
                        <span className="text-[11px] bg-red-600/10 px-6 py-2.5 rounded-full text-red-500 font-black uppercase tracking-widest border border-red-600/10">{track.genre}</span>
                      </div>
                      <p className="text-lg text-[#222] font-bold uppercase tracking-[0.4em] mt-5 truncate italic leading-none">{track.artist}</p>
                   </div>
                   
                   <div className="flex items-center gap-12 opacity-0 group-hover:opacity-100 transition-all">
                      <Heart size={28} className="text-[#111] hover:text-red-600 cursor-pointer transition-all" />
                      {isAdmin && (
                        <button onClick={async () => { if(confirm("Xóa?")) { await dbService.deleteMusic(track.id); loadData(); } }} className="text-[#111] hover:text-red-600 transition-all">
                          <Trash2 size={28} />
                        </button>
                      )}
                      <MoreHorizontal size={32} className="text-[#111] hover:text-white cursor-pointer" />
                   </div>
                </div>

                {/* THE FLOATING WAVEFORM */}
                <SoundCloudWaveform 
                  seed={track.id} 
                  isActive={currentTrack?.id === track.id} 
                  progress={progress}
                  duration={track.duration || '0:00'}
                  currentTime={formatTime(currentTime)}
                  onClick={currentTrack?.id === track.id ? (p) => { if(audioRef.current) audioRef.current.currentTime = (p/100)*(audioRef.current.duration||0); } : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FIXED PLAYER BOTTOM */}
      {currentTrack && (
        <div className="fixed bottom-0 left-64 right-0 bg-[#080808]/98 backdrop-blur-3xl border-t border-white/5 z-[400] px-20 py-12 flex items-center justify-between shadow-[0_-50px_120px_rgba(0,0,0,1)]">
           <div className="absolute top-0 left-0 right-0 h-[6px] bg-white/5 cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const p = ((e.clientX - rect.left) / rect.width) * 100;
              if(audioRef.current) audioRef.current.currentTime = (p/100)*(audioRef.current.duration||0);
           }}>
              <div className="h-full bg-red-600 shadow-[0_0_50px_#dc2626]" style={{ width: `${progress}%` }}></div>
           </div>

           <div className="flex items-center gap-12 min-w-[440px]">
              <div className="relative w-24 h-24 rounded-[40px] overflow-hidden border border-white/5 shadow-2xl">
                <img src={currentTrack.thumbnailUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentTrack.id}`} className="w-full h-full object-cover grayscale" />
              </div>
              <div className="min-w-0">
                 <h4 className="text-3xl font-black text-white truncate uppercase italic tracking-tighter leading-none">{currentTrack.title}</h4>
                 <p className="text-[13px] text-red-600 font-black uppercase tracking-[0.5em] mt-5">{currentTrack.artist}</p>
              </div>
           </div>

           <div className="flex items-center gap-20">
              <SkipBack size={36} className="text-[#222] hover:text-white cursor-pointer transition-colors" />
              <button onClick={() => handlePlay(currentTrack)} className="w-28 h-28 bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_80px_rgba(220,38,38,0.5)] hover:scale-110 active:scale-90 transition-all group">
                 {isPlaying ? <Pause size={52} fill="white" /> : <Play size={52} fill="white" className="ml-2.5" />}
              </button>
              <SkipForward size={36} className="text-[#222] hover:text-white cursor-pointer transition-colors" />
           </div>

           <div className="flex items-center gap-16 min-w-[380px] justify-end">
              <div className="text-[18px] font-black tabular-nums space-x-5">
                 <span className="text-red-600">{formatTime(currentTime)}</span>
                 <span className="text-[#111]">/</span>
                 <span className="text-white/30">{formatTime(duration)}</span>
              </div>
              <div className="group flex items-center gap-8">
                <Volume2 size={32} className="text-[#111] group-hover:text-white transition-colors" />
                <div className="w-40 h-2.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-red-600/90 w-full shadow-[0_0_20px_#dc2626]"></div>
                </div>
              </div>
              <button onClick={() => { audioRef.current?.pause(); setCurrentTrack(null); setIsPlaying(false); }} className="p-5 hover:bg-red-600/20 rounded-[32px] text-[#111] hover:text-red-600 transition-all">
                 <X size={36} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
