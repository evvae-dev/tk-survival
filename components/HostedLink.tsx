'use client';

import type { ComponentProps } from 'react';

export default function HostedLink(props: ComponentProps<'a'>) {
  return <a {...props} />;
}
