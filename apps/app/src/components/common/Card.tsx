import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, glass = false, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl p-6 transition-all duration-200',
        hover ? 'card-hover' : 'card',
        glass && 'glass',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
