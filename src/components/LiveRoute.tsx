import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Navigation, MapPin, Loader2, TrainFront, CheckCircle2, ChevronRight, Bus, Repeat, AlertCircle } from 'lucide-react'
import { getRealtimeSubway, getRealtimeBus, type RealtimeResponse, type SubwayArrival, type BusArrival } from '../lib/realtime'

// 전문적인 스켈레톤 로더 컴포넌트
const Skeleton = () => (
  <div className="space-y-2 animate-pulse">
    <div className="h-14 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5" />
  </div>
)

export default function LiveRoute({ route, onBack }: { route: any, onBack: () => void }) {
  const [isActive, setIsActive] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [realtimeData, setRealtimeData] = useState<Record<string, RealtimeResponse<any>>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [gpsRequested, setGpsRequested] = useState(false)

  const subPaths = route.path_info.subPath || []
  const eta = route.path_info.info.totalTime

  const fetchAllRealtimeData = useCallback(async () => {
    setIsRefreshing(true)
    
    // 개별 API 호출을 병렬로 처리하여 속도 개선
    const promises = subPaths.map(async (path: any) => {
      if (path.trafficType === 1) {
        const key = `subway_${path.startName}`
        const result = await getRealtimeSubway(path.startName)
        return { key, result }
      } else if (path.trafficType === 2) {
        // 버스는 9자리 고유 ID(startID)를 사용해야 국가 공공데이터 포털에서 찾을 수 있음
        const key = `bus_${path.startID || path.startArsID}`
        const result = await getRealtimeBus(path.startID || path.startArsID)
        return { key, result }
      }
      return null
    })

    const results = await Promise.all(promises)
    
    setRealtimeData(prev => {
      const next = { ...prev }
      results.forEach(res => {
        if (res) next[res.key] = res.result
      })
      return next
    })

    setLastUpdated(new Date())
    setTimeout(() => setIsRefreshing(false), 800)
  }, [subPaths])

  useEffect(() => {
    if (isActive) {
      fetchAllRealtimeData()
      const timer = setInterval(fetchAllRealtimeData, 15000)
      return () => clearInterval(timer)
    }
  }, [isActive, fetchAllRealtimeData])

  const handleStart = () => {
    if (!gpsRequested && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => console.log('GPS OK'),
        () => console.log('GPS Denied'),
        { timeout: 5000 }
      )
      setGpsRequested(true)
    }
    setIsActive(true)
  }

  // 전문적인 세그먼트 렌더링 엔진
  const renderSegment = (path: any, index: number) => {
    const isLast = index === subPaths.length - 1

    // 지하철 구간
    if (path.trafficType === 1) {
      const resp = realtimeData[`subway_${path.startName}`]
      const fastDoor = path.door || path.fastTrainDoor
      
      return (
        <div key={index} className="relative pb-10 pl-12 group">
          <div className="absolute w-4 h-4 bg-white dark:bg-background-dark border-4 border-[#AF52DE] rounded-full -left-[32px] top-1.5 z-10" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-[#AF52DE]/20'} -left-[25px] top-4`} />
          
          <h4 className="font-extrabold text-xl flex items-center mb-1 text-[#AF52DE]">
            <TrainFront size={22} className="mr-3"/>
            {path.startName} 탑승
          </h4>
          
          <div className="flex items-center space-x-2 mb-3">
             <span className="text-[10px] font-black px-2 py-0.5 bg-[#AF52DE]/10 text-[#AF52DE] rounded border border-[#AF52DE]/20 uppercase">
               {path.lane[0].name.replace('수도권 ', '')}
             </span>
             {fastDoor && fastDoor !== 'null' && (
                <span className="text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                  ⚡ {fastDoor}번 칸
                </span>
             )}
          </div>

          <div className="space-y-2">
            {!resp ? (
              <Skeleton />
            ) : !resp.success ? (
              <div className="flex items-center text-[10px] font-bold text-red-500/60 italic bg-red-500/5 p-2 rounded-xl">
                <AlertCircle size={12} className="mr-1" /> {resp.error || '정보 점검 중'}
              </div>
            ) : resp.data.length > 0 ? (
              resp.data.slice(0, 1).map((arrival: SubwayArrival, i: number) => (
                <div key={i} className="bg-[#AF52DE]/5 p-4 rounded-2xl border border-[#AF52DE]/10 transition-all hover:bg-[#AF52DE]/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black opacity-40 truncate pr-4">{arrival.trainLineNm}</span>
                    <span className="text-[14px] font-black">{arrival.arvlMsg2}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] font-bold opacity-30 italic px-1">실시간 도착 예정이 없습니다.</p>
            )}
          </div>
        </div>
      )
    }

    // 버스 구간
    if (path.trafficType === 2) {
      const resp = realtimeData[`bus_${path.startID || path.startArsID}`]
      const busNo = path.lane[0].busNo
      const myBusArrivals = resp?.success ? resp.data.filter((a: BusArrival) => a.rtNm === busNo) : []

      return (
        <div key={index} className="relative pb-10 pl-12 group">
          <div className="absolute w-4 h-4 bg-white dark:bg-background-dark border-4 border-[#34C759] rounded-full -left-[32px] top-1.5 z-10" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-[#34C759]/20'} -left-[25px] top-4`} />

          <h4 className="font-extrabold text-xl flex items-center mb-1 text-[#34C759]">
            <Bus size={22} className="mr-3"/>
            {path.startName}
          </h4>

          <div className="flex items-center space-x-2 mb-3">
            <span className="text-[10px] font-black px-2 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded border border-[#34C759]/20 font-mono">
              {busNo}번 버스
            </span>
          </div>

          <div className="space-y-2">
            {!resp ? (
              <Skeleton />
            ) : !resp.success ? (
              <div className="flex items-center text-[10px] font-bold text-red-500/60 italic bg-red-500/5 p-2 rounded-xl">
                <AlertCircle size={12} className="mr-1" /> {resp.error || '정보 점검 중'}
              </div>
            ) : myBusArrivals.length > 0 ? (
              myBusArrivals.slice(0, 1).map((arrival: BusArrival, i: number) => (
                <div key={i} className="bg-[#34C759]/5 p-4 rounded-2xl border border-[#34C759]/10 transition-all hover:bg-[#34C759]/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black opacity-40 uppercase tracking-widest">실시간</span>
                    <span className="text-[14px] font-black">{arrival.arrmsg1}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] font-bold opacity-30 italic px-1">정보 없음</p>
            )}
          </div>
        </div>
      )
    }

    // 도보 구간
    if (path.trafficType === 3 && path.sectionTime > 0) {
      return (
        <div key={index} className="relative pb-8 pl-12 group opacity-40">
          <div className="absolute w-2.5 h-2.5 bg-gray-400 rounded-full -left-[25px] top-2 z-10 border-2 border-white dark:border-background-dark" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-border/20'} -left-[21px] top-4`} />
          <p className="text-[11px] font-black uppercase tracking-tighter">도보 {path.sectionTime}분 이동</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-8 p-6 flex flex-col pb-24 relative overflow-hidden transition-colors duration-500">
      
      {/* 고품격 백그라운드 효과 */}
      <div className={`absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-primary/20 blur-[150px] rounded-full transition-all duration-1000 ${isActive ? 'scale-110 opacity-100' : 'opacity-0'}`} />
      <div className={`absolute -bottom-40 -left-40 w-[30rem] h-[30rem] bg-[#7EE787]/20 blur-[150px] rounded-full transition-all duration-1000 delay-500 ${isActive ? 'scale-110 opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 flex-1 flex flex-col">
        <button onClick={onBack} className="mb-8 flex items-center text-text-sub dark:text-text-sub-dark px-2 font-black text-xs hover:text-primary transition-all group tracking-[0.1em]">
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> DASHBOARD
        </button>

        <div className="mb-12 px-2">
          <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4 opacity-70">
            Professional Transit Guide
          </div>
          <h2 className="text-3xl font-black mb-3 tracking-tighter flex items-center flex-wrap leading-[1.1]">
            {route.start_point.nickname || route.start_point.stationName}
            <ChevronRight size={22} className="mx-3 text-primary opacity-30" />
            {route.end_point.nickname || route.end_point.stationName}
          </h2>
          <div className="flex items-center mt-4 space-x-4">
             <span className="px-3.5 py-1.5 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-black opacity-60 uppercase tracking-tighter border border-black/5 dark:border-white/5">
               {route.name}
             </span>
             {lastUpdated && (
                <div className="flex items-center text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isRefreshing ? 'bg-primary animate-ping' : 'bg-primary'}`} />
                  SYNC: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
             )}
          </div>
        </div>

        {!isActive ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[4.5rem] border border-white/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-1000 pointer-events-none" />
            <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mb-10 relative">
              <Navigation className="text-primary w-14 h-14 ml-1.5" />
              <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-20" />
              <div className="absolute -inset-4 rounded-full border border-primary/10 animate-pulse" />
            </div>
            <button 
              onClick={handleStart}
              className="px-16 py-7 bg-primary text-white font-black rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(var(--primary),0.5)] hover:scale-105 active:scale-95 transition-all text-2xl tracking-tighter"
            >
              GO LIVE
            </button>
            <p className="mt-12 text-[10px] font-black opacity-40 tracking-[0.3em] uppercase text-center leading-loose">
              탭하여 전체 정거장 타임라인과<br/>실시간 도착 데이터를 활성화하세요
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-1000 flex-1 flex flex-col pb-6">
            
            {/* 상단 메인 대시보드 */}
            <div className="relative mb-14 py-12 bg-white/70 dark:bg-white/5 backdrop-blur-3xl rounded-[4rem] border border-white/30 shadow-2xl overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-primary/15 blur-[100px] -mr-16 -mt-16" />
               <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#34C759]/10 blur-[100px] -ml-16 -mb-16" />
               <div className="text-center relative z-10">
                  <div className="flex items-center justify-center mb-2">
                     <span className="text-[7rem] font-black text-text-main dark:text-text-main-dark tracking-[-0.08em] leading-none">{eta}</span>
                     <div className="flex flex-col ml-4 text-left">
                        <span className="text-2xl font-black text-primary leading-none">MINS</span>
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em] mt-2">To Destination</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-center mt-10 space-x-10">
                     <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Transfers</span>
                        <span className="text-lg font-black">{route.path_info.info.transitCount}차례</span>
                     </div>
                     <div className="w-px h-10 bg-black/5 dark:bg-white/10" />
                     <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Distance</span>
                        <span className="text-lg font-black">{(route.path_info.info.distance / 1000).toFixed(1)}km</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* 메인 여정 타임라인 */}
            <div className="flex-1 bg-white/30 dark:bg-white/5 rounded-[3.5rem] p-10 pb-16 border border-white/20 shadow-xl mb-10 relative overflow-hidden">
               <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
               <div className="flex items-center mb-12 relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-50">Real-time Journey</h3>
                  <div className="flex-1 h-px bg-black/5 dark:bg-white/10 ml-6" />
               </div>
               
               <div className="timeline-container relative z-10">
                  {/* 시작점 */}
                  <div className="relative pb-10 pl-12 group">
                    <div className="absolute w-7 h-7 bg-primary rounded-full -left-[36px] top-0 shadow-xl shadow-primary/30 flex items-center justify-center ring-4 ring-white dark:ring-background-dark">
                       <MapPin size={14} className="text-white" />
                    </div>
                    <div className="absolute w-0.5 h-full bg-gradient-to-b from-primary to-primary/20 -left-[23.5px] top-7" />
                    <h4 className="font-extrabold text-xl tracking-tighter leading-none pt-1">출발: {route.start_point.nickname || route.start_point.stationName}</h4>
                  </div>

                  {/* 자동 조립 세그먼트 */}
                  {subPaths.map((path: any, i: number) => renderSegment(path, i))}

                  {/* 도착점 */}
                  <div className="relative pl-12 group pt-4">
                    <div className="absolute w-9 h-9 bg-[#34C759] rounded-full -left-[37px] -top-1 shadow-xl shadow-[#34C759]/30 flex items-center justify-center ring-4 ring-white dark:ring-background-dark">
                       <CheckCircle2 size={22} className="text-white" />
                    </div>
                    <h4 className="font-extrabold text-2xl tracking-tighter leading-none">도착: {route.end_point.nickname || route.end_point.stationName}</h4>
                    <p className="text-[10px] font-bold opacity-30 mt-3 uppercase tracking-widest leading-relaxed">
                      CUSTOM ROUTE ASSEMBLED<br/>TOTAL {route.path_info.info.totalTime}MINS JOURNEY COMPLETE
                    </p>
                  </div>
               </div>
            </div>

            {/* 하단 인터랙티브 보드 */}
            <div className="grid grid-cols-6 gap-4 sticky bottom-0 pb-8 bg-gradient-to-t from-background dark:from-background-dark via-background/95 to-transparent pt-6 px-1">
              <button 
                onClick={fetchAllRealtimeData}
                disabled={isRefreshing}
                className="col-span-5 h-16 bg-black dark:bg-white text-white dark:text-black rounded-3xl shadow-2xl text-[1.1rem] font-black flex justify-center items-center active:scale-95 transition-all disabled:opacity-40 group relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-primary/20 transition-all duration-1000 ${isRefreshing ? 'translate-x-[100%]' : '-translate-x-[100%]'}`} />
                <span className="relative flex items-center">
                  {isRefreshing ? <Loader2 size={18} className="animate-spin mr-3" /> : <Repeat size={18} className="mr-3 group-hover:rotate-180 transition-transform duration-500" />}
                  {isRefreshing ? '데이터 전송로 동기화 중...' : '실시간 정보 즉시 갱신'}
                </span>
              </button>
              <button 
                onClick={() => alert('Premium Transit Guide - Implementation V0.1.3 Stable')}
                className="col-span-1 h-16 bg-white/50 dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-3xl flex items-center justify-center hover:bg-white/80 dark:hover:bg-white/20 active:scale-90 transition-all shadow-md"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
