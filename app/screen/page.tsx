'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');
  
  // 💡 拉霸與輪播狀態控制
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false); // 確保每次開獎只轉一次
  const [realVoters, setRealVoters] = useState<string[]>([]);
  const [spinningNames, setSpinningNames] = useState<string[]>([]);
  const [lotteryPage, setLotteryPage] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') setOriginUrl(window.location.origin);
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('is_active', true).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    const channel = supabase.channel('realtime-screen')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => {
        if (p.new.is_active) setMatch(p.new);
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  // 💡 1. 偵測抽獎開啟：觸發 3 秒真實名單拉霸
  useEffect(() => {
    if (match?.show_lottery && !hasSpun) {
      setIsSpinning(true);
      setHasSpun(true);

      // 抓取真實投票者名單放入拉霸池
      supabase.from('user_votes').select('user_name').eq('match_id', match.id).limit(100).then(({ data }) => {
        const names = data?.map(d => d.user_name) || [];
        setRealVoters(names.length > 0 ? names : ['Lucky Winner', 'Player', 'Vote User']);
      });

      // 3秒後停止拉霸
      setTimeout(() => {
        setIsSpinning(false);
      }, 3000);
    }

    // 當後台關閉抽獎時，重置狀態，準備下一次開獎
    if (!match?.show_lottery) {
      setHasSpun(false);
      setIsSpinning(false);
      setLotteryPage(0);
    }
  }, [match?.show_lottery, hasSpun, match?.id]);

  // 💡 2. 拉霸動畫：每 80ms 隨機滾動名字
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

  // 💡 3. 結果輪播：拉霸結束後，每 4 秒切換下一組 3 人
  useEffect(() => {
    if (match?.show_lottery && !isSpinning && match.lottery_winners?.length > 3) {
      const interval = setInterval(() => {
        setLotteryPage((prev) => {
          const totalPages = Math.ceil(match.lottery_winners.length / 3);
          return (prev + 1) % totalPages;
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [match?.show_lottery, isSpinning, match?.lottery_winners]);

  if (!match) return <div className="min-h-screen bg-[#050505]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-[70px]";
  if (maxNameLen >= 8) nameTextClass = "text-[45px]";
  else if (maxNameLen >= 5) nameTextClass = "text-[55px]";

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  // 取得目前這頁的 3 位得獎者
  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    <div className="h-screen w-screen bg-[#050505] flex overflow-hidden font-sans select-none relative">
      
      {/* ================= 左半邊：藍方 ================= */}
      <div className="relative w-1/2 h-full z-10">
        <div className="absolute right-0 top-0 w-[75%] h-[75%] bg-gradient-to-b from-[#0a38b3] to-[#051c5e] pt-10 shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
          <motion.div key={`p1-${match.p1_votes}`} initial={{ x: 0 }} animate={{ x: [0, -4, 4, -2, 2, 0], filter: ["drop-shadow(0px 10px 20px rgba(0,0,0,0.3))", "drop-shadow(0px 0px 60px rgba(255, 255, 255, 0.9))", "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))"]}} transition={{ duration: 0.3 }} className="absolute top-3 left-6 text-white flex items-baseline z-0 opacity-90 scale-y-[1.9] origin-top-left tracking-tighter">
            <span className="text-[110px] font-black leading-none">{p1Int}</span>
            <span className="text-[35px] font-black leading-none -ml-1">.{p1Dec}</span>
            <span className="text-[24px] font-black ml-1 opacity-80">%</span>
          </motion.div>
        </div>
        <div className="absolute right-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#051c5e] to-[#0a38b3] overflow-hidden" style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' }}>
           <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/50 to-transparent"></div>
        </div>
        <div className="absolute right-0 top-0 w-[75%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p1_avatar && <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p1_name} />}
          </div>
          <div className="text-center z-30 -translate-x-24">
            <h2 className={`${nameTextClass} font-black text-white whitespace-nowrap drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2`}>{match.p1_name}</h2>
            <div className="text-3xl font-bold text-blue-300 tracking-widest drop-shadow-md flex justify-center items-baseline gap-2 mt-1">
              <motion.span key={`v1-${match.p1_votes}`} initial={{ scale: 2, color: '#ffffff' }} animate={{ scale: 1, color: '#93c5fd' }} transition={{ type: "spring" }} className="inline-block origin-bottom">{match.p1_votes}</motion.span><span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 右半邊：紅方 ================= */}
      <div className="relative w-1/2 h-full z-0">
        <div className="absolute left-0 top-0 w-[75%] h-[75%] bg-gradient-to-b from-[#c20a1f] to-[#6b030e] pt-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          <motion.div key={`p2-${match.p2_votes}`} initial={{ x: 0 }} animate={{ x: [0, -4, 4, -2, 2, 0], filter: ["drop-shadow(0px 10px 20px rgba(0,0,0,0.3))", "drop-shadow(0px 0px 60px rgba(255, 255, 255, 0.9))", "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))"]}} transition={{ duration: 0.3 }} className="absolute top-3 right-6 text-white flex items-baseline z-0 opacity-90 scale-y-[1.9] origin-top-right tracking-tighter">
            <span className="text-[110px] font-black leading-none">{p2Int}</span>
            <span className="text-[35px] font-black leading-none -ml-1">.{p2Dec}</span>
            <span className="text-[24px] font-black ml-1 opacity-80">%</span>
          </motion.div>
        </div>
        <div className="absolute left-0 top-[75%] w-full h-[25%] bg-gradient-to-b from-[#6b030e] to-[#c20a1f] overflow-hidden" style={{ clipPath: 'polygon(0 0, 75% 0, 100% 100%, 0% 100%)' }}>
           <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/50 to-transparent"></div>
        </div>
        <div className="absolute left-0 top-0 w-[75%] h-full pointer-events-none flex flex-col items-center justify-end pb-[6%] z-20">
          <div className="w-[600px] h-[650px] mb-2 relative flex items-center justify-center">
            {match.p2_avatar && <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})` }} className="absolute w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" alt={match.p2_name} />}
          </div>
          <div className="text-center z-30 translate-x-24">
            <h2 className={`${nameTextClass} font-black text-white whitespace-nowrap drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2`}>{match.p2_name}</h2>
            <div className="text-3xl font-bold text-red-300 tracking-widest drop-shadow-md flex justify-center items-baseline gap-2 mt-1">
              <motion.span key={`v2-${match.p2_votes}`} initial={{ scale: 2, color: '#ffffff' }} animate={{ scale: 1, color: '#fca5a5' }} transition={{ type: "spring" }} className="inline-block origin-bottom">{match.p2_votes}</motion.span><span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-black px-8 py-2 rounded-b-xl border-b border-white/10 shadow-2xl flex flex-col items-center">
        <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-[0.4em] uppercase">Live Prediction</h1>
      </div>

      {/* ================= 💡 大螢幕抽獎全畫面 (方案 A+C 結合) ================= */}
      <AnimatePresence>
        {match.show_lottery && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center font-sans overflow-hidden"
          >
            {/* 發光的金屬外框 */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.5 }}
              className="bg-gradient-to-b from-zinc-900 to-black border-4 border-yellow-500/50 p-12 rounded-[3rem] shadow-[0_0_150px_rgba(250,204,21,0.4)] relative flex flex-col items-center min-w-[800px]"
            >
              <h2 className="text-yellow-400 text-6xl font-black italic tracking-[0.3em] uppercase mb-12 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
                WINNERS
              </h2>

              <div className="w-full flex flex-col items-center justify-center min-h-[350px]">
                {/* 3秒拉霸機效果 */}
                {isSpinning ? (
                   <div className="w-full flex flex-col items-center justify-center gap-6 overflow-hidden">
                     {spinningNames.slice(0, Math.min(match.lottery_winners?.length || 3, 3)).map((name, i) => (
                       <div key={i} className="bg-black border-2 border-zinc-700 w-full rounded-2xl py-6 px-10 text-center animate-pulse">
                         <span className="text-6xl font-black text-zinc-300 tracking-widest blur-[2px]">{name}</span>
                       </div>
                     ))}
                   </div>
                ) : (
                   // 拉霸結束，砸出真正得獎者 (3人一組輪播)
                   <AnimatePresence mode="wait">
                     <motion.div key={lotteryPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full flex flex-col items-center gap-6">
                       {currentWinners.map((w: any, idx: number) => (
                         <div key={idx} className="bg-gradient-to-r from-yellow-600/20 via-yellow-400/20 to-yellow-600/20 border-2 border-yellow-400/50 w-full rounded-2xl py-6 px-10 flex flex-col items-center justify-center relative overflow-hidden">
                           <div className="absolute inset-0 bg-yellow-400/10 animate-pulse mix-blend-overlay"></div>
                           <div className="text-6xl font-black text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10 mb-2 truncate max-w-[700px]">{w.user_name}</div>
                           <div className="text-3xl text-yellow-200/80 tracking-widest font-bold z-10">{maskEmail(w.user_email)}</div>
                         </div>
                       ))}
                     </motion.div>
                   </AnimatePresence>
                )}
              </div>
            </motion.div>
            
            {/* 背景裝飾光束 */}
            {!isSpinning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="absolute inset-0 pointer-events-none -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1500px] h-[300px] bg-yellow-500/20 blur-[150px] rotate-45"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1500px] h-[300px] bg-yellow-500/20 blur-[150px] -rotate-45"></div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code */}
      {!match.show_lottery && originUrl && (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="absolute bottom-12 right-12 z-40 bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-red-900/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><h3 className="text-white font-bold text-sm tracking-widest uppercase">Scan To Vote</h3></div>
          <div className="bg-white p-2 rounded-2xl shadow-inner"><QRCode value={originUrl} size={110} level="H" /></div>
        </motion.div>
      )}

    </div>
  );
}