import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function ActionMenu({ items, ariaLabel = 'Page actions' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDown = event => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleAction = item => {
    if (item.disabled) return;
    setIsMenuOpen(false);
    item.onClick();
  };

  return (
    <div className="ws-action-menu" ref={menuRef}>
      <button
        type="button"
        className="ws-btn ws-action-menu-toggle"
        onClick={() => setIsMenuOpen(value => !value)}
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
        aria-label={isMenuOpen ? `Close ${ariaLabel} menu` : `Open ${ariaLabel} menu`}
        title={ariaLabel}
      >
        {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
        Menu
      </button>

      {isMenuOpen && (
        <div className="ws-action-menu-panel" aria-label={ariaLabel}>
          {items.map(item => {
            const Icon = item.icon;
            const variantClass = item.variant ? ` ${item.variant}` : '';

            return (
              <button
                key={item.key}
                type="button"
                className={`ws-action-menu-item${variantClass}`}
                onClick={() => handleAction(item)}
                title={item.title}
                disabled={item.disabled}
              >
                {Icon && <Icon size={15} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
