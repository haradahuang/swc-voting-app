'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamOverlayPage() {
  const [match, setMatch] = useState<any>(null);
  const [lotteryPage, setLotteryPage] = useState(0);

  useEffect(() => {
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('is_active', true).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    const channel = supabase.channel('realtime-stream')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => {
        if (p.new.is_active) setMatch(p.new);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (match?.show_lottery && match.lottery_winners?.length > 3) {
      const interval = setInterval(() => {
        setLotteryPage((prev) => {
          const totalPages = Math.ceil(match.lottery_winners.length / 3);
          return (prev + 1) % totalPages;
        });
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setLotteryPage(0);
    }
  }, [match?.show_lottery, match?.lottery_winners]);

  if (!match) return <div className="bg-transparent w-[1920px] h-[320px]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  const p1SX = match.p1_stream_x ?? 50, p1SY = match.p1_stream_y ?? 50, p1SSize = match.p1_stream_size ?? 100;
  const p2SX = match.p2_stream_x ?? 50, p2SY = match.p2_stream_y ?? 50, p2SSize = match.p2_stream_size ?? 100;

  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameSizeClass = "text-[55px] mb-6";
  if (maxNameLen >= 8) nameSizeClass = "text-[35px] mb-[34px]";
  else if (maxNameLen >= 5) nameSizeClass = "text-[45px] mb-8";

  // 💡 同步大螢幕的精準遮蔽邏輯
  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 3) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***${name.substring(6)}@${domain}`;
  };

  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    <div className="w-[1920px] h-[320px] bg-transparent flex overflow-hidden font-sans select-none drop-shadow-2xl">
      {/* 藍方 */}
      <div className="flex-1 h-full bg-zinc-950 flex relative overflow-hidden border-t-[4px] border-blue-600 shadow-[10px_0_30px_rgba(0,0,0,0.8)] z-10">
         <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/40 blur-[90px] rounded-full pointer-events-none" />
         <div className="w-[320px] h-full relative shrink-0 z-10">
            <div className="w-full h-full relative flex items-center justify-center">
               {match.p1_avatar && <img src={match.p1_avatar} style={{ transform: `translate(${p1SX - 50}%, ${p1SY - 50}%) scale(${p1SSize / 100})` }} className="absolute w-[800px] h-[800px] object-contain max-w-none drop-shadow-[10px_0_20px_rgba(0,0,0,0.8)]" alt="p1" />}
            </div>
         </div>
         <div className="flex-1 flex flex-col justify-center items-end px-12 relative z-20">
            <h2 className={`${nameSizeClass} font-black text-white tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap`}>{match.p1_name}</h2>
            <div className="flex items-baseline gap-6">
              <div className="text-blue-300 font-bold text-2xl tracking-widest">{match.p1_votes} <span className="text-sm opacity-80">VOTES</span></div>
              <motion.div key={`p1-${match.p1_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                <span className="text-[100px] font-black leading-none">{p1Int}</span><span className="text-[45px] font-black leading-none">.{p1Dec}</span><span className="text-[30px] font-bold ml-1 opacity-80">%</span>
              </motion.div>
            </div>
         </div>
      </div>

      {/* 中央輪播開獎區 */}
      <div className="w-[320px] h-full bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center relative z-30 shadow-[0_0_50px_rgba(0,0,0,1)] border-x border-zinc-800">
         <div className="absolute top-0 w-full h-2 bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-700 shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
         
         <AnimatePresence mode="wait">
           {!match.show_lottery ? (
             <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full">
               <div className="text-[65px] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 leading-[0.85] mb-4 text-center tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] pr-3">LIVE<br/>VOTE</div>
               <div className="bg-yellow-500 text-black font-black px-6 py-1.5 rounded-sm text-sm tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.5)] whitespace-nowrap">{match.tournament_name || 'SWC 2025'}</div>
             </motion.div>
           ) : (
             <motion.div key={`lottery-page-${lotteryPage}`} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center justify-center w-full px-4 h-full">
               <h3 className="text-yellow-400 font-black italic text-2xl tracking-widest mb-4 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse">🎉 WINNERS</h3>
               
               <div className="w-full flex flex-col gap-2 items-center justify-center">
                 {currentWinners.map((w: any, idx: number) => (
                   <div key={idx} className="bg-white/10 w-full px-4 py-2 rounded-lg border border-white/20 text-center">
                     <div className="text-white font-black text-lg truncate drop-shadow-md">{w.user_name}</div>
                     <div className="text-zinc-400 text-[10px] tracking-widest truncate">{maskEmail(w.user_email)}</div>
                   </div>
                 ))}
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      {/* 紅方 */}
      <div className="flex-1 h-full bg-zinc-950 flex flex-row-reverse relative overflow-hidden border-t-[4px] border-red-600 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] z-10">
         <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/30 blur-[90px] rounded-full pointer-events-none" />
         <div className="w-[320px] h-full relative shrink-0 z-10">
            <div className="w-full h-full relative flex items-center justify-center">
               {match.p2_avatar && <img src={match.p2_avatar} style={{ transform: `translate(${p2SX - 50}%, ${p2SY - 50}%) scale(${p2SSize / 100})` }} className="absolute w-[800px] h-[800px] object-contain max-w-none drop-shadow-[-10px_0_20px_rgba(0,0,0,0.8)]" alt="p2" />}
            </div>
         </div>
         <div className="flex-1 flex flex-col justify-center items-start px-12 relative z-20">
            <h2 className={`${nameSizeClass} font-black text-white tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)] whitespace-nowrap`}>{match.p2_name}</h2>
            <div className="flex items-baseline gap-6 flex-row-reverse">
              <div className="text-red-300 font-bold text-2xl tracking-widest">{match.p2_votes} <span className="text-sm opacity-80">VOTES</span></div>
              <motion.div key={`p2-${match.p2_votes}`} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                <span className="text-[100px] font-black leading-none">{p2Int}</span><span className="text-[45px] font-black leading-none">.{p2Dec}</span><span className="text-[30px] font-bold ml-1 opacity-80">%</span>
              </motion.div>
            </div>
         </div>
      </div>
    </div>
  );
}