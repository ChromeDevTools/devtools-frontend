// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describe('getDifferentiatingPathMap', () => {
  const AMBIGUOUS_FILE_NAME = 'index.js';
  const OTHER_FILE_NAME = 'a.js';

  it('can extract the differentiating segment if it is the parent folder', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src/b', 'http://www.google.com/src/c'],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`b/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`c/`);
  });

  it('can extract the differentiating segment if it is the direct parent folder', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src2/b'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`b/`);
  });

  it('can extract the differentiating segment if it is the parent folder, but has overlapping path prefixes', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src2/b', 'http://www.google.com/src2/c'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`b/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`c/`);
  });

  it('does not output any differentiating segment if the name is unique', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a', 'http://www.google.com/src/b'],
      nonAmbiguous: ['http://www.google.com/src/c'],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`b/`);
    assert.isUndefined(differentiatingPathMap.get(titleInfos[2].url));
  });

  it('can extract the differentiating segment if paths have overlapping prefixes and suffixes', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a',
        'http://www.google.com/src/b',
        'http://www.google.com/src2/a',
        'http://www.google.com/src2/b',
      ],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`src/a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`src/b/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`src2/a/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), urlString`src2/b/`);
  });

  it('can extract the differentiating segment if paths have overlapping prefixes and suffixes', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/d',
        'http://www.google.com/src/a/e',
        'http://www.google.com/src2/a/d',
        'http://www.google.com/src2/a/e',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`src/a/d/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`src/a/e/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`src2/a/d/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), urlString`src2/a/e/`);
  });

  it('can extract the differentiating segment if it is not the direct parent folder', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/e',
        'http://www.google.com/src/b/e',
        'http://www.google.com/src2/c/e',
        'http://www.google.com/src2/d/e',
      ],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`b/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`c/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), urlString`d/…/`);
  });

  it('can extract the differentiating segment if one path is completely overlapping', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a/e', 'http://www.google.com/src/a'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`e/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`a/`);
  });

  it('can extract the differentiating segment if parts of the differentiating foldername is overlapping', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/a/b/cfile', 'http://www.google.com/src/c/d/c'],
      nonAmbiguous: [],
    });

    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`cfile/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`c/`);
  });

  it('can extract the differentiating segment if part of suffix is unique', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/a/y',
        'http://www.google.com/src2/a/x',
        'http://www.google.com/src/b/y',
        'http://www.google.com/src2/b/x',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`a/y/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`a/x/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`b/y/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), urlString`b/x/`);
  });

  it('can extract the differentiating segment if separate paths of urls are unique', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: ['http://www.google.com/src/d/y', 'http://www.google.com/src2/c/y', 'http://www.google.com/src3/c/y'],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`d/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`src2/c/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`src3/c/…/`);
  });

  it('can extract the differentiating segment if paths have different length', () => {
    const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
      ambiguous: [
        'http://www.google.com/src/d',
        'http://www.google.com/src/c/y/d',
        'http://www.google.com/src2/c/y/d',
        'http://www.google.com/src3/c/y/d',
      ],
      nonAmbiguous: [],
    });
    const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`src/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`src/c/y/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[2].url), urlString`src2/c/y/…/`);
    assert.strictEqual(differentiatingPathMap.get(titleInfos[3].url), urlString`src3/c/y/…/`);
  });

  it('can extract the differentiating segment if paths have different length and are completely overlapping otherwise',
     () => {
       const titleInfos: Sources.BreakpointsViewUtils.TitleInfo[] = createTitleInfos({
         ambiguous: ['http://www.google.com/src/d', 'http://www.google.com/x/src/d'],
         nonAmbiguous: [],
       });
       const differentiatingPathMap = Sources.BreakpointsViewUtils.getDifferentiatingPathMap(titleInfos);
       assert.strictEqual(differentiatingPathMap.get(titleInfos[0].url), urlString`/…/`);
       assert.strictEqual(differentiatingPathMap.get(titleInfos[1].url), urlString`x/…/`);
     });

  function createTitleInfos(data: {ambiguous: string[], nonAmbiguous: string[]}):
      Sources.BreakpointsViewUtils.TitleInfo[] {
    const infos = [];
    for (const path of data.ambiguous) {
      infos.push({
        name: AMBIGUOUS_FILE_NAME,
        url: urlString`${`${path}/${AMBIGUOUS_FILE_NAME}`}`,
      });
    }
    for (const path of data.nonAmbiguous) {
      infos.push({
        name: OTHER_FILE_NAME,
        url: urlString`${`${path}/${OTHER_FILE_NAME}`}`,
      });
    }

    return infos;
  }
});
