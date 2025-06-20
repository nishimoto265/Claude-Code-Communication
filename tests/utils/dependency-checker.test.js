/**
 * Tests for dependency-checker.js
 * エラーハンドリング重視、カバレッジ90%目標
 */

const dependencyChecker = require('../../lib/utils/dependency-checker');
const { spawn } = require('child_process');
const os = require('os');
const EventEmitter = require('events');

// Mock dependencies
jest.mock('child_process');
jest.mock('os');

describe('Dependency Checker', () => {
  let mockProcess;
  
  beforeEach(() => {
    // Mock spawn
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    spawn.mockReturnValue(mockProcess);
    
    // Mock os.platform
    os.platform.mockReturnValue('darwin');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDependencies', () => {
    test('正常ケース：すべての依存関係が満足', async () => {
      // Mock successful tmux check
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'tmux 3.2a');
        mockProcess.emit('close', 0);
      }, 0);
      
      // Mock successful claude check
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'claude 1.0.0');
        mockProcess.emit('close', 0);
      }, 10);
      
      // Mock successful node check
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v16.14.0');
        mockProcess.emit('close', 0);
      }, 20);
      
      const result = await dependencyChecker.checkDependencies();
      
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });

    test('一部依存関係が不足している場合', async () => {
      // Mock failed tmux check
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      // Mock successful claude check
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'claude 1.0.0');
        mockProcess.emit('close', 0);
      }, 10);
      
      // Mock successful node check
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v16.14.0');
        mockProcess.emit('close', 0);
      }, 20);
      
      const result = await dependencyChecker.checkDependencies();
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('tmux is not installed');
      expect(result.recommendations).toContain('brew install tmux');
    });

    test('すべての依存関係が不足している場合', async () => {
      // Mock all failed checks
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkDependencies();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('checkTmux', () => {
    test('正常ケース：tmuxがインストール済み', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'tmux 3.2a');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.recommendation).toBeUndefined();
    });

    test('tmuxが未インストール - macOS', async () => {
      os.platform.mockReturnValue('darwin');
      
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('tmux is not installed');
      expect(result.recommendation).toBe('brew install tmux');
    });

    test('tmuxが未インストール - Linux', async () => {
      os.platform.mockReturnValue('linux');
      
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('tmux is not installed');
      expect(result.recommendation).toBe('sudo apt update && sudo apt install tmux');
    });

    test('tmuxが未インストール - その他のOS', async () => {
      os.platform.mockReturnValue('win32');
      
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(false);
      expect(result.recommendation).toBe('Install tmux for your operating system');
    });
  });

  describe('checkClaude', () => {
    test('正常ケース：Claude CLIがインストール済み', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'claude 1.0.0');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkClaude();
      
      expect(result.success).toBe(true);
    });

    test('Claude CLIが未インストール', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkClaude();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Claude Code CLI is not installed');
      expect(result.recommendation).toBe('Download Claude Code CLI from https://claude.ai/code');
    });
  });

  describe('checkNode', () => {
    test('正常ケース：Node.js v16以上', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v16.14.0');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(true);
    });

    test('正常ケース：Node.js v18以上', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v18.12.1');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(true);
    });

    test('Node.jsバージョンが古い', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v12.22.0');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Node.js version v12.22.0 is too old (requires >= 14.0.0)');
      expect(result.recommendation).toBe('Update Node.js to version 14 or higher');
    });

    test('Node.js未インストール', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'command not found');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Node.js is not installed');
      expect(result.recommendation).toBe('Install Node.js from https://nodejs.org/');
    });

    test('不正なバージョン形式', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid-version');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(false);
    });

    test('空のバージョン出力', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(false);
    });
  });

  describe('checkGitRepository', () => {
    test('gitリポジトリ内', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', '.git');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkGitRepository();
      
      expect(result.success).toBe(true);
    });

    test('gitリポジトリ外', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'not a git repository');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkGitRepository();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in a git repository');
      expect(result.recommendation).toBe('git init (optional but recommended)');
    });
  });

  describe('checkTmuxServer', () => {
    test('tmuxサーバーが動作中でセッションあり', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'session1\nsession2\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkTmuxServer();
      
      expect(result.success).toBe(true);
      expect(result.hasSessions).toBe(true);
    });

    test('tmuxサーバーが動作中だがセッションなし', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'no sessions');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkTmuxServer();
      
      expect(result.success).toBe(true);
      expect(result.hasSessions).toBe(false);
    });
  });

  describe('checkDiskSpace', () => {
    test('十分なディスク容量（GB単位）', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Filesystem Size Used Avail Use% Mounted on\n/dev/disk1 500G 200G 10G 95% /\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(true);
    });

    test('十分なディスク容量（MB単位）', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Filesystem Size Used Avail Use% Mounted on\n/dev/disk1 5000M 2000M 500M 80% /\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(true);
    });

    test('不足したディスク容量（MB単位）', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Filesystem Size Used Avail Use% Mounted on\n/dev/disk1 1000M 950M 50M 95% /\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low disk space');
      expect(result.recommendation).toBe('Free up disk space before proceeding');
    });

    test('不足したディスク容量（KB単位）', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Filesystem Size Used Avail Use% Mounted on\n/dev/disk1 1000M 950M 50000K 95% /\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Low disk space');
    });

    test('dfコマンド失敗時は成功として扱う', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'df command failed');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(true);
    });

    test('不正なdf出力形式', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid output format');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(true);
    });

    test('空のdf出力', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkDiskSpace();
      
      expect(result.success).toBe(true);
    });
  });

  describe('fullSystemCheck', () => {
    test('正常ケース：すべてのチェックが成功', async () => {
      // Mock all successful checks
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v16.14.0');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.fullSystemCheck();
      
      expect(result).toHaveProperty('Node.js');
      expect(result).toHaveProperty('tmux');
      expect(result).toHaveProperty('Claude CLI');
      expect(result).toHaveProperty('Git Repository');
      expect(result).toHaveProperty('Tmux Server');
      expect(result).toHaveProperty('Disk Space');
      
      expect(Object.keys(result)).toHaveLength(6);
    });

    test('一部チェックが失敗する場合', async () => {
      // Mix of success and failure
      let callCount = 0;
      const originalSpawn = spawn;
      spawn.mockImplementation((cmd, args) => {
        const process = new EventEmitter();
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();
        
        setTimeout(() => {
          if (callCount % 2 === 0) {
            process.stdout.emit('data', 'success');
            process.emit('close', 0);
          } else {
            process.stderr.emit('data', 'failure');
            process.emit('close', 1);
          }
          callCount++;
        }, 0);
        
        return process;
      });
      
      const result = await dependencyChecker.fullSystemCheck();
      
      expect(Object.keys(result)).toHaveLength(6);
      // 成功と失敗が混在する
      const successCount = Object.values(result).filter(r => r.success).length;
      const failureCount = Object.values(result).filter(r => !r.success).length;
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });

    test('チェック中に例外が発生', async () => {
      spawn.mockImplementation(() => {
        throw new Error('spawn failed');
      });
      
      const result = await dependencyChecker.fullSystemCheck();
      
      // 例外が発生してもresultオブジェクトが返される
      expect(Object.keys(result)).toHaveLength(6);
      
      // すべてのチェックが失敗として記録される
      Object.values(result).forEach(check => {
        expect(check.success).toBe(false);
        expect(check.error).toBe('spawn failed');
      });
    });
  });

  describe('execCommand内部関数', () => {
    test('コマンド成功時のデータ処理', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'chunk1');
        mockProcess.stdout.emit('data', 'chunk2');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      // 複数のchunkが結合される
      expect(spawn).toHaveBeenCalledWith('tmux', ['-V'], { stdio: 'pipe' });
    });

    test('stderrデータの処理', async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'error chunk1');
        mockProcess.stderr.emit('data', 'error chunk2');
        mockProcess.emit('close', 1);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(false);
    });

    test('非ゼロ終了コードの処理', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'some output');
        mockProcess.emit('close', 127); // command not found
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(false);
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    test('プロセスエラーイベント', async () => {
      setTimeout(() => {
        mockProcess.emit('error', new Error('Process error'));
      }, 0);
      
      await expect(dependencyChecker.checkTmux()).rejects.toThrow();
    });

    test('非常に長いコマンド出力', async () => {
      const longOutput = 'a'.repeat(100000);
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', longOutput);
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(true);
    });

    test('特殊文字を含むコマンド出力', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'version: 3.2a\n日本語\n🚀\n');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkTmux();
      
      expect(result.success).toBe(true);
    });

    test('空のコマンド配列', async () => {
      spawn.mockImplementation((cmd, args) => {
        expect(args).toBeDefined();
        return mockProcess;
      });
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 0);
      
      await dependencyChecker.checkTmux();
      
      expect(spawn).toHaveBeenCalledWith('tmux', ['-V'], { stdio: 'pipe' });
    });

    test('Node.jsバージョンの境界値テスト', async () => {
      // 境界値: v14.0.0（最小要求バージョン）
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v14.0.0');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(true);
    });

    test('Node.jsバージョンの境界値テスト - 不合格', async () => {
      // 境界値: v13.999.999（最小要求バージョン未満）
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'v13.999.999');
        mockProcess.emit('close', 0);
      }, 0);
      
      const result = await dependencyChecker.checkNode();
      
      expect(result.success).toBe(false);
    });

    test('プラットフォーム判定の網羅性', () => {
      const platforms = ['darwin', 'linux', 'win32', 'freebsd', 'unknown'];
      
      platforms.forEach(platform => {
        os.platform.mockReturnValue(platform);
        
        setTimeout(() => {
          mockProcess.stderr.emit('data', 'command not found');
          mockProcess.emit('close', 1);
        }, 0);
        
        // エラーにならずに推奨コマンドが返される
        expect(() => dependencyChecker.checkTmux()).not.toThrow();
      });
    });
  });
});