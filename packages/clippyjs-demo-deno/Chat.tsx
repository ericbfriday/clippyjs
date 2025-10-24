import React, { useState } from 'https://esm.sh/react@18.2.0';

interface ChatProps {
  onUserInput: (input: string) => void;
}

export function Chat({ onUserInput }: ChatProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onUserInput(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', display: 'flex' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ flex: 1, padding: '10px', fontSize: '16px' }}
        placeholder="Ask me anything..."
      />
      <button type="submit" style={{ padding: '10px', fontSize: '16px' }}>
        Send
      </button>
    </form>
  );
}
