import { fileURLToPath, URL } from 'node:url';

const help = `Usage: npm run render:fixture -- [--format portrait|landscape] [--frames 0,1,149,150,299]
Without --frames, renders and decodes both 300-frame videos (or the selected format).
With --frames, writes diagnostic PNGs only; this does not pass the video gate.
Set GSTORY_CHROME to the absolute path of an installed Chromium executable.
Each invocation retains its receipt and artifacts in out/verification/RUN_ID/.`;

if (process.argv.slice(2).some(argument => argument === '--help' || argument === '-h')) {
  console.log(help);
} else {
  const { runFixture } = await import('../apps/renderer/src/render-job.ts');
  await runFixture(fileURLToPath(new URL('../', import.meta.url)), process.argv.slice(2))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
