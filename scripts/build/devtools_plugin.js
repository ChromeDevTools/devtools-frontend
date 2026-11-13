// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import fs from 'node:fs';
import path from 'node:path';

/**
 * `path.dirname` does not include trailing slashes. If we would always
 * use `path.dirname` and then later perform comparisons on the paths that
 * it returns, we could run into false positives. For example, given the
 * the following two paths:
 *
 *     front_end/timeline_model/TimelineModel.js
 *     front_end/timeline/Timeline.js
 *
 * And that would have the following values for `path.dirname`:
 *
 *     front_end/timeline_model
 *     front_end/timeline
 *
 * If we would do a simple `.startswith` on the `path.dirname` of both of
 * these paths, then the first path would start with the dirname of the
 * second. However, they *are* part of different folders. To fix that problem,
 * we need to force a path separator after each folder. That makes sure we
 * and up with the following comparison of path dirnames:
 *
 *     front_end/timeline_model/
 *     front_end/timeline/
 *
 * Now, the first path does *not* start with the second one, as expected.
 *
 * @param file
 * @returns
 */
export function dirnameWithSeparator(file) {
  return path.dirname(file) + path.sep;
}

export function devtoolsPlugin(source, importer, externalFiles, root, genRoot, bundleAll = false) {
  if (!importer) {
    return null;
  }

  if (!bundleAll && (!externalFiles || !(externalFiles instanceof Set))) {
    throw new Error('devtoolsPlugin requires an externalFiles Set');
  }
  if (!root || typeof root !== 'string') {
    throw new Error('devtoolsPlugin requires a root path');
  }
  if (!genRoot || typeof genRoot !== 'string') {
    throw new Error('devtoolsPlugin requires a genRoot path');
  }

  if (source === '../../lib/codemirror') {
    // CodeMirror's runmode-standalone.mjs has a require() for this path in a
    // CommonJS (UMD) branch that never runs in an ES module, and the path does
    // not name a file. esbuild does not ignore require(...), so it is kept
    // external in every mode, bundleAll included: otherwise the build fails
    // with "Cannot read file".
    return {
      id: source,
      external: true,
    };
  }
  if (!source.startsWith('.')) {
    // Without bundleAll every bare specifier stays external. With it, esbuild
    // resolves them.
    return bundleAll ? null : {id: source, external: true};
  }

  const importedFilelocation = path.normalize(
      path.join(path.dirname(importer), source),
  );

  let rel = importedFilelocation;
  if (path.isAbsolute(importedFilelocation)) {
    if (importedFilelocation === genRoot || importedFilelocation.startsWith(genRoot + path.sep)) {
      rel = path.relative(genRoot, importedFilelocation);
    } else if (importedFilelocation === root || importedFilelocation.startsWith(root + path.sep)) {
      rel = path.relative(root, importedFilelocation);
    }
  }
  let normalizedRel = rel.replaceAll('\\', '/');
  const frontEndIndex = normalizedRel.indexOf('front_end/');
  if (frontEndIndex !== -1) {
    normalizedRel = normalizedRel.slice(frontEndIndex);
  }
  const isExternal = bundleAll ? false : Boolean(externalFiles && externalFiles.has(normalizedRel));
  return {
    id: importedFilelocation,
    external: isExternal,
  };
}

/**
 * Resolves `dir` to an absolute path, following symlinks if it exists.
 * @param {string} dir
 */
function realpathIfExists(dir) {
  const resolved = path.resolve(dir);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

/**
 * Returns the gen and source roots as absolute paths, both as given and with
 * symlinks resolved.
 * @param {string} genRoot
 * @param {string} rootDir
 */
function treeBases(genRoot, rootDir) {
  // The gen root usually lives below the source root, so check it first.
  return [
    ...new Set([
      realpathIfExists(genRoot),
      path.resolve(genRoot),
      realpathIfExists(rootDir),
      path.resolve(rootDir),
    ]),
  ];
}

/**
 * Creates a check for whether an importer is inside a `node_modules`
 * directory. Only the part of the path below the gen or source root is
 * checked, so a checkout that itself lives in a `node_modules` directory (e.g.
 * the chrome-devtools-frontend npm package) is not treated as an npm package.
 *
 * esbuild passes importers with symlinks resolved, so the roots are compared
 * both as given and with symlinks resolved (e.g. `/var` -> `/private/var` on
 * macOS, or a symlinked checkout).
 *
 * @param {string} genRoot
 * @param {string} rootDir
 * @returns {(importer: string) => boolean}
 */
export function createNodeModulesCheck(genRoot, rootDir) {
  if (!genRoot || typeof genRoot !== 'string') {
    throw new Error('createNodeModulesCheck requires a genRoot path');
  }
  if (!rootDir || typeof rootDir !== 'string') {
    throw new Error('createNodeModulesCheck requires a rootDir path');
  }
  const bases = treeBases(genRoot, rootDir);

  return importer => {
    // The bases use native separators (path.resolve), so normalize `importer`
    // too, e.g. forward slashes on Windows.
    const importerPath = path.normalize(importer);
    for (const base of bases) {
      if (importerPath.startsWith(base + path.sep)) {
        return path.relative(base, importerPath).split(path.sep).includes('node_modules');
      }
    }
    return importerPath.split(path.sep).includes('node_modules');
  };
}

/**
 * Returns the specifier to emit for an import of the external `file`: the path
 * from `outdir` to the location of `file` in the gen directory. All arguments
 * are absolute paths.
 *
 * @param {string} file
 * @param {string} outdir
 * @param {string} genRoot
 * @param {string} root
 */
function externalImportPath(file, outdir, genRoot, root) {
  const isUnderGenRoot = file === genRoot || file.startsWith(genRoot + path.sep);
  const targetInGen = isUnderGenRoot ? file : path.join(genRoot, path.relative(root, file));
  let rel = path.relative(outdir, targetInGen);
  if (!/^\.\.?($|\/|\\)/.test(rel)) {
    rel = './' + rel;
  }
  return rel.replaceAll('\\', '/');
}

/**
 * Creates an esbuild `onResolve` callback that keeps the files listed in
 * `externals` out of the bundle.
 *
 * Each entry is a relative path (`./` or `../`) to a file, resolved against
 * `entryDir`, the directory of the bundle entrypoint. An import is external
 * when it resolves to that same file, however the importer spells it and
 * wherever the importer is, npm packages included. An identical specifier that
 * resolves to another file is not affected. The entry has to name the file
 * exactly as the import does (e.g. with its `.js` extension); no extensions or
 * index files are tried.
 *
 * The source and gen directories are treated as one tree, as `esbuildPlugin`
 * does: an entry also matches the import of the file at the same path in the
 * other directory.
 *
 * The import is emitted as the path from `outdir` to the file's location in
 * the gen directory, like the externals of `esbuildPlugin`. It only loads at
 * runtime if the file exists there relative to the bundle; providing it (e.g.
 * through `deps` or `data`) is up to the caller. Nothing puts `node_modules`
 * there, so an external inside an npm package is only suitable for a dynamic
 * `import()` that is never called or a `require()` in a dead branch. A static
 * `import` is resolved when Node loads the bundle, and fails with
 * `ERR_MODULE_NOT_FOUND` at startup even if nothing uses the module.
 *
 * The returned callback has an `unmatched()` method that lists the entries no
 * import has resolved to so far.
 *
 * @param {string[]} externals
 * @param {string} entryDir
 * @param {string} outdir
 * @param {string} genRoot
 * @param {string} rootDir
 * @returns {((args: {path: string, resolveDir?: string, kind?: string}) => {path: string, external: true}|null) &
 *     {unmatched: () => string[]}}
 */
export function createRelativeExternalsResolver(externals, entryDir, outdir, genRoot, rootDir) {
  if (!entryDir || typeof entryDir !== 'string') {
    throw new Error('createRelativeExternalsResolver requires an entryDir path');
  }
  if (!outdir || typeof outdir !== 'string') {
    throw new Error('createRelativeExternalsResolver requires an outdir path');
  }
  if (!genRoot || typeof genRoot !== 'string') {
    throw new Error('createRelativeExternalsResolver requires a genRoot path');
  }
  if (!rootDir || typeof rootDir !== 'string') {
    throw new Error('createRelativeExternalsResolver requires a rootDir path');
  }

  const normGenRoot = path.resolve(genRoot);
  const root = path.resolve(rootDir);
  const normOutdir = path.resolve(outdir);

  const bases = treeBases(genRoot, rootDir);
  /**
   * Returns the path of `file` below the gen or source root, so that both
   * directories give the same key, or `file` itself if it is outside of them.
   * @param {string} file
   */
  const treeKey = file => {
    for (const base of bases) {
      if (file.startsWith(base + path.sep)) {
        return path.relative(base, file);
      }
    }
    return file;
  };

  // Maps the key of each external file to its entry and the specifier to emit.
  /** @type {Map<string, {external: string, importPath: string}>} */
  const externalFiles = new Map();
  const unmatched = new Set(externals);
  for (const external of externals) {
    if (!/^\.\.?\//.test(external)) {
      throw new Error(`Relative externals must start with './' or '../', got: '${external}'`);
    }
    const file = path.resolve(entryDir, external);
    const entry = {external, importPath: externalImportPath(file, normOutdir, normGenRoot, root)};
    // esbuild passes directories with symlinks resolved. The file itself may
    // not exist (e.g. a `.js` import of a `.ts` source), so only its directory
    // is resolved.
    const realFile = path.join(realpathIfExists(path.dirname(file)), path.basename(file));
    for (const key of [treeKey(file), treeKey(realFile)]) {
      const existing = externalFiles.get(key);
      if (existing && existing.external !== external) {
        // Only one of the two would ever be reported as matched.
        throw new Error(`Relative externals '${existing.external}' and '${external}' name the same file`);
      }
      externalFiles.set(key, entry);
    }
  }

  /** @param {{path: string, resolveDir?: string, kind?: string}} args */
  const resolve = args => {
    // The specifier check repeats the `onResolve` filter in esbuild.js. It is
    // kept for callers that invoke the resolver directly (e.g. the tests).
    if (args.kind === 'entry-point' || !args.resolveDir || !/^\.\.?[\/\\]/.test(args.path)) {
      return null;
    }
    const entry = externalFiles.get(treeKey(path.resolve(args.resolveDir, args.path)));
    if (!entry) {
      return null;
    }
    unmatched.delete(entry.external);
    return {path: entry.importPath, external: /** @type {const} */ (true)};
  };
  resolve.unmatched = () => [...unmatched];
  return resolve;
}

export function esbuildPlugin(outdir, genRoot, rootDir, externalFiles, bundleAll = false) {
  if (!bundleAll && (!externalFiles || !(externalFiles instanceof Set))) {
    throw new Error('esbuildPlugin requires an externalFiles Set');
  }
  if (!outdir || typeof outdir !== 'string') {
    throw new Error('esbuildPlugin requires an outdir path');
  }
  if (!genRoot || typeof genRoot !== 'string') {
    throw new Error('esbuildPlugin requires a genRoot path');
  }
  if (!rootDir || typeof rootDir !== 'string') {
    throw new Error('esbuildPlugin requires a rootDir path');
  }

  const normGenRoot = path.resolve(genRoot);
  const root = path.resolve(rootDir);
  const normOutdir = path.resolve(outdir);

  return args => {
    // args.importer is absolute path in esbuild.
    const res = devtoolsPlugin(args.path, args.importer, externalFiles, root, normGenRoot, bundleAll);
    if (!res) {
      return null;
    }

    const isUnderGenRoot =
        path.isAbsolute(res.id) && (res.id === normGenRoot || res.id.startsWith(normGenRoot + path.sep));

    if (res.external) {
      // res.id can be both of absolutized local JavaScript path or node's
      // builtin module (e.g. 'fs', 'path'), and only relativize the path in
      // former case.
      if (path.isAbsolute(res.id)) {
        res.id = externalImportPath(res.id, normOutdir, normGenRoot, root);
      }

      return {
        external: res.external,
        path: res.id,
      };
    }

    // For non-external imports to inline:
    // 1. If exact JS file exists in source tree:
    if (fs.existsSync(res.id)) {
      return {
        path: res.id,
      };
    }

    // 2. If TS file exists in source tree:
    if (res.id.endsWith('.js')) {
      const tsLocation = res.id.slice(0, -3) + '.ts';
      if (fs.existsSync(tsLocation)) {
        return {
          path: tsLocation,
        };
      }
    }

    // 3. If file exists in gen directory: a generated TS source (see
    //    scripts/build/ninja/generated_ts.gni) takes precedence over the JS
    //    that tsc emits for it, which bundling does not wait for; otherwise
    //    the file itself (e.g. .css.js or generated JS):
    if (!isUnderGenRoot) {
      const relFromRoot = path.relative(root, res.id);
      const genLocation = path.join(normGenRoot, relFromRoot);
      if (genLocation.endsWith('.js')) {
        const genTsLocation = genLocation.slice(0, -3) + '.ts';
        if (fs.existsSync(genTsLocation)) {
          return {
            path: genTsLocation,
          };
        }
      }
      if (fs.existsSync(genLocation)) {
        return {
          path: genLocation,
        };
      }
    }

    return {
      path: res.id,
    };
  };
}

/**
 * Formats a Ninja depfile mapping `outfile` to the inputs recorded in an
 * esbuild metafile, with forward-slash paths relative to `cwd`.
 *
 * @param {string} outfile
 * @param {Record<string, unknown>} metafileInputs
 * @param {string} cwd
 */
export function formatDepfile(outfile, metafileInputs, cwd) {
  const escapeDepfilePath = /** @param {string} file */ file => file.replaceAll('\\', '/').replaceAll(' ', '\\ ');
  const inputs = Object.keys(metafileInputs).map(inputFile => {
    const absPath = path.isAbsolute(inputFile) ? inputFile : path.resolve(cwd, inputFile);
    return escapeDepfilePath(path.relative(cwd, absPath));
  });
  return `${escapeDepfilePath(outfile)}: ${inputs.join(' ')}\n`;
}
