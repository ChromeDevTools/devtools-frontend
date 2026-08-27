// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {GnBuildFile} from '../../gn_ast/gn_ast.ts';
import {createAstNode} from '../../gn_ast/gn_ast_factory.ts';
import {
  findAssignments,
  findFirstListNode,
  findTargetNode,
} from '../../gn_ast/gn_ast_visitor.ts';

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
});
