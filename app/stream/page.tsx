'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function StreamOverlayPage() {
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('id', 1).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    const channel = supabase.channel('realtime-stream-overlay')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!match) return <div className="bg-transparent w-[1920px] h-[320px]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;

  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  return (
    <div className="w-[1920px] h-[320px] bg-transparent flex items-end overflow-hidden font-sans select-none relative">
      
      {/* 🔵 左半邊：藍方區塊 */}
      <div className="flex-1 h-[280px] bg-gradient-to-r from-[#0a267a] to-[#0f3cc9] flex relative overflow-hidden border-t-4 border-blue-400">
        
        {/* 💡 選手頭像：縮放並融入背景 */}
        <div className="absolute left-0 top-0 w-[400px] h-full overflow-hidden opacity-40 mix-blend-luminosity">
          {match.p1_avatar && (
            <img 
              src={match.p1_avatar} 
              className="w-full h-full object-cover object-top scale-[1.8] origin-top" 
              alt="p1" 
            />
          )}
        </div>

        {/* 數據內容 (靠右對齊中央) */}
        <div className="flex-1 flex flex-col justify-center items-end px-12 z-10">
           <h2 className="text-4xl font-black text-white italic tracking-widest mb-1 drop-shadow-lg uppercase">
             {match.p1_name}
           </h2>
           <div className="flex items-baseline gap-6">
             <div className="text-2xl font-bold text-blue-200 opacity-80 tracking-tighter">
               {match.p1_votes} <span className="text-sm">VOTES</span>
             </div>
             <motion.div 
               key={`st-p1-${match.p1_votes}`}
               initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
               className="flex items-baseline text-white scale-y-[1.8] origin-bottom tracking-tighter"
             >
               <span className="text-[110px] font-black leading-none">{p1Int}</span>
               <span className="text-[45px] font-black leading-none">.{p1Dec}</span>
               <span className="text-[25px] font-bold ml-1 opacity-70">%</span>
             </motion.div>
           </div>
        </div>
      </div>

      {/* ⚡ 中央控制區：LIVE VOTE (300px) */}
      <div className="w-[300px] h-[300px] bg-[#05050a] flex flex-col items-center justify-center relative z-30 border-t-4 border-yellow-500 shadow-[0_0_50px_rgba(0,0,0,1)]">
        <div className="absolute -top-1 w-full h-1 bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]"></div>
        <div className="text-5xl font-black italic text-white leading-tight tracking-tighter text-center">
          LIVE<br/>VOTE
        </div>
        <div className="mt-3 px-4 py-1 bg-yellow-500 text-black text-sm font-black tracking-[0.3em] rounded-sm">
          SWC 2025
        </div>
        {/* 裝飾線 */}
        <div className="absolute left-0 h-2/3 w-[1px] bg-white/10"></div>
        <div className="absolute right-0 h-2/3 w-[1px] bg-white/10"></div>
      </div>

      {/* 🔴 右半邊：紅方區塊 */}
      <div className="flex-1 h-[280px] bg-gradient-to-l from-[#7a0a16] to-[#c90f22] flex flex-row-reverse relative overflow-hidden border-t-4 border-red-400">
        
        {/* 💡 選手頭像 */}
        <div className="absolute right-0 top-0 w-[400px] h-full overflow-hidden opacity-40 mix-blend-luminosity">
          {match.p2_avatar && (
            <img 
              src={match.p2_avatar} 
              className="w-full h-full object-cover object-top scale-[1.8] origin-top" 
              alt="p2" 
            />
          )}
        </div>

        {/* 數據內容 (靠左對齊中央) */}
        <div className="flex-1 flex flex-col justify-center items-start px-12 z-10 text-left">
           <h2 className="text-4xl font-black text-white italic tracking-widest mb-1 drop-shadow-lg uppercase">
             {match.p2_name}
           </h2>
           <div className="flex items-baseline gap-6 flex-row-reverse">
             <div className="text-2xl font-bold text-red-200 opacity-80 tracking-tighter">
               {match.p2_votes} <span className="text-sm">VOTES</span>
             </div>
             <motion.div 
               key={`st-p2-${match.p2_votes}`}
               initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
               className="flex items-baseline text-white scale-y-[1.8] origin-bottom tracking-tighter"
             >
               <span className="text-[110px] font-black leading-none">{p2Int}</span>
               <span className="text-[45px] font-black leading-none">.{p2Dec}</span>
               <span className="text-[25px] font-bold ml-1 opacity-70">%</span>
             </motion.div>
           </div>
        </div>
      </div>

    </div>
  );
}