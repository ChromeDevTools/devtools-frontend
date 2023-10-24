#!/usr/bin/env node

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const {
  nodePath,
  mochaExecutablePath,
  downloadedChromeBinaryPath,
  devtoolsRootPath,
} = require('../devtools_paths.js');

function log(...msg) {
  console.log('[run_test_suite.js]', ...msg);
}
function err(...msg) {
  console.error('[run_test_suite.js]', ...msg);
}

const yargsObject =
    require('yargs')
        .option(
            'test-suite-path',
            {type: 'string', desc: 'Path to the test suite, starting from out/Target directory.', demandOption: true})
        .option('test-suite-source-dir', {
          type: 'string',
          desc: 'Path to the source folder containing the tests, relative to the current working directory.',
          demandOption: true
        })
        .option('autoninja', {
          type: 'boolean',
          desc: 'If true, will trigger an autoninja build before executing the test suite',
          default: false,
        })
        .option('target', {type: 'string', default: 'Default', desc: 'Name of the Ninja output directory.'})
        .option('node-modules-path', {
          type: 'string',
          desc:
              'Path to the node_modules directory for Node to use, relative to the current working directory. Defaults to local node_modules folder.'
        })
        .option('test-server-type', {
          'choices': ['hosted-mode', 'component-docs', 'none'],
          'describe':
              'The type of test-server to run for the tests. Will be set automatically if your test-suite-path ends with e2e or interactions, but you need to set it otherwise. If you do not need a test-server, you must explicitly pass the "none" option.',
        })
        .option('test-file-pattern', {
          type: 'string',
          desc: 'A comma separated glob (or just a file path) to select specific test files to execute.'
        })
        .option('mocha-fgrep', {
          type: 'string',
          desc:
              'Mocha\'s fgrep option [https://mochajs.org/#-fgrep-string-f-string] which only runs tests whose titles contain the provided string',
        })
        .option('invert', {
          type: 'boolean',
          desc:
              'Mocha\'s invert option [https://mochajs.org/#-invert] which inverts the match specified by mocha-fgrep',
          default: false,
        })
        .option('mocha-reporter', {
          type: 'string',
          desc: 'Mocha\'s --reporter option',
        })
        .option('mocha-reporter-option', {
          type: 'string',
          desc: 'Mocha\'s --reporter-option flag to pass options through to the Mocha reporter',
        })
        // test-file-pattern can be provided as a flag or as a positional
        // argument. $0 here is Yarg's syntax for the default command:
        // https://github.com/yargs/yargs/blob/master/docs/advanced.md#default-commands
        .command('$0 [test-file-pattern]')
        .option('component-server-base-path', {
          type: 'string',
          desc:
              'The component serve assumes examples live in out/TARGET/gen/front_end/ui/components/docs, but you can set this option to add a prefix. Passing `foo` will redirect the server to look in out/TARGET/gen/foo/front_end/ui/components/docs.',
          default: '',
        })
        .option('component-server-shared-resources-path', {
          type: 'string',
          desc:
              'Configures the base of the URLs that are injected into each component example. By default it is "/", so we load from "/front_end", but you can provide a different prefix if the shared resources are based elsewhere in the directory structure.',
          default: '/',
        })
        .option('hosted-server-devtools-url', {
          type: 'string',
          desc: 'Configures the page that will be loaded by conductor when using the hosted-server for tests.',
          default: 'front_end/devtools_app.html'
        })
        .option('hosted-server-e2e-resources-path', {
          type: 'string',
          desc: 'The base URL that will be used when loading e2e test resources',
          default: '/test/e2e/resources'
        })
        .option(
            'chrome-binary-path',
            {type: 'string', desc: 'Path to the Chromium binary.', default: downloadedChromeBinaryPath()})
        .option('chrome-features', {
          type: 'string',
          desc: 'Comma separated list of strings passed to --enable-features on the Chromium command line.'
        })
        .option('jobs', {
          type: 'number',
          desc: 'Number of parallel runners to use (if supported). Defaults to 1.',
          default: 1,
        })
        .option('cwd', {
          type: 'string',
          desc: 'Path to the directory containing the out/TARGET folder.',
          default: devtoolsRootPath()
        })
        .option('coverage', {
          type: 'boolean',
          desc: 'Whether to collect code coverage for this test suite',
          default: false,
        })
        .option('swarming-output-file', {
          type: 'string',
          desc: 'Path to copy goldens and coverage files',
          default: '',
        })
        .parserConfiguration({
          // So that if we pass --foo-bar, Yargs only populates
          // argv with '--foo-bar', not '--foo-bar' and 'fooBar'.
          'camel-case-expansion': false
        })
        // Take options via --config config.json
        .config()
        // Fail on any unknown arguments
        .strict()
        .argv;

function validatePathExistsOrError(nameOfPath, filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (_error) {
    err(`Failed: ${nameOfPath} [${filePath}] does not exist.`);
    process.exit(1);
  }
}

function getAbsoluteTestSuitePath(target) {
  const pathInput = yargsObject['test-suite-path'];
  // We take the input with Linux path separators, but need to split and join to make sure this works on Windows.
  const testSuitePathParts = pathInput.split('/');
  log(`Using test suite ${path.join(pathInput, path.sep)}`);

  const fullPath = path.join(yargsObject['cwd'], 'out', target, ...testSuitePathParts);
  return fullPath;
}

function setEnvValueIfValuePresent(name, value) {
  if (value) {
    process.env[name] = value;
  }
}

function setNodeModulesPath(nodeModulesPathsInput) {
  if (nodeModulesPathsInput) {
    /** You can provide multiple paths split by either ; (windows) or : (everywhere else)
     * So we need to split our input, ensure each part is absolute, check it
     * exists, and then set NODE_PATH again.
     */
    const delimiter = os.platform() === 'win32' ? ';' : ':';
    const inputPaths = nodeModulesPathsInput.split(delimiter);
    const outputPaths = [];
    inputPaths.forEach(nodePath => {
      if (path.isAbsolute(nodePath)) {
        validatePathExistsOrError('node-modules-path', nodePath);
        outputPaths.push(nodePath);
        return;
      }

      // Node requires the path to be absolute
      const absolutePath = path.resolve(path.join(yargsObject['cwd'], nodePath));
      validatePathExistsOrError('node-modules-path', nodePath);
      outputPaths.push(absolutePath);
    });
    setEnvValueIfValuePresent('NODE_PATH', outputPaths.join(delimiter));
  }
}

function triggerAutoninja(target) {
  const ninjaCommand = os.platform() === 'win32' ? 'autoninja.bat' : 'autoninja';
  const ninjaArgs = ['-C', `out/${target}`];
  const cwd = devtoolsRootPath();
  const result = childProcess.spawnSync(ninjaCommand, ninjaArgs, {encoding: 'utf-8', stdio: 'inherit', cwd});

  if (result.error) {
    throw result.error;
  }

  return result.status;
}

function executeTestSuite({
  absoluteTestSuitePath,
  jobs,
  target,
  nodeModulesPath,
  chromeBinaryPath,
  chromeFeatures,
  testFilePattern,
  coverage,
  cwd,
  mochaOptions = {},
}) {
  /**
   * Internally within various scripts (Mocha configs, Conductor, etc), we rely on
   * process.env.FOO. We are moving to exposing the entire configuration to
   * process.env.TEST_CONFIG_JSON but for now we need to still expose the values
   * directly on the environment whilst we roll out this script and make all the
   * required changes.
   */
  setEnvValueIfValuePresent('CHROME_BIN', chromeBinaryPath);
  setEnvValueIfValuePresent('CHROME_FEATURES', chromeFeatures);
  setEnvValueIfValuePresent('JOBS', jobs);
  setEnvValueIfValuePresent('TARGET', target);
  setEnvValueIfValuePresent('TEST_PATTERNS', testFilePattern);
  setEnvValueIfValuePresent('COVERAGE', coverage);

  /**
   * This one has to be set as an ENV variable as Node looks for the NODE_PATH environment variable.
   */
  setNodeModulesPath(nodeModulesPath);

  const argumentsForNode = [
    mochaExecutablePath(),
  ];
  if (process.env.DEBUG_TEST) {
    argumentsForNode.unshift('--inspect');
  }

  const testSuiteConfig = path.join(absoluteTestSuitePath, '.mocharc.js');
  validatePathExistsOrError('.mocharc.js location', testSuiteConfig);
  argumentsForNode.push('--config', testSuiteConfig);

  for (const [mochaKey, mochaValue] of Object.entries(mochaOptions)) {
    if (mochaValue !== undefined) {
      argumentsForNode.push(`--${mochaKey}`, mochaValue);
      log(`extra mocha flag: --${mochaKey}=${mochaValue}`);
    }
  }
  if (jobs > 1) {
    argumentsForNode.push(`--jobs=${jobs}`);
  }
  const result = childProcess.spawnSync(nodePath(), argumentsForNode, {encoding: 'utf-8', stdio: 'inherit', cwd});

  if (result.error) {
    throw result.error;
  }

  return result.status;
}

function fileIsExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function validateChromeBinaryExistsAndExecutable(chromeBinaryPath) {
  return (
      fs.existsSync(chromeBinaryPath) && fs.statSync(chromeBinaryPath).isFile(chromeBinaryPath) &&
      fileIsExecutable(chromeBinaryPath));
}

function main() {
  if (yargsObject['autoninja']) {
    triggerAutoninja(yargsObject['target']);
  }

  const chromeBinaryPath = yargsObject['chrome-binary-path'];

  if (!validateChromeBinaryExistsAndExecutable(chromeBinaryPath)) {
    err(`Chrome binary path ${chromeBinaryPath} is not valid`);
  }

  const target = yargsObject['target'];
  const targetPath = path.join(yargsObject['cwd'], 'out', target);
  validatePathExistsOrError(`Target out/${target}`, targetPath);

  /*
   * Pull out all the configuration flags, ignoring the Yargs special $0 and _
   * keys, which we can ignore.
   */
  // eslint-disable-next-line no-unused-vars
  const {$0, _, ...configurationFlags} = yargsObject;

  if (!configurationFlags['test-server-type']) {
    if (configurationFlags['test-suite-path'].match(/e2e\/?/)) {
      configurationFlags['test-server-type'] = 'hosted-mode';
    } else if (configurationFlags['test-suite-path'].match(/interactions\/?/)) {
      configurationFlags['test-server-type'] = 'component-docs';
    } else {
      err('test-server-type could not be intelligently set based on your test-suite-path, you must manually set --test-server-type. Set it to "none" if you do not need a test-server to be run.');
      process.exit(1);
    }
  }

  /**
   * Expose the configuration to any downstream test runners (Mocha, Conductor,
   * Test servers, etc).
   */
  process.env.TEST_RUNNER_JSON_CONFIG = JSON.stringify(configurationFlags);

  log(`Using Chromium binary ${chromeBinaryPath}`);
  if (configurationFlags['chrome-features']) {
    log(`with --enable-features=${configurationFlags['chrome-features']}`);
  }
  log(`Using target ${target}`);

  const testSuitePath = getAbsoluteTestSuitePath(target);
  validatePathExistsOrError('Full path to test suite', testSuitePath);

  let resultStatusCode = -1;
  try {
    resultStatusCode = executeTestSuite({
      absoluteTestSuitePath: testSuitePath,
      chromeBinaryPath,
      chromeFeatures: configurationFlags['chrome-features'],
      nodeModulesPath: configurationFlags['node-modules-path'],
      jobs: configurationFlags['jobs'],
      testFilePattern: configurationFlags['test-file-pattern'],
      coverage: configurationFlags['coverage'] && '1',
      target,
      cwd: configurationFlags['cwd'],
      mochaOptions: {
        fgrep: configurationFlags['mocha-fgrep'],
        invert: configurationFlags['invert'],
        reporter: configurationFlags['mocha-reporter'],
        'reporter-option': configurationFlags['mocha-reporter-option'],
      }
    });
  } catch (error) {
    log('Unexpected error when running test suite', error);
    resultStatusCode = 1;
  }
  if (resultStatusCode !== 0) {
    log('ERRORS DETECTED');
  }
  if (yargsObject['swarming-output-file']) {
    if (yargsObject['coverage']) {
      fs.cpSync(
          'interactions-coverage', `${yargsObject['swarming-output-file']}/interactions-coverage`, {recursive: true});
    }
    fs.cpSync('test/interactions/goldens', `${yargsObject['swarming-output-file']}/goldens`, {recursive: true});
  }
  process.exit(resultStatusCode);
}

main();
