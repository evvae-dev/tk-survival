import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

// 작업 폴더 설정을 읽기 전에 신뢰 상태를 전달한다. 전역 설정은 변경하지 않는다.
const workspace = 'C:/dev/.codex/tmp/tk-survival-gemini-web';
const outputPath = 'C:/dev/.codex/tmp/tk-survival-gemini-web-result.json';
const cli = path.join(process.env.APPDATA, 'npm/node_modules/@google/gemini-cli/bundle/gemini.js');
const prompt = await new Promise(resolve => {
  let value = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { value += chunk; });
  process.stdin.on('end', () => resolve(value));
});
if (!prompt.trim()) throw new Error('표준 입력으로 공개 웹 수집 지시를 전달하세요.');
await mkdir(`${workspace}/.gemini`, { recursive: true });
const settingsPath = `${workspace}/.gemini/settings.json`;
await writeFile(settingsPath, JSON.stringify({
  tools: { core: ['web_fetch', 'google_web_search'], allowed: ['web_fetch', 'google_web_search'] },
  experimental: { directWebFetch: true },
  skills: { enabled: false },
  model: { maxSessionTurns: 12 },
}, null, 2), 'utf8');

const child = spawn(process.execPath, [cli, '-m', 'gemini-3.8-flash',
  '--approval-mode', 'default', '--extensions', 'none', '--output-format', 'stream-json',
  '-p', '표준 입력의 공개 웹 수집 지시를 수행하라. 실제 조회 결과만 사용하라.'], {
  cwd: workspace,
  env: { ...process.env, GEMINI_CLI_TRUST_WORKSPACE: 'true' },
  stdio: ['pipe', 'pipe', 'pipe'],
});
let pending = '', response = '', diagnostics = '';
const calls = [], results = [];
child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => {
  pending += chunk;
  let newline;
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline);
    pending = pending.slice(newline + 1);
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'message' && event.role === 'assistant') response += event.content;
    if (event.type === 'tool_use') {
      const call = { toolId: event.tool_id, name: event.tool_name, parameters: event.parameters };
      calls.push(call);
      process.stdout.write(`${JSON.stringify({ tool: call.name, parameters: call.parameters })}\n`);
    }
    if (event.type === 'tool_result') {
      results.push({ toolId: event.tool_id, status: event.status, output: event.output });
      process.stdout.write(`${JSON.stringify({ toolId: event.tool_id, status: event.status })}\n`);
    }
  }
});
child.stderr.setEncoding('utf8');
child.stderr.on('data', chunk => { diagnostics += chunk; });
child.stdin.end(prompt);
try {
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  await writeFile(outputPath, `${JSON.stringify({ model: 'gemini-3.8-flash', code, calls, results, response }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ code, calls: calls.length, outputPath }));
  if (code !== 0) {
    console.error(diagnostics.slice(-2000));
    process.exitCode = code ?? 1;
  }
} finally {
  await unlink(settingsPath);
}
