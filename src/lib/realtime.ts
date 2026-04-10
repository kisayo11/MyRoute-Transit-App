/**
 * MyRoute 실시간 대중교통 API
 * 
 * 지하철: 서울 열린데이터 광장 (swopenapi.seoul.go.kr) → 테스트 완료 ✅
 * 버스:   국가공공데이터포털 (ws.bus.go.kr) — data.go.kr 키 사용 ✅
 * 
 * 프록시: CORS 우회를 위해 allorigins.win 사용
 */

const PROXY = 'https://api.allorigins.win/raw?url='

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
  const url = PROXY + encodeURIComponent(targetUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!text || text.trim().startsWith('<')) {
      throw new Error('서버가 HTML을 반환했습니다 (CORS/프록시 오류)')
    }
    return JSON.parse(text)
  } catch (err: any) {
    clearTimeout(timer)
    throw err
  }
}

// ===================== 지하철 API =====================
// 서울 열린데이터 광장: swopenapi.seoul.go.kr
// 키: VITE_PUBLIC_SUBWAY_API_KEY (서울 열린데이터 광장 지하철인증키)
// 응답 필드: data.realtimeArrivalList (주의: realtimeStationArrival 아님!)

export async function getRealtimeSubway(stationName: string): Promise<RealtimeResult<SubwayArrival>> {
  const key = import.meta.env.VITE_PUBLIC_SUBWAY_API_KEY
  
  if (!key) {
    return { ok: false, data: [], error: '지하철 인증키 없음 (VITE_PUBLIC_SUBWAY_API_KEY)' }
  }

  // "구의역" → "구의" 처리
  const name = stationName.replace(/역$/, '')

  try {
    const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/10/${encodeURIComponent(name)}`
    const data = await proxyFetch(url)

    // 성공 판정: status 200 or code INFO-000
    const isOk = data.errorMessage?.status === 200 || data.errorMessage?.code === 'INFO-000'
    
    if (!isOk) {
      return { 
        ok: false, 
        data: [], 
        error: data.errorMessage?.message || data.errorMessage?.code || '응답 오류'
      }
    }

    // 실제 응답 필드는 realtimeArrivalList (realtimeStationArrival 아님!)
    const arrivals: SubwayArrival[] = (data.realtimeArrivalList || []).map((item: any) => ({
      trainLineNm: item.trainLineNm || '',
      arvlMsg2: item.arvlMsg2 || '',
      arvlMsg3: item.arvlMsg3 || '',
      updnLine: item.updnLine || ''
    }))

    return { ok: true, data: arrivals, error: null }

  } catch (err: any) {
    console.error('[지하철 API]', stationName, err.message)
    return { ok: false, data: [], error: err.message }
  }
}

// ===================== 버스 API =====================
// 국가공공데이터포털: ws.bus.go.kr
// 키: VITE_PUBLIC_BUS_API_KEY (data.go.kr에서 발급한 서비스키)
// 정류소 ID: startID (ODsay 응답의 9자리 고유 ID)

export async function getRealtimeBus(stId: string): Promise<RealtimeResult<BusArrival>> {
  const key = import.meta.env.VITE_PUBLIC_BUS_API_KEY

  if (!key) {
    return { ok: false, data: [], error: '버스 인증키 없음 (VITE_PUBLIC_BUS_API_KEY)' }
  }
  if (!stId) {
    return { ok: false, data: [], error: '정류소 ID 없음' }
  }

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
    console.error('[버스 API]', stId, err.message)
    return { ok: false, data: [], error: err.message }
  }
}
