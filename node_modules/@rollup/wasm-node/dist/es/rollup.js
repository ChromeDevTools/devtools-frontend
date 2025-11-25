/*
  @license
	Rollup.js v4.53.2
	Mon, 10 Nov 2025 08:56:08 GMT - commit d8b0150971681d9efa4f173de5edd2c79a6e03d9

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
export { version as VERSION, defineConfig, rollup, watch } from './shared/node-entry.js';
import './shared/parseAst.js';
import '../native.js';
import 'node:path';
import 'path';
import 'node:process';
import 'node:perf_hooks';
import 'node:fs/promises';
