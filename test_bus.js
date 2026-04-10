async function testBusAPI(key, label) {
  // 서울 마포역 정류소 ID: 113000078
  const stId = "113000078"; 
  const url = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?ServiceKey=${key}&stId=${stId}&resultType=json`;
  
  try {
    console.log(`[${label}] Fetching: ${url}`);
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[${label}] Status: ${res.status}`);
    console.log(`[${label}] Response: ${text.substring(0, 300)}`);
  } catch (e) {
    console.error(`[${label}] Failed: ${e.message}`);
  }
}

async function runTests() {
  const userKey = "90b3c5dd75a0ff3685297cf79feb1c617fda90edd7e1679f31be000b8b7fc5a2";
  
  // 1. 그대로 사용
  await testBusAPI(userKey, "Direct");
  
  // 2. 인코딩해서 사용
  await testBusAPI(encodeURIComponent(userKey), "Encoded");
}

runTests();
