// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseArgs} from 'node:util';

import {devtoolsRootPath} from '../devtools_paths.js';

import {createNodeModulesCheck, createRelativeExternalsResolver, esbuildPlugin} from './devtools_plugin.js';

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
    platform: {
      type: 'string',
      default: 'browser',
    },
    external: {
      type: 'string',
      multiple: true,
      default: [],
    },
    'node-require-shim': {
      type: 'boolean',
      default: false,
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
  external,
  'node-require-shim': nodeRequireShim,
} = values;

const platform = /** @type {import('esbuild').Platform} */ (values.platform);

const format = /** @type {import('esbuild').Format} */ (values.format);

// CommonJS dependencies call require(), which ES modules on Node lack. Opt-in
// only: esbuild does not see banner bindings, so a bundled module that declares
// its own top-level `require` would clash with this one.
const nodeRequireShimBanner = {
  js: [
    'import {createRequire as __devtoolsCreateRequire} from \'node:module\';',
    'const require = __devtoolsCreateRequire(import.meta.url);',
  ].join('\n'),
};

const maxSize = values['max-size'] !== undefined ? Number(values['max-size']) : undefined;

if (!entrypoint || !outfile || !rootDir || !rootGenDir) {
  throw new Error(
      'Missing required arguments: --entrypoint, --outfile, --root-dir, and --root-gen-dir must be provided');
}
const entryPoints = [entrypoint];

// --external takes bare package specifiers, which esbuild keeps as written,
// and relative paths (`./` or `../`) to single files, which are resolved
// against the directory of the entrypoint (see
// createRelativeExternalsResolver). They have to name the file with its
// extension, as imports do: no extensions or index files are tried. Absolute
// paths would be emitted verbatim and `*` would turn on esbuild's wildcard
// matching, so both are rejected.
const isRelativeExternal = name => /^\.\.?\//.test(name);
for (const name of external) {
  if (!name || name.startsWith('/') || name.endsWith('/') || name.endsWith('/.') || name.endsWith('/..') ||
      name.includes('*') || path.isAbsolute(name) || (name.startsWith('.') && !isRelativeExternal(name)) ||
      (isRelativeExternal(name) && !path.posix.extname(name))) {
    throw new Error(
        `--external only supports bare package specifiers and relative paths to files ('./file.js' or '../file.js'), got: '${
            name}'`);
  }
}
const packageExternals = external.filter(name => !isRelativeExternal(name));
const relativeExternals = external.filter(isRelativeExternal);

// esbuild also supports `neutral`, but npm packages are only resolved for
// `node` (see createNodeModulesCheck), so anything else is rejected.
if (platform !== 'browser' && platform !== 'node') {
  throw new Error(`--platform must be 'browser' or 'node', got: '${platform}'`);
}

// Without --bundle-all, the DevTools resolver keeps every bare specifier
// external, so --external would silently do nothing and Node bundles would
// silently leave all npm packages unbundled.
if (!bundleAll) {
  if (external.length) {
    throw new Error('--external requires --bundle-all');
  }
  if (platform === 'node') {
    throw new Error('--platform=node requires --bundle-all');
  }
}

if (nodeRequireShim && (platform !== 'node' || format !== 'esm')) {
  throw new Error('--node-require-shim requires --platform=node and --format=esm');
}

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
    const devtoolsResolve = esbuildPlugin(outdir, genRoot, root, externalFiles, bundleAll);
    // Node bundles also contain npm packages, whose relative imports need
    // esbuild's own resolution (extensions, index files, package.json).
    // This is intentionally limited to platform=node: browser bundles keep the
    // pre-existing behavior of resolving everything through devtoolsResolve, so
    // browser bundles that pull in npm packages from node_modules are not
    // supported.
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    // Registered first, so that it also applies to imports inside npm
    // packages: a relative external names one file, wherever it is imported
    // from.
    if (relativeExternals.length) {
      const relativeExternalsResolve = createRelativeExternalsResolver(
          relativeExternals, path.dirname(path.resolve(entrypoint)), outdir, genRoot, root);
      build.onResolve({filter: /^\.\.?[\/\\]/}, relativeExternalsResolve);
      // An entry that matches nothing is a typo or a stale entry, and the file
      // it was meant for is in the bundle. A build that already failed may not
      // have reached the import, so it is not checked.
      build.onEnd(result => {
        const unmatched = relativeExternalsResolve.unmatched();
        if (result.errors.length || !unmatched.length) {
          return {};
        }
        return {
          errors: unmatched.map(name => ({
                                  pluginName: 'devtools-plugin',
                                  text: `--external=${name} does not match any import. It is resolved against the ` +
                                      'directory of the entrypoint.',
                                })),
        };
      });
    }
    build.onResolve({filter: /.*/},
                    args => platform === 'node' && isInNodeModules(args.importer) ? null : devtoolsResolve(args));
  },
};

try {
  const result = await esbuild.build({
    entryPoints,
    outfile,
    bundle: true,
    format,
    globalName,
    platform,
    // Bare package specifiers listed with --external stay as written in the
    // output. esbuild also applies this to subpaths (e.g. `pkg/sub.js`).
    // Relative externals are handled by the plugin.
    external: packageExternals,
    banner: nodeRequireShim ? nodeRequireShimBanner : undefined,
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
