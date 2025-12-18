/*
  @license
	Rollup.js v4.21.0
	Sun, 18 Aug 2024 05:55:06 GMT - commit c4bb050938778bcbe7b3b3ea3419f7fa70d60f5b

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
