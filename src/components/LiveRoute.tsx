import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Navigation, MapPin, Loader2, TrainFront, CheckCircle2, ChevronRight, Bus, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { getRealtimeSubway, getRealtimeBus, type SubwayArrival, type BusArrival } from '../lib/realtime'

export default function LiveRoute({ route, onBack }: { route: any, onBack: () => void }) {
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const subPaths = route.path_info?.subPath || []
  const totalMins = route.path_info?.info?.totalTime ?? 0

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const results: Record<string, any> = {}

    for (const path of subPaths) {
      if (path.trafficType === 1) {
        // 지하철
        const key = `subway_${path.startName}`
        results[key] = await getRealtimeSubway(path.startName)
      } else if (path.trafficType === 2) {
        // 버스 — startID (9자리 ODsay 고유 ID) 우선 사용
        const stId = path.startID || path.startArsID
        if (stId) {
          const key = `bus_${stId}`
          results[key] = await getRealtimeBus(String(stId))
        }
      }
    }

    setRealtimeData(results)
    setLastUpdated(new Date())
    setLoading(false)
  }, [subPaths])

  useEffect(() => {
    if (!isActive) return
    fetchAll()
    const timer = setInterval(fetchAll, 20000) // 20초마다 갱신
    return () => clearInterval(timer)
  }, [isActive, fetchAll])

  const renderSegment = (path: any, idx: number) => {
    // 도보
    if (path.trafficType === 3) {
      if (!path.sectionTime || path.sectionTime === 0) return null
      return (
        <div key={idx} className="flex items-center gap-2 py-2 pl-12 text-xs font-semibold text-gray-400">
          <div className="absolute -left-[21px] w-2 h-2 bg-gray-300 rounded-full" />
          🚶 도보 {path.sectionTime}분 이동
        </div>
      )
    }

    // 지하철
    if (path.trafficType === 1) {
      const key = `subway_${path.startName}`
      const result = realtimeData[key]
      const fastDoor = path.door || path.fastTrainDoor
      const lineName = path.lane?.[0]?.name?.replace('수도권 ', '') || '지하철'

      return (
        <div key={idx} className="relative pb-8 pl-12">
          <div className="absolute w-4 h-4 bg-white dark:bg-[#16171d] border-4 border-purple-500 rounded-full -left-[32px] top-1 z-10" />
          <div className="absolute w-px h-full bg-purple-200 dark:bg-purple-900/40 -left-[25px] top-4" />

          <div className="flex items-center gap-2 mb-1">
            <TrainFront size={18} className="text-purple-500" />
            <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400">{path.startName} 탑승</h4>
          </div>

          <div className="flex gap-2 mb-3">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-md">{lineName}</span>
            {fastDoor && fastDoor !== 'null' && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-md">⚡ {fastDoor}번 칸</span>
            )}
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3 border border-purple-100 dark:border-purple-900/30">
            {!isActive ? (
              <p className="text-xs text-gray-400">GO LIVE 버튼을 눌러 실시간 정보 확인</p>
            ) : !result ? (
              <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> 불러오는 중...</div>
            ) : !result.ok ? (
              <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle size={12} /> {result.error}</div>
            ) : result.data.length === 0 ? (
              <p className="text-xs text-gray-400">현재 도착 예정 열차 없음</p>
            ) : (
              result.data.slice(0, 2).map((a: SubwayArrival, i: number) => (
                <div key={i} className={`flex justify-between items-center ${i > 0 ? 'mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/30' : ''}`}>
                  <span className="text-xs text-gray-500 truncate pr-2">{a.trainLineNm}</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">{a.arvlMsg2}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    // 버스
    if (path.trafficType === 2) {
      const stId = path.startID || path.startArsID
      const key = `bus_${stId}`
      const result = realtimeData[key]
      const busNo = path.lane?.[0]?.busNo || '버스'
      const myBus = result?.ok ? result.data.filter((a: BusArrival) => a.rtNm === busNo) : []

      return (
        <div key={idx} className="relative pb-8 pl-12">
          <div className="absolute w-4 h-4 bg-white dark:bg-[#16171d] border-4 border-green-500 rounded-full -left-[32px] top-1 z-10" />
          <div className="absolute w-px h-full bg-green-200 dark:bg-green-900/40 -left-[25px] top-4" />

          <div className="flex items-center gap-2 mb-1">
            <Bus size={18} className="text-green-500" />
            <h4 className="font-bold text-lg text-green-600 dark:text-green-400">{path.startName}</h4>
          </div>

          <div className="flex gap-2 mb-3">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md font-mono">{busNo}번 버스</span>
          </div>

          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
            {!isActive ? (
              <p className="text-xs text-gray-400">GO LIVE 버튼을 눌러 실시간 정보 확인</p>
            ) : !result ? (
              <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 size={12} className="animate-spin" /> 불러오는 중...</div>
            ) : !result.ok ? (
              <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle size={12} /> {result.error}</div>
            ) : myBus.length === 0 ? (
              <p className="text-xs text-gray-400">이 정류소에서 {busNo}번 버스 정보 없음</p>
            ) : (
              myBus.slice(0, 2).map((a: BusArrival, i: number) => (
                <div key={i} className={`flex justify-between items-center ${i > 0 ? 'mt-2 pt-2 border-t border-green-100 dark:border-green-900/30' : ''}`}>
                  <span className="text-xs text-gray-500">{a.adirection} 방향</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{a.arrmsg1}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-8 p-5 pb-24 flex flex-col">

      {/* 상단 네비 */}
      <button onClick={onBack} className="mb-6 flex items-center text-sm text-gray-400 hover:text-primary transition-colors font-semibold">
        <ArrowLeft size={16} className="mr-1.5" /> 대시보드
      </button>

      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight flex items-center flex-wrap gap-2">
          {route.start_place}
          <ChevronRight size={18} className="text-gray-300" />
          {route.end_place}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-sm font-semibold text-gray-400">{route.route_name}</span>
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 동기화
            </span>
          )}
        </div>
      </div>

      {/* 총 소요시간 배너 */}
      <div className="mb-8 p-5 bg-primary/5 rounded-2xl border border-primary/20 flex items-baseline gap-2">
        <span className="text-5xl font-black text-primary tracking-tight">{totalMins}</span>
        <span className="text-sm font-bold text-gray-400">분 소요</span>
        <div className="ml-auto text-xs text-gray-400">
          환승 {(route.path_info?.info?.transitCount || 0)}회
        </div>
      </div>

      {/* GO LIVE 버튼 또는 갱신 버튼 */}
      {!isActive ? (
        <button
          onClick={() => setIsActive(true)}
          className="mb-8 w-full py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
        >
          <Navigation size={22} />
          GO LIVE — 실시간 정보 시작
        </button>
      ) : (
        <button
          onClick={fetchAll}
          disabled={loading}
          className="mb-8 w-full py-4 bg-black dark:bg-white text-white dark:text-black font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {loading ? '갱신 중...' : '실시간 정보 갱신'}
        </button>
      )}

      {/* 여정 타임라인 */}
      <div className="flex-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">REAL-TIME JOURNEY</h3>
        
        <div className="relative">
          {/* 출발점 */}
          <div className="relative pb-8 pl-12">
            <div className="absolute w-7 h-7 bg-primary rounded-full -left-[36px] top-0 shadow-lg shadow-primary/30 flex items-center justify-center">
              <MapPin size={14} className="text-white" />
            </div>
            <div className="absolute w-px h-full bg-gradient-to-b from-primary to-primary/20 -left-[23px] top-7" />
            <h4 className="font-bold text-lg pt-1">출발: {route.start_place}</h4>
          </div>

          {/* 구간 세그먼트 */}
          <div className="relative">
            {subPaths.map((path: any, i: number) => renderSegment(path, i))}
          </div>

          {/* 도착점 */}
          <div className="relative pl-12 pt-4">
            <div className="absolute w-8 h-8 bg-green-500 rounded-full -left-[36px] top-3 shadow-lg shadow-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-white" />
            </div>
            <h4 className="font-bold text-xl">도착: {route.end_place}</h4>
            <p className="text-xs text-gray-400 mt-1">총 {totalMins}분 여정 완료</p>
          </div>
        </div>
      </div>
    </div>
  )
}
