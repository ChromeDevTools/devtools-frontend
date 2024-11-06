/*
  @license
	Rollup.js v4.24.3
	Tue, 29 Oct 2024 14:13:34 GMT - commit 69353a84d70294ecfcd5e1ab8e372e21e94c9f8e

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
import 'tty';
