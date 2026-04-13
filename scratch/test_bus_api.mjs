import fs from 'fs';
import path from 'path';

// .env 로드
const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    processEnv[key.trim()] = valueParts.join('=').trim();
  }
});

const ODSAY_KEY = processEnv.VITE_ODSAY_API_KEY;
const PUBLIC_BUS_KEY = processEnv.VITE_PUBLIC_BUS_API_KEY;

async function bridgeTest(busNo) {
    const headers = {
        'Referer': 'https://my-route-transit-app.vercel.app/',
        'Origin': 'https://my-route-transit-app.vercel.app/'
    };

    console.log(`--- ID Bridge Test: Bus ${busNo} ---`);
    
    try {
        // 1. ODsay에서 localBusID 찾기
        const searchUrl = `https://api.odsay.com/v1/api/searchBusLane?lang=0&busNo=${busNo}&CID=1000&apiKey=${ODSAY_KEY}`;
        const sRes = await fetch(searchUrl, { headers });
        const sData = await sRes.json();
        const route = sData.result?.lane?.[0];
        
        if (!route || !route.localBusID) {
            console.log('Failed to get localBusID from ODsay.');
            return;
        }

        const localId = route.localBusID;
        console.log(`Step 1: ODsay mapped ${busNo} to Local Route ID: ${localId}`);

        // 2. 공공데이터포털에서 이 ID로 실시간 위치 조회 (getBusPosByRtid)
        // http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid
        const publicUrl = `http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid?serviceKey=${PUBLIC_BUS_KEY}&busRouteId=${localId}&resultType=json`;
        
        console.log(`Step 2: Calling Public Data Portal with ID ${localId}...`);
        const pRes = await fetch(publicUrl);
        const pData = await pRes.json();
        
        if (pData.msgBody?.itemList) {
            console.log('\n🌟 [ULTIMATE SUCCESS!]');
            console.log(`Public Data Portal returned ${pData.msgBody.itemList.length} live buses for this route!`);
            const bus = pData.msgBody.itemList[0];
            console.log(`- Sample Bus [${bus.plainNo}]: Lat ${bus.gpsY}, Lon ${bus.gpsX}`);
        } else {
            console.log('\n❌ Public Data Portal still failing.');
            console.log('Reason:', pData.msgHeader?.headerMsg || 'Unknown Error');
        }

    } catch (err) {
        console.error('Bridge Test Error:', err.message);
    }
}

bridgeTest('140');
