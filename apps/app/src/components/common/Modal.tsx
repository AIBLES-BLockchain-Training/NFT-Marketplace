'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  zIndex?: string;
  hideBackdrop?: boolean;
}

// Global counter to track number of open modals
let openModalsCount = 0;

export function Modal({ isOpen, onClose, children, title, size = 'md', zIndex = 'z-50', hideBackdrop = false }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Increment counter when modal opens
      openModalsCount++;
      document.body.style.overflow = 'hidden';

      // Return cleanup that will run when modal closes or unmounts
      return () => {
        // Always decrement counter when cleanup runs (modal closes/unmounts)
        openModalsCount--;

        // Safety: prevent negative counter
        if (openModalsCount < 0) {
          console.warn('[Modal] Counter went negative, resetting to 0');
          openModalsCount = 0;
        }

        // Only restore scroll if NO modals are open
        if (openModalsCount === 0) {
          document.body.style.overflow = 'unset';
        }
      };
    }
  }, [isOpen]);

  // Safety cleanup on component unmount - force check if body should be scrollable
  useEffect(() => {
    return () => {
      // Small delay to allow other modals to mount
      setTimeout(() => {
        if (openModalsCount === 0 && document.body.style.overflow === 'hidden') {
          console.warn('[Modal] Force restoring scroll - counter was 0 but body still hidden');
          document.body.style.overflow = 'unset';
        }
      }, 100);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-full w-full h-full',
  };

  const modalContent = (
    <div className={clsx("fixed inset-0 flex items-center justify-center p-4 animate-fade-in", zIndex)}>
      {!hideBackdrop && (
        <div
          className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <div
        className={clsx(
          'relative w-full bg-dark-card border border-dark-border rounded-2xl shadow-2xl animate-slide-up',
          sizeStyles[size]
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          {title && <h3 className="text-xl font-bold text-foreground">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6 max-h-[calc(85vh-8rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
