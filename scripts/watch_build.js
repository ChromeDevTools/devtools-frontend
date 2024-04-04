// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const chokidar = require('chokidar');
const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');
const cwd = process.cwd();
const frontEndDir = path.join(cwd, 'front_end');
const testsDir = path.join(cwd, 'test');
const {WebSocketServer} = require('ws');
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
  return (new Date())
      .toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
};

const NODE_PATH = path.join('third_party', 'node', 'node.py');
const ESBUILD_PATH = path.join('third_party', 'esbuild', 'esbuild');
const GENERATE_CSS_JS_FILES_PATH = path.join('scripts', 'build', 'generate_css_js_files.js');

const connections = {};
let lastConnectionId = 0;

// Extract the target if it's provided.
const target = extractArgument('--target') || 'Default';
const PORT = 8080;
const TARGET_GEN_DIR = path.join('out', target, 'gen');

// Make sure that the target has
// - `is_debug = true`
// - `devtools_skip_typecheck = true`
// flags set.
const assertTargetArgsForWatchBuild = async () => {
  const {status, stdout} =
      childProcess.spawnSync('gn', ['args', '--list', '--json', `out/${target}`], {cwd, env, stdio: 'pipe'});

  const stdoutText = stdout.toString();
  if (status !== 0) {
    throw `gen args --list --json failed for target ${target}\n${stdoutText}`;
  }

  let args;
  try {
    args = JSON.parse(stdoutText);
  } catch (err) {
    throw `Parsing args of target ${target} is failed\n${err}`;
  }

  const argsMap = Object.fromEntries(args.map(arg => [arg.name, arg]));
  const assertTrueArg = argName => {
    const argString = argsMap[argName].current ? argsMap[argName].current.value : argsMap[argName].default.value;
    if (argString !== 'true') {
      throw `${argName} is expected to be 'true' but it is '${argString}' in target ${target}`;
    }
  };

  try {
    assertTrueArg('is_debug');
    assertTrueArg('devtools_skip_typecheck');
  } catch (err) {
    console.error(
        `watch_build needs is_debug and devtools_skip_typecheck args to be set to true for target ${target}\n${err}\n`);
    process.exit(1);
  }
};

const startWebSocketServerForCssChanges = () => {
  const wss = new WebSocketServer({port: PORT});

  wss.on('listening', () => {
    console.log(`Listening connections for CSS changes at ${PORT}\n`);
  });

  wss.on('connection', ws => {
    const connection = {
      id: ++lastConnectionId,
      ws,
    };

    connections[connection.id] = connection;
    ws.on('close', () => {
      delete connections[connection.id];
    });
  });
};

const runGenerateCssFiles = ({fileName, isLegacy}) => {
  const scriptArgs = [
    /* buildTimestamp */ Date.now(),
    /* isDebugString */ 'true',
    /* isLegacyString */ isLegacy ? 'true' : 'false',
    /* targetName */ target,
    /* srcDir */ '',
    /* targetGenDir */ TARGET_GEN_DIR,
    /* files */ relativeFileName(fileName),
    /* hotReloadEnabledString */ 'true'
  ];

  childProcess.spawnSync(
      'vpython3', [NODE_PATH, '--output', GENERATE_CSS_JS_FILES_PATH, ...scriptArgs], {cwd, env, stdio: 'inherit'});
};

const isLegacyCss = absoluteFilePath => {
  if (!absoluteFilePath.endsWith('.css')) {
    return false;
  }

  const relativePath = path.relative(cwd, absoluteFilePath);
  const possibleLegacyCssPath = path.join(TARGET_GEN_DIR, `${relativePath}.legacy.js`);
  return fs.existsSync(possibleLegacyCssPath);
};

const notifyWebSocketConections = message => {
  Object.values(connections).forEach(connection => connection.ws.send(message));
};

const changedFiles = new Set();
let buildScheduled = false;

const onFileChange = async fileName => {
  changedFiles.add(fileName);
  // Debounce to handle them in batch
  if (!buildScheduled) {
    buildScheduled = true;
    setTimeout(() => {
      buildScheduled = false;
      buildFiles();
    }, 100);
  }
};

const buildFiles = async () => {
  // If we need a ninja rebuild, do that and quit
  const nonJSOrCSSFileName = Array.from(changedFiles).find(f => !f.endsWith('.css') && !f.endsWith('.ts'));
  if (nonJSOrCSSFileName) {
    console.log(`${currentTimeString()} - ${relativeFileName(nonJSOrCSSFileName)} changed, running ninja`);
    changedFiles.clear();
    childProcess.spawnSync('autoninja', ['-C', `out/${target}`], {cwd, env, stdio: 'inherit'});
    return;
  }
  // …Otherwise we can do fast rebuilds
  changedFiles.forEach(fastRebuildFile);
  console.assert(changedFiles.size === 0, `⚠️⚠️⚠️ Some changed files NOT built: ${Array.from(changedFiles.values())}`);
};

const fastRebuildFile = async fileName => {
  if (fileName.endsWith('.css')) {
    console.log(`${currentTimeString()} - ${relativeFileName(fileName)} changed, notifying frontend`);
    const isLegacy = isLegacyCss(fileName);
    const content = fs.readFileSync(fileName, {encoding: 'utf8', flag: 'r'});
    runGenerateCssFiles({fileName: relativeFileName(fileName), isLegacy});
    changedFiles.delete(fileName);

    if (isLegacy) {
      notifyWebSocketConections(JSON.stringify({
        event: 'log-warn',
        message: `a legacy css file \x1B[1m${
            path.relative(cwd, fileName)}\x1B[m is updated, you need to refresh the page to see changes.`
      }));
    } else {
      notifyWebSocketConections(JSON.stringify({event: 'css-change', file: fileName, content}));
    }
    return;
  }

  if (fileName.endsWith('.ts')) {
    console.log(`${currentTimeString()} - ${relativeFileName(fileName)} changed, generating js file`);

    const jsFileName = `${fileName.substring(0, fileName.length - 3)}.js`;
    const outFile = path.resolve('out', target, 'gen', relativeFileName(jsFileName));
    const tsConfigLocation = path.join(cwd, 'tsconfig.json');
    // Hack to mimic node_ts_library for test files.
    const cjsForTests = fileName.includes('/test/') ? ['--format=cjs'] : [];
    changedFiles.delete(fileName);
    const res = childProcess.spawnSync(
        ESBUILD_PATH,
        [fileName, `--outfile=${outFile}`, '--sourcemap', `--tsconfig=${tsConfigLocation}`, ...cjsForTests],
        {cwd, env, stdio: 'inherit'});

    if (res && res.status === 1) {
      notifyWebSocketConections(JSON.stringify({
        event: 'log-warn',
        message: `TS compilation failed for \x1B[1m${path.relative(cwd, fileName)}\x1B[m, check your terminal.`
      }));
    }
    return;
  }
};

console.log('Running initial build before watching changes');
assertTargetArgsForWatchBuild();
childProcess.spawnSync('autoninja', ['-C', `out/${target}`], {cwd, env, stdio: 'inherit'});

// Watch the front_end and test folder and build on any change.
console.log(`Watching for changes in ${frontEndDir} and ${testsDir}`);
chokidar.watch(frontEndDir, {usePolling: false, useFsEvents: true}).on('change', onFileChange);
chokidar.watch(testsDir, {usePolling: false, useFsEvents: true}).on('change', onFileChange);
startWebSocketServerForCssChanges();
