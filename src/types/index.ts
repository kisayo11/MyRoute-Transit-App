export interface RealtimeResult<T> {
  ok: boolean
  data: T[]
  error: string | null
}

export interface SubwayArrival {
  subwayId: string     // "1002" 등 노선 식별자
  trainLineNm: string  // "2호선 - 성수행"
  arvlMsg2: string     // "2분 후"
  arvlMsg3: string     // "현재 구의역"
  updnLine: string     // "상행" | "하행" | "내선" | "외선"
}

export interface BusArrival {
  rtNm: string         // 노선번호 "4425"
  arrmsg1: string      // "3분 후 [1번째 전]"
  arrmsg2: string      // "15분 후 [5번째 전]"
  stNm: string         // 정류소명
  adirection: string   // 진행방향
}

export interface Route {
  id?: string
  user_id?: string
  name: string
  start_point: Record<string, unknown>
  end_point: Record<string, unknown>
  path_info: Record<string, unknown>
  created_at?: string
  start_place?: string
  end_place?: string
}
