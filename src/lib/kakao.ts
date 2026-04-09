// 카카오 API의 심사인증 과정(비즈앱)이 번거로우므로,
// 가입이나 인증이 아예 필요 없는 완전 무료 글로벌 오픈소스 API(OpenStreetMap)로 교체합니다.

const BASE_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlaces(keyword: string) {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(keyword)}&format=json&accept-language=ko&countrycodes=kr`, {
      headers: {
        'User-Agent': 'MyRouteApp/1.0' // OpenStreetMap 필수 규약
      }
    })
    const data = await response.json()
    if (data && data.length > 0) {
      return data.map((doc: any) => {
        // 주소를 한국식으로 정제
        const addressParts = doc.display_name.split(',').map((s: string) => s.trim()).reverse()
        // 대한민국, 우편번호 등 불필요한 뒷부분 제거 및 정돈
        const cleanAddress = addressParts.filter((p: string) => p !== '대한민국' && !/^[0-9]+$/.test(p)).join(' ')
        
        return {
          placeName: doc.name || doc.display_name.split(',')[0],
          address: cleanAddress || doc.display_name,
          x: doc.lon,
          y: doc.lat
        }
      })
    }
    return []
  } catch (error) {
    console.error('OpenStreetMap searchPlaces Error:', error)
    return []
  }
}
