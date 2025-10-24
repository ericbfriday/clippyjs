'use client';

import { useAgent } from '@clippyjs/react';
import { useState } from 'react';

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState<'Clippy' | 'Merlin' | 'Rover'>('Clippy');
  const { load, speak, play, animate, moveTo, agent, loading } = useAgent(selectedAgent);

  const handleGreeting = async () => {
    await load();
    await speak(`Hello! I'm ${selectedAgent}, and I'm here to help!`);
    await play('Wave');
  };

  const handleRandomAnimation = async () => {
    await load();
    await animate();
  };

  const handleMove = async () => {
    await load();
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200);
    await moveTo(x, y, 1000);
    await speak('I can move around!');
  };

  return (
    <div className="container">
      <main className="main">
        <h1>ClippyJS + Next.js Starter</h1>
        <p className="description">
          Get started with ClippyJS in your Next.js application!
        </p>

        <div className="card">
          <h2>Select an Agent</h2>
          <div className="agent-selector">
            {(['Clippy', 'Merlin', 'Rover'] as const).map((name) => (
              <button
                key={name}
                onClick={() => setSelectedAgent(name)}
                className={selectedAgent === name ? 'active' : ''}
                disabled={loading}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Agent Controls</h2>
          <div className="controls">
            <button onClick={handleGreeting} disabled={loading}>
              {loading ? 'Loading...' : 'Say Hello'}
            </button>
            <button onClick={handleRandomAnimation} disabled={!agent}>
              Random Animation
            </button>
            <button onClick={handleMove} disabled={!agent}>
              Move Around
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Getting Started</h2>
          <ol>
            <li>
              The <code>ClippyProvider</code> is set up in <code>app/layout.tsx</code>
            </li>
            <li>
              Import <code>useAgent</code> hook in any client component
            </li>
            <li>
              Load an agent and start interacting!
            </li>
          </ol>
        </div>

        <div className="card">
          <h2>Learn More</h2>
          <ul>
            <li>
              <a href="https://github.com/ericbfriday/clippyjs" target="_blank" rel="noopener noreferrer">
                ClippyJS Documentation
              </a>
            </li>
            <li>
              <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
                Next.js Documentation
              </a>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
