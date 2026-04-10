async function testODsayDirect() {
  const apiKey = "MRLl/HaG2tBkK/W89T/OXw";
  const stationName = "잠실";
  const url = `https://api.odsay.com/v1/api/searchStation?lang=0&stationName=${encodeURIComponent(stationName)}&apiKey=${encodeURIComponent(apiKey)}`;
  
  try {
    console.log("Fetching ODsay:", url);
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    const data = await res.json();
    console.log("ODsay Status:", res.status);
    console.log("ODsay Data:", JSON.stringify(data).substring(0, 200));
  } catch(e) {
    console.error("ODsay Fetch Failed:", e.message);
  }
}

testODsayDirect();
