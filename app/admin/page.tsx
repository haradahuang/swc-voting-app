{/* Header 區塊 */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white">SWC Admin Panel</h1>
            
            {/* 💡 新增：自訂賽事名稱輸入框 */}
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-6">
              <span className="text-xs uppercase text-zinc-400 font-bold">賽事名稱<br/>(Tournament)</span>
              <input 
                className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-yellow-500 text-yellow-400 font-bold w-48 text-center"
                value={match.tournament_name || ''} 
                onChange={(e) => handleChange('tournament_name', e.target.value)}
                onBlur={(e) => handleSyncToDB('tournament_name', e.target.value)}
                placeholder="例如: SWC 2026"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => supabase.from('active_match').update({p1_votes:0, p2_votes:0}).eq('id',1).then(()=>fetchMatch())} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-900 rounded-lg transition text-sm font-bold">
              <RotateCcw size={18}/> Reset Votes
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition font-bold">
              <Save size={18}/> 強制全域同步
            </button>
          </div>
        </div>