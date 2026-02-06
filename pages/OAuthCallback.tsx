import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (code) {
      // TRƯỜNG HỢP 1: Chạy trong Popup -> Gửi tin nhắn về cửa sổ cha
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_CODE', code }, window.location.origin);
        window.close(); // Đóng popup ngay lập tức
      } 
      // TRƯỜNG HỢP 2: Chạy cùng Tab (nếu không mở popup) -> Lưu vào Storage và quay về
      else {
        localStorage.setItem('pending_oauth_code', code);
        navigate('/channels');
      }
    } else if (error) {
      alert('Lỗi xác thực Google: ' + error);
      if (window.opener) window.close();
      else navigate('/channels');
    }
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center text-white space-y-6">
      <Loader2 size={64} className="animate-spin text-red-600" />
      <div className="text-center">
        <h3 className="text-xl font-black uppercase italic tracking-widest">Đang xác thực...</h3>
        <p className="text-[10px] text-[#555] font-black uppercase tracking-[0.3em] mt-2">Vui lòng không tắt cửa sổ này</p>
      </div>
    </div>
  );
};

export default OAuthCallback;