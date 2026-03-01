import { ReactNode } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiXCircle } from 'react-icons/fi';

interface AlertProps {
  children: ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  className?: string;
}

const Alert = ({ children, type = 'info', title, className = '' }: AlertProps) => {
  const config = {
    success: { icon: <FiCheckCircle size={16} />, color: '#30d158', bg: 'rgba(48,209,88,0.1)', border: 'rgba(48,209,88,0.25)' },
    error:   { icon: <FiXCircle size={16} />,     color: '#ff453a', bg: 'rgba(255,69,58,0.1)',  border: 'rgba(255,69,58,0.25)' },
    warning: { icon: <FiAlertCircle size={16} />, color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.25)' },
    info:    { icon: <FiInfo size={16} />,         color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(0,229,255,0.25)' },
  }[type];

  return (
    <div
      className={className}
      style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        padding: '12px 14px', borderRadius: 8,
        background: config.bg, border: `1px solid ${config.border}`,
        fontSize: 13, color: config.color,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>{config.icon}</span>
      <div style={{ flex: 1, color: 'var(--text-primary)' }}>
        {title && <strong style={{ color: config.color, display: 'block', marginBottom: 2 }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
};

export default Alert;
