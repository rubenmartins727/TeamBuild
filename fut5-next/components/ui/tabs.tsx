'use client'
import React from 'react';

type TabsCtx = { value: string; setValue: (v: string) => void };
const Ctx = React.createContext<TabsCtx | null>(null);

export function Tabs(
  { defaultValue, children, className = '' }:
  React.PropsWithChildren<{ defaultValue: string; className?: string }>
) {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList(
  { children, className = '' }:
  React.PropsWithChildren<{ className?: string }>
) {
  return <div className={'tabs-list ' + className}>{children}</div>;
}

export function TabsTrigger(
  { children, value, className = '' }:
  React.PropsWithChildren<{ value: string; className?: string }>
) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={'tabs-trigger ' + className}
      data-active={active}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent(
  { children, valueFor, className = '' }:
  React.PropsWithChildren<{ valueFor: string; className?: string }>
) {
  const ctx = React.useContext(Ctx);
  if (!ctx || ctx.value !== valueFor) return null;
  return <div className={'tabs-content ' + className}>{children}</div>;
}
