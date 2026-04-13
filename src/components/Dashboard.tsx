import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Trash2, Edit3, ChevronRight, TrainFront, Bus, Loader2, Zap } from 'lucide-react'
import { type Route } from '../types'

export default function Dashboard({ session, onGoSearch, onGoLive, onEdit, onRequestAuth }: {
  session: { user: { id: string, email?: string } } | null
  onGoSearch: () => void
  onGoLive: (route: Route) => void
  onEdit: (route: Route) => void
  onRequestAuth: () => void
}) {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRoutes = async () => {
    if (!session) return
    setLoading(true)
    const { data } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (data) setRoutes(data)
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('이 경로를 삭제할까요?')) return
    const { error } = await supabase.from('routes').delete().eq('id', id)
    if (!error) setRoutes(routes.filter(r => r.id !== id))
  }

  const handleEdit = (e: React.MouseEvent, route: any) => {
    e.stopPropagation()
    onEdit(route)
  }

  useEffect(() => { 
    if (session) fetchRoutes() 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] pt-12 p-5 pb-20 flex flex-col">

      {/* 헤더 */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-gradient leading-none">MyRoute</h1>
          <p className="text-[11px] text-text-sub dark:text-text-sub-dark mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
            {session ? (
              <><span className="live-pulse" /> {session.user.email?.split('@')[0]}님 환영합니다</>
            ) : (
              'The Lightest Transit Companion'
            )}
          </p>
        </div>
        {session ? (
          <button onClick={() => supabase.auth.signOut()} className="p-3 glass-card glass-card-hover rounded-2xl transition-all">
            <LogOut size={20} className="text-text-sub dark:text-text-sub-dark" />
          </button>
        ) : (
          <button onClick={onRequestAuth} className="px-6 py-2.5 premium-gradient text-white font-black rounded-2xl text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
            로그인
          </button>
        )}
      </div>

      {/* 새 경로 조립 */}
      <div className="mb-10 p-1 glass-card rounded-3xl overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
          <h2 className="text-xl font-black mb-1">어디로 가시나요?</h2>
          <p className="text-[13px] text-text-sub dark:text-text-sub-dark mb-5 font-medium">나만의 경로를 저장하고 실시간 정보를 센스 있게 확인하세요</p>
          <button
            onClick={onGoSearch}
            className="w-full py-4 premium-gradient text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/30 hover:shadow-primary/40 active:scale-[0.98] transition-all"
          >
            <Plus size={20} strokeWidth={3} /> 새 경로 조립
          </button>
        </div>
      </div>

      {/* 스마트 브리핑 (Aljjakkalttaksen) */}
      <div className="mb-10 animate-float">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 bg-accent/5 border-accent/10">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
            <Zap size={20} strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-0.5">Smart Insight</p>
            <p className="text-xs font-bold text-text-main dark:text-text-main-dark leading-snug">
              {new Date().getHours() < 10 ? '오늘 아침은 쾌청합니다. 140번 버스 정체가 없으니 평소처럼 출발하세요!' : 
               new Date().getHours() > 18 ? '퇴근길 지하철 2호선 혼잡도가 높습니다. 조심히 귀가하세요!' :
               '실시간 교통 흐름이 원활합니다. MyRoute와 함께 기분 좋은 이동 되세요!'}
            </p>
          </div>
        </div>
      </div>

      {/* 즐겨찾기 목록 */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-black text-text-sub dark:text-text-sub-dark uppercase tracking-[0.2em]">즐겨찾는 경로</h2>
          {routes.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 glass-card rounded-full">{routes.length} ROUTES</span>}
        </div>

        {!session ? (
          <div className="text-center py-16 glass-card rounded-[2rem] border-dashed border-2 flex flex-col items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              <Plus size={24} />
            </div>
            <p className="text-sm text-text-sub dark:text-text-sub-dark mb-4 font-medium px-10">경로를 저장하고 실시간 정보를 받으려면 로그인이 필요합니다</p>
            <button onClick={onRequestAuth} className="text-primary font-black text-sm hover:underline underline-offset-4">로그인하기 →</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : routes.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-[2rem] border-dashed border-2">
            <p className="text-sm text-text-sub dark:text-text-sub-dark font-medium">아직 저장된 경로가 없습니다<br />위에서 나만의 첫 경로를 조립해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {routes.map(r => {
              const subPaths = r.path_info?.subPath || []
              const transitPaths = subPaths.filter((sp: Record<string, unknown>) => sp.trafficType !== 3)
              const totalMins = r.path_info?.info?.totalTime ?? 0

              return (
                <div
                  key={r.id}
                  onClick={() => onGoLive(r)}
                  className="group relative p-6 glass-card glass-card-hover rounded-[2rem] cursor-pointer"
                >
                  {/* 경로 이름 + 수정/삭제 */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-6">
                      <h3 className="font-extrabold text-lg leading-tight truncate group-hover:text-primary transition-colors pr-2">
                        {r.route_name || r.name || '이름 없음'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
                        <span className="text-[11px] text-text-sub dark:text-text-sub-dark font-bold whitespace-nowrap opacity-60">
                          {r.start_place || r.start_point?.nickname || r.start_point?.stationName || '출발'}
                        </span>
                        <ChevronRight size={10} className="text-text-sub/30 flex-shrink-0" />
                        <span className="text-[11px] text-text-sub dark:text-text-sub-dark font-bold whitespace-nowrap opacity-60">
                          {r.end_place || r.end_point?.nickname || r.end_point?.stationName || '도착'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleEdit(e, r)}
                        className="p-2 text-text-sub hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, r.id)}
                        className="p-2 text-text-sub hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 노선 정보 */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {transitPaths.map((sp: Record<string, unknown>, idx: number) => (
                          <div key={idx} className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg ${
                            sp.trafficType === 1
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-success/10 text-green-600 dark:text-green-400 border border-success/20'
                          }`}>
                            {sp.trafficType === 1 ? <TrainFront size={12} strokeWidth={2.5} /> : <Bus size={12} strokeWidth={2.5} />}
                            {sp.trafficType === 1
                              ? sp.lane?.[0]?.name?.replace('수도권 ', '') || 'Subway'
                              : (sp.lane?.[0]?.busNo || 'Bus') + '번'}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-1 group-hover:scale-110 transition-transform origin-right">
                      <span className="text-4xl font-black text-primary tracking-tighter">{totalMins}</span>
                      <span className="text-sm font-black text-text-sub dark:text-text-sub-dark opacity-50">MIN</span>
                    </div>
                  </div>

                  {/* 배경 오버레이 (Hover 효과 극대화) */}
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] rounded-[2rem] transition-colors pointer-events-none" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
