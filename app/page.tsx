'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function VotePage() {
  const [match, setMatch] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('id', 1).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    const channel = supabase.channel('realtime-mobile-v2')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (player: 1 | 2) => {
    const { error } = await supabase.rpc('increment_vote', { player });
    if (!error) {
      const playerName = player === 1 ? match?.p1_name : match?.p2_name;
      setToastMsg(`✅ SUCCESS: ${playerName}`);
      setTimeout(() => setToastMsg(null), 1200);
    }
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(50);
    }
  };

  if (!match) return <div className="h-screen w-screen bg-[#05050a] flex items-center justify-center text-white font-black italic tracking-widest text-3xl animate-pulse">LOADING...</div>;

  // 💡 同步 Stream 模式的座標參數
  const p1 = { x: match.p1_stream_x ?? 50, y: match.p1_stream_y ?? 50, size: match.p1_stream_size ?? 100 };
  const p2 = { x: match.p2_stream_x ?? 50, y: match.p2_stream_y ?? 50, size: match.p2_stream_size ?? 100 };

  return (
    <div className="h-[100dvh] w-full bg-[#020205] flex flex-col overflow-hidden font-sans select-none text-white">
      
      {/* 頂部賽事標語 */}
      <div className="absolute top-0 w-full z-30 pt-6 pb-2 flex flex-col items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h1 className="text-2xl md:text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 tracking-tighter uppercase drop-shadow-xl">
          {match.tournament_name || 'SWC 2025'}
        </h1>
        <div className="text-[10px] md:text-xs text-zinc-400 font-bold tracking-[0.4em] uppercase mt-1">Live Prediction</div>
      </div>

      {/* ================= 投票對戰區 (手機上下, PC左右) ================= */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* 🔵 左方 / 上方：藍方選手 */}
        <motion.div 
          whileTap={{ brightness: 1.6 }}
          onClick={() => handleVote(1)}
          className="flex-1 relative cursor-pointer group overflow-hidden border-b md:border-b-0 md:border-r border-white/5"
        >
          {/* 背景光暈 */}
          <div className="absolute inset-0 bg-blue-900/20 z-0" />
          
          {/* 💡 頭像連動後台 Stream 參數 */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {match.p1_avatar && (
              <img 
                src={match.p1_avatar} 
                style={{ transform: `translate(${p1.x - 50}%, ${p1.y - 50}%) scale(${p1.size / 100})` }} 
                className="w-full h-full object-contain transition-transform duration-500 group-active:scale-[1.1]" 
                alt="p1"
              />
            )}
          </div>

          {/* 名字與裝飾 */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-transparent to-transparent z-10" />
          <div className="absolute bottom-4 md:bottom-12 left-0 w-full flex flex-col items-center z-20">
             <div className="text-xs font-black text-blue-400 tracking-[0.3em] uppercase mb-1">Team Blue</div>
             <h2 className="text-3xl md:text-6xl font-black italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase">{match.p1_name}</h2>
             <div className="mt-4 px-8 py-2 bg-blue-600 rounded-full text-sm font-black italic tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.6)]">VOTE</div>
          </div>
        </motion.div>

        {/* ⚔️ 中央 VS 標誌 (手機隱藏或縮小) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-black text-white italic font-black text-2xl md:text-5xl rounded-full w-12 h-12 md:w-24 md:h-24 flex items-center justify-center border-2 border-white/20 shadow-[0_0_30px_rgba(0,0,0,1)]">
            VS
          </div>
        </div>

        {/* 🔴 右方 / 下方：紅方選手 */}
        <motion.div 
          whileTap={{ brightness: 1.6 }}
          onClick={() => handleVote(2)}
          className="flex-1 relative cursor-pointer group overflow-hidden"
        >
          {/* 背景光暈 */}
          <div className="absolute inset-0 bg-red-900/20 z-0" />

          {/* 💡 頭像連動後台 Stream 參數 */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {match.p2_avatar && (
              <img 
                src={match.p2_avatar} 
                style={{ transform: `translate(${p2.x - 50}%, ${p2.y - 50}%) scale(${p2.size / 100})` }} 
                className="w-full h-full object-contain transition-transform duration-500 group-active:scale-[1.1]" 
                alt="p2"
              />
            )}
          </div>

          {/* 名字與裝飾 */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-transparent to-transparent z-10" />
          <div className="absolute bottom-4 md:bottom-12 left-0 w-full flex flex-col items-center z-20">
             <div className="text-xs font-black text-red-400 tracking-[0.3em] uppercase mb-1">Team Red</div>
             <h2 className="text-3xl md:text-6xl font-black italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase">{match.p2_name}</h2>
             <div className="mt-4 px-8 py-2 bg-red-600 rounded-full text-sm font-black italic tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.6)]">VOTE</div>
          </div>
        </motion.div>
      </div>

      {/* 投票成功彈窗 */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="absolute inset-0 m-auto w-fit h-fit z-50 bg-white text-black px-10 py-5 rounded-2xl font-black italic text-2xl shadow-[0_0_60px_rgba(255,255,255,0.6)] border-4 border-black"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}