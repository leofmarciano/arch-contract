import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeTmpDir(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'arch-contract-')));
}

export function writeFile(dir: string, rel: string, content: string): string {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

export function rmDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
