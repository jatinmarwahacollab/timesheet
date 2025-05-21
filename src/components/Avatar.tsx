import React from 'react';
import { cn, getInitials } from '../lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', className }) => {
  const initials = getInitials(name);
  
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  
  return (
    <div 
      className={cn(
        'rounded-full bg-blue-600 text-white flex items-center justify-center font-medium',
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
};

export default Avatar;