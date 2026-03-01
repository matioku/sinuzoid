import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'icon' | 'link' | 'nav';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) => {
  const variantClass = {
    primary:   'sz-btn sz-btn-primary',
    secondary: 'sz-btn sz-btn-secondary',
    danger:    'sz-btn sz-btn-danger',
    outline:   'sz-btn sz-btn-secondary',
    ghost:     'sz-btn sz-btn-ghost',
    icon:      'sz-btn sz-btn-icon',
    link:      'sz-btn sz-btn-ghost',
    nav:       'sz-btn sz-btn-ghost',
  }[variant];

  const sizeClass = {
    sm: 'sz-btn-sm',
    md: '',
    lg: 'sz-btn-lg',
  }[size];

  const classes = [variantClass, sizeClass, fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ');

  return (
    <button 
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" style={{ marginRight: 6 }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
