// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');

const [, , tsconfigLocation, originalFileLocation, ...dependencies] = process.argv;

const originalFrontendMappedLocation =
    path.relative(path.dirname(tsconfigLocation), path.join(process.cwd(), originalFileLocation));

const generatedTSConfig = {
  compilerOptions: {
    composite: true,
    outDir: '.',
    baseUrl: '.',
    rootDir: path.dirname(originalFrontendMappedLocation),
  },
  files: [
    originalFrontendMappedLocation,
  ],
  references: dependencies.map(dep => {
    // Deps come in the form of :foo, ../some/path:foo or
    // ../some/path, which means we can split on the colon and
    // obtain the path and target parts. If there is no target
    // part it is assumed to be the same as the final dirname of
    // the path.

    // eslint-disable-next-line prefer-const
    let [pathPart, targetPart] = dep.split(':');
    if (pathPart === '') {
      pathPart = '.';
    }

    // A path of ../some/path means that we need to assume
    // ../some/path with a target of path.
    if (pathPart === dep) {
      targetPart = path.basename(dep);
    }

    return {
      path: `${pathPart}/${targetPart}-tsconfig.json`,
    };
  }),
};

fs.writeFileSync(tsconfigLocation, JSON.stringify(generatedTSConfig));
