// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const cwd = process.cwd();
const frontEndDir = path.join(cwd, 'front_end');
const testsDir = path.join(cwd, 'test');
const env = process.env;

const extractArgument = argName => {
  const arg = process.argv.find(value => value.startsWith(`${argName}`));
  if (!arg) {
    return;
  }

  return arg.slice(`${argName}=`.length);
};

const relativeFileName = absoluteName => {
  return path.relative(cwd, absoluteName);
};

const currentTimeString = () => {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const NODE_PATH = path.join('third_party', 'node', 'node.py');
const ESBUILD_PATH = path.join('third_party', 'esbuild', 'esbuild');
const GENERATE_CSS_JS_FILES_PATH = path.join(
    'scripts',
    'build',
    'generate_css_js_files.js',
);

let tId = -1;

// Extract the target if it's provided.
const target = extractArgument('--target') || 'Default';
const TARGET_GEN_DIR = path.join('out', target, 'gen');

// Make sure that the target has
// - `is_debug = true`
// - `devtools_skip_typecheck = true`
// flags set.
const assertTargetArgsForWatchBuild = async () => {
  const {status, stdout} = childProcess.spawnSync(
      'gn',
      ['args', '--list', '--json', `out/${target}`],
      {cwd, env, stdio: 'pipe'},
  );

  const stdoutText = stdout.toString();
  if (status !== 0) {
    throw new Error(
        `gen args --list --json failed for target ${target}\n${stdoutText}`,
    );
  }

  let args;
  try {
    args = JSON.parse(stdoutText);
  } catch (err) {
    if (stdoutText.includes('devtools_css_hot_reload_enabled')) {
      console.error(
          '\n❗❗ You must remove `devtools_css_hot_reload_enabled` from your args.gn.\n',
      );
    }
    throw new Error(`Parsing args of target ${target} is failed\n${err}`, {
      cause: err,
    });
  }

  const argsMap = Object.fromEntries(args.map(arg => [arg.name, arg]));
  const assertTrueArg = argName => {
    const argString = argsMap[argName].current ? argsMap[argName].current.value : argsMap[argName].default.value;
    if (argString !== 'true') {
      throw new Error(
          `${argName} is expected to be 'true' but it is '${argString}' in target ${target}`,
      );
    }
  };

  try {
    assertTrueArg('is_debug');
    assertTrueArg('devtools_skip_typecheck');
  } catch (err) {
    console.error(
        `watch_build needs is_debug and devtools_skip_typecheck args to be set to true for target ${target}\n${
            err?.message}\n`,
    );
    process.exit(1);
  }
};

const runGenerateCssFiles = ({fileName}) => {
  const scriptArgs = [
    /* buildTimestamp */ Date.now(),
    /* isDebugString */ 'true',
    /* targetName */ target,
    /* srcDir */ '',
    /* targetGenDir */ TARGET_GEN_DIR,
    /* files */ relativeFileName(fileName),
  ];

  childProcess.spawnSync(
      'vpython3',
      [NODE_PATH, '--output', GENERATE_CSS_JS_FILES_PATH, ...scriptArgs],
      {cwd, env, stdio: 'inherit'},
  );
};

const changedFiles = new Set();

const onFileChange = async fileName => {
  changedFiles.add(fileName);
  // Debounce to handle them in batch.
  // At 250ms, we're optimizing for individual file changes.
  // On branch changes, its possible a ninja rebuild may start before the checkout is complete, but it will likely quickly error out. Either way, another rebuild will be attempted immediately after.
  clearTimeout(tId);
  tId = setTimeout(buildFiles, 250);
};

const buildFiles = async () => {
  // If we need a ninja rebuild, do that and quit
  const nonTSOrCSSFileNames = Array.from(changedFiles)
                                  .filter(
                                      f => !f.endsWith('.css') && !f.endsWith('.ts'),
                                  );
  if (nonTSOrCSSFileNames.length) {
    console.log(
        `${currentTimeString()} - ${
            nonTSOrCSSFileNames.map(
                relativeFileName,
                )} changed, running ninja`,
    );
    changedFiles.clear();
    childProcess.spawnSync('autoninja', ['-C', `out/${target}`], {
      cwd,
      env,
      stdio: 'inherit',
    });
    return;
  }
  // …Otherwise we can do fast rebuilds
  changedFiles.forEach(fastRebuildFile);
  console.assert(
      changedFiles.size === 0,
      `⚠️⚠️⚠️ Some changed files NOT built: ${Array.from(changedFiles.values())}`,
  );
};

const fastRebuildFile = async fileName => {
  if (fileName.endsWith('.css')) {
    console.log(
        `${currentTimeString()} - ${
            relativeFileName(
                fileName,
                )} changed, notifying frontend`,
    );
    runGenerateCssFiles({fileName: relativeFileName(fileName)});
    changedFiles.delete(fileName);
    return;
  }

  if (fileName.endsWith('.ts')) {
    console.log(
        `${currentTimeString()} - ${
            relativeFileName(
                fileName,
                )} changed, generating js file`,
    );

    const jsFileName = `${fileName.substring(0, fileName.length - 3)}.js`;
    const outFile = path.resolve(
        'out',
        target,
        'gen',
        relativeFileName(jsFileName),
    );
    const tsConfigLocation = path.join(cwd, 'tsconfig.json');
    // Hack to mimic node_ts_library for test files.
    const cjsForTests = fileName.includes('/test/') ? ['--format=cjs'] : [];
    changedFiles.delete(fileName);
    const res = childProcess.spawnSync(
        ESBUILD_PATH,
        [
          fileName,
          `--outfile=${outFile}`,
          '--sourcemap',
          `--tsconfig=${tsConfigLocation}`,
          ...cjsForTests,
        ],
        {cwd, env, stdio: 'inherit'},
    );

    if (res?.status === 1) {
      console.warn(
          `TS compilation failed for \x1B[1m${path.relative(cwd, fileName)}\x1B`,
      );
    }
    return;
  }
};

console.log('Running initial build before watching changes');
assertTargetArgsForWatchBuild();
childProcess.spawnSync('autoninja', ['-C', `out/${target}`], {
  cwd,
  env,
  stdio: 'inherit',
});

// Watch the front_end and test folder and build on any change.
console.log(`Watching for changes in ${frontEndDir} and ${testsDir}`);
fs.watch(frontEndDir, {recursive: true})
    .on(
        'change',
        (_, fileName) => onFileChange(path.join(frontEndDir, fileName)),
    );
fs.watch(testsDir, {recursive: true})
    .on(
        'change',
        (_, fileName) => onFileChange(path.join(testsDir, fileName)),
    );
