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

export async function getRealtimeBus(arsId: string, stId: string): Promise<RealtimeResult<BusArrival>> {
  const seoulKey = import.meta.env.VITE_PUBLIC_SEOUL_BUS_API_KEY
  const dataKey = import.meta.env.VITE_PUBLIC_DATA_BUS_API_KEY

  // 1순위: 서울시 열린데이터 광장 (빠름, 서울 버스 전용)
  if (arsId && arsId.length === 5 && seoulKey) {
    try {
      const seoulUrl = `http://openAPI.seoul.go.kr:8088/${seoulKey}/json/getArrInfoByArsId/1/10/${arsId}`
      const data = await proxyFetch(seoulUrl, 10000)
      
      const root = data.getArrInfoByArsId || data.GetArrInfoByArsId
      if (root?.RESULT?.CODE === 'INFO-000' && root.row?.length > 0) {
        const arrivals: BusArrival[] = root.row.map((item: Record<string, unknown>) => ({
          rtNm: item.rtNm || '',
          arrmsg1: item.arrmsg1 || '정보 없음',
          arrmsg2: item.arrmsg2 || '',
          stNm: item.stNm || '',
          adirection: item.adirection || ''
        }))
        return { ok: true, data: arrivals, error: null }
      }
      
      // 서울시 키 자체 에러가 있는 경우 (예: 인증실패)
      if (root?.RESULT?.CODE && root.RESULT.CODE !== 'INFO-000') {
        // Silently fail or handle error
      }
    } catch {
      // Silently fail to fallback
    }
  }

  // 2순위: 국가 공공데이터 포털 (전국구, 경기 버스 포함)
  if (stId && dataKey) {
    try {
      const portalUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${dataKey}&stId=${stId}&resultType=json`
      const data = await proxyFetch(portalUrl, 15000)

      const header = data.msgHeader
      if (header?.headerCd === '0') {
        const items = data.msgBody?.itemList || []
        const itemList = Array.isArray(items) ? items : items ? [items] : []
        
        const arrivals: BusArrival[] = itemList.map((item: Record<string, unknown>) => ({
          rtNm: item.rtNm || '',
          arrmsg1: item.arrmsg1 || '정보 없음',
          arrmsg2: item.arrmsg2 || '',
          stNm: item.stNm || '',
          adirection: item.adirection || ''
        }))
        return { ok: true, data: arrivals, error: null }
      } else {
        const portalError = header?.headerMsg || '정보 없음'
        return { 
          ok: false, 
          data: [], 
          error: `포털 에러: ${portalError} (코드: ${header?.headerCd})`
        }
      }
    } catch (error: unknown) {
      const err = error as Error
      return { ok: false, data: [], error: `네트워크 오류: ${err.message}` }
    }
  }

  return { ok: false, data: [], error: '호환되는 정류소 ID가 없거나 인증키가 설정되지 않았습니다.' }
}
