import React from 'react';
import ActionMenu from './ActionMenu';

function PageActionButton({ item }) {
  const Icon = item.icon;
  const variantClass = item.variant ? ` ws-btn-${item.variant}` : '';
  const sizeClass = item.size === 'sm' ? ' ws-btn-sm' : '';
  const extraClass = item.className ? ` ${item.className}` : '';

  return (
    <button
      type="button"
      className={`ws-btn${variantClass}${sizeClass}${extraClass}`}
      onClick={item.onClick}
      title={item.title}
      disabled={item.disabled}
    >
      {Icon && <Icon size={item.iconSize ?? 15} />}
      {item.label}
    </button>
  );
}

export default function PageActions({ visible = [], overflow = [], ariaLabel = 'Page actions' }) {
  if (visible.length === 0 && overflow.length === 0) return null;

  return (
    <div className="ws-page-actions">
      {visible.map(item => <PageActionButton key={item.key} item={item} />)}
      {overflow.length > 0 && <ActionMenu ariaLabel={ariaLabel} items={overflow} />}
    </div>
  );
}
