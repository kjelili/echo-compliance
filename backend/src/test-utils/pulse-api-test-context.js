import { startHttpTestServer } from "./http-test-server.js";
import { runWithLogsSandbox } from "./logs-sandbox.js";

export async function withApiTestContext({ app, readLogs, writeLogs, fixtureLogs, run }) {
  await runWithLogsSandbox({
    readLogs,
    writeLogs,
    fixtureLogs,
    run: async () => {
      let testServer;
      try {
        testServer = await startHttpTestServer(app);
        await run({ baseUrl: testServer.baseUrl });
      } finally {
        if (testServer) {
          await testServer.stop();
        }
      }
    }
  });
}

export const withPulseApiTestContext = withApiTestContext;
