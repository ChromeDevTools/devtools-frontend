// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {GnAstExtractor} from './extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from './extractors/typescript_analyzer.ts';
import {logger} from './utils/debug.ts';
import {updateBuildGnFiles} from './utils/gn_ast_updater.ts';

export async function checkDepsGn(
    rootDir: string,
    files: string[],
) {
  logger(`Phase 1: Extracting GN Targets from AST...`);
  const extractionResult = GnAstExtractor.create(rootDir);
  await extractionResult.extractTargetsFromAst(files);

  await Promise.all(
      files.map(async file => {
        const absPath = path.resolve(file);
        let isDirectory = false;
        try {
          const info = await fs.promises.stat(absPath);
          isDirectory = info.isDirectory();
          if (isDirectory) {
            return;
          }
        } catch {
          // Not a directory or does not exist
          return;
        }

        const fileTargets = await extractionResult.getTargetsForFile(absPath);
        if (!fileTargets || fileTargets.length === 0) {
          console.warn(
              `Warning: Could not find target for file ${file} in project BUILD.gn ASTs`,
          );
        }
      }),
  );

  logger(`Phase 2: Analyzing TypeScript dependencies...`);
  const analyzer = TypeScriptAnalyzer.create(rootDir);
  const requiredDeps = await analyzer.analyze(files);

  logger(`Phase 3: Updating BUILD.gn ASTs...`);
  await updateBuildGnFiles(requiredDeps, rootDir);
}
