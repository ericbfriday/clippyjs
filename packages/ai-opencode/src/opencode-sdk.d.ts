declare module '@opencode-ai/sdk' {
  export function createOpencode(
    options?: Record<string, unknown>
  ): Promise<{
    client: unknown;
    server: {
      url: string;
      close: () => void | Promise<void>;
    };
  }>;

  export function createOpencodeClient(
    options?: Record<string, unknown>
  ): unknown;
}
