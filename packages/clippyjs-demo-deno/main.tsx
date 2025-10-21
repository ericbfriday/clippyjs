import React, { useState, useEffect } from "https://esm.sh/react@18.2.0";
import ReactDOMServer from "https://esm.sh/react-dom@18.2.0/server";
import { ClippyProvider, useClippy, AgentName } from "jsr:@friday/clippyjs";
import { Chat } from "./Chat.tsx";
import { prompts } from "./prompts.ts";
import { streamText } from "https://esm.sh/ai";

// IMPORTANT: Replace with your actual API key
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

function App() {
  const { clippy, agentName } = useClippy();
  const [messages, setMessages] = useState<string[]>([]);

  const handleUserInput = async (input: string) => {
    setMessages([...messages, `You: ${input}`]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, agent: agentName }),
    });

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      setMessages((prevMessages) => [...prevMessages, `Clippy: `]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;
        setMessages((prevMessages) => [
          ...prevMessages.slice(0, -1),
          `Clippy: ${fullResponse}`,
        ]);
      }

      if (clippy) {
        clippy.speak(fullResponse);
      }
    }
  };

  return (
    <div>
      <h1>ClippyJS LLM Agent Example</h1>
      <div
        style={{
          height: "80vh",
          overflowY: "scroll",
          padding: "10px",
          border: "1px solid #ccc",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <Chat onUserInput={handleUserInput} />
    </div>
  );
}

Deno.serve(async (req) => {
  if (new URL(req.url).pathname === "/api/chat") {
    const { message, agent } = await req.json();
    const prompt = prompts[agent as AgentName] || prompts.Clippy;

    const result = await streamText({
      model: "gpt-3.5-turbo", // Or any other model
      prompt: `${prompt}\n\nUser: ${message}\nAI:`,
      apiKey: OPENAI_API_KEY,
    });

    return result.toTextStreamResponse();
  }

  const stream = ReactDOMServer.renderToReadableStream(
    <ClippyProvider>
      <App />
    </ClippyProvider>,
  );
  return new Response(stream, {
    headers: { "content-type": "text/html" },
  });
});
