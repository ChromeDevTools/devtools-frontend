// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';
import sinon from 'sinon';

import {TypeScriptAnalyzer} from '../../extractors/typescript_analyzer.ts';
import type {AstTargetInfo} from '../../gn_ast/gn_ast_types.ts';

const ROOT_DIR = path.resolve(import.meta.dirname, './../../../');

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
});
