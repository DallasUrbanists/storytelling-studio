import { readFile, writeFile, mkdir, copyFile, rename, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseProject } from '../../../packages/project-schema/src/index.ts';
import { bundle } from '@remotion/bundler';
import { renderMedia, getCompositions, makeCancelSignal } from '@remotion/renderer';

import { openSandboxedBrowser } from './sandboxed-browser.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const directory = path.resolve(process.argv[2]);
const require = createRequire(import.meta.url), execute = promisify(execFile);
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const cancellation = makeCancelSignal();
let cancelled = false;
process.on('message', (message: { cancel?: boolean }) => { if (message.cancel) { cancelled = true; cancellation.cancel(); } });
const checkCancelled = () => { if (cancelled) throw new Error('Export cancelled'); };
let browser: Awaited<ReturnType<typeof openSandboxedBrowser>> | undefined;
const receipt: Record<string, unknown> = { status: 'running', version: '4.0.542', node: process.version, outputs: [] };
try {
  const inputBytes = await readFile(path.join(directory, 'input.json'));
  const input = JSON.parse(inputBytes.toString('utf8'));
  const project = parseProject(input.document), publicDir = path.join(directory, 'public');
  Object.assign(receipt, { projectId: input.projectId, revisionId: input.revisionId, inputSha256: hash(inputBytes) });
  await mkdir(path.join(publicDir, 'assets'), { recursive: true });
  for (const [id, name] of [['fixture-style','bridge-style.json'],['fixture-font','Inter-Regular.woff2'],['font-license','OFL-Inter.txt']]) {
    const descriptor = input.assets.find((asset: { id: string }) => asset.id === id);
    if (!descriptor) { if (id === 'font-license') continue; throw new Error('Missing render resource'); }
    const bytes = await readFile(descriptor.file); if (hash(bytes) !== descriptor.sha256) throw new Error('Asset checksum mismatch');
    await writeFile(path.join(publicDir, 'assets', name), bytes);
  }
  await copyFile(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'), path.join(publicDir, 'maplibre-gl-worker.mjs'));
  const chrome = process.env.GSTORY_CHROME;
  if (!chrome || !path.isAbsolute(chrome) || !(await stat(chrome)).isFile()) throw new Error('Configure GSTORY_CHROME with the installed Chromium executable.');
  process.send?.({ progress: 0.01 });
  const serveUrl = await bundle({ onProgress: progress => process.send?.({ progress: 0.01 + progress / 100 * 0.04 }), entryPoint: path.join(root, 'apps/renderer/src/index.tsx'), rootDir: root, outDir: path.join(directory, 'bundle'), publicDir, enableCaching: false, gitSource: null });
  checkCancelled();
  browser = await openSandboxedBrowser(chrome);
  checkCancelled();
  const options = { serveUrl, puppeteerInstance: browser, browserExecutable: chrome, chromiumOptions: { gl: 'swangle' as const }, logLevel: 'error' as const, inputProps: { project }, timeoutInMilliseconds: 70000 };
  const compositions = await getCompositions(serveUrl, options);
  const compositor = path.dirname(require.resolve('@remotion/compositor-win32-x64-msvc/package.json'));
  for (const [index, variant] of (input.variants as string[]).entries()) {
    checkCancelled();
    const composition = compositions.find(c => c.id === (variant === 'portrait' ? 'StoryPortrait' : 'StoryLandscape'));
    if (!composition) throw new Error('Missing output composition');
    const pending = path.join(directory, variant + '.partial.mp4'), output = path.join(directory, variant + '.mp4');
    await renderMedia({ ...options, composition, outputLocation: pending, codec: 'h264', pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', disableSharedMemoryCapture: true, concurrency: 1,
      cancelSignal: cancellation.cancelSignal,
      onProgress: ({ progress }) => process.send?.({ progress: 0.05 + 0.95 * (index + progress * 0.9) / input.variants.length }) });
    const probe = await execute(path.join(compositor, 'ffprobe.exe'), ['-v','error','-count_frames','-show_streams','-of','json',pending], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const stream = JSON.parse(probe.stdout).streams.find((s: { codec_type: string }) => s.codec_type === 'video');
    if (!stream || stream.codec_name !== 'h264' || stream.pix_fmt !== 'yuv420p' || stream.width !== composition.width || stream.height !== composition.height || Number(stream.nb_read_frames) !== composition.durationInFrames || !['30/1','30'].includes(stream.avg_frame_rate)) throw new Error('Video metadata does not match the saved revision.');
    const decoded = await execute(path.join(compositor, 'ffmpeg.exe'), ['-v','error','-xerror','-i',pending,'-map','0:v:0','-progress','pipe:1','-nostats','-fps_mode','passthrough','-c:v','rawvideo','-f','null','-'], { windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    const counts = [...decoded.stdout.matchAll(/^frame=(\d+)\s*$/gm)];
    if (decoded.stderr.trim() || Number(counts.at(-1)?.[1]) !== composition.durationInFrames) throw new Error('Independent full decode did not reproduce every expected frame.');
    await rename(pending, output);
    (receipt.outputs as unknown[]).push({ variant, file: variant + '.mp4', width: composition.width, height: composition.height, frames: composition.durationInFrames, fps: 30, decodedFrames: Number(counts.at(-1)![1]), codec: stream.codec_name, pixelFormat: stream.pix_fmt, colorSpace: stream.color_space, sha256: hash(await readFile(output)) });
    process.send?.({ progress: (index + 1) / input.variants.length });
  }
  receipt.status = 'completed';
} catch (error) {
  receipt.status = 'failed'; receipt.diagnostic = String(error);
  process.send?.({ error: /GSTORY_CHROME/.test(String(error)) ? 'Set GSTORY_CHROME to an installed Chromium executable and restart the studio.' : 'Rendering failed; the saved project is intact. See the local diagnostic receipt.' });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close({ silent: true });
  await writeFile(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2));
  process.disconnect?.();
}
