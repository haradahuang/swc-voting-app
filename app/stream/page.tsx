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
    
    const channel = supabase.channel('realtime-stream')
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

  // 讀取專屬於 Stream 的位置大小參數 (若無則使用預設值 50/100)
  const p1SX = match.p1_stream_x ?? 50;
  const p1SY = match.p1_stream_y ?? 50;
  const p1SSize = match.p1_stream_size ?? 100;
  
  const p2SX = match.p2_stream_x ?? 50;
  const p2SY = match.p2_stream_y ?? 50;
  const p2SSize = match.p2_stream_size ?? 100;

  return (
    <div className="w-[1920px] h-[320px] bg-transparent flex overflow-hidden font-sans select-none drop-shadow-2xl">

      {/* 1. 最左側：LIVE VOTE 標題區 */}
      <div className="w-[180px] h-full bg-white flex flex-col items-center justify-center border-r-[6px] border-[#0a267a] shrink-0 z-20">
         <div className="text-3xl font-black text-[#0f172a] leading-tight mb-2 text-center tracking-wide">
           LIVE<br/>VOTE
         </div>
         <div className="bg-black text-yellow-400 font-bold px-3 py-1 rounded-md text-xs tracking-widest shadow-md">
           SWC 2025
         </div>
      </div>

      {/* 2. 藍方選手頭像區 (灰底) */}
      <div className="w-[280px] h-full bg-[#e5e7eb] relative shrink-0 overflow-hidden z-10">
         <div className="w-full h-full relative flex items-center justify-center">
            {match.p1_avatar && (
              <img 
                src={match.p1_avatar} 
                style={{ transform: `translate(${p1SX - 50}%, ${p1SY - 50}%) scale(${p1SSize / 100})` }} 
                className="absolute w-[800px] h-[800px] object-contain max-w-none" 
                alt="p1" 
              />
            )}
         </div>
         {/* 邊緣漸層陰影，增加立體感 */}
         <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
      </div>

      {/* 3. 藍方數據區 */}
      <div className="flex-1 h-full bg-[#0a267a] flex flex-col justify-center px-10 relative z-20 shadow-[10px_0_20px_rgba(0,0,0,0.4)]">
         <div className="flex items-center gap-3 mb-1">
           <span className="bg-white text-[#0a267a] font-black px-2 py-0.5 rounded text-sm tracking-wider">BLUE</span>
           <span className="text-3xl font-bold text-white tracking-widest">{match.p1_name}</span>
         </div>
         <div className="flex items-baseline gap-4">
           <motion.div key={`p1-${match.p1_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-md">
             <span className="text-[100px] font-black leading-none">{p1Int}</span>
             <span className="text-[45px] font-black leading-none">.{p1Dec}</span>
             <span className="text-[30px] font-bold ml-1">%</span>
           </motion.div>
           <div className="text-[#93c5fd] font-bold text-xl tracking-widest">
             {match.p1_votes} <span className="text-sm opacity-80">VOTES</span>
           </div>
         </div>
      </div>

      {/* 4. 紅方數據區 (反轉排版) */}
      <div className="flex-1 h-full bg-[#9e0b18] flex flex-col justify-center items-end px-10 relative z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.4)]">
         <div className="flex items-center gap-3 mb-1">
           <span className="text-3xl font-bold text-white tracking-widest">{match.p2_name}</span>
           <span className="bg-white text-[#9e0b18] font-black px-2 py-0.5 rounded text-sm tracking-wider">RED</span>
         </div>
         <div className="flex items-baseline gap-4 flex-row-reverse">
           <motion.div key={`p2-${match.p2_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-md">
             <span className="text-[100px] font-black leading-none">{p2Int}</span>
             <span className="text-[45px] font-black leading-none">.{p2Dec}</span>
             <span className="text-[30px] font-bold ml-1">%</span>
           </motion.div>
           <div className="text-[#fca5a5] font-bold text-xl tracking-widest">
             {match.p2_votes} <span className="text-sm opacity-80">VOTES</span>
           </div>
         </div>
      </div>

      {/* 5. 紅方選手頭像區 (灰底) */}
      <div className="w-[280px] h-full bg-[#e5e7eb] relative shrink-0 overflow-hidden z-20">
         <div className="w-full h-full relative flex items-center justify-center">
            {match.p2_avatar && (
              <img 
                src={match.p2_avatar} 
                style={{ transform: `translate(${p2SX - 50}%, ${p2SY - 50}%) scale(${p2SSize / 100})` }} 
                className="absolute w-[800px] h-[800px] object-contain max-w-none" 
                alt="p2" 
              />
            )}
         </div>
         <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
      </div>

    </div>
  );
}