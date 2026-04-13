import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Navigation, MapPin, Loader2, TrainFront, CheckCircle2, ChevronRight, Bus, RefreshCw, AlertCircle, Clock } from 'lucide-react'
import { getRealtimeSubway, getRealtimeBus } from '../lib/realtime'
import { type SubwayArrival, type BusArrival } from '../types'

export default function LiveRoute({ route, onBack }: { route: Route, onBack: () => void }) {
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const subPaths = useMemo(() => (route.path_info as any)?.subPath || [], [route.path_info])
  const totalMins = useMemo(() => (route.path_info as any)?.info?.totalTime ?? 0, [route.path_info])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const results: Record<string, any> = {}

    for (const path of (subPaths as any[])) {
      if (path.trafficType === 1) {
        // 지하철
        const key = `subway_${path.startName}`
        results[key] = await getRealtimeSubway(path.startName)
      } else if (path.trafficType === 2) {
        // 버스
        const arsId = path.startArsID ? String(path.startArsID) : ''
        const stId = (path.startLocalStationID || path.startID) ? String(path.startLocalStationID || path.startID) : ''
        
        if (arsId || stId) {
          const mainId = arsId || stId
          const key = `bus_${mainId}`
          results[key] = await getRealtimeBus(arsId, stId)
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
            ) : (() => {
              // wayCode: 1(상행/내선), 2(하행/외선)
              const wantUp = path.wayCode === 1;
              const wantDown = path.wayCode === 2;
              
              // ODSay 호선 코드 -> 서울시 subwayId 매핑
              const codeToId: Record<number, string> = {
                1: '1001', 2: '1002', 3: '1003', 4: '1004', 5: '1005',
                6: '1006', 7: '1007', 8: '1008', 9: '1009',
                104: '1063', 108: '1065', 109: '1077', 116: '1075', 113: '1092'
              };
              
              // 텍스트 매치로 호선 ID 보험 삼기
              const fallbackLineMatch = lineName.match(/(\d+)호선/);
              const fallbackCode = fallbackLineMatch ? Number(fallbackLineMatch[1]) : 0;
              const rawSubwayCode = path.lane?.[0]?.subwayCode || fallbackCode;
              const mySubwayId = rawSubwayCode ? codeToId[rawSubwayCode] : '';

              const filtered = result.data.filter((a: SubwayArrival) => {
                // 환승역에서 다른 호선 열차 필터링 완전 차단
                if (mySubwayId && a.subwayId && String(a.subwayId) !== String(mySubwayId)) return false;
                
                const isLine2 = a.subwayId === '1002'; // 서울시 2호선 ID

                if (wantUp) {
                  // ODSay 1(상행) -> 2호선은 숫자 감소 방향(213->212) = 외선/상행
                  if (isLine2 && (a.updnLine === '외선' || a.updnLine === '상행')) return true;
                  if (!isLine2 && (a.updnLine === '상행' || a.updnLine === '내선')) return true;
                }
                if (wantDown) {
                  // ODSay 2(하행) -> 2호선은 숫자 증가 방향(213->216) = 내선/하행
                  if (isLine2 && (a.updnLine === '내선' || a.updnLine === '하행')) return true;
                  if (!isLine2 && (a.updnLine === '하행' || a.updnLine === '외선')) return true;
                }
                
                // wayCode가 DB에 없어서 판별이 안 되는 경우만 통과시킴
                if (!path.wayCode) return true; 

                return false;
              });

              return (
                <>
                  {filtered.length === 0 ? (
                    <p className="text-xs text-gray-400">현재 해당 방향 도착 예정 열차 없음 (필터 차단됨)</p>
                  ) : (
                    filtered.slice(0, 2).map((a: SubwayArrival, i: number) => (
                      <div key={i} className={`flex justify-between items-center ${i > 0 ? 'mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/30' : ''}`}>
                        <span className="text-xs text-gray-500 truncate pr-2">{a.trainLineNm}</span>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">{a.arvlMsg2}</span>
                      </div>
                    ))
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )
    }

    // 버스
    if (path.trafficType === 2) {
      const stId = path.startArsID || path.startLocalStationID || path.startID
      const key = `bus_${stId}`
      const result = realtimeData[key]
      const busNo = path.lane?.[0]?.busNo || '버스'
      const myBus = result?.ok ? result.data.filter((a: BusArrival) => a.rtNm === busNo) : []
      
      // 배차 및 정보 센스 있게 가공
      const interval = path.busInterval || (result?.ok ? result.data[0]?.interval : null)
      const isCentral = path.busOnlyCentralLane === 1
      const lastBus = path.busLastTime

      return (
        <div key={idx} className="relative pb-10 pl-12">
          <div className="absolute w-4 h-4 bg-white dark:bg-background-dark border-4 border-success rounded-full -left-[32px] top-1 z-10" />
          <div className="absolute w-px h-full bg-success/20 -left-[25px] top-4" />

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-success/10 rounded-xl">
                <Bus size={18} className="text-success" />
              </div>
              <h4 className="font-extrabold text-xl text-text-main dark:text-text-main-dark">{path.startName}</h4>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className="px-2.5 py-1 text-[11px] font-black premium-gradient text-white rounded-lg shadow-sm">{busNo}번</span>
            {isCentral && (
              <span className="px-2 py-1 text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg">중앙차로</span>
            )}
            {interval && (
              <span className="px-2 py-1 text-[10px] font-black bg-gray-500/10 text-text-sub dark:text-text-sub-dark border border-gray-500/10 rounded-lg">배차 {interval}분</span>
            )}
            {lastBus && (
              <span className="px-2 py-1 text-[10px] font-black bg-danger/10 text-danger border border-danger/20 rounded-lg">막차 {lastBus}</span>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
            {!isActive ? (
              <p className="text-xs text-text-sub font-bold">GO LIVE를 누르면 실시간 위치를 추적합니다</p>
            ) : !result ? (
              <div className="flex items-center gap-2 text-xs font-bold text-text-sub animate-pulse"><RefreshCw size={12} className="animate-spin" /> 버스 위치 탐색 중...</div>
            ) : !result.ok ? (
              <div className="flex items-center gap-2 text-xs font-bold text-danger"><AlertCircle size={12} /> {result.error}</div>
            ) : myBus.length === 0 ? (
              <p className="text-xs text-text-sub font-bold">현재 운행 중인 {busNo}번 버스가 없습니다</p>
            ) : (
              myBus.slice(0, 2).map((a: BusArrival, i: number) => (
                <div key={i} className={`flex justify-between items-center ${i > 0 ? 'mt-3 pt-3 border-t border-white/5' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-text-sub dark:text-text-sub-dark opacity-40 mb-0.5">Destination</span>
                    <span className="text-xs font-black text-text-sub dark:text-text-sub-dark">{a.adirection} 방향</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${a.arrmsg1.includes('전') ? 'text-danger' : 'text-success'}`}>{a.arrmsg1}</span>
                  </div>
                </div>
              ))
            )}
            {/* 배경 패턴 (프리미엄 감성) */}
            <div className="absolute top-0 right-0 p-1 opacity-[0.03] pointer-events-none">
              <Bus size={60} strokeWidth={1} />
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-12 p-5 pb-24 flex flex-col">

      {/* 상단 네비 */}
      <button onClick={onBack} className="mb-8 w-fit flex items-center gap-2 px-4 py-2 glass-card glass-card-hover rounded-2xl text-xs font-black text-text-sub dark:text-text-sub-dark uppercase tracking-widest">
        <ArrowLeft size={14} strokeWidth={3} /> Dashboard
      </button>

      {/* 헤더 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-3xl font-black tracking-tighter text-text-main dark:text-text-main-dark">
            {route.route_name || route.name || '이름 없는 경로'}
          </h2>
          {isActive && <span className="live-pulse mt-1" />}
        </div>
        
        <div className="flex items-center gap-2 text-text-sub dark:text-text-sub-dark">
          <span className="text-sm font-bold">{route.start_place || route.start_point?.nickname || '시작'}</span>
          <ChevronRight size={14} className="opacity-30" />
          <span className="text-sm font-bold">{route.end_place || route.end_point?.nickname || '종료'}</span>
        </div>
      </div>

      {/* 실시간 요약 카드 */}
      <div className="mb-10 p-1 glass-card rounded-[2.5rem] overflow-hidden">
        <div className="p-8 premium-gradient text-white relative">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black tracking-tighter">{totalMins}</span>
                <span className="text-xl font-bold opacity-70 tracking-tighter uppercase">Min</span>
              </div>
              <p className="text-xs font-bold opacity-80 mt-1 uppercase tracking-widest flex items-center gap-2">
                Total Journey Time
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                {route.path_info?.info?.transitCount || 0} Transits
              </span>
              {lastUpdated && (
                <p className="text-[10px] font-bold opacity-60">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          {/* 장식용 패턴 */}
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Navigation size={120} strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="mb-12">
        {!isActive ? (
          <button
            onClick={() => setIsActive(true)}
            className="w-full py-5 premium-gradient text-white font-black text-lg rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(170,59,255,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(170,59,255,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Navigation size={18} fill="currentColor" />
            </div>
            GO LIVE — 관제 시작
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="flex-1 py-4 glass-card glass-card-hover rounded-2xl flex items-center justify-center gap-2 text-sm font-black disabled:opacity-40 transition-all uppercase tracking-widest"
            >
              {loading ? <RefreshCw size={16} className="animate-spin text-primary" /> : <RefreshCw size={16} className="text-primary" />}
              Refresh
            </button>
            <button
              onClick={() => setIsActive(false)}
              className="px-6 py-4 glass-card hover:bg-danger/10 hover:text-danger rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* 여정 타임라인 */}
      <div className="flex-1">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-sub dark:text-text-sub-dark opacity-40 mb-8 pl-1">Real-time Timeline</h3>
        
        <div className="relative">
          {/* 출발점 */}
          <div className="relative pb-10 pl-12">
            <div className="absolute w-8 h-8 premium-gradient rounded-full -left-[38px] top-0 shadow-lg shadow-primary/30 flex items-center justify-center">
              <MapPin size={16} className="text-white" />
            </div>
            <div className="absolute w-0.5 h-full bg-gradient-to-b from-primary to-primary/10 -left-[24px] top-9" />
            <h4 className="font-extrabold text-xl pt-0.5">Start: {route.start_place || route.start_point?.nickname || ''}</h4>
          </div>

          {/* 구간 세그먼트 */}
          <div className="relative">
            {(subPaths as any[]).map((path: any, i: number) => renderSegment(path, i))}
          </div>

          {/* 도착점 */}
          <div className="relative pl-12 pt-6">
            <div className="absolute w-8 h-8 bg-success rounded-full -left-[38px] top-6 shadow-lg shadow-success/30 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-white" />
            </div>
            <h4 className="font-extrabold text-2xl pt-6">Goal: {route.end_place || route.end_point?.nickname || ''}</h4>
            <p className="text-xs font-bold text-text-sub dark:text-text-sub-dark opacity-50 mt-2 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-success" /> Journey Completed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
