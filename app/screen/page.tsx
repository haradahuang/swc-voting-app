'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

// 💡 動態雲霧的位移路徑
const nebulaVariants = {
  animate: (i: number) => ({
    x: [i % 2 === 0 ? -50 : 50, i % 2 === 0 ? 50 : -50],
    y: [i < 2 ? -30 : 30, i < 2 ? 30 : -30],
    scale: [1, 1.3, 0.9, 1],
    opacity: [0.6, 0.9, 0.6], // 提高透明度確保可見
    transition: {
      duration: 12 + i * 2,
      repeat: Infinity,
      repeatType: 'reverse' as const,
      ease: 'easeInOut',
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

  if (!match) return <div className="min-h-screen bg-[#020205]" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-[60px]";
  if (maxNameLen >= 8) nameTextClass = "text-[40px]";
  else if (maxNameLen >= 5) nameTextClass = "text-[50px]";

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    if (name.length <= 3) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***${name.substring(6)}@${domain}`;
  };

  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    <div className="h-screen w-screen bg-[#020205] flex overflow-hidden font-sans select-none relative">
      
      {/* ================= 💡 修正 1：超明顯動態雲霧背景 ================= */}
      {/* 深色底 */}
      <div className="absolute inset-0 bg-black z-0"></div>
      
      {/* 動態光暈 (使用 inline filter 保證生效) */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            custom={i}
            variants={nebulaVariants}
            animate="animate"
            className="absolute w-[800px] h-[800px] rounded-full"
            style={{
              background: i % 2 === 0 ? 'rgba(37,99,235,0.7)' : 'rgba(220,38,38,0.6)',
              filter: 'blur(130px)', // 強制套用高斯模糊
              left: `${(i % 2) * 60 - 10}%`,
              top: `${Math.floor(i / 2) * 60 - 10}%`,
            }}
          />
        ))}
        {/* 加上一層暗色遮罩讓雲霧更有質感 */}
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply"></div>
      </div>

      {/* VS Logo (保留在中間) */}
      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
        <div className="bg-black text-white italic font-black text-6xl rounded-full w-28 h-28 flex items-center justify-center border-4 border-zinc-700 shadow-[0_0_50px_rgba(0,0,0,0.8)]">VS</div>
      </div>

      {/* ================= 藍方選手區 ================= */}
      <div className="relative w-1/2 h-full z-20 flex flex-col items-center justify-start pt-[12dvh]">
        <div className="relative w-[550px] h-[600px] overflow-hidden" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }}>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.8),inset_0_0_20px_rgba(37,99,235,0.5)]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f5e] to-[#02050f] rounded-2xl opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center pt-8">
            {match.p1_avatar && (
              <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})`, transformOrigin: 'center center' }} className="w-full h-full object-contain max-w-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]" alt={match.p1_name} />
            )}
          </div>
        </div>
        <div className="text-center mt-6 flex flex-col items-center">
          <h2 className={`${nameTextClass} font-black text-white whitespace-nowrap drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2`}>{match.p1_name}</h2>
          <div className="flex items-end gap-6 justify-center">
            <div className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_20px_rgba(37,99,235,0.6)]">
              <span className="text-[90px] font-black leading-none">{p1Int}</span><span className="text-[30px] font-black leading-none">.{p1Dec}</span><span className="text-[20px] font-black ml-1 opacity-80">%</span>
            </div>
            <div className="text-3xl font-bold text-blue-300 tracking-widest flex items-baseline gap-2 mb-2">
              <motion.span key={`v1-${match.p1_votes}`} initial={{ scale: 2, color: '#ffffff' }} animate={{ scale: 1, color: '#93c5fd' }} className="inline-block origin-bottom">{match.p1_votes}</motion.span><span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 紅方選手區 ================= */}
      <div className="relative w-1/2 h-full z-20 flex flex-col items-center justify-start pt-[12dvh]">
        <div className="relative w-[550px] h-[600px] overflow-hidden" style={{ clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0% 100%)' }}>
          <div className="absolute inset-0 border-4 border-red-600 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.8),inset_0_0_20px_rgba(220,38,38,0.5)]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#5e0a11] to-[#0f0204] rounded-2xl opacity-90"></div>
          <div className="absolute inset-0 flex items-center justify-center pt-8">
            {match.p2_avatar && (
              <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})`, transformOrigin: 'center center' }} className="w-full h-full object-contain max-w-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]" alt={match.p2_name} />
            )}
          </div>
        </div>
        <div className="text-center mt-6 flex flex-col items-center">
          <h2 className={`${nameTextClass} font-black text-white whitespace-nowrap drop-shadow-[0_5px_15px_rgba(0,0,0,0.9)] mb-2`}>{match.p2_name}</h2>
          <div className="flex items-end gap-6 justify-center">
            <div className="flex items-baseline text-white tracking-tighter drop-shadow-[0_0_20px_rgba(220,38,38,0.6)]">
              <span className="text-[90px] font-black leading-none">{p2Int}</span><span className="text-[30px] font-black leading-none">.{p2Dec}</span><span className="text-[20px] font-black ml-1 opacity-80">%</span>
            </div>
            <div className="text-3xl font-bold text-red-300 tracking-widest flex items-baseline gap-2 mb-2">
              <motion.span key={`v2-${match.p2_votes}`} initial={{ scale: 2, color: '#ffffff' }} animate={{ scale: 1, color: '#fca5a5' }} className="inline-block origin-bottom">{match.p2_votes}</motion.span><span className="text-xl opacity-70">VOTES</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-black px-8 py-2 rounded-b-xl border-b border-white/10 shadow-2xl flex flex-col items-center">
        <h1 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-[0.4em] uppercase">Live Prediction</h1>
      </div>

      {/* 💡 修正 2：QR Code 獨立拉出到右下角 */}
      {!match.show_lottery && originUrl && (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="absolute bottom-12 right-12 z-40 bg-black/80 backdrop-blur-xl p-4 rounded-3xl border border-red-900/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><h3 className="text-white font-bold text-sm tracking-widest uppercase">Scan To Vote</h3></div>
          <div className="bg-white p-2 rounded-2xl shadow-inner"><QRCode value={originUrl} size={110} level="H" /></div>
        </motion.div>
      )}

      {/* 抽獎畫面 */}
      <AnimatePresence>
        {match.show_lottery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center font-sans overflow-hidden">
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.5 }} className="bg-gradient-to-b from-zinc-900 to-black border-4 border-yellow-500/50 p-12 rounded-[3rem] shadow-[0_0_150px_rgba(250,204,21,0.4)] relative flex flex-col items-center min-w-[800px]">
              <h2 className="text-yellow-400 text-6xl font-black italic tracking-[0.3em] uppercase mb-12 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
                WINNERS
              </h2>
              <div className="w-full relative h-[550px]">
                {isSpinning ? (
                   <div className="absolute inset-0 w-full flex flex-col items-center justify-start gap-6">
                     {/* 💡 強制只顯示 3 筆 */}
                     {spinningNames.slice(0, 3).map((name, i) => (
                       <div key={i} className="bg-black border-2 border-zinc-700 w-full rounded-2xl py-6 px-10 text-center animate-pulse">
                         <span className="text-6xl font-black text-zinc-300 tracking-widest blur-[2px]">{name}</span>
                       </div>
                     ))}
                   </div>
                ) : (
                   <AnimatePresence mode="wait">
                     <motion.div key={lotteryPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0 w-full flex flex-col items-center justify-start gap-6">
                       {/* 💡 強制只顯示 3 筆 */}
                       {currentWinners.slice(0, 3).map((w: any, idx: number) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}