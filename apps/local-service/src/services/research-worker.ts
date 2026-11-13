import { parentPort, workerData } from 'node:worker_threads';
import { allocatePopulation, joinPopulationRows } from '../../../../packages/story-core/src/population.ts';
try {
  const joined = joinPopulationRows(workerData.rows, workerData.boundaries);
  if (joined.unmatchedRows.length) throw new Error('Population rows are missing matching boundaries.');
  const result = allocatePopulation(workerData.geometry, joined.units, workerData.period);
  parentPort!.postMessage({ result });
} catch (error) { parentPort!.postMessage({ error: (error as Error).message }); }
