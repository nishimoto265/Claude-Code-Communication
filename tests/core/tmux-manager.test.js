/**
 * Tests for tmux-manager.js
 */

const { spawn } = require('child_process');
const fs = require('fs-extra');

// tmux-manager.jsをモックして、実際のtmuxコマンドを実行しないようにする
jest.mock('child_process');

const tmuxManager = require('../../lib/core/tmux-manager');

describe('Tmux Manager', () => {
  let originalCwd;
  let mockSpawn;
  
  beforeEach(() => {
    originalCwd = process.cwd();
    process.chdir(global.testUtils.TEST_DIR);
    
    // child_processのspawnをモック
    mockSpawn = jest.fn();
    spawn.mockImplementation(mockSpawn);
    
    // デフォルトでは成功を返す
    mockSpawn.mockImplementation((command, args, options) => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // 成功
          }
        })
      };
      return mockProcess;
    });
  });
  
  afterEach(() => {
    process.chdir(originalCwd);
    jest.clearAllMocks();
  });

  describe('setupTmuxSessions', () => {
    test('複数のtmuxセッションを作成できる', async () => {
      const scenarioConfig = {
        tmux_sessions: {
          strategy: {
            window_name: 'strategy-team',
            panes: [
              { role: 'ceo' },
              { role: 'cto' },
              { role: 'cfo' }
            ]
          },
          analysis: {
            window_name: 'analysis-team',
            panes: [
              { role: 'pm' },
              { role: 'analyst' }
            ]
          }
        }
      };
      
      await tmuxManager.setupTmuxSessions(scenarioConfig);
      
      // tmuxコマンドが適切に呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['new-session', '-d', '-s', 'strategy', '-n', 'strategy-team'], expect.any(Object));
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['new-session', '-d', '-s', 'analysis', '-n', 'analysis-team'], expect.any(Object));
      
      // 追加ペインの作成も確認
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['split-window', '-t', 'strategy'], expect.any(Object));
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['split-window', '-t', 'analysis'], expect.any(Object));
    });

    test('window_nameが指定されていない場合はセッション名を使用する', async () => {
      const scenarioConfig = {
        tmux_sessions: {
          main: {
            panes: [{ role: 'agent1' }]
          }
        }
      };
      
      await tmuxManager.setupTmuxSessions(scenarioConfig);
      
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['new-session', '-d', '-s', 'main', '-n', 'main'], expect.any(Object));
    });

    test('panesが指定されていない場合でもセッションを作成できる', async () => {
      const scenarioConfig = {
        tmux_sessions: {
          empty: {}
        }
      };
      
      await tmuxManager.setupTmuxSessions(scenarioConfig);
      
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['new-session', '-d', '-s', 'empty', '-n', 'empty'], expect.any(Object));
    });

    test('既存セッションが存在する場合はリセットしてから作成する', async () => {
      const scenarioConfig = {
        tmux_sessions: {
          existing: {
            panes: [{ role: 'agent1' }]
          }
        }
      };
      
      await tmuxManager.setupTmuxSessions(scenarioConfig);
      
      // has-sessionコマンド（存在チェック）が呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['has-session', '-t', 'existing'], expect.any(Object));
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['new-session', '-d', '-s', 'existing', '-n', 'existing'], expect.any(Object));
    });

    test('tmuxコマンドが失敗した場合はエラーが発生する', async () => {
      // エラーを返すモック
      mockSpawn.mockImplementation((command, args, options) => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { 
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('tmux error message');
              }
            })
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 10); // 失敗
            }
          })
        };
        return mockProcess;
      });
      
      const scenarioConfig = {
        tmux_sessions: {
          failing: {
            panes: [{ role: 'agent1' }]
          }
        }
      };
      
      await expect(tmuxManager.setupTmuxSessions(scenarioConfig))
        .rejects
        .toThrow('Failed to setup tmux sessions');
    });

    test('空のセッション設定でも正常に動作する', async () => {
      const scenarioConfig = {
        tmux_sessions: {}
      };
      
      await tmuxManager.setupTmuxSessions(scenarioConfig);
      
      // セッション作成コマンドは呼ばれない
      expect(mockSpawn).not.toHaveBeenCalledWith('tmux', expect.arrayContaining(['new-session']), expect.any(Object));
    });
  });

  describe('generateAgentMapping', () => {
    test('シナリオ設定からエージェントマッピングを生成できる', async () => {
      const scenarioConfig = {
        agents: {
          ceo: { session: 'strategy', pane: 0 },
          cto: { session: 'strategy', pane: 1 },
          cfo: { session: 'strategy', pane: 2 }
        },
        tmux_sessions: {
          strategy: {
            window_name: 'strategy-team'
          }
        }
      };
      
      await tmuxManager.generateAgentMapping(scenarioConfig);
      
      // agent_mapping.jsonファイルが作成されることを確認
      expect(await fs.pathExists('./tmp/agent_mapping.json')).toBe(true);
      
      const mapping = await fs.readJSON('./tmp/agent_mapping.json');
      expect(mapping.ceo).toBe('strategy:1.1');
      expect(mapping.cto).toBe('strategy:1.2');
      expect(mapping.cfo).toBe('strategy:1.3');
    });

    test('window_nameが設定されていない場合はシンプル形式を使用する', async () => {
      const scenarioConfig = {
        agents: {
          agent1: { session: 'main', pane: 0 },
          agent2: { session: 'main', pane: 1 }
        },
        tmux_sessions: {
          main: {} // window_nameなし
        }
      };
      
      await tmuxManager.generateAgentMapping(scenarioConfig);
      
      const mapping = await fs.readJSON('./tmp/agent_mapping.json');
      expect(mapping.agent1).toBe('main:1.1');
      expect(mapping.agent2).toBe('main:1.2');
    });

    test('複数セッションの場合も正常にマッピングを生成する', async () => {
      const scenarioConfig = {
        agents: {
          ceo: { session: 'strategy', pane: 0 },
          pm: { session: 'analysis', pane: 0 },
          analyst: { session: 'analysis', pane: 1 }
        },
        tmux_sessions: {
          strategy: { window_name: 'strategy-team' },
          analysis: { window_name: 'analysis-team' }
        }
      };
      
      await tmuxManager.generateAgentMapping(scenarioConfig);
      
      const mapping = await fs.readJSON('./tmp/agent_mapping.json');
      expect(mapping.ceo).toBe('strategy:1.1');
      expect(mapping.pm).toBe('analysis:1.1');
      expect(mapping.analyst).toBe('analysis:1.2');
    });

    test('エージェントが設定されていない場合でも正常に動作する', async () => {
      const scenarioConfig = {
        agents: {},
        tmux_sessions: {
          empty: {}
        }
      };
      
      await tmuxManager.generateAgentMapping(scenarioConfig);
      
      const mapping = await fs.readJSON('./tmp/agent_mapping.json');
      expect(mapping).toEqual({});
    });
  });

  describe('killTmuxSessions', () => {
    test('指定されたセッションをリセットできる', async () => {
      const sessionNames = ['strategy', 'analysis'];
      
      await tmuxManager.killTmuxSessions(sessionNames);
      
      // kill-sessionではなく、has-sessionとsend-keysが呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalledWith('tmux', expect.arrayContaining(['has-session', '-t', 'strategy']), expect.any(Object));
      expect(mockSpawn).toHaveBeenCalledWith('tmux', expect.arrayContaining(['has-session', '-t', 'analysis']), expect.any(Object));
    });

    test('セッションが存在しない場合でもエラーにならない', async () => {
      // kill-sessionが失敗するモック（セッションが存在しない）
      mockSpawn.mockImplementation((command, args, options) => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              const exitCode = args.includes('kill-session') ? 1 : 0; // kill-sessionのみ失敗
              setTimeout(() => callback(exitCode), 10);
            }
          })
        };
        return mockProcess;
      });
      
      await expect(tmuxManager.killTmuxSessions(['non-existent']))
        .resolves
        .not
        .toThrow();
    });

    test('空の配列が渡された場合は何もしない', async () => {
      await tmuxManager.killTmuxSessions([]);
      
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe('listTmuxSessions', () => {
    test('アクティブなtmuxセッション一覧を取得できる', async () => {
      // tmux list-sessionsの出力をモック
      mockSpawn.mockImplementation((command, args, options) => {
        const mockProcess = {
          stdout: { 
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('strategy: 4 windows (created Mon Jun 16 08:00:00 2025)\nanalysis: 2 windows (created Mon Jun 16 08:01:00 2025)\n');
              }
            })
          },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          })
        };
        return mockProcess;
      });
      
      const sessions = await tmuxManager.listTmuxSessions();
      
      expect(sessions).toContain('strategy');
      expect(sessions).toContain('analysis');
      expect(mockSpawn).toHaveBeenCalledWith('tmux', ['list-sessions'], expect.any(Object));
    });

    test('tmuxセッションが存在しない場合は空配列を返す', async () => {
      // tmux list-sessionsが失敗するモック（セッションなし）
      mockSpawn.mockImplementation((command, args, options) => {
        const mockProcess = {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 10); // セッションなしで失敗
            }
          })
        };
        return mockProcess;
      });
      
      const sessions = await tmuxManager.listTmuxSessions();
      
      expect(sessions).toEqual([]);
    });

    test('不正な出力でも正常に処理する', async () => {
      // 不正な出力をモック
      mockSpawn.mockImplementation((command, args, options) => {
        const mockProcess = {
          stdout: { 
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('invalid tmux output format');
              }
            })
          },
          stderr: { on: jest.fn() },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          })
        };
        return mockProcess;
      });
      
      const sessions = await tmuxManager.listTmuxSessions();
      
      expect(sessions).toEqual([]);
    });
  });
});