
import { performance } from 'perf_hooks';

function aggregateMetricsBaseline(
  scenarioName,
  requests,
  totalTimeMs
) {
  const successful = requests.filter((r) => r.success);
  const failed = requests.filter((r) => !r.success);
  const latencies = successful.map((r) => r.latencyMs).sort((a, b) => a - b);

  const meanLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  const percentile = (sortedValues, p) => {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  };

  const standardDeviation = (values, mean) => {
    if (values.length === 0) return 0;
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  };

  return {
    scenario: scenarioName,
    iterations: requests.length,
    successful: successful.length,
    failed: failed.length,
    errorRate: requests.length > 0 ? failed.length / requests.length : 0,
    minLatency: latencies.length > 0 ? latencies[0] : 0,
    maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    meanLatency,
    medianLatency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    stdDeviation: standardDeviation(latencies, meanLatency),
    throughput: totalTimeMs > 0 ? (successful.length / totalTimeMs) * 1000 : 0,
    totalTimeMs,
    peakMemoryMB: Math.max(...requests.map((r) => r.memoryMB || 0).filter((m) => m > 0)),
    avgResponseSize:
      successful.length > 0
        ? successful.reduce((sum, r) => sum + (r.responseSize || 0), 0) / successful.length
        : 0,
    requests,
  };
}

function aggregateMetricsOptimized(
  scenarioName,
  requests,
  totalTimeMs
) {
  let successfulCount = 0;
  let failedCount = 0;
  let totalLatency = 0;
  let totalResponseSize = 0;
  let peakMemoryMB = 0;
  const latencies = [];

  for (let i = 0; i < requests.length; i++) {
    const r = requests[i];
    if (r.success) {
      successfulCount++;
      totalLatency += r.latencyMs;
      totalResponseSize += r.responseSize || 0;
      latencies.push(r.latencyMs);
    } else {
      failedCount++;
    }

    if (r.memoryMB && r.memoryMB > peakMemoryMB) {
      peakMemoryMB = r.memoryMB;
    }
  }

  latencies.sort((a, b) => a - b);
  const meanLatency = successfulCount > 0 ? totalLatency / successfulCount : 0;

  const percentile = (sortedValues, p) => {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  };

  const standardDeviation = (values, mean) => {
    if (values.length === 0) return 0;
    let squareDiffsSum = 0;
    for (let i = 0; i < values.length; i++) {
      squareDiffsSum += Math.pow(values[i] - mean, 2);
    }
    return Math.sqrt(squareDiffsSum / values.length);
  };

  return {
    scenario: scenarioName,
    iterations: requests.length,
    successful: successfulCount,
    failed: failedCount,
    errorRate: requests.length > 0 ? failedCount / requests.length : 0,
    minLatency: latencies.length > 0 ? latencies[0] : 0,
    maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    meanLatency,
    medianLatency: percentile(latencies, 50),
    p95Latency: percentile(latencies, 95),
    p99Latency: percentile(latencies, 99),
    stdDeviation: standardDeviation(latencies, meanLatency),
    throughput: totalTimeMs > 0 ? (successfulCount / totalTimeMs) * 1000 : 0,
    totalTimeMs,
    peakMemoryMB: peakMemoryMB > 0 ? peakMemoryMB : 0,
    avgResponseSize: successfulCount > 0 ? totalResponseSize / successfulCount : 0,
    requests,
  };
}

function generateData(count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      latencyMs: Math.random() * 1000,
      timestamp: Date.now(),
      success: Math.random() > 0.1,
      memoryMB: Math.random() * 100 + 100,
      responseSize: Math.floor(Math.random() * 1000),
    });
  }
  return data;
}

const counts = [1000, 10000, 50000, 100000, 200000];

for (const count of counts) {
  const data = generateData(count);
  console.log(`--- Running benchmark for ${count} requests ---`);
  
  try {
    let baselineTime = -1;
    let result = null;
    if (count < 120000) { // Avoid stack overflow for baseline
        const start = performance.now();
        result = aggregateMetricsBaseline('test', data, 1000);
        const end = performance.now();
        baselineTime = end - start;
        console.log(`Baseline took ${baselineTime.toFixed(4)}ms`);
    } else {
        console.log(`Skipping baseline for ${count} requests to avoid stack overflow`);
    }

    const startOpt = performance.now();
    const resultOpt = aggregateMetricsOptimized('test', data, 1000);
    const endOpt = performance.now();
    const optTime = endOpt - startOpt;
    console.log(`Optimized took ${optTime.toFixed(4)}ms`);
    if (baselineTime > 0) {
        console.log(`Improvement: ${(((baselineTime - optTime) / baselineTime) * 100).toFixed(2)}%`);
    }

    // Verify correctness
    if (result) {
        const keysToCompare = [
          'iterations', 'successful', 'failed', 'errorRate', 
          'minLatency', 'maxLatency', 'meanLatency', 'medianLatency',
          'p95Latency', 'p99Latency', 'stdDeviation', 'throughput',
          'totalTimeMs', 'peakMemoryMB', 'avgResponseSize'
        ];
        for (const key of keysToCompare) {
            if (Math.abs(result[key] - resultOpt[key]) > 0.0001) {
                console.error(`Verification FAILED for key ${key}: ${result[key]} vs ${resultOpt[key]}`);
            }
        }
    }

  } catch (e) {
    console.log(`Benchmark FAILED for ${count}: ${e.stack}`);
  }
}
