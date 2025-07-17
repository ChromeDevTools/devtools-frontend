/*
  @license
	Rollup.js v4.44.2
	Fri, 04 Jul 2025 12:55:10 GMT - commit d6dd1e7c6ee3f8fcfd77e5b8082cc62387a8ac4f

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
