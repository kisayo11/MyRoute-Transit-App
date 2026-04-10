async function testStation(name) {
  const apiKey = "76477976536b736136354950487151";
  const url = `http://swopenapi.seoul.go.kr/api/subway/${apiKey}/json/realtimeStationArrival/0/10/${encodeURIComponent(name)}`;
  
  try {
    console.log(`Testing station: ${name}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status for ${name}:`, data.errorMessage?.status);
    console.log(`Message for ${name}:`, data.errorMessage?.message);
    if (data.realtimeArrivalList) {
        console.log(`Arrivals found: ${data.realtimeArrivalList.length}`);
    } else {
        console.log("No arrivals found.");
    }
  } catch(e) {
    console.error(`Fetch failed for ${name}:`, e.message);
  }
}

async function runTests() {
  await testStation("어린이대공원");
  await testStation("어린이대공원(세종대)");
}

runTests();
