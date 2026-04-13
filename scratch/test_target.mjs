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

async function checkBokjeongExit3() {
    const headers = {
        'Referer': 'https://my-route-transit-app.vercel.app/',
        'Origin': 'https://my-route-transit-app.vercel.app/'
    };

    try {
        // 복정역3번출구 ID: 150885
        const sid = '150885';
        const url = `https://api.odsay.com/v1/api/getBusArrivalInfo?lang=0&stationID=${sid}&apiKey=${ODSAY_KEY}`;
        
        const res = await fetch(url, { headers });
        const data = await res.json();
        
        console.log(`\n--- Real-time: 복정역 3번출구 (24435) ---`);
        if (data.result?.real) {
            console.log(`✅ Success! Found ${data.result.real.length} buses.`);
            data.result.real.forEach(b => {
                console.log(`- ${b.routeNm}번: ${b.arrivalMsg} (${b.nextStationName} 방면)`);
            });
        } else {
            console.log('No buses arriving at this moment.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkBokjeongExit3();
