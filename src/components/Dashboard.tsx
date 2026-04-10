import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, Plus, Trash2, ChevronRight, TrainFront, Bus, Loader2 } from 'lucide-react'

export default function Dashboard({ session, onGoSearch, onGoLive, onRequestAuth }: {
  session: any
  onGoSearch: () => void
  onGoLive: (route: any) => void
  onRequestAuth: () => void
}) {
  const [routes, setRoutes] = useState<any[]>([])
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

  useEffect(() => { fetchRoutes() }, [session])

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] pt-12 p-5 pb-20 flex flex-col">

      {/* 헤더 */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-[#7EE787] bg-clip-text text-transparent">MyRoute</h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            {session
              ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />{session.user.email?.split('@')[0]}</span>
              : 'The Lightest Transit Companion'}
          </p>
        </div>
        {session ? (
          <button onClick={() => supabase.auth.signOut()} className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-all">
            <LogOut size={18} className="text-gray-400" />
          </button>
        ) : (
          <button onClick={onRequestAuth} className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all">
            로그인
          </button>
        )}
      </div>

      {/* 새 경로 조립 */}
      <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
        <h2 className="text-lg font-black mb-1">어디로 가시나요?</h2>
        <p className="text-xs text-gray-400 mb-4">나만의 경로를 저장하고 실시간 정보를 확인하세요</p>
        <button
          onClick={onGoSearch}
          className="w-full py-3.5 bg-primary text-white font-black rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={18} /> 새 경로 조립
        </button>
      </div>

      {/* 즐겨찾기 목록 */}
      <div className="flex-1">
        <h2 className="text-base font-black mb-4 text-gray-500 uppercase tracking-wider">즐겨찾기</h2>

        {!session ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
            <p className="text-sm text-gray-400 mb-3">경로를 저장하려면 로그인이 필요합니다</p>
            <button onClick={onRequestAuth} className="text-primary font-bold text-sm">로그인하기 →</button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
        ) : routes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
            <p className="text-sm text-gray-400">아직 저장된 경로가 없습니다<br />위에서 새 경로를 추가해보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map(r => {
              const subPaths = r.path_info?.subPath || []
              const transitPaths = subPaths.filter((sp: any) => sp.trafficType !== 3)
              const totalMins = r.path_info?.info?.totalTime ?? 0

              return (
                <div
                  key={r.id}
                  onClick={() => onGoLive(r)}
                  className="relative p-5 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:border-primary/40 hover:shadow-md cursor-pointer transition-all"
                >
                  {/* 경로 이름 + 삭제 */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                      <h3 className="font-black text-base leading-tight truncate">{r.route_name || r.name || '이름 없음'}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.start_place || r.start_point?.nickname || r.start_point?.stationName || ''} → {r.end_place || r.end_point?.nickname || r.end_point?.stationName || ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, r.id)}
                      className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* 노선 뱃지 */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {transitPaths.map((sp: any, idx: number) => (
                      <span key={idx} className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        sp.trafficType === 1
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      }`}>
                        {sp.trafficType === 1 ? <TrainFront size={10} /> : <Bus size={10} />}
                        {sp.trafficType === 1
                          ? sp.lane?.[0]?.name?.replace('수도권 ', '') || '지하철'
                          : (sp.lane?.[0]?.busNo || '버스') + '번'}
                      </span>
                    ))}
                  </div>

                  {/* 소요시간 + 화살표 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-primary tracking-tight">{totalMins}</span>
                      <span className="text-xs font-semibold text-gray-400">분</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
