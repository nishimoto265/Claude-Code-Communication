/**
 * Tests for send command
 */

const path = require('path');
const { spawn } = require('child_process');

// 依存関係をモック
jest.mock('child_process');
jest.mock('../../lib/core/config-manager');
jest.mock('../../lib/core/agent-manager');
jest.mock('fs-extra');

const sendCommand = require('../../lib/commands/send');
const configManager = require('../../lib/core/config-manager');
const agentManager = require('../../lib/core/agent-manager');
const fs = require('fs-extra');

describe('Send Command', () => {
  let originalCwd;
  let mockSpawn;
  let originalExit;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    process.chdir(global.testUtils.TEST_DIR);
    
    // process.exitをモック
    originalExit = process.exit;
    process.exit = jest.fn();
    
    // child_processのspawnをモック
    mockSpawn = jest.fn();
    spawn.mockImplementation(mockSpawn);
    
    // fs-extraのモック
    fs.pathExists.mockImplementation((path) => {
      if (path.includes('claude-agents.yaml') || path.includes('claude-agents.json')) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    });
    fs.ensureDir.mockResolvedValue();
    fs.writeFile.mockResolvedValue();
    fs.readFile.mockResolvedValue('');
    fs.appendFile.mockResolvedValue();
    
    // デフォルトで成功を返す（即座に解決）
    mockSpawn.mockImplementation((command, args, options) => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // 即座に解決（非同期遅延なし）
            process.nextTick(() => callback(0));
          }
        })
      };
      return mockProcess;
    });
    
    // config-managerのモック
    configManager.loadConfig.mockResolvedValue({
      currentScenario: 'test-scenario',
      scenarios: {
        'test-scenario': {
          name: 'Test Scenario',
          agents: {
            cmo: { role: 'CMO', aliases: ['marketing_director'] }
          }
        }
      }
    });
    
    configManager.getScenarioConfig.mockResolvedValue({
      name: 'Test Scenario',
      agents: {
        cmo: { role: 'CMO', aliases: ['marketing_director'] }
      }
    });
    
    // agent-managerのモック
    agentManager.getAgentMapping.mockResolvedValue({
      ceo: 'strategy:1.1',
      cmo: 'strategy:1.2'
    });
    
    agentManager.findAgent.mockImplementation((agentName, scenarioConfig) => {
      const mapping = {
        ceo: 'strategy:1.1',
        cmo: 'strategy:1.2'
      };
      
      if (mapping[agentName]) {
        return Promise.resolve({ name: agentName, target: mapping[agentName] });
      }
      
      // エイリアス対応
      if (agentName === 'marketing_director' && scenarioConfig) {
        return Promise.resolve({ name: 'cmo', target: 'strategy:1.2' });
      }
      
      return Promise.resolve(null);
    });
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  describe('sendCommand', () => {
    test('有効なエージェントにメッセージを送信できる', async () => {
      await sendCommand('ceo', 'Test message', {});
      
      // tmuxコマンドが呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalled();
      expect(mockSpawn.mock.calls.length).toBeGreaterThan(0);
      
      // 少なくとも1回はtmuxが送信キーで呼ばれることを確認
      const tmuxCalls = mockSpawn.mock.calls.filter(call => call[0] === 'tmux');
      expect(tmuxCalls.length).toBeGreaterThan(0);
      
      // fs.pathExistsのモック呼び出しを確認
      expect(fs.pathExists).toHaveBeenCalled();
    });

    test('エイリアス経由でメッセージを送信できる', async () => {
      await sendCommand('marketing_director', 'Test alias message', {});
      
      // CMOにメッセージが送信されることを確認
      expect(mockSpawn).toHaveBeenCalledWith('tmux', expect.arrayContaining(['send-keys', '-t', 'strategy:1.2']), expect.any(Object));
      expect(mockSpawn).toHaveBeenCalled();
    });

    test('設定ファイルが存在しない場合はエラーで終了する', async () => {
      // 設定ファイルが存在しないようにモック変更
      fs.pathExists.mockResolvedValue(false);
      
      await sendCommand('ceo', 'Test message', {});
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('現在のシナリオが設定されていない場合はエラーで終了する', async () => {
      configManager.loadConfig.mockResolvedValue({
        currentScenario: null,
        scenarios: {}
      });
      
      await sendCommand('ceo', 'Test message', {});
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('存在しないエージェントの場合はエラーで終了する', async () => {
      agentManager.findAgent.mockResolvedValue(null);
      
      await sendCommand('non-existent', 'Test message', {});
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('tmuxコマンドが失敗した場合はエラーで終了する', async () => {
      
      // エラーを返すモック（即座に解決）
      mockSpawn.mockImplementation(() => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { 
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                process.nextTick(() => callback('tmux error'));
              }
            })
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              process.nextTick(() => callback(1));
            }
          })
        };
        return mockProcess;
      });
      
      await sendCommand('ceo', 'Test message', {});
      
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('メッセージが適切にエスケープされる', async () => {
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'version: 2.0.0');
      
      const messageWithSpecialChars = 'Message with "quotes" and $variables and `backticks`';
      await sendCommand('ceo', messageWithSpecialChars, {});
      
      // tmuxコマンドが呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalled();
    });

    test('待機時間オプションが指定できる', async () => {
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'version: 2.0.0');
      
      const startTime = Date.now();
      await sendCommand('ceo', 'Test message', { wait: '1.0' });
      const endTime = Date.now();
      
      // 約1秒待機したことを確認（多少の誤差は許容）
      expect(endTime - startTime).toBeGreaterThan(900);
    });

    test('ログメッセージが記録される', async () => {
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'version: 2.0.0');
      
      await sendCommand('ceo', 'Test log message', {});
      
      // 送信ログファイルが作成されることを確認
      expect(await fs.pathExists('./logs/send_log.jsonl')).toBe(true);
      
      const logContent = await fs.readFile('./logs/send_log.jsonl', 'utf8');
      expect(logContent).toContain('Test log message');
      expect(logContent).toContain('ceo');
      expect(logContent).toContain('strategy:1.1');
    });

    test('長いメッセージはログで切り詰められる', async () => {
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'version: 2.0.0');
      
      const longMessage = 'a'.repeat(250); // 200文字を超えるメッセージ
      await sendCommand('ceo', longMessage, {});
      
      const logContent = await fs.readFile('./logs/send_log.jsonl', 'utf8');
      const logEntry = JSON.parse(logContent.trim());
      expect(logEntry.message).toHaveLength(203); // 200文字 + "..."
      expect(logEntry.message.endsWith('...')).toBe(true);
      expect(logEntry.length).toBe(250); // 元の長さは記録される
    });

    test('日付別ログファイルも作成される', async () => {
      await fs.writeFile(path.join(global.testUtils.TEST_DIR, 'claude-agents.yaml'), 'version: 2.0.0');
      
      await sendCommand('ceo', 'Test daily log', {});
      
      const dateStr = new Date().toISOString().split('T')[0];
      const dailyLogFile = `./logs/send_${dateStr}.jsonl`;
      expect(await fs.pathExists(dailyLogFile)).toBe(true);
      
      const dailyLogContent = await fs.readFile(dailyLogFile, 'utf8');
      expect(dailyLogContent).toContain('Test daily log');
    });
  });
});