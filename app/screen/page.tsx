'use client';
import { useEffect, useState, useLayoutEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function StageScreenPage() {
  const [match, setMatch] = useState<any>(null);
  const [originUrl, setOriginUrl] = useState<string>('');
  
  // 💡 縮放比例狀態
  const [scale, setScale] = useState(1);

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false); 
  const [realVoters, setRealVoters] = useState<string[]>([]);
  const [spinningNames, setSpinningNames] = useState<string[]>([]);
  const [lotteryPage, setLotteryPage] = useState(0);

  // 💡 自動計算 1920x1080 縮放比例
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
    handleResize(); // 初始化執行一次
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
    if (name.length <= 3) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***${name.substring(6)}@${domain}`;
  };

  const currentWinners = match.lottery_winners?.slice(lotteryPage * 3, (lotteryPage * 3) + 3) || [];

  return (
    // 外層容器：確保螢幕背景為黑，並將內部等比例置中
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      
      {/* 縮放畫布：鎖定 1920x1080 並進行 transform 縮放 */}
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
        
        {/* 🌌 藍紫色調霓虹漸層背景底色 */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0c246b] via-[#040d2b] to-[#01020a]"></div>

        {/* ================= 🔵 左半部內容 (藍方) ================= */}
        <div 
          className="absolute left-0 top-0 h-full w-[1018px] z-10"
          style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0c246b 0%, #040d2b 50%, #01020a 100%)' }}>
            
            {/* 實體藍色光暈與微微動雲霧 */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <motion.div animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }} transition={{ duration: 15, repeat: Infinity }}
                className="absolute top-[10%] left-[-5%] w-[1000px] h-[1000px] bg-blue-500/40 rounded-full blur-[150px] mix-blend-screen" />
              
              <div className="absolute inset-0 overflow-hidden" style={{ WebkitMaskImage: 'radial-gradient(circle at 40% 50%, black 30%, transparent 80%)' }}>
                <motion.div animate={{ x: [-20, 20, -20], y: [-10, 10, -10] }} transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 opacity-40 mix-blend-screen"
                  style={{ backgroundImage: "url('/cloud-left.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              </div>
            </div>

            {/* 💡 修正：背景巨型數字強化 (提高透明度、加亮顏色、增加光暈) */}
            <div className="absolute left-[100px] top-[150px] text-[450px] font-black italic text-blue-300/40 leading-none pointer-events-none z-0 drop-shadow-[0_0_30px_rgba(96,165,250,0.5)] tracking-tighter">
              {p1Int}
            </div>

            {/* 選手下方遮罩處理 */}
            <div className="absolute inset-0 z-10 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
              {match.p1_avatar && (
                <img src={match.p1_avatar} style={{ transform: `translate(${match.p1_x - 50}%, ${match.p1_y - 50}%) scale(${match.p1_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt="p1" />
              )}
            </div>

            <div className="absolute bottom-20 w-full flex flex-col items-center pr-[150px] z-30">
              <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p1_name}</h2>
              <div className="flex items-baseline gap-6 bg-blue-950/60 px-10 py-3 rounded-3xl border border-blue-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                <div className="text-4xl font-bold text-blue-400 tracking-widest">{match.p1_votes} <span className="text-xl opacity-70">VOTES</span></div>
                <div className="text-white tracking-tighter"><span className="text-[60px] font-black">{p1Int}</span><span className="text-[25px] font-black">.{p1Dec}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 🔴 右半部內容 (紅方) ================= */}
        <div 
          className="absolute right-0 top-0 h-full w-[1010px] z-10"
          style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(225deg, #6b0c15 0%, #1a0105 50%, #050002 100%)' }}>
            
            {/* 實體紅紫黃光暈與雲霧 */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <motion.div animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 18, repeat: Infinity }}
                className="absolute top-[10%] right-[-5%] w-[1000px] h-[1000px] bg-red-600/40 rounded-full blur-[150px] mix-blend-screen" />
              
              <div className="absolute inset-0 overflow-hidden" style={{ WebkitMaskImage: 'radial-gradient(circle at 60% 50%, black 30%, transparent 80%)' }}>
                <motion.div animate={{ x: [20, -20, 20], y: [10, -10, 10] }} transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 opacity-40 mix-blend-screen"
                  style={{ backgroundImage: "url('/cloud-right.png')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              </div>
            </div>

            {/* 💡 修正：背景巨型數字強化 (提高透明度、加亮顏色、增加光暈) */}
            <div className="absolute right-[100px] top-[150px] text-[450px] font-black italic text-red-400/40 leading-none pointer-events-none z-0 drop-shadow-[0_0_30px_rgba(248,113,113,0.5)] tracking-tighter">
              {p2Int}
            </div>

            {/* 選手下方遮罩處理 */}
            <div className="absolute inset-0 z-10 overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}>
              {match.p2_avatar && (
                <img src={match.p2_avatar} style={{ transform: `translate(${match.p2_x - 50}%, ${match.p2_y - 50}%) scale(${match.p2_size / 100})`, transformOrigin: 'center center' }} className="absolute w-[900px] h-[900px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" alt="p2" />
              )}
            </div>

            <div className="absolute bottom-20 w-full flex flex-col items-center pl-[150px] z-30">
              <h2 className={`${nameTextClass} font-black text-white italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)]`}>{match.p2_name}</h2>
              <div className="flex items-baseline gap-6 bg-red-950/60 px-10 py-3 rounded-3xl border border-red-500/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex-row-reverse">
                <div className="text-4xl font-bold text-red-400 tracking-widest">{match.p2_votes} <span className="text-xl opacity-70">VOTES</span></div>
                <div className="text-white tracking-tighter"><span className="text-[60px] font-black">{p2Int}</span><span className="text-[25px] font-black">.{p2Dec}%</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ⚔️ 畫面頂層 UI (固定座標) ================= */}
        
        {/* 斜切螢光線條 */}
        <div className="absolute left-[958px] top-0 h-full w-[4px] z-20 bg-[#003cff] shadow-[0_0_20px_#003cff,0_0_40px_#003cff]" style={{ transform: 'skewX(-8.5deg)' }}></div>
        <div className="absolute left-[962px] top-0 h-full w-[4px] z-20 bg-[#ff003c] shadow-[0_0_20px_#ff003c,0_0_40px_#ff003c]" style={{ transform: 'skewX(-8.5deg)' }}></div>

        {/* 置中標題區 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 px-16 py-4 rounded-b-3xl border-b-2 border-x-2 border-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
          <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase">LIVE VOTE</h1>
          {match.tournament_name && <div className="text-sm font-bold text-zinc-400 tracking-[0.2em] mt-1 uppercase">{match.tournament_name}</div>}
        </div>

        {/* VS 金色外圈標誌 */}
        <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 z-40">
          <div className="rounded-full p-[5px] bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-800 shadow-[0_0_50px_rgba(234,179,8,0.6)]">
            <div className="bg-black text-white italic font-black text-7xl rounded-full w-32 h-32 flex items-center justify-center">VS</div>
          </div>
        </div>

        {/* QR Code (固定在右上方避開名字) */}
        {!match.show_lottery && originUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-[420px] right-[40px] z-40 bg-black/90 backdrop-blur-xl p-5 rounded-3xl border border-red-900/60 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><h3 className="text-white font-bold text-[12px] tracking-[0.2em] uppercase">Scan To Vote</h3></div>
            <div className="bg-white p-2 rounded-2xl"><QRCode value={originUrl} size={120} level="H" /></div>
          </motion.div>
        )}

        {/* 🏆 抽獎揭曉全畫面 */}
        <AnimatePresence>
          {match.show_lottery && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center">
              <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="bg-gradient-to-b from-[#111] to-black border border-yellow-500/30 p-16 rounded-[3rem] shadow-[0_0_100px_rgba(250,204,21,0.2)] flex flex-col items-center min-w-[900px]">
                <h2 className="text-yellow-400 text-7xl font-black italic tracking-[0.3em] uppercase mb-12">WINNERS</h2>
                <div className="w-full h-[450px] relative">
                  {isSpinning ? (
                     <div className="flex flex-col gap-6 w-full">
                       {spinningNames.slice(0, 3).map((name, i) => (
                         <div key={i} className="bg-zinc-900/50 border border-zinc-700 rounded-2xl py-8 text-center animate-pulse"><span className="text-6xl font-black text-zinc-400 blur-[1px]">{name}</span></div>
                       ))}
                     </div>
                  ) : (
                    <div className="flex flex-col gap-6 w-full">
                      {match.lottery_winners?.slice(0, 3).map((w: any, idx: number) => (
                        <div key={idx} className="bg-gradient-to-r from-yellow-900/30 to-yellow-900/30 border border-yellow-500/40 rounded-2xl py-8 flex flex-col items-center shadow-lg">
                          <div className="text-6xl font-black text-white tracking-widest mb-2">{w.user_name}</div>
                          <div className="text-2xl text-yellow-500/80 font-bold">{maskEmail(w.user_email)}</div>
                        </div>
                      ))}
                    </div>
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