// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';

import {createNodeModulesCheck, devtoolsPlugin, esbuildPlugin} from '../devtools_plugin.js';

describe('devtools_plugin can compute paths with', () => {
  const devtoolsRoot = path.resolve(import.meta.dirname, '../../..');
  const genRoot = path.join(devtoolsRoot, 'out/Default/gen');
  const externalFiles = new Set([
    'front_end/core/common/common.js',
    'front_end/core/sdk/sdk.js',
    'front_end/third_party/lighthouse/lighthouse-dt-bundle.js',
  ]);

  it('throws when externalFiles is not provided', () => {
    // @ts-expect-error
    assert.throws(() => devtoolsPlugin('./AnotherFile.js', 'front_end/core/sdk/FirstFile.js'),
                  /requires an externalFiles Set/);
  });

  it('throws when root or genRoot is not provided', () => {
    // @ts-expect-error
    assert.throws(() => devtoolsPlugin('./AnotherFile.js', 'front_end/core/sdk/FirstFile.js', externalFiles),
                  /requires a root path/);
  });

  it('same directory import not in externalFiles', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js');
    assert.deepEqual(
        devtoolsPlugin('./AnotherFile.js', importer, externalFiles, devtoolsRoot, genRoot),
        {
          id: path.join(devtoolsRoot, 'front_end/core/sdk/AnotherFile.js'),
          external: false,
        },
    );
  });

  it('different directory import matching externalFiles', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js');
    assert.deepEqual(
        devtoolsPlugin('../common/common.js', importer, externalFiles, devtoolsRoot, genRoot),
        {
          id: path.join(devtoolsRoot, 'front_end/core/common/common.js'),
          external: true,
        },
    );
  });

  it('node built-in modules', () => {
    assert.deepEqual(devtoolsPlugin('fs', 'scripts/some-script.js', externalFiles, devtoolsRoot, genRoot), {
      id: 'fs',
      external: true,
    });
  });

  it('importing generated files', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js');
    assert.deepEqual(
        devtoolsPlugin('../../generated/protocol.js', importer, externalFiles, devtoolsRoot, genRoot),
        {
          id: path.join(devtoolsRoot, 'front_end/generated/protocol.js'),
          external: false,
        },
    );
  });

  it('importing lighthouse files in externalFiles', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js');
    assert.deepEqual(
        devtoolsPlugin(
            '../../third_party/lighthouse/lighthouse-dt-bundle.js',
            importer,
            externalFiles,
            devtoolsRoot,
            genRoot,
            ),
        {
          id: path.join(devtoolsRoot, 'front_end/third_party/lighthouse/lighthouse-dt-bundle.js'),
          external: true,
        },
    );
  });
});

describe('esbuild_plugin can compute paths with', () => {
  const devtoolsRoot = path.resolve(import.meta.dirname, '../../..');
  const genRoot = path.join(devtoolsRoot, 'out/Default/gen');
  const outdir = path.join(genRoot, 'front_end/core/sdk');
  const externalFiles = new Set([
    'front_end/core/common/common.js',
    'front_end/core/sdk/sdk.js',
    'front_end/panels/timeline/timeline-meta.js',
    'front_end/third_party/lighthouse/lighthouse-dt-bundle.js',
    'front_end/third_party/puppeteer/puppeteer.js',
  ]);
  const plugin = esbuildPlugin(outdir, genRoot, devtoolsRoot, externalFiles);

  it('throws when externalFiles is not provided', () => {
    // @ts-expect-error
    assert.throws(() => esbuildPlugin(outdir, genRoot, devtoolsRoot), /requires an externalFiles Set/);
  });

  it('throws when outdir, genRoot, or rootDir is not provided', () => {
    // @ts-expect-error
    assert.throws(() => esbuildPlugin(undefined, genRoot, devtoolsRoot, externalFiles), /requires an outdir path/);
  });

  it('same directory import not in externalFiles', () => {
    assert.deepEqual(
        plugin({
          path: './AnotherFile.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {path: path.join(devtoolsRoot, 'front_end', 'core', 'sdk', 'AnotherFile.js')},
    );
  });

  it('different directory import in externalFiles', () => {
    assert.deepEqual(
        plugin({
          path: '../common/common.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {
          path: '../common/common.js',
          external: true,
        },
    );
  });

  it('node built-in modules', () => {
    assert.deepEqual(
        plugin({
          path: 'fs',
          importer: path.join(devtoolsRoot, 'scripts/some-script.js'),
        }),
        {path: 'fs', external: true},
    );
  });

  it('codemirror modules', () => {
    assert.deepEqual(
        plugin({
          path: '../../lib/codemirror',
          importer: path.join(devtoolsRoot, 'scripts/some-script.js'),
        }),
        {path: '../../lib/codemirror', external: true},
    );
  });

  it('importing lighthouse files in externalFiles', () => {
    assert.deepEqual(
        plugin({
          path: '../../third_party/lighthouse/lighthouse-dt-bundle.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {
          path: '../../third_party/lighthouse/lighthouse-dt-bundle.js',
          external: true,
        },
    );
  });

  it('importing generated files', () => {
    // protocol.ts is generated into the gen directory (see
    // front_end/generated/BUILD.gn); the source tree has neither it nor the
    // JS that tsc emits for it.
    const jsFile = path.join(devtoolsRoot, 'front_end/generated/protocol.js');
    const tsFile = path.join(devtoolsRoot, 'front_end/generated/protocol.ts');
    const genTsFile = path.join(genRoot, 'front_end/generated/protocol.ts');
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(jsFile).returns(false);
    stub.withArgs(tsFile).returns(false);
    stub.withArgs(genTsFile).returns(true);
    try {
      assert.deepEqual(
          plugin({
            path: '../../generated/protocol.js',
            importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
          }),
          {
            path: genTsFile,
          },
      );
    } finally {
      stub.restore();
    }
  });

  it('resolves TypeScript source files when importing JS', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/root/root.ts');
    const jsFile = path.join(devtoolsRoot, 'front_end/core/root/FakeModule.js');
    const tsFile = path.join(devtoolsRoot, 'front_end/core/root/FakeModule.ts');
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(jsFile).returns(false);
    stub.withArgs(tsFile).returns(true);
    try {
      const res = plugin({
        path: './FakeModule.js',
        importer,
      });
      assert.deepEqual(res, {
        path: tsFile,
      });
    } finally {
      stub.restore();
    }
  });

  it('resolves generated CSS files from gen directory', () => {
    const legacyOutdir = path.join(genRoot, 'front_end/ui/legacy');
    const legacyPlugin = esbuildPlugin(legacyOutdir, genRoot, devtoolsRoot, externalFiles);
    const importer = path.join(devtoolsRoot, 'front_end/ui/legacy/legacy.ts');
    const jsFile = path.join(devtoolsRoot, 'front_end/ui/legacy/fakeCss.css.js');
    const cssGenFile = path.join(genRoot, 'front_end/ui/legacy/fakeCss.css.js');
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(jsFile).returns(false);
    stub.withArgs(cssGenFile).returns(true);
    try {
      const res = legacyPlugin({
        path: './fakeCss.css.js',
        importer,
      });
      assert.deepEqual(res, {
        path: cssGenFile,
      });
    } finally {
      stub.restore();
    }
  });

  it('prefers generated TypeScript sources in gen directory over the JS emitted for them', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js');
    const jsFile = path.join(devtoolsRoot, 'front_end/generated/FakeGenerated.js');
    const tsFile = path.join(devtoolsRoot, 'front_end/generated/FakeGenerated.ts');
    const genJsFile = path.join(genRoot, 'front_end/generated/FakeGenerated.js');
    const genTsFile = path.join(genRoot, 'front_end/generated/FakeGenerated.ts');
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(jsFile).returns(false);
    stub.withArgs(tsFile).returns(false);
    stub.withArgs(genJsFile).returns(true);
    stub.withArgs(genTsFile).returns(true);
    try {
      const res = plugin({
        path: '../../generated/FakeGenerated.js',
        importer,
      });
      assert.deepEqual(res, {
        path: genTsFile,
      });
    } finally {
      stub.restore();
    }
  });

  it('correctly resolves external paths when root is devtools root inside chromium checkout', () => {
    const chromiumRoot = '/workspace/chromium/src';
    const devtoolsInsideChromiumRoot = path.join(chromiumRoot, 'third_party/devtools-frontend/src');
    const genRootDir = path.join(devtoolsInsideChromiumRoot, 'out/Default/gen');
    const outDir = path.join(genRootDir, 'front_end/core/sdk');
    const customPlugin = esbuildPlugin(outDir, genRootDir, devtoolsInsideChromiumRoot, externalFiles);

    assert.deepEqual(
        customPlugin({
          path: '../common/common.js',
          importer: path.join(devtoolsInsideChromiumRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {
          path: '../common/common.js',
          external: true,
        },
    );
  });

  it('correctly resolves external paths when root is chromium checkout root', () => {
    const chromiumRoot = '/workspace/chromium/src';
    const devtoolsInsideChromiumRoot = path.join(chromiumRoot, 'third_party/devtools-frontend/src');
    const genRootDir = path.join(chromiumRoot, 'out/Default/gen');
    const outDir = path.join(genRootDir, 'third_party/devtools-frontend/src/front_end/core/sdk');
    const customPlugin = esbuildPlugin(outDir, genRootDir, chromiumRoot, externalFiles);

    assert.deepEqual(
        customPlugin({
          path: '../common/common.js',
          importer: path.join(devtoolsInsideChromiumRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {
          path: '../common/common.js',
          external: true,
        },
    );
  });

  it('marks differently-named entrypoints (-meta.js) in externalFiles as external', () => {
    const timelineOutdir = path.join(genRoot, 'front_end/panels/timeline');
    const timelinePlugin = esbuildPlugin(timelineOutdir, genRoot, devtoolsRoot, externalFiles);
    assert.deepEqual(
        timelinePlugin({
          path: './timeline-meta.js',
          importer: path.join(devtoolsRoot, 'front_end/panels/timeline/timeline.ts'),
        }),
        {
          path: './timeline-meta.js',
          external: true,
        },
    );
  });

  it('marks internal module files not in externalFiles as non-external to inline', () => {
    const importer = path.join(devtoolsRoot, 'front_end/core/root/root.ts');
    const tsFile = path.join(devtoolsRoot, 'front_end/core/root/FakeModule.ts');
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(tsFile).returns(true);
    try {
      assert.deepEqual(
          plugin({
            path: './FakeModule.js',
            importer,
          }),
          {
            path: tsFile,
          },
      );
    } finally {
      stub.restore();
    }
  });

  it('treats nested prebuilt package files as internal without hardcoded exceptions', () => {
    const importer = path.join(devtoolsRoot, 'front_end/third_party/puppeteer/puppeteer.ts');
    const pkgFile = path.join(
        devtoolsRoot,
        'front_end/third_party/puppeteer/package/lib/puppeteer/cdp/Browser.js',
    );
    const stub = sinon.stub(fs, 'existsSync');
    stub.callThrough();
    stub.withArgs(pkgFile).returns(true);
    try {
      assert.deepEqual(
          plugin({
            path: './package/lib/puppeteer/cdp/Browser.js',
            importer,
          }),
          {
            path: pkgFile,
          },
      );
    } finally {
      stub.restore();
    }
  });
});

describe('createNodeModulesCheck', () => {
  const root = path.resolve('/workspace/devtools');
  const genRoot = path.join(root, 'out/Default/gen');

  it('throws when genRoot or rootDir is not provided', () => {
    // @ts-expect-error
    assert.throws(() => createNodeModulesCheck(undefined, root), /requires a genRoot path/);
    // @ts-expect-error
    assert.throws(() => createNodeModulesCheck(genRoot, undefined), /requires a rootDir path/);
  });

  it('detects importers inside node_modules below the source root', () => {
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    assert.isTrue(isInNodeModules(path.join(root, 'node_modules/pkg/index.js')));
    assert.isTrue(isInNodeModules(path.join(root, 'front_end/third_party/foo/node_modules/pkg/lib/a.js')));
  });

  it('detects importers inside node_modules below the gen root', () => {
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    assert.isTrue(isInNodeModules(path.join(genRoot, 'node_modules/pkg/index.js')));
  });

  it('does not treat DevTools sources as node_modules', () => {
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    assert.isFalse(isInNodeModules(path.join(root, 'front_end/core/sdk/sdk.ts')));
    assert.isFalse(isInNodeModules(path.join(genRoot, 'front_end/core/sdk/sdk.js')));
    assert.isFalse(isInNodeModules(path.join(root, 'front_end/node_modules_like/a.js')));
  });

  it('ignores node_modules above the roots', () => {
    const packageRoot = path.resolve('/project/node_modules/chrome-devtools-frontend');
    const isInNodeModules = createNodeModulesCheck(path.join(packageRoot, 'out/Default/gen'), packageRoot);
    assert.isFalse(isInNodeModules(path.join(packageRoot, 'front_end/core/sdk/sdk.ts')));
    assert.isFalse(isInNodeModules(path.join(packageRoot, 'out/Default/gen/front_end/core/sdk/sdk.js')));
    assert.isTrue(isInNodeModules(path.join(packageRoot, 'node_modules/pkg/index.js')));
  });

  it('falls back to the full path for importers outside the roots', () => {
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    assert.isTrue(isInNodeModules(path.resolve('/elsewhere/node_modules/pkg/index.js')));
    assert.isFalse(isInNodeModules(path.resolve('/elsewhere/src/index.js')));
  });

  it('normalizes importer paths', () => {
    const isInNodeModules = createNodeModulesCheck(genRoot, root);
    assert.isTrue(isInNodeModules(`${root}/front_end/../node_modules/pkg/index.js`));
    assert.isFalse(isInNodeModules(`${root}/node_modules/../front_end/core/sdk/sdk.ts`));
  });

  it('compares against roots with symlinks resolved', () => {
    const packageRoot = path.resolve('/project/node_modules/chrome-devtools-frontend');
    const packageGenRoot = path.join(packageRoot, 'out/Default/gen');
    const realRoot = path.resolve('/private/project/node_modules/chrome-devtools-frontend');
    const realGenRoot = path.join(realRoot, 'out/Default/gen');
    const stub = sinon.stub(fs, 'realpathSync');
    stub.callThrough();
    stub.withArgs(packageRoot).returns(realRoot);
    stub.withArgs(packageGenRoot).returns(realGenRoot);
    try {
      const isInNodeModules = createNodeModulesCheck(packageGenRoot, packageRoot);
      // esbuild passes importers with symlinks resolved.
      assert.isFalse(isInNodeModules(path.join(realRoot, 'front_end/core/sdk/sdk.ts')));
      assert.isFalse(isInNodeModules(path.join(realGenRoot, 'front_end/core/sdk/sdk.js')));
      assert.isTrue(isInNodeModules(path.join(realRoot, 'node_modules/pkg/index.js')));
      // Importers that keep the symlinked path still work.
      assert.isFalse(isInNodeModules(path.join(packageRoot, 'front_end/core/sdk/sdk.ts')));
    } finally {
      stub.restore();
    }
  });
});
