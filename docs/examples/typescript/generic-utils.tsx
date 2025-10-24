/**
 * Generic TypeScript Utilities Example
 *
 * Demonstrates creating reusable, generic utilities with @clippyjs/react
 */

import { useAgent, AgentName, Agent, UseAgentReturn } from '@clippyjs/react';
import { useCallback, useState } from 'react';

/**
 * Generic agent action type
 */
type AgentAction<T = void> = (agent: Agent) => Promise<T>;

/**
 * Generic agent controller hook
 * Provides type-safe agent control with reusable actions
 */
export function useAgentController<TName extends AgentName>(
  name: TName,
  autoLoad: boolean = true
) {
  const agentAPI = useAgent(name, { autoLoad });
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * Execute an action with the agent
   * Handles loading state and errors automatically
   */
  const execute = useCallback(
    async <T,>(action: AgentAction<T>): Promise<T | null> => {
      if (!agentAPI.agent) {
        console.warn('Agent not loaded');
        return null;
      }

      setIsExecuting(true);
      try {
        return await action(agentAPI.agent);
      } catch (error) {
        console.error('Action failed:', error);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [agentAPI.agent]
  );

  return {
    ...agentAPI,
    isExecuting,
    execute,
  };
}

/**
 * Predefined agent actions library
 */
export const AgentActions = {
  /**
   * Greet action
   */
  greet: (message: string): AgentAction => {
    return async (agent) => {
      await agent.play('Wave');
      await agent.speak(message);
    };
  },

  /**
   * Congratulate action
   */
  congratulate: (message: string = 'Congratulations!'): AgentAction => {
    return async (agent) => {
      await agent.play('Congratulate');
      await agent.speak(message);
    };
  },

  /**
   * Explain action
   */
  explain: (text: string): AgentAction => {
    return async (agent) => {
      await agent.play('Explain');
      await agent.speak(text, true); // Hold balloon
    };
  },

  /**
   * Move and speak action
   */
  moveAndSpeak: (
    x: number,
    y: number,
    message: string
  ): AgentAction => {
    return async (agent) => {
      await agent.moveTo(x, y, 1000);
      await agent.speak(message);
    };
  },

  /**
   * Gesture at element
   */
  gestureAtElement: (
    selector: string,
    message?: string
  ): AgentAction => {
    return async (agent) => {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const rect = element.getBoundingClientRect();
      await agent.gestureAt(rect.left + rect.width / 2, rect.top);

      if (message) {
        await agent.speak(message);
      }
    };
  },
} as const;

/**
 * Agent sequence builder
 * Chains multiple actions together
 */
export class AgentSequenceBuilder<TName extends AgentName> {
  private actions: AgentAction[] = [];

  constructor(
    private readonly name: TName,
    private readonly agentAPI: UseAgentReturn
  ) {}

  /**
   * Add action to sequence
   */
  then(action: AgentAction): this {
    this.actions.push(action);
    return this;
  }

  /**
   * Add delay to sequence
   */
  delay(ms: number): this {
    this.actions.push(async (agent) => {
      await agent.delay(ms);
    });
    return this;
  }

  /**
   * Execute the sequence
   */
  async execute(): Promise<void> {
    const { agent } = this.agentAPI;
    if (!agent) {
      throw new Error('Agent not loaded');
    }

    for (const action of this.actions) {
      await action(agent);
    }
  }
}

/**
 * Create a sequence builder
 */
export function createSequence<TName extends AgentName>(
  name: TName,
  agentAPI: UseAgentReturn
): AgentSequenceBuilder<TName> {
  return new AgentSequenceBuilder(name, agentAPI);
}

/**
 * Type-safe animation validator
 */
export function createAnimationValidator(agent: Agent | null) {
  return {
    /**
     * Validate and play animation
     */
    playIfExists: async (animationName: string): Promise<boolean> => {
      if (!agent) return false;

      if (agent.hasAnimation(animationName)) {
        await agent.play(animationName);
        return true;
      }

      console.warn(`Animation "${animationName}" does not exist`);
      return false;
    },

    /**
     * Get available animations
     */
    getAvailable: (): string[] => {
      return agent?.getAnimations() ?? [];
    },

    /**
     * Play random animation
     */
    playRandom: async (): Promise<string | null> => {
      if (!agent) return null;

      const animations = agent.getAnimations();
      if (animations.length === 0) return null;

      const random = animations[Math.floor(Math.random() * animations.length)];
      await agent.play(random);
      return random;
    },
  };
}

/**
 * Example component using generic utilities
 */
export function GenericUtilsExample() {
  const controller = useAgentController('Clippy', true);
  const { execute, isExecuting, agent } = controller;

  const validator = createAnimationValidator(agent);

  // Use predefined actions
  const handleGreet = () => {
    execute(AgentActions.greet('Hello from generic utils!'));
  };

  const handleCelebrate = () => {
    execute(AgentActions.congratulate('You did it!'));
  };

  // Use sequence builder
  const handleSequence = async () => {
    if (!agent) return;

    await createSequence('Clippy', controller)
      .then(AgentActions.greet('Starting sequence...'))
      .delay(1000)
      .then(AgentActions.explain('This is a sequence of actions!'))
      .delay(500)
      .then(AgentActions.congratulate('Sequence complete!'))
      .execute();
  };

  // Use animation validator
  const handleRandomAnimation = async () => {
    const played = await validator.playRandom();
    console.log('Played animation:', played);
  };

  return (
    <div>
      <h2>Generic TypeScript Utilities</h2>

      <div>
        <button onClick={handleGreet} disabled={!agent || isExecuting}>
          Greet
        </button>

        <button onClick={handleCelebrate} disabled={!agent || isExecuting}>
          Celebrate
        </button>

        <button onClick={handleSequence} disabled={!agent || isExecuting}>
          Run Sequence
        </button>

        <button onClick={handleRandomAnimation} disabled={!agent || isExecuting}>
          Random Animation
        </button>
      </div>

      <div>
        <p>Agent: {agent ? 'Loaded' : 'Loading...'}</p>
        <p>Executing: {isExecuting ? 'Yes' : 'No'}</p>
        <p>Animations: {validator.getAvailable().length}</p>
      </div>
    </div>
  );
}

export default GenericUtilsExample;
