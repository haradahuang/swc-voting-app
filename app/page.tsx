'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function VotePage() {
  const [match, setMatch] = useState<any>(null);

  // 💡 測試模式：目前仍註解掉防連點機制
  // const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const fetchMatch = () => {
      // 💡 這裡我們只需要抓取名字和照片，不顯示票數，確保盲投！
      supabase.from('active_match').select('*').eq('id', 1).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    const channel = supabase.channel('realtime-mobile')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (player: 1 | 2) => {
    // 💡 正式上線時，記得把這些註解拿掉
    // if (hasVoted) return;
    // setHasVoted(true);
    // localStorage.setItem('swc_voted_p', player.toString());

    await supabase.rpc('increment_vote', { player });
    
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
  };

  if (!match) return <div className="h-screen w-screen bg-[#05050a] flex items-center justify-center text-white font-bold tracking-widest">LOADING...</div>;

  return (
    <div className="h-[100dvh] w-full bg-[#05050a] flex flex-col overflow-hidden font-sans select-none relative">
      
      {/* 科技感深色背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#05050a] to-black opacity-90" />

      {/* ================= 頂部標題區 ================= */}
      <div className="relative z-10 w-full pt-8 pb-4 flex flex-col items-center justify-center shrink-0">
        <h1 className="text-3xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-wider drop-shadow-[0_0_15px_rgba(250,204,21,0.4)] mb-1">
          LIVE PREDICTION
        </h1>
        <p className="text-gray-400 text-xs md:text-sm tracking-[0.2em] uppercase bg-black/50 px-4 py-1 rounded-full border border-gray-800">
          Select Your Winner
        </p>
      </div>

      {/* ================= 統一對立戰鬥區 ================= */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 px-4 pb-8 min-h-0 flex">
        
        {/* 外層大容器：整合為單一螢幕 */}
        <div className="w-full h-full rounded-[2rem] overflow-hidden flex relative shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 bg-black">

          {/* 🔵 左半邊：藍方戰鬥區 */}
          <motion.div 
            whileTap={{ filter: "brightness(1.5)", scale: 0.98 }}
            onClick={() => handleVote(1)}
            className="w-1/2 h-full relative cursor-pointer group bg-gradient-to-br from-[#0a1947] to-black"
          >
            {/* 滿版照片 */}
            {match.p1_avatar && (
              <img 
                src={match.p1_avatar} 
                alt={match.p1_name} 
                className="absolute inset-0 w-full h-full object-cover object-top opacity-70 mix-blend-screen transition-transform duration-700 group-hover:scale-110"
              />
            )}
            {/* 底部重度漸層，讓文字浮現 */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
            
            {/* 名字與操作提示 */}
            <div className="absolute bottom-6 md:bottom-10 left-0 w-full flex flex-col items-center px-2">
              <h2 className="text-xl md:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,1)] text-center leading-tight">
                {match.p1_name}
              </h2>
              <div className="mt-2 text-blue-400 text-[10px] md:text-sm font-bold tracking-[0.3em] uppercase animate-pulse bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/30">
                Tap to Vote
              </div>
            </div>
          </motion.div>

          {/* ⚡ 中央發光對立線 */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 -translate-x-1/2" />

          {/* ⚔️ 中央裝甲 VS 徽章 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-[#05050a] text-white italic font-black text-2xl md:text-4xl rounded-full w-14 h-14 md:w-20 md:h-20 flex items-center justify-center border-[3px] border-gray-700 shadow-[0_0_30px_rgba(0,0,0,1)]">
            VS
          </div>

          {/* 🔴 右半邊：紅方戰鬥區 */}
          <motion.div 
            whileTap={{ filter: "brightness(1.5)", scale: 0.98 }}
            onClick={() => handleVote(2)}
            className="w-1/2 h-full relative cursor-pointer group bg-gradient-to-bl from-[#4a0d14] to-black"
          >
            {/* 滿版照片 */}
            {match.p2_avatar && (
              <img 
                src={match.p2_avatar} 
                alt={match.p2_name} 
                className="absolute inset-0 w-full h-full object-cover object-top opacity-70 mix-blend-screen transition-transform duration-700 group-hover:scale-110"
              />
            )}
            {/* 底部重度漸層 */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0505] via-[#1a0505]/40 to-transparent" />
            
            {/* 名字與操作提示 */}
            <div className="absolute bottom-6 md:bottom-10 left-0 w-full flex flex-col items-center px-2">
              <h2 className="text-xl md:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,1)] text-center leading-tight">
                {match.p2_name}
              </h2>
              <div className="mt-2 text-red-400 text-[10px] md:text-sm font-bold tracking-[0.3em] uppercase animate-pulse bg-red-900/30 px-3 py-1 rounded-full border border-red-500/30">
                Tap to Vote
              </div>
            </div>
          </motion.div>

        </div>
      </div>

    </div>
  );
}