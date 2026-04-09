const PROXY_URL = 'https://api.allorigins.win/raw?url='

/**
 * 전역 대중교통 데이터 응답 규격
 */
export interface RealtimeResponse<T> {
  success: boolean;
  data: T[];
  message: string | null;
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Fetch failed after retries');
}

/**
 * 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장)
 */
export async function getRealtimeSubway(stationName: string): Promise<RealtimeResponse<SubwayArrival>> {
  const emptyResponse: RealtimeResponse<SubwayArrival> = { 
    success: false, data: [], message: null, error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const cleanName = stationName.replace(/역$/, '')
    const targetUrl = `http://swopenapi.seoul.go.kr/api/subway/${import.meta.env.VITE_SEOUL_SUBWAY_KEY || 'sample'}/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const text = await fetchWithRetry(url, 15000, 1);
    if (text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버 응답 형식 오류 (HTML)' }
    }

    const data = JSON.parse(text)
    const isSuccess = data.errorMessage?.status === 200 || data.RESULT?.code === 'INFO-000';
    
    if (isSuccess) {
      const arrivals = Array.isArray(data.realtimeStationArrival) ? data.realtimeStationArrival : [];
      return {
        success: true,
        data: arrivals.map((item: any) => ({
          trainLineNm: item.trainLineNm,
          arvlMsg2: item.arvlMsg2,
          arvlMsg3: item.arvlMsg3,
          updnLine: item.updnLine
        })),
        message: data.errorMessage?.message || '정상',
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: data.errorMessage?.message || '정보 없음' }
  } catch (error: any) {
    console.error('Subway API Error:', error)
    return { ...emptyResponse, error: '응답 지연 또는 통신 오류' }
  }
}

/**
 * 서울 버스 실시간 도착 정보 (서울열린데이터광장)
 */
export async function getRealtimeBus(arsId: string): Promise<RealtimeResponse<BusArrival>> {
  const emptyResponse: RealtimeResponse<BusArrival> = { 
    success: false, data: [], message: null, error: null, lastUpdated: new Date().toISOString() 
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
    // 버스 API는 여러가지 응답 구조를 가짐
    const result = data.getArrInfoByStation || data.ServiceResult || data;
    const isSuccess = result.RESULT?.CODE === 'INFO-000' || result.msgHeader?.headerCode === '0';

    if (isSuccess) {
      const items = result.row || (result.msgBody ? result.msgBody.itemList : null) || [];
      const itemList = Array.isArray(items) ? items : [items]
      
      return {
        success: true,
        data: itemList.filter((i:any) => i).map((item: any) => ({
          rtNm: item.rtNm || item.RT_NM,
          arrmsg1: item.arrmsg1 || item.ARV1 || '정보 없음',
          arrmsg2: item.arrmsg2 || item.ARV2 || '',
          stNm: item.stNm || item.ST_NM || '',
          adirection: item.adirection || item.ADIRECTION || ''
        })),
        message: result.RESULT?.MESSAGE || '정상',
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: result.RESULT?.MESSAGE || '도착 정보 없음' }
  } catch (error: any) {
    console.error('Bus API Error:', error)
    return { ...emptyResponse, error: '응답 지연 또는 통신 오류' }
  }
}
