// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';

import {main} from './cli';

const regenerateBridge = (pathToBridge: string) => {
  const sourceFile = pathToBridge.replace('_bridge.js', '.ts');

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Could not find source file ${sourceFile}`);
  }

  main([sourceFile, ...process.argv.slice(2)]);
};

const excludedDirectories = new Set([path.resolve(path.join(process.cwd(), 'front_end', 'third_party'))]);

const searchForBridgeFiles = (directory: string, foundFiles: string[] = []) => {
  if (excludedDirectories.has(directory)) {
    return foundFiles;
  }

  const directoryContents = fs.readdirSync(directory);
  directoryContents.forEach(fileOrDir => {
    const fullPath = path.resolve(path.join(directory, fileOrDir));
    if (fs.statSync(fullPath).isDirectory()) {
      searchForBridgeFiles(fullPath, foundFiles);
    } else if (fullPath.endsWith('_bridge.js')) {
      foundFiles.push(fullPath);
    }
  });
  return foundFiles;
};

const rootDir = path.resolve(path.join(process.cwd(), 'front_end'));
const allBridgeFiles = searchForBridgeFiles(rootDir);

allBridgeFiles.forEach(filePath => regenerateBridge(filePath));
