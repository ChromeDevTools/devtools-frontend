// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {GnAstExtractor, isInsideRoot} from '../../extractors/gn_ast_extractor.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, '../fixtures');
const ROOT_DIR = path.resolve(import.meta.dirname, '../../../../');

describe('GnAstExtractor', () => {
  afterEach(() => {
    GnAstExtractor.clearCacheForTesting();
  });

  describe('create', () => {
    it('throws if rootDir is not provided on first initialization', () => {
      assert.throws(
          () => GnAstExtractor.create(),
          /rootDir is required for first initialization/,
      );
    });

    it('returns a singleton instance', () => {
      const instance1 = GnAstExtractor.create(ROOT_DIR);
      const instance2 = GnAstExtractor.create();
      assert.strictEqual(instance1, instance2);
    });

    it('returns a singleton instance even if rootDir is relative or formatted differently', () => {
      const relRootDir = path.relative(process.cwd(), ROOT_DIR) || '.';
      const instance1 = GnAstExtractor.create(relRootDir);
      const instance2 = GnAstExtractor.create(ROOT_DIR);
      assert.strictEqual(instance1, instance2);
    });

    it('throws if rootDir is different from existing instance', () => {
      GnAstExtractor.create(ROOT_DIR);
      assert.throws(
          () => GnAstExtractor.create('/some/other/dir'),
          /Instance already exists with a different rootDir/,
      );
    });
  });

  describe('getTargetsForFile', () => {
    let extractor: GnAstExtractor;

    beforeEach(() => {
      extractor = GnAstExtractor.create(ROOT_DIR);
    });

    it('returns target label for a file mapped in BUILD.gn', async () => {
      const filePath = path.join(FIXTURES_DIR, 'AnimationTimeline.ts');
      const target = await extractor.getTargetsForFile(filePath);
      assert.deepEqual(target, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
    });

    it('handles relative and unnormalized file paths correctly', async () => {
      const relPath = path.relative(process.cwd(), path.join(FIXTURES_DIR, 'AnimationTimeline.ts'));
      const unnormalizedPath = path.join(FIXTURES_DIR, '../fixtures/AnimationTimeline.ts');

      const targetFromRel = await extractor.getTargetsForFile(relPath);
      const targetFromUnnorm = await extractor.getTargetsForFile(unnormalizedPath);

      assert.deepEqual(targetFromRel, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
      assert.deepEqual(targetFromUnnorm, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
    });

    it('handles GN root-relative // sources correctly', async () => {
      const rootRelPath = path.join(FIXTURES_DIR, 'root_rel.ts');
      const target = await extractor.getTargetsForFile(rootRelPath);
      assert.deepEqual(target, ['//scripts/gn_deps_verifier/tests/fixtures:root_rel_target']);
    });

    it('deduplicates concurrent queries for the same BUILD.gn file', async () => {
      const file1 = path.join(FIXTURES_DIR, 'AnimationGroupPreviewUI.ts');
      const file2 = path.join(FIXTURES_DIR, 'AnimationTimeline.ts');
      const file3 = path.join(FIXTURES_DIR, 'AnimationUI.ts');

      const [res1, res2, res3] = await Promise.all([
        extractor.getTargetsForFile(file1),
        extractor.getTargetsForFile(file2),
        extractor.getTargetsForFile(file3),
      ]);

      assert.deepEqual(res1, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
      assert.deepEqual(res2, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
      assert.deepEqual(res3, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
    });

    it('returns target label for entrypoint files mapped via entrypoint assignment', async () => {
      const entryFilePath = path.join(FIXTURES_DIR, 'animation.ts');
      const target = await extractor.getTargetsForFile(entryFilePath);
      assert.deepEqual(target, ['//scripts/gn_deps_verifier/tests/fixtures:bundle']);
    });

    it('caches the target and returns the same value subsequently without re-parsing', async () => {
      const filePath = path.join(FIXTURES_DIR, 'AnimationUI.ts');
      const target1 = await extractor.getTargetsForFile(filePath);
      const target2 = await extractor.getTargetsForFile(filePath);

      assert.isNotEmpty(target1);
      assert.deepEqual(target1, target2);
    });

    it('returns empty array if file is not listed in any target sources', async () => {
      // The file doesn't need to physically exist because findNearestBuildGn resolves up the tree
      const noTargetFile = path.join(FIXTURES_DIR, 'ExistentButUnlisted.ts');
      const target = await extractor.getTargetsForFile(noTargetFile);
      assert.deepEqual(target, []);
    });

    it('finds targets mapped via variables and subtractions in BUILD.gn', async () => {
      const subPath = path.join(FIXTURES_DIR, 'sub.ts');
      const subTarget = await extractor.getTargetsForFile(subPath);
      assert.deepEqual(subTarget, ['//scripts/gn_deps_verifier/tests/fixtures:subtraction_target']);
    });
  });

  describe('findNearestBuildGn', () => {
    let extractor: GnAstExtractor;

    beforeEach(() => {
      extractor = GnAstExtractor.create(ROOT_DIR);
    });

    it('returns self cached BUILD.gn for a directory instead of parent cached BUILD.gn', async () => {
      const parentDir = path.join(ROOT_DIR, 'front_end/core/platform');
      const childDir = path.join(ROOT_DIR, 'front_end/core/platform/api');

      const childBuildGn = await extractor.findNearestBuildGnForTesting(childDir);
      assert.strictEqual(childBuildGn, path.join(childDir, 'BUILD.gn'));

      const parentBuildGn = await extractor.findNearestBuildGnForTesting(parentDir);
      assert.strictEqual(parentBuildGn, path.join(parentDir, 'BUILD.gn'));

      const cachedChildBuildGn = await extractor.findNearestBuildGnForTesting(childDir);
      assert.strictEqual(cachedChildBuildGn, path.join(childDir, 'BUILD.gn'));
    });
  });

  describe('extractTargetsFromAst', () => {
    let extractor: GnAstExtractor;

    beforeEach(() => {
      extractor = GnAstExtractor.create(ROOT_DIR);
    });

    it('finds all BUILD.gn files in directory and populates cache', async () => {
      await extractor.extractTargetsFromAst([FIXTURES_DIR]);

      // Since it parsed everything in FIXTURES_DIR, getting target should not result in a new parse.
      // Additionally, we can check a known flaw/bug in the current design:
      // Helper.ts is in _helper_sources, used by both 'helpers' and 'filtered'.
      // The GnBuildFile parses all targets and appends multiple mappings for a single file.
      const target = await extractor.getTargetsForFile(
          path.join(FIXTURES_DIR, 'Helper.ts'),
      );
      assert.deepEqual(
          target,
          [
            '//scripts/gn_deps_verifier/tests/fixtures:helpers',
            '//scripts/gn_deps_verifier/tests/fixtures:filtered',
          ],
      );
    });

    it('ignores errors for non-existent directories gracefully', async () => {
      const fakeDir = path.join(FIXTURES_DIR, 'does_not_exist_xyz123');
      await extractor.extractTargetsFromAst([fakeDir]);

      // Ensure we didn't throw and state is still usable
      const target = await extractor.getTargetsForFile(path.join(FIXTURES_DIR, 'AnimationTimeline.ts'));
      assert.deepEqual(target, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
    });

    it('safely skips node_modules and out directories when walking', async () => {
      await extractor.extractTargetsFromAst([path.join(ROOT_DIR, 'node_modules')]);
      const target = await extractor.getTargetsForFile(path.join(ROOT_DIR, 'node_modules/some_fake_file.ts'));
      assert.deepEqual(target, []);
    });

    it('clears GnBuildFile cache as well when clearing cache for testing', async () => {
      const filePath = path.join(FIXTURES_DIR, 'AnimationTimeline.ts');
      await extractor.getTargetsForFile(filePath);
      assert.isNotEmpty(extractor.buildFiles);

      GnAstExtractor.clearCacheForTesting();
      const newExtractor = GnAstExtractor.create(ROOT_DIR);
      assert.isEmpty(newExtractor.buildFiles);
    });

    it('finds enclosing BUILD.gn when extractTargetsFromAst is called on a subfolder without local BUILD.gn',
       async () => {
         // In tests/fixtures, there are files but no subfolder with BUILD.gn.
         // Calling extractTargetsFromAst on a path inside fixtures resolves the ancestor BUILD.gn
         const subDirPath = path.join(FIXTURES_DIR, 'components');
         await extractor.extractTargetsFromAst([subDirPath]);

         const target = await extractor.getTargetsForFile(path.join(FIXTURES_DIR, 'AnimationTimeline.ts'));
         assert.deepEqual(target, ['//scripts/gn_deps_verifier/tests/fixtures:animation']);
       });
  });

  describe('isInsideRoot', () => {
    it('returns true for files and directories inside root', () => {
      assert.isTrue(isInsideRoot(ROOT_DIR, path.join(ROOT_DIR, 'front_end')));
      assert.isTrue(isInsideRoot(ROOT_DIR, path.join(ROOT_DIR, 'front_end/ui/legacy')));
    });

    it('returns true for the root directory itself', () => {
      assert.isTrue(isInsideRoot(ROOT_DIR, ROOT_DIR));
    });

    it('returns true for files or directories starting with .. inside root', () => {
      assert.isTrue(isInsideRoot(ROOT_DIR, path.join(ROOT_DIR, '..foo')));
      assert.isTrue(isInsideRoot(ROOT_DIR, path.join(ROOT_DIR, '..foo/bar.ts')));
    });

    it('returns false for parent or ancestor directories outside root', () => {
      assert.isFalse(isInsideRoot(ROOT_DIR, path.dirname(ROOT_DIR)));
      assert.isFalse(isInsideRoot(ROOT_DIR, path.resolve(ROOT_DIR, '../..')));
    });

    it('returns false for sibling directories outside root', () => {
      assert.isFalse(isInsideRoot(ROOT_DIR, path.resolve(ROOT_DIR, '../sibling')));
    });
  });
});
