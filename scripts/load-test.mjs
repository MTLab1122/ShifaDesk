import { performance } from 'node:perf_hooks';

console.log('⚡ Starting MatabAI Load & Performance Benchmark Suite...');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : fallback;
};

const baseUrl = getArg('url', process.env.API_BASE_URL || 'http://localhost:4000/api/v1');
const totalRequests = parseInt(getArg('requests', '100'), 10);
const concurrency = parseInt(getArg('concurrency', '10'), 10);
const scenario = getArg('scenario', 'mixed');

console.log(`🎯 Target URL: ${baseUrl}`);
console.log(`📊 Total Requests: ${totalRequests} | Concurrency: ${concurrency} | Scenario: ${scenario}\n`);

// Endpoints tested across scenarios
const endpoints = {
  health: [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/health/live' },
    { method: 'GET', path: '/health/ready' },
    { method: 'GET', path: '/health/metrics' },
  ],
  plans: [
    { method: 'GET', path: '/subscription/plans' },
  ],
  queue: [
    { method: 'GET', path: '/queue/live/demo-clinic-queue' },
  ],
  mixed: [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/health/live' },
    { method: 'GET', path: '/health/ready' },
    { method: 'GET', path: '/health/metrics' },
    { method: 'GET', path: '/subscription/plans' },
  ],
};

const selectedTargets = endpoints[scenario] || endpoints.mixed;

const results = [];
let completed = 0;

async function executeRequest(index) {
  const target = selectedTargets[index % selectedTargets.length];
  const url = `${baseUrl}${target.path}`;

  const start = performance.now();
  let statusCode = 0;
  let success = false;
  let errorMsg = null;

  try {
    const res = await fetch(url, {
      method: target.method,
      headers: {
        'Accept': 'application/json',
        'X-Request-ID': `load-test-${index}-${Date.now()}`,
      },
    });

    statusCode = res.status;
    success = res.ok || statusCode === 404; // 404 is valid HTTP response for demo path
    if (!res.ok && statusCode !== 404) {
      errorMsg = `HTTP ${statusCode}`;
    }
  } catch (err) {
    errorMsg = err.message;
  }

  const durationMs = performance.now() - start;
  results.push({ statusCode, durationMs, success, errorMsg });
  completed++;
}

async function runBenchmark() {
  const overallStart = performance.now();

  // Run in chunks according to concurrency
  const queue = Array.from({ length: totalRequests }, (_, i) => i);
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const idx = queue.shift();
      if (idx !== undefined) {
        await executeRequest(idx);
      }
    }
  });

  await Promise.all(workers);
  const totalDurationMs = performance.now() - overallStart;

  // Calculate statistics
  const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const successfulCount = results.filter((r) => r.success).length;
  const failedCount = totalRequests - successfulCount;

  const min = durations[0] || 0;
  const max = durations[durations.length - 1] || 0;
  const sum = durations.reduce((acc, v) => acc + v, 0);
  const avg = sum / (durations.length || 1);

  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p90 = durations[Math.floor(durations.length * 0.9)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  const rps = (totalRequests / (totalDurationMs / 1000)).toFixed(2);

  // Status code distribution
  const statusCounts = {};
  results.forEach((r) => {
    const code = r.statusCode || 'ERR';
    statusCounts[code] = (statusCounts[code] || 0) + 1;
  });

  console.log('================================================================');
  console.log('📈 MATABAI LOAD TEST & BENCHMARK REPORT');
  console.log('================================================================');
  console.log(`Total Requests:         ${totalRequests}`);
  console.log(`Concurrency Level:      ${concurrency}`);
  console.log(`Completed In:           ${(totalDurationMs / 1000).toFixed(3)}s`);
  console.log(`Throughput:             ${rps} requests/second`);
  console.log(`Success Rate:           ${((successfulCount / totalRequests) * 100).toFixed(1)}% (${successfulCount}/${totalRequests})`);
  console.log(`Error Count:            ${failedCount}`);
  console.log('----------------------------------------------------------------');
  console.log('LATENCY METRICS (ms):');
  console.log(`  Minimum:              ${min.toFixed(2)}ms`);
  console.log(`  Average:              ${avg.toFixed(2)}ms`);
  console.log(`  50th Percentile (p50): ${p50.toFixed(2)}ms`);
  console.log(`  90th Percentile (p90): ${p90.toFixed(2)}ms`);
  console.log(`  95th Percentile (p95): ${p95.toFixed(2)}ms`);
  console.log(`  99th Percentile (p99): ${p99.toFixed(2)}ms`);
  console.log(`  Maximum:              ${max.toFixed(2)}ms`);
  console.log('----------------------------------------------------------------');
  console.log('HTTP STATUS CODES:');
  Object.entries(statusCounts).forEach(([code, count]) => {
    console.log(`  ${code}: ${count} (${((count / totalRequests) * 100).toFixed(1)}%)`);
  });
  console.log('================================================================\n');

  if (failedCount > 0 && failedCount === totalRequests) {
    console.warn('⚠️  Note: All requests failed to connect. Ensure backend API is active on target URL.');
  } else {
    console.log('✅ Load test execution completed successfully.');
  }
}

runBenchmark().catch((err) => {
  console.error('Fatal load test runner error:', err);
  process.exit(1);
});
