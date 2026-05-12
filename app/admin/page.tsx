'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, RotateCcw, MonitorPlay, Tv, Radio } from 'lucide-react';

export default function AdminPage() {
  const [match, setMatch] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState<'screen' | 'stream'>('screen');
  
  // 💡 新增：目前正在編輯的賽事 ID (1~8)
  const [currentMatchId, setCurrentMatchId] = useState<number>(1);

  useEffect(() => {
    fetchMatch(currentMatchId);
  }, [currentMatchId]);

  const fetchMatch = async (id: number) => {
    const { data } = await supabase.from('active_match').select('*').eq('id', id).single();
    setMatch(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, playerKey: 'p1' | 'p2') => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${playerKey}_${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setMatch({ ...match, [`${playerKey}_avatar`]: publicUrl });
      await supabase.from('active_match').update({ [`${playerKey}_avatar`]: publicUrl }).eq('id', currentMatchId);
    } catch (error) {
      alert('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field: string, value: any) => setMatch((prev: any) => ({ ...prev, [field]: value }));
  const handleSyncToDB = async (field: string, value: any) => await supabase.from('active_match').update({ [field]: value }).eq('id', currentMatchId);
  
  const handleSave = async () => {
    await supabase.from('active_match').update(match).eq('id', currentMatchId);
    alert(`賽事 ${currentMatchId} 同步成功！`);
  };

  // 💡 新增：將目前編輯的賽事推上大螢幕
  const handleSetLive = async () => {
    await supabase.from('active_match').update({ is_active: false }).neq('id', 0); // 先把所有人取消
    await supabase.from('active_match').update({ is_active: true }).eq('id', currentMatchId); // 啟動這場
    alert(`✅ 已將【賽事 ${currentMatchId}】推送到大螢幕與投票頁面！`);
    fetchMatch(currentMatchId); // 重整拿最新資料
  };

  if (!match) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ================= 8 場賽事切換區 ================= */}
        <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex gap-2 overflow-x-auto">
          {[1,2,3,4,5,6,7,8].map(id => (
            <button
              key={id}
              onClick={() => setCurrentMatchId(id)}
              className={`px-6 py-3 rounded-xl font-black whitespace-nowrap transition-all ${currentMatchId === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              賽事 {id}
            </button>
          ))}
        </div>

        {/* Header 區塊 */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800 gap-4 relative overflow-hidden">
          {/* 顯示這場是否為直播中 */}
          {match.is_active && (
            <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl flex items-center gap-1 animate-pulse">
              <Radio size={14} /> LIVE ON SCREEN
            </div>
          )}

          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black italic text-white uppercase">賽事 {currentMatchId} 設定</h1>
            <div className="flex items-center gap-3 border-l border-zinc-700 pl-6">
              <span className="text-xs uppercase text-zinc-400 font-bold">賽事名稱</span>
              <input 
                className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 focus:ring-2 focus:ring-yellow-500 text-yellow-400 font-bold w-48 text-center"
                value={match.tournament_name || ''} onChange={(e) => handleChange('tournament_name', e.target.value)} onBlur={(e) => handleSyncToDB('tournament_name', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => supabase.from('active_match').update({p1_votes:0, p2_votes:0}).eq('id',currentMatchId).then(()=>fetchMatch(currentMatchId))} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold"><RotateCcw size={18}/> 票數歸零</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold"><Save size={18}/> 儲存設定</button>
            <button onClick={handleSetLive} className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-black shadow-[0_0_15px_rgba(220,38,38,0.5)]"><Radio size={18}/> 推上直播</button>
          </div>
        </div>

        {/* 模式切換 */}
        <div className="flex justify-center gap-4 bg-zinc-900/50 py-4 rounded-2xl border border-zinc-800/50">
           <button onClick={() => setEditMode('screen')} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold ${editMode === 'screen' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}><MonitorPlay size={20} /> 調整【現場大螢幕】</button>
           <button onClick={() => setEditMode('stream')} className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold ${editMode === 'stream' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}><Tv size={20} /> 調整【直播台下標】</button>
        </div>

        {/* 玩家設定區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {['p1', 'p2'].map((p) => {
            const currentX = match[editMode === 'screen' ? `${p}_x` : `${p}_stream_x`] ?? 50;
            const currentY = match[editMode === 'screen' ? `${p}_y` : `${p}_stream_y`] ?? 50;
            const currentSize = match[editMode === 'screen' ? `${p}_size` : `${p}_stream_size`] ?? 100;

            return (
              <div key={p} className={`p-8 rounded-3xl border space-y-6 flex flex-col xl:flex-row gap-8 ${editMode === 'screen' ? 'bg-zinc-900 border-zinc-800' : 'bg-[#1a1525] border-purple-900/50'}`}>
                <div className="flex-1 space-y-4">
                  <h2 className={`text-xl font-bold uppercase ${p === 'p1' ? 'text-blue-500' : 'text-red-500'}`}>Player {p === 'p1' ? '1 (Blue)' : '2 (Red)'}</h2>
                  <input className="w-full bg-zinc-800/80 border-none rounded-xl p-3 text-white" value={match[`${p}_name`]} onChange={(e) => handleChange(`${p}_name`, e.target.value)} onBlur={(e) => handleSyncToDB(`${p}_name`, e.target.value)} />
                  <label className="w-full cursor-pointer bg-zinc-800/80 border-2 border-dashed border-zinc-700 rounded-xl p-3 flex justify-center"><span className="text-sm text-zinc-400 font-bold">{uploading ? 'Uploading...' : '上傳圖片 (PNG)'}</span><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, p as any)} /></label>
                  
                  <div className={`space-y-4 p-4 rounded-2xl ${editMode === 'screen' ? 'bg-zinc-800/50' : 'bg-purple-900/20'}`}>
                    {[['size', '大小', 10, 300], ['x', '水平 X', 0, 100], ['y', '垂直 Y', 0, 100]].map(([key, label, min, max]) => {
                      const dbField = editMode === 'screen' ? `${p}_${key}` : `${p}_stream_${key}`;
                      const val = match[dbField] ?? (key === 'size' ? 100 : 50);
                      return (
                        <div key={key}>
                          <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1">{label}</label>
                          <div className="flex items-center gap-3">
                            <input type="range" min={min} max={max} value={val} onChange={(e) => handleChange(dbField, parseInt(e.target.value))} onPointerUp={(e) => handleSyncToDB(dbField, parseInt(e.currentTarget.value))} className="flex-1 h-1 bg-zinc-700 rounded-lg cursor-pointer"/>
                            <input type="number" value={val} onChange={(e) => handleChange(dbField, parseInt(e.target.value) || 0)} onBlur={(e) => handleSyncToDB(dbField, parseInt(e.target.value) || 0)} className="w-16 bg-zinc-950 text-center text-white text-xs py-1 rounded border border-zinc-700"/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={`w-48 bg-black border-2 rounded-xl overflow-hidden relative shrink-0 ${editMode === 'screen' ? 'h-64 border-zinc-700' : 'h-32 border-purple-700 my-auto'}`}>
                  <img src={match[`${p}_avatar`]} style={{ transform: `translate(${currentX - 50}%, ${currentY - 50}%) scale(${currentSize / 100})`, transformOrigin: 'center center' }} className="w-full h-full object-contain pointer-events-none" alt="Preview" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}