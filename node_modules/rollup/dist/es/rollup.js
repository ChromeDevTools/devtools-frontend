/*
  @license
	Rollup.js v4.22.4
	Sat, 21 Sep 2024 06:10:53 GMT - commit 79c0aba353ca84c0e22c3cfe9eee433ba83f3670

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
