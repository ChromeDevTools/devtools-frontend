// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'node:path';

import {TypeScriptImportExtractor} from '../../extractors/typescript_import.ts';

const FIXTURES_DIR = path.join(import.meta.dirname, '../fixtures');

describe('TypeScriptImportExtractor', () => {
  it('extracts resolved static and dynamic imports', async () => {
    const testFile = path.join(FIXTURES_DIR, 'index.ts');

    const fooTsPath = path.join(FIXTURES_DIR, 'foo.ts');
    const quxTsPath = path.join(FIXTURES_DIR, 'qux.ts');
    const barDtsPath = path.join(FIXTURES_DIR, 'bar.d.ts');
    const bazJsPath = path.join(FIXTURES_DIR, 'baz.js');
    const dataJsonPath = path.join(FIXTURES_DIR, 'data.json');
    const iconSvgPath = path.join(FIXTURES_DIR, 'icon.svg');
    const styleCssPath = path.join(FIXTURES_DIR, 'style.css');

    // We expect foo, qux, bar, baz, data, icon, style paths to be resolved.

    const extractor = TypeScriptImportExtractor.create();
    const result = await extractor.extractTsImports([testFile]);

    const fileImports = result.get(testFile);
    assert.isDefined(fileImports);

    assert.deepEqual(
        fileImports.sort(),
        [
          fooTsPath,
          quxTsPath,
          barDtsPath,
          bazJsPath,
          dataJsonPath,
          iconSvgPath,
          styleCssPath,
        ].sort(),
    );
  });

  it('returns empty for non-ts files', async () => {
    const cssFile = path.join(FIXTURES_DIR, 'style.css');
    const htmlFile = path.join(FIXTURES_DIR, 'template.html');
    const svgFile = path.join(FIXTURES_DIR, 'icon.svg');
    const jsonFile = path.join(FIXTURES_DIR, 'data.json');

    const extractor = TypeScriptImportExtractor.create();
    const result = await extractor.extractTsImports([
      cssFile,
      htmlFile,
      svgFile,
      jsonFile,
    ]);

    for (const file of [cssFile, htmlFile, svgFile, jsonFile]) {
      const fileImports = result.get(file);
      assert.isDefined(fileImports);
      assert.isEmpty(fileImports);
    }
  });

  it('returns empty for missing files without failing', async () => {
    const missingFile = path.join(FIXTURES_DIR, 'missing.ts');

    const extractor = TypeScriptImportExtractor.create();
    const result = await extractor.extractTsImports([missingFile]);

    const fileImports = result.get(missingFile);
    assert.isDefined(fileImports);
    assert.isEmpty(fileImports);
  });

  it('handles imports from non-existent directories without failing', async () => {
    const brokenImportFile = path.join(FIXTURES_DIR, 'broken_import.ts');

    const extractor = TypeScriptImportExtractor.create();
    const result = await extractor.extractTsImports([brokenImportFile]);

    const fileImports = result.get(brokenImportFile);
    assert.isDefined(fileImports);
    assert.isEmpty(fileImports);
  });
});
