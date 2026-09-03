// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {GnBuildFile} from '../../gn_ast/gn_ast.ts';
import {createAstNode} from '../../gn_ast/gn_ast_factory.ts';
import type {GnAstNode} from '../../gn_ast/gn_ast_types.ts';
import {
  applyAssignment,
  extractStringValues,
  extractTargetFromFunctionNode,
  findAssignments,
  findFirstListNode,
  findFirstNode,
  findTargetNode,
  walkListNodes,
  walkStatements,
} from '../../gn_ast/gn_ast_visitor.ts';

describe('gn_ast_visitor', () => {
  const rootDir = path.resolve(import.meta.dirname, '../../../../');
  const fixturePath = path.resolve(import.meta.dirname, '../fixtures/BUILD.gn');
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
      assert.isDefined(animationNode);
      assert.isDefined(animationNode.child);
      const block = animationNode.child[1];
      assert.isDefined(block.child);

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

      const stmtsWithMinus: GnAstNode[] = [
        createAstNode.assignment('deps', createAstNode.list(), '='),
        createAstNode.assignment('deps', createAstNode.list(), '+='),
        createAstNode.assignment('deps', createAstNode.list(), '-='),
        createAstNode.assignment('sources', createAstNode.list(), '='),
      ];
      const foundDepsAssigns = findAssignments(stmtsWithMinus, 'deps');
      assert.strictEqual(foundDepsAssigns.length, 3);
      assert.deepEqual(
          foundDepsAssigns.map(s => s.value),
          ['=', '+=', '-='],
      );
    });

    it('respects recursive = false and only visits top-level statements', () => {
      const topLevelAssign = createAstNode.assignment(
          'deps',
          createAstNode.list(),
          '=',
      );
      const nestedAssign = createAstNode.assignment(
          'deps',
          createAstNode.list(),
          '+=',
      );
      const conditionBlock: GnAstNode = {
        type: 'CONDITION',
        child: [
          createAstNode.identifier('is_chromeos'),
          {type: 'BLOCK', child: [nestedAssign]},
        ],
      };

      const stmts: GnAstNode[] = [topLevelAssign, conditionBlock];

      const allAssigns = findAssignments(stmts, 'deps', true);
      assert.strictEqual(allAssigns.length, 2);

      const topLevelOnly = findAssignments(stmts, 'deps', false);
      assert.strictEqual(topLevelOnly.length, 1);
      assert.strictEqual(topLevelOnly[0], topLevelAssign);
    });
  });

  describe('extractStringValues', () => {
    it('extracts string values from literal lists in real AST', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      assert.isDefined(animationNode);
      assert.isDefined(animationNode.child);
      const block = animationNode.child[1];
      assert.isDefined(block.child);
      const sourcesAssign = findAssignments(block.child, 'sources')[0];
      assert.isDefined(sourcesAssign);
      assert.isDefined(sourcesAssign.child);
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
      assert.isDefined(helpersNode);
      assert.isDefined(helpersNode.child);
      const helpersBlock = helpersNode.child[1];
      assert.isDefined(helpersBlock.child);
      const helpersAssign = findAssignments(helpersBlock.child, 'sources')[0];
      assert.isDefined(helpersAssign);
      assert.isDefined(helpersAssign.child);
      const helpersRhs = helpersAssign.child[1];
      const variables = new Map<string, string[]>([
        ['_helper_sources', ['Helper.ts']],
      ]);
      const helperSources = extractStringValues(helpersRhs, variables);
      assert.deepEqual(helperSources, ['Helper.ts', 'Extra.ts']);

      const filteredNode = findTargetNode(gnBuild.ast, 'filtered');
      assert.isDefined(filteredNode);
      assert.isDefined(filteredNode.child);
      const filteredBlock = filteredNode.child[1];
      assert.isDefined(filteredBlock.child);
      const filteredAssign = findAssignments(filteredBlock.child, 'sources')[0];
      assert.isDefined(filteredAssign);
      assert.isDefined(filteredAssign.child);
      const filteredRhs = filteredAssign.child[1];
      const filteredSources = extractStringValues(filteredRhs, variables);
      assert.deepEqual(filteredSources, ['Helper.ts']);
    });

    it('correctly filters out subtracted items in binary minus expressions when present in LHS', () => {
      const variables = new Map<string, string[]>([
        ['_helper_sources', ['Helper.ts', 'Excluded.ts']],
      ]);
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
      assert.isDefined(animationNode);
      assert.isDefined(animationNode.child);
      const block = animationNode.child[1];
      assert.isDefined(block.child);
      const depsAssign = findAssignments(block.child, 'deps')[0];
      assert.isDefined(depsAssign);
      assert.isDefined(depsAssign.child);
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

  describe('extractTargetFromFunctionNode', () => {
    it('returns null for non-FUNCTION node', () => {
      const nonFnNode: GnAstNode = {type: 'BLOCK'};
      assert.isNull(
          extractTargetFromFunctionNode(
              nonFnNode,
              '//base',
              'BUILD.gn',
              new Map(),
              ),
      );
    });

    it('returns null when target name is missing or not LITERAL', () => {
      const fnWithoutArgs: GnAstNode = {
        type: 'FUNCTION',
        value: 'devtools_ui_module',
        child: [
          {type: 'LIST', child: []},
          {type: 'BLOCK', child: []},
        ],
      };
      assert.isNull(
          extractTargetFromFunctionNode(
              fnWithoutArgs,
              '//base',
              'BUILD.gn',
              new Map(),
              ),
      );

      const fnWithNonLiteralArg: GnAstNode = {
        type: 'FUNCTION',
        value: 'devtools_ui_module',
        child: [
          {type: 'LIST', child: [{type: 'IDENTIFIER', value: 'target_name'}]},
          {type: 'BLOCK', child: []},
        ],
      };
      assert.isNull(
          extractTargetFromFunctionNode(
              fnWithNonLiteralArg,
              '//base',
              'BUILD.gn',
              new Map(),
              ),
      );
    });

    it('returns null when block is missing or not a BLOCK', () => {
      const importNode = findFirstNode(
          gnBuild.ast,
          node => node.type === 'FUNCTION' && node.value === 'import' ? node : undefined,
      );
      assert.isDefined(importNode);
      assert.isNull(
          extractTargetFromFunctionNode(
              importNode,
              '//base',
              fixturePath,
              new Map(),
              ),
      );
    });

    it('extracts metadata, sources, and deps from real AST function node', () => {
      const animationNode = findTargetNode(gnBuild.ast, 'animation');
      assert.isDefined(animationNode);

      const targetInfo = extractTargetFromFunctionNode(
          animationNode,
          '//front_end/panels/animation',
          fixturePath,
          new Map(),
      );
      assert.isNotNull(targetInfo);
      assert.strictEqual(
          targetInfo.label,
          '//front_end/panels/animation:animation',
      );
      assert.strictEqual(targetInfo.templateName, 'devtools_ui_module');
      assert.strictEqual(targetInfo.buildFile, fixturePath);
      assert.includeMembers(targetInfo.sources, [
        'AnimationGroupPreviewUI.ts',
        'AnimationTimeline.ts',
        'AnimationUI.ts',
      ]);
      assert.includeMembers(targetInfo.deps, [
        '../../core/common:bundle',
        '../../core/sdk:bundle',
      ]);
      assert.isFalse(targetInfo.testonly);

      const unittestsNode = findTargetNode(gnBuild.ast, 'unittests');
      assert.isDefined(unittestsNode);
      const unittestsInfo = extractTargetFromFunctionNode(
          unittestsNode,
          '//front_end/panels/animation',
          fixturePath,
          new Map(),
      );
      assert.isNotNull(unittestsInfo);
      assert.isTrue(unittestsInfo.testonly);
    });

    it('handles +=, -=, inputs, and entrypoint assignments with local variable resolution', () => {
      const complexNode = findTargetNode(gnBuild.ast, 'complex_assignments');
      assert.isDefined(complexNode);

      const targetInfo = extractTargetFromFunctionNode(
          complexNode,
          '//front_end/panels/animation',
          fixturePath,
          new Map(),
      );
      assert.isNotNull(targetInfo);
      assert.strictEqual(
          targetInfo.label,
          '//front_end/panels/animation:complex_assignments',
      );
      assert.strictEqual(targetInfo.templateName, 'custom_target');
      assert.includeMembers(targetInfo.sources, [
        'local1.ts',
        'local2.ts',
        'input1.json',
        'main.ts',
      ]);
      assert.notInclude(targetInfo.sources, 'excluded.ts');
      assert.deepEqual(targetInfo.deps, [':dep1', ':dep2']);
    });

    it('extracts ts_deps into deps', () => {
      const platformNode = findTargetNode(gnBuild.ast, 'platform');
      assert.isDefined(platformNode);

      const targetInfo = extractTargetFromFunctionNode(
          platformNode,
          '//front_end/core/platform',
          fixturePath,
          new Map(),
      );
      assert.isNotNull(targetInfo);
      assert.strictEqual(
          targetInfo.label,
          '//front_end/core/platform:platform',
      );
      assert.strictEqual(targetInfo.templateName, 'devtools_foundation_module');
      assert.deepEqual(targetInfo.sources, ['HostRuntime.ts']);
      assert.includeMembers(targetInfo.deps, ['./api:bundle']);
    });

    it('handles negative assignment on variables defined in outer/parent scope without local = declaration', () => {
      const parentVariables = new Map<string, string[]>([
        [
          'configs',
          ['//build/config:default', '//build/config/compiler:MyWarningFlags'],
        ],
        ['sources', ['main.cc', 'extra.cc']],
      ]);

      const functionNode: GnAstNode = {
        type: 'FUNCTION',
        value: 'executable',
        child: [
          createAstNode.list([createAstNode.stringLiteral('MyCustomBinary')]),
          {
            type: 'BLOCK',
            child: [
              createAstNode.assignment(
                  'configs',
                  createAstNode.list([
                    createAstNode.stringLiteral(
                        '//build/config/compiler:MyWarningFlags',
                        ),
                  ]),
                  '-=',
                  ),
            ],
          },
        ],
      };

      const targetInfo = extractTargetFromFunctionNode(
          functionNode,
          '//build',
          fixturePath,
          parentVariables,
      );

      assert.isNotNull(targetInfo);
      assert.strictEqual(targetInfo.label, '//build:MyCustomBinary');
      assert.strictEqual(targetInfo.templateName, 'executable');
      assert.deepEqual(targetInfo.sources, ['main.cc', 'extra.cc']);
      // Verify parent scope variables were not mutated
      assert.deepEqual(parentVariables.get('configs'), [
        '//build/config:default',
        '//build/config/compiler:MyWarningFlags',
      ]);
    });
  });

  describe('applyAssignment', () => {
    it('handles = assignment operator and sets values in variables map', () => {
      const variables = new Map<string, string[]>();
      const node = createAstNode.assignment(
          'sources',
          createAstNode.list([
            createAstNode.stringLiteral('a.ts'),
            createAstNode.stringLiteral('b.ts'),
          ]),
          '=',
      );

      const handled = applyAssignment(variables, node);
      assert.isTrue(handled);
      assert.deepEqual(variables.get('sources'), ['a.ts', 'b.ts']);

      // Overwriting existing variable
      const overwriteNode = createAstNode.assignment(
          'sources',
          createAstNode.list([createAstNode.stringLiteral('c.ts')]),
          '=',
      );
      assert.isTrue(applyAssignment(variables, overwriteNode));
      assert.deepEqual(variables.get('sources'), ['c.ts']);
    });

    it('handles += assignment operator and appends values to variables map', () => {
      const variables = new Map<string, string[]>([['deps', [':dep1']]]);
      const node = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':dep2')]),
          '+=',
      );

      const handled = applyAssignment(variables, node);
      assert.isTrue(handled);
      assert.deepEqual(variables.get('deps'), [':dep1', ':dep2']);

      // Appending when variable was not previously set
      const newVarNode = createAstNode.assignment(
          'inputs',
          createAstNode.list([createAstNode.stringLiteral('input.json')]),
          '+=',
      );
      assert.isTrue(applyAssignment(variables, newVarNode));
      assert.deepEqual(variables.get('inputs'), ['input.json']);
    });

    it('handles -= assignment operator and filters values from variables map', () => {
      const variables = new Map<string, string[]>([
        ['sources', ['a.ts', 'b.ts', 'c.ts']],
      ]);
      const node = createAstNode.assignment(
          'sources',
          createAstNode.list([createAstNode.stringLiteral('b.ts')]),
          '-=',
      );

      const handled = applyAssignment(variables, node);
      assert.isTrue(handled);
      assert.deepEqual(variables.get('sources'), ['a.ts', 'c.ts']);

      // Subtracting when variable was not previously set
      const unsetNode = createAstNode.assignment(
          'unknown',
          createAstNode.list([createAstNode.stringLiteral('x.ts')]),
          '-=',
      );
      assert.isTrue(applyAssignment(variables, unsetNode));
      assert.deepEqual(variables.get('unknown'), []);
    });

    it('resolves RHS variable references using existing variables in the map', () => {
      const variables = new Map<string, string[]>([
        ['_shared_sources', ['util.ts', 'common.ts']],
      ]);
      const node = createAstNode.assignment(
          'sources',
          createAstNode.identifier('_shared_sources'),
          '=',
      );

      assert.isTrue(applyAssignment(variables, node));
      assert.deepEqual(variables.get('sources'), ['util.ts', 'common.ts']);
    });

    it('returns false for non-binary nodes', () => {
      const variables = new Map<string, string[]>();
      assert.isFalse(
          applyAssignment(variables, createAstNode.identifier('sources')),
      );
      assert.isFalse(applyAssignment(variables, {type: 'BLOCK'}));
      assert.isFalse(
          applyAssignment(variables, {type: 'FUNCTION', value: 'my_target'}),
      );
    });

    it('returns false for binary nodes with non-assignment operators', () => {
      const variables = new Map<string, string[]>();
      const node = createAstNode.binary(
          '==',
          createAstNode.identifier('a'),
          createAstNode.identifier('b'),
      );
      assert.isFalse(applyAssignment(variables, node));

      const minusNode = createAstNode.binary(
          '-',
          createAstNode.identifier('a'),
          createAstNode.identifier('b'),
      );
      assert.isFalse(applyAssignment(variables, minusNode));
    });

    it('returns false for malformed assignment nodes missing LHS or RHS', () => {
      const variables = new Map<string, string[]>();
      const missingLhs: GnAstNode = {
        type: 'BINARY',
        value: '=',
        child: [undefined as unknown as GnAstNode, createAstNode.list()],
      };
      assert.isFalse(applyAssignment(variables, missingLhs));

      const nonIdentifierLhs: GnAstNode = {
        type: 'BINARY',
        value: '=',
        child: [createAstNode.list(), createAstNode.list()],
      };
      assert.isFalse(applyAssignment(variables, nonIdentifierLhs));

      const missingRhs: GnAstNode = {
        type: 'BINARY',
        value: '=',
        child: [createAstNode.identifier('sources')],
      };
      assert.isFalse(applyAssignment(variables, missingRhs));

      const noChildren: GnAstNode = {
        type: 'BINARY',
        value: '=',
      };
      assert.isFalse(applyAssignment(variables, noChildren));
    });
  });

  describe('findFirstNode', () => {
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
