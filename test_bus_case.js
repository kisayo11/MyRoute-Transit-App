async function testBusAPI(paramName) {
  const key = "90b3c5dd75a0ff3685297cf79feb1c617fda90edd7e1679f31be000b8b7fc5a2";
  const stId = "113000078"; 
  const url = `http://ws.bus.go.kr/api/rest/arrive/getLowArrInfoByStId?${paramName}=${encodeURIComponent(key)}&stId=${stId}&resultType=json`;
  
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[Param: ${paramName}] Response: ${text.substring(0, 200)}`);
  } catch (e) {
    console.error(`[Param: ${paramName}] Failed: ${e.message}`);
  }
}

async function runTests() {
  await testBusAPI("ServiceKey");
  await testBusAPI("serviceKey");
}

runTests();
