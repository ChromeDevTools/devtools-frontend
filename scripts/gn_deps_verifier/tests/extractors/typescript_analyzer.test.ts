// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {TypeScriptAnalyzer} from '../../extractors/typescript_analyzer.ts';
import type {AstTargetInfo} from '../../gn_ast/gn_ast_types.ts';

describe('typescript_analyzer', () => {
  afterEach(() => {
    TypeScriptAnalyzer.clearCacheForTesting();
    sinon.restore();
  });

  describe('getMappedTarget', () => {
    it('maps special third_party codemirror.next targets to public bundle target', () => {
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget('//front_end/third_party/codemirror.next:codemirror.next-compilation'),
          '//front_end/third_party/codemirror.next:bundle',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget('//front_end/third_party/codemirror.next:codemirror.next-sources'),
          '//front_end/third_party/codemirror.next:bundle',
      );
    });

    it('maps special third_party lighthouse targets to public lighthouse target', () => {
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget('//front_end/third_party/lighthouse:lighthouse-locale-files'),
          '//front_end/third_party/lighthouse:lighthouse',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget('//front_end/third_party/lighthouse:lighthouse-javascript-sources-debug'),
          '//front_end/third_party/lighthouse:lighthouse',
      );
      assert.strictEqual(
          TypeScriptAnalyzer.getMappedTarget(
              '//front_end/third_party/lighthouse:lighthouse-javascript-sources-release'),
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
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(targetInfo, '/path/to/repo');
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
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(targetInfo, '/path/to/repo');
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
      };

      const resolved = TypeScriptAnalyzer.resolveTargetSourceFiles(targetInfo, '/path/to/repo');
      assert.deepEqual(resolved, [
        '/path/to/repo/test/dir/file1.ts',
      ]);
    });
  });

  describe('mapImportsToSources', () => {
    it('maps imported files back to the sources that import them', () => {
      const importsMap = new Map<string, string[]>([
        ['/path/fileA.ts', ['/path/shared.ts', '/path/otherA.ts']],
        ['/path/fileB.ts', ['/path/shared.ts', '/path/otherB.ts']],
      ]);

      const result = TypeScriptAnalyzer.mapImportsToSources(importsMap);
      assert.deepEqual(result.get('/path/shared.ts'), ['/path/fileA.ts', '/path/fileB.ts']);
      assert.deepEqual(result.get('/path/otherA.ts'), ['/path/fileA.ts']);
      assert.deepEqual(result.get('/path/otherB.ts'), ['/path/fileB.ts']);
    });

    it('handles empty imports map', () => {
      const result = TypeScriptAnalyzer.mapImportsToSources(new Map());
      assert.strictEqual(result.size, 0);
    });
  });
});
