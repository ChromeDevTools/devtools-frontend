// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execFile} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {promisify} from 'node:util';

import type {AstTargetInfo, GnAstNode} from './gn_ast_types.ts';

const execFileAsync = promisify(execFile);

export class GnBuildFile {
  static #cache = new Map<string, Promise<GnBuildFile>>();

  readonly filePath: string;
  readonly ast: GnAstNode;
  readonly targets = new Map<string, AstTargetInfo>();

  static async #getGnAstFromFile(
      absPath: string,
      _rootDir: string,
      ): Promise<GnBuildFile> {
    try {
      await fs.promises.access(absPath);
    } catch {
      throw new Error(`BUILD.gn file not found: ${absPath}`);
    }
    try {
      const {stdout} = await execFileAsync(
          'gn',
          ['format', '--dump-tree=json', absPath],
          {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024 * 50,
          },
      );
      const ast = JSON.parse(stdout) as GnAstNode;
      return new GnBuildFile(absPath, ast);
    } catch (e) {
      throw new Error(`Failed to parse ${absPath}: ${(e as Error).message}`);
    }
  }

  static async from(filePath: string, _rootDir: string): Promise<GnBuildFile> {
    const absPath = path.resolve(filePath);
    const cached = GnBuildFile.#cache.get(absPath);
    if (cached) {
      return await cached;
    }

    const promise = GnBuildFile.#getGnAstFromFile(absPath, _rootDir);
    GnBuildFile.#cache.set(absPath, promise);
    return await promise;
  }

  static clearCache(): void {
    GnBuildFile.#cache.clear();
  }

  /**
   * @param filePath Path to a valid BUILD.gn file.
   * @param ast pre-parsed AST node.
   */
  private constructor(filePath: string, ast: GnAstNode) {
    this.filePath = path.resolve(filePath);
    this.ast = ast;
  }
}
