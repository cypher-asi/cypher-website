// Ensures only one `next dev` server runs against this repo at a time.
//
// Multiple concurrent dev servers share the same `.next/` directory and corrupt
// the React Client Manifest, which surfaces as runtime errors like
// "Could not find the module ...#SegmentViewNode in the React Client Manifest"
// and "__webpack_modules__[moduleId] is not a function". npm runs this script
// automatically before `dev`, so each `npm run dev` first clears any stale
// dev processes for this project.

import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const self = process.pid;

function kill(pid) {
  const n = Number(pid);
  if (!n || n === self) return;
  try {
    process.kill(n, 'SIGKILL');
    console.log(`[predev] stopped stale dev process ${n}`);
  } catch {
    /* already gone */
  }
}

function staleNextPids() {
  if (process.platform === 'win32') {
    // Match node processes whose command line references this repo and is a
    // Next dev server (the CLI `next ... dev`) or its `start-server` child.
    const script =
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
      `Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${repo}') -and ` +
      "($_.CommandLine -match 'next(\\\\|/|\\.).*dev' -or $_.CommandLine -match 'start-server') } | " +
      'Select-Object -ExpandProperty ProcessId';
    const res = spawnSync('powershell', ['-NoProfile', '-Command', script], {
      encoding: 'utf8',
    });
    return (res.stdout || '').split(/\r?\n/);
  }

  const res = spawnSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' });
  return (res.stdout || '')
    .split('\n')
    .filter(
      (line) =>
        line.includes(repo) && line.includes('next') && line.includes('dev')
    )
    .map((line) => line.trim().split(/\s+/)[0]);
}

try {
  staleNextPids()
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach(kill);
} catch (err) {
  // Never block dev startup on cleanup failure.
  console.warn('[predev] cleanup skipped:', err?.message ?? err);
}
