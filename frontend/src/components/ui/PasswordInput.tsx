import { useState, forwardRef } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Input from './Input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'rounded' | 'underline';
  showToggle?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({
  label, error, helperText, showToggle = true, ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const rightIcon = showToggle ? (
    <button
      type="button"
      onClick={() => setShowPassword(v => !v)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
    >
      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
    </button>
  ) : undefined;

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      label={label}
      error={error}
      helperText={helperText}
      rightIcon={rightIcon}
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
