// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {compareAssignmentPriority, GnBuildFile} from '../../gn_ast/gn_ast.ts';
import {createAstNode} from '../../gn_ast/gn_ast_factory.ts';
import type {GnAstNode} from '../../gn_ast/gn_ast_types.ts';
import {
  extractStringValues,
  findAssignments,
  findFirstListNode,
  findTargetNode,
} from '../../gn_ast/gn_ast_visitor.ts';
import {GnLabel} from '../../utils/gn_label.ts';

describe('GnBuildFile', () => {
  const rootDir = path.resolve(import.meta.dirname, '../../../../');
  const fixturePath = path.resolve(import.meta.dirname, '../fixtures/BUILD.gn');

  beforeEach(() => {
    GnBuildFile.clearCache();
  });

  describe('from', () => {
    it('parses a real BUILD.gn file and extracts target metadata', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      assert.isDefined(gnBuild.ast);
      assert.strictEqual(gnBuild.filePath, fixturePath);

      // Verify extracted targets
      const animationTarget = Array.from(gnBuild.targets.values()).find(t => t.label.endsWith(':animation'));
      assert.isDefined(animationTarget);
      assert.strictEqual(animationTarget.templateName, 'devtools_ui_module');
      assert.includeMembers(animationTarget.sources, [
        'AnimationGroupPreviewUI.ts',
        'AnimationTimeline.ts',
        'AnimationUI.ts',
      ]);
      assert.includeMembers(animationTarget.deps, [
        '../../core/common:bundle',
        '../../core/sdk:bundle',
      ]);

      const bundleTarget = Array.from(gnBuild.targets.values()).find(t => t.label.endsWith(':bundle'));
      assert.isDefined(bundleTarget);
      assert.strictEqual(bundleTarget.templateName, 'devtools_entrypoint');
      assert.deepEqual(bundleTarget.sources, ['animation.ts']);
      assert.deepEqual(bundleTarget.deps, [':animation', ':css_files']);

      const metaTarget = Array.from(gnBuild.targets.values()).find(t => t.label.endsWith(':meta'));
      assert.isDefined(metaTarget);
      assert.strictEqual(metaTarget.templateName, 'devtools_entrypoint');
      assert.deepEqual(metaTarget.sources, ['animation-meta.ts']);
      assert.includeMembers(metaTarget.deps, [
        ':bundle',
        '../../core/common:bundle',
      ]);
    });

    it('correctly extracts entrypoint into target sources for entrypoint targets', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const bundleTarget = Array.from(gnBuild.targets.values()).find(t => t.label.endsWith(':bundle'));
      assert.isDefined(bundleTarget);
      assert.include(bundleTarget.sources, 'animation.ts');

      const metaTarget = Array.from(gnBuild.targets.values()).find(t => t.label.endsWith(':meta'));
      assert.isDefined(metaTarget);
      assert.include(metaTarget.sources, 'animation-meta.ts');
    });

    it('caches parsed instances and reuses them', async () => {
      const first = await GnBuildFile.from(fixturePath, rootDir);
      const second = await GnBuildFile.from(fixturePath, rootDir);

      assert.strictEqual(first, second);
    });

    it('clears cache on clearCache()', async () => {
      const first = await GnBuildFile.from(fixturePath, rootDir);
      GnBuildFile.clearCache();
      const second = await GnBuildFile.from(fixturePath, rootDir);

      assert.notStrictEqual(first, second);
    });

    it('throws error when file does not exist', async () => {
      const missingBuildPath = path.resolve(
          import.meta.dirname,
          '../fixtures/missing_BUILD.gn',
      );
      try {
        await GnBuildFile.from(missingBuildPath, rootDir);
        assert.fail('Expected to throw');
      } catch (err) {
        assert.include((err as Error).message, 'BUILD.gn file not found');
      }
      // Verify from() succeeds on a valid fixture file without manual cache clearing
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);
      assert.isDefined(gnBuild);
      const bundleTarget = Array.from(gnBuild.targets.values())
                               .find(
                                   t => t.label.endsWith(':bundle'),
                               );
      assert.isDefined(bundleTarget);
    });

    it('does not leak target-local variables to top-level variables', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      // Verify that targets following targets with 'sources' or 'deps' assignments
      // did not have their variables overridden by previous targets.
      const helpersTarget = Array.from(gnBuild.targets.values())
                                .find(
                                    t => t.label.endsWith(':helpers'),
                                );
      assert.isDefined(helpersTarget);
      assert.deepEqual(helpersTarget.sources, ['Helper.ts', 'Extra.ts']);

      const filteredTarget = Array.from(gnBuild.targets.values())
                                 .find(
                                     t => t.label.endsWith(':filtered'),
                                 );
      assert.isDefined(filteredTarget);
      assert.deepEqual(filteredTarget.sources, ['Helper.ts']);
    });

    it('computes correct base label for root directory', async () => {
      const fixtureDir = path.dirname(fixturePath);
      const gnBuild = await GnBuildFile.from(fixturePath, fixtureDir);
      const bundleTarget = gnBuild.targets.get('//:bundle');
      assert.isDefined(bundleTarget);
      assert.strictEqual(bundleTarget.label, '//:bundle');
      assert.deepEqual(bundleTarget.sources, ['animation.ts']);
    });

    it('extracts ts_deps from BUILD.gn files', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);
      const platformTarget = Array.from(gnBuild.targets.values())
                                 .find(
                                     t => t.label.endsWith(':platform'),
                                 );
      assert.isDefined(platformTarget);
      assert.strictEqual(
          platformTarget.templateName,
          'devtools_foundation_module',
      );
      assert.deepEqual(platformTarget.sources, ['HostRuntime.ts']);
      assert.includeMembers(platformTarget.deps, ['./api:bundle']);
    });
  });

  describe('writeGnFile', () => {
    let tempDir: string;
    let tempBuildPath: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gn-test-'));
      tempBuildPath = path.join(tempDir, 'BUILD.gn');
      await fs.promises.copyFile(fixturePath, tempBuildPath);
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, {recursive: true, force: true});
    });

    it('writes modified AST back to file and formats properly', async () => {
      const gnBuild = await GnBuildFile.from(tempBuildPath, rootDir);

      const bundleTargetNode = findTargetNode(gnBuild.ast, 'bundle');
      assert.isDefined(bundleTargetNode);
      assert.isDefined(bundleTargetNode.child);
      const block = bundleTargetNode.child[1];
      assert.isDefined(block.child);
      const depsAssign = findAssignments(block.child, 'deps')[0];
      assert.isDefined(depsAssign);
      assert.isDefined(depsAssign.child);
      const listNode = findFirstListNode(depsAssign.child[1]);
      assert.isDefined(listNode);
      assert.isDefined(listNode.child);

      listNode.child = listNode.child.filter(
          item => item.value !== '":css_files"',
      );
      listNode.child.push(createAstNode.stringLiteral(':new_helper'));

      const writeSuccess = await gnBuild.writeGnFile();
      assert.isTrue(writeSuccess);

      // Clear cache and re-parse the modified file from disk
      GnBuildFile.clearCache();
      const reloaded = await GnBuildFile.from(tempBuildPath, rootDir);
      const updatedBundle = Array.from(reloaded.targets.values())
                                .find(
                                    t => t.label.endsWith(':bundle'),
                                );

      assert.isDefined(updatedBundle);
      assert.include(updatedBundle.deps, ':new_helper');
      assert.include(updatedBundle.deps, ':animation');
      assert.notInclude(updatedBundle.deps, ':css_files');
    });
  });

  describe('updateTargetDeps', () => {
    it('removes unused deps and appends missing deps in real AST target', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);
      const currentDir = path.dirname(fixturePath);

      const unusedCssFiles = GnLabel.resolveDeclaredDep(
          ':css_files',
          currentDir,
          rootDir,
      );
      const updated = gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [unusedCssFiles],
        missingDeps: [':new_dependency'],
      });

      assert.isTrue(updated);

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      assert.isDefined(bundleNode);
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const rhs = depsAssign?.child?.[1];

      assert.isDefined(rhs);
      const deps = extractStringValues(rhs as GnAstNode);
      assert.include(deps, ':animation');
      assert.include(deps, ':new_dependency');
      assert.notInclude(deps, ':css_files');
    });

    it('creates a new deps assignment when target has no existing deps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      // css_files target in fixture only has `sources`, no `deps`
      const cssTarget = findTargetNode(gnBuild.ast, 'css_files');
      assert.isDefined(cssTarget);
      const block = cssTarget?.child?.[1];
      assert.isEmpty(findAssignments(block?.child || [], 'deps'));

      const updated = gnBuild.updateTargetDeps('css_files', {
        unusedDeps: [],
        missingDeps: [':css_dep'],
      });

      assert.isTrue(updated);

      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      assert.isDefined(depsAssign);
      assert.strictEqual(depsAssign.type, 'BINARY');
      assert.strictEqual(depsAssign.value, '=');
      assert.deepEqual(
          extractStringValues(depsAssign.child?.[1] as GnAstNode),
          [':css_dep'],
      );
    });

    it('returns false when target is not found in AST', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('non_existent_target', {
        unusedDeps: [],
        missingDeps: [':some_dep'],
      });

      assert.isFalse(updated);
    });

    it('normalizes relative and shorthand labels in options.unusedDeps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [':css_files'],
        missingDeps: [],
      });

      assert.isTrue(updated);

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const deps = extractStringValues(depsAssign?.child?.[1] as GnAstNode);
      assert.notInclude(deps, ':css_files');
      assert.include(deps, ':animation');
    });

    it('handles quote safety for quoted string literals in unusedDeps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('bundle', {
        unusedDeps: ['":css_files"'],
        missingDeps: [],
      });

      assert.isTrue(updated);

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const deps = extractStringValues(depsAssign?.child?.[1] as GnAstNode);
      assert.notInclude(deps, ':css_files');
      assert.include(deps, ':animation');
    });

    it('deduplicates missingDeps against existing deps and duplicates in missingDeps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [],
        missingDeps: [':animation', ':new_unique', ':new_unique', '":new_unique"'],
      });

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const deps = extractStringValues(depsAssign?.child?.[1] as GnAstNode);

      const occurrences = deps.filter(d => d === ':new_unique');
      assert.strictEqual(occurrences.length, 1);

      const animOccurrences = deps.filter(d => d === ':animation');
      assert.strictEqual(animOccurrences.length, 1);
    });

    it('deduplicates missingDeps when labels use different relative/absolute formats', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);
      const currentDir = path.dirname(fixturePath);

      // In fixturePath BUILD.gn, target "bundle" already has:
      // deps = [ ":animation", ":css_files" ]
      const absoluteAnimLabel = GnLabel.resolveDeclaredDep(':animation', currentDir, rootDir);

      gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [],
        missingDeps: [
          absoluteAnimLabel,  // Absolute version of existing relative ':animation'
          ':new_dup_rel',
          GnLabel.resolveDeclaredDep(':new_dup_rel', currentDir, rootDir),  // Absolute version of ':new_dup_rel'
        ],
      });

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const deps = extractStringValues(depsAssign?.child?.[1] as GnAstNode);

      // ':animation' was already present as ':animation', so absoluteAnimLabel should not be added
      assert.notInclude(deps, absoluteAnimLabel);
      const animOccurrences = deps.filter(d => d === ':animation');
      assert.strictEqual(animOccurrences.length, 1);

      // ':new_dup_rel' was added once, absolute version in missingDeps was deduplicated
      const newDupOccurrences = deps.filter(d => d === ':new_dup_rel');
      assert.strictEqual(newDupOccurrences.length, 1);
    });

    it('handles quote safety for quoted string literals in missingDeps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [],
        missingDeps: ['":already_quoted"'],
      });

      const bundleNode = findTargetNode(gnBuild.ast, 'bundle');
      const block = bundleNode?.child?.[1];
      const depsAssign = findAssignments(block?.child || [], 'deps')[0];
      const listNode = findFirstListNode(depsAssign?.child?.[1]);
      assert.isDefined(listNode);

      const rawAddedNode = listNode?.child?.find(c => c.value?.includes(':already_quoted'));
      assert.isDefined(rawAddedNode);
      assert.strictEqual(rawAddedNode?.value, '":already_quoted"');
    });

    it('does not append missing deps into -= subtraction assignments or remove unused deps from -=', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('subtraction_target', {
        unusedDeps: [':keep_dep'],
        missingDeps: [':new_sub_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'subtraction_target');
      const block = targetNode?.child?.[1];
      const assigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(assigns.length, 2);

      const plusAssign = assigns.find(a => a.value === '=');
      assert.isDefined(plusAssign);
      const plusDeps = extractStringValues(plusAssign?.child?.[1] as GnAstNode);
      assert.notInclude(plusDeps, ':keep_dep');
      assert.include(plusDeps, ':new_sub_dep');

      const minusAssign = assigns.find(a => a.value === '-=');
      assert.isDefined(minusAssign);
      const minusDeps = extractStringValues(minusAssign?.child?.[1] as GnAstNode);
      assert.deepEqual(minusDeps, [':sub_dep']);
    });

    it('creates a new += assignment when target only has -= subtraction assignment', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('only_subtraction', {
        unusedDeps: [],
        missingDeps: [':added_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'only_subtraction');
      const block = targetNode?.child?.[1];
      const assigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(assigns.length, 2);

      const newAssign = assigns.find(a => a.value === '+=');
      assert.isDefined(newAssign);
      assert.deepEqual(extractStringValues(newAssign?.child?.[1] as GnAstNode), [':added_dep']);

      const minusAssign = assigns.find(a => a.value === '-=');
      assert.isDefined(minusAssign);
      assert.deepEqual(extractStringValues(minusAssign?.child?.[1] as GnAstNode), [':excluded_dep']);
    });

    it('returns false when no deps are removed or added', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [],
        missingDeps: [],
      });

      assert.isFalse(updated);
    });

    it('returns false when unused deps are not in target and missing deps are already present', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('bundle', {
        unusedDeps: [':non_existent_dep'],
        missingDeps: [':animation', ':css_files'],
      });

      assert.isFalse(updated);
    });

    it('returns false when target has no deps and missingDeps is empty', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('css_files', {
        unusedDeps: [':some_dep'],
        missingDeps: [],
      });

      assert.isFalse(updated);
    });

    it('creates a new += assignment when target has non-list deps assignment', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('variable_deps', {
        unusedDeps: [],
        missingDeps: [':new_var_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'variable_deps');
      const block = targetNode?.child?.[1];
      const assigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(assigns.length, 2);

      const firstAssign = assigns[0];
      assert.strictEqual(firstAssign.value, '=');
      assert.strictEqual(firstAssign.child?.[1]?.type, 'IDENTIFIER');

      const plusAssign = assigns[1];
      assert.strictEqual(plusAssign.value, '+=');
      assert.deepEqual(extractStringValues(plusAssign.child?.[1] as GnAstNode), [':new_var_dep']);
    });

    it('appends to existing += assignment list when deps has non-list = and a list +=', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('variable_plus_assign_deps', {
        unusedDeps: [],
        missingDeps: [':another_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'variable_plus_assign_deps');
      const block = targetNode?.child?.[1];
      const assigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(assigns.length, 2);

      const plusAssign = assigns[1];
      assert.strictEqual(plusAssign.value, '+=');
      assert.deepEqual(
          extractStringValues(plusAssign.child?.[1] as GnAstNode),
          [':explicit_dep', ':another_dep'],
      );
    });

    it('prioritizes appending to = list over += list when both are present', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('complex_assignments', {
        unusedDeps: [],
        missingDeps: [':new_complex_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'complex_assignments');
      const block = targetNode?.child?.[1];
      const assigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(assigns.length, 2);

      // The '=' assignment should have received ':new_complex_dep'
      const equalsAssign = assigns.find(a => a.value === '=');
      assert.isDefined(equalsAssign);
      assert.deepEqual(
          extractStringValues(equalsAssign?.child?.[1] as GnAstNode),
          [':dep1', ':new_complex_dep'],
      );

      // The '+=' assignment should remain untouched
      const plusAssign = assigns.find(a => a.value === '+=');
      assert.isDefined(plusAssign);
      assert.deepEqual(
          extractStringValues(plusAssign?.child?.[1] as GnAstNode),
          [':dep2'],
      );
    });

    it('does not append missing deps into conditional if blocks when top-level deps exists', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('conditional_deps', {
        unusedDeps: [],
        missingDeps: [':new_cond_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'conditional_deps');
      const block = targetNode?.child?.[1];

      // Top-level deps assignment should have received ':new_cond_dep'
      const topLevelAssigns = findAssignments(block?.child || [], 'deps', false);
      assert.strictEqual(topLevelAssigns.length, 1);
      assert.strictEqual(topLevelAssigns[0].value, '=');
      assert.deepEqual(
          extractStringValues(topLevelAssigns[0].child?.[1] as GnAstNode),
          [':base_dep', ':new_cond_dep'],
      );

      // The conditional assignment inside `if (is_chromeos)` should remain unchanged
      const allAssigns = findAssignments(block?.child || [], 'deps');
      const condAssign = allAssigns.find(a => a.value === '+=');
      assert.isDefined(condAssign);
      assert.deepEqual(
          extractStringValues(condAssign?.child?.[1] as GnAstNode),
          [':cros_dep'],
      );
    });

    it('creates a new top-level assignment when target only has conditional deps', async () => {
      const gnBuild = await GnBuildFile.from(fixturePath, rootDir);

      const updated = gnBuild.updateTargetDeps('only_conditional_deps', {
        unusedDeps: [],
        missingDeps: [':new_uncond_dep'],
      });

      assert.isTrue(updated);

      const targetNode = findTargetNode(gnBuild.ast, 'only_conditional_deps');
      const block = targetNode?.child?.[1];

      // A new top-level '=' assignment should be added in block.child
      const topLevelAssigns = findAssignments(block?.child || [], 'deps', false);
      assert.strictEqual(topLevelAssigns.length, 1);
      assert.strictEqual(topLevelAssigns[0].value, '=');
      assert.deepEqual(
          extractStringValues(topLevelAssigns[0].child?.[1] as GnAstNode),
          [':new_uncond_dep'],
      );

      // The conditional assignment inside `if (is_chromeos)` should remain unchanged
      const allAssigns = findAssignments(block?.child || [], 'deps');
      assert.strictEqual(allAssigns.length, 2);
      const condAssign = allAssigns.find(a => a !== topLevelAssigns[0]);
      assert.isDefined(condAssign);
      assert.strictEqual(condAssign?.value, '=');
      assert.deepEqual(
          extractStringValues(condAssign?.child?.[1] as GnAstNode),
          [':cros_dep'],
      );
    });
  });

  describe('compareAssignmentPriority', () => {
    it('ranks = with list higher than += with list', () => {
      const equalsWithList = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':dep')]),
          '=',
      );
      const plusWithList = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':dep')]),
          '+=',
      );

      assert.isBelow(compareAssignmentPriority(equalsWithList, plusWithList), 0);
      assert.isAbove(compareAssignmentPriority(plusWithList, equalsWithList), 0);
    });

    it('ranks += with list higher than = without list', () => {
      const plusWithList = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':dep')]),
          '+=',
      );
      const equalsWithoutList = createAstNode.assignment(
          'deps',
          createAstNode.identifier('_my_deps'),
          '=',
      );

      assert.isBelow(compareAssignmentPriority(plusWithList, equalsWithoutList), 0);
      assert.isAbove(compareAssignmentPriority(equalsWithoutList, plusWithList), 0);
    });

    it('ranks = without list higher than += without list', () => {
      const equalsWithoutList = createAstNode.assignment(
          'deps',
          createAstNode.identifier('_my_deps'),
          '=',
      );
      const plusWithoutList = createAstNode.assignment(
          'deps',
          createAstNode.identifier('_my_deps'),
          '+=',
      );

      assert.isBelow(compareAssignmentPriority(equalsWithoutList, plusWithoutList), 0);
      assert.isAbove(compareAssignmentPriority(plusWithoutList, equalsWithoutList), 0);
    });

    it('sorts mixed assignments in descending priority order', () => {
      const plusWithoutList = createAstNode.assignment(
          'deps',
          createAstNode.identifier('_extra'),
          '+=',
      );
      const equalsWithoutList = createAstNode.assignment(
          'deps',
          createAstNode.identifier('_base'),
          '=',
      );
      const plusWithList = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':b')]),
          '+=',
      );
      const equalsWithList = createAstNode.assignment(
          'deps',
          createAstNode.list([createAstNode.stringLiteral(':a')]),
          '=',
      );

      const sorted = [plusWithoutList, equalsWithoutList, plusWithList, equalsWithList].sort(
          compareAssignmentPriority,
      );

      assert.strictEqual(sorted[0], equalsWithList);
      assert.strictEqual(sorted[1], plusWithList);
      assert.strictEqual(sorted[2], equalsWithoutList);
      assert.strictEqual(sorted[3], plusWithoutList);
    });
  });
});
