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
    // Vercel의 req.query.url은 이미 한 번 디코딩된 상태이므로, 
    // 여기서 추가로 decodeURIComponent를 하지 않아야 원본 인코딩 값이 보존됩니다.
    const targetUrl = url as string;
    console.log('Target URL:', targetUrl);

    // 서울시 및 ODsay API의 도메인/보안 차단 회피를 위한 헤더 구성
    const apiResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': (req.headers.referer as string) || 'https://my-route-transit-app.vercel.app/',
        'Origin': (req.headers.origin as string) || 'https://my-route-transit-app.vercel.app/'
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
  } catch (error) {
    const err = error as Error;
    console.error('Vercel Proxy Fatal Error:', err.message);
    res.status(500).json({ error: 'Proxy Exception', message: err.message });
  }
}
