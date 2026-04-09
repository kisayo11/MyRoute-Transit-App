import { useState } from 'react'
import { searchPubTransPath, searchStation } from '../lib/odsay'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Search, MapPin, TrainFront, PersonStanding, Bus } from 'lucide-react'

export default function SearchRoute({ session, onBack, onRequestAuth }: { session: any, onBack: () => void, onRequestAuth: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  
  // 텍스트 기반 사용자 정의 출발/도착 명칭
  const [routeName, setRouteName] = useState('')
  const [startPlaceName, setStartPlaceName] = useState('')
  const [endPlaceName, setEndPlaceName] = useState('')
  
  // 커스텀 추가 도보 시간
  const [walkToStationMins, setWalkToStationMins] = useState<number>(0)
  const [walkFromStationMins, setWalkFromStationMins] = useState<number>(0)

  // 대중교통 탑승/하차 역
  const [startQuery, setStartQuery] = useState('')
  const [endQuery, setEndQuery] = useState('')
  const [startResults, setStartResults] = useState<any[]>([])
  const [endResults, setEndResults] = useState<any[]>([])
  const [startStation, setStartStation] = useState<any>(null)
  const [endStation, setEndStation] = useState<any>(null)
  
  const [paths, setPaths] = useState<any[]>([])
  const [selectedPath, setSelectedPath] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSearchStation = async (query: string, type: 'start'|'end') => {
    if (!query) return
    setLoading(true)
    const res = await searchStation(query)
    if (type === 'start') setStartResults(res)
    else setEndResults(res)
    setLoading(false)
  }

  const selectStation = (station: any, type: 'start'|'end') => {
    const stationData = { 
      ...station, 
      placeName: station.stationName,
      stationID: station.stationID // 9자리 고유 ID 저장
    }
    if (type === 'start') {
      setStartStation(stationData)
      setStartQuery(station.stationName)
      if (!startPlaceName) setStartPlaceName(station.stationName)
      setStartResults([])
    } else {
      setEndStation(stationData)
      setEndQuery(station.stationName)
      if (!endPlaceName) setEndPlaceName(station.stationName)
      setEndResults([])
    }
  }

  const handleFindPath = async () => {
    if (!startStation || !endStation) {
      alert('지도앱이 모르는 나만의 탑승역/하차역을 꼭 지정해주세요!')
      return
    }

    // 스마트 자동완성: 루트 이름이 비어있으면 기본 이름 생성
    if (!routeName) {
      setRouteName(`${startPlaceName || startStation.stationName} ➔ ${endPlaceName || endStation.stationName}`)
    }

    setLoading(true)
    const res = await searchPubTransPath(startStation.x, startStation.y, endStation.x, endStation.y, 0)
    setLoading(false)
    if (res && res.path) {
      setPaths(res.path)
      setStep(2)
    } else {
      alert('두 정류장/역을 연결하는 대중교통 경로를 찾을 수 없어요. 역 이름을 정확히 적어주세요.')
    }
  }

  const handleSaveRoute = async () => {
    if (!selectedPath || !routeName || !startPlaceName || !endPlaceName) {
      alert('경로명과 출/도착 장소명을 모두 입력해주세요!')
      return
    }
    if (!session) {
      alert('저장하려면 로그인이 필요합니다!')
      onRequestAuth()
      return
    }
    setLoading(true)
    
    // 사용자가 입력한 추가 도보 시간을 추가
    const customTotalMins = selectedPath.info.totalTime + walkToStationMins + walkFromStationMins
    const extendedPathInfo = {
      ...selectedPath,
      customWalkMins: walkToStationMins + walkFromStationMins,
      info: {
        ...selectedPath.info,
        totalTime: customTotalMins
      }
    }

    const startPoint = { ...startStation, nickname: startPlaceName, stationName: startStation.stationName }
    const endPoint = { ...endStation, nickname: endPlaceName, stationName: endStation.stationName }

    const { error } = await supabase.from('routes').insert({
      user_id: session.user.id,
      name: routeName,
      start_point: startPoint,
      end_point: endPoint,
      path_info: extendedPathInfo
    })
    setLoading(false)
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      onBack()
    }
  }

  const getRouteSummary = (path: any) => {
    const transports: string[] = []
    if (!path.subPath) return ''
    path.subPath.forEach((sp: any) => {
      if (sp.trafficType === 1 && sp.lane?.[0]) transports.push(sp.lane[0].name ? sp.lane[0].name.replace('수도권 ', '') : '지하철')
      else if (sp.trafficType === 2 && sp.lane?.[0]) transports.push((sp.lane[0].busNo || '버스') + '번 버스')
    })
    return transports.join(' ➔ ')
  }

  const getTransitCount = (info: any) => {
    return (info.busTransitCount || 0) + (info.subwayTransitCount || 0)
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-8 p-6 flex flex-col pb-20">
      <button onClick={step === 1 ? onBack : () => {setStep(1); setSelectedPath(null);}} className="mb-6 flex items-center text-text-sub dark:text-text-sub-dark px-2 font-medium">
        <ArrowLeft size={18} className="mr-1.5" /> 뒤로가기
      </button>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl font-black mb-6 tracking-tight">경로 조립</h2>
          
          <div className="space-y-6 relative">
            
            {/* STEP 1 */}
            <div className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] border border-border/50 dark:border-border-dark/50">
              <h3 className="text-xs font-black text-primary mb-3 flex items-center uppercase tracking-wider"><PersonStanding size={16} className="mr-1"/> 출발 장소 및 도보</h3>
              <div className="space-y-3">
                <input 
                  className="w-full bg-white dark:bg-[#1a1b22] border-none px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold"
                  value={startPlaceName} onChange={(e) => setStartPlaceName(e.target.value)} placeholder="집 (별칭)"
                />
                <div className="flex items-center space-x-3 text-sm font-bold text-text-sub dark:text-text-sub-dark">
                  <span>도보</span>
                  <input type="number" min="0" className="w-[4rem] text-center bg-white dark:bg-[#1a1b22] border-none px-2 py-2.5 rounded-xl focus:ring-2 focus:ring-primary/50" value={walkToStationMins || ''} onChange={(e) => setWalkToStationMins(Number(e.target.value))} placeholder="0"/>
                  <span>분 소요</span>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-primary-bg p-6 rounded-[2.5rem] border border-primary/20 shadow-sm relative">
              <h3 className="text-xs font-black text-primary mb-4 flex items-center uppercase tracking-wider"><TrainFront size={16} className="mr-1"/> 탑승 및 하차역</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex gap-2">
                    <input className="flex-1 bg-white dark:bg-[#1a1b22] border-none px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold" value={startQuery} onChange={(e) => setStartQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchStation(startQuery, 'start')} placeholder="탑승역 (예: 구의역)"/>
                    <button onClick={() => handleSearchStation(startQuery, 'start')} className="px-4 bg-primary text-white rounded-xl active:scale-90 transition-all"><Search size={18} /></button>
                  </div>
                  {startResults.length > 0 && (
                    <div className="absolute top-14 left-0 right-0 bg-white dark:bg-[#202129] border border-border dark:border-border-dark rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {startResults.map((st, idx) => (
                        <div key={idx} onClick={() => selectStation(st, 'start')} className="p-3 border-b border-border/50 dark:border-border-dark/50 hover:bg-primary/10 cursor-pointer text-sm font-bold flex items-center">
                          {st.stationClass === 1 ? <TrainFront size={16} className="text-[#AF52DE] mr-2" /> : 
                           st.stationClass === 2 ? <Bus size={16} className="text-[#34C759] mr-2" /> : 
                           <MapPin size={16} className="text-primary mr-2" />} 
                          {st.stationName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="flex gap-2">
                    <input className="flex-1 bg-white dark:bg-[#1a1b22] border-none px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold" value={endQuery} onChange={(e) => setEndQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchStation(endQuery, 'end')} placeholder="하차역 (예: 복정역)"/>
                    <button onClick={() => handleSearchStation(endQuery, 'end')} className="px-4 bg-primary text-white rounded-xl active:scale-90 transition-all"><Search size={18} /></button>
                  </div>
                  {endResults.length > 0 && (
                    <div className="absolute top-14 left-0 right-0 bg-white dark:bg-[#202129] border border-border dark:border-border-dark rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                      {endResults.map((st, idx) => (
                        <div key={idx} onClick={() => selectStation(st, 'end')} className="p-3 border-b border-border/50 dark:border-border-dark/50 hover:bg-primary/10 cursor-pointer text-sm font-bold flex items-center">
                          {st.stationClass === 1 ? <TrainFront size={16} className="text-[#AF52DE] mr-2" /> : 
                           st.stationClass === 2 ? <Bus size={16} className="text-[#34C759] mr-2" /> : 
                           <MapPin size={16} className="text-primary mr-2" />} 
                          {st.stationName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-black/5 dark:bg-white/5 p-5 rounded-3xl border border-border/50 dark:border-border-dark/50 relative">
              <h3 className="text-sm font-extrabold text-primary mb-3 flex items-center"><PersonStanding size={18} className="mr-1"/> 도착 걷기 및 최종 장소 (선택)</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm font-bold text-text-sub dark:text-text-sub-dark">
                   <span>내려서 도착지까지</span>
                  <input type="number" min="0" className="w-[4.5rem] text-center bg-white dark:bg-[#1a1b22] border-none px-2 py-3 rounded-xl focus:ring-2 focus:ring-primary/50 text-black dark:text-white" value={walkFromStationMins || ''} onChange={(e) => setWalkFromStationMins(Number(e.target.value))} placeholder="0"/>
                  <span>분 걸음</span>
                </div>
                <input 
                  className="w-full bg-white dark:bg-[#1a1b22] border-none px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold"
                  value={endPlaceName} onChange={(e) => setEndPlaceName(e.target.value)} placeholder="최종 도착지 이름 (예: 복정 오피스텔)"
                />
              </div>
            </div>

            <div className="pt-2">
              {!startStation || !endStation ? (
                <div className="text-[11px] font-bold text-red-500/70 text-center mb-3 animate-pulse uppercase tracking-tight">
                   ⚠ 탑승/하차 지점에서 '검색' 후 리스트의 역을 선택해주세요!
                </div>
              ) : null}
              <button 
                disabled={loading || !startStation || !endStation}
                onClick={handleFindPath} 
                className="w-full bg-black dark:bg-white text-white dark:text-black font-extrabold py-5 rounded-3xl shadow-2xl disabled:opacity-20 transition-all hover:scale-[1.02] active:scale-95 text-xl"
              >
                {loading ? '검색 중...' : '블록 조립 완료! 소요시간 계산'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight">계산 완료! 👏</h2>
          <p className="text-sm text-text-sub dark:text-text-sub-dark mb-8 font-medium">대중교통을 어떻게 탈 건지 고르시면 코스가 완성됩니다.</p>
          
          <div className="mb-6 p-6 bg-background dark:bg-white/5 border border-primary/20 rounded-[2rem] shadow-sm">
            <p className="font-extrabold text-sm mb-5 flex items-center tracking-tight text-primary uppercase">
              맞춤형 풀코스 진행 요약
            </p>
            <div className="flex flex-col space-y-3 text-sm font-bold">
               <div className="flex items-center text-text-sub dark:text-text-sub-dark"><PersonStanding size={16} className="mr-2"/> 출발지 ➔ 도보 {walkToStationMins || 0}분 ➔ {startStation.stationName} 도착</div>
               <div className="flex items-center text-black dark:text-white"><TrainFront size={16} className="mr-2 text-primary"/> 지하철/버스 환승 이동 ➔ {endStation.stationName} 하차</div>
               <div className="flex items-center text-text-sub dark:text-text-sub-dark"><PersonStanding size={16} className="mr-2"/> 하차 후 ➔ 도보 {walkFromStationMins || 0}분 ➔ 최종 도착</div>
            </div>
            <div className="mt-6 pt-5 border-t border-border/50 dark:border-white/10 font-bold">
              <label className="text-xs text-primary mb-2 block pl-1">완성된 전체 루트에 멋진 별명을 지어주세요!</label>
              <input 
                className="w-full bg-black/5 dark:bg-white/10 border-none px-5 py-4 rounded-xl focus:ring-2 focus:ring-primary text-base font-bold placeholder:font-normal placeholder:opacity-50"
                value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="예: 구의동 꿀잠 출근길" autoFocus
              />
            </div>
          </div>

          <div className="space-y-4">
            {paths.map((p, idx) => {
              const summary = getRouteSummary(p)
              const transitCount = getTransitCount(p.info)
              const customTotalMins = p.info.totalTime + (walkToStationMins || 0) + (walkFromStationMins || 0)

              return (
                <div 
                  key={idx} 
                  onClick={() => { setSelectedPath(p); handleSaveRoute(); }}
                  className={`p-6 bg-white dark:bg-[#1a1b22] border rounded-[2rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:border-primary/50 transition-all relative ${selectedPath?.info?.mapObj === p.info.mapObj ? 'border-primary shadow-lg' : 'border-border dark:border-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black flex items-end tracking-tighter text-primary">
                      {customTotalMins} <span className="text-sm mb-1 ml-1 font-bold text-text-sub">분 (총 계산)</span>
                    </span>
                    <span className="text-xs bg-black/5 dark:bg-white/10 font-bold px-3 py-1.5 rounded-full">
                      대중교통 환승 {transitCount}회
                    </span>
                  </div>
                  
                  <div className="text-[14px] font-bold tracking-tight text-text-main dark:text-text-main-dark leading-snug">
                    <span className="opacity-50 text-xs block mb-1">대중교통 탑승 노선:</span>
                    {summary}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
