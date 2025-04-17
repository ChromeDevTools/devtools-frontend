// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Run these tests with:
//
//   npx mocha scripts/devtools_build.test.mjs

import { assert } from 'chai';

import { FeatureSet } from './devtools_build.mjs';

describe('FeatureSet', () => {
  it('yields an empty set of arguments by default', () => {
    const featureSet = new FeatureSet();

    assert.isEmpty([...featureSet]);
  });

  it('can enable features', () => {
    const featureSet = new FeatureSet();

    featureSet.enable('DevToolsFreestyler');
    featureSet.enable('DevToolsWellKnown');

    assert.deepEqual(
      [...featureSet],
      ['--enable-features=DevToolsFreestyler,DevToolsWellKnown'],
    );
  });

  it('can enable features with parameters', () => {
    const featureSet = new FeatureSet();

    featureSet.enable('DevToolsFreestyler', { patching: true });
    featureSet.enable('DevToolsFreestyler', {
      user_tier: 'TESTERS',
      multimodal: true,
    });
    featureSet.enable('DevToolsAiAssistancePerformanceAgent', {
      insights_enabled: true,
    });

    assert.deepEqual(
      [...featureSet],
      [
        '--enable-features=DevToolsAiAssistancePerformanceAgent:insights_enabled/true,DevToolsFreestyler:multimodal/true/patching/true/user_tier/TESTERS',
      ],
    );
  });

  it('can disable features', () => {
    const featureSet = new FeatureSet();

    featureSet.disable('MediaRouter');
    featureSet.disable('DevToolsAiGeneratedTimelineLabels');

    assert.deepEqual(
      [...featureSet],
      ['--disable-features=DevToolsAiGeneratedTimelineLabels,MediaRouter'],
    );
  });

  it('can disable and enable unrelated features', () => {
    const featureSet = new FeatureSet();

    featureSet.disable('MediaRouter');
    featureSet.enable('DevToolsAutomaticFileSystems');

    assert.deepEqual(
      [...featureSet],
      [
        '--disable-features=MediaRouter',
        '--enable-features=DevToolsAutomaticFileSystems',
      ],
    );
  });

  it('can disable previously enabled features', () => {
    const featureSet = new FeatureSet();

    featureSet.enable('DevToolsFreestyler', { patching: true });
    featureSet.enable('DevToolsWellKnown');
    featureSet.disable('DevToolsFreestyler');

    assert.deepEqual(
      [...featureSet],
      [
        '--disable-features=DevToolsFreestyler',
        '--enable-features=DevToolsWellKnown',
      ],
    );
  });

  it('can merge feature sets', () => {
    const fs1 = new FeatureSet();
    fs1.enable('DevToolsFreestyler', { patching: true });
    fs1.enable('DevToolsWellKnown');
    fs1.disable('MediaRouter');
    const fs2 = new FeatureSet();
    fs2.disable('DevToolsWellKnown');
    fs2.enable('DevToolsFreestyler', { multimodal: true });

    fs1.merge(fs2);

    assert.deepEqual(
      [...fs1],
      [
        '--disable-features=DevToolsWellKnown,MediaRouter',
        '--enable-features=DevToolsFreestyler:multimodal/true/patching/true',
      ],
    );
    assert.deepEqual(
      [...fs2],
      [
        '--disable-features=DevToolsWellKnown',
        '--enable-features=DevToolsFreestyler:multimodal/true',
      ],
    );
  });

  it('can parse --enable-features/--disable-features declarations', () => {
    assert.deepEqual(FeatureSet.parse('MediaRouter'), [
      { feature: 'MediaRouter', parameters: {} },
    ]);
    assert.deepEqual(
      FeatureSet.parse('DevToolsFreestyler:multimodal/true/patching/true'),
      [
        {
          feature: 'DevToolsFreestyler',
          parameters: { multimodal: 'true', patching: 'true' },
        },
      ],
    );
    assert.deepEqual(
      FeatureSet.parse('DevToolsFreestyler:multimodal/true,DevToolsWellKnown'),
      [
        { feature: 'DevToolsFreestyler', parameters: { multimodal: 'true' } },
        { feature: 'DevToolsWellKnown', parameters: {} },
      ],
    );
  });

  it('can parse empty values', () => {
    assert.deepEqual(FeatureSet.parse(''), []);
    assert.deepEqual(FeatureSet.parse(null), []);
    assert.deepEqual(FeatureSet.parse(undefined), []);
  });
});
