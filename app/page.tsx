'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function VotePage() {
  const [match, setMatch] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // 💡 登入狀態管理
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 檢查 Google 登入狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 💡 抓取 is_active = true 的「目前直播場次」
    const fetchMatch = () => {
      supabase.from('active_match').select('*').eq('is_active', true).single().then(({ data }) => setMatch(data));
    };
    fetchMatch();
    
    // 即時更新 (過濾只接收目前這場的變化)
    const channel = supabase.channel('realtime-mobile')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (p) => {
        if (p.new.is_active) setMatch(p.new);
      }).subscribe();
      
    return () => { 
      supabase.removeChannel(channel); 
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = () => {
    supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleVote = async (player: 1 | 2) => {
    if (!user) return;
    
    // 💡 使用新的 cast_vote RPC，同時寫入抽獎紀錄與計票
    const { error } = await supabase.rpc('cast_vote', { 
      v_match_id: match.id, 
      v_player: player, 
      v_user_id: user.id 
    });

    if (error) {
      if (error.message.includes('unique constraint')) {
        setToastMsg('❌ 您已經投過票囉！'); // 防止同場重複投票
      } else {
        setToastMsg('❌ 投票發生錯誤');
      }
    } else {
      const playerName = player === 1 ? match?.p1_name : match?.p2_name;
      setToastMsg(`✅ SUCCESS: ${playerName}`);
    }
    
    setTimeout(() => setToastMsg(null), 1500);
    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(50);
  };

  if (authLoading || !match) return <div className="h-screen w-screen bg-[#05050a] flex items-center justify-center text-white font-black italic tracking-widest text-3xl animate-pulse">LOADING...</div>;

  // 💡 如果尚未登入，顯示全螢幕登入畫面
  if (!user) {
    return (
      <div className="h-[100dvh] w-full bg-[#020205] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-[#020205] to-[#020205]" />
        <div className="z-10 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-8 md:p-12 rounded-3xl text-center shadow-[0_0_50px_rgba(0,0,0,1)] max-w-md w-full">
          <h1 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 tracking-tighter uppercase mb-2 drop-shadow-md">
            {match.tournament_name || 'SWC 2025'}
          </h1>
          <p className="text-zinc-400 text-sm font-bold tracking-widest uppercase mb-10">Live Prediction</p>
          
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">參與賽事預測抽好禮！</h2>
            <p className="text-zinc-500 text-xs">請先登入帳號以確保抽獎資格與投票公平性</p>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  // 以下為原本的投票介面 (只有登入後才會看到)
  const p1 = { x: match.p1_stream_x ?? 50, y: match.p1_stream_y ?? 50, size: match.p1_stream_size ?? 100 };
  const p2 = { x: match.p2_stream_x ?? 50, y: match.p2_stream_y ?? 50, size: match.p2_stream_size ?? 100 };

  return (
    <div className="h-[100dvh] w-full bg-[#020205] flex flex-col overflow-hidden font-sans select-none text-white">
      
      <div className="relative md:absolute top-0 w-full z-30 pt-8 pb-4 md:pt-16 md:pb-24 flex flex-col items-center bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none shrink-0">
        <h1 className="text-[40px] md:text-[70px] leading-tight font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-100 tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] pr-3">
          {match.tournament_name || 'SWC 2025'}
        </h1>
        <div className="text-sm md:text-xl text-zinc-300 font-bold tracking-[0.4em] uppercase mt-1 drop-shadow-md">Live Prediction</div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative">
        <motion.div whileTap={{ brightness: 1.6 }} onClick={() => handleVote(1)} className="flex-1 relative cursor-pointer group overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
          <div className="absolute inset-0 bg-blue-900/20 z-0" />
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {match.p1_avatar && <img src={match.p1_avatar} style={{ transform: `translate(${p1.x - 50}%, ${p1.y - 50}%) scale(${p1.size / 100})` }} className="absolute w-[800px] h-[800px] object-contain max-w-none transition-transform duration-500 group-active:scale-[1.1]" alt="p1" />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-transparent to-transparent z-10" />
          <div className="absolute bottom-6 md:bottom-12 left-0 w-full flex flex-col items-center z-20">
             <h2 className="text-4xl md:text-6xl font-black italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase">{match.p1_name}</h2>
             <div className="mt-4 px-10 py-2 bg-blue-600 rounded-full text-sm font-black italic tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.6)]">VOTE</div>
          </div>
        </motion.div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-black text-white italic font-black text-3xl md:text-5xl rounded-full w-14 h-14 md:w-24 md:h-24 flex items-center justify-center border-2 border-white/20 shadow-[0_0_30px_rgba(0,0,0,1)]">VS</div>
        </div>

        <motion.div whileTap={{ brightness: 1.6 }} onClick={() => handleVote(2)} className="flex-1 relative cursor-pointer group overflow-hidden">
          <div className="absolute inset-0 bg-red-900/20 z-0" />
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {match.p2_avatar && <img src={match.p2_avatar} style={{ transform: `translate(${p2.x - 50}%, ${p2.y - 50}%) scale(${p2.size / 100})` }} className="absolute w-[800px] h-[800px] object-contain max-w-none transition-transform duration-500 group-active:scale-[1.1]" alt="p2" />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-red-950 via-transparent to-transparent z-10" />
          <div className="absolute bottom-6 md:bottom-12 left-0 w-full flex flex-col items-center z-20">
             <h2 className="text-4xl md:text-6xl font-black italic tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,1)] uppercase">{match.p2_name}</h2>
             <div className="mt-4 px-10 py-2 bg-red-600 rounded-full text-sm font-black italic tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.6)]">VOTE</div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className="absolute inset-0 m-auto w-fit h-fit z-50 bg-white text-black px-10 py-5 rounded-2xl font-black italic text-xl md:text-2xl shadow-[0_0_60px_rgba(255,255,255,0.6)] border-4 border-black text-center whitespace-nowrap">
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}