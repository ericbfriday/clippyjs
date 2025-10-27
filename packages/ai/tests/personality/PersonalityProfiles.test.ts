import { describe, it, expect } from 'vitest';
import {
  AGENT_PERSONALITIES,
  getPersonalityPrompt,
  getPersonalityProfile,
  getAvailableAgents,
  isValidAgentName,
} from '../../src/personality/PersonalityProfiles';

describe('PersonalityProfiles', () => {
  it('should have profiles for all 10 agents', () => {
    const agents = getAvailableAgents();

    expect(agents).toHaveLength(10);
    expect(agents).toContain('Clippy');
    expect(agents).toContain('Merlin');
    expect(agents).toContain('Bonzi');
    expect(agents).toContain('F1');
    expect(agents).toContain('Genie');
    expect(agents).toContain('Genius');
    expect(agents).toContain('Links');
    expect(agents).toContain('Peedy');
    expect(agents).toContain('Rocky');
    expect(agents).toContain('Rover');
  });

  it('should have both classic and extended modes for each agent', () => {
    const agents = getAvailableAgents();

    agents.forEach((agent) => {
      expect(AGENT_PERSONALITIES[agent].classic).toBeDefined();
      expect(AGENT_PERSONALITIES[agent].extended).toBeDefined();
    });
  });

  it('should get personality prompt for Clippy classic', () => {
    const prompt = getPersonalityPrompt('Clippy', 'classic');

    expect(prompt).toContain('Clippy');
    expect(prompt).toContain('Microsoft Office');
    expect(prompt).toContain('It looks like');
  });

  it('should get personality prompt for Clippy extended', () => {
    const prompt = getPersonalityPrompt('Clippy', 'extended');

    expect(prompt).toContain('Clippy');
    expect(prompt).toContain('modern AI');
    expect(prompt).toContain('25+ years');
  });

  it('should append custom prompt when provided', () => {
    const customPrompt = 'Additional instruction: Be extra helpful.';
    const prompt = getPersonalityPrompt('Clippy', 'classic', customPrompt);

    expect(prompt).toContain('Additional instruction');
    expect(prompt).toContain('Be extra helpful');
  });

  it('should get full personality profile', () => {
    const profile = getPersonalityProfile('Clippy', 'classic');

    expect(profile.systemPrompt).toBeDefined();
    expect(profile.traits).toBeInstanceOf(Array);
    expect(profile.traits).toContain('eager');
    expect(profile.traits).toContain('helpful');
  });

  it('should have traits for all agents', () => {
    const agents = getAvailableAgents();

    agents.forEach((agent) => {
      const classicProfile = getPersonalityProfile(agent, 'classic');
      const extendedProfile = getPersonalityProfile(agent, 'extended');

      expect(classicProfile.traits.length).toBeGreaterThan(0);
      expect(extendedProfile.traits.length).toBeGreaterThan(0);
    });
  });

  it('should validate agent names', () => {
    expect(isValidAgentName('Clippy')).toBe(true);
    expect(isValidAgentName('Merlin')).toBe(true);
    expect(isValidAgentName('InvalidAgent')).toBe(false);
    expect(isValidAgentName('clippy')).toBe(false); // Case-sensitive
  });

  it('should throw error for invalid agent', () => {
    expect(() => {
      getPersonalityPrompt('InvalidAgent' as any, 'classic');
    }).toThrow();
  });

  it('should throw error for invalid mode', () => {
    expect(() => {
      getPersonalityPrompt('Clippy', 'invalid' as any);
    }).toThrow();
  });

  describe('Merlin personality', () => {
    it('should have mystical language in classic mode', () => {
      const prompt = getPersonalityPrompt('Merlin', 'classic');

      expect(prompt).toContain('wizard');
      expect(prompt).toContain('magic');
    });

    it('should bridge old and new in extended mode', () => {
      const prompt = getPersonalityPrompt('Merlin', 'extended');

      expect(prompt).toContain('wizard');
      expect(prompt).toContain('modern');
      expect(prompt).toContain('technology');
    });
  });

  describe('F1 personality', () => {
    it('should emphasize speed in classic mode', () => {
      const profile = getPersonalityProfile('F1', 'classic');

      expect(profile.traits).toContain('fast');
      expect(profile.traits).toContain('efficient');
    });
  });
});
