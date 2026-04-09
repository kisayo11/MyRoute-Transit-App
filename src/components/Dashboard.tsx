import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Navigation, Trash2, MapPin, Clock, ChevronRight } from 'lucide-react'

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
        <p className="text-sm font-bold opacity-60 mb-8 leading-relaxed">복잡한 지도 대신<br/>나만의 커스텀 경로를 조립하세요.</p>
        <button 
          onClick={onGoSearch}
          className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center text-lg"
        >
          <SearchIcon className="w-5 h-5 mr-2" /> 새 경로 조립하기
        </button>
      </div>
      
      <div className="mt-2 flex-1 flex flex-col">
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-xl font-black tracking-tight">내 즐겨찾기</h2>
          {session && <span className="text-xs font-bold opacity-30">{routes.length} SAVED</span>}
        </div>
        
        {!session ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-border dark:border-white/10">
            <p className="text-sm font-bold text-text-sub dark:text-text-sub-dark mb-6 leading-relaxed">로그인하고 즐겨찾는<br/>출퇴근 경로를 저장해 보세요.</p>
            <button onClick={onRequestAuth} className="text-primary font-black text-sm px-6 py-3 bg-primary/10 rounded-2xl hover:bg-primary/20 transition-all">10초만에 가입하기 →</button>
          </div>
        ) : loading ? (
           <div className="flex justify-center p-14"><Loader2 className="animate-spin w-8 h-8 text-primary opacity-50" /></div>
        ) : routes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-black/5 dark:bg-white/5 rounded-[3rem] border border-dashed border-border dark:border-white/10">
            <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-sm">
               <Plus className="text-text-sub opacity-30" />
            </div>
            <p className="text-sm font-bold text-text-sub dark:text-text-sub-dark leading-relaxed">아직 저장된 경로가 없어요.<br/><span className="text-primary/60">"새 경로 조립"</span> 버튼을 눌러보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-5">
            {routes.map(r => (
              <div 
                key={r.id} 
                onClick={() => onGoLive(r)} 
                className="relative group p-7 bg-white dark:bg-[#1a1b22] border border-border dark:border-white/5 rounded-[2.5rem] shadow-[0_4px_25px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] hover:border-primary/40 transition-all cursor-pointer overflow-hidden active:scale-[0.98]"
              >
                {/* 배경 장식 */}
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1 pr-6">
                    <h3 className="text-xl font-black mb-1 truncate tracking-tight">{r.name}</h3>
                    <div className="flex items-center text-[12px] font-bold text-text-sub dark:text-text-sub-dark opacity-80">
                      <MapPin size={12} className="mr-1 text-primary" />
                      {r.start_point.nickname || r.start_point.stationName}
                      {r.start_point.nickname && r.start_point.nickname !== r.start_point.stationName && ` (${r.start_point.stationName})`}
                      <span className="mx-2 opacity-30">➔</span>
                      {r.end_point.nickname || r.end_point.stationName}
                      {r.end_point.nickname && r.end_point.nickname !== r.end_point.stationName && ` (${r.end_point.stationName})`}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteRoute(e, r.id)}
                    className="p-2 text-text-sub opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-primary tracking-tighter">{r.path_info.info.totalTime}</span>
                    <span className="text-xs font-black text-text-sub opacity-50 uppercase">mins</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center text-[11px] font-black bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-xl uppercase tracking-wider text-text-sub dark:text-text-sub-dark">
                      <Clock size={12} className="mr-1.5" /> 환승 {r.path_info.info.transitCount}회
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                       <ChevronRight size={18} />
                    </div>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function Loader2({ className, size=24 }: { className?: string, size?: number }) {
  return (
    <div className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
        <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
