import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const duration = new Trend('duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users over 2 min
    { duration: '5m', target: 500 },   // Ramp up to 500 users over 5 min
    { duration: '10m', target: 1000 }, // Ramp up to 1000 users over 10 min
    { duration: '5m', target: 500 },   // Ramp down to 500 over 5 min
    { duration: '2m', target: 0 },     // Ramp down to 0 over 2 min
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1s
    'errors': ['rate<0.1'],                             // Error rate < 10%
  },
};

const BACKEND_URL = __ENV.BACKEND_URL || 'http://localhost:8000';

export default function () {
  // Test /health endpoint
  {
    const res = http.get(`${BACKEND_URL}/health`);
    duration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      'health is 200': (r) => r.status === 200,
      'health response time < 100ms': (r) => r.timings.duration < 100,
    });
  }

  sleep(0.5);

  // Test /optimize endpoint (token optimization)
  {
    const payload = JSON.stringify({
      provider: 'anthropic',
      text: 'Optimize this prompt for token efficiency while maintaining semantic meaning. ' +
            'The quick brown fox jumps over the lazy dog multiple times in different ways.',
      model: 'claude-3-opus',
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BACKEND_URL}/optimize`, payload, params);
    duration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      'optimize is 200': (r) => r.status === 200,
      'optimize has optimized_text': (r) => r.body.includes('optimized_text'),
      'optimize response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }

  sleep(0.5);

  // Test /usage endpoint
  {
    const res = http.get(`${BACKEND_URL}/usage?user_id=test-user-${Math.random()}`);
    duration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      'usage is 200': (r) => r.status === 200,
      'usage has tokens_used': (r) => r.body.includes('tokens_used'),
    });
  }

  sleep(0.5);

  // Test /pricing endpoint
  {
    const res = http.get(`${BACKEND_URL}/pricing`);
    duration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      'pricing is 200': (r) => r.status === 200,
      'pricing has plans': (r) => r.body.includes('free') || r.body.includes('pro'),
    });
  }

  sleep(1);
}
