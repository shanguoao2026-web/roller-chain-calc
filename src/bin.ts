#!/usr/bin/env node
import { runCli } from './cli.js';

try {
  runCli(process.argv.slice(2), {
    stdout: text => { process.stdout.write(text); },
    stderr: text => { process.stderr.write(text); },
  });
} catch (error) {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\nUse --help for usage.\n`);
  process.exitCode = 1;
}
