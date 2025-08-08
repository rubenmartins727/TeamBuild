import React from 'react';

export function Card({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={'card ' + className}>{children}</div>;
}
export function CardHeader({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={'card-header ' + className}>{children}</div>;
}
export function CardTitle({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={'card-title ' + className}>{children}</div>;
}
export function CardContent({ className = '', children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={'card-content ' + className}>{children}</div>;
}
