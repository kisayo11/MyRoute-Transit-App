-- 1. 나의 경로(즐겨찾기) 정보 저장용 테이블 생성
create table public.routes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null, -- 예: "출근길", "퇴근길" 등 사용자가 지정한 이름
  start_point jsonb not null, -- 출발지 정보 (명칭, 좌표 등)
  end_point jsonb not null, -- 도착지 정보 (명칭, 좌표 등)
  path_info jsonb not null, -- 커스텀한 세부 경로 정보 (환승역, 정류장, 사용할 교통단 등)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 보안(RLS) 활성화: 오직 본인(로그인한 유저)의 경로만 접근 가능하도록 방어
alter table public.routes enable row level security;

create policy "개인 경로 조회 허용"
  on public.routes for select
  using ( auth.uid() = user_id );

create policy "개인 경로 생성 허용"
  on public.routes for insert
  with check ( auth.uid() = user_id );

create policy "개인 경로 수정 허용"
  on public.routes for update
  using ( auth.uid() = user_id );

create policy "개인 경로 삭제 허용"
  on public.routes for delete
  using ( auth.uid() = user_id );
