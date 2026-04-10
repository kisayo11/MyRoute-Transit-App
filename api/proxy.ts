export default async function handler(req, res) {
  // CORS 허용 (모든 도메인 또는 배포된 도메인)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 브라우저의 사전 요청(Preflight) 응답 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is missing' });
  }

  try {
    const encodedUrl = decodeURIComponent(url as string);
    const apiResponse = await fetch(encodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      }
    });

    const contentType = apiResponse.headers.get('content-type');
    
    // API 응답 코드가 정상이 아닐 경우
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({ error: `API responded with status ${apiResponse.status}` });
    }

    // 텍스트 형태로 받아오기 (JSON, XML 모두 대응 가능하도록)
    const data = await apiResponse.text();
    
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    res.status(200).send(data);
  } catch (error: any) {
    console.error('Vercel Proxy Error:', error.message);
    res.status(500).json({ error: `Vercel Proxy Failed: ${error.message}` });
  }
}
