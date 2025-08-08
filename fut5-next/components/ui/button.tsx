import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' };
export function Button({ className = '', variant = 'primary', ...props }: Props) {
  const base = 'btn ' + (variant === 'primary' ? 'btn-primary' : variant === 'outline' ? 'btn-outline' : 'bg-transparent border-transparent');
  return <button className={base + ' ' + className} {...props} />;
}
