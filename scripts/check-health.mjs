const targetUrl = process.env.API_HEALTH_URL || 'http://localhost:4000/api/v1/health';

console.log(`🩺 Checking MatabAI API Health at ${targetUrl}...`);

async function check() {
  try {
    const res = await fetch(targetUrl);
    const body = await res.json();
    console.log(`📡 Status Code: ${res.status}`);
    console.log('📦 Response Body:\n', JSON.stringify(body, null, 2));

    if (res.ok && body.status) {
      console.log('✅ Health check passed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Health check returned non-healthy response.');
      process.exit(1);
    }
  } catch (err) {
    console.error(`❌ Health check connection failed: ${err.message}`);
    process.exit(1);
  }
}

check();
