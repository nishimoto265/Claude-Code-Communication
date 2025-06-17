/**
 * Tests for scenario-generator utility
 */

const { 
  generateScenarioYaml,
  generateAgentsYaml,
  generateLayoutYaml,
  generateInstructionFiles
} = require('../../lib/utils/scenario-generator');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('Scenario Generator Utils', () => {
  const testDir = path.join(__dirname, '../../tmp/generator-test');
  
  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });
  
  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('generateScenarioYaml', () => {
    test('should generate valid scenario.yaml', async () => {
      const basicInfo = {
        name: 'Test Scenario',
        description: 'Test description',
        author: 'Test Author',
        tags: ['test', 'unit'],
        initialMessage: 'Hello test'
      };

      await generateScenarioYaml(testDir, basicInfo);
      
      const content = await fs.readFile(path.join(testDir, 'scenario.yaml'), 'utf8');
      const parsed = yaml.load(content);
      
      expect(parsed.name).toBe(basicInfo.name);
      expect(parsed.description).toBe(basicInfo.description);
      expect(parsed.author).toBe(basicInfo.author);
      expect(parsed.tags).toEqual(basicInfo.tags);
      expect(parsed.initial_message).toBe(basicInfo.initialMessage);
      expect(parsed.version).toBe('2.0.0');
      expect(parsed.settings.auto_start_claude).toBe(true);
    });
  });

  describe('generateAgentsYaml', () => {
    test('should generate valid agents.yaml', async () => {
      const agentConfig = {
        agents: [
          {
            id: 'test_agent',
            role: 'Test Role',
            responsibilities: ['Test task 1', 'Test task 2'],
            color: 'red'
          }
        ]
      };

      const tmuxConfig = {
        sessions: {
          main: {
            agents: [{
              ...agentConfig.agents[0],
              session: 'main',
              pane: 0
            }]
          }
        }
      };

      await generateAgentsYaml(testDir, agentConfig, tmuxConfig);
      
      const content = await fs.readFile(path.join(testDir, 'agents.yaml'), 'utf8');
      const parsed = yaml.load(content);
      
      expect(parsed.test_agent.role).toBe('Test Role');
      expect(parsed.test_agent.session).toBe('main');
      expect(parsed.test_agent.pane).toBe(0);
      expect(parsed.test_agent.responsibilities).toEqual(['Test task 1', 'Test task 2']);
      expect(parsed.test_agent.color).toBe('red');
      expect(parsed.test_agent.instruction_file).toBe('instructions/test_agent.md');
    });
  });

  describe('generateLayoutYaml', () => {
    test('should generate valid layout.yaml', async () => {
      const tmuxConfig = {
        sessions: {
          main: {
            window_name: 'test-window',
            layout: 'tiled',
            agents: [
              { id: 'agent1', color: 'red' },
              { id: 'agent2', color: 'blue' }
            ]
          }
        }
      };

      await generateLayoutYaml(testDir, tmuxConfig);
      
      const content = await fs.readFile(path.join(testDir, 'layout.yaml'), 'utf8');
      const parsed = yaml.load(content);
      
      expect(parsed.tmux_sessions.main.window_name).toBe('test-window');
      expect(parsed.tmux_sessions.main.layout).toBe('tiled');
      expect(parsed.tmux_sessions.main.panes).toHaveLength(2);
      expect(parsed.tmux_sessions.main.panes[0].role).toBe('agent1');
      expect(parsed.tmux_sessions.main.panes[0].color).toBe('red');
      expect(parsed.layout_descriptions).toBeDefined();
    });
  });

  describe('generateInstructionFiles', () => {
    test('should generate instruction files for all agents', async () => {
      const agentConfig = {
        agents: [
          {
            id: 'ceo',
            role: 'CEO',
            responsibilities: ['Strategy', 'Leadership']
          },
          {
            id: 'engineer',
            role: 'Engineer',
            responsibilities: ['Coding', 'Testing']
          }
        ]
      };

      // Ensure instructions directory exists
      await fs.ensureDir(path.join(testDir, 'instructions'));
      
      await generateInstructionFiles(testDir, agentConfig);
      
      const ceoFile = path.join(testDir, 'instructions', 'ceo.md');
      const engineerFile = path.join(testDir, 'instructions', 'engineer.md');
      
      expect(await fs.pathExists(ceoFile)).toBe(true);
      expect(await fs.pathExists(engineerFile)).toBe(true);
      
      const ceoContent = await fs.readFile(ceoFile, 'utf8');
      expect(ceoContent).toContain('# 👑 CEO指示書');
      expect(ceoContent).toContain('- Strategy');
      expect(ceoContent).toContain('- Leadership');
      
      const engineerContent = await fs.readFile(engineerFile, 'utf8');
      expect(engineerContent).toContain('# 💻 Engineer指示書');
      expect(engineerContent).toContain('- Coding');
      expect(engineerContent).toContain('- Testing');
    });
  });
});