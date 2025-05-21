import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const baseStyles = "fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center justify-between max-w-md animate-slide-up z-50";
  const typeStyles = {
    success: "bg-green-100 text-green-800 border border-green-200",
    error: "bg-red-100 text-red-800 border border-red-200",
    info: "bg-blue-100 text-blue-800 border border-blue-200"
  };

  return (
    <div className={cn(baseStyles, typeStyles[type])}>
      <span className="mr-8">{message}</span>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;