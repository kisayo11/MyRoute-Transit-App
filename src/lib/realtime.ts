// 서울/수도권 지하철 실시간 도착 정보 (서울열린데이터광장 - sample 키 사용)
export async function getRealtimeSubway(stationName: string) {
  try {
    // "역" 자가 붙어있으면 제거 (예: 구의역 -> 구의)
    const cleanName = stationName.replace(/역$/, '')
    const url = `http://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/5/${encodeURIComponent(cleanName)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.errorMessage?.status === 200 && data.realtimeStationArrival) {
      // 상/하행 분리 및 정리
      return data.realtimeStationArrival.map((item: any) => ({
        trainLineNm: item.trainLineNm, // "성수행 - 구의방면"
        arvlMsg2: item.arvlMsg2, // "전역 도착", "3분 후" 등
        arvlMsg3: item.arvlMsg3, // "성수"
        updnLine: item.updnLine // "상행" / "하행"
      }))
    }
    return null
  } catch (error) {
    console.error('Realtime Subway API Error:', error)
    return null
  }
}

// 서울 버스 실시간 도착 정보 (서울열린데이터광장 - sample 키 사용)
export async function getRealtimeBus(arsId: string) {
  try {
    // arsId가 "24-470" 같은 형식이면 "-" 제거 (API는 숫자만 받음)
    const cleanArsId = arsId.replace(/-/g, '')
    const url = `http://ws.bus.go.kr/api/rest/arrive/getArriveReturnJson?ServiceKey=sample&arsId=${cleanArsId}&resultType=json`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.msgBody?.itemList) {
      return data.msgBody.itemList.map((item: any) => ({
        rtNm: item.rtNm, // 버스 번호 (예: 4425)
        arrmsg1: item.arrmsg1, // "3분 12초 후[0번째 전]"
        arrmsg2: item.arrmsg2, // "6분 5초 후[3번째 전]"
        stNm: item.stNm, // 정류장 이름
        adirection: item.adirection // 방향
      }))
    }
    return null
  } catch (error) {
    console.error('Realtime Bus API Error:', error)
    return null
  }
}
