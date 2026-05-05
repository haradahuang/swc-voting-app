'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('id', 1).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    const channel = supabase.channel('realtime-screen')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!match) return <div className="min-h-screen bg-[#050505]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;

  // 動態字體大小計算邏輯：偵測兩邊最長的名字
  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-6xl"; // 預設大小 (適合 2~4 個字)
  if (maxNameLen >= 8) {
    nameTextClass = "text-4xl"; // 超長名字縮小
  } else if (maxNameLen >= 5) {
    nameTextClass = "text-5xl"; // 中等長度縮小
  }

  return (
    <div className="h-screen w-screen bg-[#050505] flex overflow-hidden font-sans select-none relative">
      
      {/* ================= 左半邊：藍方 ================= */}
      <div className="relative w-1/2 h-full z-10">
        <div className="absolute right-0 top-0 w-[85%] h-[75%] bg-gradient-to-b from-[#0a38b3] to-[#051c5e] pt-10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
          <motion.div key={`p1-${p1Rate}`} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute top-12 left-12 text-white flex items-baseline z-0 opacity-80">
            <span className="text-[200px] font-black leading-none tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">{p1Rate.toFixed(0)}</span>
            <span className="text-7xl font-bold ml-2">%</span>
          </motion.div>
        </div>
        <div className="absolute right-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#03113d] to-[#010617] shadow-[20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }}>
           <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent"></div>
        </div>
        <div className="absolute right-0 top-0 w-[85%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p1_avatar && (
              <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p1_name} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
          </div>
          <div className="text-center z-30 -translate-x-20">
            {/* 套用動態字體 Class */}
            <h2 className={`${nameTextClass} font-black text-white uppercase tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2 transition-all`}>{match.p1_name}</h2>
            <div className="text-3xl font-bold text-blue-300 tracking-widest drop-shadow-md">{match.p1_votes} <span className="text-xl opacity-70">VOTES</span></div>
          </div>
        </div>
      </div>

      {/* ================= 右半邊：紅方 ================= */}
      <div className="relative w-1/2 h-full z-0">
        <div className="absolute left-0 top-0 w-[85%] h-[75%] bg-gradient-to-b from-[#c20a1f] to-[#6b030e] pt-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <motion.div key={`p2-${p2Rate}`} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute top-12 right-12 text-white flex items-baseline z-0 opacity-80">
            <span className="text-[200px] font-black leading-none tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">{p2Rate.toFixed(0)}</span>
            <span className="text-7xl font-bold ml-2">%</span>
          </motion.div>
        </div>
        <div className="absolute left-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#3b0107] to-[#120002] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden" style={{ clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)' }}>
           <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/80 to-transparent"></div>
        </div>
        <div className="absolute left-0 top-0 w-[85%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p2_avatar && (
              <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p2_name} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
          </div>
          <div className="text-center z-30 translate-x-20">
            {/* 套用動態字體 Class */}
            <h2 className={`${nameTextClass} font-black text-white uppercase tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2 transition-all`}>{match.p2_name}</h2>
            <div className="text-3xl font-bold text-red-300 tracking-widest drop-shadow-md">{match.p2_votes} <span className="text-xl opacity-70">VOTES</span></div>
          </div>
        </div>
      </div>

      {/* ================= 畫面中央裝飾：VS ================= */}
      {/* 提升高度至 top-[50%] (正中央) */}
      <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <div className="text-[90px] px-4 font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          VS
        </div>
      </div>

      {/* ================= 頂部標籤 ================= */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-black px-8 py-2 rounded-b-xl border-b border-white/10 shadow-2xl flex flex-col items-center">
        <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-[0.4em] uppercase">
          Live Prediction
        </h1>
      </div>

      {/* ================= 右上角：自動生成 QRCode 掃碼區 ================= */}
      {/* 高度下調至 top-[35%]，約在數字 50% 的下半部 */}
      {originUrl && (
        <motion.div 
          initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
          className="absolute top-[35%] right-10 z-40 bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-red-900/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center"
        >
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <h3 className="text-white font-bold text-sm tracking-widest uppercase">Scan To Vote</h3>
          </div>
          <div className="bg-white p-2 rounded-2xl shadow-inner">
            <QRCode value={originUrl} size={120} level="H" />
          </div>
        </motion.div>
      )}

    </div>
  );
}