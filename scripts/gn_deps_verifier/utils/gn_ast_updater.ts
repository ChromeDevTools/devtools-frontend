// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {GnAstExtractor} from '../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../extractors/typescript_analyzer.ts';
import type {GnBuildFile} from '../gn_ast/gn_ast.ts';

import {logger} from './debug.ts';
import {GnLabel} from './gn_label.ts';

const IGNORED_TARGET_SUFFIXES: string[] = [];
const IGNORED_TARGET_SUBSTRINGS = ['Images', 'legacy_test_runner'];

export async function updateBuildGnFiles(
    targetRequiredDeps: Map<string, Set<string>>,
    rootDir: string,
) {
  const extractionResult = GnAstExtractor.create(rootDir);
  const modifiedBuildFiles = new Set<GnBuildFile>();
  const buildFiles = await Promise.all(extractionResult.buildFiles.values());

  for (const gnBuild of buildFiles) {
    if (!gnBuild) {
      continue;
    }
    for (const [targetLabel, targetInfo] of gnBuild.targets.entries()) {
      if (IGNORED_TARGET_SUBSTRINGS.some(sub => targetLabel.includes(sub))) {
        continue;
      }

      if (targetInfo.templateName === 'group' || targetInfo.templateName === 'devtools_pre_built') {
        continue;
      }

      const requiredDeps = targetRequiredDeps.get(targetLabel);
      if (!requiredDeps) {
        continue;
      }

      const {missingDeps, unusedDeps} = TypeScriptAnalyzer.computeTargetDepsDiff(
          targetInfo,
          requiredDeps,
          rootDir,
      );

      const shouldKeepDep = (rawDep: string) => {
        const ignore = IGNORED_TARGET_SUFFIXES.some(suffix => rawDep.endsWith(suffix)) ||
            IGNORED_TARGET_SUBSTRINGS.some(sub => rawDep.includes(sub));
        return !ignore;
      };

      const filteredUnusedDeps = unusedDeps.filter(shouldKeepDep);
      const filteredMissingDeps = missingDeps.filter(shouldKeepDep);

      if (filteredMissingDeps.length > 0 || filteredUnusedDeps.length > 0) {
        logger(`Mismatch in ${targetLabel}:`);
        filteredMissingDeps.forEach(d => logger(`  Missing: ${d}`));
        filteredUnusedDeps.forEach(d => logger(`  Unused: ${d}`));

        // Update AST
        const realTargetName = GnLabel.parse(targetLabel)?.name;

        if (!realTargetName) {
          logger(`Failed to parse target label: ${targetLabel}`);
          return;
        }

        const updated = gnBuild.updateTargetDeps(realTargetName, {
          unusedDeps: filteredUnusedDeps,
          missingDeps: filteredMissingDeps,
        });

        if (updated) {
          modifiedBuildFiles.add(gnBuild);
        }
      }
    }
  }

  await Promise.all(
      Array.from(modifiedBuildFiles).map(async build => {
        try {
          const success = await build.writeGnFile();
          if (success) {
            logger(`Auto-fixed ${build.filePath}`);
          } else {
            logger(`Failed to auto-fix ${build.filePath}: gn format failed`);
          }
        } catch (e) {
          logger(`Failed to auto-fix ${build.filePath}: ${e}`);
        }
      }),
  );
}
