// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {execFile, spawn} from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {promisify} from 'node:util';

import {GnLabel} from '../utils/gn_label.ts';

import {createAstNode, unquoteFromGn} from './gn_ast_factory.ts';
import type {AstTargetInfo, GnAstNode, UpdateTargetDepsOptions} from './gn_ast_types.ts';
import {
  applyAssignment,
  extractTargetFromFunctionNode,
  findAssignments,
  findFirstListNode,
  findTargetNode,
  walkListNodes,
} from './gn_ast_visitor.ts';

const execFileAsync = promisify(execFile);

export function compareAssignmentPriority(a: GnAstNode, b: GnAstNode): number {
  const getPriority = (node: GnAstNode): number => {
    const hasList = findFirstListNode(node.child?.[1]) !== undefined;
    const isEquals = node.value === '=';
    return (hasList ? 2 : 0) + (isEquals ? 1 : 0);
  };
  return getPriority(b) - getPriority(a);
}

export class GnBuildFile {
  static #cache = new Map<string, Promise<GnBuildFile>>();

  readonly filePath: string;
  readonly rootDir: string;
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
      const gnBuild = new GnBuildFile(absPath, ast, rootDir);
      gnBuild.init();
      return gnBuild;
    } catch (e) {
      throw new Error(`Failed to parse ${absPath}: ${(e as Error).message}`);
    }
  }

  static async from(filePath: string, rootDir: string): Promise<GnBuildFile> {
    const absPath = path.resolve(filePath);
    const cached = GnBuildFile.#cache.get(absPath);
    if (cached) {
      return await cached;
    }

    const promise = GnBuildFile.#getGnAstFromFile(absPath, rootDir);
    GnBuildFile.#cache.set(absPath, promise);
    return await promise;
  }

  static clearCache(): void {
    GnBuildFile.#cache.clear();
  }

  /**
   * @param filePath Path to a valid BUILD.gn file.
   * @param ast pre-parsed AST node.
   * @param rootDir Workspace root directory.
   */
  private constructor(filePath: string, ast: GnAstNode, rootDir: string) {
    this.filePath = path.resolve(filePath);
    this.ast = ast;
    this.rootDir = path.resolve(rootDir);
  }

  /**
   * Initializes and populates target metadata extracted from AST nodes.
   */
  init(): void {
    const relBuildDir = path.relative(this.rootDir, path.dirname(this.filePath)).split(path.sep).join(path.posix.sep);
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
   * Updates dependencies for a specified target in the AST.
   *
   * @returns true if the target dependencies were modified in the AST, and false otherwise.
   */
  updateTargetDeps(
      targetName: string,
      options: UpdateTargetDepsOptions,
      ): boolean {
    const targetFn = findTargetNode(this.ast, targetName);
    const block = targetFn?.child?.[1];
    if (!block || block.type !== 'BLOCK') {
      return false;
    }

    const currentDir = path.dirname(this.filePath);
    const resolveDep = (dep: string) => GnLabel.resolveDeclaredDep(
        unquoteFromGn(dep),
        currentDir,
        this.rootDir,
    );

    const unusedDepsSet = new Set(options.unusedDeps.map(resolveDep));

    const depsAssigns = findAssignments(block.child || [], 'deps');
    const additiveAssigns = depsAssigns.filter(
        a => a.value === '=' || a.value === '+=',
    );

    let modified = false;
    const existingDeps = new Set<string>();

    // 1 pass: filter unused deps and collect existing deps from additive assignments.
    for (const assign of additiveAssigns) {
      walkListNodes(assign.child?.[1], lNode => {
        const initialCount = lNode.child?.length || 0;
        lNode.child = (lNode.child || []).filter(item => {
          if (item.type !== 'LITERAL' || !item.value) {
            return true;
          }
          const resolved = resolveDep(item.value);
          if (unusedDepsSet.has(resolved)) {
            return false;
          }
          existingDeps.add(resolved);
          return true;
        });
        if (lNode.child.length !== initialCount) {
          modified = true;
        }
      });
    }

    // Append missing deps to a top-level target assignment.
    if (options.missingDeps.length > 0) {
      const topLevelDepsAssigns = findAssignments(
          block.child || [],
          'deps',
          /* recursive= */ false,
      );
      const topLevelAdditiveAssigns = topLevelDepsAssigns.filter(
          a => a.value === '=' || a.value === '+=',
      );
      let targetAssign = [...topLevelAdditiveAssigns].sort(compareAssignmentPriority)[0];
      let listNode = targetAssign ? findFirstListNode(targetAssign.child?.[1]) : undefined;

      if (!listNode) {
        const op = topLevelDepsAssigns.length > 0 ? '+=' : '=';
        targetAssign = createAstNode.assignment(
            'deps',
            createAstNode.list(),
            op,
        );
        block.child = block.child || [];
        block.child.push(targetAssign);
        listNode = findFirstListNode(targetAssign.child?.[1]) as GnAstNode;
      }

      for (const rawDep of options.missingDeps) {
        const dep = unquoteFromGn(rawDep);
        if (!dep) {
          continue;
        }
        const resolved = resolveDep(dep);
        if (!resolved || existingDeps.has(resolved)) {
          continue;
        }
        existingDeps.add(resolved);

        listNode.child = listNode.child || [];
        listNode.child.push(createAstNode.stringLiteral(dep));
        modified = true;
      }
    }

    return modified;
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
