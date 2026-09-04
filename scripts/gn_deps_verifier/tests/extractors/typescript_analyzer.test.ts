// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';
import sinon from 'sinon';

import {GnAstExtractor} from '../../extractors/gn_ast_extractor.ts';
import {TypeScriptAnalyzer} from '../../extractors/typescript_analyzer.ts';
import {TypeScriptImportExtractor} from '../../extractors/typescript_import.ts';
import type {AstTargetInfo} from '../../gn_ast/gn_ast_types.ts';

const ROOT_DIR = path.resolve(import.meta.dirname, '../../../../');
const FIXTURES_DIR = path.join(import.meta.dirname, './../fixtures/typescript_analyzer');
const FIXTURES_BUILD_GN = path.join(FIXTURES_DIR, 'BUILD.gn');

describe('typescript_analyzer', () => {
  afterEach(() => {
    TypeScriptAnalyzer.clearCacheForTesting();
    sinon.restore();
  });

  describe('getMappedTarget', () => {
    it('maps special third_party codemirror.next targets to public bundle target', () => {
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/codemirror.next:codemirror.next-compilation',
              ),
          '//front_end/third_party/codemirror.next:bundle',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/codemirror.next:codemirror.next-sources',
              ),
          '//front_end/third_party/codemirror.next:bundle',
      );
    });

    it('maps special third_party lighthouse targets to public lighthouse target', () => {
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/lighthouse:lighthouse-locale-files',
              ),
          '//front_end/third_party/lighthouse:lighthouse',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/lighthouse:lighthouse-javascript-sources-debug',
              ),
          '//front_end/third_party/lighthouse:lighthouse',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/lighthouse:lighthouse-javascript-sources-release',
              ),
          '//front_end/third_party/lighthouse:lighthouse',
      );
    });

    it('returns regular target unchanged', () => {
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget('//front_end/core/common:bundle'),
          '//front_end/core/common:bundle',
      );
    });
  });

  describe('isTypeScriptSource', () => {
    it('returns true for .ts and .js files', () => {
      assert.isTrue(TypeScriptAnalyzer.isTypeScriptSource('foo.ts'));
      assert.isTrue(TypeScriptAnalyzer.isTypeScriptSource('foo.js'));
      assert.isTrue(TypeScriptAnalyzer.isTypeScriptSource('foo.d.ts'));
    });

    it('returns false for non-TypeScript sources', () => {
      assert.isFalse(TypeScriptAnalyzer.isTypeScriptSource('style.css'));
      assert.isFalse(TypeScriptAnalyzer.isTypeScriptSource('template.html'));
      assert.isFalse(TypeScriptAnalyzer.isTypeScriptSource('data.json'));
      assert.isFalse(TypeScriptAnalyzer.isTypeScriptSource('icon.svg'));
      assert.isFalse(TypeScriptAnalyzer.isTypeScriptSource('README'));
    });
  });

  describe('resolveTargetSourceFiles', () => {
    it('resolves relative sources against buildFile directory and filters non-ts files', () => {
      const targetInfo: AstTargetInfo = {
        label: '//test/dir:target',
        templateName: 'devtools_module',
        buildFile: '/path/to/repo/test/dir/BUILD.gn',
        sources: ['file1.ts', 'file2.js', 'style.css', 'data.json'],
        deps: [],
        testonly: false,
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(
          targetInfo,
          '/path/to/repo',
      );
      assert.deepEqual(resolved, [
        '/path/to/repo/test/dir/file1.ts',
        '/path/to/repo/test/dir/file2.js',
      ]);
    });

    it('resolves GN root-relative // sources against rootDir', () => {
      const targetInfo: AstTargetInfo = {
        label: '//test/dir:target',
        templateName: 'devtools_module',
        buildFile: '/path/to/repo/test/dir/BUILD.gn',
        sources: ['//front_end/core/common.ts', 'local.ts'],
        deps: [],
        testonly: false,
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(
          targetInfo,
          '/path/to/repo',
      );
      assert.deepEqual(resolved, [
        '/path/to/repo/front_end/core/common.ts',
        '/path/to/repo/test/dir/local.ts',
      ]);
    });

    it('deduplicates source files', () => {
      const targetInfo: AstTargetInfo = {
        label: '//test/dir:target',
        templateName: 'devtools_module',
        buildFile: '/path/to/repo/test/dir/BUILD.gn',
        sources: ['file1.ts', 'file1.ts', './file1.ts'],
        deps: [],
        testonly: false,
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(
          targetInfo,
          '/path/to/repo',
      );
      assert.deepEqual(resolved, ['/path/to/repo/test/dir/file1.ts']);
    });
  });

  describe('mapImportsToSources', () => {
    it('maps imported files back to the sources that import them', () => {
      const importsMap = new Map<string, string[]>([
        ['/path/fileA.ts', ['/path/shared.ts', '/path/otherA.ts']],
        ['/path/fileB.ts', ['/path/shared.ts', '/path/otherB.ts']],
      ]);

      const result = TypeScriptAnalyzer.mapImportsToSources(importsMap);
      assert.deepEqual(result.get('/path/shared.ts'), [
        '/path/fileA.ts',
        '/path/fileB.ts',
      ]);
      assert.deepEqual(result.get('/path/otherA.ts'), ['/path/fileA.ts']);
      assert.deepEqual(result.get('/path/otherB.ts'), ['/path/fileB.ts']);
    });

    it('handles empty imports map', () => {
      const result = TypeScriptAnalyzer.mapImportsToSources(new Map());
      assert.strictEqual(result.size, 0);
    });
  });
  describe('isConsumerTarget', () => {
    it('returns false for implementation module even when target name differs from directory name', () => {
      const targetInfo: AstTargetInfo = {
        label: '//front_end/entrypoints/worker_app:worker_main',
        templateName: 'devtools_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['WorkerMain.ts'],
        deps: [],
        testonly: false,
      };
      assert.isFalse(
          TypeScriptAnalyzer.isConsumerTarget(targetInfo.label, targetInfo),
      );
    });

    it('returns false for standard devtools_ui_module and devtools_foundation_module', () => {
      const uiModule: AstTargetInfo = {
        label: '//front_end/panels/animation:animation',
        templateName: 'devtools_ui_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['AnimationTimeline.ts'],
        deps: [],
        testonly: false,
      };
      assert.isFalse(
          TypeScriptAnalyzer.isConsumerTarget(uiModule.label, uiModule),
      );

      const foundationModule: AstTargetInfo = {
        label: '//front_end/core/platform:platform',
        templateName: 'devtools_foundation_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['platform.ts'],
        deps: [],
        testonly: false,
      };
      assert.isFalse(
          TypeScriptAnalyzer.isConsumerTarget(
              foundationModule.label,
              foundationModule,
              ),
      );
    });

    it('returns true when targetInfo.testonly is true', () => {
      const unittestTarget: AstTargetInfo = {
        label: '//front_end/panels/animation:unittests',
        templateName: 'devtools_ui_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['AnimationTimeline.test.ts'],
        deps: [],
        testonly: true,
      };
      assert.isTrue(
          TypeScriptAnalyzer.isConsumerTarget(
              unittestTarget.label,
              unittestTarget,
              ),
      );

      const helperTarget: AstTargetInfo = {
        label: '//front_end/panels/animation:helper_module',
        templateName: 'devtools_ui_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['HelperModule.ts'],
        deps: [],
        testonly: true,
      };
      assert.isTrue(
          TypeScriptAnalyzer.isConsumerTarget(helperTarget.label, helperTarget),
      );
    });

    it('returns true for meta entrypoint targets', () => {
      const metaTarget: AstTargetInfo = {
        label: '//front_end/panels/animation:meta',
        templateName: 'devtools_entrypoint',
        buildFile: '/path/to/BUILD.gn',
        sources: ['animation-meta.ts'],
        deps: [],
        testonly: false,
      };
      assert.isTrue(
          TypeScriptAnalyzer.isConsumerTarget(metaTarget.label, metaTarget),
      );
    });

    it('returns false for bundle entrypoint', () => {
      const bundleTarget: AstTargetInfo = {
        label: '//front_end/panels/animation:bundle',
        templateName: 'devtools_entrypoint',
        buildFile: '/path/to/BUILD.gn',
        sources: ['animation.ts'],
        deps: [],
        testonly: false,
      };
      assert.isFalse(
          TypeScriptAnalyzer.isConsumerTarget(bundleTarget.label, bundleTarget),
      );
    });
  });

  describe('computeTargetDepsDiff', () => {
    it('normalizes formats and computes missing and unused dependencies', () => {
      const targetInfo: AstTargetInfo = {
        label: '//front_end/panels/animation:animation',
        templateName: 'devtools_ui_module',
        buildFile: path.join(ROOT_DIR, 'front_end/panels/animation/BUILD.gn'),
        sources: ['AnimationTimeline.ts'],
        deps: [
          '../../core/common:bundle',
          ':css_files',
          '../../core/unused:bundle',
        ],
        testonly: false,
      };

      const requiredDeps = new Set([
        '//front_end/core/common:bundle',
        '//front_end/panels/animation:css_files',
        '//front_end/core/host:bundle',
      ]);

      const diff = TypeScriptAnalyzer.computeTargetDepsDiff(
          targetInfo,
          requiredDeps,
          ROOT_DIR,
      );

      assert.deepEqual(diff.missingDeps, ['../../core/host:bundle']);
      assert.deepEqual(diff.unusedDeps, ['../../core/unused:bundle']);
    });

    it('returns empty missing and unused deps when deps perfectly match', () => {
      const targetInfo: AstTargetInfo = {
        label: '//front_end/panels/animation:animation',
        templateName: 'devtools_ui_module',
        buildFile: path.join(ROOT_DIR, 'front_end/panels/animation/BUILD.gn'),
        sources: ['AnimationTimeline.ts'],
        deps: ['../../core/common:bundle'],
        testonly: false,
      };

      const requiredDeps = new Set(['//front_end/core/common:bundle']);
      const diff = TypeScriptAnalyzer.computeTargetDepsDiff(
          targetInfo,
          requiredDeps,
          ROOT_DIR,
      );

      assert.deepEqual(diff.missingDeps, []);
      assert.deepEqual(diff.unusedDeps, []);
    });

    it('handles required dependencies with missing implicit target names', () => {
      const targetInfo: AstTargetInfo = {
        label: '//front_end/panels/animation:animation',
        templateName: 'devtools_ui_module',
        buildFile: path.join(ROOT_DIR, 'front_end/panels/animation/BUILD.gn'),
        sources: ['AnimationTimeline.ts'],
        deps: ['../../core/common:bundle'],
        testonly: false,
      };

      const requiredDeps = new Set([
        '//front_end/core/common:bundle',
        '//front_end/core/host',  // Missing implicit target name
      ]);

      const diff = TypeScriptAnalyzer.computeTargetDepsDiff(
          targetInfo,
          requiredDeps,
          ROOT_DIR,
      );

      assert.deepEqual(diff.missingDeps, ['../../core/host']);
      assert.deepEqual(diff.unusedDeps, []);
    });
  });
  describe('resolveImportDependencies', () => {
    let extractor: GnAstExtractor;
    let analyzer: TypeScriptAnalyzer;

    beforeEach(() => {
      extractor = GnAstExtractor.create(ROOT_DIR);
      analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
    });

    it('returns failure when imported file does not map to any target', async () => {
      sinon.stub(console, 'error');
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//test:target',
        templateName: 'devtools_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['main.ts'],
        deps: [],
      };

      const res = await analyzer.resolveImportDependencies(
          '/non/existent/imported/file.ts',
          ['main.ts'],
          '//test:target',
          targetInfo,
      );

      assert.isFalse(res.success);
      assert.deepEqual(res.deps, []);
    });

    it('returns empty deps for internal imports within the same target', async () => {
      const animFile = path.join(FIXTURES_DIR, 'AnimationTimeline.ts');
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:animation',
        templateName: 'devtools_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.ts'],
        deps: [],
      };

      await extractor.getTargetsForFile(animFile);

      const res = await analyzer.resolveImportDependencies(
          animFile,
          ['AnimationUI.ts'],
          '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:animation',
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, []);
    });

    it('includes bundle dependency for consumer targets', async () => {
      const bundleFile = path.join(FIXTURES_DIR, 'animation.ts');
      await extractor.getTargetsForFile(bundleFile);

      const targetInfo: AstTargetInfo = {
        label: '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:unittests',
        templateName: 'devtools_ui_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.test.ts'],
        deps: [],
        testonly: true,
      };

      const res = await analyzer.resolveImportDependencies(
          bundleFile,
          ['AnimationTimeline.test.ts'],
          '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:unittests',
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, ['//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle']);
    });

    it('does not allow target to depend on itself when mapped target equals targetLabel', async () => {
      // Simulate an internal file that maps to codemirror.next-compilation being analyzed inside codemirror.next:bundle
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//front_end/third_party/codemirror.next:bundle',
        templateName: 'devtools_entrypoint',
        buildFile: '/path/to/BUILD.gn',
        sources: ['bundle.ts'],
        deps: [],
      };

      sinon.stub(extractor, 'getTargetsForFile').resolves([
        '//front_end/third_party/codemirror.next:codemirror.next-compilation',
      ]);

      const res = await analyzer.resolveImportDependencies(
          '/path/to/internal.ts',
          ['bundle.ts'],
          '//front_end/third_party/codemirror.next:bundle',
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, []);
    });

    it('does not allow bundle target to depend on its own bundle', async () => {
      const bundleFile = path.join(FIXTURES_DIR, 'animation.ts');
      await extractor.getTargetsForFile(bundleFile);

      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle',
        templateName: 'devtools_entrypoint',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['animation.ts'],
        deps: [],
      };

      const res = await analyzer.resolveImportDependencies(
          bundleFile,
          ['animation.ts'],
          '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle',
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, []);
    });

    it('does not require own bundle for implementation module when name differs from directory', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//front_end/entrypoints/worker_app:worker_main',
        templateName: 'devtools_module',
        buildFile: '/path/to/BUILD.gn',
        sources: ['WorkerMain.ts'],
        deps: [],
      };

      sinon.stub(extractor, 'getTargetsForFile').resolves([
        '//front_end/entrypoints/worker_app:bundle',
      ]);

      const res = await analyzer.resolveImportDependencies(
          '/path/to/other.ts',
          ['WorkerMain.ts'],
          targetInfo.label,
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, []);
    });

    it('deduplicates multiple mapped targets', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//test:consumer',
        templateName: 'devtools_ui_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['consumer.ts'],
        deps: [],
      };

      // Both map to //front_end/third_party/codemirror.next:bundle
      sinon.stub(extractor, 'getTargetsForFile').resolves([
        '//front_end/third_party/codemirror.next:codemirror.next-compilation',
        '//front_end/third_party/codemirror.next:codemirror.next-sources',
      ]);

      const res = await analyzer.resolveImportDependencies(
          '/path/to/file.ts',
          ['consumer.ts'],
          '//test:consumer',
          targetInfo,
      );

      assert.isTrue(res.success);
      assert.deepEqual(res.deps, ['//front_end/third_party/codemirror.next:bundle']);
    });
  });

  describe('analyzeTarget', () => {
    let analyzer: TypeScriptAnalyzer;

    beforeEach(() => {
      analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
    });

    it('returns null for legacy_test_runner targets', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//front_end/legacy_test_runner/common:common',
        templateName: 'devtools_module',
        buildFile: '/path/BUILD.gn',
        sources: ['file.ts'],
        deps: [],
      };

      const res = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.isNull(res);
    });

    it('returns null for third_party targets', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//front_end/third_party/codemirror:codemirror',
        templateName: 'devtools_module',
        buildFile: '/path/BUILD.gn',
        sources: ['file.ts'],
        deps: [],
      };

      const res = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.isNull(res);
    });

    it('returns null when target has no TypeScript sources', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//test:css_target',
        templateName: 'generate_css',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['style.css'],
        deps: [],
      };

      const res = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.isNull(res);
    });

    it('returns null when target import cannot be mapped to a GN target', async () => {
      sinon.stub(console, 'error');
      const extractor = GnAstExtractor.create(ROOT_DIR);
      sinon.stub(extractor, 'getTargetsForFile').resolves([]);

      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//test:broken',
        templateName: 'devtools_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.ts'],
        deps: [],
      };

      const res = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.isNull(res);
    });

    it('evicts from cache when an exception occurs', async () => {
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//test:error',
        templateName: 'devtools_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.ts'],
        deps: [],
      };

      const importExtractor = TypeScriptImportExtractor.create();
      sinon.stub(importExtractor, 'extractTsImports').rejects(new Error('I/O failure'));

      try {
        await analyzer.analyzeTarget(targetInfo.label, targetInfo);
        assert.fail('Expected exception');
      } catch (err) {
        assert.strictEqual((err as Error).message, 'I/O failure');
      }

      assert.isFalse(analyzer.targetDeps.has(targetInfo.label));
    });
  });

  describe('analyze', () => {
    it('analyzes fixture targets and resolves required dependencies', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const result = await analyzer.analyze([FIXTURES_BUILD_GN]);

      assert.isAbove(result.size, 0);

      // animation target has only internal imports
      const animDeps = result.get('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:animation');
      assert.isDefined(animDeps);
      assert.isFalse(animDeps?.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle'));

      // bundle target imports animation.ts which imports AnimationTimeline.ts (in :animation)
      const bundleDeps = result.get('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle');
      assert.isDefined(bundleDeps);
      assert.isTrue(bundleDeps?.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:animation'));
      assert.isFalse(bundleDeps?.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle'));

      // unittests target imports animation.ts (in :bundle)
      const testDeps = result.get('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:unittests');
      assert.isDefined(testDeps);
      assert.isTrue(testDeps?.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle'));
    });

    it('does not require own bundle for non-consumer targets', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const result = await analyzer.analyze([FIXTURES_BUILD_GN]);

      const animDeps = result.get('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:animation');
      assert.isDefined(animDeps);
      assert.isFalse(animDeps?.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:bundle'));
    });

    it('ignores legacy_test_runner and third_party targets', async () => {
      const extractor = GnAstExtractor.create(ROOT_DIR);
      await extractor.extractTargetsFromAst([FIXTURES_BUILD_GN]);

      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const result = await analyzer.analyze();

      for (const target of result.keys()) {
        assert.isFalse(target.includes('/legacy_test_runner/'));
        assert.isFalse(target.includes('/third_party/'));
      }
    });

    it('handles targets with no TS sources without error', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const result = await analyzer.analyze([FIXTURES_BUILD_GN]);

      assert.isFalse(result.has('//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:css_files'));
    });

    it('handles empty buildFiles gracefully', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const result = await analyzer.analyze();
      assert.strictEqual(result.size, 0);
    });
  });

  describe('TypeScriptAnalyzer class', () => {
    it('creates singleton instance with rootDir', () => {
      const a1 = TypeScriptAnalyzer.create(ROOT_DIR);
      const a2 = TypeScriptAnalyzer.create();
      assert.strictEqual(a1, a2);
      assert.strictEqual(a1.rootDir, ROOT_DIR);
    });

    it('throws error if created without rootDir on first initialization', () => {
      assert.throws(() => {
        TypeScriptAnalyzer.create();
      }, 'rootDir is required for first initialization');
    });

    it('throws error if created with conflicting rootDir', () => {
      TypeScriptAnalyzer.create(ROOT_DIR);
      assert.throws(() => {
        TypeScriptAnalyzer.create('/some/other/path');
      }, 'Instance already exists with a different rootDir');
    });

    it('caches target dependencies in targetDeps', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:unittests',
        templateName: 'devtools_ui_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.test.ts'],
        deps: [],
      };

      const deps = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.isNotNull(deps);
      assert.strictEqual(await analyzer.targetDeps.get(targetInfo.label), deps);

      // Subsequent call returns the cached set directly
      const cachedDeps = await analyzer.analyzeTarget(targetInfo.label, targetInfo);
      assert.strictEqual(cachedDeps, deps);
    });

    it('deduplicates in-flight concurrent calls to analyzeTarget', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      const targetInfo: AstTargetInfo = {
        testonly: false,
        label: '//scripts/gn_deps_verifier/tests/fixtures/typescript_analyzer:unittests',
        templateName: 'devtools_ui_module',
        buildFile: FIXTURES_BUILD_GN,
        sources: ['AnimationTimeline.test.ts'],
        deps: [],
      };

      const p1 = analyzer.analyzeTarget(targetInfo.label, targetInfo);
      const p2 = analyzer.analyzeTarget(targetInfo.label, targetInfo);

      const [r1, r2] = await Promise.all([p1, p2]);
      assert.strictEqual(r1, r2);
    });

    it('processes build file by filepath and caches in buildFiles', async () => {
      const analyzer = TypeScriptAnalyzer.create(ROOT_DIR);
      await analyzer.processBuildFile(FIXTURES_BUILD_GN);

      assert.isTrue(analyzer.buildFiles.has(FIXTURES_BUILD_GN));
      const cached = analyzer.buildFiles.get(FIXTURES_BUILD_GN);
      assert.isDefined(cached);

      // Calling processBuildFile again returns the cached promise
      await analyzer.processBuildFile(FIXTURES_BUILD_GN);
      assert.strictEqual(analyzer.buildFiles.get(FIXTURES_BUILD_GN), cached);
    });

    it('clears all extractor caches on clearCacheForTesting', () => {
      const a1 = TypeScriptAnalyzer.create(ROOT_DIR);
      const e1 = GnAstExtractor.create(ROOT_DIR);
      const i1 = TypeScriptImportExtractor.create();

      TypeScriptAnalyzer.clearCacheForTesting();

      const a2 = TypeScriptAnalyzer.create(ROOT_DIR);
      const e2 = GnAstExtractor.create(ROOT_DIR);
      const i2 = TypeScriptImportExtractor.create();

      assert.notStrictEqual(a1, a2);
      assert.notStrictEqual(e1, e2);
      assert.notStrictEqual(i1, i2);
    });
  });
});
