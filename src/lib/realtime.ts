/**
 * MyRoute 실시간 대중교통 API
 * 
 * 지하철: 서울 열린데이터 광장 (swopenapi.seoul.go.kr)
 * 버스:   국가공공데이터포털 (ws.bus.go.kr)
 * 
 * 프록시: CORS 우회 (corsproxy.io가 allorigins보다 훨씬 안정적)
 */

const PROXY = 'https://corsproxy.io/?'

// ===================== 타입 정의 =====================

export interface RealtimeResult<T> {
  ok: boolean
  data: T[]
  error: string | null
}

export interface SubwayArrival {
  trainLineNm: string  // "2호선 - 성수행"
  arvlMsg2: string     // "2분 후"
  arvlMsg3: string     // "현재 구의역"
  updnLine: string     // "상행" | "하행"
}

export interface BusArrival {
  rtNm: string         // 노선번호 "4425"
  arrmsg1: string      // "3분 후 [1번째 전]"
  arrmsg2: string      // "15분 후 [5번째 전]"
  stNm: string         // 정류소명
  adirection: string   // 진행방향
}

// ===================== 공통 유틸 =====================

async function proxyFetch(targetUrl: string, timeoutMs = 12000): Promise<any> {
  // targetUrl에 이미 한글이 포함되어 있을 수 있으므로, 
  // 전체를 인코딩하되 기호들이 중복 인코딩되지 않게 처리하는 프록시 전용 유틸
  const encodedTarget = encodeURIComponent(targetUrl)
  const url = PROXY + encodedTarget
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: 프록시 서버 응답 오류`)
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

export async function getRealtimeSubway(stationName: string): Promise<RealtimeResult<SubwayArrival>> {
  const key = import.meta.env.VITE_PUBLIC_SUBWAY_API_KEY
  
  if (!key) return { ok: false, data: [], error: '지하철 인증키 누락' }
  if (!stationName) return { ok: false, data: [], error: '역 이름 누락' }

  // "구의역" -> "구의" 정규화
  const cleanName = stationName.trim().replace(/역$/, '')

  try {
    const baseUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/10/${cleanName}`
    const data = await proxyFetch(baseUrl)

    // 서울시 API 특정 오류 메시지 체크
    if (data.errorMessage?.status !== 200 && data.errorMessage?.code !== 'INFO-000') {
      return { 
        ok: false, 
        data: [], 
        error: data.errorMessage?.message || `API 오류 (${data.errorMessage?.code})`
      }
    }

    const arrivals: SubwayArrival[] = (data.realtimeArrivalList || []).map((item: any) => ({
      trainLineNm: item.trainLineNm || '',
      arvlMsg2: item.arvlMsg2 || '',
      arvlMsg3: item.arvlMsg3 || '',
      updnLine: item.updnLine || ''
    }))

    return { ok: true, data: arrivals, error: null }

  } catch (err: any) {
    console.error('[지하철 API 오류]', cleanName, err.message)
    return { ok: false, data: [], error: err.message }
  }
}
// ===================== 버스 API =====================
// 국가공공데이터포털: ws.bus.go.kr

export async function getRealtimeBus(stId: string): Promise<RealtimeResult<BusArrival>> {
  const key = import.meta.env.VITE_PUBLIC_BUS_API_KEY

  if (!key) return { ok: false, data: [], error: '버스 인증키 없음' }
  if (!stId) return { ok: false, data: [], error: '정류소 ID 없음' }

  try {
    const url = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?ServiceKey=${encodeURIComponent(key)}&stId=${stId}&resultType=json`
    const data = await proxyFetch(url, 15000)

    const header = data.msgHeader
    if (header?.headerCd !== '0') {
      return { 
        ok: false, 
        data: [], 
        error: `버스 API 오류: ${header?.headerMsg || '알 수 없는 오류'} (Code: ${header?.headerCd})`
      }
    }

    const items = data.msgBody?.itemList
    const itemList = Array.isArray(items) ? items : items ? [items] : []

    const arrivals: BusArrival[] = itemList.map((item: any) => ({
      rtNm: item.rtNm || '',
      arrmsg1: item.arrmsg1 || '정보 없음',
      arrmsg2: item.arrmsg2 || '',
      stNm: item.stNm || '',
      adirection: item.adirection || ''
    }))

    return { ok: true, data: arrivals, error: null }

  } catch (err: any) {
    console.error('[버스 API 오류]', stId, err.message)
    return { ok: false, data: [], error: err.message }
  }
}
