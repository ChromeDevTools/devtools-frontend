// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import type {AstTargetInfo} from '../gn_ast/gn_ast_types.ts';

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
  readonly #buildFiles = new Map<string, Promise<void>>();
  readonly #targetDeps = new Map<string, Promise<Set<string>|null>>();

  private constructor(rootDir?: string) {
    this.#astExtractor = GnAstExtractor.create(rootDir);
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

  static resolveTargetSourceFiles(targetInfo: AstTargetInfo, rootDir: string): string[] {
    const buildDir = path.dirname(targetInfo.buildFile);
    const resolved = new Set<string>();
    for (const src of targetInfo.sources) {
      if (TypeScriptAnalyzer.isTypeScriptSource(src)) {
        resolved.add(src.startsWith('//') ? path.resolve(rootDir, src.slice(2)) : path.resolve(buildDir, src));
      }
    }
    return Array.from(resolved);
  }

  static mapImportsToSources(importsMap: Map<string, string[]>): Map<string, string[]> {
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
}
