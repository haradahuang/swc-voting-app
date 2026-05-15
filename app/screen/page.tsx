'use client';
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');
  const [scale, setScale] = useState(1);

  // 💡 音訊啟動狀態 (解決瀏覽器阻擋自動播放)
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false); 
  const [realVoters, setRealVoters] = useState<string[]>([]);
  const [spinningNames, setSpinningNames] = useState<string[]>([]);
  const [lotteryPage, setLotteryPage] = useState(0);

  // 音效 Refs
  const voteBgmRef = useRef<HTMLAudioElement | null>(null);
  const springBgmRef = useRef<HTMLAudioElement | null>(null);
  const winBgmRef = useRef<HTMLAudioElement | null>(null);
  const winTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化音效物件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      voteBgmRef.current = new Audio('/votebgm.mp3');
      voteBgmRef.current.loop = true;
      voteBgmRef.current.volume = 0.6;

      springBgmRef.current = new Audio('/spring.mp3');
      
      winBgmRef.current = new Audio('/win.mp3');
      winBgmRef.current.loop = true;
    }

    return () => {
      voteBgmRef.current?.pause();
      springBgmRef.current?.pause();
      winBgmRef.current?.pause();
      if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
    };
  }, []);

  // 💡 修正 1：左下方純圖示音效開關邏輯
  const handleToggleAudio = () => {
    if (!audioEnabled) {
      setAudioEnabled(true);
      if (!match?.show_lottery) {
        voteBgmRef.current?.play().catch(() => console.log("音訊啟動失敗"));
      }
    } else {
      setAudioEnabled(false);
      voteBgmRef.current?.pause();
      springBgmRef.current?.pause();
      winBgmRef.current?.pause();
    }
  };

  // 音效控制邏輯
  useEffect(() => {
    if (!match || !audioEnabled) return;

    if (!match.show_lottery) {
      // 【投票階段 / 抽獎畫面關閉】
      if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
      
      if (winBgmRef.current) {
        winBgmRef.current.pause();
        winBgmRef.current.currentTime = 0;
      }
      if (springBgmRef.current) {
        springBgmRef.current.pause();
        springBgmRef.current.currentTime = 0;
      }
      voteBgmRef.current?.play().catch(() => {});
      
    } else {
      // 【進入抽獎畫面】
      voteBgmRef.current?.pause();

      if (isSpinning) {
        // 正在捲動名單：播放 spring.mp3
        springBgmRef.current?.play().catch(() => {});
      } else {
        // 💡 修正 3：名單公布後，延遲 3800ms 播放 win.mp3
        if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
        winTimeoutRef.current = setTimeout(() => {
          if (match.show_lottery) {
            winBgmRef.current?.play().catch(() => {});
          }
        }, 3800); // 3.8秒
      }
    }
  }, [match?.show_lottery, isSpinning, match, audioEnabled]);

  // 自動計算 1920x1080 縮放比例 (方法 B)
  useLayoutEffect(() => {
    const handleResize = () => {
      const designWidth = 1920;
      const designHeight = 1080;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const scaleX = windowWidth / designWidth;
      const scaleY = windowHeight / designHeight;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setTimeout(() => { setIsSpinning(false); }, 4000);
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
        // 隨機產生 4 個假名字用於滾動動畫
        const dummy = Array(4).fill(0).map(() => realVoters[Math.floor(Math.random() * realVoters.length)]);
        setSpinningNames(dummy);
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isSpinning, realVoters]);

  useEffect(() => {
    if (match?.show_lottery && !isSpinning && match.lottery_winners?.length > 4) {
      const interval = setInterval(() => {
        setLotteryPage((prev) => {
          const totalPages = Math.ceil(match.lottery_winners.length / 4);
          return (prev + 1) % totalPages;
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [match?.show_lottery, isSpinning, match?.lottery_winners]);

  if (!match) return <div className="min-h-screen bg-black" />;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;
  const [p1Int, p1Dec] = p1Rate.toFixed(1).split('.');
  const [p2Int, p2Dec] = p2Rate.toFixed(1).split('.');

  const maxNameLen = Math.max(match.p1_name?.length || 0, match.p2_name?.length || 0);
  let nameTextClass = "text-[110px] mb-2 leading-none";
  if (maxNameLen >= 8) nameTextClass = "text-[70px] mb-4 leading-none";
  else if (maxNameLen >= 5) nameTextClass = "text-[90px] mb-3 leading-none";

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!domain) return email;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const currentWinners = match.lottery_winners?.slice(lotteryPage * 4, (lotteryPage * 4) + 4) || [];

  return (
    <div 
      className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden cursor-default"
      onClick={() => { if (!audioEnabled) handleToggleAudio() }} 
    >
      
      {/* 💡 修正 1：左下方純圖示音效按鈕 */}
      <button 
        onClick={(e) => { e.stopPropagation(); handleToggleAudio(); }}
        className="absolute bottom-8 left-8 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all backdrop-blur-md border border-white/10 text-2xl shadow-lg"
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>

      <div 
        style={{
          width: '1920px',
          height: '1080px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
        className="relative bg-black shadow-2xl overflow-hidden font-sans select-none"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0c246b] via-[#040d2b] to-[#01020a]"></div>

        {/* ================= 左半部 ================= */}
        <div className="absolute left-0 top-0 h-full w-[1018px] z-10 shadow-[0_0_50px_rgba(37,99,235,0.4)]" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c246b] via-[#040d2b] to-[#01020a]" style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, calc(85% - 4px) 100%, 0 100%)' }}>
            <motion.div animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[10%] left-[-5%] w-[1100px] h-[1100px] bg-blue-500/50 rounded-full blur-[150px] mix-blend-screen pointer-events-none z-0" />
            
            <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none" style={{ WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 40% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)' }}>
              <motion.div animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[20%] left-[-10%] w-[1000px] h-[1000px] bg-blue-600/40 rounded-full blur-[120px] mix-blend-screen" />
              
              <motion.div animate={{ x: [-35, 35, -35], y: [-15, 15, -15], scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[-10%] left-[-10%] w-[1200px] h-[1200px] mix-blend-screen" style={{ backgroundImage: "url('/cloud-left.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(5px)' }} />
              <motion.div animate={{ x: [45, -45, 45], y: [20, -20, 20], scale: [1.1, 0.95, 1.1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[-10%] right-[0%] w-[1000px] h-[1000px] mix-blend-screen" style={{ backgroundImage: "url('/cloud-left.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(10px)' }} />
            </div>
            
            <div className="absolute left-[5%] top-[8%] text-[450px] font-black italic text-blue-300/30 leading-none pointer-events-none z-0 tracking-tighter drop-shadow-[0_0_30px_rgba(96,165,250,0.4)]">{p1Int}</div>
            
            <div className="absolute inset-0 z-10 overflow-hidden pt-10" style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 100px) 100%, 0 100%)' }}>
              {match.p1_avatar && <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain max-w-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt={match.p1_name} />}
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-[25vh] bg-gradient-to-t from-[#01020a] via-[#01020a]/80 to-transparent z-20"></div>
            
            <div className="absolute bottom-16 w-full flex flex-col items-center pr-[10%] z-30">
              <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p1_name}</h2>
              <div className="flex items-baseline gap-6 bg-blue-950/60 px-10 py-3 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                <div className="text-4xl font-bold text-blue-400 tracking-widest"><motion.span key={`v1-${match.p1_votes}`} initial={{ scale: 2 }} animate={{ scale: 1 }} className="inline-block origin-bottom">{match.p1_votes}</motion.span> <span className="text-xl opacity-70">VOTES</span></div>
                <div className="text-white tracking-tighter drop-shadow-[0_0_20px_rgba(59,130,246,1)]"><span className="text-[60px] font-black">{p1Int}</span><span className="text-[25px] font-black">.{p1Dec}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 🔴 右半部 ================= */}
        <div className="absolute right-0 top-0 h-full w-[1018px] bg-[#2e0509] z-10 shadow-[0_0_50px_rgba(220,38,38,0.4)]" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}>
          <div className="absolute inset-0 bg-gradient-to-bl from-[#6b0c15] via-[#2b0407] to-[#080102]" style={{ clipPath: 'polygon(calc(15% + 4px) 0, 100% 0, 100% 100%, 4px 100%)' }}>
            <motion.div animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[10%] right-[-5%] w-[1100px] h-[1100px] bg-red-500/50 rounded-full blur-[150px] mix-blend-screen pointer-events-none z-0" />
            
            <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
              <motion.div animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[20%] right-[-10%] w-[1000px] h-[1000px] bg-red-600/40 rounded-full blur-[120px] mix-blend-screen" />
              
              <motion.div animate={{ x: [35, -35, 35], y: [15, -15, 15], scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[-5%] right-[-10%] w-[1200px] h-[1200px] mix-blend-screen" style={{ backgroundImage: "url('/cloud-right.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(5px)' }} />
              <motion.div animate={{ x: [-45, 45, -45], y: [-20, 20, -20], scale: [1.1, 0.95, 1.1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[-10%] left-[0%] w-[1000px] h-[1000px] mix-blend-screen" style={{ backgroundImage: "url('/cloud-right.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(10px)' }} />
            </div>
            
            <div className="absolute right-[5%] top-[8%] text-[450px] font-black italic text-red-400/30 leading-none pointer-events-none z-0 tracking-tighter drop-shadow-[0_0_30px_rgba(248,113,113,0.4)]">{p2Int}</div>
            
            <div className="absolute inset-0 z-10 overflow-hidden pt-10" style={{ clipPath: 'polygon(100px 0, 100% 0, 100% 100%, 0 100%)' }}>
              {match.p2_avatar && <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain max-w-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt={match.p2_name} />}
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-[25vh] bg-gradient-to-t from-[#080102] via-[#080102]/80 to-transparent z-20"></div>
            
            <div className="absolute bottom-16 w-full flex flex-col items-center pl-[10%] z-30">
              <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p2_name}</h2>
              <div className="flex items-baseline gap-6 bg-red-950/60 px-10 py-3 rounded-3xl border border-red-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex-row-reverse">
                <div className="text-4xl font-bold text-red-400 tracking-widest"><motion.span key={`v2-${match.p2_votes}`} initial={{ scale: 2 }} animate={{ scale: 1 }} className="inline-block origin-bottom">{match.p2_votes}</motion.span> <span className="text-xl opacity-70">VOTES</span></div>
                <div className="text-white tracking-tighter drop-shadow-[0_0_20px_rgba(239,68,68,1)]"><span className="text-[60px] font-black">{p2Int}</span><span className="text-[25px] font-black">.{p2Dec}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* 頂層線條與 UI */}
        <div className="absolute left-0 top-0 h-full w-[1018px] z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 15px #003cff)' }}>
          <div className="absolute left-0 top-0 h-full w-full bg-[#003cff]" style={{ clipPath: 'polygon(calc(100% - 4px) 0, 100% 0, 85% 100%, calc(85% - 4px) 100%)' }}></div>
        </div>
        <div className="absolute right-0 top-0 h-full w-[1018px] z-20 pointer-events-none" style={{ filter: 'drop-shadow(0 0 15px #ff003c)' }}>
          <div className="absolute left-0 top-0 h-full w-full bg-[#ff003c]" style={{ clipPath: 'polygon(15% 0, calc(15% + 4px) 0, 4px 100%, 0 100%)' }}></div>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 px-16 py-4 rounded-b-3xl border-b-2 border-x-2 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
          <h1 className="text-3xl font-black text-white tracking-[0.3em] uppercase drop-shadow-md">LIVE VOTE</h1>
          {match.tournament_name && <div className="text-sm font-bold text-zinc-400 tracking-[0.2em] mt-1 uppercase">{match.tournament_name}</div>}
        </div>

        <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="rounded-full p-[4px] bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 shadow-[0_0_40px_rgba(234,179,8,0.6)]">
            <div className="bg-black text-white italic font-black text-6xl rounded-full w-28 h-28 flex items-center justify-center">VS</div>
          </div>
        </div>

        {!match.show_lottery && originUrl && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className="absolute bottom-[38%] right-[3%] z-40 bg-black/90 backdrop-blur-xl p-4 rounded-3xl border border-red-900/60 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><h3 className="text-white font-bold text-[11px] tracking-[0.2em] uppercase">Scan To Vote</h3></div>
            <div className="bg-white p-2 rounded-2xl shadow-inner"><QRCode value={originUrl} size={110} level="H" /></div>
          </motion.div>
        )}

        {/* ================= 🏆 抽獎揭曉全畫面 ================= */}
        <AnimatePresence>
          {match.show_lottery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center font-sans overflow-hidden">
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="bg-gradient-to-b from-[#111] to-black border border-yellow-500/30 p-12 rounded-[2rem] shadow-[0_0_100px_rgba(250,204,21,0.2)] relative flex flex-col items-center min-w-[850px]">
                <h2 className="text-yellow-400 text-6xl font-black italic tracking-[0.3em] uppercase mb-8 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">WINNERS</h2>
                
                {/* 💡 修正 2：使用 Flex-1 讓 4 個名單完美填滿固定高度的容器，不會留白 */}
                <div className="w-full relative h-[560px]">
                  {isSpinning ? (
                     <div className="absolute inset-0 w-full flex flex-col gap-4">
                       { spinningNames.slice(0, 4).map((name, i) => (
                         <div key={i} className="bg-zinc-900/50 border border-zinc-700 w-full rounded-2xl flex-1 flex items-center justify-center animate-pulse">
                           <span className="text-5xl font-black text-zinc-400 tracking-widest blur-[1px]">{name}</span>
                         </div>
                       ))}
                     </div>
                  ) : (
                     <AnimatePresence mode="wait">
                       <motion.div key={lotteryPage} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="absolute inset-0 w-full flex flex-col gap-4 overflow-hidden">
                         {currentWinners.slice(0, 4).map((w: any, idx: number) => (
                           <div key={idx} className="bg-gradient-to-r from-yellow-900/30 via-yellow-600/20 to-yellow-900/30 border border-yellow-500/40 w-full rounded-2xl flex-1 flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
                             <div className="absolute inset-0 bg-yellow-400/5 animate-pulse mix-blend-overlay"></div>
                             <div className="text-5xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] z-10 mb-1 truncate max-w-[700px]">{w.user_name}</div>
                             <div className="text-2xl text-yellow-500/80 tracking-widest font-bold z-10">{maskEmail(w.user_email)}</div>
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
    </div>
  );
}