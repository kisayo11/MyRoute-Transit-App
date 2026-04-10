async function testSeoulAPI() {
  const url = "http://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/10/잠실";
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log("Seoul API Response OK. Status:", res.status);
    console.log("Sample:", text.substring(0, 100));
  } catch(e) {
    console.error("Seoul API fetch failed:", e.message);
  }
}

async function testVercelLikeFunction() {
  const urlParam = encodeURIComponent("http://swopenapi.seoul.go.kr/api/subway/sample/json/realtimeStationArrival/0/10/잠실");
  
  // Vercel gives req.query.url ALREADY DECODED usually if we use Express-like syntax, 
  // but let's see how decodeURIComponent behaves
  try {
    const decodedUrl = decodeURIComponent(urlParam);
    console.log("Decoded:", decodedUrl);
    
    const apiResponse = await fetch(decodedUrl);
    console.log("Proxy Fetch OK:", apiResponse.status);
  } catch(e) {
    console.error("Vercel Proxy Logic failed:", e.message);
  }
}

testSeoulAPI().then(testVercelLikeFunction);
