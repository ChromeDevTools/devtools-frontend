/*
  @license
	Rollup.js v4.53.2
	Mon, 10 Nov 2025 08:56:08 GMT - commit d8b0150971681d9efa4f173de5edd2c79a6e03d9

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

require('node:fs/promises');
require('node:path');
require('node:process');
require('node:url');
require('./shared/rollup.js');
require('./shared/parseAst.js');
const loadConfigFile_js = require('./shared/loadConfigFile.js');
require('path');
require('./native.js');
require('node:perf_hooks');
require('./getLogFilter.js');



exports.loadConfigFile = loadConfigFile_js.loadConfigFile;
//# sourceMappingURL=loadConfigFile.js.map
