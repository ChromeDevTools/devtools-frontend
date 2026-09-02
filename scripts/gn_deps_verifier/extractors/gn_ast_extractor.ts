// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import * as path from 'node:path';

import {GnBuildFile} from '../gn_ast/gn_ast.ts';
import type {AstTargetInfo} from '../gn_ast/gn_ast_types.ts';

export type {AstTargetInfo};

export function isInsideRoot(rootDir: string, candidate: string): boolean {
  const relative = path.relative(rootDir, candidate);
  return !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export interface GnAstExtractorOptions {
  excludedDirectories?: string[];
}

export class GnAstExtractor {
  readonly buildFiles = new Map<string, Promise<GnBuildFile|null>>();
  readonly rootDir: string;
  readonly options: GnAstExtractorOptions;
  readonly #excludedDirs: Set<string>;
  // Empty set means we looked up the path and found no build file mapping.
  #fileToTarget = new Map<string, Set<string>>();
  // Null means we looked up the directory and found no build file.
  #buildGnCache = new Map<string, string|null>();
  static #instance: GnAstExtractor|undefined;

  private constructor(rootDir: string, options?: GnAstExtractorOptions) {
    this.rootDir = path.resolve(rootDir);
    this.options = {
      excludedDirectories: options?.excludedDirectories ??
          [
            'node_modules',
            'out',
          ],
    };
    this.#excludedDirs = new Set(this.options.excludedDirectories);
  }

  static create(
      rootDir?: string,
      options?: GnAstExtractorOptions,
      ): GnAstExtractor {
    const resolvedRoot = rootDir ? path.resolve(rootDir) : undefined;
    if (GnAstExtractor.#instance) {
      if (resolvedRoot && resolvedRoot !== GnAstExtractor.#instance.rootDir) {
        throw new Error('Instance already exists with a different rootDir');
      }
    } else {
      if (!resolvedRoot) {
        throw new Error('rootDir is required for first initialization');
      }
      GnAstExtractor.#instance = new GnAstExtractor(resolvedRoot, options);
    }
    return GnAstExtractor.#instance;
  }

  static clearCacheForTesting(): void {
    GnAstExtractor.#instance = undefined;
    GnBuildFile.clearCache();
  }

  findNearestBuildGnForTesting(filePath: string): Promise<string|null> {
    return this.#findNearestBuildGn(filePath);
  }

  async getTargetsForFile(filePath: string): Promise<string[]> {
    const absPath = path.resolve(filePath);
    if (this.#fileToTarget.has(absPath)) {
      return Array.from(this.#fileToTarget.get(absPath) ?? new Set());
    }

    const buildFile = await this.#findNearestBuildGn(absPath);
    if (!buildFile) {
      this.#fileToTarget.set(absPath, new Set());
      return [];
    }

    await this.#parseAndCacheBuildFile(buildFile);

    if (!this.#fileToTarget.has(absPath)) {
      this.#fileToTarget.set(absPath, new Set());
    }
    return Array.from(this.#fileToTarget.get(absPath) ?? new Set());
  }

  async #parseAndCacheBuildFile(
      buildFile: string,
      ): Promise<GnBuildFile|null> {
    const absBuildFile = path.resolve(buildFile);
    const cachedPromise = this.buildFiles.get(absBuildFile);
    if (cachedPromise !== undefined) {
      return await cachedPromise;
    }

    const parsePromise = this.#parseBuildFile(absBuildFile);
    this.buildFiles.set(absBuildFile, parsePromise);
    return await parsePromise;
  }

  async #parseBuildFile(absBuildFile: string): Promise<GnBuildFile|null> {
    try {
      const gnBuild = await GnBuildFile.from(absBuildFile, this.rootDir);
      const buildDir = path.dirname(absBuildFile);
      for (const targetInfo of gnBuild.targets.values()) {
        for (const val of targetInfo.sources) {
          const srcAbsPath =
              val.startsWith('//') ? path.resolve(this.rootDir, val.slice(2)) : path.resolve(buildDir, val);
          let currentTargets = this.#fileToTarget.get(srcAbsPath);
          if (!currentTargets) {
            currentTargets = new Set<string>();
            this.#fileToTarget.set(srcAbsPath, currentTargets);
          }
          currentTargets.add(targetInfo.label);
        }
      }
      return gnBuild;
    } catch (e) {
      console.warn(`Warning: ${(e as Error).message}`);
      return null;
    }
  }

  async #findAllBuildGnsUnderDir(dir: string): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(dir, {withFileTypes: true});
      const results: string[] = [];
      const subDirTasks: Array<Promise<string[]>> = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }
        if (entry.isDirectory()) {
          if (!this.#excludedDirs.has(entry.name)) {
            subDirTasks.push(
                this.#findAllBuildGnsUnderDir(path.join(dir, entry.name)),
            );
          }
        } else if (entry.name === 'BUILD.gn') {
          results.push(path.join(dir, entry.name));
        }
      }

      if (subDirTasks.length > 0) {
        const subResults = await Promise.all(subDirTasks);
        for (const sub of subResults) {
          results.push(...sub);
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async #findNearestBuildGn(filePath: string): Promise<string|null> {
    const absPath = path.resolve(filePath);
    let currentDir = path.dirname(absPath);

    const selfCached = this.#buildGnCache.get(absPath);
    if (selfCached !== undefined) {
      return selfCached;
    }

    const parentCached = this.#buildGnCache.get(currentDir);
    if (parentCached !== undefined) {
      return parentCached;
    }

    try {
      const stats = await fs.promises.stat(absPath);
      if (stats.isDirectory()) {
        currentDir = absPath;
      }
    } catch {
      // Fallback to dirname
    }
    const visitedDirs: string[] = [];

    while (isInsideRoot(this.rootDir, currentDir)) {
      const cachedResult = this.#buildGnCache.get(currentDir);
      if (cachedResult !== undefined) {
        for (const dir of visitedDirs) {
          this.#buildGnCache.set(dir, cachedResult);
        }
        return cachedResult;
      }

      visitedDirs.push(currentDir);
      const buildPath = path.join(currentDir, 'BUILD.gn');
      try {
        await fs.promises.access(buildPath);
        for (const dir of visitedDirs) {
          this.#buildGnCache.set(dir, buildPath);
        }
        return buildPath;
      } catch {
        // BUILD.gn does not exist in this dir
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }

    for (const dir of visitedDirs) {
      this.#buildGnCache.set(dir, null);
    }
    return null;
  }

  async extractTargetsFromAst(files: string[]): Promise<void> {
    // Identify target BUILD.gn files to check/update based on requested `files`
    const buildFilesToParse = new Set<string>();

    const fileResolutionTasks = files.map(async file => {
      const absPath = path.resolve(file);
      try {
        const stats = await fs.promises.stat(absPath);
        if (stats.isDirectory()) {
          const buildGns = await this.#findAllBuildGnsUnderDir(absPath);
          if (buildGns.length > 0) {
            return buildGns;
          }
        }
      } catch {
        // Ignore stats error, fallback to findNearestBuildGn
      }
      const buildFile = await this.#findNearestBuildGn(absPath);
      return buildFile ? [buildFile] : [];
    });

    const resolvedBuildFiles = await Promise.all(fileResolutionTasks);
    for (const bfs of resolvedBuildFiles) {
      for (const bf of bfs) {
        buildFilesToParse.add(bf);
      }
    }

    await Promise.all(
        Array.from(buildFilesToParse).map(async buildFile => {
          await this.#parseAndCacheBuildFile(buildFile);
        }),
    );
  }
}
