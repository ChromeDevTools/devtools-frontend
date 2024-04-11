// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/* eslint-disable rulesdir/es_modules_import */
import {GEN_DIR, isContainedInDirectory, PathPair, SOURCE_ROOT} from './conductor/paths.js';
import * as TestConfig from './conductor/test_config.js';

const yargs = require('yargs');
const unparse = require('yargs-unparser');
const options = TestConfig.commandLineArgs(yargs(process.argv.slice(2)))
                    .options('skip-ninja', {type: 'boolean', desc: 'Skip rebuilding'})
                    .boolean('debug-driver')
                    .positional('tests', {
                      type: 'string',
                      desc: 'Path to the test suite, starting from out/Target/gen directory.',
                      normalize: true,
                      default: ['front_end', 'test/e2e', 'test/interactions'].map(f => path.join(SOURCE_ROOT, f)),
                    })
                    .strict()
                    .argv;
const CONSUMED_OPTIONS = ['tests', 'skip-ninja', 'debug-driver'];

function forwardOptions() {
  const forwardedOptions = {...options};
  for (const consume of CONSUMED_OPTIONS) {
    forwardedOptions[consume] = undefined;
  }
  return unparse(forwardedOptions);
}

function runProcess(exe: string, args: string[], options: childProcess.SpawnSyncOptionsWithStringEncoding) {
  // eslint-disable-next-line no-console
  console.info(`Running '${exe}${args.length > 0 ? ` "${args.join('" "')}"` : ''}'`);
  return childProcess.spawnSync(exe, args, options);
}

function ninja(stdio: 'inherit'|'pipe', ...args: string[]) {
  let buildRoot = path.dirname(GEN_DIR);
  while (!fs.existsSync(path.join(buildRoot, 'args.gn'))) {
    const parent = path.dirname(buildRoot);
    if (parent === buildRoot) {
      throw new Error('Failed to find a build directory containing args.gn');
    }
    buildRoot = parent;
  }
  const ninjaCommand = os.platform() === 'win32' ? 'autoninja.bat' : 'autoninja';
  const result = runProcess(ninjaCommand, args, {encoding: 'utf-8', cwd: buildRoot, stdio});
  if (result.error) {
    throw result.error;
  }
  const {status, output: [, output]} = result;
  return {status, output};
}

class MochaTests {
  readonly suite: PathPair;
  constructor(suite: string) {
    const suitePath = PathPair.get(suite);
    if (!suitePath) {
      throw new Error(`Could not locate the test suite '${suite}'`);
    }
    this.suite = suitePath;
  }

  run(tests: PathPair[]) {
    const argumentsForNode = [
      path.join(SOURCE_ROOT, 'node_modules', 'mocha', 'bin', 'mocha'),
      '--config',
      path.join(this.suite.buildPath, 'mocharc.js'),
      '--',
      ...tests.map(t => t.buildPath),
      ...forwardOptions(),
    ];
    if (options['debug-driver']) {
      argumentsForNode.unshift('--inspect-brk');
    } else if (options['debug']) {
      argumentsForNode.unshift('--inspect');
    }
    const result = runProcess(
        process.argv[0], argumentsForNode, {encoding: 'utf-8', stdio: 'inherit', cwd: path.dirname(GEN_DIR)});
    return !result.error;
  }
}

// TODO
// - e2e
// - unit
// - perf
// - debug
// - screenshots
// - iterations
// - expanded-reporting
// - shuffle
// - watch
// - layout?
function main() {
  const tests: string[] = options['tests'];

  const testKinds = [
    new MochaTests(path.join(GEN_DIR, 'test/interactions')),
    new MochaTests(path.join(GEN_DIR, 'test/e2e')),
  ];

  if (!options['skip-ninja']) {
    const {status} = ninja('inherit');
    if (status) {
      return status;
    }
  }

  const suites = new Map<MochaTests, PathPair[]>();
  for (const t of tests) {
    const repoPath = PathPair.get(t);
    if (!repoPath) {
      console.error(`Could not locate the test input for '${t}'`);
      continue;
    }

    const suite = testKinds.find(kind => isContainedInDirectory(repoPath.buildPath, kind.suite.buildPath));
    if (suite === undefined) {
      console.error(`Unknown test suite for '${repoPath.sourcePath}'`);
      continue;
    }

    suites.get(suite)?.push(repoPath) ?? suites.set(suite, [repoPath]);
  }

  if (suites.size > 0) {
    const success = Array.from(suites).every(([suite, files]) => suite.run(files));
    return success ? 0 : 1;
  }
  if (tests.length > 0) {
    return 1;
  }
  const success = testKinds.every(kind => kind.run([kind.suite]));
  return success ? 0 : 1;
}

process.exit(main());
