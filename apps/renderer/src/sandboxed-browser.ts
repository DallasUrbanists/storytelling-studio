import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { openBrowser } from '@remotion/renderer';

const require = createRequire(import.meta.url);
export function sandboxedBrowserArguments(directory: string): string[] {
  return ['about:blank', '--headless=new', '--disable-background-networking', '--disable-component-update',
    '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--force-color-profile=srgb', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + directory];
}
/** Pinned adapter: Remotion's public launcher disables Chromium's sandbox by default. */
export async function openSandboxedBrowser(executablePath: string): Promise<Awaited<ReturnType<typeof openBrowser>>> {
  if (require('@remotion/renderer/package.json').version !== '4.0.542') throw new Error('Review the browser adapter before upgrading Remotion.');
  const directory = path.dirname(require.resolve('@remotion/renderer/package.json'));
  const { launchChrome } = require(path.join(directory, 'dist/browser/Launcher.js'));
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'gstory-chromium-'));
  return launchChrome({ executablePath, args: sandboxedBrowserArguments(userDataDir), userDataDir,
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }, timeout: 25000, logLevel: 'error', indent: false });
}
