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

export function devtoolsPlugin(source, importer, externalFiles, root, genRoot) {
  if (!importer) {
    return null;
  }

  if (!externalFiles || !(externalFiles instanceof Set)) {
    throw new Error('devtoolsPlugin requires an externalFiles Set');
  }
  if (!root || typeof root !== 'string') {
    throw new Error('devtoolsPlugin requires a root path');
  }
  if (!genRoot || typeof genRoot !== 'string') {
    throw new Error('devtoolsPlugin requires a genRoot path');
  }

  if (source === '../../lib/codemirror' || !source.startsWith('.')) {
    // These are imported via require(...), but we don't use
    // @rollup/plugin-commonjs. So this check is not necessary for rollup. But
    // need to have this for esbuild as it doesn't ignore require(...).
    return {
      id: source,
      external: true,
    };
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
  const isExternal = externalFiles.has(normalizedRel);
  return {
    id: importedFilelocation,
    external: isExternal,
  };
}

export function esbuildPlugin(outdir, genRoot, rootDir, externalFiles) {
  if (!externalFiles || !(externalFiles instanceof Set)) {
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
    const res = devtoolsPlugin(args.path, args.importer, externalFiles, root, normGenRoot);
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
        const targetInGen = isUnderGenRoot ? res.id : path.join(normGenRoot, path.relative(root, res.id));
        let rel = path.relative(normOutdir, targetInGen);
        if (!/^\.\.?($|\/|\\)/.test(rel)) {
          rel = './' + rel;
        }
        res.id = rel.replaceAll('\\', '/');
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

    // 3. If file exists in gen directory (e.g. .css.js or generated JS):
    if (!isUnderGenRoot) {
      const relFromRoot = path.relative(root, res.id);
      const genLocation = path.join(normGenRoot, relFromRoot);
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
