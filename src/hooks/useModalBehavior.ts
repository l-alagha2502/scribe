import { useEffect, useRef } from 'react';

/**
 * Unified modal accessibility & event-isolation hook:
 * - Closes on Escape in capture phase and stops propagation so canvas shortcuts
 *   and selection handlers underneath never fire.
 * - Stops backdrop/card pointer & mouse events from leaking through to the canvas.
 */
export function useModalBehavior(
  isOpen: boolean,
  onClose: () => void,
  disabled: boolean = false
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, disabled]);

  const backdropProps = {
    role: 'dialog' as const,
    'aria-modal': true as const,
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.target === e.currentTarget && !disabled) {
        onCloseRef.current();
      }
    },
  };

  const contentProps = {
    onMouseDown: (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
    },
  };

  return { backdropProps, contentProps };
}
