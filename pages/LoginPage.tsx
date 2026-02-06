import React, { useState } from 'react';
import { Video, Lock, User, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { dbService } from '../services/dbService';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // dbService.login(email, password) - username ở đây được truyền vào tham số email
      const user = await dbService.login(username, password);

      if (user) {
        onLoginSuccess();
      } else {
        setError('Sai tài khoản hoặc mật khẩu.');
      }
    } catch (err) {
      setError('Không thể kết nối tới server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 font-inter overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="bg-red-600 p-4 rounded-[32px] shadow-[0_0_40px_rgba(220,38,38,0.4)] mb-6">
            <Video size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white italic uppercase">Studio Pro</h1>
          <p className="text-[10px] text-[#444] font-black uppercase tracking-[0.4em] mt-2 italic">
            Hệ thống quản trị nội dung
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0f0f0f] border border-white/5 rounded-[48px] p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="text-[10px] font-black text-[#444] uppercase tracking-widest ml-4 italic">
                Tài khoản
              </label>
              <div className="relative">
                <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#444]" />
                <input
                  type="text"
                  required
                  className="w-full py-5 pl-14 pr-6 bg-white/[0.03] border border-white/5 rounded-full text-sm font-bold text-white outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-black text-[#444] uppercase tracking-widest ml-4 italic">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#444]" />
                <input
                  type="password"
                  required
                  className="w-full py-5 pl-14 pr-6 bg-white/[0.03] border border-white/5 rounded-full text-sm font-bold text-white outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-600/10 border border-red-600/30 rounded-xl text-[11px] text-red-500 font-bold">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-red-600 text-white rounded-full font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Đăng nhập <ChevronRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;