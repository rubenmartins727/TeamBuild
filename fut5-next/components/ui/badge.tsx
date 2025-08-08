import React from 'react';
export function Badge({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={'badge ' + className}>{children}</span>;
}
