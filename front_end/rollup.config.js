// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

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
 * @param {string} file
 * @return {string}
 */
function dirnameWithSeparator(file) {
  return path.dirname(file) + path.sep;
}

// eslint-disable-next-line import/no-default-export
export default {
  treeshake: false,
  context: 'self',
  output: {
    format: 'esm',
  },
  plugins:
      [
        (() => {
          return {
            name: 'devtools-plugin',
            buildStart(options) {
              let inputFile = options.input;
              if (Array.isArray(inputFile)) {
                if (inputFile.length !== 1) {
                  throw new Error(`Invalid multiple inputs: ${JSON.stringify(inputFile)}`);
                }
                inputFile = inputFile[0];
              } else {
                throw new Error(`Invalid input file type specified: ${JSON.stringify(options.input)}`);
              }
            },
            /**
             * @param {string} source
             * @param {string} importer
             */
            resolveId(source, importer) {
              if (!importer) {
                return null;
              }
              const currentDirectory = path.normalize(dirnameWithSeparator(importer));
              const importedFilelocation = path.normalize(path.join(currentDirectory, source));
              const importedFileDirectory = dirnameWithSeparator(importedFilelocation);

              // Generated files are part of other directories, as they are only imported once
              if (path.basename(importedFileDirectory) === 'generated') {
                return null;
              }

              // An import is considered external (and therefore a separate
              // bundle) if its filename matches its immediate parent's folder
              // name (without the extension). For example:
              // import * as Components from './components/components.js' = external
              // import * as UI from '../ui/ui.js' = external
              // import * as LitHtml from '../third_party/lit-html/lit-html.js' = external
              // import {DataGrid} from './components/DataGrid.js' = not external
              // import * as Components from './components/foo.js' = not external

              // We currently still have to import third_party packages and put them in separate
              // folders with the `module.json` files.
              //
              // Note that we can't do a simple check for only `third_party`, as in Chromium
              // our full path is `third_party/devtools-frontend/src/`, which thus *always*
              // includes third_party. It also not possible to use the current directory
              // as a check for the import, as the import will be different in Chromium and
              // would therefore not match the path of `__dirname`.
              // These should be removed because the new heuristic _should_ deal with these
              // e.g. it'll pick up third_party/lit-html/lit-html.js is its own entrypoint


              // Our heuristic for deciding if an import is external (and
              // therefore a separate bundle) works for most third_party
              // imports; e.g. it correctly detects that
              // 'third_party/lit-html/lit-html.js' is its own bundle. However
              // due to the structure of Acorn and the fact that it's many files
              // that augment the Acorn module, we can't apply the same logic to
              // any Acorn files, so we special case Acorn here to make sure
              // that we treat acorn.js correctly.
              if (importedFileDirectory.includes(path.join('front_end', 'third_party', 'acorn')) &&
                  // Note that we have to include the path.sep for `acorn`, as there are multiple packages
                  // in `third_party` that start with `acorn-`
                  !importedFileDirectory.includes(
                      dirnameWithSeparator(path.join('front_end', 'third_party', 'acorn', 'acorn.js')))) {
                return null;
              }

              // Puppeteer has dynamic imports in its build gated on an ifNode
              // flag, but our Rollup config doesn't know about that and tries
              // to parse dynamic import('fs'). Let's ignore Puppeteer for now.
              // The long term plan is probably for Puppeteer to ship a web
              // bundle anyway. See go/pptr-agnostify for details.
              if (importedFileDirectory.includes(path.join('front_end', 'third_party', 'puppeteer'))) {
                return null;
              }

              // The CodeMirror addons look like bundles (addon/comment/comment.js) but are not.
              if (importedFileDirectory.includes(path.join('front_end', 'third_party', 'codemirror', 'package'))) {
                return null;
              }

              const importedFileName = path.basename(importedFilelocation, '.js');
              const importedFileParentDirectory = path.basename(path.dirname(importedFilelocation));
              const isExternal = importedFileName === importedFileParentDirectory;

              return {
                id: importedFilelocation,
                external: isExternal,
              };
            }
          };
        })(),
      ]
};
