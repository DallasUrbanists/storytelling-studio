import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** One owned renderer process settles cancellation only after closing its browser. */
export function startRender(directory: string, progress: (value: number) => void, done: (error?: string) => void | Promise<void>): () => Promise<void> {
  const file = fileURLToPath(new URL('../../../renderer/src/render-saved.ts', import.meta.url));
  const child = spawn(process.execPath, [file, directory], { stdio: ['ignore','ignore','ignore','ipc'], windowsHide: true });
  let failure: string | undefined, cancelled = false;
  let settle!: () => void;
  const completed = new Promise<void>(resolve => { settle = resolve; });
  child.on('message', (message: { progress?: number; error?: string }) => {
    if (!cancelled && typeof message.progress === 'number' && Number.isFinite(message.progress)) progress(Math.max(0, Math.min(1, message.progress)));
    if (message.error) failure = message.error;
  });
  child.on('error', () => { failure = 'The local renderer could not start. Check the installed Node and Chromium setup.'; });
  child.on('close', code => {
    void Promise.resolve(done(cancelled ? 'Export cancelled.' : failure ?? (code === 0 ? undefined : 'Rendering failed. Check the local diagnostic receipt.'))).finally(settle);
  });
  return () => {
    cancelled = true; if (child.connected) child.send({ cancel: true });
    return completed;
  };
}
