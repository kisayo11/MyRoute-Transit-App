const ODSAY_API_KEY = import.meta.env.VITE_ODSAY_API_KEY
const BASE_URL = 'https://api.odsay.com/v1/api'

// 정류장/역명 검색 API (장소 검색 대신 확실한 대중교통 노드 검색)
export async function searchStation(stationName: string) {
  try {
    const url = `${BASE_URL}/searchStation?lang=0&stationName=${encodeURIComponent(stationName)}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.error) throw new Error(data.error.msg)
    return data.result?.station || [] // 검색된 정류장/역 리스트 반환
  } catch (error) {
    console.error('ODsay searchStation Error:', error)
    return []
  }
}

// 대중교통 길찾기 API (출발지 X/Y, 도착지 X/Y)
// X: 경도(Longitude), Y: 위도(Latitude)
export async function searchPubTransPath(sx: string, sy: string, ex: string, ey: string, pathType: 0 | 1 | 2 = 0) {
  try {
    const url = `${BASE_URL}/searchPubTransPathT?lang=0&SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&SearchPathType=${pathType}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.error) throw new Error(data.error.msg)
    return data.result // 길찾기 결과 반환
  } catch (error) {
    console.error('ODsay searchPubTransPath Error:', error)
    return null
  }
}
