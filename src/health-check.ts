/**
 * Health check entry point for Docker HEALTHCHECK
 */

import { performHealthCheck } from './observability/health-check.js';

async function main(): Promise<void> {
  const result = await performHealthCheck();

  if (result.healthy) {
    process.exit(0);
  } else {
    process.stderr.write('Health check failed:' + JSON.stringify(result, null, 2) + '\n');
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`Health check error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
