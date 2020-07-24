// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Run like the following:
// $ node scripts/build/cross_reference_ninja_and_tsc.js [Target] [Path to bundle],
// e.g. node scripts/build/cross_reference_ninja_and_tsc.js Default front_end/common:bundle,

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const [, , buildDir, gnTarget] = process.argv;
const cwd = process.cwd();

/**
 * Execs a command.
 *
 * @param {string} cmd
 * @return {string}
 */
async function exec(cmd) {
  const env = process.env;

  return new Promise((resolve, reject) => {
    const [util, ...args] = cmd.split(' ');

    let response = '';
    const process = childProcess.spawn(util, args, {cwd, env});
    process.stdout.on('data', data => {
      response += data.toString();
    });

    process.on('close', () => {
      resolve(response);
    });

    process.on('error', err => {
      reject(err);
    });
  });
}

/**
 *
 * @param {string} buildDir
 * @param {string} gnTarget
 */
async function buildTargetInfo(buildDir, gnTarget) {
  /**
   * @param {string} outputList
   */
  const flattenOutput = outputList => {
    try {
      const outputFiles = JSON.parse(outputList);

      /**
       * @type string[]
       */
      return Object.values(outputFiles).reduce((prev, {outputs}) => {
        if (!outputs) {
          return prev;
        }

        prev.push(...outputs);
        return prev;
      }, []);
    } catch (e) {
      return [];
    }
  };

  // Grab the outputs of the build target itself.
  const output = await exec(`gn desc out/${buildDir} ${gnTarget} outputs --format=json`);
  if (output.startsWith('ERROR')) {
    console.error('GN error:');
    console.error(output);
    process.exit(1);
  }

  const gnTargetOutputFileList = flattenOutput(output);

  // The response from this is a new line-separated list of targets.
  const deps = await exec(`gn desc out/${buildDir} //${gnTarget} deps --all`);
  const depsOutputFileList = deps.split('\n').map(async line => {
    if (line.trim() === '') {
      return [];
    }

    const depOutputList = await exec(`gn desc out/${buildDir} ${line} outputs --format=json`);
    return flattenOutput(depOutputList);
  });

  const fileList = await Promise.all(depsOutputFileList);
  return [gnTargetOutputFileList, fileList]
      .flat(Infinity)
      // Only include those in gen.
      .filter(file => file.startsWith(`//out/${buildDir}/gen/`))
      // Strip the build dir out.
      .map(file => file.replace(`//out/${buildDir}/gen/`, ''));
}

(async function init() {
  // Go from foo:bundle to foo, on the basis that foo.ts / foo.js will be the entrypoint file.
  const assumedName = path.basename(gnTarget).replace(/:.*$/, '');
  const assumedDir = gnTarget.replace(/:.*$/, '');
  const entryPointTs = path.join(cwd, assumedDir, `${assumedName}.ts`);
  const entryPointJs = path.join(cwd, assumedDir, `${assumedName}.js`);
  let entryPoint = entryPointTs;

  if (!fs.existsSync(entryPoint)) {
    entryPoint = entryPointJs;
    if (!fs.existsSync(entryPoint)) {
      console.error(`Neither ${entryPointTs} nor ${entryPointJs} exists.`);
      process.exit(1);
    }
  }

  console.log(`Output Build Dir: ${buildDir}`);
  console.log(`GN Target: //${gnTarget}`);
  console.log(`TS/JS Entry Point: ${entryPoint}`);

  try {
    // Ask TypeScript to enumerate the files it knows about.
    const types = path.join(cwd, 'front_end/global_typings');
    const tscPath = path.join(cwd, 'node_modules', '.bin', 'tsc');
    const tscOut = await exec(`${tscPath} ${entryPoint} --types ${types}/resize_observer.d.ts --types ${
        types}/global_defs.d.ts --noEmit --listFiles --allowJs --target esnext`);

    // Filter the list and remap to those that are explicitly in the front_end, excluding the entrypoint itself.
    const frontEndFiles =
        tscOut.split('\n')
            .filter(line => line.includes('front_end') && line !== entryPoint && !line.includes('global_typings'))
            // Ensure we look for the original file, not the .d.ts.
            .map(line => line.replace(/\.d\.ts$/, ''))
            // Ensure that any file that ends in .ts is replaced as the equivalent outputted .js file.
            .map(line => line.replace(/\.ts$/, '.js'))
            // Trim the files so that the path starts with front_end
            .map(line => line.replace(/.*?front_end/, 'front_end'))
            // Finally remove any files where stripping the .d.ts has resulted in a file with no suffix.
            .filter(line => path.extname(line) !== '');

    // Ask gn/ninja to do the same.
    const gnFiles = await buildTargetInfo(buildDir, gnTarget);

    // Then cross reference.
    const missingFiles = [];
    for (const file of frontEndFiles) {
      if (!gnFiles.includes(file)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length) {
      console.error('TypeScript indicates it expects the following files:');
      console.error(missingFiles.map(file => ` - ${file}`).join('\n'));
      console.error(`There ${
          missingFiles.length === 1 ? 'is 1 file' :
                                      `are ${missingFiles.length} files`} not listed in the BUILD.gn as dependencies`);
      console.error('Have you added all dependencies to the BUILD.gn?');
      process.exit(1);
    } else {
      console.log('No mismatches found');
      process.exit(0);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
