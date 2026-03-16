export async function runWithLogsSandbox({ readLogs, writeLogs, fixtureLogs, run }) {
  const originalLogs = await readLogs();
  await writeLogs(fixtureLogs);

  try {
    return await run();
  } finally {
    await writeLogs(originalLogs);
  }
}
