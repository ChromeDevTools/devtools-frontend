// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {GnBuildFile} from '../../gn_ast/gn_ast.ts';
import {createAstNode} from '../../gn_ast/gn_ast_factory.ts';
import type {GnAstNode} from '../../gn_ast/gn_ast_types.ts';
import {
  extractStringValues,
  findAssignments,
  findFirstListNode,
  findFirstNode,
  findTargetNode,
  walkListNodes,
  walkStatements,
} from '../../gn_ast/gn_ast_visitor.ts';

const dirPath = path.dirname(fileURLToPath(import.meta.url));

describe('gn_ast_visitor', () => {
  const rootDir = path.resolve(dirPath, '../../../../');
  const fixturePath = path.resolve(dirPath, '../fixtures/BUILD.gn');
  let gnBuild: GnBuildFile;

  before(async () => {
    GnBuildFile.clearCache();
    gnBuild = await GnBuildFile.from(fixturePath, rootDir);
  });

  describe('findTargetNode', () => {
    it('finds target FUNCTION AST nodes from a real BUILD.gn file', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      assert.isDefined(animationNode);
      assert.strictEqual(animationNode.type, 'FUNCTION');
      assert.strictEqual(animationNode.value, 'devtools_ui_module');

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      assert.isDefined(bundleNode);
      assert.strictEqual(bundleNode.type, 'FUNCTION');
      assert.strictEqual(bundleNode.value, 'devtools_entrypoint');

      const missingNode = findTargetNode(gnBuild.ast, 'does_not_exist');
      assert.isUndefined(missingNode);
    });
  });

  describe('walkStatements & findAssignments', () => {
    it('walks statements and extracts assignments from real AST target blocks', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      const block = animationNode?.child?.[1];
      assert.isDefined(block?.child);

      const visited: GnAstNode[] = [];
      walkStatements(block.child, stmt => visited.push(stmt));
      assert.isAtLeast(visited.length, 2);

      const sourcesAssigns = findAssignments(block.child, 'sources');
      assert.strictEqual(sourcesAssigns.length, 1);
      assert.strictEqual(sourcesAssigns[0].type, 'BINARY');
      assert.strictEqual(sourcesAssigns[0].value, '=');

      const depsAssigns = findAssignments(block.child, 'deps');
      assert.strictEqual(depsAssigns.length, 1);
      assert.strictEqual(depsAssigns[0].type, 'BINARY');
      assert.strictEqual(depsAssigns[0].value, '=');
    });
  });

  describe('extractStringValues', () => {
    it('extracts string values from literal lists in real AST', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      const block = animationNode?.child?.[1];
      assert.isDefined(block?.child);
      const sourcesAssign = findAssignments(block.child, 'sources')[0];
      assert.isDefined(sourcesAssign?.child?.[1]);
      const rhs = sourcesAssign.child[1];
      const sources = extractStringValues(rhs);
      assert.includeMembers(sources, [
        'AnimationGroupPreviewUI.ts',
        'AnimationTimeline.ts',
        'AnimationUI.ts',
      ]);
    });

    it('extracts values from binary +/- expressions and identifier variable references', () => {
      const helpersNode = findTargetNode(gnBuild.ast, 'helpers');
      const helpersBlock = helpersNode?.child?.[1];
      assert.isDefined(helpersBlock?.child);
      const helpersAssign = findAssignments(helpersBlock.child, 'sources')[0];
      assert.isDefined(helpersAssign?.child?.[1]);
      const helpersRhs = helpersAssign.child[1];
      const variables = new Map<string, string[]>([['_helper_sources', ['Helper.ts']]]);
      const helperSources = extractStringValues(helpersRhs, variables);
      assert.deepEqual(helperSources, ['Helper.ts', 'Extra.ts']);

      const filteredNode = findTargetNode(gnBuild.ast, 'filtered');
      const filteredBlock = filteredNode?.child?.[1];
      assert.isDefined(filteredBlock?.child);
      const filteredAssign = findAssignments(filteredBlock.child, 'sources')[0];
      assert.isDefined(filteredAssign?.child?.[1]);
      const filteredRhs = filteredAssign.child[1];
      const filteredSources = extractStringValues(filteredRhs, variables);
      assert.deepEqual(filteredSources, ['Helper.ts']);
    });

    it('correctly filters out subtracted items in binary minus expressions when present in LHS', () => {
      const variables = new Map<string, string[]>([['_helper_sources', ['Helper.ts', 'Excluded.ts']]]);
      const minusNode = createAstNode.binary(
          '-',
          createAstNode.identifier('_helper_sources'),
          createAstNode.list([createAstNode.stringLiteral('Excluded.ts')]),
      );
      const result = extractStringValues(minusNode, variables);
      assert.deepEqual(result, ['Helper.ts']);
    });

    it('returns empty array when node is undefined or unsupported', () => {
      assert.deepEqual(extractStringValues(undefined), []);
      assert.deepEqual(extractStringValues({type: 'LINE_COMMENT'}), []);
    });

    it('safely handles binary expressions with missing or partial children', () => {
      const partialBinary: GnAstNode = {
        type: 'BINARY',
        value: '-',
        child: [createAstNode.list([createAstNode.stringLiteral('a.ts')])],
      };
      assert.deepEqual(extractStringValues(partialBinary), ['a.ts']);
    });
  });

  describe('walkListNodes & findFirstListNode', () => {
    it('walks list nodes inside real assignment expressions', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      const block = animationNode?.child?.[1];
      assert.isDefined(block?.child);
      const depsAssign = findAssignments(block.child, 'deps')[0];
      assert.isDefined(depsAssign?.child?.[1]);
      const rhs = depsAssign.child[1];

      const foundLists: GnAstNode[] = [];
      walkListNodes(rhs, listNode => foundLists.push(listNode));
      assert.strictEqual(foundLists.length, 1);
      assert.strictEqual(foundLists[0].type, 'LIST');

      const firstList = findFirstListNode(rhs);
      assert.strictEqual(firstList, foundLists[0]);
    });

    it('handles undefined node gracefully', () => {
      let callCount = 0;
      walkListNodes(undefined, () => callCount++);
      assert.strictEqual(callCount, 0);
      assert.isUndefined(findFirstListNode(undefined));
    });

    it('finds lists inside non-binary containers or nested additions', () => {
      const listA = createAstNode.list([createAstNode.stringLiteral('a.ts')]);
      const listB = createAstNode.list([createAstNode.stringLiteral('b.ts')]);
      const customContainer: GnAstNode = {
        type: 'BLOCK',
        child: [
          createAstNode.binary('-', listA, listB),
          createAstNode.binary('+', listB, listA),
        ],
      };

      const foundLists: GnAstNode[] = [];
      walkListNodes(customContainer, node => foundLists.push(node));
      assert.strictEqual(foundLists.length, 4);

      const firstList = findFirstListNode(customContainer);
      assert.strictEqual(firstList, listA);
    });

    it('ignores subtrahend of minus operator in findFirstListNode', () => {
      const listA = createAstNode.list([createAstNode.stringLiteral('a.ts')]);
      const listB = createAstNode.list([createAstNode.stringLiteral('b.ts')]);
      const minusExpr = createAstNode.binary(
          '-',
          createAstNode.identifier('all_sources'),
          listB,
      );
      assert.isUndefined(findFirstListNode(minusExpr));

      const minusWithListLhs = createAstNode.binary('-', listA, listB);
      assert.strictEqual(findFirstListNode(minusWithListLhs), listA);
    });
  });

  describe('visitAst', () => {
    it('traverses the real AST tree and finds matching nodes', () => {
      const foundTemplates: string[] = [];
      findFirstNode(gnBuild.ast, node => {
        if (node.type === 'FUNCTION' && node.value) {
          foundTemplates.push(node.value);
        }
        return undefined;
      });

      assert.includeMembers(foundTemplates, [
        'generate_css',
        'devtools_ui_module',
        'devtools_entrypoint',
      ]);
    });
  });
});
