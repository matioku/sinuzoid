import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  glass?: boolean;
}

const Card = ({ 
  children, 
  title, 
  subtitle, 
  className = '', 
  padding = 'md',
  glass = false,
}: CardProps) => {
  const paddingClasses = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }[padding];
  const base = glass ? 'glass' : 'sz-card';
  const classes = `${base} ${paddingClasses} ${className}`.trim();

  return (
    <div className={classes}>
      {(title || subtitle) && (
        <div style={{ marginBottom: 24 }}>
          {title && (
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
