import React from 'react';
import { ClippyProvider, Clippy } from '@clippyjs/react';

const App = () => (
  <ClippyProvider defaultBasePath="/assets/agents/">
    <Clippy name="Clippy" />
  </ClippyProvider>
);

export default App;
