'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

// 動態雲霧設定 (強化亮度與彩度)
const nebulaVariants = {
  animate: (i: number) => ({
    x: [i % 2 === 0 ? -100 : 100, i % 2 === 0 ? 100 : -100],
    y: [i < 2 ? -50 : 50, i < 2 ? 50 : -50],
    scale: [1, 1.4, 0.8, 1],
    opacity: [0.6, 1, 0.6], 
    transition: {
      duration: 15 + i * 3,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'linear',
    },
  }),
};

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false); 
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

  useEffect(() => {
    if (match?.show_lottery && !hasSpun) {
      setIsSpinning(true);
      setHasSpun(true);
      supabase.from('user_votes').select('user_name').eq('match_id', match.id).limit(100).then(({ data }) => {
        const names = data?.map(d => d.user_name) || [];
        setRealVoters(names.length > 0 ? names : ['Lucky Winner', 'Player', 'Vote User']);
      });
      setTimeout(() => { setIsSpinning(false); }, 3000);
    }
    if (!match?.show_lottery) {
      setHasSpun(false);
      setIsSpinning(false);
      setLotteryPage(0);
    }
  }, [match?.show_lottery, hasSpun, match?.id]);

  useEffect(() => {
    let interval: any;
    if (isSpinning && realVoters.length > 0) {
      interval = setInterval(() => {
        const dummy = Array(3).fill(0).map(() => realVoters[Math.floor(Math.random() * realVoters.length)]);
        setSpinningNames(dummy);
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isSpinning, realVoters]);

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

  if (!match) return <div className="min-h-screen bg-[#000]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-[65px] mb-2";
  if (maxNameLen >= 8) nameTextClass = "text-[40px] mb-4";
  else if (maxNameLen >= 5) nameTextClass = "text-[50px] mb-3";

  // Email 精準遮蔽
  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 3) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***${name.substring(6)}@${domain}`;
  };

  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    <div className="h-[100dvh] w-screen bg-black flex overflow-hidden font-sans select-none relative">
      
      {/* 🌌 最深層：動態雲霧背景 */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#020205]">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            custom={i}
            variants={nebulaVariants}
            animate="animate"
            className="absolute w-[900px] h-[900px] rounded-full mix-blend-screen"
            style={{
              background: i % 2 === 0 ? 'rgba(37,99,235,0.7)' : 'rgba(220,38,38,0.6)', 
              filter: 'blur(150px)',
              left: `${(i % 2) * 50 - 10}%`,
              top: `${Math.floor(i / 2) * 50 - 10}%`,
            }}
          />
        ))}
      </div>

      {/* 🔵 左半部藍方斜切立體艙 */}
      <div 
        className="absolute left-0 top-0 h-full w-[53vw] bg-[#020617] z-10 shadow-[0_0_50px_rgba(37,99,235,0.4)]"
        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#050f29] via-[#020617] to-[#01020a]"
          style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, calc(85% - 4px) 100%, 0 100%)' }}
        >
          {/* 專屬藍色動態雲霧 */}
          <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
            <motion.div
              animate={{ x: [-80, 80, -80], y: [-50, 50, -50], scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[10%] left-[10%] w-[1000px] h-[1000px] rounded-full mix-blend-screen"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(0,0,0,0) 65%)', filter: 'blur(100px)' }}
            />
            <motion.div
              animate={{ x: [80, -80, 80], y: [50, -50, 50], scale: [1.2, 0.9, 1.2], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[0%] right-[10%] w-[800px] h-[800px] rounded-full mix-blend-screen"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(0,0,0,0) 65%)', filter: 'blur(120px)' }}
            />
          </div>

          {/* 背景巨型隱水印數字 */}
          <div className="absolute left-[5%] top-[8%] text-[450px] font-black italic text-blue-500/15 leading-none pointer-events-none z-0 tracking-tighter">
            {p1Int}
          </div>

          {/* 選手半身照 */}
          <div className="absolute inset-0 flex items-center justify-center pt-10 z-10">
            {match.p1_avatar && (
              <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain max-w-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt={match.p1_name} />
            )}
          </div>

          {/* 半身照融合漸層 */}
          <div className="absolute bottom-0 left-0 w-full h-[25vh] bg-gradient-to-t from-[#01020a] via-[#01020a]/80 to-transparent z-20"></div>

          {/* 資訊看板 */}
          <div className="absolute bottom-16 w-full flex flex-col items-center pr-[10%] z-30">
            <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p1_name}</h2>
            <div className="flex items-baseline gap-6 bg-blue-950/60 px-10 py-3 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              <div className="text-4xl font-bold text-blue-400 tracking-widest"><motion.span key={`v1-${match.p1_votes}`} initial={{ scale: 2 }} animate={{ scale: 1 }} className="inline-block origin-bottom">{match.p1_votes}</motion.span> <span className="text-xl opacity-70">VOTES</span></div>
              <div className="text-white tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,1)]">
                <span className="text-[60px] font-black">{p1Int}</span><span className="text-[25px] font-black">.{p1Dec}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 🔴 右半部：紅方斜切立體艙 ================= */}
      <div 
        className="absolute right-0 top-0 h-full w-[53vw] bg-[#2e0509] z-10 shadow-[0_0_50px_rgba(220,38,38,0.4)]"
        style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-bl from-[#2e0509] via-[#0f0103] to-[#080102]"
          style={{ clipPath: 'polygon(calc(15% + 4px) 0, 100% 0, 100% 100%, 4px 100%)' }}
        >
          {/* 專屬紅色動態雲霧 */}
          <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
            <motion.div
              animate={{ x: [80, -80, 80], y: [50, -50, 50], scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[10%] right-[10%] w-[1000px] h-[1000px] rounded-full mix-blend-screen"
              style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.4) 0%, rgba(0,0,0,0) 65%)', filter: 'blur(100px)' }}
            />
            <motion.div
              animate={{ x: [-80, 80, -80], y: [-50, 50, -50], scale: [1.2, 0.9, 1.2], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-[0%] left-[10%] w-[800px] h-[800px] rounded-full mix-blend-screen"
              style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0) 65%)', filter: 'blur(120px)' }}
            />
          </div>

          {/* 背景巨型隱水印數字 */}
          <div className="absolute right-[5%] top-[8%] text-[450px] font-black italic text-red-500/15 leading-none pointer-events-none z-0 tracking-tighter">
            {p2Int}
          </div>

          {/* 選手半身照 */}
          <div className="absolute inset-0 flex items-center justify-center pt-10 z-10">
            {match.p2_avatar && (
              <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain max-w-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt={match.p2_name} />
            )}
          </div>

          {/* 半身照融合漸層 */}
          <div className="absolute bottom-0 left-0 w-full h-[25vh] bg-gradient-to-t from-[#080102] via-[#080102]/80 to-transparent z-20"></div>

          {/* 資訊看板 */}
          <div className="absolute bottom-16 w-full flex flex-col items-center pl-[10%] z-30">
            <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p2_name}</h2>
            <div className="flex items-baseline gap-6 bg-red-950/60 px-10 py-3 rounded-3xl border border-red-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex-row-reverse">
              <div className="text-4xl font-bold text-red-400 tracking-widest"><motion.span key={`v2-${match.p2_votes}`} initial={{ scale: 2 }} animate={{ scale: 1 }} className="inline-block origin-bottom">{match.p2_votes}</motion.span> <span className="text-xl opacity-70">VOTES</span></div>
              <div className="text-white tracking-tighter drop-shadow-[0_0_20px_rgba(239,68,68,1)]">
                <span className="text-[60px] font-black">{p2Int}</span><span className="text-[25px] font-black">.{p2Dec}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ⚔️ 畫面頂層 UI ================= */}
      
      {/* 💡 修正 1：螢光深藍色 (#003cff) 與 螢光紅色條 */}
      <div className="absolute left-0 top-0 h-full w-[53vw] z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 15px #003cff)' }}>
        <div className="absolute left-0 top-0 h-full w-full bg-[#003cff]" style={{ clipPath: 'polygon(calc(100% - 4px) 0, 100% 0, 85% 100%, calc(85% - 4px) 100%)' }}></div>
      </div>
      <div className="absolute right-0 top-0 h-full w-[53vw] z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 15px #ff003c)' }}>
        <div className="absolute left-0 top-0 h-full w-full bg-[#ff003c]" style={{ clipPath: 'polygon(15% 0, calc(15% + 4px) 0, 4px 100%, 0 100%)' }}></div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 px-12 py-3 rounded-b-2xl border-b-2 border-x-2 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <h1 className="text-sm font-bold text-zinc-300 tracking-[0.5em] uppercase">Predicted Exit Poll</h1>
      </div>

      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-40">
        <div className="bg-black text-white italic font-black text-6xl rounded-full w-28 h-28 flex items-center justify-center border-4 border-zinc-700 shadow-[0_0_60px_rgba(0,0,0,1)]">VS</div>
      </div>

      {/* 💡 修正 2：QR Code 精準移至右側籃框位置 (絕對比例定位) */}
      {!match.show_lottery && originUrl && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="absolute bottom-[25%] right-[3%] z-40 bg-black/90 backdrop-blur-xl p-4 rounded-3xl border border-red-900/60 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><h3 className="text-white font-bold text-[11px] tracking-[0.2em] uppercase">Scan To Vote</h3></div>
          <div className="bg-white p-2 rounded-2xl shadow-inner"><QRCode value={originUrl} size={110} level="H" /></div>
        </motion.div>
      )}

      {/* ================= 🏆 抽獎揭曉全畫面 ================= */}
      <AnimatePresence>
        {match.show_lottery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center font-sans overflow-hidden">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="bg-gradient-to-b from-[#111] to-black border border-yellow-500/30 p-12 rounded-[2rem] shadow-[0_0_100px_rgba(250,204,21,0.2)] relative flex flex-col items-center min-w-[850px]">
              <h2 className="text-yellow-400 text-6xl font-black italic tracking-[0.3em] uppercase mb-12 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">WINNERS</h2>
              <div className="w-full relative h-[500px]">
                {isSpinning ? (
                   <div className="absolute inset-0 w-full flex flex-col items-center justify-start gap-6">
                     {/* 💡 修正 3：強制只顯示 3 人，防止破版 */}
                     {spinningNames.slice(0, 3).map((name, i) => (
                       <div key={i} className="bg-zinc-900/50 border border-zinc-700 w-full rounded-2xl py-6 px-10 text-center animate-pulse"><span className="text-6xl font-black text-zinc-400 tracking-widest blur-[1px]">{name}</span></div>
                     ))}
                   </div>
                ) : (
                   <AnimatePresence mode="wait">
                     <motion.div key={lotteryPage} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="absolute inset-0 w-full flex flex-col items-center justify-start gap-6 overflow-hidden">
                       {/* 💡 修正 3：強制只顯示 3 人，防止破版 */}
                       {currentWinners.slice(0, 3).map((w: any, idx: number) => (
                         <div key={idx} className="bg-gradient-to-r from-yellow-900/30 via-yellow-600/20 to-yellow-900/30 border border-yellow-500/40 w-full rounded-2xl py-6 px-10 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
                           <div className="absolute inset-0 bg-yellow-400/5 animate-pulse mix-blend-overlay"></div>
                           <div className="text-6xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] z-10 mb-2 truncate max-w-[700px]">{w.user_name}</div>
                           <div className="text-3xl text-yellow-500/80 tracking-widest font-bold z-10">{maskEmail(w.user_email)}</div>
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
    </div>
  );
}