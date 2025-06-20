/**
 * Tests for file-helpers.js
 * エラーハンドリング重視、カバレッジ90%目標
 */

const fileHelpers = require('../../lib/utils/file-helpers');
const fs = require('fs-extra');
const path = require('path');

// Mock fs-extra
jest.mock('fs-extra');

describe('File Helpers', () => {
  beforeEach(() => {
    // Mock fs-extra methods
    fs.ensureDir = jest.fn().mockResolvedValue();
    fs.copy = jest.fn().mockResolvedValue();
    fs.writeFile = jest.fn().mockResolvedValue();
    fs.readJSON = jest.fn().mockResolvedValue({});
    fs.writeJSON = jest.fn().mockResolvedValue();
    fs.pathExists = jest.fn().mockResolvedValue(true);
    fs.access = jest.fn().mockResolvedValue();
    fs.stat = jest.fn().mockResolvedValue({ mtime: new Date(), size: 1024 });
    fs.readdir = jest.fn().mockResolvedValue([]);
    fs.remove = jest.fn().mockResolvedValue();
    fs.constants = { R_OK: 4, W_OK: 2 };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setupDirectories', () => {
    test('正常ケース：必要なディレクトリを作成', async () => {
      await fileHelpers.setupDirectories();
      
      expect(fs.ensureDir).toHaveBeenCalledTimes(4);
      expect(fs.ensureDir).toHaveBeenCalledWith('./tmp');
      expect(fs.ensureDir).toHaveBeenCalledWith('./logs');
      expect(fs.ensureDir).toHaveBeenCalledWith('./scenarios');
      expect(fs.ensureDir).toHaveBeenCalledWith('./.claude-agents');
    });

    test('エラーハンドリング：ディレクトリ作成失敗', async () => {
      fs.ensureDir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(fileHelpers.setupDirectories()).rejects.toThrow('Permission denied');
    });

    test('一部ディレクトリ作成失敗時の処理', async () => {
      fs.ensureDir
        .mockResolvedValueOnce() // ./tmp success
        .mockRejectedValueOnce(new Error('Permission denied')) // ./logs fail
        .mockResolvedValueOnce() // ./scenarios success
        .mockResolvedValueOnce(); // ./.claude-agents success
      
      await expect(fileHelpers.setupDirectories()).rejects.toThrow('Permission denied');
    });
  });

  describe('copyTemplateFiles', () => {
    test('正常ケース：テンプレートファイルをコピー', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      
      await fileHelpers.copyTemplateFiles(templatePath, targetPath);
      
      expect(fs.pathExists).toHaveBeenCalledWith(templatePath);
      expect(fs.copy).toHaveBeenCalledWith(templatePath, targetPath, {
        overwrite: false,
        filter: expect.any(Function)
      });
    });

    test('オプション指定：上書き許可', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      const options = { overwrite: true };
      
      await fileHelpers.copyTemplateFiles(templatePath, targetPath, options);
      
      expect(fs.copy).toHaveBeenCalledWith(templatePath, targetPath, {
        overwrite: true,
        filter: expect.any(Function)
      });
    });

    test('カスタムフィルター使用', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      const customFilter = jest.fn().mockReturnValue(true);
      const options = { filter: customFilter };
      
      await fileHelpers.copyTemplateFiles(templatePath, targetPath, options);
      
      expect(fs.copy).toHaveBeenCalledWith(templatePath, targetPath, {
        overwrite: false,
        filter: expect.any(Function)
      });
    });

    test('フィルター機能：システムファイル除外', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      
      await fileHelpers.copyTemplateFiles(templatePath, targetPath);
      
      const filterFunc = fs.copy.mock.calls[0][2].filter;
      
      // システムファイルは除外される
      expect(filterFunc('/path/.DS_Store')).toBe(false);
      expect(filterFunc('/path/Thumbs.db')).toBe(false);
      
      // 通常ファイルは通る
      expect(filterFunc('/path/normal.txt')).toBe(true);
    });

    test('フィルター機能：カスタムフィルターとの組み合わせ', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      const customFilter = jest.fn()
        .mockReturnValueOnce(false) // カスタムフィルターで除外
        .mockReturnValueOnce(true);  // カスタムフィルターで通す
      const options = { filter: customFilter };
      
      await fileHelpers.copyTemplateFiles(templatePath, targetPath, options);
      
      const filterFunc = fs.copy.mock.calls[0][2].filter;
      
      expect(filterFunc('/path/normal1.txt')).toBe(false);
      expect(filterFunc('/path/normal2.txt')).toBe(true);
      expect(customFilter).toHaveBeenCalledTimes(2);
    });

    test('エラーハンドリング：テンプレートパス不存在', async () => {
      const templatePath = '/nonexistent/path';
      const targetPath = '/target/path';
      
      fs.pathExists.mockResolvedValue(false);
      
      await expect(fileHelpers.copyTemplateFiles(templatePath, targetPath))
        .rejects.toThrow('Template path does not exist: /nonexistent/path');
    });

    test('エラーハンドリング：コピー失敗', async () => {
      const templatePath = '/template/path';
      const targetPath = '/target/path';
      
      fs.copy.mockRejectedValue(new Error('Copy failed'));
      
      await expect(fileHelpers.copyTemplateFiles(templatePath, targetPath))
        .rejects.toThrow('Copy failed');
    });
  });

  describe('writeFileEnsure', () => {
    test('正常ケース：ファイル書き込み（親ディレクトリ作成）', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'test content';
      
      await fileHelpers.writeFileEnsure(filePath, content);
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/path/to');
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, content);
    });

    test('ネストした深いパス', async () => {
      const filePath = '/deep/nested/path/to/file.txt';
      const content = 'test content';
      
      await fileHelpers.writeFileEnsure(filePath, content);
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/deep/nested/path/to');
    });

    test('エラーハンドリング：ディレクトリ作成失敗', async () => {
      fs.ensureDir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(fileHelpers.writeFileEnsure('/path/file.txt', 'content'))
        .rejects.toThrow('Permission denied');
    });

    test('エラーハンドリング：ファイル書き込み失敗', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(fileHelpers.writeFileEnsure('/path/file.txt', 'content'))
        .rejects.toThrow('Write failed');
    });
  });

  describe('readJSONSafe', () => {
    test('正常ケース：JSONファイル読み込み', async () => {
      const filePath = '/path/config.json';
      const mockData = { key: 'value' };
      
      fs.readJSON.mockResolvedValue(mockData);
      
      const result = await fileHelpers.readJSONSafe(filePath);
      
      expect(fs.pathExists).toHaveBeenCalledWith(filePath);
      expect(fs.readJSON).toHaveBeenCalledWith(filePath);
      expect(result).toEqual(mockData);
    });

    test('ファイルが存在しない場合はデフォルト値を返す', async () => {
      const filePath = '/path/nonexistent.json';
      const defaultValue = { default: true };
      
      fs.pathExists.mockResolvedValue(false);
      
      const result = await fileHelpers.readJSONSafe(filePath, defaultValue);
      
      expect(result).toEqual(defaultValue);
      expect(fs.readJSON).not.toHaveBeenCalled();
    });

    test('デフォルト値未指定の場合はnullを返す', async () => {
      const filePath = '/path/nonexistent.json';
      
      fs.pathExists.mockResolvedValue(false);
      
      const result = await fileHelpers.readJSONSafe(filePath);
      
      expect(result).toBeNull();
    });

    test('読み込みエラー時はデフォルト値を返す', async () => {
      const filePath = '/path/corrupted.json';
      const defaultValue = { fallback: true };
      
      fs.readJSON.mockRejectedValue(new Error('Invalid JSON'));
      
      const result = await fileHelpers.readJSONSafe(filePath, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    test('pathExistsエラー時もデフォルト値を返す', async () => {
      const filePath = '/path/file.json';
      const defaultValue = { error: true };
      
      fs.pathExists.mockRejectedValue(new Error('Access denied'));
      
      const result = await fileHelpers.readJSONSafe(filePath, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });
  });

  describe('writeJSONSafe', () => {
    test('正常ケース：JSONファイル書き込み', async () => {
      const filePath = '/path/config.json';
      const data = { key: 'value' };
      
      await fileHelpers.writeJSONSafe(filePath, data);
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/path');
      expect(fs.writeJSON).toHaveBeenCalledWith(filePath, data, { spaces: 2 });
    });

    test('カスタムオプション指定', async () => {
      const filePath = '/path/config.json';
      const data = { key: 'value' };
      const options = { spaces: 4, replacer: null };
      
      await fileHelpers.writeJSONSafe(filePath, data, options);
      
      expect(fs.writeJSON).toHaveBeenCalledWith(filePath, data, {
        spaces: 4,
        replacer: null
      });
    });

    test('エラーハンドリング：書き込み失敗', async () => {
      fs.writeJSON.mockRejectedValue(new Error('Write failed'));
      
      await expect(fileHelpers.writeJSONSafe('/path/file.json', {}))
        .rejects.toThrow('Write failed');
    });
  });

  describe('isReadable', () => {
    test('読み取り可能ファイル', async () => {
      const result = await fileHelpers.isReadable('/path/readable.txt');
      
      expect(fs.access).toHaveBeenCalledWith('/path/readable.txt', fs.constants.R_OK);
      expect(result).toBe(true);
    });

    test('読み取り不可能ファイル', async () => {
      fs.access.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileHelpers.isReadable('/path/unreadable.txt');
      
      expect(result).toBe(false);
    });
  });

  describe('isWritable', () => {
    test('既存の書き込み可能ファイル', async () => {
      const result = await fileHelpers.isWritable('/path/writable.txt');
      
      expect(fs.pathExists).toHaveBeenCalledWith('/path/writable.txt');
      expect(fs.access).toHaveBeenCalledWith('/path/writable.txt', fs.constants.W_OK);
      expect(result).toBe(true);
    });

    test('存在しないファイル（親ディレクトリチェック）', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      const result = await fileHelpers.isWritable('/path/new.txt');
      
      expect(fs.access).toHaveBeenCalledWith('/path', fs.constants.W_OK);
      expect(result).toBe(true);
    });

    test('書き込み不可能', async () => {
      fs.access.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileHelpers.isWritable('/path/readonly.txt');
      
      expect(result).toBe(false);
    });
  });

  describe('getStatsSafe', () => {
    test('正常ケース：ファイル統計取得', async () => {
      const mockStats = { size: 1024, mtime: new Date() };
      fs.stat.mockResolvedValue(mockStats);
      
      const result = await fileHelpers.getStatsSafe('/path/file.txt');
      
      expect(fs.stat).toHaveBeenCalledWith('/path/file.txt');
      expect(result).toEqual(mockStats);
    });

    test('ファイルが存在しない場合', async () => {
      fs.stat.mockRejectedValue(new Error('File not found'));
      
      const result = await fileHelpers.getStatsSafe('/path/nonexistent.txt');
      
      expect(result).toBeNull();
    });
  });

  describe('findFiles', () => {
    test('正常ケース：パターンマッチングでファイル検索', async () => {
      const mockEntries = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'file2.js', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
        { name: 'file3.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      const subEntries = [
        { name: 'nested.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce(subEntries);
      
      const pattern = /\.txt$/;
      const result = await fileHelpers.findFiles('/search/path', pattern);
      
      expect(result).toContain('/search/path/file1.txt');
      expect(result).toContain('/search/path/file3.txt');
      expect(result).toContain('/search/path/subdir/nested.txt');
      expect(result).not.toContain('/search/path/file2.js');
    });

    test('最大深度制限', async () => {
      const mockEntries = [
        { name: 'subdir', isFile: () => false, isDirectory: () => true }
      ];
      
      fs.readdir.mockResolvedValue(mockEntries);
      
      const pattern = /\.txt$/;
      const options = { maxDepth: 0 };
      
      const result = await fileHelpers.findFiles('/search/path', pattern, options);
      
      // 深度0なので再帰しない
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    test('隠しディレクトリをスキップ', async () => {
      const mockEntries = [
        { name: '.hidden', isFile: () => false, isDirectory: () => true },
        { name: 'visible', isFile: () => false, isDirectory: () => true }
      ];
      
      const subEntries = [
        { name: 'file.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce(subEntries);
      
      const pattern = /\.txt$/;
      const result = await fileHelpers.findFiles('/search/path', pattern);
      
      // .hiddenディレクトリには入らない
      expect(result).toContain('/search/path/visible/file.txt');
      expect(result).not.toContain('/search/path/.hidden/file.txt');
    });

    test('ディレクトリ読み取りエラー時はスキップ', async () => {
      fs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      const pattern = /\.txt$/;
      const result = await fileHelpers.findFiles('/inaccessible/path', pattern);
      
      // エラーで例外は発生せず、空配列が返される
      expect(result).toEqual([]);
    });
  });

  describe('cleanupOldFiles', () => {
    test('正常ケース：古いファイルの削除', async () => {
      const now = Date.now();
      const oldTime = new Date(now - 10 * 24 * 60 * 60 * 1000); // 10日前
      const newTime = new Date(now - 1 * 24 * 60 * 60 * 1000);  // 1日前
      
      const mockFiles = ['old.txt', 'new.txt'];
      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat
        .mockResolvedValueOnce({ mtime: oldTime })
        .mockResolvedValueOnce({ mtime: newTime });
      
      const result = await fileHelpers.cleanupOldFiles('/cleanup/path');
      
      expect(fs.remove).toHaveBeenCalledWith('/cleanup/path/old.txt');
      expect(fs.remove).not.toHaveBeenCalledWith('/cleanup/path/new.txt');
      expect(result.cleaned).toBe(1);
      expect(result.errors).toBe(0);
    });

    test('カスタム最大期間', async () => {
      const now = Date.now();
      const recentTime = new Date(now - 2 * 60 * 60 * 1000); // 2時間前
      
      const mockFiles = ['recent.txt'];
      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockResolvedValue({ mtime: recentTime });
      
      const maxAge = 1 * 60 * 60 * 1000; // 1時間
      const result = await fileHelpers.cleanupOldFiles('/cleanup/path', maxAge);
      
      expect(fs.remove).toHaveBeenCalledWith('/cleanup/path/recent.txt');
      expect(result.cleaned).toBe(1);
    });

    test('ディレクトリが存在しない場合', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      const result = await fileHelpers.cleanupOldFiles('/nonexistent/path');
      
      expect(result.cleaned).toBe(0);
      expect(result.errors).toBe(0);
      expect(fs.readdir).not.toHaveBeenCalled();
    });

    test('ファイル削除エラー時のカウント', async () => {
      const mockFiles = ['file1.txt', 'file2.txt'];
      fs.readdir.mockResolvedValue(mockFiles);
      fs.stat.mockResolvedValue({ mtime: new Date(0) }); // 非常に古い
      fs.remove
        .mockResolvedValueOnce() // 成功
        .mockRejectedValueOnce(new Error('Delete failed')); // 失敗
      
      const result = await fileHelpers.cleanupOldFiles('/cleanup/path');
      
      expect(result.cleaned).toBe(1);
      expect(result.errors).toBe(1);
    });

    test('ディレクトリ読み取りエラー', async () => {
      fs.readdir.mockRejectedValue(new Error('Permission denied'));
      
      const result = await fileHelpers.cleanupOldFiles('/cleanup/path');
      
      expect(result.cleaned).toBe(0);
      expect(result.errors).toBe(1);
    });
  });

  describe('backupFile', () => {
    test('正常ケース：ファイルバックアップ', async () => {
      const filePath = '/path/important.txt';
      
      const result = await fileHelpers.backupFile(filePath);
      
      expect(fs.pathExists).toHaveBeenCalledWith(filePath);
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.copy).toHaveBeenCalledWith(filePath, expect.stringMatching(/important\.txt\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/));
      expect(result).toMatch(/important\.txt\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    test('カスタムバックアップディレクトリ', async () => {
      const filePath = '/path/important.txt';
      const backupDir = '/backup/dir';
      
      const result = await fileHelpers.backupFile(filePath, backupDir);
      
      expect(fs.ensureDir).toHaveBeenCalledWith(backupDir);
      expect(fs.copy).toHaveBeenCalledWith(filePath, expect.stringContaining('/backup/dir/'));
      expect(result).toContain('/backup/dir/');
    });

    test('エラーハンドリング：ファイルが存在しない', async () => {
      fs.pathExists.mockResolvedValue(false);
      
      await expect(fileHelpers.backupFile('/nonexistent.txt'))
        .rejects.toThrow('File does not exist: /nonexistent.txt');
      
      expect(fs.copy).not.toHaveBeenCalled();
    });

    test('エラーハンドリング：コピー失敗', async () => {
      fs.copy.mockRejectedValue(new Error('Copy failed'));
      
      await expect(fileHelpers.backupFile('/path/file.txt'))
        .rejects.toThrow('Copy failed');
    });
  });

  describe('getDirectorySize', () => {
    test('正常ケース：ディレクトリサイズ計算', async () => {
      const mockEntries = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'file2.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true }
      ];
      
      const subEntries = [
        { name: 'nested.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce(subEntries);
      
      fs.stat
        .mockResolvedValueOnce({ size: 1024 })  // file1.txt
        .mockResolvedValueOnce({ size: 2048 })  // file2.txt
        .mockResolvedValueOnce({ size: 512 });  // nested.txt
      
      const result = await fileHelpers.getDirectorySize('/test/directory');
      
      expect(result).toBe(3584); // 1024 + 2048 + 512
    });

    test('空ディレクトリ', async () => {
      fs.readdir.mockResolvedValue([]);
      
      const result = await fileHelpers.getDirectorySize('/empty/directory');
      
      expect(result).toBe(0);
    });

    test('ディレクトリ読み取りエラー時はスキップ', async () => {
      const mockEntries = [
        { name: 'accessible', isFile: () => false, isDirectory: () => true },
        { name: 'file.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir
        .mockResolvedValueOnce(mockEntries)
        .mockRejectedValueOnce(new Error('Permission denied')); // サブディレクトリでエラー
      
      fs.stat.mockResolvedValue({ size: 1024 });
      
      const result = await fileHelpers.getDirectorySize('/test/directory');
      
      expect(result).toBe(1024); // ファイルのみカウント
    });

    test('ファイル統計取得エラー', async () => {
      const mockEntries = [
        { name: 'file1.txt', isFile: () => true, isDirectory: () => false },
        { name: 'file2.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir.mockResolvedValue(mockEntries);
      fs.stat
        .mockResolvedValueOnce({ size: 1024 })
        .mockRejectedValueOnce(new Error('Stat failed'));
      
      const result = await fileHelpers.getDirectorySize('/test/directory');
      
      expect(result).toBe(1024); // エラーのファイルは無視
    });
  });

  describe('エッジケースとパフォーマンス', () => {
    test('非常に深いディレクトリ階層', async () => {
      const deepPath = '/very/deep/nested/path/to/file.txt';
      
      await fileHelpers.writeFileEnsure(deepPath, 'content');
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/very/deep/nested/path/to');
    });

    test('特殊文字を含むファイルパス', async () => {
      const specialPath = '/path/with spaces/特殊文字/émoji🚀/file.txt';
      
      await fileHelpers.writeFileEnsure(specialPath, 'content');
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/path/with spaces/特殊文字/émoji🚀');
    });

    test('空のファイル名', async () => {
      const emptyPath = '/path/to/';
      
      await fileHelpers.writeFileEnsure(emptyPath, 'content');
      
      expect(fs.ensureDir).toHaveBeenCalledWith('/path/to');
    });

    test('大量のファイル処理', async () => {
      const manyFiles = Array.from({ length: 1000 }, (_, i) => ({
        name: `file${i}.txt`,
        isFile: () => true,
        isDirectory: () => false
      }));
      
      fs.readdir.mockResolvedValue(manyFiles);
      fs.stat.mockResolvedValue({ size: 1024 });
      
      const result = await fileHelpers.getDirectorySize('/large/directory');
      
      expect(result).toBe(1024 * 1000);
    });

    test('非ASCII文字のファイル名処理', async () => {
      const unicodeFiles = [
        { name: '日本語.txt', isFile: () => true, isDirectory: () => false },
        { name: '한국어.txt', isFile: () => true, isDirectory: () => false },
        { name: 'العربية.txt', isFile: () => true, isDirectory: () => false }
      ];
      
      fs.readdir.mockResolvedValue(unicodeFiles);
      
      const pattern = /\.txt$/;
      const result = await fileHelpers.findFiles('/unicode/path', pattern);
      
      expect(result).toHaveLength(3);
      expect(result).toContain('/unicode/path/日本語.txt');
      expect(result).toContain('/unicode/path/한국어.txt');
      expect(result).toContain('/unicode/path/العربية.txt');
    });

    test('JSONファイルの循環参照処理', async () => {
      const circularData = { name: 'test' };
      circularData.self = circularData;
      
      // fs.writeJSONは内部でJSON.stringifyを使用するため、
      // 循環参照があると例外が発生する可能性がある
      fs.writeJSON.mockRejectedValue(new Error('Converting circular structure to JSON'));
      
      await expect(fileHelpers.writeJSONSafe('/path/circular.json', circularData))
        .rejects.toThrow('Converting circular structure to JSON');
    });
  });
});