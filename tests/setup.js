/**
 * Jest setup file
 */

const fs = require('fs-extra');
const path = require('path');

// モックテスト用のディレクトリ
const TEST_DIR = path.join(__dirname, 'temp');
let originalCwd;

beforeEach(async () => {
  // 元の作業ディレクトリを保存
  originalCwd = process.cwd();
  
  // テスト用一時ディレクトリを作成
  try {
    await fs.remove(TEST_DIR);
  } catch (error) {
    // ディレクトリが存在しない場合は無視
  }
  await fs.ensureDir(TEST_DIR);
  
  // 必要なサブディレクトリも作成
  await fs.ensureDir(path.join(TEST_DIR, 'tmp'));
  await fs.ensureDir(path.join(TEST_DIR, 'logs'));
  await fs.ensureDir(path.join(TEST_DIR, 'scenarios'));
  
  // 作業ディレクトリをテスト用に変更
  process.chdir(TEST_DIR);
});

afterEach(async () => {
  // 作業ディレクトリを元に戻す
  if (originalCwd) {
    process.chdir(originalCwd);
  }
  
  // テスト後のクリーンアップ
  try {
    await fs.remove(TEST_DIR);
  } catch (error) {
    // エラーは無視（ディレクトリが既に削除されている場合など）
  }
});

// グローバルなテストユーティリティ
global.testUtils = {
  TEST_DIR,
  createMockConfig: () => ({
    version: '2.0.0',
    currentScenario: 'test-scenario',
    projectName: 'TestProject',
    scenarios: {
      'test-scenario': {
        name: 'Test Scenario',
        description: 'Test scenario for testing',
        tmux_sessions: {
          test: {
            window_name: 'test-window',
            panes: [
              { role: 'agent1', color: 'red' },
              { role: 'agent2', color: 'blue' }
            ]
          }
        },
        agents: {
          agent1: { role: 'Test Agent 1', session: 'test', pane: 0 },
          agent2: { role: 'Test Agent 2', session: 'test', pane: 1 }
        }
      }
    },
    settings: {
      tmuxPrefix: 'C-b',
      autoStartClaude: true,
      logLevel: 'info',
      colorOutput: true
    },
    createdAt: '2025-06-16T00:00:00.000Z',
    lastUpdated: '2025-06-16T00:00:00.000Z'
  }),
  
  createMockScenarioFiles: async (scenarioName = 'test-scenario') => {
    const scenarioDir = path.join(TEST_DIR, 'scenarios', scenarioName);
    await fs.ensureDir(scenarioDir);
    await fs.ensureDir(path.join(scenarioDir, 'instructions'));
    
    // scenario.yaml
    const scenario = {
      name: 'Test Scenario',
      description: 'Test scenario for testing',
      version: '2.0.0',
      author: 'Test',
      tags: ['test'],
      initial_message: 'Test message',
      settings: {
        auto_start_claude: true,
        message_wait_time: 0.5,
        enable_logging: true
      }
    };
    
    // agents.yaml
    const agents = {
      agent1: {
        role: 'Test Agent 1',
        session: 'test',
        pane: 0,
        responsibilities: ['Test responsibility'],
        communication_style: 'Test style',
        color: 'red',
        instruction_file: 'instructions/agent1.md'
      },
      agent2: {
        role: 'Test Agent 2',
        session: 'test',
        pane: 1,
        responsibilities: ['Test responsibility'],
        communication_style: 'Test style',
        color: 'blue',
        instruction_file: 'instructions/agent2.md'
      }
    };
    
    // layout.yaml
    const layout = {
      tmux_sessions: {
        test: {
          window_name: 'test-window',
          layout: 'even-horizontal',
          panes: [
            { role: 'agent1', color: 'red' },
            { role: 'agent2', color: 'blue' }
          ]
        }
      },
      layout_descriptions: {
        'even-horizontal': 'Horizontal split for 2 panes'
      }
    };
    
    const yaml = require('js-yaml');
    await fs.writeFile(path.join(scenarioDir, 'scenario.yaml'), yaml.dump(scenario));
    await fs.writeFile(path.join(scenarioDir, 'agents.yaml'), yaml.dump(agents));
    await fs.writeFile(path.join(scenarioDir, 'layout.yaml'), yaml.dump(layout));
    
    // instruction files
    await fs.writeFile(
      path.join(scenarioDir, 'instructions', 'agent1.md'),
      '# Agent 1 Instructions\nTest instructions for agent 1'
    );
    await fs.writeFile(
      path.join(scenarioDir, 'instructions', 'agent2.md'),
      '# Agent 2 Instructions\nTest instructions for agent 2'
    );
    
    return scenarioDir;
  }
};

// Console出力をテスト中は抑制
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// テスト終了後に元に戻す
afterAll(() => {
  global.console = originalConsole;
});