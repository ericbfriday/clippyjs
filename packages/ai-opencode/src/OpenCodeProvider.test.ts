import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message, StreamChunk } from '@clippyjs/ai';
import { OpenCodeProvider } from './OpenCodeProvider';
import {
  resetFactories,
  setClientFactory,
  setManagedFactory,
} from './testing/opencode-sdk-stub';

async function collect(
  iterable: AsyncIterableIterator<StreamChunk>
): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of iterable) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('OpenCodeProvider', () => {
  beforeEach(() => {
    resetFactories();
  });

  it('connects to an existing server and translates a conversation', async () => {
    const health = vi.fn().mockResolvedValue({
      data: { healthy: true, version: '1.17.2' },
    });
    const create = vi.fn().mockResolvedValue({
      data: { id: 'session-1' },
    });
    const prompt = vi.fn().mockResolvedValue({
      data: {
        parts: [
          { type: 'text', text: 'Hello from OpenCode' },
          { type: 'step-finish' },
        ],
      },
    });
    const deleteSession = vi.fn().mockResolvedValue({
      data: true,
    });

    setClientFactory(() => ({
      global: { health },
      session: {
        create,
        prompt,
        delete: deleteSession,
      },
    }));

    const provider = new OpenCodeProvider();
    await provider.initialize({
      endpoint: 'http://127.0.0.1:4096',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const messages: Message[] = [
      { role: 'user', content: 'Can you help?' },
      { role: 'assistant', content: 'Of course.' },
      { role: 'user', content: 'Explain this code.' },
    ];
    const chunks = await collect(provider.chat(messages, {
      systemPrompt: 'Be concise.',
    }));

    expect(health).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      body: { title: 'ClippyJS conversation' },
    });
    expect(prompt).toHaveBeenCalledWith({
      path: { id: 'session-1' },
      body: {
        model: {
          providerID: 'anthropic',
          modelID: 'claude-sonnet-4-20250514',
        },
        parts: [{
          type: 'text',
          text: [
            'SYSTEM:\nBe concise.',
            'USER:\nCan you help?',
            'ASSISTANT:\nOf course.',
            'USER:\nExplain this code.',
          ].join('\n\n'),
        }],
      },
    });
    expect(chunks).toEqual([
      {
        type: 'content_delta',
        delta: 'Hello from OpenCode',
      },
      { type: 'complete' },
    ]);
    expect(deleteSession).toHaveBeenCalledWith({
      path: { id: 'session-1' },
    });
  });

  it('starts and closes a managed server when no endpoint is supplied', async () => {
    const close = vi.fn();
    const client = {
      session: {
        create: vi.fn(),
        prompt: vi.fn(),
      },
    };
    const managedFactory = vi.fn().mockResolvedValue({
      client,
      server: {
        url: 'http://127.0.0.1:5050',
        close,
      },
    });
    setManagedFactory(managedFactory);

    const provider = new OpenCodeProvider();
    await provider.initialize({
      hostname: '127.0.0.1',
      port: 5050,
      serverStartTimeout: 10_000,
      model: 'openai/gpt-5',
    });

    expect(managedFactory).toHaveBeenCalledWith({
      hostname: '127.0.0.1',
      port: 5050,
      timeout: 10_000,
      config: {
        model: 'openai/gpt-5',
      },
    });

    provider.destroy();
    expect(close).toHaveBeenCalledOnce();
  });

  it('returns an error chunk for an invalid model identifier', async () => {
    const deleteSession = vi.fn().mockResolvedValue({
      data: true,
    });
    setClientFactory(() => ({
      session: {
        create: vi.fn().mockResolvedValue({
          data: { id: 'session-2' },
        }),
        prompt: vi.fn(),
        delete: deleteSession,
      },
    }));

    const provider = new OpenCodeProvider();
    await provider.initialize({
      endpoint: 'http://127.0.0.1:4096',
      model: 'missing-provider-prefix',
    });

    const chunks = await collect(provider.chat([
      { role: 'user', content: 'Hello' },
    ]));

    expect(chunks).toEqual([{
      type: 'error',
      error: 'OpenCode model must use the "provider/model" format',
    }]);
    expect(deleteSession).toHaveBeenCalledWith({
      path: { id: 'session-2' },
    });
  });

  it('reports capabilities owned by the OpenCode runtime accurately', () => {
    const provider = new OpenCodeProvider();

    expect(provider.supportsTools()).toBe(false);
    expect(provider.supportsVision()).toBe(false);
  });
});
