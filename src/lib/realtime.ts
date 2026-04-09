const PROXY_URL = 'https://corsproxy.io/?url='

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
  trainLineNm: string; // "2호선 - 성수행"
  arvlMsg2: string;    // "1분 30초 후"
  arvlMsg3: string;    // "현재 구의역"
  updnLine: string;    // "상행/하행"
}

export interface BusArrival {
  rtNm: string;      // "4425"
  arrmsg1: string;   // "3분 5초후[1번째 전]"
  arrmsg2: string;   // "11분 2초후[5번째 전]"
  stNm: string;      // "복정역3번출구"
  adirection: string;// "장지동방향"
}

/**
 * 타임아웃 및 재시도 로직을 포함한 안전한 페처
 */
async function fetchWithRetry(url: string, timeout = 10000, retries = 1): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (err: any) {
      if (i === retries) throw err;
      console.warn(`Retrying fetch (${i + 1}/${retries})...`, err.message);
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  throw new Error('Fetch failed after retries');
}

/**
 * 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장 - 표준 포트 80)
 */
export async function getRealtimeSubway(stationName: string): Promise<RealtimeResponse<SubwayArrival>> {
  const emptyResponse: RealtimeResponse<SubwayArrival> = { 
    success: false, data: [], message: null, error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const key = import.meta.env.VITE_PUBLIC_SUBWAY_API_KEY || import.meta.env.VITE_SEOUL_SUBWAY_KEY;
    if (!key) return { ...emptyResponse, error: '인증키가 설정되지 않았습니다' };

    const cleanName = stationName.replace(/역$/, '')
    const targetUrl = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/10/${encodeURIComponent(cleanName)}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const text = await fetchWithRetry(url, 10000, 1);
    if (!text || text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버 응답 오류 (HTML)' }
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
    
    return { ...emptyResponse, error: data.errorMessage?.message || '미운행 또는 정보 없음' }
  } catch (error: any) {
    console.error('Subway API Error:', error)
    return { ...emptyResponse, error: '응답 지연 또는 통신 오류' }
  }
}

/**
 * 서울 버스 실시간 도착 정보 (국가 공공데이터 포털 - ws.bus.go.kr)
 * @param stId 9자리 고유 정류소 ID
 */
export async function getRealtimeBus(stId: string): Promise<RealtimeResponse<BusArrival>> {
  const emptyResponse: RealtimeResponse<BusArrival> = { 
    success: false, data: [], message: null, error: null, lastUpdated: new Date().toISOString() 
  }

  try {
    const key = import.meta.env.VITE_PUBLIC_BUS_API_KEY || import.meta.env.VITE_SEOUL_BUS_KEY;
    if (!key) return { ...emptyResponse, error: '인증키가 설정되지 않았습니다' };

    const targetUrl = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?ServiceKey=${key}&stId=${stId}&resultType=json`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const text = await fetchWithRetry(url, 10000, 1);
    if (!text || text.trim().startsWith('<!DOCTYPE')) {
      return { ...emptyResponse, error: '서버가 응답하지 않습니다' }
    }

    const data = JSON.parse(text)
    const header = data.msgHeader;
    const isSuccess = header?.headerCd === '0';

    if (isSuccess) {
      const items = data.msgBody?.itemList || [];
      const itemList = Array.isArray(items) ? items : [items];
      
      return {
        success: true,
        data: itemList.filter(i => i).map((item: any) => ({
          rtNm: item.rtNm,
          arrmsg1: item.arrmsg1,
          arrmsg2: item.arrmsg2,
          stNm: item.stNm,
          adirection: item.adirection
        })),
        message: header?.headerMsg || '정상',
        error: null,
        lastUpdated: new Date().toISOString()
      }
    }
    
    return { ...emptyResponse, error: header?.headerMsg || '도착 정보 없음' }
  } catch (error: any) {
    console.error('Bus API Error:', error)
    return { ...emptyResponse, error: '응답 지연 또는 통신 오류' }
  }
}
