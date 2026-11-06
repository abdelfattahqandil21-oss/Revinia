/** Retry registry reads for up to ten minutes because publishes can propagate slowly across registry edges. */
export async function verifyPublishedIntegrity({ name, version, expectedIntegrity, readIntegrity, attempts = 120, delayMs = 5000, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const publishedIntegrity = await readIntegrity();
    if (publishedIntegrity === expectedIntegrity) return publishedIntegrity;
    if (publishedIntegrity !== null) {
      throw new Error(`${name}@${version}: registry integrity mismatch after publish`);
    }
    if (attempt < attempts) await wait(delayMs);
  }
  throw new Error(`${name}@${version}: registry version did not become visible after ${attempts} checks`);
}
