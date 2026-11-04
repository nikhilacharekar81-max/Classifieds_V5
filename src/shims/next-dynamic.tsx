import React, { Suspense } from 'react';

export interface DynamicOptions {
  loading?: () => React.ReactNode;
  ssr?: boolean;
}

export default function dynamic<TProps = any>(
  loader: () => Promise<React.ComponentType<TProps> | { default: React.ComponentType<TProps> }>,
  options?: DynamicOptions
): React.ComponentType<TProps> {
  const LazyComponent = React.lazy(async () => {
    const mod = await loader();
    if (typeof mod === 'function') {
      return { default: mod };
    }
    if (mod && typeof mod === 'object' && 'default' in mod) {
      return mod as { default: React.ComponentType<TProps> };
    }
    return { default: mod as unknown as React.ComponentType<TProps> };
  });

  const Fallback = options?.loading;

  const DynamicWrapper: React.FC<TProps> = (props) => (
    <Suspense fallback={Fallback ? <Fallback /> : null}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  );

  return DynamicWrapper;
}
