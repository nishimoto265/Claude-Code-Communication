/**
 * Tests for create-scenario command
 */

const fs = require('fs-extra');
const path = require('path');
const { generateScenarioFiles } = require('../../lib/utils/scenario-generator');

describe('Create Scenario Command', () => {
  const testOutputDir = path.join(__dirname, '../../tmp/test-scenarios');
  
  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
  });
  
  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Scenario File Generation', () => {
    test('should generate all required files', async () => {
      const basicInfo = {
        id: 'test-scenario',
        name: 'Test Scenario',
        description: 'Test scenario for unit testing',
        author: 'Test Author',
        tags: ['test'],
        initialMessage: 'Test message'
      };

      const agentConfig = {
        agents: [
          {
            id: 'agent1',
            name: 'Agent 1',
            role: 'Test Role 1',
            responsibilities: ['Task 1', 'Task 2'],
            color: 'red',
            pane: 0
          },
          {
            id: 'agent2',
            name: 'Agent 2',
            role: 'Test Role 2',
            responsibilities: ['Task 3', 'Task 4'],
            color: 'blue',
            pane: 1
          }
        ]
      };

      const tmuxConfig = {
        sessions: {
          main: {
            window_name: 'main-team',
            layout: 'even-horizontal',
            agents: agentConfig.agents.map(agent => ({
              ...agent,
              session: 'main'
            }))
          }
        }
      };

      // Change working directory temporarily
      const originalCwd = process.cwd();
      process.chdir(testOutputDir);

      try {
        await generateScenarioFiles(basicInfo, agentConfig, tmuxConfig);

        // Check if files were created
        const scenarioDir = path.join(testOutputDir, 'scenarios', basicInfo.id);
        
        expect(await fs.pathExists(path.join(scenarioDir, 'scenario.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(scenarioDir, 'agents.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(scenarioDir, 'layout.yaml'))).toBe(true);
        expect(await fs.pathExists(path.join(scenarioDir, 'instructions', 'agent1.md'))).toBe(true);
        expect(await fs.pathExists(path.join(scenarioDir, 'instructions', 'agent2.md'))).toBe(true);

      } finally {
        process.chdir(originalCwd);
      }
    });

    test('should generate valid YAML files', async () => {
      const basicInfo = {
        id: 'yaml-test',
        name: 'YAML Test Scenario',
        description: 'Testing YAML generation',
        author: 'Test Author',
        tags: ['yaml', 'test'],
        initialMessage: 'YAML test message'
      };

      const agentConfig = {
        agents: [
          {
            id: 'yaml_agent',
            name: 'YAML Agent',
            role: 'YAML Tester',
            responsibilities: ['YAML validation'],
            color: 'green',
            pane: 0
          }
        ]
      };

      const tmuxConfig = {
        sessions: {
          main: {
            window_name: 'yaml-test',
            layout: 'single',
            agents: [{
              ...agentConfig.agents[0],
              session: 'main'
            }]
          }
        }
      };

      const originalCwd = process.cwd();
      process.chdir(testOutputDir);

      try {
        await generateScenarioFiles(basicInfo, agentConfig, tmuxConfig);

        const scenarioDir = path.join(testOutputDir, 'scenarios', basicInfo.id);
        
        // Read and parse YAML files
        const yaml = require('js-yaml');
        
        const scenarioContent = await fs.readFile(path.join(scenarioDir, 'scenario.yaml'), 'utf8');
        const scenarioYaml = yaml.load(scenarioContent);
        expect(scenarioYaml.name).toBe(basicInfo.name);
        
        const agentsContent = await fs.readFile(path.join(scenarioDir, 'agents.yaml'), 'utf8');
        const agentsYaml = yaml.load(agentsContent);
        expect(agentsYaml.yaml_agent.role).toBe('YAML Tester');
        
        const layoutContent = await fs.readFile(path.join(scenarioDir, 'layout.yaml'), 'utf8');
        const layoutYaml = yaml.load(layoutContent);
        expect(layoutYaml.tmux_sessions.main.window_name).toBe('yaml-test');

      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Agent Configuration', () => {
    test('should handle multiple sessions correctly', async () => {
      const basicInfo = {
        id: 'multi-session',
        name: 'Multi Session Test',
        description: 'Testing multiple sessions',
        author: 'Test Author',
        tags: ['multi', 'session'],
        initialMessage: 'Multi session test'
      };

      const agentConfig = {
        agents: [
          { id: 'agent1', name: 'Agent 1', role: 'Role 1', responsibilities: ['Task 1'], color: 'red', pane: 0 },
          { id: 'agent2', name: 'Agent 2', role: 'Role 2', responsibilities: ['Task 2'], color: 'blue', pane: 1 },
          { id: 'agent3', name: 'Agent 3', role: 'Role 3', responsibilities: ['Task 3'], color: 'green', pane: 0 },
          { id: 'agent4', name: 'Agent 4', role: 'Role 4', responsibilities: ['Task 4'], color: 'yellow', pane: 1 }
        ]
      };

      const tmuxConfig = {
        sessions: {
          session1: {
            window_name: 'session-1',
            layout: 'even-horizontal',
            agents: [
              { ...agentConfig.agents[0], session: 'session1' },
              { ...agentConfig.agents[1], session: 'session1' }
            ]
          },
          session2: {
            window_name: 'session-2',
            layout: 'even-horizontal',
            agents: [
              { ...agentConfig.agents[2], session: 'session2' },
              { ...agentConfig.agents[3], session: 'session2' }
            ]
          }
        }
      };

      const originalCwd = process.cwd();
      process.chdir(testOutputDir);

      try {
        await generateScenarioFiles(basicInfo, agentConfig, tmuxConfig);

        const scenarioDir = path.join(testOutputDir, 'scenarios', basicInfo.id);
        const yaml = require('js-yaml');
        
        const layoutContent = await fs.readFile(path.join(scenarioDir, 'layout.yaml'), 'utf8');
        const layoutYaml = yaml.load(layoutContent);
        
        expect(Object.keys(layoutYaml.tmux_sessions)).toHaveLength(2);
        expect(layoutYaml.tmux_sessions.session1.panes).toHaveLength(2);
        expect(layoutYaml.tmux_sessions.session2.panes).toHaveLength(2);

      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});