const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY
const BASE_URL = 'https://api.odsay.com/v1/api'

// 정류장/역명 검색 API (장소 검색 대신 확실한 대중교통 노드 검색)
export async function searchStation(stationName: string) {
  try {
    const targetUrl = `${BASE_URL}/searchStation?lang=0&stationName=${encodeURIComponent(stationName)}&apiKey=${ODSAY_API_KEY}&_t=${Date.now()}`
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    // ODsay는 에러를 { error: [{ code, message }] } 배열 형태로 줍니다.
    if (data.error) {
      const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error.msg || 'Unknown ODSay Error'
      throw new Error(msg)
    }
    return data.result?.station || [] // 검색된 정류장/역 리스트 반환
  } catch (error: any) {
    console.error('ODsay searchStation Error:', error.message || error)
    return []
  }
}

// 대중교통 길찾기 API (출발지 X/Y, 도착지 X/Y)
// X: 경도(Longitude), Y: 위도(Latitude)
export async function searchPubTransPath(sx: string, sy: string, ex: string, ey: string, pathType: 0 | 1 | 2 = 0) {
  try {
    const targetUrl = `${BASE_URL}/searchPubTransPathT?lang=0&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&SearchPathType=${pathType}&apiKey=${ODSAY_API_KEY}&_t=${Date.now()}`
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`

    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error) {
      const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error.msg || 'Unknown ODSay Error'
      throw new Error(msg)
    }
    return data.result // 길찾기 결과 반환
  } catch (error: any) {
    console.error('ODsay searchPubTransPath Error:', error.message || error)
    return null
  }
}

// 버스 노선 상세 정보 (노선 경로 XY 좌표 및 전체 정류장 목록)
export async function getBusLaneDetail(busRouteId: string) {
  try {
    const targetUrl = `${BASE_URL}/busLaneDetail?lang=0&busRouteId=${busRouteId}&apiKey=${ODSAY_API_KEY}&_t=${Date.now()}`
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error) {
      const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error.msg || 'Unknown ODSay Error'
      throw new Error(msg)
    }
    return data.result
  } catch (error: any) {
    console.error('ODsay getBusLaneDetail Error:', error.message || error)
    return null
  }
}

// 버스 노선 검색 (노선 번호로 busID, localBusID 등 획득)
export async function searchBusLane(busNo: string) {
  try {
    const targetUrl = `${BASE_URL}/searchBusLane?lang=0&busNo=${busNo}&CID=1000&apiKey=${ODSAY_API_KEY}&_t=${Date.now()}`
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error) {
      const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error.msg || 'Unknown ODSay Error'
      throw new Error(msg)
    }
    return data.result
  } catch (error: any) {
    console.error('ODsay searchBusLane Error:', error.message || error)
    return null
  }
}

// 특정 버스정류장의 세부 정보 조회
export async function getBusStationInfo(stationID: string) {
  try {
    const targetUrl = `${BASE_URL}/busStationInfo?lang=0&stationID=${stationID}&apiKey=${ODSAY_API_KEY}&_t=${Date.now()}`
    const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.error) {
      const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error.msg || 'Unknown ODSay Error'
      throw new Error(msg)
    }
    return data.result
  } catch (error: any) {
    console.error('ODsay getBusStationInfo Error:', error.message || error)
    return null
  }
}
