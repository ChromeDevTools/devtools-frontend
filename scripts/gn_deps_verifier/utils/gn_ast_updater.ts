// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {GnAstExtractor} from '../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../extractors/typescript_analyzer.ts';
import type {GnBuildFile} from '../gn_ast/gn_ast.ts';
import type {AstTargetInfo} from '../gn_ast/gn_ast_types.ts';

import {withConcurrencyLimit} from './concurrency.ts';
import {logger} from './debug.ts';
import {GnLabel} from './gn_label.ts';

const IGNORED_TARGET_SUFFIXES: string[] = [];
const IGNORED_TARGET_SUBSTRINGS = ['Images', 'legacy_test_runner'];

export interface ComputeDepsResult {
  gnBuild: GnBuildFile;
  targetLabel: string;
  realTargetName: string;
  filteredMissingTsDeps: string[];
  filteredUnusedTsDeps: string[];
  filteredMissingDeps: string[];
  filteredUnusedDeps: string[];
}

function shouldKeepDep(rawDep: string): boolean {
  const ignore = IGNORED_TARGET_SUFFIXES.some(suffix => rawDep.endsWith(suffix)) ||
      IGNORED_TARGET_SUBSTRINGS.some(sub => rawDep.includes(sub));
  return !ignore;
}

function createComputeTask(
    gnBuild: GnBuildFile,
    targetLabel: string,
    realTargetName: string,
    targetInfo: AstTargetInfo,
    requiredDeps: Set<string>,
    rootDir: string,
    extractionResult: GnAstExtractor,
    ): () => Promise<ComputeDepsResult|null> {
  return async () => {
    const {missingTsDeps, unusedTsDeps, missingDeps, unusedDeps} = await TypeScriptAnalyzer.computeTargetDepsDiff(
        targetInfo,
        requiredDeps,
        rootDir,
        extractionResult,
    );

    return {
      gnBuild,
      targetLabel,
      realTargetName,
      filteredMissingTsDeps: missingTsDeps.filter(shouldKeepDep),
      filteredUnusedTsDeps: unusedTsDeps.filter(shouldKeepDep),
      filteredMissingDeps: missingDeps.filter(shouldKeepDep),
      filteredUnusedDeps: unusedDeps.filter(shouldKeepDep),
    };
  };
}

function applyDiffToBuildFile(
    result: ComputeDepsResult,
    modifiedBuildFiles: Set<GnBuildFile>,
    rootDir: string,
    dryRun: boolean,
    ): void {
  const {
    gnBuild,
    targetLabel,
    realTargetName,
    filteredMissingTsDeps,
    filteredUnusedTsDeps,
    filteredMissingDeps,
    filteredUnusedDeps,
  } = result;

  const hasChanges = filteredMissingTsDeps.length > 0 || filteredUnusedTsDeps.length > 0 ||
      filteredMissingDeps.length > 0 || filteredUnusedDeps.length > 0;

  if (!hasChanges) {
    return;
  }

  if (dryRun) {
    const relBuildFile = path.relative(rootDir, gnBuild.filePath);
    const details = [
      ...filteredMissingTsDeps.map(d => `  Missing (ts_deps): ${d}`),
      ...filteredUnusedTsDeps.map(d => `  Unused (ts_deps): ${d}`),
      ...filteredMissingDeps.map(d => `  Missing (deps): ${d}`),
      ...filteredUnusedDeps.map(d => `  Unused (deps): ${d}`),
    ].join('\n');
    throw new Error(
        `Mismatch in ${targetLabel} (${relBuildFile}):\n${details}\n\n` +
            `Run \`npm run check-gn -- --all\` to automatically fix this.`,
    );
  }

  logger(`Mismatch in ${targetLabel}:`);
  filteredMissingTsDeps.forEach(d => logger(`  Missing (ts_deps): ${d}`));
  filteredUnusedTsDeps.forEach(d => logger(`  Unused (ts_deps): ${d}`));
  filteredMissingDeps.forEach(d => logger(`  Missing (deps): ${d}`));
  filteredUnusedDeps.forEach(d => logger(`  Unused (deps): ${d}`));

  // Update AST
  const updatedTs = gnBuild.updateTargetDeps(realTargetName, {
    unusedDeps: filteredUnusedTsDeps,
    missingDeps: filteredMissingTsDeps,
    targetProperty: 'ts_deps',
  });

  const updatedDeps = gnBuild.updateTargetDeps(realTargetName, {
    unusedDeps: filteredUnusedDeps,
    missingDeps: filteredMissingDeps,
    targetProperty: 'deps',
  });

  if (updatedTs || updatedDeps) {
    modifiedBuildFiles.add(gnBuild);
  }
}

async function writeModifiedBuildFiles(modifiedBuildFiles: Set<GnBuildFile>): Promise<void> {
  const tasks = Array.from(modifiedBuildFiles, build => async () => {
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
  });
  await withConcurrencyLimit(tasks, 50);
}

export async function updateBuildGnFiles(
    targetRequiredDeps: Map<string, Set<string>>,
    rootDir: string,
    dryRun = false,
) {
  const extractionResult = GnAstExtractor.create(rootDir);
  const modifiedBuildFiles = new Set<GnBuildFile>();
  const buildFiles = await Promise.all(extractionResult.buildFiles.values());

  const computeTasks: Array<() => Promise<ComputeDepsResult|null>> = [];

  for (const gnBuild of buildFiles) {
    if (!gnBuild) {
      continue;
    }
    for (const [targetLabel, targetInfo] of gnBuild.targets.entries()) {
      if (IGNORED_TARGET_SUBSTRINGS.some(sub => targetLabel.includes(sub))) {
        continue;
      }

      if (targetInfo.templateName === 'group' || targetInfo.templateName === 'devtools_pre_built' ||
          targetInfo.templateName === 'bundle') {
        continue;
      }

      const requiredDeps = targetRequiredDeps.get(targetLabel);
      if (!requiredDeps) {
        continue;
      }

      const realTargetName = GnLabel.parse(targetLabel)?.name;
      if (!realTargetName) {
        logger(`Failed to parse target label: ${targetLabel}`);
        continue;
      }

      computeTasks.push(createComputeTask(
          gnBuild,
          targetLabel,
          realTargetName,
          targetInfo,
          requiredDeps,
          rootDir,
          extractionResult,
          ));
    }
  }

  const computeResults = await withConcurrencyLimit(computeTasks, 50);

  for (const result of computeResults) {
    if (result) {
      applyDiffToBuildFile(result, modifiedBuildFiles, rootDir, dryRun);
    }
  }

  await writeModifiedBuildFiles(modifiedBuildFiles);
}
