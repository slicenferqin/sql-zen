/**
 * BashTool 单元测试
 *
 * 测试 Bash 工具的核心功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BashTool } from './execute-bash';
import { exec } from 'child_process';

// Mock child_process
jest.mock('child_process');

describe('BashTool', () => {
  let bashTool: BashTool;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    bashTool = new BashTool();
    mockExec = exec as jest.MockedFunction<typeof exec>;
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认沙箱目录', () => {
      const tool = new BashTool();
      expect(tool).toBeInstanceOf(BashTool);
    });

    it('应该支持自定义沙箱目录', () => {
      const tool = new BashTool('/custom/path');
      expect(tool).toBeInstanceOf(BashTool);
    });
  });

  describe('isCommandAllowed', () => {
    it('应该允许白名单中的命令', () => {
      expect(bashTool.isCommandAllowed('ls')).toBe(true);
      expect(bashTool.isCommandAllowed('cat')).toBe(true);
      expect(bashTool.isCommandAllowed('grep')).toBe(true);
      expect(bashTool.isCommandAllowed('find')).toBe(true);
      expect(bashTool.isCommandAllowed('head')).toBe(true);
      expect(bashTool.isCommandAllowed('tail')).toBe(true);
      expect(bashTool.isCommandAllowed('wc')).toBe(true);
    });

    it('应该拒绝不在白名单中的命令', () => {
      expect(bashTool.isCommandAllowed('rm')).toBe(false);
      expect(bashTool.isCommandAllowed('mv')).toBe(false);
      expect(bashTool.isCommandAllowed('cp')).toBe(false);
      expect(bashTool.isCommandAllowed('chmod')).toBe(false);
      expect(bashTool.isCommandAllowed('sudo')).toBe(false);
    });

    it('应该处理带参数的命令', () => {
      expect(bashTool.isCommandAllowed('ls -la')).toBe(true);
      expect(bashTool.isCommandAllowed('cat file.txt')).toBe(true);
      expect(bashTool.isCommandAllowed('rm -rf /')).toBe(false);
    });

    it('应该处理前后有空格的命令', () => {
      expect(bashTool.isCommandAllowed('  ls  ')).toBe(true);
      expect(bashTool.isCommandAllowed('  rm  ')).toBe(false);
    });
  });

  describe('execute', () => {
    it('应该成功执行允许的命令', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'file1.txt\nfile2.txt', '');
        return {} as any;
      });

      const result = await bashTool.execute('ls');

      expect(result.success).toBe(true);
      expect(result.output).toBe('file1.txt\nfile2.txt');
      expect(result.error).toBeUndefined();
      expect(mockExec).toHaveBeenCalledWith(
        'ls',
        expect.objectContaining({
          cwd: 'schema',
          timeout: 30000,
        }),
        expect.any(Function)
      );
    });

    it('应该拒绝不允许的命令', async () => {
      const result = await bashTool.execute('rm -rf /');

      expect(result.success).toBe(false);
      expect(result.output).toBe('');
      expect(result.error).toContain('not allowed');
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('应该使用自定义工作目录', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'output', '');
        return {} as any;
      });

      await bashTool.execute('ls', { cwd: '/custom/dir' });

      expect(mockExec).toHaveBeenCalledWith(
        'ls',
        expect.objectContaining({
          cwd: '/custom/dir',
        }),
        expect.any(Function)
      );
    });

    it('应该使用自定义超时时间', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'output', '');
        return {} as any;
      });

      await bashTool.execute('ls', { timeout: 5000 });

      expect(mockExec).toHaveBeenCalledWith(
        'ls',
        expect.objectContaining({
          timeout: 5000,
        }),
        expect.any(Function)
      );
    });

    it('应该处理命令执行错误', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(new Error('Command failed'), '', '');
        return {} as any;
      });

      const result = await bashTool.execute('ls');

      expect(result.success).toBe(false);
      expect(result.output).toBe('');
      expect(result.error).toBe('Command failed');
    });

    it('应该返回 stderr 作为输出（当 stdout 为空时）', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, '', 'error message');
        return {} as any;
      });

      const result = await bashTool.execute('ls');

      expect(result.success).toBe(true);
      expect(result.output).toBe('error message');
    });

    it('应该优先返回 stdout', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'stdout output', 'stderr output');
        return {} as any;
      });

      const result = await bashTool.execute('ls');

      expect(result.success).toBe(true);
      expect(result.output).toBe('stdout output');
    });

    it('应该处理带参数的命令', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'filtered output', '');
        return {} as any;
      });

      const result = await bashTool.execute('grep pattern file.txt');

      expect(result.success).toBe(true);
      expect(result.output).toBe('filtered output');
      expect(mockExec).toHaveBeenCalledWith(
        'grep pattern file.txt',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('应该处理超时错误', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        const error = new Error('Command timeout') as any;
        error.killed = true;
        error.signal = 'SIGTERM';
        callback(error, '', '');
        return {} as any;
      });

      const result = await bashTool.execute('ls', { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('沙箱安全', () => {
    it('应该在沙箱目录中执行命令', async () => {
      const customTool = new BashTool('/safe/sandbox');
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'output', '');
        return {} as any;
      });

      await customTool.execute('ls');

      expect(mockExec).toHaveBeenCalledWith(
        'ls',
        expect.objectContaining({
          cwd: '/safe/sandbox',
        }),
        expect.any(Function)
      );
    });

    it('应该阻止危险命令', async () => {
      const dangerousCommands = [
        'rm -rf /',
        'chmod 777 /',
        'sudo rm',
        'mv /etc/passwd',
        'cp /etc/shadow',
      ];

      for (const cmd of dangerousCommands) {
        const result = await bashTool.execute(cmd);
        expect(result.success).toBe(false);
        expect(result.error).toContain('not allowed');
      }

      expect(mockExec).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理空命令', async () => {
      const result = await bashTool.execute('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('应该处理只有空格的命令', async () => {
      const result = await bashTool.execute('   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('应该处理多个空格分隔的命令', async () => {
      (mockExec as any).mockImplementation((_cmd: string, _opts: any, callback: any) => {
        callback(null, 'output', '');
        return {} as any;
      });

      const result = await bashTool.execute('ls    -la    /path');

      expect(result.success).toBe(true);
      expect(mockExec).toHaveBeenCalled();
    });
  });
});
