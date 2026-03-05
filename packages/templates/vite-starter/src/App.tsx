import { useState } from 'react';
import { useAgent, type AgentName } from '@clippyjs/react';
import { AgentSelector } from './components/AgentSelector';
import { AgentControls } from './components/AgentControls';
import { GettingStarted } from './components/GettingStarted';
import { LearnMore } from './components/LearnMore';

function App() {
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('Clippy');
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

  const agents: readonly AgentName[] = ['Clippy', 'Merlin', 'Rover'] as const;

  return (
    <div className="container">
      <main className="main">
        <h1>ClippyJS + Vite Starter</h1>
        <p className="description">
          Get started with ClippyJS in your Vite + React application!
        </p>

        <AgentSelector
          agents={agents}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          loading={loading}
        />

        <AgentControls
          handleGreeting={handleGreeting}
          handleRandomAnimation={handleRandomAnimation}
          handleMove={handleMove}
          agent={agent}
          loading={loading}
        />

        <GettingStarted />

        <LearnMore />
      </main>
    </div>
  );
}

export default App;
