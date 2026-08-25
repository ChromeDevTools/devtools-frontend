// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {GnLabel} from '../../utils/gn_label.ts';

describe('GnLabel', () => {
  const rootDir = path.resolve('/root');
  const currentDir = path.resolve(rootDir, 'front_end/core/common');

  describe('parse', () => {
    it('parses GN labels with target names', () => {
      const label = GnLabel.parse('//front_end/core/common:bundle');
      assert.isNotNull(label);
      assert.strictEqual(label.dirPath, 'front_end/core/common');
      assert.strictEqual(label.name, 'bundle');
    });

    it('parses GN labels without explicit target names using directory name', () => {
      const label = GnLabel.parse('//front_end/core/common');
      assert.isNotNull(label);
      assert.strictEqual(label.dirPath, 'front_end/core/common');
      assert.strictEqual(label.name, 'common');
    });

    it('parses root-level GN labels with explicit target names', () => {
      const label = GnLabel.parse('//:root_target');
      assert.isNotNull(label);
      assert.strictEqual(label.dirPath, '');
      assert.strictEqual(label.name, 'root_target');
    });

    it('parses top-level single directory GN labels without explicit target', () => {
      const label = GnLabel.parse('//scripts');
      assert.isNotNull(label);
      assert.strictEqual(label.dirPath, 'scripts');
      assert.strictEqual(label.name, 'scripts');
    });

    it('returns null for relative or invalid GN labels', () => {
      assert.isNull(GnLabel.parse(':bundle'));
      assert.isNull(GnLabel.parse('../common:bundle'));
      assert.isNull(GnLabel.parse('front_end/core/common'));
      assert.isNull(GnLabel.parse(''));
    });
  });

  describe('properties', () => {
    it('formats toString as full GN label', () => {
      const label = new GnLabel('front_end/core/common', 'bundle');
      assert.strictEqual(label.toString(), '//front_end/core/common:bundle');
    });

    it('computes bundleLabel', () => {
      const label = new GnLabel('front_end/core/common', 'other_target');
      assert.strictEqual(label.bundleLabel, '//front_end/core/common:bundle');
    });

    it('computes dirName from dirPath', () => {
      const label = new GnLabel('front_end/core/common', 'bundle');
      assert.strictEqual(label.dirName, 'common');
    });

    it('identifies consumer targets correctly', () => {
      const consumerLabel = new GnLabel('front_end/core/common', 'bundle');
      assert.isTrue(consumerLabel.isConsumerTarget);

      const standardLabel = new GnLabel('front_end/core/common', 'common');
      assert.isFalse(standardLabel.isConsumerTarget);
    });
  });

  describe('resolveDeclaredDep', () => {
    it('resolves absolute GN labels', () => {
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/core/common:bundle',
              currentDir,
              rootDir,
              ),
          '//front_end/core/common:bundle',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/core/common',
              currentDir,
              rootDir,
              ),
          '//front_end/core/common:common',
      );
    });

    it('resolves absolute GN labels containing relative path segments', () => {
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/core/../core/common:bundle',
              currentDir,
              rootDir,
              ),
          '//front_end/core/common:bundle',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/core/../core/common',
              currentDir,
              rootDir,
              ),
          '//front_end/core/common:common',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/panels/timeline/../../core/sdk:bundle',
              currentDir,
              rootDir,
              ),
          '//front_end/core/sdk:bundle',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(
              '//front_end/./core/common:bundle',
              currentDir,
              rootDir,
              ),
          '//front_end/core/common:bundle',
      );
    });

    it('resolves relative target within the current directory', () => {
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(':bundle', currentDir, rootDir),
          '//front_end/core/common:bundle',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep(':common', currentDir, rootDir),
          '//front_end/core/common:common',
      );
    });

    it('resolves relative paths with explicit target', () => {
      assert.strictEqual(
          GnLabel.resolveDeclaredDep('../sdk:bundle', currentDir, rootDir),
          '//front_end/core/sdk:bundle',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep('./sub_dir:custom', currentDir, rootDir),
          '//front_end/core/common/sub_dir:custom',
      );
    });

    it('resolves relative paths without explicit target using directory name', () => {
      assert.strictEqual(
          GnLabel.resolveDeclaredDep('../sdk', currentDir, rootDir),
          '//front_end/core/sdk:sdk',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep('./sub_dir', currentDir, rootDir),
          '//front_end/core/common/sub_dir:sub_dir',
      );
      assert.strictEqual(
          GnLabel.resolveDeclaredDep('.', currentDir, rootDir),
          '//front_end/core/common:common',
      );
    });
  });

  describe('toRelativeDep', () => {
    it('formats relative dep when target is in current directory', () => {
      const bundleLabel = new GnLabel('front_end/core/common', 'bundle');
      assert.strictEqual(
          bundleLabel.toRelativeDep(currentDir, rootDir),
          ':bundle',
      );

      const commonLabel = new GnLabel('front_end/core/common', 'common');
      assert.strictEqual(
          commonLabel.toRelativeDep(currentDir, rootDir),
          ':common',
      );
    });

    it('formats relative dep when target name matches directory name', () => {
      const sdkLabel = new GnLabel('front_end/core/sdk', 'sdk');
      assert.strictEqual(sdkLabel.toRelativeDep(currentDir, rootDir), '../sdk');

      const subDirLabel = new GnLabel(
          'front_end/core/common/sub_dir',
          'sub_dir',
      );
      assert.strictEqual(
          subDirLabel.toRelativeDep(currentDir, rootDir),
          'sub_dir',
      );
    });

    it('formats relative dep with target name when target name differs from directory name', () => {
      const sdkBundleLabel = new GnLabel('front_end/core/sdk', 'bundle');
      assert.strictEqual(
          sdkBundleLabel.toRelativeDep(currentDir, rootDir),
          '../sdk:bundle',
      );

      const subDirCustomLabel = new GnLabel(
          'front_end/core/common/sub_dir',
          'custom',
      );
      assert.strictEqual(
          subDirCustomLabel.toRelativeDep(currentDir, rootDir),
          'sub_dir:custom',
      );
    });
  });
});
