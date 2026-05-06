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

  const p1SX = match.p1_stream_x ?? 50;
  const p1SY = match.p1_stream_y ?? 50;
  const p1SSize = match.p1_stream_size ?? 100;
  
  const p2SX = match.p2_stream_x ?? 50;
  const p2SY = match.p2_stream_y ?? 50;
  const p2SSize = match.p2_stream_size ?? 100;

  return (
    <div className="w-[1920px] h-[320px] bg-transparent flex overflow-hidden font-sans select-none drop-shadow-2xl">

      {/* ================= 1. 藍方區塊 (左側) ================= */}
      <div className="flex-1 h-full bg-zinc-950 flex relative overflow-hidden border-t-[4px] border-blue-600 shadow-[10px_0_30px_rgba(0,0,0,0.8)] z-10">
         {/* 🌟 藍色背景光暈 */}
         <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/40 blur-[90px] rounded-full pointer-events-none" />
         
         {/* 頭像區 */}
         <div className="w-[320px] h-full relative shrink-0 z-10">
            <div className="w-full h-full relative flex items-center justify-center">
               {match.p1_avatar && (
                 <img 
                   src={match.p1_avatar} 
                   style={{ transform: `translate(${p1SX - 50}%, ${p1SY - 50}%) scale(${p1SSize / 100})` }} 
                   className="absolute w-[800px] h-[800px] object-contain max-w-none drop-shadow-[10px_0_20px_rgba(0,0,0,0.8)]" 
                   alt="p1" 
                 />
               )}
            </div>
         </div>

         {/* 數據區 */}
         <div className="flex-1 flex flex-col justify-center items-end px-12 relative z-20">
            {/* 💡 1 & 2: 刪除 BLUE 標籤，大幅放大名字並拉開與下方數據的距離 */}
            <h2 className="text-[55px] font-black text-white tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] mb-6">
              {match.p1_name}
            </h2>
            
            {/* 💡 3: 數據往下移動 (因為上方 mb-6 推擠，會自動下降) */}
            <div className="flex items-baseline gap-6">
              <div className="text-blue-300 font-bold text-2xl tracking-widest">
                {match.p1_votes} <span className="text-sm opacity-80">VOTES</span>
              </div>
              <motion.div key={`p1-${match.p1_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <span className="text-[100px] font-black leading-none">{p1Int}</span>
                <span className="text-[45px] font-black leading-none">.{p1Dec}</span>
                <span className="text-[30px] font-bold ml-1 opacity-80">%</span>
              </motion.div>
            </div>
         </div>
      </div>

      {/* ================= 2. 中央 LIVE VOTE 區塊 ================= */}
      <div className="w-[320px] h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center relative z-30 shadow-[0_0_50px_rgba(0,0,0,1)] border-x border-zinc-800">
         {/* 頂部金屬裝飾條 */}
         <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-700 shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
         
         {/* 放大的 LIVE VOTE (已加上 pr-3 防止斜體被切) */}
         <div className="text-[65px] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 leading-[0.85] mb-4 text-center tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] pr-3">
           LIVE<br/>VOTE
         </div>
         
         {/* 後台自訂的賽事名稱 */}
         <div className="bg-yellow-500 text-black font-black px-6 py-1.5 rounded-sm text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.5)]">
           {match.tournament_name || 'SWC 2025'}
         </div>
      </div>

      {/* ================= 3. 紅方區塊 (右側) ================= */}
      <div className="flex-1 h-full bg-zinc-950 flex flex-row-reverse relative overflow-hidden border-t-[4px] border-red-600 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] z-10">
         {/* 🌟 紅色背景光暈 */}
         <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/30 blur-[90px] rounded-full pointer-events-none" />
         
         {/* 頭像區 */}
         <div className="w-[320px] h-full relative shrink-0 z-10">
            <div className="w-full h-full relative flex items-center justify-center">
               {match.p2_avatar && (
                 <img 
                   src={match.p2_avatar} 
                   style={{ transform: `translate(${p2SX - 50}%, ${p2SY - 50}%) scale(${p2SSize / 100})` }} 
                   className="absolute w-[800px] h-[800px] object-contain max-w-none drop-shadow-[-10px_0_20px_rgba(0,0,0,0.8)]" 
                   alt="p2" 
                 />
               )}
            </div>
         </div>

         {/* 數據區 */}
         <div className="flex-1 flex flex-col justify-center items-start px-12 relative z-20">
            {/* 💡 1 & 2: 刪除 RED 標籤，大幅放大名字並拉開與下方數據的距離 */}
            <h2 className="text-[55px] font-black text-white tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] mb-6">
              {match.p2_name}
            </h2>
            
            {/* 💡 3: 數據往下移動 */}
            <div className="flex items-baseline gap-6 flex-row-reverse">
              <div className="text-red-300 font-bold text-2xl tracking-widest">
                {match.p2_votes} <span className="text-sm opacity-80">VOTES</span>
              </div>
              <motion.div key={`p2-${match.p2_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                <span className="text-[100px] font-black leading-none">{p2Int}</span>
                <span className="text-[45px] font-black leading-none">.{p2Dec}</span>
                <span className="text-[30px] font-bold ml-1 opacity-80">%</span>
              </motion.div>
            </div>
         </div>
      </div>

    </div>
  );
}