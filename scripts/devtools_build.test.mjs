// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Run these tests with:
//
//   npx mocha scripts/devtools_build.test.mjs

import {assert} from 'chai';

import {BuildError, BuildStep, FeatureSet} from './devtools_build.mjs';

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

    featureSet.enable('DevToolsFreestyler', {patching: true});
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
    featureSet.enable('DevToolsWellKnown');

    assert.deepEqual(
        [...featureSet],
        [
          '--disable-features=MediaRouter',
          '--enable-features=DevToolsWellKnown',
        ],
    );
  });

  it('can disable previously enabled features', () => {
    const featureSet = new FeatureSet();

    featureSet.enable('DevToolsFreestyler', {patching: true});
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
    fs1.enable('DevToolsFreestyler', {patching: true});
    fs1.enable('DevToolsWellKnown');
    fs1.disable('MediaRouter');
    const fs2 = new FeatureSet();
    fs2.disable('DevToolsWellKnown');
    fs2.enable('DevToolsFreestyler', {multimodal: true});

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
      {feature: 'MediaRouter', parameters: {}},
    ]);
    assert.deepEqual(
        FeatureSet.parse('DevToolsFreestyler:multimodal/true/patching/true'),
        [
          {
            feature: 'DevToolsFreestyler',
            parameters: {multimodal: 'true', patching: 'true'},
          },
        ],
    );
    assert.deepEqual(
        FeatureSet.parse('DevToolsFreestyler:multimodal/true,DevToolsWellKnown'),
        [
          {feature: 'DevToolsFreestyler', parameters: {multimodal: 'true'}},
          {feature: 'DevToolsWellKnown', parameters: {}},
        ],
    );
  });

  it('can parse empty values', () => {
    assert.deepEqual(FeatureSet.parse(''), []);
    assert.deepEqual(FeatureSet.parse(null), []);
    assert.deepEqual(FeatureSet.parse(undefined), []);
  });
});

describe('BuildError', () => {
  describe('message', () => {
    const target = 'Default';
    const outDir = '/path/to/out/' + target;

    it('correctly extracts a single tsc error', () => {
      const cause = new Error();
      cause.stdout = `ninja: Entering directory \`out/Default'
[  1% | 3/1/267] ACTION //front_end/panels/timeline/components/insights:insights(//build/toolchain/linux:x64)
FAILED: gen/front_end/panels/timeline/components/insights/Table.js gen/front_end/panels/timeline/components/insights/Table.d.ts
python3 ../../scripts/build/run_with_restat.py gen/front_end/panels/timeline/components/insights/Table.js -- ../../third_party/node/linux/node-linux-x64/bin/node ../../third_party/typescript/tsc -p gen/front_end/panels/timeline/components/insights/insights-tsconfig.json

front_end/panels/timeline/components/insights/Table.ts(17,8): error TS1005: ';' expected.

ninja: build stopped: subcommand failed.`;

      const {message} = new BuildError(BuildStep.AUTONINJA, {cause, target, outDir});

      assert.strictEqual(message, `TypeScript compilation failed for \`Default'

front_end/panels/timeline/components/insights/Table.ts(17,8): error TS1005: ';' expected.
`);
    });

    it('correctly extracts multiple tsc errors from the same module', () => {
      const cause = new Error();
      cause.stdout = `ninja: Entering directory \`out/Default'
[  1% | 3/1/267] ACTION //front_end/panels/timeline/components/insights:insights(//build/toolchain/linux:x64)
FAILED: gen/front_end/panels/timeline/components/insights/insights.js gen/front_end/panels/timeline/components/insights/insights.d.ts
python3 ../../scripts/build/run_with_restat.py gen/front_end/panels/timeline/components/insights/insights.js -- ../../third_party/node/linux/node-linux-x64/bin/node ../../third_party/typescript/tsc -p gen/front_end/panels/timeline/components/insights/insights-tsconfig.json

front_end/panels/timeline/components/insights/Checklist.ts(21,7): error TS7005: Variable 'b' implicitly has an 'any' type.
front_end/panels/timeline/components/insights/Checklist.ts(21,9): error TS1005: ',' expected.
front_end/panels/timeline/components/insights/Table.ts(17,7): error TS7005: Variable 'a' implicitly has an 'any' type.
front_end/panels/timeline/components/insights/Table.ts(17,9): error TS1005: ',' expected.

ninja: build stopped: subcommand failed.`;

      const {message} = new BuildError(BuildStep.AUTONINJA, {cause, target, outDir});

      assert.strictEqual(message, `TypeScript compilation failed for \`Default'

front_end/panels/timeline/components/insights/Checklist.ts(21,7): error TS7005: Variable 'b' implicitly has an 'any' type.
front_end/panels/timeline/components/insights/Checklist.ts(21,9): error TS1005: ',' expected.
front_end/panels/timeline/components/insights/Table.ts(17,7): error TS7005: Variable 'a' implicitly has an 'any' type.
front_end/panels/timeline/components/insights/Table.ts(17,9): error TS1005: ',' expected.
`);
    });
  });
});
