import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders modal overlays directly into document.body so ancestor
 * `backdrop-filter`, `transform`, or `overflow-hidden` containers
 * (such as `.glass-panel`) never trap or clip `position: fixed` backdrops.
 */
export const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
};
