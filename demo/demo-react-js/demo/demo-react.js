import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * React demo for modern Clippy.js implementation
 */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ClippyProvider, Clippy, useAgent } from "../src";
import "./clippy.css";
/**
 * Demo component showcasing Clippy functionality
 */
const ClippyDemo = () => {
    const [selectedAgent, setSelectedAgent] = useState("Clippy");
    const [message, setMessage] = useState("");
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
    const handleAnimation = (animation) => {
        if (agent) {
            agent.play(animation);
        }
    };
    const handleRandomAnimation = () => {
        if (agent) {
            agent.animate();
        }
    };
    return (_jsxs("div", { style: { padding: "20px", fontFamily: "Arial, sans-serif" }, children: [_jsx("h1", { children: "Clippy.js - Modern React Implementation" }), _jsxs("div", { style: { marginBottom: "20px" }, children: [_jsx("h2", { children: "Select Agent" }), _jsx("select", { value: selectedAgent, onChange: (e) => setSelectedAgent(e.target.value), style: { padding: "5px", fontSize: "14px" }, children: agents.map((name) => (_jsx("option", { value: name, children: name }, name))) }), _jsx(Clippy, { name: selectedAgent, showOnLoad: true, onLoad: (agent) => {
                            setIsLoaded(true);
                            console.log(`${selectedAgent} loaded!`, agent);
                            agent.speak(`Hi! I'm ${selectedAgent}. How can I help you today?`);
                        }, onError: (error) => {
                            console.error("Failed to load agent:", error);
                        } })] }), loading && _jsxs("p", { children: ["Loading ", selectedAgent, "..."] }), error && (_jsxs("p", { style: { color: "red" }, children: ["Error loading agent: ", error.message] })), isLoaded && agent && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: "20px" }, children: [_jsxs("h2", { children: ["Make ", selectedAgent, " Speak"] }), _jsx("input", { type: "text", value: message, onChange: (e) => setMessage(e.target.value), onKeyPress: (e) => e.key === "Enter" && handleSpeak(), placeholder: "Enter message...", style: { padding: "5px", width: "300px", marginRight: "10px" } }), _jsx("button", { onClick: handleSpeak, style: { padding: "5px 15px" }, children: "Speak" })] }), _jsxs("div", { style: { marginBottom: "20px" }, children: [_jsx("h2", { children: "Animations" }), _jsx("button", { onClick: handleRandomAnimation, style: {
                                    padding: "5px 15px",
                                    marginBottom: "10px",
                                    marginRight: "10px",
                                }, children: "Random Animation" }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "5px" }, children: animations.map((animation) => (_jsx("button", { onClick: () => handleAnimation(animation), style: {
                                        padding: "5px 10px",
                                        fontSize: "12px",
                                        backgroundColor: animation.includes("Idle")
                                            ? "#f0f0f0"
                                            : "#e0e0e0",
                                    }, children: animation }, animation))) })] }), _jsxs("div", { style: { marginBottom: "20px" }, children: [_jsx("h2", { children: "Controls" }), _jsx("button", { onClick: () => agent.show(), style: { padding: "5px 15px", marginRight: "10px" }, children: "Show" }), _jsx("button", { onClick: () => agent.hide(), style: { padding: "5px 15px", marginRight: "10px" }, children: "Hide" }), _jsx("button", { onClick: () => agent.stop(), style: { padding: "5px 15px", marginRight: "10px" }, children: "Stop" }), _jsx("button", { onClick: () => agent.stopCurrent(), style: { padding: "5px 15px", marginRight: "10px" }, children: "Stop Current" })] })] })), _jsxs("div", { style: {
                    marginTop: "40px",
                    padding: "20px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "5px",
                }, children: [_jsx("h2", { children: "Features" }), _jsxs("ul", { children: [_jsx("li", { children: "\u2705 Modern TypeScript implementation" }), _jsx("li", { children: "\u2705 React components and hooks" }), _jsx("li", { children: "\u2705 Promise-based API (no more callbacks!)" }), _jsx("li", { children: "\u2705 Full type safety" }), _jsx("li", { children: "\u2705 Backward compatible with existing agent assets" }), _jsx("li", { children: "\u2705 Clean, maintainable code structure" })] })] })] }));
};
/**
 * Main App component with provider
 */
const App = () => {
    return (_jsx(ClippyProvider, { children: _jsx(ClippyDemo, {}) }));
};
// Mount the app
const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(_jsx(App, {}));
}
