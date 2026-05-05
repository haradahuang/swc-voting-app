'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Save, RotateCcw } from 'lucide-react';

export default function AdminPage() {
  const [match, setMatch] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

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

  // 即時更新本地狀態 (讓預覽畫面順暢)
  const handleChange = (field: string, value: any) => {
    setMatch(prev => ({ ...prev, [field]: value }));
  };

  // 寫入資料庫 (用於滑桿放開、或輸入框失去焦點時)
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
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase">SWC Admin Panel</h1>
          <div className="flex gap-4">
            <button onClick={() => supabase.from('active_match').update({p1_votes:0, p2_votes:0}).eq('id',1).then(()=>fetchMatch())} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-900 rounded-lg transition text-sm font-bold"><RotateCcw size={18}/> Reset Votes</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition font-bold"><Save size={18}/> 強制全域同步</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {['p1', 'p2'].map((p) => (
            <div key={p} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 space-y-6 flex flex-col xl:flex-row gap-8">
              
              {/* 左側設定區 */}
              <div className="flex-1 space-y-4">
                <h2 className={`text-xl font-bold uppercase ${p === 'p1' ? 'text-blue-500' : 'text-red-500'}`}>Player {p === 'p1' ? '1 (Blue)' : '2 (Red)'}</h2>
                
                <div>
                  <label className="text-xs uppercase text-zinc-500 font-bold">Player Name</label>
                  <input 
                    className="w-full bg-zinc-800 border-none rounded-xl p-3 mt-1 focus:ring-2 focus:ring-blue-500 text-white"
                    value={match[`${p}_name`]} 
                    onChange={(e) => handleChange(`${p}_name`, e.target.value)}
                    onBlur={(e) => handleSyncToDB(`${p}_name`, e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase text-zinc-500 font-bold">Upload Image</label>
                  <label className="mt-2 w-full cursor-pointer bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-3 flex justify-center transition">
                    <span className="text-sm text-zinc-400 font-bold">{uploading ? 'Uploading...' : '點擊上傳圖片 (PNG/JPG)'}</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, p as any)} />
                  </label>
                </div>

                {/* 座標調整區 */}
                <div className="space-y-4 p-4 bg-zinc-800/50 rounded-2xl">
                  {[['size', '大小 Size', 10, 300], ['x', '水平 X', 0, 100], ['y', '垂直 Y', 0, 100]].map(([key, label, min, max]) => (
                    <div key={key}>
                      <label className="flex justify-between text-[10px] uppercase font-bold text-zinc-500 mb-1">{label}</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" min={min} max={max} 
                          value={match[`${p}_${key}`]} 
                          onChange={(e) => handleChange(`${p}_${key}`, parseInt(e.target.value))}
                          onPointerUp={(e) => handleSyncToDB(`${p}_${key}`, parseInt(e.currentTarget.value))}
                          className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <input 
                          type="number"
                          value={match[`${p}_${key}`]}
                          onChange={(e) => handleChange(`${p}_${key}`, parseInt(e.target.value) || 0)}
                          onBlur={(e) => handleSyncToDB(`${p}_${key}`, parseInt(e.target.value) || 0)}
                          className="w-16 bg-zinc-950 text-center text-white text-xs py-1 rounded border border-zinc-700 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右側預覽區 */}
              <div className="w-48 h-64 bg-black border-2 border-zinc-700 rounded-xl overflow-hidden relative shrink-0">
                <div className="absolute top-2 left-2 text-[10px] text-zinc-500 z-10 bg-black/50 px-2 rounded">預覽 Preview</div>
                <img 
                  src={match[`${p}_avatar`]} 
                  style={{ 
                    transform: `translate(${match[`${p}_x`] - 50}%, ${match[`${p}_y`] - 50}%) scale(${match[`${p}_size`] / 100})`,
                    transformOrigin: 'center center'
                  }}
                  className="w-full h-full object-contain pointer-events-none" 
                  alt="Preview"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}