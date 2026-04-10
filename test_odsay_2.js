async function testODsayNoEncode() {
  const apiKey = "MRLl/HaG2tBkK/W89T/OXw";
  const stationName = encodeURIComponent("잠실");
  // 키를 인코딩하지 않고 그대로 박아서 날려봅니다.
  const url = `https://api.odsay.com/v1/api/searchStation?lang=0&stationName=${stationName}&apiKey=${apiKey}`;
  
  try {
    console.log("Fetching ODsay (No apiKey encode):", url);
    const res = await fetch(url);
    const data = await res.json();
    console.log("ODsay Status:", res.status);
    console.log("ODsay Data:", JSON.stringify(data));
  } catch(e) {
    console.error("ODsay Fetch Failed:", e.message);
  }
}

testODsayNoEncode();
