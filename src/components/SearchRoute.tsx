import { useState } from 'react'
import { searchPubTransPath, searchStation } from '../lib/odsay'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Search, MapPin, TrainFront, PersonStanding, Bus, CheckCircle2, AlertCircle, ChevronRight, Zap } from 'lucide-react'
// Route type will be used later if needed

export default function SearchRoute({ session, onBack, onRequestAuth }: { 
  session: { user: { id: string, email?: string } } | null, 
  onBack: () => void, 
  onRequestAuth: () => void 
}) {
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
  const [startResults, setStartResults] = useState<Record<string, unknown>[]>([])
  const [endResults, setEndResults] = useState<Record<string, unknown>[]>([])
  const [startStation, setStartStation] = useState<Record<string, any> | null>(null)
  const [endStation, setEndStation] = useState<Record<string, any> | null>(null)
  
  const [paths, setPaths] = useState<Record<string, any>[]>([])
  const [selectedPath, setSelectedPath] = useState<Record<string, any> | null>(null)
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
    
    // 매핑 로직: 첫 번째 도보와 마지막 도보에 사용자 입력을 강제로 반영
    const updatedSubPaths = (selectedPath.subPath as Record<string, unknown>[]).map((sp, idx: number) => {
      // 첫 번째 도보 구간 (Origin -> Station)
      if (idx === 0 && sp.trafficType === 3 && walkToStationMins > 0) {
        return { ...sp, sectionTime: walkToStationMins }
      }
      // 마지막 도보 구간 (Station -> Destination)
      if (idx === (selectedPath.subPath as any[]).length - 1 && sp.trafficType === 3 && walkFromStationMins > 0) {
        return { ...sp, sectionTime: walkFromStationMins }
      }
      return sp
    })

    const extendedPathInfo = {
      ...selectedPath,
      subPath: updatedSubPaths,
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
      path_info: extendedPathInfo,
      name: routeName || `${startStation.stationName} ➔ ${endStation.stationName}`,
      start_point: startPoint,
      end_point: endPoint
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
    <div className="max-w-md mx-auto min-h-[100dvh] bg-background dark:bg-background-dark pt-12 p-6 flex flex-col pb-24">
      <button 
        onClick={step === 1 ? onBack : () => {setStep(1); setSelectedPath(null);}} 
        className="mb-8 w-fit flex items-center gap-2 px-4 py-2 glass-card glass-card-hover rounded-2xl text-[10px] font-black text-text-sub dark:text-text-sub-dark uppercase tracking-[0.2em]"
      >
        <ArrowLeft size={14} strokeWidth={3} /> {step === 1 ? 'Go Back' : 'Change Points'}
      </button>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="mb-10">
            <h2 className="text-4xl font-black tracking-tighter text-gradient leading-tight mb-2">Build Your Route</h2>
            <p className="text-sm font-bold text-text-sub dark:text-text-sub-dark">나만의 출근길/퇴근길 블록을 정교하게 조립하세요</p>
          </div>
          
          <div className="space-y-8">
            
            {/* STEP 1: 출발 설정 */}
            <div className="glass-card rounded-[2.5rem] p-8 border-primary/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 premium-gradient text-white rounded-2xl shadow-lg shadow-primary/20">
                  <PersonStanding size={20} strokeWidth={3} />
                </div>
                <h3 className="text-sm font-black text-text-main dark:text-text-main-dark uppercase tracking-widest">Departure Block</h3>
              </div>
              
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-primary uppercase ml-1 mb-1.5 block tracking-widest opacity-70 group-focus-within:opacity-100 transition-opacity">Alias (출발지 별칭)</label>
                  <input 
                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-primary/30 px-5 py-4 rounded-2xl text-sm font-black transition-all outline-none"
                    value={startPlaceName} onChange={(e) => setStartPlaceName(e.target.value)} placeholder="집/회사/카페..."
                  />
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="text-[11px] font-black text-text-sub dark:text-text-sub-dark whitespace-nowrap uppercase tracking-widest">In-house Walk</div>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <input type="number" min="0" className="w-16 text-center bg-white dark:bg-background-dark border border-primary/20 px-2 py-2 rounded-xl text-sm font-black outline-none" value={walkToStationMins || ''} onChange={(e) => setWalkToStationMins(Number(e.target.value))} placeholder="0"/>
                    <span className="text-xs font-black text-text-sub uppercase">Min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: 대중교통 노드 */}
            <div className="glass-card rounded-[2.5rem] p-8 border-accent/10 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-accent/20 text-accent rounded-2xl">
                  <TrainFront size={20} strokeWidth={3} />
                </div>
                <h3 className="text-sm font-black text-text-main dark:text-text-main-dark uppercase tracking-widest">Transit Nodes</h3>
              </div>
              
              <div className="space-y-5 relative z-10">
                {/* 출발역 */}
                <div className="relative">
                  <label className="text-[10px] font-black text-accent uppercase ml-1 mb-1.5 block tracking-widest opacity-70">On-Board Station</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub/50" size={16} />
                      <input 
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/30 pl-11 pr-5 py-4 rounded-2xl text-sm font-black transition-all outline-none" 
                        value={startQuery} onChange={(e) => setStartQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStation(startQuery, 'start')} 
                        placeholder="탑승할 역/정류장"
                      />
                    </div>
                    <button onClick={() => handleSearchStation(startQuery, 'start')} className="p-4 bg-accent/20 text-accent rounded-2xl hover:bg-accent/30 active:scale-90 transition-all cursor-pointer"><Search size={20} strokeWidth={3} /></button>
                  </div>
                  {startResults.length > 0 && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 glass-card rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto p-2 border-accent/20">
                      {startResults.map((st, idx) => (
                        <div key={idx} onClick={() => selectStation(st, 'start')} className="p-4 rounded-xl hover:bg-accent/10 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-none transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${st.stationClass === 1 ? 'bg-success/10 text-success' : 'bg-purple-500/10 text-purple-600'}`}>
                              {st.stationClass === 1 ? <Bus size={16} strokeWidth={3} /> : <TrainFront size={16} strokeWidth={3} />}
                            </div>
                            <div>
                              <div className="text-sm font-black group-hover:text-accent transition-colors">{st.stationName}</div>
                              <div className="text-[10px] font-bold text-text-sub opacity-60 mt-0.5">{st.laneName || '대중교통'} • {st.arsID || 'No ID'}</div>
                            </div>
                          </div>
                          <ArrowLeft className="rotate-180 text-text-sub/30 group-hover:text-accent" size={14} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 하차역 */}
                <div className="relative">
                  <label className="text-[10px] font-black text-accent uppercase ml-1 mb-1.5 block tracking-widest opacity-70">Off-Board Station</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub/50" size={16} />
                      <input 
                        className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/30 pl-11 pr-5 py-4 rounded-2xl text-sm font-black transition-all outline-none" 
                        value={endQuery} onChange={(e) => setEndQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStation(endQuery, 'end')} 
                        placeholder="하차할 역/정류장"
                      />
                    </div>
                    <button onClick={() => handleSearchStation(endQuery, 'end')} className="p-4 bg-accent/20 text-accent rounded-2xl hover:bg-accent/30 active:scale-90 transition-all cursor-pointer"><Search size={20} strokeWidth={3} /></button>
                  </div>
                  {endResults.length > 0 && (
                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 glass-card rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto p-2 border-accent/20">
                      {endResults.map((st, idx) => (
                        <div key={idx} onClick={() => selectStation(st, 'end')} className="p-4 rounded-xl hover:bg-accent/10 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-none transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${st.stationClass === 1 ? 'bg-success/10 text-success' : 'bg-purple-500/10 text-purple-600'}`}>
                              {st.stationClass === 1 ? <Bus size={16} strokeWidth={3} /> : <TrainFront size={16} strokeWidth={3} />}
                            </div>
                            <div>
                              <div className="text-sm font-black group-hover:text-accent transition-colors">{st.stationName}</div>
                              <div className="text-[10px] font-bold text-text-sub opacity-60 mt-0.5">{st.laneName || '대중교통'} • {st.arsID || 'No ID'}</div>
                            </div>
                          </div>
                          <ArrowLeft className="rotate-180 text-text-sub/30 group-hover:text-accent" size={14} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: 도착 설정 */}
            <div className="glass-card rounded-[2.5rem] p-8 border-success/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-success/20 text-success rounded-2xl">
                  <CheckCircle2 size={20} strokeWidth={3} />
                </div>
                <h3 className="text-sm font-black text-text-main dark:text-text-main-dark uppercase tracking-widest">Arrival Block</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-success/5 rounded-2xl border border-success/10">
                  <div className="text-[11px] font-black text-text-sub dark:text-text-sub-dark whitespace-nowrap uppercase tracking-widest">Last Mile Walk</div>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <input type="number" min="0" className="w-16 text-center bg-white dark:bg-background-dark border border-success/20 px-2 py-2 rounded-xl text-sm font-black outline-none" value={walkFromStationMins || ''} onChange={(e) => setWalkFromStationMins(Number(e.target.value))} placeholder="0"/>
                    <span className="text-xs font-black text-text-sub uppercase">Min</span>
                  </div>
                </div>

                <div className="group">
                  <label className="text-[10px] font-black text-success uppercase ml-1 mb-1.5 block tracking-widest opacity-70 group-focus-within:opacity-100 italic transition-opacity">Final Destination Name</label>
                  <input 
                    className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-success/30 px-5 py-4 rounded-2xl text-sm font-black transition-all outline-none"
                    value={endPlaceName} onChange={(e) => setEndPlaceName(e.target.value)} placeholder="최종 도착지 이름 (예: 복정 빌딩)"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              {(!startStation || !endStation) && (
                <div className="flex items-center justify-center gap-2 text-[11px] font-black text-danger uppercase tracking-widest mb-5 animate-pulse">
                  <AlertCircle size={14} /> Please select both stations to proceed
                </div>
              )}
              <button 
                disabled={loading || !startStation || !endStation}
                onClick={handleFindPath} 
                className="w-full premium-gradient text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-primary/40 disabled:opacity-20 transition-all hover:shadow-primary/50 active:scale-[0.98] text-xl tracking-tighter"
              >
                {loading ? 'CALCULATING PATH...' : 'ASSEMBLE COMPLETE — CALCULATE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-700">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-tighter text-gradient mb-2">Select Your Path</h2>
            <p className="text-sm font-bold text-text-sub dark:text-text-sub-dark">최적의 경로를 선택하여 내 서랍에 저장하세요</p>
          </div>
          
          <div className="mb-10 p-8 glass-card rounded-[2.5rem] border-primary/20 relative overflow-hidden bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6">Route Assembly Summary</h4>
            <div className="space-y-4">
               <div className="flex items-start gap-4">
                 <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary mt-0.5"><MapPin size={12} strokeWidth={3}/></div>
                 <div className="text-sm font-black text-text-sub">
                   {startPlaceName} <ChevronRight size={10} className="inline opacity-30 mx-1"/> <span className="text-text-main dark:text-text-main-dark">{startStation.stationName} (도보 {walkToStationMins || 0}분)</span>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent mt-0.5"><Zap size={12} strokeWidth={3}/></div>
                 <div className="text-sm font-black text-text-main dark:text-text-main-dark">Transit Interval Tracking Activated</div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-success mt-0.5"><CheckCircle2 size={12} strokeWidth={3}/></div>
                 <div className="text-sm font-black text-text-sub">
                   {endStation.stationName} <ChevronRight size={10} className="inline opacity-30 mx-1"/> <span className="text-text-main dark:text-text-main-dark">{endPlaceName} (도보 {walkFromStationMins || 0}분)</span>
                 </div>
               </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <label className="text-[10px] font-black text-primary uppercase ml-1 mb-3 block tracking-widest opacity-70">Define Route Identity</label>
              <input 
                className="w-full bg-white dark:bg-background-dark border border-primary/20 focus:border-primary/50 px-6 py-4 rounded-2xl text-lg font-black transition-all outline-none shadow-sm"
                value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="예: 구의동 꿀잠 출근길" autoFocus
              />
            </div>
            
            <div className="absolute -left-10 -bottom-10 opacity-[0.03] rotate-12">
              <Zap size={180} strokeWidth={1} />
            </div>
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-sub opacity-40 mb-6 pl-1">Available Trajectories</h3>

          <div className="space-y-4">
            {paths.map((p, idx) => {
              const summary = getRouteSummary(p)
              const transitCount = getTransitCount(p.info)
              const customTotalMins = p.info.totalTime + (walkToStationMins || 0) + (walkFromStationMins || 0)

              return (
                <div 
                  key={idx} 
                  onClick={() => { setSelectedPath(p); handleSaveRoute(); }}
                  className="group p-8 glass-card glass-card-hover rounded-[2.5rem] cursor-pointer flex items-center justify-between gap-6"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-extrabold rounded-full uppercase tracking-tighter">
                        {transitCount} Transits
                      </span>
                      <span className="text-[10px] font-bold text-text-sub opacity-40 italic">Global Path #{idx + 1}</span>
                    </div>
                    <div className="text-sm font-black text-text-main dark:text-text-main-dark leading-snug truncate group-hover:text-primary transition-colors">
                      {summary}
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <div className="flex items-baseline gap-1 group-hover:scale-110 transition-transform origin-right">
                      <span className="text-5xl font-black text-primary tracking-tighter leading-none">{customTotalMins}</span>
                      <span className="text-sm font-black text-text-sub opacity-40 tracking-tighter uppercase">Min</span>
                    </div>
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
