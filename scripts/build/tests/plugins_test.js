// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';

import {devtoolsPlugin, esbuildPlugin} from '../devtools_plugin.js';

describe('devtools_plugin can compute paths with', () => {
  it('same directory import', () => {
    assert.deepEqual(
        devtoolsPlugin('./AnotherFile.js', 'front_end/core/sdk/FirstFile.js'),
        {
          id: path.join('front_end', 'core', 'sdk', 'AnotherFile.js'),
          external: false,
        },
    );
  });

  it('different directory import', () => {
    assert.deepEqual(
        devtoolsPlugin('../common/common.js', 'front_end/core/sdk/FirstFile.js'),
        {
          id: path.join('front_end', 'core', 'common', 'common.js'),
          external: true,
        },
    );
  });

  it('node built-in modules', () => {
    assert.deepEqual(devtoolsPlugin('fs', 'scripts/some-script.js'), {
      id: 'fs',
      external: true,
    });
  });

  it('importing generated files', () => {
    assert.strictEqual(
        devtoolsPlugin(
            '../../generated/Protocol.js',
            'front_end/core/sdk/FirstFile.js',
            ),
        null,
    );
  });

  it('importing lighthouse files', () => {
    assert.deepEqual(
        devtoolsPlugin(
            './front_end/third_party/lighthouse/lighthouse-dt-bundle.js',
            'front_end/core/sdk/FirstFile.js',
            ),
        {
          id: path.join(
              'front_end',
              'core',
              'sdk',
              'front_end',
              'third_party',
              'lighthouse',
              'lighthouse-dt-bundle.js',
              ),
          external: true,
        },
    );
  });
});

describe('esbuild_plugin can compute paths with', () => {
  const devtoolsRoot = path.resolve(import.meta.dirname, '../../..');
  const genRoot = path.join(devtoolsRoot, 'out/Default/gen');
  const outdir = path.join(genRoot, 'front_end/core/sdk');
  const plugin = esbuildPlugin(outdir, genRoot);
  it('same directory import', () => {
    assert.deepEqual(
        plugin({
          path: './AnotherFile.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {path: path.join(devtoolsRoot, 'front_end', 'core', 'sdk', 'AnotherFile.js')},
    );
  });

  it('different directory import', () => {
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

  it('importing generated files', () => {
    assert.strictEqual(
        plugin({
          path: '../../generated/Protocol.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        null,
    );
  });

  it('importing lighthouse files', () => {
    assert.deepEqual(
        plugin({
          path: './front_end/third_party/lighthouse/lighthouse-dt-bundle.js',
          importer: path.join(devtoolsRoot, 'front_end/core/sdk/FirstFile.js'),
        }),
        {
          path: './front_end/third_party/lighthouse/lighthouse-dt-bundle.js',
          external: true,
        },
    );
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
    const importer = path.join(devtoolsRoot, 'front_end/ui/legacy/legacy.ts');
    const jsFile = path.join(devtoolsRoot, 'front_end/ui/legacy/fakeCss.css.js');
    const cssGenFile = path.join(genRoot, 'front_end/ui/legacy/fakeCss.css.js');
    const legacyPlugin = esbuildPlugin(path.join(genRoot, 'front_end/ui/legacy'), genRoot);
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
});
