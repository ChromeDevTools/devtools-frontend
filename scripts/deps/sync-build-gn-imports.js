// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This script takes a directory and will validate that all JavaScript
 * dependencies that are imported are also defined in BUILD.gn, and vice-versa.
 *
 * Usage: node scripts/deps/sync-build-gn-imports.js --directory=front_end/models/trace
 *
 * The script is non recursive.
 *
 * You can also execute the tests: `./node_modules/.bin/mocha scripts/deps/tests
 **/

const ts = require('typescript');
const path = require('path');
const fs = require('fs');

/**
 * Parses the inputs listed when they are all on one line, for example:
 * sources = ["foo.js"]
 * This function gets given '["foo.js"]' and should return an array of all the
 * files found.
 *
 * @param {string} line
 * @returns {Array<string>}
 **/
function parseSingleLineOfBuildGNFiles(line) {
  return line.split(',').map(item => item.replaceAll('"', '').trim()).filter(x => {
    return x.length > 0;
  });
}

/**
 * Returns a list of filenames for a given set of lines. This is called after
 * we've found a line such as `sources = [`, and then we walk through each
 * subsequent line until we find a closing `]`.
 * We return an array of all the files we found, and the index of the end of
 * this set of files, so we can continue parsing the rest of the input.
 *
 * @param {Array<string>} lines
 * @param {number} startIndex
 *
 * @returns {{data: Array<string>, nextIndex: number}}
 *
 **/
function parseMultipleLineOfBuildGNFiles(lines, startIndex) {
  const data = [];
  let indexForSourcesLines = startIndex + 1;
  while (lines[indexForSourcesLines].trim() !== ']') {
    // Replace the double quotes that wrap the filename, and the trailing comma on each line.
    const currentLine = lines[indexForSourcesLines].replaceAll(/"|,/g, '').trim();
    // A `#` symbol is a comment in GN, so we ignore those lines.
    if (!currentLine.startsWith('#')) {
      data.push(currentLine);
    }
    indexForSourcesLines++;
  }
  i = indexForSourcesLines;
  return {data, nextIndex: indexForSourcesLines};
}

/**
 * @typedef {Object} GNSection
 * @property {Array<string>} sources
 * @property {Array<string>} deps
 * @property {string} moduleName
 * @property {string} template
 */

/**
 * Parses an entire section of a BUILD.GN file, where a section is defined as a
 * template call and everything contained within: devtools_module("handlers")
 * {...} The section that is passed in is modified in place with the detected
 * `sources` and `deps`.
 *
 * @param {GNSection} section
 * @param {Array<string>} lines
 * @param {number} startIndex
 *
 * @returns {number} the index of the next line of input to parse future sections from
 */
function parseBuildGNSection(section, lines, startIndex) {
  let i = startIndex + 1;
  section.deps = [];
  section.sources = [];

  for (; i < lines.length; i++) {
    const line = lines[i];

    const sourcesSingleLine = /sources = \[(.*)\]/.exec(line);
    const depsSingleLine = /deps = \[(.*)\]/.exec(line);
    const entrypointSingleLine = /entrypoint = "(.+)"/.exec(line);

    if (entrypointSingleLine) {
      // If we get a section with `entrypoint = "foo"`, treat that the same as
      // `sources = ["foo"]`.
      const source = entrypointSingleLine[1];
      section.sources = [source];
    } else if (sourcesSingleLine) {
      section.sources = parseSingleLineOfBuildGNFiles(sourcesSingleLine[1]);
    } else if (depsSingleLine) {
      section.deps = parseSingleLineOfBuildGNFiles(depsSingleLine[1]);
    } else if (line.trim() === 'sources = [') {
      const {data, nextIndex} = parseMultipleLineOfBuildGNFiles(lines, i);
      section.sources = data;
      i = nextIndex;
    } else if (line.trim() === 'deps = [') {
      const {data, nextIndex} = parseMultipleLineOfBuildGNFiles(lines, i);
      section.deps = data;
      i = nextIndex;
    } else if (line.trim() === '}') {
      // Once we are in a section, we know if we hit a closing brace that this section is finished.
      return i;
    }
  }

  // It's valid for a module to not have deps or sources.
  return i;
}

/**
 * Takes the raw contents of a BUILD.GN file and parses it into a set of modules.
 * Note: we could have chosen to build a full parser here, but we're taking
 * advantage of that fact that clang-format ensures our BUILD.gn files are
 * indented and structured consistently. Therefore a few regexes is all we need
 * to pull out the relevant information.
 * @param {string} input
 * @returns {Array<GNSection>} modules
 */
function parseBuildGN(input) {
  const lines = input.split('\n');
  const modules = [];
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Matches any lines containing devtools_*("name") {
    // There are other modules that we have and may need to care about in the
    // future, but this is enough to ensure our JS imports are in sync with the
    // BUILD.gn.
    const isOpeningLine = /(devtools_\w+)\("(\w+)"\) \{/.exec(line);
    if (isOpeningLine) {
      // The first group is the template (devtools_X) and the second is the name.
      const [, template, moduleName] = isOpeningLine;
      currentSection = {template, moduleName};
      i = parseBuildGNSection(currentSection, lines, i);
      modules.push(currentSection);
    }
  }
  return modules;
}

/**
 * @typedef  {Object} SourceFile
 * @property {string} fileName
 * @property {Array<string>} imports
 */

/**
 * Takes in a TypeScript source file and extracts a list of imports from the file.
 * For a file with this code:
 *  => import * from './foo.js';
 *  => import * from './bar.js';
 *  We will return `['./foo.js', './bar.js']`
 *
 * @param {string} code
 * @param {string} fileName
 *
 * @returns {SourceFile}
 */
function parseSourceFileForImports(code, fileName) {
  const file = ts.createSourceFile(fileName, code);

  const foundImportPaths = [];
  function walkNode(node) {
    if (ts.isImportDeclaration(node)) {
      foundImportPaths.push(node.moduleSpecifier.text);
    }
    node.forEachChild(child => {
      walkNode(child);
    });
  }

  walkNode(file);
  return {filePath: fileName, imports: foundImportPaths};
}

/**
 * @typedef {Object} ComparisonResult
 * @property {Array<string>} inBoth
 * @property {Array<string>} inOnlyBuildGN
 * @property {Array<string>} inOnlySourceCode
 * @property {Array<string>} missingBuildGNSources
 **/

/**
 * Takes the result of parsing a BUILD.gn file along with the result of parsing
 * a source file and returns information about the dependencies.
 * @param {{buildGN: Array<GNSection>, sourceCode: SourceFile}} data
 * @returns {ComparisonResult}
 */
function compareDeps({buildGN, sourceCode}) {
  const sourceImportsWithFileNameRemoved =
      sourceCode.imports
          .map(importPath => {
            // If a file imports `../core/sdk/sdk.js`, in the BUILD.gn that is
            // listed as `../core/sdk:bundle`. In BUILD.gn DEPS you never depend on the
            // specific file, but the directory that file is in. Therefore we drop the
            // filename from the import.
            return path.dirname(importPath);
          })
          .filter(dirName => {
            // This caters for the case where the import is `import X from './Foo.js'`.
            // Any sibling import doesn't need to be a DEP in BUILD.GN as they are in
            // the same module, but we will check later that it's in the sources entry.
            return dirName !== '.';
          })
          .map(importPath => {
            // If we now have './helpers' we want to replace that with just
            // 'helpers'. We do this because in the BUILD.gn file the dep will be
            // listed as something like "helpers:bundle", so the starting "./" will
            // break comparisons if we keep it around.
            if (importPath.startsWith('./')) {
              return importPath.slice(2);
            }
            return importPath;
          });

  // Now we have to find the BUILD.gn module that contains this source file
  // We check each section of the BUILD.gn and look for this file in the `sources` list.
  // Because the source file and the BUILD.gn are in the same directory, we
  // only compare the source file name and do not have to worry about the
  // directory path.
  let buildGNModule = buildGN.find(buildModule => {
    const sourceFileName = path.basename(sourceCode.filePath);
    return buildModule.sources?.includes(sourceFileName);
  });

  if (!buildGNModule) {
    throw new Error(`Could not find module in BUILD.gn for ${sourceCode.filePath}`);
  }

  // Special case: if we are linting an entrypoint, we have to find the
  // `devtools_module` that the entrypoint depends on. This is because of how
  // we structure our BUILD.gn files, the devtools_entrypoint never lists all
  // the dependencies, but instead depends on the `devtools_module`, which does
  // list all the dependencies.
  if (buildGNModule.template === 'devtools_entrypoint') {
    // We are going to use the dependencies from the relevant devtools_module
    // find the `deps = [':foo']` line, and return 'foo'
    const moduleDep = buildGNModule.deps[0].slice(1);
    buildGNModule = buildGN.find(buildModule => buildModule.moduleName === moduleDep);
  }

  if (!buildGNModule) {
    throw new Error(`Could not find devtools_module in BUILD.gn for the devtools_entrypoint of ${sourceCode.filePath}`);
  }

  const buildGNDepsWithTargetRemoved = buildGNModule.deps.map(dep => {
    // GN deps are listed as "../path/to/directory:target" and we only care about the path part.
    return dep.split(':')[0];
  });

  const gnDeps = new Set(buildGNDepsWithTargetRemoved);
  const sourceDeps = new Set(sourceImportsWithFileNameRemoved);

  /** @type {Array<string>} */
  const inBoth = [];
  /** @type {Array<string>} */
  const inOnlyBuildGN = [];
  /** @type {Array<string>} */
  const inOnlySourceCode = [];

  for (const dep of gnDeps) {
    if (sourceDeps.has(dep)) {
      inBoth.push(dep);
    } else {
      inOnlyBuildGN.push(dep);
    }
  }

  for (const dep of sourceDeps) {
    if (gnDeps.has(dep) === false) {
      inOnlySourceCode.push(dep);
    }
  }

  /** @type {Array<string>} */
  const missingBuildGNSources = [];
  // Find sibling imports, which are imports of files in the same directory
  // (and not including sub-directories) as the current file.
  // 1) import * from './foo.js' <== sibling import
  // 2) import * from './foo/foo.js' <== NOT a sibling import
  // 3) import * from '../core/foo/foo.js' <== NOT a sibling import
  // We ensure for each sibling import that it is listed in the `sources` part of the BUILD.gn
  const siblingImports = sourceCode.imports.filter(importPath => {
    return importPath.startsWith('./') && path.dirname(importPath) === '.';
  });
  for (const sibling of siblingImports) {
    const expectedSourceInBuildGN = path.basename(sibling).replace('.js', '.ts');
    if (!buildGNModule.sources.includes(expectedSourceInBuildGN)) {
      missingBuildGNSources.push(expectedSourceInBuildGN);
    }
  }

  return {
    inBoth,
    inOnlyBuildGN,
    inOnlySourceCode,
    missingBuildGNSources,
  };
}

/**
 * @typedef {Object} ValidateDirectoryResult
 * @property {Array<{importPath: string, sourceFile:string}>} missingBuildGNDeps
 * @property {Set<string>} unusedBuildGNDeps
 */

/**
 * Takes a path to a directory and validates that directory by checking each source code file that it finds against the BUILD.gn.
 * Note: this function does not recurse into sub-directories.
 * @param {string} dirPath
 * @returns {ValidateDirectoryResult}
 */
function validateDirectory(dirPath) {
  const buildGNPath = path.join(dirPath, 'BUILD.gn');
  const buildGNContents = fs.readFileSync(buildGNPath, 'utf8');
  const parsedBuildGN = parseBuildGN(buildGNContents);

  const directoryChildren = fs.readdirSync(dirPath);
  const sourceFiles = directoryChildren.filter(child => {
    const isFile = fs.lstatSync(path.join(dirPath, child)).isFile();
    // TODO: longer term we may want to support .css files here too.
    return (isFile && path.extname(child) === '.ts');
  });

  /** @type {ValidateDirectoryResult} */
  const result = {
    missingBuildGNDeps: [],
    // We assume that all BUILD.GN deps are unused, and as we find them in
    // source code files we remove them from this set.
    unusedBuildGNDeps: new Set(parsedBuildGN.flatMap(mod => {
      // We don't worry about any deps that start with a colon, we are only
      // interested in DEPS that are actual files.
      return mod.deps.filter(dep => !dep.startsWith(':')).map(dep => {
        // Drop the :bundle part from a dep, otherwise we can't compare it
        // against the import statements from the source code.
        const withoutBundle = dep.split(':')[0];
        return withoutBundle;
      });
    }))
  };

  for (const sourceFile of sourceFiles) {
    const sourceCode = fs.readFileSync(path.join(dirPath, sourceFile), 'utf8');
    const parsedSource = parseSourceFileForImports(sourceCode, sourceFile);
    const diffWithGN = compareDeps({buildGN: parsedBuildGN, sourceCode: parsedSource});
    if (!diffWithGN) {
      continue;
    }

    for (const dep of diffWithGN.inBoth) {
      result.unusedBuildGNDeps.delete(dep);
    }

    for (const missingDep of diffWithGN.inOnlySourceCode) {
      result.missingBuildGNDeps.push({importPath: missingDep, sourceFile});
    }
  }
  return result;
}

module.exports = {
  parseBuildGN,
  parseSourceFileForImports,
  compareDeps,
  validateDirectory
};

if (require.main === module) {
  const yargs = require('yargs')
                    .option('directory', {type: 'string', desc: 'The directory to validate', demandOption: true})
                    .strict()
                    .argv;

  const directory = path.join(process.cwd(), yargs.directory);
  const result = validateDirectory(directory);
  const success = result.missingBuildGNDeps.length === 0 && result.unusedBuildGNDeps.size === 0;
  if (success) {
    process.exit(0);
  }
  if (result.missingBuildGNDeps.length > 0) {
    const missingDeps = {};
    for (const dep of result.missingBuildGNDeps) {
      if (missingDeps[dep.importPath]) {
        missingDeps[dep.importPath].push(dep.sourceFile);
      } else {
        missingDeps[dep.importPath] = [dep.sourceFile];
      }
    }

    for (const dep of Object.keys(missingDeps)) {
      const usedIn = missingDeps[dep];
      const MAX_USED_IN_FILES = 3;
      let usedInText = usedIn.slice(0, MAX_USED_IN_FILES).join(', ');
      if (usedIn.length > MAX_USED_IN_FILES) {
        usedInText += ` (and ${usedIn.length - MAX_USED_IN_FILES} other files)`;
      }
      console.error('\nFound missing DEP in BUILD.gn');
      console.error(`=> '${dep}'`);
      console.error(`=> used in ${usedInText}`);
    }
  }
  if (result.unusedBuildGNDeps.size > 0) {
    console.error('\nUnused BUILD.gn DEPs');
    for (const unused of result.unusedBuildGNDeps) {
      console.error(`=> '${unused}'`);
    }
  }
  // We early exit if the run is successful and finds no errors, so if we get
  // here we've logged errors and now it's time to exit with a non-zero code.
  process.exit(1);
}
