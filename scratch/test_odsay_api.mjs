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

async function testOdsayWithHeaders() {
  console.log('--- ODsay API Test ---');
  
  try {
    const headers = {
      'Referer': 'https://my-route-transit-app.vercel.app/',
      'Origin': 'https://my-route-transit-app.vercel.app/',
      'User-Agent': 'Mozilla/5.0'
    };

    const searchUrl = `https://api.odsay.com/v1/api/searchStation?lang=0&stationName=${encodeURIComponent('숭실대입구')}&apiKey=${ODSAY_KEY}`;
    console.log('1. Calling Search API...');
    
    const searchRes = await fetch(searchUrl, { headers });
    console.log('Status Code:', searchRes.status);
    
    const searchData = await searchRes.json();
    console.log('Search Raw Data received.');
    
    if (searchData.error) {
      console.log('Search Error:', JSON.stringify(searchData.error));
      return;
    }

    const stations = searchData.result?.station || [];
    console.log('Stations found:', stations.length);

    if (stations.length > 0) {
        const sid = stations[0].stationID;
        console.log('2. Calling Arrival API with StationID:', sid);
        const arrivalUrl = `https://api.odsay.com/v1/api/getBusArrivalInfo?lang=0&stationID=${sid}&apiKey=${ODSAY_KEY}`;
        const arRes = await fetch(arrivalUrl, { headers });
        const arData = await arRes.json();
        console.log('Arrival Data Status:', arRes.status);
        if (arData.result) {
            console.log('SUCCESS! Found buses:', arData.result.real?.length);
            if (arData.result.real?.[0]) console.log('Sample:', arData.result.real[0].routeNm);
        } else {
            console.log('Arrival Error:', JSON.stringify(arData.error));
        }
    }

  } catch (err) {
    console.log('FATAL ERROR:', err.message);
  }
}

testOdsayWithHeaders();
