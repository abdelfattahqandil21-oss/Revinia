import { describe, expect, it, vi } from 'vitest';
import { verifyPublishedIntegrity } from '../publish-registry-verification.mjs';

describe('post-publish registry verification', () => {
  it('retries temporary 404 reads until the exact integrity appears', async () => {
    const readIntegrity = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue('sha512-expected');
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(verifyPublishedIntegrity({
      name: '@rivinia/popup',
      version: '1.0.1',
      expectedIntegrity: 'sha512-expected',
      readIntegrity,
      wait,
    })).resolves.toBe('sha512-expected');
    expect(readIntegrity).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it('fails immediately when the published integrity differs', async () => {
    await expect(verifyPublishedIntegrity({
      name: '@rivinia/popup',
      version: '1.0.1',
      expectedIntegrity: 'sha512-expected',
      readIntegrity: async () => 'sha512-other',
      wait: async () => {},
    })).rejects.toThrow('registry integrity mismatch after publish');
  });

  it('fails after the bounded propagation window if the version stays absent', async () => {
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(verifyPublishedIntegrity({
      name: '@rivinia/popup',
      version: '1.0.1',
      expectedIntegrity: 'sha512-expected',
      readIntegrity: async () => null,
      attempts: 3,
      wait,
    })).rejects.toThrow('did not become visible after 3 checks');
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
