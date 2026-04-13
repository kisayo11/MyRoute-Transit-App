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

async function finalizeSuccess(sid) {
  const headers = {
    'Referer': 'https://my-route-transit-app.vercel.app/',
    'Origin': 'https://my-route-transit-app.vercel.app/'
  };

  try {
    const arrivalUrl = `https://api.odsay.com/v1/api/getBusArrivalInfo?lang=0&stationID=${sid}&apiKey=${ODSAY_KEY}`;
    const res = await fetch(arrivalUrl, { headers });
    const data = await res.json();
    
    if (data.result?.real) {
      console.log(`\n✅ FINAL SUCCESS: Real-time data for Station ${sid} received!`);
      data.result.real.slice(0, 3).forEach(b => {
          console.log(`- Bus ${b.routeNm}: ${b.arrivalMsg} (${b.nextStationName} 방면)`);
      });
    } else {
        console.log('No data found for this specific station ID right now.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// 숭실대입구역 버스 정류소 중 하나 (104130)
finalizeSuccess('104130');
