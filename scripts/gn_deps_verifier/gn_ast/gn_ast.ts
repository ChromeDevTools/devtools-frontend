// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execFile, spawn} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {promisify} from 'node:util';

import type {AstTargetInfo, GnAstNode} from './gn_ast_types.ts';
import {
  applyAssignment,
  extractTargetFromFunctionNode,
} from './gn_ast_visitor.ts';

const execFileAsync = promisify(execFile);

export class GnBuildFile {
  static #cache = new Map<string, Promise<GnBuildFile>>();

  readonly filePath: string;
  readonly ast: GnAstNode;
  readonly targets = new Map<string, AstTargetInfo>();

  static async #getGnAstFromFile(
      absPath: string,
      rootDir: string,
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
      const gnBuild = new GnBuildFile(absPath, ast);
      gnBuild.init(rootDir);
      return gnBuild;
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

  /**
   * Initializes and populates target metadata extracted from AST nodes.
   */
  init(rootDir: string): void {
    const relBuildDir = path.relative(rootDir, path.dirname(this.filePath)).split(path.sep).join(path.posix.sep);
    const baseLabel = `//${relBuildDir}`;

    const variables = new Map<string, string[]>();

    const visitNode = (node: GnAstNode) => {
      if (applyAssignment(variables, node)) {
        return;
      }
      if (node.type === 'FUNCTION') {
        const target = extractTargetFromFunctionNode(
            node,
            baseLabel,
            this.filePath,
            variables,
        );
        if (target) {
          this.targets.set(target.label, target);
        }
        // Do not recurse into FUNCTION bodies
        // so local assignments don't leak to file-level variables.
        return;
      }

      if (node.child) {
        for (const child of node.child) {
          visitNode(child);
        }
      }
    };

    visitNode(this.ast);
  }

  /**
   * Rebuilds and writes formatted GN content from AST using `gn format --read-tree=json`.
   */
  async writeGnFile(): Promise<boolean> {
    return await new Promise(resolve => {
      const child = spawn('gn', ['format', '--read-tree=json', this.filePath]);
      let stdout = '';

      child.on('error', () => {
        resolve(false);
      });

      child.stdin.on('error', () => {
        resolve(false);
      });

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.on('close', (code: number) => {
        if (code !== 0) {
          resolve(false);
        } else {
          resolve(stdout.includes('Wrote rebuilt from json to'));
        }
      });

      child.stdin.write(JSON.stringify(this.ast));
      child.stdin.end();
    });
  }
}
