// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';

import * as SourcesComponents from './components.js';

describe('getDifferentiatingPathMap', () => {
  const AMBIGUOUS_FILE_NAME = 'index.js';
  const OTHER_FILE_NAME = 'a.js';

  it('can extract the differentiating segment if it is the parent folder', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src/b', 'http://www.google.com/src/c'],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'b/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'c/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if it is the direct parent folder', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src2/b'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'b/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if it is the parent folder, but has overlapping path prefixes', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src2/b', 'http://www.google.com/src2/c'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'b/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'c/' as Platform.DevToolsPath.UrlString);
  });

  it('does not output any differentiating segment if the name is unique', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src/b'],
      nonAmbiguous: ['http://www.google.com/src/c'],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'b/' as Platform.DevToolsPath.UrlString);
    assert.isUndefined(differentiatingPathMap.get(titleInfos[2].url));
  });

  it('can extract the differentiating segment if paths have overlapping prefixes and suffixes', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a',
        'http://www.google.com/src/b',
        'http://www.google.com/src2/a',
        'http://www.google.com/src2/b',
      ],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'src/a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'src/b/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'src2/a/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), 'src2/b/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if paths have overlapping prefixes and suffixes', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/d',
        'http://www.google.com/src/a/e',
        'http://www.google.com/src2/a/d',
        'http://www.google.com/src2/a/e',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'src/a/d/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'src/a/e/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'src2/a/d/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), 'src2/a/e/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if it is not the direct parent folder', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/e',
        'http://www.google.com/src/b/e',
        'http://www.google.com/src2/c/e',
        'http://www.google.com/src2/d/e',
      ],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'b/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'c/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), 'd/…/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if one path is completely overlapping', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a/e', 'http://www.google.com/src/a'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'e/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'a/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if parts of the differentiating foldername is overlapping', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a/b/cfile', 'http://www.google.com/src/c/d/c'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'cfile/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'c/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if part of suffix is unique', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/y',
        'http://www.google.com/src2/a/x',
        'http://www.google.com/src/b/y',
        'http://www.google.com/src2/b/x',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'a/y/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'a/x/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'b/y/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), 'b/x/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if separate paths of urls are unique', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/d/y', 'http://www.google.com/src2/c/y', 'http://www.google.com/src3/c/y'],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'd/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'src2/c/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'src3/c/…/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if paths have different length', () => {
    const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/d',
        'http://www.google.com/src/c/y/d',
        'http://www.google.com/src2/c/y/d',
        'http://www.google.com/src3/c/y/d',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), 'src/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'src/c/y/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), 'src2/c/y/…/' as Platform.DevToolsPath.UrlString);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), 'src3/c/y/…/' as Platform.DevToolsPath.UrlString);
  });

  it('can extract the differentiating segment if paths have different length and are completely overlapping otherwise',
     () => {
       const titleInfos: SourcesComponents.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
         ambiguous: ['http://www.google.com/src/d', 'http://www.google.com/x/src/d'],
         nonAmbiguous: [],
       });
       const differentiatingPathMap = SourcesComponents.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
       assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), '/…/' as Platform.DevToolsPath.UrlString);
       assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), 'x/…/' as Platform.DevToolsPath.UrlString);
     });

  function createTitleInfos(data: {ambiguous: string[], nonAmbiguous: string[]}):
      SourcesComponents.BreakpointsViewUtils.TitleInfo[] {
    const infos = [];
    for (const path of data.ambiguous) {
      infos.push({
        name: AMBIGUOUS_FILE_NAME,
        url: `${path}/${AMBIGUOUS_FILE_NAME}` as Platform.DevToolsPath.UrlString,
      });
    }
    for (const path of data.nonAmbiguous) {
      infos.push({
        name: OTHER_FILE_NAME,
        url: `${path}/${OTHER_FILE_NAME}` as Platform.DevToolsPath.UrlString,
      });
    }

    return infos;
  }
});
