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
    
    // 即時接收資料庫更新
    const channel = supabase.channel('realtime-stream')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => setMatch(p.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  // 還沒讀取到資料時顯示全透明背景
  if (!match) return <div className="bg-transparent w-[1920px] h-[320px]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;

  // 拆解小數點，做韓國字體風格
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  return (
    // 💡 根容器：鎖定 1920x320 尺寸，背景全透明 (OBS 才不會有黑底)
    <div className="w-[1920px] h-[320px] bg-transparent flex overflow-hidden font-sans select-none">

      {/* ================= 最左側：賽事 Logo 區塊 ================= */}
      <div className="w-[180px] h-full bg-white flex flex-col items-center justify-center text-center border-r-[6px] border-blue-600 z-20 shadow-[5px_0_20px_rgba(0,0,0,0.5)]">
         <div className="text-3xl font-black text-gray-800 leading-tight">LIVE<br/>VOTE</div>
         <div className="mt-2 px-3 py-1 bg-black text-yellow-400 text-sm font-bold tracking-widest rounded-md">SWC 2025</div>
      </div>

      {/* ================= 左半邊：藍方 ================= */}
      <div className="flex-1 h-full bg-gradient-to-r from-[#0b38a8] to-[#08287a] flex relative border-r-[1px] border-white/20">
        
        {/* 選手照片白框區 (還原韓國畫面設計) */}
        <div className="w-[280px] h-full bg-slate-100 relative overflow-hidden shrink-0 border-r-8 border-[#04123d] shadow-[5px_0_20px_rgba(0,0,0,0.5)] z-10">
           {match.p1_avatar && (
             <img 
               src={match.p1_avatar} 
               className="absolute inset-0 w-full h-full object-cover object-top" 
               alt={match.p1_name} 
             />
           )}
           {/* 底部暗色漸層防人物太亮 */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* 名字與票數區 */}
        <div className="flex-1 flex flex-col justify-center px-10 relative overflow-hidden z-0">
           
           <div className="flex items-center gap-3 mb-2">
             <div className="bg-white text-[#0b38a8] px-2 py-0.5 text-lg font-black rounded-sm shadow-md">BLUE</div>
             <h2 className="text-4xl font-black text-white tracking-widest drop-shadow-md">{match.p1_name}</h2>
           </div>

           <div className="flex items-baseline gap-6">
             <motion.div 
               key={`stream-p1-${match.p1_votes}`}
               initial={{ scale: 1.05 }} animate={{ scale: 1 }}
               className="flex items-baseline text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] origin-left scale-y-[1.15]"
             >
               <span className="text-[120px] font-black leading-none tracking-tighter">{p1Int}</span>
               <span className="text-[55px] font-black leading-none tracking-tighter -ml-1">.{p1Dec}</span>
               <span className="text-[35px] font-black ml-1 opacity-80">%</span>
             </motion.div>
             <div className="text-3xl font-bold text-blue-300 tracking-widest drop-shadow-md pb-2">
               {match.p1_votes} <span className="text-xl opacity-70">VOTES</span>
             </div>
           </div>
        </div>
      </div>

      {/* ================= 右半邊：紅方 ================= */}
      {/* 💡 使用 flex-row-reverse 完美鏡像對稱 */}
      <div className="flex-1 h-full bg-gradient-to-l from-[#c20a1f] to-[#8a0615] flex flex-row-reverse relative border-l-[1px] border-white/20">
        
        {/* 選手照片白框區 */}
        <div className="w-[280px] h-full bg-slate-100 relative overflow-hidden shrink-0 border-l-8 border-[#45030a] shadow-[-5px_0_20px_rgba(0,0,0,0.5)] z-10">
           {match.p2_avatar && (
             <img 
               src={match.p2_avatar} 
               className="absolute inset-0 w-full h-full object-cover object-top" 
               alt={match.p2_name} 
             />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        {/* 名字與票數區 (靠右對齊) */}
        <div className="flex-1 flex flex-col justify-center px-10 relative overflow-hidden items-end text-right z-0">
           
           <div className="flex items-center gap-3 mb-2 flex-row-reverse">
             <div className="bg-white text-[#c20a1f] px-2 py-0.5 text-lg font-black rounded-sm shadow-md">RED</div>
             <h2 className="text-4xl font-black text-white tracking-widest drop-shadow-md">{match.p2_name}</h2>
           </div>

           <div className="flex items-baseline gap-6 flex-row-reverse">
             <motion.div 
               key={`stream-p2-${match.p2_votes}`}
               initial={{ scale: 1.05 }} animate={{ scale: 1 }}
               className="flex items-baseline text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] origin-right scale-y-[1.15]"
             >
               <span className="text-[120px] font-black leading-none tracking-tighter">{p2Int}</span>
               <span className="text-[55px] font-black leading-none tracking-tighter -ml-1">.{p2Dec}</span>
               <span className="text-[35px] font-black ml-1 opacity-80">%</span>
             </motion.div>
             <div className="text-3xl font-bold text-red-300 tracking-widest drop-shadow-md pb-2">
               {match.p2_votes} <span className="text-xl opacity-70">VOTES</span>
             </div>
           </div>
        </div>
      </div>

    </div>
  );
}