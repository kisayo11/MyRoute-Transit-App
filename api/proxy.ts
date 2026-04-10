export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const targetUrl = decodeURIComponent(url as string);
    console.log('Target URL:', targetUrl);

    // 서울시 API는 브라우저 User-Agent가 없으면 차단하는 경우가 있음
    const apiResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Response Error:', apiResponse.status, errorText);
      return res.status(apiResponse.status).json({ 
        error: `Target API returned ${apiResponse.status}`,
        detail: errorText.substring(0, 100)
      });
    }

    const contentType = apiResponse.headers.get('content-type');
    const data = await apiResponse.text();

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // 캐시 무효화 헤더 강제 주입
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(data);
  } catch (error: any) {
    console.error('Vercel Proxy Fatal Error:', error.message);
    res.status(500).json({ error: 'Proxy Exception', message: error.message });
  }
}
