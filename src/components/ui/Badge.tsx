import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'purple' | 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    purple: 'bg-[#7547FF]/15 text-[#906BFF] border border-[#7547FF]/30 font-medium',
    neutral: 'bg-[#171717] text-[#9CA3AF] border border-[#252525] font-medium',
    success: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 font-medium',
    warning: 'bg-amber-950/40 text-amber-400 border border-amber-800/50 font-medium',
    danger: 'bg-rose-950/40 text-rose-400 border border-rose-800/50 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md shrink-0 uppercase tracking-wider ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={`bg-[#111111] border border-[#252525] rounded-xl p-5 ${
        hoverable ? 'hover:border-[#383838] transition-colors duration-150' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

