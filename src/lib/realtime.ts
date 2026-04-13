/**
 * MyRoute 실시간 대중교통 API
 * 
 * 지하철: 서울 열린데이터 광장 (swopenapi.seoul.go.kr)
 * 버스:   국가공공데이터포털 (ws.bus.go.kr)
 * 
 * 프록시: CORS 우회 (corsproxy.io가 allorigins보다 훨씬 안정적)
 */

// Vercel 자체 API 터널 사용 (/api/proxy)
import { type RealtimeResult, type SubwayArrival, type BusArrival } from '../types'

// ===================== 공통 유틸 =====================

async function proxyFetch(targetUrl: string, timeoutMs = 12000): Promise<unknown> {
  // 브라우저 및 프록시 서버의 캐싱을 완전히 막기 위해 고유 타임스탬프 추가
  const cacheBuster = `_t=${Date.now()}`
  const targetWithCacheBuster = targetUrl.includes('?') 
    ? `${targetUrl}&${cacheBuster}` 
    : `${targetUrl}?${cacheBuster}`

  const encodedTarget = encodeURIComponent(targetWithCacheBuster)
  
  // Vercel 자체 API 터널 사용
  const url = `/api/proxy?url=${encodedTarget}`
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const res = await fetch(url, { 
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    })
    clearTimeout(timer)
    
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}: 프록시 서버 응답 오류`
      try {
        const errorJson = await res.json()
        if (errorJson.error) errorMsg += ` (${errorJson.error})`
      } catch {
        // ignore
      }
      throw new Error(errorMsg)
    }
    
    const text = await res.text()
    if (!text || text.trim().startsWith('<')) {
      throw new Error('응답 데이터 형식이 올바르지 않습니다 (HTML 반환)')
    }
    
    const json = JSON.parse(text)
    return json
  } catch (err: any) {
    clearTimeout(timer)
    throw err
  }
}

// ===================== 지하철 API =====================

// 서울시 API 특성상 공식 명칭이 아니면 에러가 나는 역들을 위한 매핑 테이블
const STATION_NAME_FIXES: Record<string, string> = {
  '어린이대공원': '어린이대공원(세종대)',
  '숭실대입구': '숭실대입구(살피재)',
  '총신대입구': '총신대입구(이수)',
  '이수': '총신대입구(이수)',
  '상도': '상도(중앙대앞)',
  '충정로': '충정로(경기대입구)',
  '남한산성입구': '남한산성입구(성남법원·검찰청)',
  '대림': '대림(구로구청)',
  '증산': '증산(명지대앞)',
  '군자': '군자(능동)',
}

export async function getRealtimeSubway(stationName: string): Promise<RealtimeResult<SubwayArrival>> {
  const key = import.meta.env.VITE_PUBLIC_SUBWAY_API_KEY
  
  if (!key) return { ok: false, data: [], error: '지하철 인증키 누락' }
  if (!stationName) return { ok: false, data: [], error: '역 이름 누락' }

  // 1단계: 이름 정규화 (끝에 '역' 제거)
  let cleanName = stationName.trim().replace(/역$/, '')
  
  // 2단계: 매핑 테이블 확인
  if (STATION_NAME_FIXES[cleanName]) {
    cleanName = STATION_NAME_FIXES[cleanName]
  }

  try {
    const baseUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/10/${encodeURIComponent(cleanName)}`
    let data = await proxyFetch(baseUrl)

    // 만약 데이터가 없거나 에러가 났다면, 괄호를 제거하고 한 번 더 시도 (역방향 시도)
    if ((!data.realtimeArrivalList || data.realtimeArrivalList.length === 0) && cleanName.includes('(')) {
      const fallbackName = cleanName.split('(')[0]
      const fallbackUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/10/${encodeURIComponent(fallbackName)}`
      const fallbackData = await proxyFetch(fallbackUrl)
      if (fallbackData.realtimeArrivalList?.length > 0) {
        data = fallbackData
      }
    }

    // 최종 결과 체크
    if (data.errorMessage?.status !== 200 && data.errorMessage?.code !== 'INFO-000') {
      return { 
        ok: false, 
        data: [], 
        error: data.errorMessage?.message || `API 오류 (${data.errorMessage?.code})`
      }
    }

    const arrivals: SubwayArrival[] = (data.realtimeArrivalList || []).map((item: Record<string, unknown>) => ({
      subwayId: item.subwayId?.toString() || '',
      trainLineNm: item.trainLineNm || '',
      arvlMsg2: item.arvlMsg2 || '',
      arvlMsg3: item.arvlMsg3 || '',
      updnLine: item.updnLine || ''
    }))

    return { ok: true, data: arrivals, error: null }

  } catch (err: unknown) {
    const error = err as Error
    return { ok: false, data: [], error: error.message }
  }
}
// ===================== 버스 API (하이브리드 엔진) =====================
// 서울시 전용 망과 국가 공공데이터 망을 지능적으로 스위칭합니다.
export async function getRealtimeBus(arsId: string, stId: string, stationName?: string): Promise<RealtimeResult<BusArrival>> {
  // 사용 가능한 모든 키를 수집합니다.
  const env = import.meta.env
  const seoulKeys = [
    env.VITE_PUBLIC_SEOUL_BUS_API_KEY,
    env.VITE_PUBLIC_BUS_API_KEY,
    env.VITE_PUBLIC_SUBWAY_API_KEY
  ].filter(Boolean) as string[]

  const portalKeys = [
    env.VITE_PUBLIC_DATA_BUS_API_KEY,
    env.VITE_PUBLIC_BUS_API_KEY
  ].filter(Boolean) as string[]

  let lastError = '안정적인 엔진(ODsay)의 인증키가 설정되지 않았습니다. Vercel 설정을 확인해주세요.'

  // 1순위: ODsay API (통합 서비스 - 가장 안정적)
  const odsayKey = env.VITE_ODSAY_API_KEY
  if (odsayKey && (arsId || stId || stationName)) {
    try {
      const query = arsId || stId || stationName
      // 1. arsId 또는 이름으로 ODsay 내부 stationID 찾기
      const searchUrl = `https://api.odsay.com/v1/api/searchStation?lang=0&stationName=${encodeURIComponent(query || '')}&apiKey=${odsayKey}`
      const searchData = await proxyFetch(searchUrl, 8000) as any
      const stations = searchData.result?.station || []
      
      // 우선적으로 arsID 매칭, 없으면 이름 매칭, 최후에 첫번째 결과
      const targetStation = stations.find((s: any) => s.arsID === arsId) || 
                            stations.find((s: any) => stationName && s.stationName.includes(stationName)) ||
                            stations[0]

      if (targetStation?.stationID) {
        const arrivalUrl = `https://api.odsay.com/v1/api/getBusArrivalInfo?lang=0&stationID=${targetStation.stationID}&apiKey=${odsayKey}`
        const odsayData = await proxyFetch(arrivalUrl, 10000) as any
        
        if (odsayData.result?.real) {
          const arrivals: BusArrival[] = odsayData.result.real.map((item: any) => ({
            rtNm: item.routeNm || '',
            arrmsg1: item.arrivalMsg || '정보 없음',
            arrmsg2: '',
            stNm: targetStation.stationName || '',
            adirection: item.nextStationName ? `${item.nextStationName} 방면` : ''
          }))
          return { ok: true, data: arrivals, error: null }
        } else {
          lastError = 'ODsay: 해당 정류소의 실시간 정보가 없습니다.'
        }
      } else {
        lastError = 'ODsay: 정류소 ID 매칭에 실패했습니다.'
      }
    } catch (err: any) {
      lastError = `ODsay API 호출 실패: ${err.message}`
    }
  } else if (!odsayKey) {
    lastError = 'VITE_ODSAY_API_KEY 가 설정되지 않았습니다.'
  }

  // 2순위: 서울시 열린데이터 광장 (빠름, 서울 버스 전용)
  if (arsId && arsId.length === 5 && seoulKeys.length > 0) {
    for (const key of seoulKeys) {
      try {
        const seoulUrl = `http://openAPI.seoul.go.kr:8088/${key}/json/getArrInfoByArsId/1/10/${arsId}`
        const data = await proxyFetch(seoulUrl, 10000) as any
        
        const root = data.getArrInfoByArsId || data.GetArrInfoByArsId
        if (root?.RESULT?.CODE === 'INFO-000' && root.row?.length > 0) {
          const arrivals: BusArrival[] = root.row.map((item: any) => ({
            rtNm: item.rtNm || '',
            arrmsg1: item.arrmsg1 || '정보 없음',
            arrmsg2: item.arrmsg2 || '',
            stNm: item.stNm || '',
            adirection: item.adirection || ''
          }))
          return { ok: true, data: arrivals, error: null }
        }
      } catch (err: any) {
        // 무시하고 다음 엔진 시도
      }
    }
  }

  // 3순위: 국가 공공데이터 포털 (최우전 대비용 백업)
  if (stId && portalKeys.length > 0) {
    for (const key of portalKeys) {
      try {
        const portalUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${key}&stId=${stId}&resultType=json`
        const data = await proxyFetch(portalUrl, 15000) as any

        const header = data.msgHeader || data.comMsgHeader
        if (header?.headerCd === '0' || header?.returnCode === '00') {
          const items = data.msgBody?.itemList || []
          const itemList = Array.isArray(items) ? items : items ? [items] : []
          
          if (itemList.length > 0) {
            const arrivals: BusArrival[] = itemList.map((item: any) => ({
              rtNm: item.rtNm || '',
              arrmsg1: item.arrmsg1 || '정보 없음',
              arrmsg2: item.arrmsg1 || '',
              stNm: item.stNm || '',
              adirection: item.adirection || ''
            }))
            return { ok: true, data: arrivals, error: null }
          }
        }
      } catch (err: any) {
        // 마지막 에러 기록
        lastError = `공공포털 연결 실패: ${err.message}`
      }
    }
  }

  return { ok: false, data: [], error: lastError }
}

/**
 * 실시간 버스 위치 정보 조회 (노선별)
 * @param busRouteId 버스 노선 ID
 */
export async function getBusLocation(busRouteId: string): Promise<RealtimeResult<any>> {
  const env = import.meta.env
  const seoulKeys = [env.VITE_PUBLIC_SEOUL_BUS_API_KEY, env.VITE_PUBLIC_BUS_API_KEY].filter(Boolean) as string[]
  const portalKeys = [env.VITE_PUBLIC_DATA_BUS_API_KEY, env.VITE_PUBLIC_BUS_API_KEY].filter(Boolean) as string[]

  let lastError = '노선 ID 또는 인증키가 없습니다.'

  // 1. 서울시 API 시도
  if (busRouteId && seoulKeys.length > 0) {
    for (const key of seoulKeys) {
      try {
        const url = `http://openAPI.seoul.go.kr:8088/${key}/json/getBusPosByRtid/1/100/${busRouteId}`
        const data = await proxyFetch(url, 10000) as any
        const root = data.getBusPosByRtid || data.GetBusPosByRtid
        
        if (root?.RESULT?.CODE === 'INFO-000' && root.row?.length > 0) {
          return { ok: true, data: root.row, error: null }
        }
      } catch (err: any) {
        lastError = err.message
      }
    }
  }

  // 2. 공공데이터포털 API 시도
  if (busRouteId && portalKeys.length > 0) {
    for (const key of portalKeys) {
      try {
        const url = `http://ws.bus.go.kr/api/rest/buspos/getBusPosByRoute?serviceKey=${key}&busRouteId=${busRouteId}&resultType=json`
        const data = await proxyFetch(url, 12000) as any
        const header = data.msgHeader || data.comMsgHeader
        
        if (header?.headerCd === '0' || header?.returnCode === '00') {
          const items = data.msgBody?.itemList || []
          return { ok: true, data: Array.isArray(items) ? items : [items], error: null }
        }
      } catch (err: any) {
        lastError = err.message
      }
    }
  }

  return { ok: false, data: [], error: lastError }
}
