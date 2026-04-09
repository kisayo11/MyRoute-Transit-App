import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Trash2, ChevronRight, TrainFront, Bus, Loader2 } from 'lucide-react'

export default function Dashboard({ session, onGoSearch, onGoLive, onRequestAuth }: { session: any, onGoSearch: () => void, onGoLive: (route: any) => void, onRequestAuth: () => void }) {
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRoutes = async () => {
    if (!session) return
    setLoading(true)
    const { data } = await supabase.from('routes').select('*').order('created_at', { ascending: false })
    if (data) setRoutes(data)
    setLoading(false)
  }

  const handleDeleteRoute = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // 카드 클릭(Live 진입) 방지
    if (!confirm('이 경로를 즐겨찾기에서 삭제할까요?')) return

    const { error } = await supabase.from('routes').delete().eq('id', id)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setRoutes(routes.filter(r => r.id !== id))
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [session])

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] pt-12 p-6 flex flex-col animate-in fade-in duration-700 pb-20">
      
      {/* 상단 프로필 및 로그아웃 */}
      <div className="flex justify-between items-center mb-10 px-1">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-[#7EE787] bg-clip-text text-transparent">MyRoute</h1>
          <p className="text-[13px] font-bold text-text-sub dark:text-text-sub-dark mt-1 flex items-center">
            {session ? (
              <span className="flex items-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 animate-pulse" />
                Welcome, <span className="text-text-main dark:text-text-main-dark ml-1">{session.user.email?.split('@')[0]}</span>
              </span>
            ) : (
              "The Lightest Transit Companion"
            )}
          </p>
        </div>
        {session ? (
          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-2xl transition-all"
          >
            <LogOut size={18} className="text-text-sub" />
          </button>
        ) : (
          <button 
            onClick={onRequestAuth}
            className="px-6 py-2.5 bg-primary text-white font-black rounded-2xl text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            Login
          </button>
        )}
      </div>

      <div className="mb-10 p-7 bg-primary-bg rounded-[2.5rem] border border-primary/20 shadow-[0_20px_40px_-15px_rgba(var(--primary),0.1)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-700" />
        <h2 className="text-2xl font-black mb-1 tracking-tight">어디로 가시나요?</h2>
        <button 
          onClick={onGoSearch}
          className="w-full mt-6 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center text-lg"
        >
          <Plus className="w-5 h-5 mr-1.5" /> 새 경로 조립
        </button>
      </div>
      
      <div className="mt-2 flex-1 flex flex-col">
        <div className="flex justify-between items-end mb-5 px-1">
          <h2 className="text-xl font-black tracking-tight">즐겨찾기</h2>
        </div>
        
        {!session ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-border dark:border-white/10">
            <button onClick={onRequestAuth} className="text-primary font-black text-sm px-6 py-3 bg-primary/10 rounded-2xl">로그인하고 관리하기 →</button>
          </div>
        ) : loading ? (
           <div className="flex justify-center p-14"><Loader2 className="animate-spin w-8 h-8 text-primary opacity-50" /></div>
        ) : routes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-black/5 dark:bg-white/5 rounded-[3rem] border border-dashed border-border dark:border-white/10">
            <p className="text-sm font-bold text-text-sub dark:text-text-sub-dark leading-relaxed">자주 가는 경로를 추가해 보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {routes.map(r => (
              <div 
                key={r.id} 
                onClick={() => onGoLive(r)} 
                className="relative group p-6 bg-white dark:bg-[#1a1b22] border border-border dark:border-white/5 rounded-[2.2rem] shadow-sm hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-xl font-black mb-1 truncate">{r.name}</h3>
                    <div className="flex items-center text-[11px] font-bold text-text-sub dark:text-text-sub-dark">
                      {r.start_point.nickname} ➔ {r.end_point.nickname}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteRoute(e, r.id)}
                    className="p-2.5 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl active:scale-90 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* 요약 뱃지 */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                   {r.path_info.subPath.filter((sp:any) => sp.trafficType !== 3).map((sp:any, idx:number) => (
                      <div key={idx} className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-black ${
                        sp.trafficType === 1 ? 'bg-[#AF52DE]/10 text-[#AF52DE]' : 'bg-[#34C759]/10 text-[#34C759]'
                      }`}>
                        {sp.trafficType === 1 ? <TrainFront size={10} className="mr-1" /> : <Bus size={10} className="mr-1" />}
                        {sp.trafficType === 1 ? sp.lane[0].name.replace('수도권 ', '') : sp.lane[0].busNo}
                      </div>
                   ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-primary tracking-tighter">{r.path_info.info.totalTime}</span>
                    <span className="text-xs font-black opacity-30">MINS</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
