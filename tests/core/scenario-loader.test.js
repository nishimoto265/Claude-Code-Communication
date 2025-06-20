/**
 * Tests for scenario-loader.js
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const scenarioLoader = require('../../lib/core/scenario-loader');

describe('Scenario Loader', () => {
  let originalCwd;
  
  beforeEach(async () => {
    originalCwd = process.cwd();
    process.chdir(global.testUtils.TEST_DIR);
    // scenariosディレクトリを確実に作成
    await fs.ensureDir(path.join(global.testUtils.TEST_DIR, 'scenarios'));
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
  });

  describe('loadScenarioFromFiles', () => {
    test('完全なシナリオファイルから設定を読み込める', async () => {
      const scenarioDir = await global.testUtils.createMockScenarioFiles('test-scenario');
      
      const config = await scenarioLoader.loadScenarioFromFiles('test-scenario');
      
      expect(config.name).toBe('Test Scenario');
      expect(config.description).toBe('Test scenario for testing');
      expect(config.version).toBe('2.0.0');
      expect(config.agents).toBeDefined();
      expect(config.agents.agent1).toBeDefined();
      expect(config.agents.agent1.role).toBe('Test Agent 1');
      expect(config.tmux_sessions).toBeDefined();
      expect(config.tmux_sessions.test).toBeDefined();
    });

    test('指示書ファイルが存在する場合は内容を読み込む', async () => {
      await global.testUtils.createMockScenarioFiles('test-scenario');
      
      const config = await scenarioLoader.loadScenarioFromFiles('test-scenario');
      
      expect(config.agents.agent1.instructions).toContain('Agent 1 Instructions');
      expect(config.agents.agent2.instructions).toContain('Agent 2 Instructions');
    });

    test('シナリオディレクトリが存在しない場合はエラーが発生する', async () => {
      await expect(scenarioLoader.loadScenarioFromFiles('non-existent'))
        .rejects
        .toThrow('Scenario directory not found');
    });

    test('必要なファイルが不足している場合はエラーが発生する', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'incomplete');
      await fs.ensureDir(scenarioDir);
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump({ name: 'Incomplete' }));
      // agents.yaml と layout.yaml が不足
      
      await expect(scenarioLoader.loadScenarioFromFiles('incomplete'))
        .rejects
        .toThrow('Missing agents configuration file');
    });

    test('不正なYAMLファイルの場合はエラーが発生する', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'invalid');
      await fs.ensureDir(scenarioDir);
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), 'invalid: yaml: content:');
      await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump({}));
      await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump({}));
      
      await expect(scenarioLoader.loadScenarioFromFiles('invalid'))
        .rejects
        .toThrow('Invalid YAML');
    });

    test('指示書ファイルが存在しない場合でもエラーにならない', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'no-instructions');
      await fs.ensureDir(scenarioDir);
      
      const scenario = { name: 'No Instructions', version: '1.0.0' };
      const agents = {
        agent1: {
          role: 'Test Agent',
          instruction_file: 'instructions/non-existent.md'
        }
      };
      const layout = { tmux_sessions: {} };
      
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump(scenario));
      await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump(agents));
      await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump(layout));
      
      const config = await scenarioLoader.loadScenarioFromFiles('no-instructions');
      
      expect(config.name).toBe('No Instructions');
      expect(config.agents.agent1.instructions).toBeUndefined();
    });
  });

  describe('getAvailableExternalScenarios', () => {
    test('有効な外部シナリオの一覧を取得できる', async () => {
      await global.testUtils.createMockScenarioFiles('scenario1');
      await global.testUtils.createMockScenarioFiles('scenario2');
      
      // 不完全なシナリオも作成
      const incompleteDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'incomplete');
      await fs.ensureDir(incompleteDir);
      await fs.writeFile(path.join(incompleteDir, 'scenario.yaml'), yaml.dump({ name: 'Incomplete' }));
      
      const scenarios = await scenarioLoader.getAvailableExternalScenarios();
      
      expect(scenarios).toContain('scenario1');
      expect(scenarios).toContain('scenario2');
      expect(scenarios).not.toContain('incomplete'); // 必要ファイルが不足
    });

    test('scenariosディレクトリが存在しない場合は空配列を返す', async () => {
      const scenarios = await scenarioLoader.getAvailableExternalScenarios();
      
      expect(scenarios).toEqual([]);
    });

    test('ファイルが混在している場合は有効なディレクトリのみ返す', async () => {
      await global.testUtils.createMockScenarioFiles('valid-scenario');
      
      const scenariosDir = path.join(global.testUtils.TEST_DIR, 'scenarios');
      await fs.writeFile(path.join(scenariosDir, 'not-a-directory.txt'), 'test file');
      
      const scenarios = await scenarioLoader.getAvailableExternalScenarios();
      
      expect(scenarios).toEqual(['valid-scenario']);
    });
  });

  describe('validateExternalScenario', () => {
    test('有効なシナリオの場合はvalidがtrueを返す', async () => {
      await global.testUtils.createMockScenarioFiles('valid-scenario');
      
      const result = await scenarioLoader.validateExternalScenario('valid-scenario');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.config).toBeDefined();
    });

    test('nameが不足している場合はエラーを返す', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'no-name');
      await fs.ensureDir(scenarioDir);
      
      const scenario = { description: 'No name scenario' };
      const agents = { agent1: { role: 'Test' } };
      const layout = { tmux_sessions: {} };
      
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump(scenario));
      await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump(agents));
      await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump(layout));
      
      const result = await scenarioLoader.validateExternalScenario('no-name');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing scenario name');
    });

    test('エージェントが参照する存在しないセッションがある場合はエラーを返す', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'invalid-session');
      await fs.ensureDir(scenarioDir);
      
      const scenario = { name: 'Invalid Session' };
      const agents = {
        agent1: { role: 'Test Agent', session: 'non-existent-session', pane: 0 }
      };
      const layout = { tmux_sessions: { valid_session: {} } };
      
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump(scenario));
      await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump(agents));
      await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump(layout));
      
      const result = await scenarioLoader.validateExternalScenario('invalid-session');
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('references non-existent session'))).toBe(true);
    });

    test('指示書ファイルが存在しない場合は警告を返す', async () => {
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'missing-instructions');
      await fs.ensureDir(scenarioDir);
      
      const scenario = { name: 'Missing Instructions' };
      const agents = {
        agent1: {
          role: 'Test Agent',
          session: 'test',
          instruction_file: 'instructions/missing.md'
        }
      };
      const layout = { tmux_sessions: { test: {} } };
      
      await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump(scenario));
      await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump(agents));
      await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump(layout));
      
      const result = await scenarioLoader.validateExternalScenario('missing-instructions');
      
      expect(result.valid).toBe(true); // 警告はあってもvalid
      expect(result.warnings.some(warn => warn.includes('Instruction file not found'))).toBe(true);
    });

    test('存在しないシナリオの場合はエラーを返す', async () => {
      const result = await scenarioLoader.validateExternalScenario('non-existent');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('resolveAgentAlias', () => {
    test('エージェント名が直接存在する場合はそのまま返す', () => {
      const agents = {
        cmo: { role: 'CMO', aliases: ['marketing_director'] },
        ceo: { role: 'CEO' }
      };
      
      const result = scenarioLoader.resolveAgentAlias(agents, 'cmo');
      
      expect(result).toBe('cmo');
    });

    test('エイリアスが存在する場合は元のエージェント名を返す', () => {
      const agents = {
        cmo: { role: 'CMO', aliases: ['marketing_director'] },
        ceo: { role: 'CEO' }
      };
      
      const result = scenarioLoader.resolveAgentAlias(agents, 'marketing_director');
      
      expect(result).toBe('cmo');
    });

    test('存在しないエージェント名の場合はnullを返す', () => {
      const agents = {
        cmo: { role: 'CMO' },
        ceo: { role: 'CEO' }
      };
      
      const result = scenarioLoader.resolveAgentAlias(agents, 'non-existent');
      
      expect(result).toBeNull();
    });

    test('エイリアスが設定されていないエージェントでも正常に動作する', () => {
      const agents = {
        ceo: { role: 'CEO' }  // aliasesなし
      };
      
      const result = scenarioLoader.resolveAgentAlias(agents, 'ceo');
      
      expect(result).toBe('ceo');
    });
  });

  describe('getAgentConfig', () => {
    test('エージェント設定を取得できる', () => {
      const agents = {
        cmo: { role: 'CMO', session: 'strategy' },
        ceo: { role: 'CEO', session: 'strategy' }
      };
      
      const result = scenarioLoader.getAgentConfig(agents, 'cmo');
      
      expect(result).toEqual({ role: 'CMO', session: 'strategy' });
    });

    test('エイリアス経由でエージェント設定を取得できる', () => {
      const agents = {
        cmo: { role: 'CMO', aliases: ['marketing_director'] }
      };
      
      const result = scenarioLoader.getAgentConfig(agents, 'marketing_director');
      
      expect(result).toEqual({ role: 'CMO', aliases: ['marketing_director'] });
    });

    test('存在しないエージェントの場合はnullを返す', () => {
      const agents = {
        cmo: { role: 'CMO' }
      };
      
      const result = scenarioLoader.getAgentConfig(agents, 'non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('createExternalFiles', () => {
    test('シナリオ設定から外部ファイルを作成できる', async () => {
      const scenarioConfig = {
        name: 'Test External Creation',
        description: 'Testing external file creation',
        agents: {
          ceo: { role: 'CEO', session: 'main', pane: 0 },
          cmo: { role: 'CMO', session: 'main', pane: 1 }
        },
        tmux_sessions: {
          main: {
            window_name: 'main-window',
            panes: [
              { role: 'ceo', color: 'red' },
              { role: 'cmo', color: 'blue' }
            ]
          }
        }
      };
      
      await scenarioLoader.createExternalFiles('new-scenario', scenarioConfig);
      
      const scenarioDir = path.join(global.testUtils.TEST_DIR, 'scenarios', 'new-scenario');
      expect(await fs.pathExists(path.join(scenarioDir, 'scenario.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(scenarioDir, 'agents.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(scenarioDir, 'layout.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(scenarioDir, 'instructions'))).toBe(true);
      
      // ファイル内容の確認
      const scenarioContent = yaml.load(await fs.readFile(path.join(scenarioDir, 'scenario.yaml'), 'utf8'));
      expect(scenarioContent.name).toBe('Test External Creation');
      
      const agentsContent = yaml.load(await fs.readFile(path.join(scenarioDir, 'agents.yaml'), 'utf8'));
      expect(agentsContent.ceo).toBeDefined();
      expect(agentsContent.cmo).toBeDefined();
      expect(agentsContent.cmo.aliases).toBeUndefined(); // CMOのエイリアスは追加されない
      
      const layoutContent = yaml.load(await fs.readFile(path.join(scenarioDir, 'layout.yaml'), 'utf8'));
      expect(layoutContent.tmux_sessions.main).toBeDefined();
    });
  });
});