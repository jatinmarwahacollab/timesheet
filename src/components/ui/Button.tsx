import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', isLoading, icon, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
      secondary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 rounded',
      md: 'text-sm px-4 py-2 rounded-md',
      lg: 'text-base px-5 py-2.5 rounded-md',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          'font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 inline-flex items-center justify-center gap-2',
          variants[variant],
          sizes[size],
          isDisabled && 'opacity-70 cursor-not-allowed',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;