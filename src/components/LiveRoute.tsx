import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Navigation, MapPin, Loader2, TrainFront, PersonStanding, CheckCircle2, Info, ChevronRight, Bus, Repeat } from 'lucide-react'
import { getRealtimeSubway, getRealtimeBus } from '../lib/realtime'

export default function LiveRoute({ route, onBack }: { route: any, onBack: () => void }) {
  const [isActive, setIsActive] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [eta, setEta] = useState(route.path_info.info.totalTime)
  const [gpsRequested, setGpsRequested] = useState(false)
  
  // 모든 구간의 실시간 데이터를 통합 관리
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({})
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const subPaths = route.path_info.subPath || []

  const fetchAllRealtimeData = async () => {
    setIsRefreshing(true)
    const newData: Record<string, any> = {}

    // 모든 대중교통 구간을 순회하며 실시간 정보 요청
    for (const path of subPaths) {
      if (path.trafficType === 1) { // 지하철
        const data = await getRealtimeSubway(path.startName)
        if (data) newData[`subway_${path.startName}`] = data
      } else if (path.trafficType === 2) { // 버스
        const data = await getRealtimeBus(path.startArsID)
        if (data) newData[`bus_${path.startArsID}`] = data
      }
    }

    setRealtimeData(newData)
    setLastUpdated(new Date())
    setTimeout(() => setIsRefreshing(false), 800)
  }

  useEffect(() => {
    if (isActive) {
      fetchAllRealtimeData()
      const timer = setInterval(fetchAllRealtimeData, 15000) // 15초마다 갱신
      return () => clearInterval(timer)
    }
  }, [isActive])

  const handleStart = () => {
    if (!gpsRequested) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => { console.log('GPS 퍼미션 허용됨') },
          () => { console.log('GPS 퍼미션 거부됨') },
          { timeout: 5000 }
        )
      }
      setGpsRequested(true)
    }
    setIsActive(true)
  }

  // 각 세그먼트별 렌더링 함수
  const renderSegment = (path: any, index: number) => {
    const isLast = index === subPaths.length - 1

    // 1. 지하철 세그먼트
    if (path.trafficType === 1) {
      const arrivals = realtimeData[`subway_${path.startName}`] || []
      const fastDoor = path.door || path.fastTrainDoor // ODsay 데이터에서 추출
      
      return (
        <div key={index} className="relative pb-12 pl-12 group">
          <div className="absolute w-4 h-4 bg-white dark:bg-background-dark border-4 border-primary rounded-full -left-[32px] top-1.5 z-10" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-primary/20'} -left-[25px] top-4`} />
          
          <h4 className="font-exrabold text-xl flex items-center mb-1 group-hover:text-primary transition-colors">
            <TrainFront size={22} className="mr-3 text-primary animate-pulse"/>
            {path.startName} 탑승
          </h4>
          
          <div className="flex items-center space-x-2 mb-4">
             <span className="text-[11px] font-black px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
               {path.lane[0].name} ({path.lane[0].subwayCity})
             </span>
             {fastDoor && (
                <span className="text-[11px] font-black px-2.5 py-1 bg-[#7EE787]/10 text-[#54CC63] rounded-lg border border-[#7EE787]/20 flex items-center">
                  ⚡ 빠른환승: {fastDoor}번 칸
                </span>
             )}
          </div>

          <div className="space-y-2.5">
            {arrivals.length > 0 ? (
              arrivals.slice(0, 2).map((arrival: any, i: number) => (
                <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-border dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black opacity-40 uppercase truncate max-w-[150px]">{arrival.trainLineNm}</span>
                    <span className="text-[15px] font-black text-primary">{arrival.arvlMsg2}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold opacity-30 italic pl-1">실시간 정보 조회 중...</p>
            )}
          </div>
          
          <div className="mt-4 flex items-center text-[13px] font-bold text-text-sub dark:text-text-sub-dark bg-black/5 dark:bg-white/5 w-fit px-4 py-1.5 rounded-full">
            <Navigation size={12} className="mr-2" />
            {path.stationCount}개 역 이동 ➔ {path.endName} 하차
          </div>
        </div>
      )
    }

    // 2. 버스 세그먼트
    if (path.trafficType === 2) {
      const arrivals = realtimeData[`bus_${path.startArsID}`] || []
      const busNo = path.lane[0].busNo
      // 특정 버스의 도착 정보만 필터링
      const myBusArrivals = arrivals.filter((a: any) => a.rtNm === busNo)

      return (
        <div key={index} className="relative pb-12 pl-12 group">
          <div className="absolute w-4 h-4 bg-white dark:bg-background-dark border-4 border-[#7EE787] rounded-full -left-[32px] top-1.5 z-10" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-primary/20'} -left-[25px] top-4`} />

          <h4 className="font-extrabold text-xl flex items-center mb-1 group-hover:text-[#7EE787] transition-colors">
            <Bus size={22} className="mr-3 text-[#7EE787]"/>
            {path.startName} 승차
          </h4>

          <div className="flex items-center space-x-2 mb-4">
            <span className="text-[11px] font-black px-3 py-1 bg-[#7EE787]/10 text-[#54CC63] rounded-lg border border-[#7EE787]/20">
              {busNo}번 버스
            </span>
          </div>

          <div className="space-y-2.5">
            {myBusArrivals.length > 0 ? (
              myBusArrivals.map((arrival: any, i: number) => (
                <div key={i} className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-border dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-right-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black opacity-40 uppercase">실시간 도착</span>
                    <span className="text-[15px] font-black text-[#54CC63]">{arrival.arrmsg1}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold opacity-30 italic pl-1">정류장 도착 정보가 없습니다.</p>
            )}
          </div>

          <div className="mt-4 flex items-center text-[13px] font-bold text-text-sub dark:text-text-sub-dark bg-black/5 dark:bg-white/5 w-fit px-4 py-1.5 rounded-full">
            <Navigation size={12} className="mr-2" />
            {path.stationCount}개 정류장 ➔ {path.endName} 하차
          </div>
        </div>
      )
    }

    // 3. 도보 세그먼트
    if (path.trafficType === 3 && path.sectionTime > 0) {
      return (
        <div key={index} className="relative pb-10 pl-12 group opacity-60 hover:opacity-100 transition-opacity">
          <div className="absolute w-2 h-2 bg-gray-400 rounded-full -left-[24px] top-2 z-10" />
          <div className={`absolute w-0.5 h-full ${isLast ? 'bg-transparent' : 'bg-primary/10'} -left-[21px] top-4`} />
          
          <h4 className="font-bold text-[15px] flex items-center mb-1">
            <PersonStanding size={18} className="mr-2.5 text-text-sub"/> 도보 이동
          </h4>
          <p className="text-sm font-black text-text-sub ml-1 tracking-tight">약 {path.sectionTime}분 걸어가기</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-8 p-6 flex flex-col pb-24 relative overflow-hidden">
      
      {/* 백그라운드 블러 장식 */}
      <div className={`absolute -top-20 -right-20 w-80 h-80 bg-primary/10 blur-[120px] rounded-full transition-all duration-1000 ${isActive ? 'scale-110 opacity-100' : 'opacity-0'}`} />
      <div className={`absolute -bottom-20 -left-20 w-80 h-80 bg-[#7EE787]/10 blur-[120px] rounded-full transition-all duration-1000 delay-500 ${isActive ? 'scale-110 opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 flex-1 flex flex-col">
        <button onClick={onBack} className="mb-6 flex items-center text-text-sub dark:text-text-sub-dark px-2 font-black text-sm hover:text-primary transition-colors group">
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> DASHBOARD
        </button>

        <div className="mb-10 px-2">
          <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3 opacity-60">
            Premium Transit Guide
          </div>
          <h2 className="text-3xl font-black mb-1 tracking-tight flex items-center flex-wrap leading-tight">
            {route.start_point.nickname || route.start_point.stationName}
            <ChevronRight size={24} className="mx-2 text-primary opacity-20" />
            {route.end_point.nickname || route.end_point.stationName}
          </h2>
          <div className="flex items-center mt-2 space-x-3">
             <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[11px] font-black opacity-50 uppercase tracking-tighter">
               {route.name}
             </span>
             {lastUpdated && (
                <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">
                  Live Sync: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
             )}
          </div>
        </div>

        {!isActive ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-[4rem] border border-white/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 relative">
              <Navigation className="text-primary w-12 h-12 ml-1" />
              <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
            </div>
            <button 
              onClick={handleStart}
              className="px-14 py-6 bg-primary text-white font-black rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(var(--primary),0.5)] hover:scale-105 active:scale-95 transition-all text-2xl"
            >
              GO LIVE
            </button>
            <p className="mt-10 text-[11px] font-black opacity-30 tracking-[0.2em] uppercase text-center leading-relaxed">
              탭하여 전체 여정 타임라인과<br/>실시간 교통 데이터를 활성화하세요
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-700 flex-1 flex flex-col">
            
            {/* 상단 메인 지표 */}
            <div className="relative mb-12 py-10 bg-white/60 dark:bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/20 shadow-2xl overflow-hidden">
               <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 blur-3xl -mr-10 -mt-10" />
               <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                     <span className="text-8xl font-black text-text-main dark:text-text-main-dark tracking-tighter">{eta}</span>
                     <div className="flex flex-col ml-3 text-left">
                        <span className="text-xl font-black text-primary leading-none">MINS</span>
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Left to go</span>
                     </div>
                  </div>
                  <div className="flex items-center justify-center mt-6 space-x-6">
                     <div className="flex flex-col items-center">
                        <span className="text-xs font-black opacity-40 uppercase mb-1">Total Wait</span>
                        <span className="text-md font-black">{route.path_info.info.transitCount} Transfers</span>
                     </div>
                     <div className="w-px h-8 bg-border/50" />
                     <div className="flex flex-col items-center">
                        <span className="text-xs font-black opacity-40 uppercase mb-1">Distance</span>
                        <span className="text-md font-black">{(route.path_info.info.distance / 1000).toFixed(1)}km</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* 범용 타임라인 */}
            <div className="flex-1 bg-white/20 dark:bg-white/5 rounded-[3rem] p-8 pb-12 border border-white/10 shadow-lg mb-8">
               <div className="flex items-center mb-10 px-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Journey Timeline</h3>
                  <div className="flex-1 h-px bg-border/30 ml-4" />
               </div>
               
               <div className="timeline-container relative">
                  {/* 시작 지점 (별명/원래 이름) */}
                  <div className="relative pb-10 pl-12 group">
                    <div className="absolute w-6 h-6 bg-primary rounded-full -left-[35px] top-0.5 shadow-xl shadow-primary/30 flex items-center justify-center">
                       <MapPin size={12} className="text-white" />
                    </div>
                    <div className="absolute w-0.5 h-full bg-primary/20 -left-[25px] top-6" />
                    <h4 className="font-exrabold text-xl tracking-tight">출발: {route.start_point.nickname || route.start_point.stationName}</h4>
                  </div>

                  {/* 세그먼트들 */}
                  {subPaths.map((path: any, i: number) => renderSegment(path, i))}

                  {/* 최종 도착 지점 */}
                  <div className="relative pl-12 group pt-2">
                    <div className="absolute w-8 h-8 bg-[#7EE787] rounded-all rounded-full -left-[36px] -top-1 shadow-xl shadow-[#7EE787]/30 flex items-center justify-center">
                       <CheckCircle2 size={18} className="text-white" />
                    </div>
                    <h4 className="font-exrabold text-2xl tracking-tight">도착: {route.end_point.nickname || route.end_point.stationName}</h4>
                    <p className="text-xs font-bold opacity-30 mt-1 uppercase tracking-widest leading-relaxed">나만의 커스텀 경로 조립 완료<br/>{route.path_info.info.totalTime}분 대장정 마무리</p>
                  </div>
               </div>
            </div>

            {/* 하단 플로팅 액션 */}
            <div className="grid grid-cols-5 gap-4 sticky bottom-0 pb-6 bg-gradient-to-t from-background dark:from-background-dark via-background/90 to-transparent pt-4">
              <button 
                onClick={fetchAllRealtimeData}
                disabled={isRefreshing}
                className="col-span-4 py-5 bg-black dark:bg-white text-white dark:text-black rounded-3xl shadow-2xl text-lg font-black flex justify-center items-center active:scale-95 transition-all disabled:opacity-50"
              >
                {isRefreshing ? <Loader2 size={18} className="animate-spin mr-2" /> : <Repeat size={18} className="mr-2" />}
                {isRefreshing ? '데이터 동기화 중...' : '실시간 정보 갱신'}
              </button>
              <button 
                onClick={() => alert('프리미엄 루트 가이드가 저장되었습니다.')}
                className="col-span-1 bg-primary/10 text-primary border border-primary/20 rounded-3xl flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all shadow-lg"
              >
                <Info size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
