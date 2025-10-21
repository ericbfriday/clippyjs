import React from 'react';
import { ClippyProvider, Clippy } from 'clippyjs';

const App = () => (
  <ClippyProvider defaultBasePath="/assets/agents/">
    <Clippy name="Clippy" />
  </ClippyProvider>
);

export default App;
