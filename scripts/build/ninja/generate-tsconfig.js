// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');

const [, , tsconfigLocation, entrypointName, originalFileLocation, ...dependencies] = process.argv;

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
    return {
      path: `./${dep.substring(1)}-tsconfig.json`,
    };
  }),
};

fs.writeFileSync(tsconfigLocation, JSON.stringify(generatedTSConfig));

const outputDirectory = path.dirname(tsconfigLocation);
const rawFileName = path.basename(entrypointName, path.extname(entrypointName));
const inputLocation = path.join(outputDirectory, `${rawFileName}.prebundle.d.ts`);
const outputLocation = path.join(outputDirectory, `${rawFileName}.d.ts`);

fs.copyFileSync(inputLocation, outputLocation);
