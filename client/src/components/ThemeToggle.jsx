import React from 'react';

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: '99px', padding: '4px 10px',
        display: 'flex', alignItems: 'center', gap: '6px',
        cursor: 'pointer', fontSize: '12px', color: 'var(--text2)',
        transition: 'all 0.2s'
      }}>
      <span style={{ fontSize: '14px' }}>{dark ? '☀️' : '🌙'}</span>
      <span style={{ fontWeight: 500 }}>{dark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
