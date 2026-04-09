const PROXY_URL = 'https://api.allorigins.win/raw?url='

/**
 * 전역 대중교통 데이터 응답 규격
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
 * 타임아웃 및 재시도 로직을 포함한 안전한 페처
 */
async function fetchWithRetry(url: string, timeout = 15000, retries = 1): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err: any) {
      if (i === retries) throw err;
      console.warn(`Retrying fetch (${i + 1}/${retries})...`, err.message);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기 후 재시도
    }
  }
  throw new Error('Fetch failed after retries');
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
    
    // 재시도 로직 및 15초 타임아웃 적용
    const text = await fetchWithRetry(url, 15000, 1);
    
    if (text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버 응답 형식 오류 (HTML)' }
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
    
    return { ...emptyResponse, error: data.errorMessage?.message || '도착 예정 기차가 없습니다.' }
  } catch (error: any) {
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');
    return { ...emptyResponse, error: isTimeout ? '응답 지연 (서버 혼잡)' : '지하철 정보 수신 실패' }
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
    const targetUrl = `http://openapi.seoul.go.kr:8088/${import.meta.env.VITE_SEOUL_BUS_KEY || 'sample'}/json/getArrInfoByStation/1/5/${cleanArsId}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const text = await fetchWithRetry(url, 15000, 1);

    if (text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버 응답 형식 오류 (HTML)' }
    }

    const data = JSON.parse(text)
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
    
    return { ...emptyResponse, error: '도착 정보가 없습니다.' }
  } catch (error: any) {
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');
    return { ...emptyResponse, error: isTimeout ? '응답 지연 (서버 혼잡)' : '버스 정보 수신 실패' }
  }
}
