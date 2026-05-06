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
    const channel = supabase.channel('realtime-mobile')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (player: 1 | 2) => {
    console.log("正在嘗試投票給選手:", player); // 💡 偵錯用
    const { error } = await supabase.rpc('increment_vote', { player });
    
    if (error) {
      console.error("投票失敗，原因:", error.message);
      alert("投票出錯了: " + error.message); // 💡 直接跳警告視窗讓我們知道原因
    } else {
      console.log("投票成功！");
      const playerName = player === 1 ? match?.p1_name : match?.p2_name;
      setToastMsg(`VOTED FOR ${playerName}!`);
      setTimeout(() => setToastMsg(null), 1500);
    }
    
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        window.navigator.vibrate(50);
    }
  };

  if (!match) return <div className="h-screen w-screen bg-[#05050a] flex items-center justify-center text-white font-bold tracking-widest text-2xl animate-pulse">LOADING...</div>;

  return (
    <div className="h-[100dvh] w-full bg-[#05050a] flex flex-col overflow-hidden font-sans select-none relative text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#05050a] to-black opacity-90" />

      {/* 頂部標題 */}
      <div className="relative z-10 w-full pt-8 pb-4 flex flex-col items-center shrink-0">
        <h1 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-wider mb-1">
          LIVE PREDICTION
        </h1>
        <p className="text-gray-400 text-xs tracking-[0.2em] uppercase bg-black/50 px-4 py-1 rounded-full border border-gray-800">
          SELECT YOUR WINNER
        </p>
      </div>

      {/* 戰鬥條區 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 px-4 pb-8 min-h-0 flex">
        <div className="w-full h-full rounded-[2rem] overflow-hidden flex relative shadow-[0_0_50px_rgba(0,0,0,1)] border border-white/10 bg-[#020205]">

          {/* 🔵 左半邊 */}
          <motion.div 
            whileTap={{ brightness: 1.5, scale: 0.98 }}
            onClick={() => handleVote(1)}
            className="w-1/2 h-full relative cursor-pointer group border-r border-white/5"
          >
            {match.p1_avatar && (
              <img 
                src={match.p1_avatar} 
                className="absolute inset-0 w-full h-full object-cover object-top opacity-100 transition-transform duration-700 group-hover:scale-105"
                alt="p1"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-10 left-0 w-full flex flex-col items-center">
              <h2 className="text-2xl md:text-4xl font-black italic tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">{match.p1_name}</h2>
              <div className="mt-3 px-4 py-1 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.5)]">Tap to Vote</div>
            </div>
          </motion.div>

          {/* ⚡ 中央線與 VS */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black text-white italic font-black text-3xl rounded-full w-16 h-16 flex items-center justify-center border-2 border-white/20 shadow-[0_0_20px_rgba(0,0,0,1)]">
            VS
          </div>

          {/* 🔴 右半邊 */}
          <motion.div 
            whileTap={{ brightness: 1.5, scale: 0.98 }}
            onClick={() => handleVote(2)}
            className="w-1/2 h-full relative cursor-pointer group"
          >
            {match.p2_avatar && (
              <img 
                src={match.p2_avatar} 
                className="absolute inset-0 w-full h-full object-cover object-top opacity-100 transition-transform duration-700 group-hover:scale-105"
                alt="p2"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-10 left-0 w-full flex flex-col items-center">
              <h2 className="text-2xl md:text-4xl font-black italic tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,1)]">{match.p2_name}</h2>
              <div className="mt-3 px-4 py-1 bg-red-600 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)]">Tap to Vote</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 投票成功提示 */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black px-8 py-3 rounded-full font-black italic shadow-[0_0_30px_rgba(250,204,21,0.5)]"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}