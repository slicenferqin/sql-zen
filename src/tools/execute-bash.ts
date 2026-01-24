import { exec } from 'child_process';

const ALLOWED_COMMANDS = ['ls', 'cat', 'grep', 'find', 'head', 'tail', 'wc'];

export interface ExecuteBashOptions {
  cwd?: string;
  timeout?: number;
}

export class BashTool {
  private sandboxDir: string;

  constructor(sandboxDir: string = 'schema') {
    this.sandboxDir = sandboxDir;
  }

  async execute(command: string, options: ExecuteBashOptions = {}): Promise<{ success: boolean; output: string; error?: string }> {
    const commandParts = command.trim().split(/\s+/);
    const commandName = commandParts[0];

    if (!ALLOWED_COMMANDS.includes(commandName)) {
      return {
        success: false,
        error: `Command '${commandName}' is not allowed. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`
      };
    }

    return new Promise((resolve) => {
      exec(command, {
        cwd: options.cwd || this.sandboxDir,
        timeout: options.timeout || 30000
      }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            error: error.message
          });
        } else {
          resolve({
            success: true,
            output: stdout || stderr
          });
        }
      });
    });
  }

  isCommandAllowed(command: string): boolean {
    const commandName = command.trim().split(/\s+/)[0];
    return ALLOWED_COMMANDS.includes(commandName);
  }
}
