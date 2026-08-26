// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import fs from 'node:fs';
import path from 'node:path';

const [, , tsconfigLocation, originalFileLocation, ...dependencies] = process.argv;

const originalFrontendMappedLocation = path.relative(
    path.dirname(tsconfigLocation),
    path.join(process.cwd(), originalFileLocation),
);

const generatedTSConfig = {
  compilerOptions: {
    composite: true,
    outDir: '.',
    baseUrl: '.',
    rootDir: path.dirname(originalFrontendMappedLocation),
  },
  files: [originalFrontendMappedLocation],
  references: dependencies.map(dep => {
    // Deps come in the form of :foo, ../some/path:foo or
    // ../some/path, which means we can split on the colon and
    // obtain the path and target parts. If there is no target
    // part it is assumed to be the same as the final dirname of
    // the path.

    let [pathPart, targetPart] = dep.split(':');
    if (pathPart === '') {
      pathPart = '.';
    }

    // A path of ../some/path means that we need to assume
    // ../some/path with a target of path.
    if (pathPart === dep) {
      targetPart = path.basename(dep);
    }

    const refPath = `${pathPart}/${targetPart}-tsconfig.ref.json`;
    const jsonPath = `${pathPart}/${targetPart}-tsconfig.json`;
    const absRefPath = path.resolve(path.dirname(tsconfigLocation), refPath);
    const absJsonPath = path.resolve(path.dirname(tsconfigLocation), jsonPath);
    const chosenPath = (fs.existsSync(absRefPath) || !fs.existsSync(absJsonPath)) ? refPath : jsonPath;

    return {
      path: chosenPath,
    };
  }),
};

const tsconfigRefLocation = tsconfigLocation.replace(/-tsconfig\.json$/, '-tsconfig.ref.json');

const generatedTSConfigRef = {
  compilerOptions: {
    composite: true,
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    rootDir: path.dirname(originalFrontendMappedLocation),
    outDir: '.',
    declarationDir: '.',
  },
  files: [originalFrontendMappedLocation],
  references: generatedTSConfig.references,
};

fs.writeFileSync(tsconfigLocation, JSON.stringify(generatedTSConfig));
fs.writeFileSync(tsconfigRefLocation, JSON.stringify(generatedTSConfigRef));
