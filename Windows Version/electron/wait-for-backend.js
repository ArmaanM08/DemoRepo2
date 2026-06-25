async function waitForBackend(port, timeoutMs = 30000) {
  const url = `http://127.0.0.1:${port}/api/files`;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // keep polling until timeout
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Backend did not become ready at ${url}`);
}

module.exports = { waitForBackend };