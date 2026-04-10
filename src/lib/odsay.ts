const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY
const BASE_URL = 'https://api.odsay.com/v1/api'

// 정류장/역명 검색 API (장소 검색 대신 확실한 대중교통 노드 검색)
export async function searchStation(stationName: string) {
  try {
    const targetUrl = `${BASE_URL}/searchStation?lang=0&stationName=${encodeURIComponent(stationName)}&apiKey=${ODSAY_API_KEY}`
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
    const targetUrl = `${BASE_URL}/searchPubTransPathT?lang=0&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&SearchPathType=${pathType}&apiKey=${ODSAY_API_KEY}`
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
