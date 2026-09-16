'use strict';
// Persist exit codes even when the calling terminal stops waiting.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name) || !process.argv[3]) throw Error('Usage: node run-king-validation.cjs <log-name> <node-script> [args]');
const base = path.join(root, 'test-results', name);
fs.mkdirSync(path.dirname(base), { recursive: true });
const started = new Date().toISOString();
fs.writeFileSync(base + '.status.json', JSON.stringify({ started, status: 'running' }));
const out = fs.openSync(base + '.log', 'w');
const err = fs.openSync(base + '.err', 'w');
const child = spawn(process.execPath, process.argv.slice(3), { cwd: root, stdio: ['ignore', out, err] });
child.on('error', error => {
  fs.writeFileSync(base + '.status.json', JSON.stringify({ started, status: 'error', error: error.message }));
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  fs.closeSync(out); fs.closeSync(err);
  fs.writeFileSync(base + '.status.json', JSON.stringify({ started, finished: new Date().toISOString(), code, signal, status: code === 0 ? 'passed' : 'failed' }, null, 2));
  process.exitCode = code === 0 ? 0 : 1;
});
