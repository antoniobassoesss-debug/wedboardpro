import React from 'react';

export default function ChatSection() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Chat</h2>
        <div style={{ color: '#6b6b6b' }}>Team chat</div>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid #eaeaea', padding: 20, background: '#fff' }}>
        <p style={{ margin: 0, color: '#6b6b6b' }}>
          No conversations yet. Team chat and DMs will appear here.
        </p>
      </div>
    </div>
  );
}
