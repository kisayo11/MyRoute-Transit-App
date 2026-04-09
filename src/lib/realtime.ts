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
    const text = await response.text()
    
    // HTML 응답 방어 (SyntaxError 방지)
    if (text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버 점검 중 (HTML 응답)' }
    }

    const data = JSON.parse(text)
    
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
    return { ...emptyResponse, error: '데이터를 불러올 수 없습니다.' }
  }
}

/**
 * 서울 버스 실시간 도착 정보 (서울열린데이터광장 - 신규 엔드포인트)
 * 주소: http://openapi.seoul.go.kr:8088/{key}/json/getArrInfoByStation/1/5/{arsId}
 */
export async function getRealtimeBus(arsId: string): Promise<RealtimeResponse<BusArrival>> {
  const emptyResponse: RealtimeResponse<BusArrival> = { 
    success: false, data: [], error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const cleanArsId = arsId.replace(/-/g, '')
    // 서울 열린데이터 광장 공식 엔드포인트 (포지셔널 파라미터 방식)
    const targetUrl = `http://openapi.seoul.go.kr:8088/${import.meta.env.VITE_SEOUL_BUS_KEY || 'sample'}/json/getArrInfoByStation/1/5/${cleanArsId}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const text = await response.text()

    if (text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '버스 API 서버 점검 중' }
    }

    const data = JSON.parse(text)
    
    // 서울시 API 응답 구조: { ServiceResult: { msgBody: { itemList: [...] } } } 또는 { getArrInfoByStation: { row: [...] } }
    // 공통적으로 사용하는 getArrInfoByStation 구조 대응
    const result = data.getArrInfoByStation || data.ServiceResult || {}
    const items = result.row || (result.msgBody ? result.msgBody.itemList : null)

    if (items) {
      const itemList = Array.isArray(items) ? items : [items]
      return {
        success: true,
        data: itemList.map((item: any) => ({
          rtNm: item.rtNm || item.RT_NM,
          arrmsg1: item.arrmsg1 || item.ARV1 || '정보 없음',
          arrmsg2: item.arrmsg2 || item.ARV2 || '',
          stNm: item.stNm || item.ST_NM || '',
          adirection: item.adirection || item.ADIRECTION || ''
        })),
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: '버스 도착 정보가 없습니다.' }
  } catch (error: any) {
    console.error('Bus API Error:', error)
    return { ...emptyResponse, error: '버스 정보를 불러올 수 없습니다.' }
  }
}
