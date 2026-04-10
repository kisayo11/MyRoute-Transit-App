async function testHybridOutput() {
  const seoulKey = "7a47734e756b7361393076584f7171";
  const dataKey = "90b3c5dd75a0ff3685297cf79feb1c617fda90edd7e1679f31be000b8b7fc5a2";
  
  // 1. 서울 버스 테스트 (어린이대공원 정류소 ARS: 05250)
  const arsId = "05250";
  console.log(`\n--- [1단계] 서울시 망 테스트 (ID: ${arsId}) ---`);
  try {
    const res = await fetch(`http://openAPI.seoul.go.kr:8088/${seoulKey}/json/getArrInfoByArsId/1/2/${arsId}`);
    const data = await res.json();
    const rows = data.getArrInfoByArsId?.row || [];
    console.log(`수신된 버스 노선 수: ${rows.length}`);
    rows.forEach((row, i) => {
      console.log(`[노선 ${i+1}] ${row.rtNm}번: ${row.arrmsg1} (${row.adirection} 방면)`);
    });
  } catch(e) { console.log("서울 망 실패 (정상: 외부IP 차단 가능성)"); }

  // 2. 국가 포털 망 테스트 (ID: 113000078)
  const stId = "113000078";
  console.log(`\n--- [2단계] 국가 포털 망 테스트 (ID: ${stId}) ---`);
  try {
    // 포털 망은 30번 에러가 날 수 있으므로 결과 구조가 잘 매핑되는지만 시뮬레이션
    const res = await fetch(`http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?serviceKey=${dataKey}&stId=${stId}&resultType=json`);
    const data = await res.json();
    console.log("포털 망 응답 상태:", data.msgHeader?.headerMsg);
  } catch(e) { console.log("포털 망 실패"); }
}

testHybridOutput();
