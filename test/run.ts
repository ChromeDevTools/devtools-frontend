// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import yargs from 'yargs';
import unparse from 'yargs-unparser';

import {commandLineArgs, expandResponseFiles} from './conductor/commandline.js';
import {
  BUILD_WITH_CHROMIUM,
  CHECKOUT_ROOT,
  GEN_DIR,
  isContainedInDirectory,
  PathPair,
  SOURCE_ROOT,
  TEST_ID_REGEX,
  TestId,
} from './conductor/paths.js';

const options =
    commandLineArgs(yargs(expandResponseFiles(process.argv.slice(2))))
        .parserConfiguration({'strip-aliased': true})
        .options('skip-ninja', {
          type: 'boolean',
          default: false,
          desc: 'Skip rebuilding',
        })
        .options('debug-driver', {
          type: 'boolean',
          hidden: true,
          desc: 'Debug the driver part of tests',
        })
        .options('bail', {
          type: 'boolean',
          alias: 'b',
          desc: 'Bail after first test failure',
        })
        .options('auto-watch', {
          type: 'boolean',
          default: false,
          desc: 'watch changes to files and run tests automatically on file change (only for unit tests)',
        })
        .options('node-unit-tests',
                 {type: 'boolean', default: false, desc: 'whether to run unit tests in node (experimental)'})
        .positional('tests', {
          type: 'string',
          desc: 'Path to the test suite, starting from out/Target/gen directory.',
          normalize: true,
          default: ['front_end', 'test/e2e'].map(f => path.relative(process.cwd(), path.join(SOURCE_ROOT, f))),
        })
        .strict()
        .parseSync();

const CONSUMED_OPTIONS = ['tests', 'skip-ninja', 'debug-driver', 'watch', 'verbose'];

let logLevel = 'error';
if (Number(options['verbose']) === 1) {
  logLevel = 'info';
} else if (Number(options['verbose']) >= 2) {
  logLevel = 'debug';
}

function forwardOptions(): string[] {
  const forwardedOptions = {...options};
  for (const consume of CONSUMED_OPTIONS) {
    forwardedOptions[consume] = undefined;
  }

  // @ts-expect-error yargs and unparse have slightly different types
  const unparsed = unparse(forwardedOptions);
  const args: string[] = [];
  for (let i = 0; i < unparsed.length - 1; i++) {
    if (unparsed[i].startsWith('--') && !Number.isNaN(Number(unparsed[i + 1]))) {
      // Mocha errors on --repeat 1 as it expects --repeat=1. We assume
      // that this is the same for all args followed by a number.
      args.push(`${unparsed[i]}=${unparsed[i + 1]}`);
      i++;
    } else {
      args.push(unparsed[i]);
    }
  }
  return args;
}

function runProcess(exe: string, args: string[], options: childProcess.SpawnSyncOptionsWithStringEncoding) {
  if (logLevel !== 'error') {
    // eslint-disable-next-line no-console
    console.info(`Running '${exe}${args.length > 0 ? ` "${args.join('" "')}"` : ''}'`);
  }
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
  // autoninja can't always find ninja if not run from the checkout root, so
  // run it from there and pass the build root as an argument.
  let result;
  if (os.platform() === 'win32') {
    result = runProcess(
        process.env.ComSpec ?? 'cmd.exe',
        ['/c', 'autoninja.bat', '-C', buildRoot, ...args],
        {
          encoding: 'utf-8',
          cwd: CHECKOUT_ROOT,
          stdio,
        },
    );
  } else {
    result = runProcess(
        'autoninja',
        ['-C', buildRoot, ...args],
        {
          encoding: 'utf-8',
          cwd: CHECKOUT_ROOT,
          stdio,
        },
    );
  }

  if (result.error) {
    throw result.error;
  }
  const {status, output: [, output]} = result;
  return {status, output};
}

const MOCHA_BIN_PATH = path.join(SOURCE_ROOT, 'node_modules', 'mocha', 'bin', 'mocha.js');

class Tests {
  readonly suite: PathPair;
  readonly extraPaths: PathPair[];
  protected readonly cwd = path.dirname(GEN_DIR);
  constructor(suite: string, ...extraSuites: string[]) {
    const suitePath = PathPair.get(suite);
    if (!suitePath) {
      throw new Error(`Could not locate the test suite '${suite}'`);
    }
    this.suite = suitePath;
    const extraPaths = extraSuites.map(p => [p, PathPair.get(p)]);
    const failures = extraPaths.filter(p => p[1] === null);
    if (failures.length > 0) {
      throw new Error(`Could not resolve extra paths for ${failures.map(p => p[0]).join()}`);
    }
    this.extraPaths = extraPaths.filter((p): p is[string, PathPair] => p[1] !== null).map(p => p[1]);
  }

  match(path: TestId) {
    return [this.suite, ...this.extraPaths].some(
        pathToCheck => isContainedInDirectory(path.pathPair.buildPath, pathToCheck.buildPath));
  }

  protected readonly useResponseFile: boolean = true;

  protected run(tests: TestId[], args: string[]) {
    const testList = tests.map(t => t.toBuildTestId());
    let tmpDir: string|undefined;
    let testArgs: string[];

    if (this.useResponseFile) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-test-runner-'));
      const rspPath = path.join(tmpDir, 'tests.rsp');
      fs.writeFileSync(rspPath, testList.join('\n'), 'utf-8');

      if (logLevel !== 'error') {
        // eslint-disable-next-line no-console
        console.info(`Response file (${rspPath}) content (${testList.length} test(s)):\n${
            testList.map(t => `  ${t}`).join('\n')}`);
      }
      testArgs = [`@${rspPath}`];
    } else {
      testArgs = testList;
    }

    try {
      const argumentsForNode = [
        ...args,
        ...(options['auto-watch'] ? ['--auto-watch', '--no-single-run'] : []),
        '--',
        ...testArgs,
        ...(options['verbose'] ? [`--verbose=${options['verbose']}`] : []),
        ...forwardOptions(),
      ];
      if (options['debug-driver']) {
        argumentsForNode.unshift('--inspect-brk');
      } else if (options['debug'] && !argumentsForNode.includes('--inspect-brk')) {
        argumentsForNode.unshift('--inspect');
      }

      const result = runProcess(process.argv[0], argumentsForNode, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: this.cwd,
      });
      return !result.error && (result.status ?? 1) === 0;
    } finally {
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, {recursive: true, force: true});
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }
}

function isApiTestFile(testId: TestId): boolean {
  return testId.pathPair.sourcePath.endsWith('.test.api.ts') || testId.pathPair.buildPath.endsWith('.test.api.js');
}

function isUnitTestFile(testId: TestId): boolean {
  return testId.pathPair.sourcePath.endsWith('.test.ts') && !isApiTestFile(testId);
}

class MochaFrontendTests extends Tests {
  override match(path: TestId): boolean {
    return super.match(path) && !isApiTestFile(path);
  }

  override run(tests: TestId[]) {
    return super.run(
        tests,
        [
          path.join(this.suite.buildPath, '..', 'test', 'unit', 'run-mocha.js'),
        ],
    );
  }
}

class MochaApiTests extends Tests {
  override match(path: TestId): boolean {
    return super.match(path) && !isUnitTestFile(path);
  }

  override run(tests: TestId[]) {
    return super.run(
        tests,
        [
          path.join(GEN_DIR, 'test', 'api', 'run-mocha.js'),
        ],
    );
  }
}

class MochaTests extends Tests {
  override run(tests: TestId[]) {
    const args = [
      path.join(this.suite.buildPath, 'run-mocha.js'),
    ];

    if (options['debug']) {
      // VSCode has issue when starting with '--inspect-brk'
      // Provide this in the launch.json see
      // .vscode/devtools-workspace-launch.json
      if (process.env.VSCODE_DEBUGGER === 'true') {
        args.unshift('--inspect');
        console.warn('Attaching to VSCode Debugger automatically');
      } else {
        args.unshift('--inspect-brk');
        console.warn(
            '\x1b[33mYou need to attach a debugger from chrome://inspect for tests to continue the run in debug mode.\x1b[0m');
        console.warn(
            '\x1b[33mWhen attached, resume execution in the Sources panel to begin debugging the test.\x1b[0m');
      }
    }
    return super.run(
        tests,
        args,
    );
  }
}

/**
 * Workaround the fact that these test don't have
 * build output in out/Default like dir.
 */
class ScriptPathPair extends PathPair {
  static getFromPair(pair: PathPair) {
    return new ScriptPathPair(pair.sourcePath, pair.sourcePath);
  }
}

class ScriptTestId extends TestId {
  static getFromTestId(testId: TestId) {
    return new ScriptTestId(ScriptPathPair.getFromPair(testId.pathPair), testId.subTestId);
  }
}

class ScriptsMochaTests extends Tests {
  override readonly cwd = SOURCE_ROOT;
  override readonly useResponseFile = false;

  override run(tests: TestId[]) {
    return super.run(
        tests.map(test => ScriptTestId.getFromTestId(test)),
        [
          MOCHA_BIN_PATH,
          // Some test require spinning up a TypeScript
          // typechecking service which take some time on
          // the first test. We set 2 x Default(2000)
          '--timeout=4000',
          '--extension=ts,js',
          '--fail-zero',
        ],
    );
  }

  override match(path: TestId): boolean {
    return [this.suite, ...this.extraPaths].some(
        pathToCheck => isContainedInDirectory(path.pathPair.sourcePath, pathToCheck.sourcePath));
  }
}

class KarmaTests extends Tests {
  override match(path: TestId): boolean {
    return super.match(path) && !isApiTestFile(path);
  }

  override run(tests: TestId[]) {
    return super.run(tests, [
      path.join(SOURCE_ROOT, 'node_modules', 'karma', 'bin', 'karma'),
      'start',
      path.join(GEN_DIR, 'test', 'unit', 'karma.conf.js'),
      '--log-level',
      logLevel,
    ]);
  }
}

/**
 * TODO(333423685)
 * - watch
 **/
function main() {
  const tests: string[] = typeof options['tests'] === 'string' ? [options['tests']] : options['tests'];
  const testKinds = [
    new MochaApiTests(path.join(GEN_DIR, 'front_end')),
    new (options['node-unit-tests'] ? MochaFrontendTests : KarmaTests)(
        path.join(GEN_DIR, 'front_end'), path.join(GEN_DIR, 'inspector_overlay'), path.join(GEN_DIR, 'mcp')),
    new MochaTests(path.join(GEN_DIR, 'test/e2e')),
    new MochaTests(path.join(GEN_DIR, 'test/perf')),
    new ScriptsMochaTests(path.join(SOURCE_ROOT, 'scripts/eslint_rules/tests')),
    new ScriptsMochaTests(path.join(SOURCE_ROOT, 'scripts/stylelint_rules/tests')),
    new ScriptsMochaTests(path.join(SOURCE_ROOT, 'scripts/build/tests')),
  ];

  if (!options['skip-ninja']) {
    // For a devtools only checkout, it is fast enough to build everything. For
    // a chromium checkout we want to build only the targets that are needed.
    const targets = BUILD_WITH_CHROMIUM ?
        [
          'chrome',
          'third_party/devtools-frontend/src/test:test',
          'third_party/devtools-frontend/src/scripts/hosted_mode:hosted_mode',
        ] :
        [];
    const {status} = ninja('inherit', ...targets);
    if (status) {
      return status;
    }
  }

  const suites = new Map<MochaTests, TestId[]>();
  const testIds = tests
                      .flatMap(t => {
                        if (TEST_ID_REGEX.test(t)) {
                          return [t];
                        }
                        const globbed = fs.globSync(t);
                        return globbed.length > 0 ? globbed : [t];
                      });
  for (const t of testIds) {
    const testId = TestId.create(t);
    if (!testId) {
      console.error(`Could not locate the test input for '${t}'`);
      continue;
    }

    const matchingSuites = testKinds.filter(kind => kind.match(testId));
    if (matchingSuites.length === 0) {
      console.error(`Unknown test suite for '${testId.pathPair.sourcePath}'`);
      continue;
    }

    for (const suite of matchingSuites) {
      suites.get(suite)?.push(testId) ?? suites.set(suite, [testId]);
    }
  }

  if (suites.size > 0) {
    const success = Array.from(suites).every(([suite, files]) => suite.run(files));
    return success ? 0 : 1;
  }
  if (tests.length > 0) {
    return 1;
  }
  const success = testKinds.every(kind => kind.run([TestId.create(kind.suite.sourcePath)!]));
  return success ? 0 : 1;
}

process.exit(main());
