/*
  @license
	Rollup.js v4.46.2
	Tue, 29 Jul 2025 19:44:27 GMT - commit 4e19badeda6f116a13a2f617ae3c6e1e14606023

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
