const PROXY_URL = 'https://api.allorigins.win/raw?url='

/**
 * 전역 대중교통 데이터 응답 규격
 * 기술적 안정성을 위해 모든 API 반환값을 이 객체로 통일합니다.
 */
export interface RealtimeResponse<T> {
  success: boolean;
  data: T[];
  error: string | null;
  lastUpdated: string;
}

export interface SubwayArrival {
  trainLineNm: string;
  arvlMsg2: string;
  arvlMsg3: string;
  updnLine: string;
}

export interface BusArrival {
  rtNm: string;
  arrmsg1: string;
  arrmsg2: string;
  stNm: string;
  adirection: string;
}

/**
 * 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장)
 */
export async function getRealtimeSubway(stationName: string): Promise<RealtimeResponse<SubwayArrival>> {
  const emptyResponse: RealtimeResponse<SubwayArrival> = { 
    success: false, data: [], error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const cleanName = stationName.replace(/역$/, '')
    const targetUrl = `http://swopenapi.seoul.go.kr/api/subway/${import.meta.env.VITE_SEOUL_SUBWAY_KEY || 'sample'}/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
    
    const data = await response.json()
    
    if (data.errorMessage?.status === 200 && Array.isArray(data.realtimeStationArrival)) {
      return {
        success: true,
        data: data.realtimeStationArrival.map((item: any) => ({
          trainLineNm: item.trainLineNm,
          arvlMsg2: item.arvlMsg2,
          arvlMsg3: item.arvlMsg3,
          updnLine: item.updnLine
        })),
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: data.errorMessage?.message || '실시간 정보가 없습니다.' }
  } catch (error: any) {
    console.error('Subway API Error:', error)
    return { ...emptyResponse, error: error.message || '통신 장애가 발생했습니다.' }
  }
}

/**
 * 서울 버스 실시간 도착 정보 (서울열린데이터광장)
 */
export async function getRealtimeBus(arsId: string): Promise<RealtimeResponse<BusArrival>> {
  const emptyResponse: RealtimeResponse<BusArrival> = { 
    success: false, data: [], error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const cleanArsId = arsId.replace(/-/g, '')
    const targetUrl = `http://ws.bus.go.kr/api/rest/arrive/getArriveReturnJson?ServiceKey=${import.meta.env.VITE_SEOUL_BUS_KEY || 'sample'}&arsId=${cleanArsId}&resultType=json`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
    
    const data = await response.json()
    
    if (data.msgBody?.itemList) {
      const itemList = Array.isArray(data.msgBody.itemList) ? data.msgBody.itemList : [data.msgBody.itemList]
      return {
        success: true,
        data: itemList.map((item: any) => ({
          rtNm: item.rtNm,
          arrmsg1: item.arrmsg1,
          arrmsg2: item.arrmsg2,
          stNm: item.stNm,
          adirection: item.adirection
        })),
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: '도착 정보가 없습니다.' }
  } catch (error: any) {
    console.error('Bus API Error:', error)
    return { ...emptyResponse, error: error.message || '통신 장애가 발생했습니다.' }
  }
}
