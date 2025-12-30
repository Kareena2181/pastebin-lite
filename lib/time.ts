export function currentTimeMs(headers: Headers): number {
  const testMode = process.env.TEST_MODE === '1';
  if (testMode) {
    const override = headers.get('x-test-now-ms');
    if (override) {
      const parsed = Number(override);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return Date.now();
}
