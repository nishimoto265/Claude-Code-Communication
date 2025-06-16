/**
 * Tests for config-manager.js
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// テスト対象のモジュールをインポート
const configManager = require('../../lib/core/config-manager');

describe('Config Manager', () => {
  let originalCwd;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    process.chdir(global.testUtils.TEST_DIR);
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
  });

  describe('loadConfig', () => {
    test('YAMLファイルが存在する場合は正常に読み込める', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const result = await configManager.loadConfig();
      
      expect(result.version).toBe('2.0.0');
      expect(result.currentScenario).toBe('test-scenario');
      expect(result.scenarios).toBeDefined();
    });

    test('JSONファイルが存在する場合は後方互換性で読み込める', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeJSON(path.join(global.testUtils.TEST_DIR, 'claude-agents.json'), config);
      
      const result = await configManager.loadConfig();
      
      expect(result.version).toBe('2.0.0');
      expect(result.currentScenario).toBe('test-scenario');
    });

    test('設定ファイルが存在しない場合はエラーが発生する', async () => {
      await expect(configManager.loadConfig())
        .rejects
        .toThrow('Configuration file not found');
    });

    test('versionが不正な場合はエラーが発生する', async () => {
      const config = global.testUtils.createMockConfig();
      delete config.version;
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await expect(configManager.loadConfig())
        .rejects
        .toThrow('missing version');
    });

    test('scenariosが不正な場合はエラーが発生する', async () => {
      const config = global.testUtils.createMockConfig();
      delete config.scenarios;
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await expect(configManager.loadConfig())
        .rejects
        .toThrow('missing scenarios');
    });

    test('不正なYAMLファイルの場合はエラーが発生する', async () => {
      await fs.writeFile('claude-agents.yaml', 'invalid: yaml: content:');
      
      await expect(configManager.loadConfig())
        .rejects
        .toThrow('Configuration load error');
    });
  });

  describe('saveConfig', () => {
    test('設定をYAMLファイルに保存できる', async () => {
      const config = global.testUtils.createMockConfig();
      
      await configManager.saveConfig(config);
      
      expect(await fs.pathExists(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'))).toBe(true);
      const savedContent = await fs.readFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'utf8');
      const parsedConfig = yaml.load(savedContent);
      expect(parsedConfig.version).toBe('2.0.0');
      expect(parsedConfig.lastUpdated).toBeDefined();
    });

    test('保存時にlastUpdatedが更新される', async () => {
      const config = global.testUtils.createMockConfig();
      const originalTimestamp = config.lastUpdated;
      
      // 少し時間を置く
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await configManager.saveConfig(config);
      
      expect(config.lastUpdated).not.toBe(originalTimestamp);
      expect(new Date(config.lastUpdated)).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentScenario', () => {
    test('現在のシナリオを取得できる', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const scenario = await configManager.getCurrentScenario();
      
      expect(scenario).toBe('test-scenario');
    });

    test('設定ファイルが存在しない場合はnullを返す', async () => {
      const scenario = await configManager.getCurrentScenario();
      
      expect(scenario).toBeNull();
    });
  });

  describe('setCurrentScenario', () => {
    test('現在のシナリオを変更できる', async () => {
      const config = global.testUtils.createMockConfig();
      config.scenarios['new-scenario'] = {
        name: 'New Scenario',
        agents: { agent1: { role: 'Test' } }
      };
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await configManager.setCurrentScenario('new-scenario');
      
      const updatedConfig = await configManager.loadConfig();
      expect(updatedConfig.currentScenario).toBe('new-scenario');
    });

    test('存在しないシナリオを設定しようとするとエラーが発生する', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await expect(configManager.setCurrentScenario('invalid-scenario'))
        .rejects
        .toThrow('Invalid scenario: invalid-scenario');
    });

    test('temp/current_scenario.txtファイルが作成される', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await configManager.setCurrentScenario('test-scenario');
      
      expect(await fs.pathExists('./tmp/current_scenario.txt')).toBe(true);
      const content = await fs.readFile('./tmp/current_scenario.txt', 'utf8');
      expect(content).toBe('test-scenario');
    });
  });

  describe('getScenarioConfig', () => {
    beforeEach(async () => {
      await global.testUtils.createMockScenarioFiles('test-scenario');
    });

    test('外部YAMLファイルからシナリオ設定を読み込める', async () => {
      // メイン設定ファイルも作成
      const mainConfig = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(mainConfig));
      
      const config = await configManager.getScenarioConfig('test-scenario');
      
      expect(config.name).toBe('Test Scenario');
      expect(config.agents).toBeDefined();
      expect(config.agents.agent1).toBeDefined();
      expect(config.tmux_sessions).toBeDefined();
    });

    test('外部ファイルが存在しない場合は内部設定にフォールバックする', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(mockConfig));
      
      const config = await configManager.getScenarioConfig('test-scenario');
      
      expect(config.name).toBe('Test Scenario');
    });

    test('シナリオ名を指定しない場合は全シナリオを返す', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(mockConfig));
      
      const scenarios = await configManager.getScenarioConfig();
      
      expect(scenarios).toEqual(mockConfig.scenarios);
    });

    test('存在しないシナリオを指定するとエラーが発生する', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(mockConfig));
      
      await expect(configManager.getScenarioConfig('non-existent'))
        .rejects
        .toThrow('Scenario not found: non-existent');
    });
  });

  describe('updateScenarioConfig', () => {
    test('シナリオ設定を更新できる', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const updates = {
        name: 'Updated Test Scenario',
        description: 'Updated description'
      };
      
      await configManager.updateScenarioConfig('test-scenario', updates);
      
      const updatedConfig = await configManager.loadConfig();
      expect(updatedConfig.scenarios['test-scenario'].name).toBe('Updated Test Scenario');
      expect(updatedConfig.scenarios['test-scenario'].description).toBe('Updated description');
    });

    test('存在しないシナリオを更新しようとするとエラーが発生する', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      await expect(configManager.updateScenarioConfig('non-existent', {}))
        .rejects
        .toThrow('Scenario not found: non-existent');
    });
  });

  describe('getSettings', () => {
    test('アプリケーション設定を取得できる', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const settings = await configManager.getSettings();
      
      expect(settings.tmuxPrefix).toBe('C-b');
      expect(settings.autoStartClaude).toBe(true);
    });

    test('設定ファイルが存在しない場合は空オブジェクトを返す', async () => {
      const settings = await configManager.getSettings();
      
      expect(settings).toEqual({});
    });
  });

  describe('updateSettings', () => {
    test('アプリケーション設定を更新できる', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const updates = {
        logLevel: 'debug',
        newSetting: 'test-value'
      };
      
      await configManager.updateSettings(updates);
      
      const updatedSettings = await configManager.getSettings();
      expect(updatedSettings.logLevel).toBe('debug');
      expect(updatedSettings.newSetting).toBe('test-value');
      expect(updatedSettings.tmuxPrefix).toBe('C-b'); // 既存設定は保持
    });
  });

  describe('initializeConfig', () => {
    test('デフォルト設定でコンフィグを初期化できる', async () => {
      const config = await configManager.initializeConfig();
      
      expect(config.version).toBe('2.0.0');
      expect(config.currentScenario).toBe('business-strategy');
      expect(config.scenarios).toBeDefined();
      expect(config.scenarios['hello-world']).toBeDefined();
      expect(config.scenarios['business-strategy']).toBeDefined();
      expect(await fs.pathExists(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'))).toBe(true);
    });

    test('オプションを指定して初期化できる', async () => {
      const options = {
        scenario: 'hello-world',
        projectName: 'CustomProject'
      };
      
      const config = await configManager.initializeConfig(options);
      
      expect(config.currentScenario).toBe('hello-world');
      expect(config.projectName).toBe('CustomProject');
    });

    test('プロジェクト名が指定されていない場合は現在のディレクトリ名を使用する', async () => {
      const config = await configManager.initializeConfig();
      
      expect(config.projectName).toBe(path.basename(global.testUtils.TEST_DIR));
    });
  });

  describe('validateConfig', () => {
    test('有効な設定の場合はvalidがtrueを返す', async () => {
      const config = global.testUtils.createMockConfig();
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const result = await configManager.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('versionが不足している場合はエラーを返す', async () => {
      const config = global.testUtils.createMockConfig();
      delete config.version;
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const result = await configManager.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration load error: Invalid configuration file: missing version');
    });

    test('scenariosが不足している場合はエラーを返す', async () => {
      const config = global.testUtils.createMockConfig();
      delete config.scenarios;
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const result = await configManager.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration load error: Invalid configuration file: missing scenarios');
    });

    test('シナリオにnameが不足している場合はエラーを返す', async () => {
      const config = global.testUtils.createMockConfig();
      delete config.scenarios['test-scenario'].name;
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), yaml.dump(config));
      
      const result = await configManager.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('missing name'))).toBe(true);
    });

    test('設定ファイルが存在しない場合はエラーを返す', async () => {
      const result = await configManager.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});