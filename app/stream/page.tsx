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

  // 拆解小數點
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  return (
    // 💡 嚴格鎖定 1920x320，使用 Flex 橫向排列，絕對不會疊字
    <div className="w-[1920px] h-[320px] bg-transparent flex overflow-hidden font-sans select-none drop-shadow-2xl">

      {/* ================= 1. 最左側：LIVE VOTE 標題區 (寬度 220px) ================= */}
      <div className="w-[220px] h-full bg-white flex flex-col items-center justify-center border-r-[8px] border-[#0a267a] shrink-0 z-20">
         <div className="text-4xl font-black text-[#0f172a] leading-none mb-3 text-center tracking-wide">
           LIVE<br/>VOTE
         </div>
         <div className="bg-black text-yellow-400 font-bold px-4 py-1.5 rounded-md text-sm tracking-widest shadow-md">
           SWC 2025
         </div>
      </div>

      {/* ================= 2. 藍方選手頭像區 (寬度 300px) ================= */}
      <div className="w-[300px] h-full bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] relative shrink-0 shadow-inner overflow-hidden z-10 border-r border-black/10">
         {/* 💡 完美套用後台的 X, Y, Size 參數控制 */}
         <div className="w-full h-full relative flex items-center justify-center">
            {match.p1_avatar && (
              <img 
                src={match.p1_avatar} 
                style={{ 
                  transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})` 
                }} 
                className="absolute w-[600px] h-[600px] object-contain max-w-none" 
                alt="p1" 
              />
            )}
         </div>
      </div>

      {/* ================= 3. 藍方數據區 (自適應寬度 flex-1) ================= */}
      <div className="flex-1 h-full bg-[#0a267a] flex flex-col justify-center px-12 relative z-20 shadow-[10px_0_20px_rgba(0,0,0,0.3)]">
         
         {/* 名字與標籤 */}
         <div className="flex items-center gap-4 mb-2">
           <span className="bg-white text-[#0a267a] font-black px-2.5 py-1 rounded-md text-sm tracking-widest shadow-sm">BLUE</span>
           <span className="text-4xl font-black text-white tracking-widest drop-shadow-md">{match.p1_name}</span>
         </div>
         
         {/* 百分比與票數 */}
         <div className="flex items-baseline gap-6">
           <motion.div 
             key={`p1-rate-${match.p1_votes}`}
             initial={{ scale: 1.05 }} animate={{ scale: 1 }}
             className="flex items-baseline text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-tighter"
           >
             <span className="text-[110px] font-black leading-none">{p1Int}</span>
             <span className="text-[50px] font-black leading-none">.{p1Dec}</span>
             <span className="text-[35px] font-black ml-1 opacity-90">%</span>
           </motion.div>
           <div className="text-[#93c5fd] font-bold text-2xl tracking-widest uppercase">
             {match.p1_votes} <span className="text-lg opacity-80">VOTES</span>
           </div>
         </div>

      </div>

      {/* ================= 4. 紅方數據區 (自適應寬度 flex-1) ================= */}
      {/* 靠右對齊 (items-end) */}
      <div className="flex-1 h-full bg-[#9e0b18] flex flex-col justify-center items-end px-12 relative z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.3)]">
         
         {/* 名字與標籤 */}
         <div className="flex items-center gap-4 mb-2">
           <span className="text-4xl font-black text-white tracking-widest drop-shadow-md">{match.p2_name}</span>
           <span className="bg-white text-[#9e0b18] font-black px-2.5 py-1 rounded-md text-sm tracking-widest shadow-sm">RED</span>
         </div>
         
         {/* 百分比與票數 (排版反轉) */}
         <div className="flex items-baseline gap-6 flex-row-reverse">
           <motion.div 
             key={`p2-rate-${match.p2_votes}`}
             initial={{ scale: 1.05 }} animate={{ scale: 1 }}
             className="flex items-baseline text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-tighter"
           >
             <span className="text-[110px] font-black leading-none">{p2Int}</span>
             <span className="text-[50px] font-black leading-none">.{p2Dec}</span>
             <span className="text-[35px] font-black ml-1 opacity-90">%</span>
           </motion.div>
           <div className="text-[#fca5a5] font-bold text-2xl tracking-widest uppercase">
             {match.p2_votes} <span className="text-lg opacity-80">VOTES</span>
           </div>
         </div>

      </div>

      {/* ================= 5. 紅方選手頭像區 (寬度 300px) ================= */}
      <div className="w-[300px] h-full bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0] relative shrink-0 shadow-inner overflow-hidden z-20 border-l border-black/20 border-r-[8px] border-[#9e0b18]">
         {/* 💡 完美套用後台的 X, Y, Size 參數控制 */}
         <div className="w-full h-full relative flex items-center justify-center">
            {match.p2_avatar && (
              <img 
                src={match.p2_avatar} 
                style={{ 
                  transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})` 
                }} 
                className="absolute w-[600px] h-[600px] object-contain max-w-none" 
                alt="p2" 
              />
            )}
         </div>
      </div>

    </div>
  );
}