// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseArgs} from 'node:util';

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

const {values} = parseArgs({
  options: {
    entrypoint: {
      type: 'string',
    },
    outfile: {
      type: 'string',
    },
    sourcemap: {
      type: 'boolean',
      default: false,
    },
    minify: {
      type: 'boolean',
      default: false,
    },
    'bundle-all': {
      type: 'boolean',
      default: false,
    },
    'css-style-sheet': {
      type: 'boolean',
      default: false,
    },
    format: {
      type: 'string',
      default: 'esm',
    },
    'global-name': {
      type: 'string',
    },
    'max-size': {
      type: 'string',
    },
    'root-dir': {
      type: 'string',
    },
    'root-gen-dir': {
      type: 'string',
    },
    depfile: {
      type: 'string',
    },
    'entrypoints-file': {
      type: 'string',
    },
  },
  strict: true,
});

const {
  entrypoint,
  outfile,
  sourcemap,
  minify,
  'bundle-all': bundleAll,
  'css-style-sheet': cssStyleSheet,
  'global-name': globalName,
  'root-dir': rootDir,
  'root-gen-dir': rootGenDir,
  depfile,
  'entrypoints-file': entrypointsFile,
} = values;

const format = /** @type {import('esbuild').Format} */ (values.format);
const maxSize = values['max-size'] !== undefined ? Number(values['max-size']) : undefined;

if (!entrypoint || !outfile || !rootDir || !rootGenDir) {
  throw new Error(
      'Missing required arguments: --entrypoint, --outfile, --root-dir, and --root-gen-dir must be provided');
}
const entryPoints = [entrypoint];

if (!bundleAll) {
  if (!entrypointsFile) {
    throw new Error('Missing required --entrypoints-file argument');
  }
  if (!fs.existsSync(entrypointsFile)) {
    throw new Error(`Entrypoints file does not exist: ${entrypointsFile}`);
  }
}

const outdir = path.dirname(outfile);
const genRoot = path.resolve(rootGenDir);
const root = path.resolve(rootDir);

let externalFiles;
if (!bundleAll && entrypointsFile) {
  const content = fs.readFileSync(entrypointsFile, 'utf-8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array of entrypoints in ${entrypointsFile}`);
  }
  externalFiles = new Set(parsed);
}

const plugin = {
  name: 'devtools-plugin',
  setup(build) {
    if (cssStyleSheet) {
      build.onLoad({filter: /\.css$/}, async args => {
        const css = await fs.promises.readFile(args.path, 'utf8');
        return {
          contents:
              `const style = new CSSStyleSheet();\nstyle.replaceSync(${JSON.stringify(css)});\nexport default style;\n`,
          loader: 'js',
        };
      });
    }

    // https://esbuild.github.io/plugins/#on-resolve
    build.onResolve({filter: /.*/}, esbuildPlugin(outdir, genRoot, root, externalFiles, bundleAll));
  },
};

try {
  const result = await esbuild.build({
    entryPoints,
    outfile,
    bundle: true,
    format,
    globalName,
    platform: 'browser',
    plugins: [plugin],
    sourcemap,
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

  if (maxSize !== undefined) {
    const stats = await fs.promises.stat(outfile);
    if (stats.size >= maxSize) {
      throw new Error(
          `Generated file ${outfile} should not exceed max_size of ${maxSize} bytes. Current size: ${stats.size}`);
    }
  }
} catch (err) {
  console.error('Failed to run esbuild:', err);
  console.error(
      '\nIf error includes `Host version "X" does not match binary version "Y", you need to run `gclient sync`',
  );
  process.exit(1);
}

process.exit(0);
