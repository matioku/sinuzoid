import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'rounded' | 'underline';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: leftIcon ? '10px 14px 10px 40px' : rightIcon ? '10px 40px 10px 14px' : '10px 14px',
    background: 'var(--bg-overlay)',
    border: `1px solid ${error ? 'rgba(255,69,58,0.7)' : 'var(--border)'}`,
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} className={className}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          style={inputStyle}
          className="sz-input"
          {...props}
        />
        {rightIcon && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: '#ff453a' }}>{error}</p>}
      {helperText && !error && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
