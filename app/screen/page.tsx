'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');
  
  // 拉霸機狀態
  const [isSpinning, setIsSpinning] = useState(false);
  const [realVoters, setRealVoters] = useState<string[]>([]);
  const [spinningNames, setSpinningNames] = useState<string[]>([]);
  const [lotteryPage, setLotteryPage] = useState(0); // 💡 新增：大螢幕輪播分頁

  useEffect(() => {
    if (typeof window !== 'undefined') setOriginUrl(window.location.origin);
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('is_active', true).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    const channel = supabase.channel('realtime-screen-v3')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => {
        if (p.new.is_active) {
           // 偵測到開獎推送
           if (p.new.show_lottery && !match?.show_lottery) {
             triggerSpinning(p.new.id);
           }
           setMatch(p.new);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match]);

  // 💡 觸發拉霸：先抓取真實名單，再旋轉
  const triggerSpinning = async (matchId: number) => {
    setIsSpinning(true);
    // 抓取真實投票者名單 (限100人作為滾動池)
    const { data } = await supabase.from('user_votes').select('user_name').eq('match_id', matchId).limit(100);
    const names = data?.map(d => d.user_name) || ['Lucky User', 'Winner', 'Player'];
    setRealVoters(names);

    setTimeout(() => setIsSpinning(false), 3000); // 3秒後揭曉
  };

  // 💡 拉霸動畫：每 80ms 從真實名單隨機挑名字
  useEffect(() => {
    let interval: any;
    if (isSpinning && realVoters.length > 0) {
      interval = setInterval(() => {
        const dummy = Array(3).fill(0).map(() => 
          realVoters[Math.floor(Math.random() * realVoters.length)]
        );
        setSpinningNames(dummy);
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isSpinning, realVoters]);

  // 💡 大螢幕得獎輪播：每 4 秒換下一組 3 人
  useEffect(() => {
    if (match?.show_lottery && !isSpinning && match.lottery_winners?.length > 3) {
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
  }, [match?.show_lottery, isSpinning, match?.lottery_winners]);

  if (!match) return <div className="min-h-screen bg-[#050505]" />;

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    return `${name.substring(0, 3)}***@${domain}`;
  };

  // 目前大螢幕顯示的 3 位
  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    <div className="h-screen w-screen bg-[#050505] flex overflow-hidden font-sans select-none relative">
      
      {/* 左右背景選手區 (省略，保持原本代碼...) */}
      <div className="relative w-1/2 h-full z-10 overflow-hidden">
        <div className="absolute right-0 top-0 w-[75%] h-[75%] bg-gradient-to-b from-[#0a38b3] to-[#051c5e] pt-10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p1_avatar && <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt="p1"/>}
          </div>
          <div className="text-center z-30 -translate-x-24">
            <h2 className="text-6xl font-black text-white drop-shadow-2xl">{match.p1_name}</h2>
          </div>
        </div>
      </div>
      <div className="relative w-1/2 h-full z-0 overflow-hidden">
        <div className="absolute left-0 top-0 w-[75%] h-[75%] bg-gradient-to-b from-[#c20a1f] to-[#6b030e] pt-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"></div>
        <div className="absolute left-0 top-0 w-[75%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p2_avatar && <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt="p2"/>}
          </div>
          <div className="text-center z-30 translate-x-24">
            <h2 className="text-6xl font-black text-white drop-shadow-2xl">{match.p2_name}</h2>
          </div>
        </div>
      </div>

      {/* ================= 💡 大螢幕抽獎全畫面 (方案 A+C 結合) ================= */}
      <AnimatePresence>
        {match.show_lottery && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border-4 border-yellow-500/50 p-12 rounded-[3rem] shadow-[0_0_100px_rgba(250,204,21,0.3)] min-w-[900px] flex flex-col items-center"
            >
              <h2 className="text-yellow-400 text-6xl font-black italic tracking-[0.3em] uppercase mb-12 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">WINNERS</h2>

              <div className="w-full flex flex-col gap-6 items-center min-h-[450px] justify-center">
                {isSpinning ? (
                   <div className="flex flex-col gap-6 w-full items-center">
                     {spinningNames.map((name, i) => (
                       <div key={i} className="bg-black/50 border-2 border-zinc-700 w-full rounded-2xl py-6 px-10 text-center animate-pulse">
                         <span className="text-6xl font-black text-zinc-400 blur-[3px] tracking-widest">{name}</span>
                       </div>
                     ))}
                   </div>
                ) : (
                  <AnimatePresence mode="wait">
                   <motion.div key={lotteryPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 w-full items-center">
                     {currentWinners.map((w: any, idx: number) => (
                       <div key={idx} className="bg-gradient-to-r from-yellow-600/30 via-yellow-400/20 to-yellow-600/30 border-2 border-yellow-400/50 w-full rounded-2xl py-6 px-12 flex flex-col items-center shadow-lg">
                         <div className="text-6xl font-black text-white tracking-widest drop-shadow-lg mb-2 truncate max-w-[800px]">{w.user_name}</div>
                         <div className="text-3xl text-yellow-200/80 font-bold">{maskEmail(w.user_email)}</div>
                       </div>
                     ))}
                   </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code */}
      {!match.show_lottery && originUrl && (
        <div className="absolute bottom-12 right-12 z-40 bg-black/80 p-4 rounded-3xl border border-red-900/50 flex flex-col items-center">
          <QRCode value={originUrl} size={110} level="H" />
        </div>
      )}
    </div>
  );
}