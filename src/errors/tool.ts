/**
 * 工具执行相关错误类
 */

import { SQLZenError, SQLZenErrorOptions } from './base.js';

/**
 * 工具错误基类
 */
export class ToolError extends SQLZenError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: options.code || 'TOOL_ERROR',
      ...options
    });
  }
}

/**
 * 工具执行错误
 */
export class ToolExecutionError extends ToolError {
  public readonly toolName?: string;
  public readonly input?: unknown;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { toolName?: string; input?: unknown } = {}
  ) {
    super(message, {
      code: 'TOOL_EXECUTION_ERROR',
      context: {
        ...options.context,
        toolName: options.toolName,
        input: options.input
      },
      suggestions: options.suggestions || [
        '检查工具输入参数是否正确',
        '验证工具是否可用',
        '查看工具执行日志获取更多信息'
      ],
      recoverable: true,
      ...options
    });
    this.toolName = options.toolName;
    this.input = options.input;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`工具执行错误: ${this.message}`);

    if (this.toolName) {
      lines.push(`工具: ${this.toolName}`);
    }

    lines.push(`错误码: ${this.code}`);

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Bash 执行错误
 */
export class BashExecutionError extends ToolError {
  public readonly command?: string;
  public readonly exitCode?: number;
  public readonly stderr?: string;

  constructor(
    message: string,
    options: SQLZenErrorOptions & {
      command?: string;
      exitCode?: number;
      stderr?: string;
    } = {}
  ) {
    super(message, {
      code: 'BASH_EXECUTION_ERROR',
      context: {
        ...options.context,
        command: options.command,
        exitCode: options.exitCode,
        stderr: options.stderr
      },
      suggestions: options.suggestions || [
        '检查命令语法是否正确',
        '验证命令是否在允许列表中（ls, cat, grep, find, head, tail, wc）',
        '确认目标文件或目录是否存在'
      ],
      recoverable: true,
      ...options
    });
    this.command = options.command;
    this.exitCode = options.exitCode;
    this.stderr = options.stderr;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`Bash 执行错误: ${this.message}`);

    if (this.command) {
      lines.push(`命令: ${this.command}`);
    }

    if (this.exitCode !== undefined) {
      lines.push(`退出码: ${this.exitCode}`);
    }

    if (this.stderr) {
      lines.push(`错误输出: ${this.stderr}`);
    }

    lines.push(`错误码: ${this.code}`);

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * 命令不允许错误
 */
export class CommandNotAllowedError extends ToolError {
  public readonly command: string;
  public readonly allowedCommands: string[];

  constructor(
    command: string,
    allowedCommands: string[],
    options: SQLZenErrorOptions = {}
  ) {
    super(`命令 '${command}' 不在允许列表中`, {
      code: 'COMMAND_NOT_ALLOWED',
      context: {
        ...options.context,
        command,
        allowedCommands
      },
      suggestions: options.suggestions || [
        `允许的命令: ${allowedCommands.join(', ')}`,
        '使用允许列表中的命令来完成任务'
      ],
      recoverable: true,
      ...options
    });
    this.command = command;
    this.allowedCommands = allowedCommands;
  }
}
