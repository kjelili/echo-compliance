export async function startHttpTestServer(app) {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  return {
    baseUrl,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}
