'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Save, RotateCcw, MonitorPlay, Tv } from 'lucide-react';

export default function AdminPage() {
  const [match, setMatch] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // 💡 新增：用來控制目前正在編輯哪個畫面的狀態 (預設為大螢幕)
  const [editMode, setEditMode] = useState<'screen' | 'stream'>('screen');

  useEffect(() => {
    fetchMatch();
  }, []);

  const fetchMatch = async () => {
    const { data } = await supabase.from('active_match').select('*').eq('id', 1).single();
    setMatch(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, playerKey: 'p1' | 'p2') => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${playerKey}_${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const updatedMatch = { ...match, [`${playerKey}_avatar`]: publicUrl };
      setMatch(updatedMatch);
      await supabase.from('active_match').update({ [`${playerKey}_avatar`]: publicUrl }).eq('id', 1);
      
    } catch (error) {
      alert('上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  // 即時更新本地狀態
  const handleChange = (field: string, value: any) => {
    setMatch((prev: any) => ({ ...prev, [field]: value }));
  };

  // 寫入資料庫
  const handleSyncToDB = async (field: string, value: any) => {
    await supabase.from('active_match').update({ [field]: value }).eq('id', 1);
  };

  const handleSave = async () => {
    await supabase.from('active_match').update(match).eq('id', 1);
    alert('同步成功！');
  };

  if (!match) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">SWC Admin Panel</h1>
          <div className="flex gap-4">
            <button onClick={() => supabase.from('active_match').update({p1_votes:0, p2_votes:0}).eq('id',1).then(()=>fetchMatch())} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-900 rounded-lg transition text-sm font-bold">
              <RotateCcw size={18}/> Reset Votes
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition font-bold">
              <Save size={18}/> 強制全域同步
            </button>
          </div>
        </div>

        {/* 💡 模式切換開關區 */}
        <div className="flex justify-center gap-4 bg-zinc-900/50 py-4 rounded-2xl border border-zinc-800/50">
           <button
             onClick={() => setEditMode('screen')}
             className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${editMode === 'screen' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
           >
             <MonitorPlay size={20} />
             調整【現場大螢幕】全身
           </button>
           <button
             onClick={() => setEditMode('stream')}
             className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${editMode === 'stream' ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
           >
             <Tv size={20} />
             調整【直播台下標】半身
           </button>
        </div>

        {/* 玩家控制區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {['p1', 'p2'].map((p) => {
            
            // 💡 根據目前的模式，抓取對應的 X, Y, Size 數值 (如果是 stream 模式，預設大小 100，位置 50)
            const currentX = match[editMode === 'screen' ? `${p}_x` : `${p}_stream_x`] ?? 50;
            const currentY = match[editMode === 'screen' ? `${p}_y` : `${p}_stream_y`] ?? 50;
            const currentSize = match[editMode === 'screen' ? `${p}_size` : `${p}_stream_size`] ?? 100;

            return (
              <div key={p} className={`p-8 rounded-3xl border space-y-6 flex flex-col xl:flex-row gap-8 transition-colors ${editMode === 'screen' ? 'bg-zinc-900 border-zinc-800' : 'bg-[#1a1525] border-purple-900/50'}`}>
                
                {/* 左側設定區 */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center">
                     <h2 className={`text-xl font-bold uppercase ${p === 'p1' ? 'text-blue-500' : 'text-red-500'}`}>
                       Player {p === 'p1' ? '1 (Blue)' : '2 (Red)'}
                     </h2>
                     {/* 顯示目前正在編輯的狀態標籤 */}
                     <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${editMode === 'screen' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'}`}>
                        {editMode === 'screen' ? 'Screen Mode' : 'Stream Mode'}
                     </span>
                  </div>
                  
                  <div>
                    <label className="text-xs uppercase text-zinc-500 font-bold">Player Name</label>
                    <input 
                      className="w-full bg-zinc-800/80 border-none rounded-xl p-3 mt-1 focus:ring-2 focus:ring-blue-500 text-white"
                      value={match[`${p}_name`]} 
                      onChange={(e) => handleChange(`${p}_name`, e.target.value)}
                      onBlur={(e) => handleSyncToDB(`${p}_name`, e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase text-zinc-500 font-bold">Upload Image</label>
                    <label className="mt-2 w-full cursor-pointer bg-zinc-800/80 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-3 flex justify-center transition">
                      <span className="text-sm text-zinc-400 font-bold">{uploading ? 'Uploading...' : '點擊上傳圖片 (PNG/JPG)'}</span>
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, p as any)} />
                    </label>
                  </div>

                  {/* 座標調整區 */}
                  <div className={`space-y-4 p-4 rounded-2xl ${editMode === 'screen' ? 'bg-zinc-800/50' : 'bg-purple-900/20'}`}>
                    {[['size', '大小 Size', 10, 300], ['x', '水平 X', 0, 100], ['y', '垂直 Y', 0, 100]].map(([key, label, min, max]) => {
                      
                      // 💡 根據模式動態決定寫入資料庫的欄位名稱 (例如：p1_size 還是 p1_stream_size)
                      const dbField = editMode === 'screen' ? `${p}_${key}` : `${p}_stream_${key}`;
                      const val = match[dbField] ?? (key === 'size' ? 100 : 50);

                      return (
                        <div key={key}>
                          <label className="flex justify-between text-[10px] uppercase font-bold text-zinc-400 mb-1">{label}</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range" min={min} max={max} 
                              value={val} 
                              onChange={(e) => handleChange(dbField, parseInt(e.target.value))}
                              onPointerUp={(e) => handleSyncToDB(dbField, parseInt(e.currentTarget.value))}
                              className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <input 
                              type="number"
                              value={val}
                              onChange={(e) => handleChange(dbField, parseInt(e.target.value) || 0)}
                              onBlur={(e) => handleSyncToDB(dbField, parseInt(e.target.value) || 0)}
                              className="w-16 bg-zinc-950 text-center text-white text-xs py-1 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 右側預覽區 */}
                <div className={`w-48 bg-black border-2 rounded-xl overflow-hidden relative shrink-0 ${editMode === 'screen' ? 'h-64 border-zinc-700' : 'h-32 border-purple-700 mt-auto mb-auto'}`}>
                  <div className="absolute top-2 left-2 text-[10px] text-zinc-300 z-10 bg-black/70 px-2 py-0.5 rounded font-bold">
                    {editMode === 'screen' ? '大螢幕預覽' : '直播條預覽'}
                  </div>
                  <img 
                    src={match[`${p}_avatar`]} 
                    style={{ 
                      transform: `translate(${currentX - 50}%, ${currentY - 50}%) scale(${currentSize / 100})`,
                      transformOrigin: 'center center'
                    }}
                    className="w-full h-full object-contain pointer-events-none" 
                    alt="Preview"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}