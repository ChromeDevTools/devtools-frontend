// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import type {AstTargetInfo} from '../gn_ast/gn_ast_types.ts';
import {GnLabel} from '../utils/gn_label.ts';

import {GnAstExtractor} from './gn_ast_extractor.ts';
import {TypeScriptImportExtractor} from './typescript_import.ts';

export interface ImportResolutionResult {
  success: boolean;
  deps: string[];
}

// Map internal targets of third_party bundles (often GN groups without entrypoints) back to their public bundle target.
const SPECIAL_TARGET_MAP: Readonly<Record<string, string>> = Object.freeze({
  '//front_end/third_party/codemirror.next:codemirror.next-compilation':
      '//front_end/third_party/codemirror.next:bundle',
  '//front_end/third_party/codemirror.next:codemirror.next-sources': '//front_end/third_party/codemirror.next:bundle',
  '//front_end/third_party/lighthouse:lighthouse-locale-files': '//front_end/third_party/lighthouse:lighthouse',
  '//front_end/third_party/lighthouse:lighthouse-javascript-sources-debug':
      '//front_end/third_party/lighthouse:lighthouse',
  '//front_end/third_party/lighthouse:lighthouse-javascript-sources-release':
      '//front_end/third_party/lighthouse:lighthouse',
});

export class TypeScriptAnalyzer {
  static #instance: TypeScriptAnalyzer|undefined;

  readonly #astExtractor: GnAstExtractor;
  readonly #importExtractor: TypeScriptImportExtractor;
  readonly #buildFiles = new Map<string, Promise<void>>();
  readonly #targetDeps = new Map<string, Promise<Set<string>|null>>();

  private constructor(rootDir?: string) {
    this.#astExtractor = GnAstExtractor.create(rootDir);
    this.#importExtractor = TypeScriptImportExtractor.create();
  }

  static create(rootDir?: string): TypeScriptAnalyzer {
    const resolvedRoot = rootDir ? path.resolve(rootDir) : undefined;
    if (TypeScriptAnalyzer.#instance) {
      if (resolvedRoot && resolvedRoot !== TypeScriptAnalyzer.#instance.#astExtractor.rootDir) {
        throw new Error('Instance already exists with a different rootDir');
      }
    } else {
      if (!resolvedRoot) {
        throw new Error('rootDir is required for first initialization');
      }
      TypeScriptAnalyzer.#instance = new TypeScriptAnalyzer(resolvedRoot);
    }
    return TypeScriptAnalyzer.#instance;
  }

  static clearCacheForTesting(): void {
    TypeScriptAnalyzer.#instance = undefined;
    GnAstExtractor.clearCacheForTesting();
    TypeScriptImportExtractor.clearCacheForTesting();
  }

  get rootDir(): string {
    return this.#astExtractor.rootDir;
  }

  get targetDeps(): ReadonlyMap<string, Promise<Set<string>|null>> {
    return this.#targetDeps;
  }

  get buildFiles(): ReadonlyMap<string, Promise<void>> {
    return this.#buildFiles;
  }

  static getMappedTarget(target: string): string {
    return SPECIAL_TARGET_MAP[target] ?? target;
  }

  static isTypeScriptSource(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.js');
  }

  static resolveTargetSourceFiles(
      targetInfo: AstTargetInfo,
      rootDir: string,
      ): string[] {
    const buildDir = path.dirname(targetInfo.buildFile);
    const resolved = new Set<string>();
    for (const src of targetInfo.sources) {
      if (TypeScriptAnalyzer.isTypeScriptSource(src)) {
        resolved.add(
            src.startsWith('//') ? path.resolve(rootDir, src.slice(2)) : path.resolve(buildDir, src),
        );
      }
    }
    return Array.from(resolved);
  }

  static mapImportsToSources(
      importsMap: Map<string, string[]>,
      ): Map<string, string[]> {
    const importToSources = new Map<string, string[]>();
    for (const [file, imports] of importsMap.entries()) {
      for (const imp of imports) {
        let sources = importToSources.get(imp);
        if (!sources) {
          sources = [];
          importToSources.set(imp, sources);
        }
        sources.push(file);
      }
    }
    return importToSources;
  }
  static isConsumerTarget(
      targetLabel: string,
      targetInfo?: AstTargetInfo,
      ): boolean {
    const gnLabel = GnLabel.parse(targetLabel);
    if (!gnLabel) {
      return false;
    }
    const name = gnLabel.name;
    if (name === 'bundle') {
      return false;
    }
    if (targetInfo?.testonly || targetInfo?.templateName === 'devtools_entrypoint') {
      return true;
    }

    if (targetInfo?.templateName) {
      const moduleTemplates = new Set([
        'devtools_module',
        'devtools_ui_module',
        'devtools_foundation_module',
        'devtools_base_module',
      ]);
      if (moduleTemplates.has(targetInfo.templateName)) {
        return false;
      }
    }
    return gnLabel.isConsumerTarget;
  }

  /**
   * Computes missing and unused dependencies between a target's declared deps
   * and its required dependencies, normalizing formats and converting missingDeps
   * to relative GN dependencies.
   */
  static computeTargetDepsDiff(
      targetInfo: AstTargetInfo,
      requiredDeps: Set<string>,
      rootDir: string,
      ): {missingDeps: string[], unusedDeps: string[]} {
    const currentDir = path.dirname(targetInfo.buildFile);
    const existingMap = new Map<string, string>();

    for (const rawDep of targetInfo.deps) {
      const resolved = GnLabel.resolveDeclaredDep(rawDep, currentDir, rootDir);
      existingMap.set(resolved, rawDep);
    }

    const missingDeps: string[] = [];
    for (const reqDep of requiredDeps) {
      const resolvedReq = GnLabel.resolveDeclaredDep(
          reqDep,
          currentDir,
          rootDir,
      );
      if (!existingMap.has(resolvedReq)) {
        missingDeps.push(
            GnLabel.formatRelativeDep(resolvedReq, currentDir, rootDir),
        );
      }
    }

    const unusedDeps: string[] = [];
    const resolvedReqSet = new Set(
        Array.from(requiredDeps)
            .map(
                d => GnLabel.resolveDeclaredDep(d, currentDir, rootDir),
                ),
    );
    for (const [resolvedExisting, rawDep] of existingMap.entries()) {
      if (!resolvedReqSet.has(resolvedExisting)) {
        unusedDeps.push(rawDep);
      }
    }

    return {missingDeps, unusedDeps};
  }
  async resolveImportDependencies(
      importedFile: string,
      importedBySources: string[],
      targetLabel: string,
      targetInfo: AstTargetInfo,
      ): Promise<ImportResolutionResult> {
    const impTargets = await this.#astExtractor.getTargetsForFile(importedFile);

    if (impTargets.length === 0) {
      const importedBy = importedBySources.join(', ');
      console.error(
          `Failed to find target for import: ${importedFile}\n` +
              ` - is imported by ${importedBy}\n` +
              ` - while analyzing ${targetLabel}\n in ${targetInfo.buildFile}\n`,
      );
      return {success: false, deps: []};
    }

    // Internal import within the same target requires no external dependency.
    if (impTargets.includes(targetLabel)) {
      return {success: true, deps: []};
    }

    const targetGnLabel = GnLabel.parse(targetLabel);
    const isConsumerTarget = TypeScriptAnalyzer.isConsumerTarget(targetLabel, targetInfo);
    const labelBundle = targetGnLabel?.bundleLabel;

    const deps = new Set<string>();
    for (const impTarget of impTargets) {
      const finalTarget = TypeScriptAnalyzer.getMappedTarget(impTarget);

      // Do not allow a target to depend on itself.
      if (finalTarget === targetLabel) {
        continue;
      }

      // Implementation modules must not depend on their own bundle (avoids circular deps).
      if (!isConsumerTarget && finalTarget === labelBundle) {
        continue;
      }

      deps.add(finalTarget);
    }

    return {success: true, deps: Array.from(deps)};
  }

  async analyzeTarget(
      targetLabel: string,
      targetInfo: AstTargetInfo,
      ): Promise<Set<string>|null> {
    const cachedPromise = this.#targetDeps.get(targetLabel);
    if (cachedPromise !== undefined) {
      return await cachedPromise;
    }

    const analyzePromise = this.#computeTargetDependencies(targetLabel, targetInfo);
    this.#targetDeps.set(targetLabel, analyzePromise);
    analyzePromise.catch(() => {
      this.#targetDeps.delete(targetLabel);
    });
    return await analyzePromise;
  }

  async #computeTargetDependencies(
      targetLabel: string,
      targetInfo: AstTargetInfo,
      ): Promise<Set<string>|null> {
    if (targetLabel.includes('/legacy_test_runner/') || targetLabel.includes('/third_party/')) {
      return null;
    }

    const allTargetFiles = TypeScriptAnalyzer.resolveTargetSourceFiles(targetInfo, this.#astExtractor.rootDir);
    if (allTargetFiles.length === 0) {
      return null;
    }

    const importsMap = await this.#importExtractor.extractTsImports(allTargetFiles);
    const importToSources = TypeScriptAnalyzer.mapImportsToSources(importsMap);

    const resolutionTasks = Array.from(importToSources.entries()).map(([imp, sources]) => {
      return this.resolveImportDependencies(imp, sources, targetLabel, targetInfo);
    });

    const results = await Promise.all(resolutionTasks);
    const hasTargetNotFound = results.some(r => !r.success);
    if (hasTargetNotFound) {
      return null;
    }

    const requiredDeps = new Set<string>();
    for (const res of results) {
      for (const dep of res.deps) {
        requiredDeps.add(dep);
      }
    }

    return requiredDeps;
  }

  async processBuildFile(buildFile: string): Promise<void> {
    const absPath = path.resolve(buildFile);

    const cachedPromise = this.#buildFiles.get(absPath);
    if (cachedPromise !== undefined) {
      return await cachedPromise;
    }

    const task = this.#executeProcessBuildFile(absPath);
    this.#buildFiles.set(absPath, task);
    task.catch(() => {
      this.#buildFiles.delete(absPath);
    });
    return await task;
  }

  async #executeProcessBuildFile(absPath: string): Promise<void> {
    let gnBuild = await this.#astExtractor.buildFiles.get(absPath);
    if (!gnBuild) {
      await this.#astExtractor.extractTargetsFromAst([absPath]);
      gnBuild = await this.#astExtractor.buildFiles.get(absPath);
    }

    if (!gnBuild) {
      return;
    }

    const targetTasks = Array.from(gnBuild.targets.entries()).map(([targetLabel, targetInfo]) => {
      return this.analyzeTarget(targetLabel, targetInfo);
    });

    await Promise.all(targetTasks);
  }

  async #processDiscoveredBuildFiles(): Promise<void> {
    const pending: Array<Promise<void>> = [];

    for (const filePath of this.#astExtractor.buildFiles.keys()) {
      if (!this.#buildFiles.has(filePath)) {
        pending.push(this.processBuildFile(filePath));
      }
    }

    if (pending.length > 0) {
      await Promise.all(pending);
      await this.#processDiscoveredBuildFiles();
    }
  }

  async analyze(buildFiles?: string[]): Promise<Map<string, Set<string>>> {
    if (buildFiles && buildFiles.length > 0) {
      await this.#astExtractor.extractTargetsFromAst(buildFiles);
    }
    await this.#processDiscoveredBuildFiles();

    const targetEntries = Array.from(this.#targetDeps.entries());
    const resolvedResults = await Promise.all(
        targetEntries.map(async ([targetLabel, depsPromise]) => {
          const deps = await depsPromise;
          return [targetLabel, deps] as const;
        }),
    );

    const targetRequiredDeps = new Map<string, Set<string>>();
    for (const [targetLabel, deps] of resolvedResults) {
      if (deps !== null) {
        targetRequiredDeps.set(targetLabel, deps);
      }
    }

    return targetRequiredDeps;
  }
}
