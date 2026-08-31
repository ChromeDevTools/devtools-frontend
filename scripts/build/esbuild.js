// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {devtoolsRootPath} from '../devtools_paths.js';

import {esbuildPlugin} from './devtools_plugin.js';

// Disable goroutine preemption to avoid random hangs
// See crbug.com/478754070
process.env.GODEBUG = 'asyncpreemptoff=1';

// esbuild module uses binary in this path.
const binaryName = os.type() === 'Windows_NT' ? 'esbuild.exe' : 'esbuild';
process.env.ESBUILD_BINARY_PATH = path.join(
    devtoolsRootPath(),
    'third_party',
    'esbuild',
    binaryName,
);
// This needs to be after the ESBUILD_BINARY_PATH is set

const esbuild = await import('esbuild');

const entryPoints = [process.argv[2]];
const outfile = process.argv[3];
const additionalArgs = process.argv.slice(4);
const useSourceMaps = additionalArgs.includes('--configSourcemaps');
const minify = additionalArgs.includes('--minify');

const rootDirFlagIndex = additionalArgs.indexOf('--rootDir');
const rootDir = rootDirFlagIndex !== -1 ? additionalArgs[rootDirFlagIndex + 1] : undefined;

const rootGenDirFlagIndex = additionalArgs.indexOf('--rootGenDir');
const rootGenDir = rootGenDirFlagIndex !== -1 ? additionalArgs[rootGenDirFlagIndex + 1] : undefined;

const depfileFlagIndex = additionalArgs.indexOf('--depfile');
const depfile = depfileFlagIndex !== -1 ? additionalArgs[depfileFlagIndex + 1] : undefined;

const entrypointsFileFlagIndex = additionalArgs.indexOf('--entrypointsFile');
const entrypointsFile = entrypointsFileFlagIndex !== -1 ? additionalArgs[entrypointsFileFlagIndex + 1] : undefined;

if (!entrypointsFile) {
  throw new Error('Missing required --entrypointsFile argument');
}
if (!fs.existsSync(entrypointsFile)) {
  throw new Error(`Entrypoints file does not exist: ${entrypointsFile}`);
}
if (!rootDir) {
  throw new Error('Missing required --rootDir argument');
}
if (!rootGenDir) {
  throw new Error('Missing required --rootGenDir argument');
}

const outdir = path.dirname(outfile);
const genRoot = path.resolve(rootGenDir);
const root = path.resolve(rootDir);

const content = fs.readFileSync(entrypointsFile, 'utf-8');
const parsed = JSON.parse(content);
if (!Array.isArray(parsed)) {
  throw new Error(`Expected array of entrypoints in ${entrypointsFile}`);
}
const externalFiles = new Set(parsed);

const plugin = {
  name: 'devtools-plugin',
  setup(build) {
    // https://esbuild.github.io/plugins/#on-resolve
    build.onResolve({filter: /.*/}, esbuildPlugin(outdir, genRoot, root, externalFiles));
  },
};

try {
  const result = await esbuild.build({
    entryPoints,
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    plugins: [plugin],
    sourcemap: useSourceMaps,
    minify,
    metafile: Boolean(depfile),
  });

  if (depfile && result.metafile) {
    const cwd = process.cwd();
    const inputs = Object.keys(result.metafile.inputs).map(inputFile => {
      const absPath = path.isAbsolute(inputFile) ? inputFile : path.resolve(cwd, inputFile);
      return path.relative(cwd, absPath).replaceAll('\\', '/');
    });

    const normalizedOutfile = outfile.replaceAll('\\', '/');
    const depfileContent = `${normalizedOutfile}: ${inputs.join(' ')}\n`;
    await fs.promises.writeFile(depfile, depfileContent, 'utf-8');
  }
} catch (err) {
  console.error('Failed to run esbuild:', err);
  console.error(
      '\nIf error includes `Host version "X" does not match binary version "Y", you need to run `gclient sync`',
  );
  process.exit(1);
}

process.exit(0);
