/**
 * React demo for modern Clippy.js implementation
 */

import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ClippyProvider, Clippy, useAgent } from "../src";
import "./clippy.css";

/**
 * Demo component showcasing Clippy functionality
 */
const ClippyDemo: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>("Clippy");
  const [message, setMessage] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const { agent, loading, error } = useAgent(selectedAgent);

  const agents = [
    "Clippy",
    "Bonzi",
    "F1",
    "Genie",
    "Genius",
    "Links",
    "Merlin",
    "Peedy",
    "Rocky",
    "Rover",
  ];

  const animations = agent?.getAnimations() || [];

  const handleSpeak = () => {
    if (agent && message) {
      agent.speak(message);
      setMessage("");
    }
  };

  const handleAnimation = (animation: string) => {
    if (agent) {
      agent.play(animation);
    }
  };

  const handleRandomAnimation = () => {
    if (agent) {
      agent.animate();
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Clippy.js - Modern React Implementation</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Select Agent</h2>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{ padding: "5px", fontSize: "14px" }}
        >
          {agents.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <Clippy
          name={selectedAgent}
          showOnLoad={true}
          onLoad={(agent) => {
            setIsLoaded(true);
            console.log(`${selectedAgent} loaded!`, agent);
            agent.speak(`Hi! I'm ${selectedAgent}. How can I help you today?`);
          }}
          onError={(error) => {
            console.error("Failed to load agent:", error);
          }}
        />
      </div>

      {loading && <p>Loading {selectedAgent}...</p>}
      {error && (
        <p style={{ color: "red" }}>Error loading agent: {error.message}</p>
      )}

      {isLoaded && agent && (
        <>
          <div style={{ marginBottom: "20px" }}>
            <h2>Make {selectedAgent} Speak</h2>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSpeak()}
              placeholder="Enter message..."
              style={{ padding: "5px", width: "300px", marginRight: "10px" }}
            />
            <button onClick={handleSpeak} style={{ padding: "5px 15px" }}>
              Speak
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2>Animations</h2>
            <button
              onClick={handleRandomAnimation}
              style={{
                padding: "5px 15px",
                marginBottom: "10px",
                marginRight: "10px",
              }}
            >
              Random Animation
            </button>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {animations.map((animation) => (
                <button
                  key={animation}
                  onClick={() => handleAnimation(animation)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "12px",
                    backgroundColor: animation.includes("Idle")
                      ? "#f0f0f0"
                      : "#e0e0e0",
                  }}
                >
                  {animation}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h2>Controls</h2>
            <button
              onClick={() => agent.show()}
              style={{ padding: "5px 15px", marginRight: "10px" }}
            >
              Show
            </button>
            <button
              onClick={() => agent.hide()}
              style={{ padding: "5px 15px", marginRight: "10px" }}
            >
              Hide
            </button>
            <button
              onClick={() => agent.stop()}
              style={{ padding: "5px 15px", marginRight: "10px" }}
            >
              Stop
            </button>
            <button
              onClick={() => agent.stopCurrent()}
              style={{ padding: "5px 15px", marginRight: "10px" }}
            >
              Stop Current
            </button>
          </div>
        </>
      )}

      <div
        style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px",
        }}
      >
        <h2>Features</h2>
        <ul>
          <li>✅ Modern TypeScript implementation</li>
          <li>✅ React components and hooks</li>
          <li>✅ Promise-based API (no more callbacks!)</li>
          <li>✅ Full type safety</li>
          <li>✅ Backward compatible with existing agent assets</li>
          <li>✅ Clean, maintainable code structure</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Main App component with provider
 */
const App: React.FC = () => {
  return (
    <ClippyProvider>
      <ClippyDemo />
    </ClippyProvider>
  );
};

// Mount the app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
