'use client'
import React from 'react';

export function Tabs({ defaultValue, children, className = '' }: React.PropsWithChildren<{ defaultValue: string, className?: string }>) {
  const [value, setValue] = React.useState(defaultValue);
  return <div className={className}>{React.Children.map(children, (child: any) => React.isValidElement(child) ? React.cloneElement(child, { value, setValue }) : child)}</div>;
}
export function TabsList({ children, value, setValue, className = '' }: any) {
  return <div className={'tabs-list ' + className}>{React.Children.map(children, (child: any) => React.isValidElement(child) ? React.cloneElement(child, { value, setValue }) : child)}</div>;
}
export function TabsTrigger({ children, value: v, setValue, value, className = '' }: any) {
  const active = value === v;
  return <button onClick={() => setValue(v)} className={'tabs-trigger ' + className} data-active={active}>{children}</button>;
}
export function TabsContent({ children, value, valueFor, className = '' }: any) {
  if (value !== valueFor) return null;
  return <div className={'tabs-content ' + className}>{children}</div>;
}
