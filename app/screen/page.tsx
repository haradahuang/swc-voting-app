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
      supabase.from('active_match').select('*').eq('is_active', true).single().then(({ data }) => setMatch(data));
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

  // 動態字體大小計算邏輯
  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-6xl";
  if (maxNameLen >= 8) nameTextClass = "text-4xl";
  else if (maxNameLen >= 5) nameTextClass = "text-5xl";

  // 將票數拆解為「整數」與「小數」部位
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  return (
    <div className="h-screen w-screen bg-[#050505] flex overflow-hidden font-sans select-none relative">
      
      {/* ================= 左半邊：藍方 ================= */}
      <div className="relative w-1/2 h-full z-10">
        
        <div className="absolute right-0 top-0 w-[65%] h-[75%] bg-gradient-to-b from-[#0a38b3] to-[#051c5e] pt-10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
          
          {/* 💡 巨型數字特效：綁定 p1_votes，每次得票觸發震動與白光 */}
          <motion.div 
            key={`bg-p1-${match.p1_votes}`} 
            initial={{ filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))", x: 0 }}
            animate={{ 
              x: [0, -4, 4, -2, 2, 0], // 左右微震動
              filter: [
                "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))",
                "drop-shadow(0px 0px 60px rgba(255, 255, 255, 0.9))", // 瞬間邊緣發光
                "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))"
              ]
            }} 
            transition={{ duration: 0.3 }}
            className="absolute top-6 left-6 text-white flex items-baseline z-0 opacity-90 scale-y-[1.9] origin-top-left tracking-tighter"
          >
            {/* 將內部的 drop-shadow 移除，統一交由上層 motion.div 的 filter 發光 */}
            <span className="text-[140px] font-black leading-none">{p1Int}</span>
            <span className="text-[45px] font-black leading-none -ml-1">.{p1Dec}</span>
            <span className="text-[24px] font-black ml-1">%</span>
          </motion.div>
        </div>

        <div 
          className="absolute right-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#051c5e] to-[#0a38b3] overflow-hidden shadow-[20px_0_50px_rgba(0,0,0,0.5)]" 
          style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 0% 100%)' }}
        >
           <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/50 to-transparent"></div>
        </div>

        <div className="absolute right-0 top-0 w-[65%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p1_avatar && (
              <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p1_name} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
          </div>
          <div className="text-center z-30 -translate-x-16">
            <h2 className={`${nameTextClass} font-black text-white uppercase tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2 transition-all`}>{match.p1_name}</h2>
            <div className="text-3xl font-bold text-blue-300 tracking-widest drop-shadow-md flex justify-center items-baseline gap-2 mt-1">
              <motion.span
                key={match.p1_votes} 
                initial={{ scale: 2, color: '#ffffff' }} 
                animate={{ scale: 1, color: '#93c5fd' }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }} 
                className="inline-block origin-bottom"
              >
                {match.p1_votes}
              </motion.span>
              <span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 右半邊：紅方 ================= */}
      <div className="relative w-1/2 h-full z-0">
        
        <div className="absolute left-0 top-0 w-[65%] h-[75%] bg-gradient-to-b from-[#c20a1f] to-[#6b030e] pt-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          
          {/* 💡 巨型數字特效：綁定 p2_votes，每次得票觸發震動與白光 */}
          <motion.div 
            key={`bg-p2-${match.p2_votes}`} 
            initial={{ filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))", x: 0 }}
            animate={{ 
              x: [0, -4, 4, -2, 2, 0], 
              filter: [
                "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))",
                "drop-shadow(0px 0px 60px rgba(255, 255, 255, 0.9))", 
                "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))"
              ]
            }} 
            transition={{ duration: 0.3 }}
            className="absolute top-6 right-6 text-white flex items-baseline z-0 opacity-90 scale-y-[1.9] origin-top-right tracking-tighter"
          >
            <span className="text-[140px] font-black leading-none">{p2Int}</span>
            <span className="text-[45px] font-black leading-none -ml-1">.{p2Dec}</span>
            <span className="text-[24px] font-black ml-1">%</span>
          </motion.div>
        </div>

        <div 
          className="absolute left-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#6b030e] to-[#c20a1f] overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.5)]" 
          style={{ clipPath: 'polygon(0 0, 65% 0, 100% 100%, 0% 100%)' }}
        >
           <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/50 to-transparent"></div>
        </div>

        <div className="absolute left-0 top-0 w-[65%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p2_avatar && (
              <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p2_name} onError={(e) => e.currentTarget.style.display = 'none'} />
            )}
          </div>
          <div className="text-center z-30 translate-x-16">
            <h2 className={`${nameTextClass} font-black text-white uppercase tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2 transition-all`}>{match.p2_name}</h2>
            <div className="text-3xl font-bold text-red-300 tracking-widest drop-shadow-md flex justify-center items-baseline gap-2 mt-1">
              <motion.span
                key={match.p2_votes} 
                initial={{ scale: 2, color: '#ffffff' }} 
                animate={{ scale: 1, color: '#fca5a5' }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }} 
                className="inline-block origin-bottom"
              >
                {match.p2_votes}
              </motion.span>
              <span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 頂部標籤 ================= */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-black px-8 py-2 rounded-b-xl border-b border-white/10 shadow-2xl flex flex-col items-center">
        <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-[0.4em] uppercase">
          Live Prediction
        </h1>
      </div>

      {/* ================= 右下角：自動生成 QRCode ================= */}
      {originUrl && (
        <motion.div 
          initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
          className="absolute bottom-12 right-12 z-40 bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-red-900/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center"
        >
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <h3 className="text-white font-bold text-sm tracking-widest uppercase">Scan To Vote</h3>
          </div>
          <div className="bg-white p-2 rounded-2xl shadow-inner">
            <QRCode value={originUrl} size={110} level="H" />
          </div>
        </motion.div>
      )}

    </div>
  );
}