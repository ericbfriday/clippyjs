type Factory = (options?: Record<string, unknown>) => unknown;

let clientFactory: Factory = () => {
  throw new Error('OpenCode client test factory not configured');
};

let managedFactory: Factory = () => {
  throw new Error('Managed OpenCode test factory not configured');
};

/** Configure the client-only SDK test implementation. */
export function setClientFactory(factory: Factory): void {
  clientFactory = factory;
}

/** Configure the managed-server SDK test implementation. */
export function setManagedFactory(factory: Factory): void {
  managedFactory = factory;
}

/** Reset SDK test implementations. */
export function resetFactories(): void {
  clientFactory = () => {
    throw new Error('OpenCode client test factory not configured');
  };
  managedFactory = () => {
    throw new Error('Managed OpenCode test factory not configured');
  };
}

export function createOpencodeClient(
  options?: Record<string, unknown>
): unknown {
  return clientFactory(options);
}

export async function createOpencode(
  options?: Record<string, unknown>
): Promise<unknown> {
  return managedFactory(options);
}
