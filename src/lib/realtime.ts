// 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장 - sample 키 사용)
export async function getRealtimeSubway(stationName: string) {
  try {
    // "역" 자가 붙어있으면 제거 (예: 구의역 -> 구의)
    const cleanName = stationName.replace(/역$/, '')
    const url = `https://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) }) // 5초 타임아웃
    const data = await response.json()
    
    if (data.errorMessage?.status === 200 && data.realtimeStationArrival) {
      return data.realtimeStationArrival.map((item: any) => ({
        trainLineNm: item.trainLineNm,
        arvlMsg2: item.arvlMsg2,
        arvlMsg3: item.arvlMsg3,
        updnLine: item.updnLine
      }))
    }
    return [] // 데이터 없음
  } catch (error) {
    return 'ERROR' // 에러 발생 상태
  }
}

// 서울 버스 실시간 도착 정보 (서울열린데이터광장 - sample 키 사용)
export async function getRealtimeBus(arsId: string) {
  try {
    const cleanArsId = arsId.replace(/-/g, '')
    const url = `https://ws.bus.go.kr/api/rest/arrive/getArriveReturnJson?ServiceKey=sample&arsId=${cleanArsId}&resultType=json`
    
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
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
