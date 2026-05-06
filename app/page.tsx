'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function MobileVotingPage() {
  const [match, setMatch] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);

  useEffect(() => {
    const localVote = localStorage.getItem('swc_voted_p');
    if (localVote) {
      setHasVoted(true);
      setVotedFor(localVote);
    }

    const fetchMatch = async () => {
      const { data } = await supabase.from('active_match').select('*').eq('id', 1).single();
      setMatch(data);
    };
    fetchMatch();

    const channel = supabase.channel('mobile-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'active_match' }, (payload) => {
        setMatch(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleVote = async (player: 'p1' | 'p2') => {
  //if (hasVoted) return;
  // setHasVoted(true);
  // setVotedFor(player);
  // localStorage.setItem('swc_voted_p', player);
    await supabase.rpc('increment_vote', { player });
  };

  if (!match) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;

  const total = match.p1_votes + match.p2_votes;
  const p1Rate = total === 0 ? 50 : (match.p1_votes / total) * 100;
  const p2Rate = total === 0 ? 50 : (match.p2_votes / total) * 100;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 科技感背景光暈 */}
      <div className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-blue-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-red-900/10 blur-[120px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-5xl flex flex-col items-center gap-8 md:gap-12">
        
        {/* 標題 Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            Live Prediction
          </h1>
          <p className="text-zinc-400 text-sm md:text-base mt-2 uppercase tracking-widest">{hasVoted ? 'Thank you for voting!' : 'Select your winner'}</p>
        </div>

        {/* 投票區塊 (手機版上下疊加，PC版左右並排) */}
        <div className="flex flex-col md:flex-row w-full items-stretch justify-center gap-6 md:gap-10">
          
          {/* ================= 藍方選手 ================= */}
          <motion.button 
            whileTap={!hasVoted ? { scale: 0.95 } : {}}
            onClick={() => handleVote('p1')}
            disabled={hasVoted}
            className={`relative overflow-hidden rounded-3xl p-5 md:p-8 border-2 flex flex-row md:flex-col items-center md:justify-center gap-6 transition-all duration-300 w-full md:w-[400px] text-left md:text-center
              ${hasVoted && votedFor !== 'p1' ? 'border-zinc-800 bg-zinc-900/50 opacity-40 grayscale' : ''}
              ${hasVoted && votedFor === 'p1' ? 'border-blue-400 bg-blue-900/40 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : ''}
              ${!hasVoted ? 'border-blue-600 bg-blue-950/60 hover:bg-blue-900/80 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : ''}
            `}
          >
            {/* 圖片容器：手機版固定比例，PC版放大呈現全身 */}
            <div className="w-24 h-32 md:w-full md:h-80 rounded-2xl overflow-hidden bg-black/50 shrink-0 border border-white/10 relative">
              <img 
                src={match.p1_avatar} 
                // 捨棄大螢幕的 translate，統一使用 top 對齊，確保臉部出現
                className="absolute inset-0 w-full h-full object-cover object-top" 
                alt={match.p1_name}
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider mb-2">{match.p1_name}</div>
              {hasVoted ? (
                <div className="text-4xl md:text-5xl font-bold text-blue-400">{p1Rate.toFixed(0)}%</div>
              ) : (
                <div className="text-blue-400 text-sm md:text-base font-bold bg-blue-950/80 px-4 py-2 rounded-full inline-block">TAP TO VOTE</div>
              )}
            </div>
          </motion.button>

          {/* VS 分隔線 (PC版顯示中央VS，手機版顯示橫線) */}
          <div className="flex md:flex-col items-center justify-center gap-4 opacity-50 md:opacity-80">
            <div className="h-[1px] md:w-[1px] w-full md:h-20 bg-gradient-to-r md:bg-gradient-to-b from-transparent to-white"></div>
            <div className="text-2xl md:text-5xl font-black italic text-white drop-shadow-lg">VS</div>
            <div className="h-[1px] md:w-[1px] w-full md:h-20 bg-gradient-to-l md:bg-gradient-to-t from-transparent to-white"></div>
          </div>

          {/* ================= 紅方選手 ================= */}
          <motion.button 
            whileTap={!hasVoted ? { scale: 0.95 } : {}}
            onClick={() => handleVote('p2')}
            disabled={hasVoted}
            className={`relative overflow-hidden rounded-3xl p-5 md:p-8 border-2 flex flex-row md:flex-col items-center md:justify-center gap-6 transition-all duration-300 w-full md:w-[400px] text-left md:text-center
              ${hasVoted && votedFor !== 'p2' ? 'border-zinc-800 bg-zinc-900/50 opacity-40 grayscale' : ''}
              ${hasVoted && votedFor === 'p2' ? 'border-red-400 bg-red-900/40 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : ''}
              ${!hasVoted ? 'border-red-600 bg-red-950/60 hover:bg-red-900/80 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}
            `}
          >
            {/* 圖片容器：手機版固定比例，PC版放大呈現全身 */}
            <div className="w-24 h-32 md:w-full md:h-80 rounded-2xl overflow-hidden bg-black/50 shrink-0 border border-white/10 relative">
              <img 
                src={match.p2_avatar} 
                className="absolute inset-0 w-full h-full object-cover object-top" 
                alt={match.p2_name}
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider mb-2">{match.p2_name}</div>
              {hasVoted ? (
                <div className="text-4xl md:text-5xl font-bold text-red-400">{p2Rate.toFixed(0)}%</div>
              ) : (
                <div className="text-red-400 text-sm md:text-base font-bold bg-red-950/80 px-4 py-2 rounded-full inline-block">TAP TO VOTE</div>
              )}
            </div>
          </motion.button>

        </div>
      </div>
    </div>
  );
}