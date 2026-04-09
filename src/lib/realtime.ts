const PROXY_URL = 'https://api.allorigins.win/raw?url='

// 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장 - 개인 인증키 사용)
export async function getRealtimeSubway(stationName: string) {
  try {
    const cleanName = stationName.replace(/역$/, '')
    const targetUrl = `http://swopenapi.seoul.go.kr/api/subway/${import.meta.env.VITE_SEOUL_SUBWAY_KEY || 'sample'}/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    // 프록시 사용 시 응답 속도를 고려하여 타임아웃을 8초로 상향
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await response.json()
    
    if (data.errorMessage?.status === 200 && data.realtimeStationArrival) {
      return data.realtimeStationArrival.map((item: any) => ({
        trainLineNm: item.trainLineNm,
        arvlMsg2: item.arvlMsg2,
        arvlMsg3: item.arvlMsg3,
        updnLine: item.updnLine
      }))
    }
    return []
  } catch (error) {
    return 'ERROR'
  }
}

// 서울 버스 실시간 도착 정보 (서울열린데이터광장 - 개인 인증키 사용)
export async function getRealtimeBus(arsId: string) {
  try {
    const cleanArsId = arsId.replace(/-/g, '')
    const targetUrl = `http://ws.bus.go.kr/api/rest/arrive/getArriveReturnJson?ServiceKey=${import.meta.env.VITE_SEOUL_BUS_KEY || 'sample'}&arsId=${cleanArsId}&resultType=json`
    const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await response.json()
    
    if (data.msgBody?.itemList) {
      return data.msgBody.itemList.map((item: any) => ({
        rtNm: item.rtNm,
        arrmsg1: item.arrmsg1,
        arrmsg2: item.arrmsg2,
        stNm: item.stNm,
        adirection: item.adirection
      }))
    }
    return []
  } catch (error) {
    return 'ERROR'
  }
}
