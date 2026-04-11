import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Save, Loader2, Clock } from 'lucide-react'
import { type Route } from '../types'

export default function EditRoute({ route, onBack, onSuccess }: { 
  route: Route, 
  onBack: () => void, 
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false)
  
  // 초기값 설정
  const [name, setName] = useState(route.name || '')
  const [startNickname, setStartNickname] = useState(route.start_point?.nickname || '')
  const [endNickname, setEndNickname] = useState(route.end_point?.nickname || '')
  
  // 첫 구간과 마지막 구간이 도보인 경우 도보 시간 추출
  const subPaths = [...(route.path_info?.subPath || [])]
  const initialWalkTo = subPaths[0]?.trafficType === 3 ? subPaths[0].sectionTime : 0
  const initialWalkFrom = subPaths[subPaths.length - 1]?.trafficType === 3 ? subPaths[subPaths.length - 1].sectionTime : 0
  
  const [walkTo, setWalkTo] = useState<number>(initialWalkTo)
  const [walkFrom, setWalkFrom] = useState<number>(initialWalkFrom)

  const handleUpdate = async () => {
    if (!name || !startNickname || !endNickname) {
      alert('필수 정보를 모두 입력해주세요.')
      return
    }

    setLoading(true)

    // path_info 업데이트
    const updatedSubPaths = [...subPaths]
    if (updatedSubPaths[0]?.trafficType === 3) {
      updatedSubPaths[0] = { ...updatedSubPaths[0], sectionTime: walkTo }
    }
    const lastIdx = updatedSubPaths.length - 1
    if (updatedSubPaths[lastIdx]?.trafficType === 3) {
      updatedSubPaths[lastIdx] = { ...updatedSubPaths[lastIdx], sectionTime: walkFrom }
    }

    // 총 시간 재계산 (기존 시간에서 도보 차이만큼 조정)
    const walkDiff = (walkTo - initialWalkTo) + (walkFrom - initialWalkFrom)
    const newTotalTime = (route.path_info?.info?.totalTime || 0) + walkDiff

    const updatedPathInfo = {
      ...route.path_info,
      subPath: updatedSubPaths,
      info: {
        ...route.path_info.info,
        totalTime: newTotalTime
      }
    }

    const { error } = await supabase
      .from('routes')
      .update({
        name,
        start_point: { ...route.start_point, nickname: startNickname },
        end_point: { ...route.end_point, nickname: endNickname },
        path_info: updatedPathInfo
      })
      .eq('id', route.id)

    setLoading(false)

    if (error) {
      alert('수정 실패: ' + error.message)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-[100dvh] pt-8 p-5 flex flex-col bg-background dark:bg-background-dark">
      <button onClick={onBack} className="mb-6 flex items-center text-sm text-gray-400 hover:text-primary transition-colors">
        <ArrowLeft size={16} className="mr-1.5" /> 취소하고 돌아가기
      </button>

      <h2 className="text-2xl font-black mb-8">경로 편집</h2>

      <div className="space-y-6 flex-1">
        {/* 경로 별칭 */}
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">경로 이름 (별명)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
            placeholder="예: 나의 출근길"
          />
        </div>

        {/* 장소 별칭 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">출발 장소명</label>
            <input
              type="text"
              value={startNickname}
              onChange={(e) => setStartNickname(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">도착 장소명</label>
            <input
              type="text"
              value={endNickname}
              onChange={(e) => setEndNickname(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-semibold"
            />
          </div>
        </div>

        {/* 도보 시간 조정 */}
        <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-primary" />
            <span className="text-sm font-black">도보 시간 조정</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">출발지 ➔ 역/정류소</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setWalkTo(Math.max(0, walkTo - 1))} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center border border-gray-100 dark:border-white/10">-</button>
                <span className="w-8 text-center font-bold">{walkTo}분</span>
                <button onClick={() => setWalkTo(walkTo + 1)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center border border-gray-100 dark:border-white/10">+</button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">역/정류소 ➔ 도착지</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setWalkFrom(Math.max(0, walkFrom - 1))} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center border border-gray-100 dark:border-white/10">-</button>
                <span className="w-8 text-center font-bold">{walkFrom}분</span>
                <button onClick={() => setWalkFrom(walkFrom + 1)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center border border-gray-100 dark:border-white/10">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdate}
        disabled={loading}
        className="mt-8 w-full py-5 bg-primary text-white font-black text-xl rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Save size={22} />}
        수정 사항 저장하기
      </button>
    </div>
  )
}
