// Copyright 2025 The Chromium Authors. All rights reserved.
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

    it('correctly extracts a single esbuild error', () => {
      const cause = new Error();
      cause.stdout =
          `ninja: Entering directory \`/usr/local/google/home/bmeurer/Projects/devtools/devtools-frontend/out/Default'
[  0% | 1/2/266] ACTION //front_end/panels/timeline/components/insights:insights(//build/toolchain/linux:x64)
FAILED: gen/front_end/panels/timeline/components/insights/insights-tsconfig.json gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js.map gen/front_end/panels/timeline/components/insights/CLSCulprits.js gen/front_end/panels/timeline/components/insights/CLSCulprits.js.map gen/front_end/panels/timeline/components/insights/Cache.js gen/front_end/panels/timeline/components/insights/Cache.js.map gen/front_end/panels/timeline/components/insights/Checklist.js gen/front_end/panels/timeline/components/insights/Checklist.js.map gen/front_end/panels/timeline/components/insights/DOMSize.js gen/front_end/panels/timeline/components/insights/DOMSize.js.map gen/front_end/panels/timeline/components/insights/DocumentLatency.js gen/front_end/panels/timeline/components/insights/DocumentLatency.js.map gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js.map gen/front_end/panels/timeline/components/insights/EventRef.js gen/front_end/panels/timeline/components/insights/EventRef.js.map gen/front_end/panels/timeline/components/insights/FontDisplay.js gen/front_end/panels/timeline/components/insights/FontDisplay.js.map gen/front_end/panels/timeline/components/insights/ForcedReflow.js gen/front_end/panels/timeline/components/insights/ForcedReflow.js.map gen/front_end/panels/timeline/components/insights/Helpers.js gen/front_end/panels/timeline/components/insights/Helpers.js.map gen/front_end/panels/timeline/components/insights/ImageDelivery.js gen/front_end/panels/timeline/components/insights/ImageDelivery.js.map gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js.map gen/front_end/panels/timeline/components/insights/LCPDiscovery.js gen/front_end/panels/timeline/components/insights/LCPDiscovery.js.map gen/front_end/panels/timeline/components/insights/LCPPhases.js gen/front_end/panels/timeline/components/insights/LCPPhases.js.map gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js.map gen/front_end/panels/timeline/components/insights/ModernHTTP.js gen/front_end/panels/timeline/components/insights/ModernHTTP.js.map gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js.map gen/front_end/panels/timeline/components/insights/NodeLink.js gen/front_end/panels/timeline/components/insights/NodeLink.js.map gen/front_end/panels/timeline/components/insights/RenderBlocking.js gen/front_end/panels/timeline/components/insights/RenderBlocking.js.map gen/front_end/panels/timeline/components/insights/ScriptRef.js gen/front_end/panels/timeline/components/insights/ScriptRef.js.map gen/front_end/panels/timeline/components/insights/SidebarInsight.js gen/front_end/panels/timeline/components/insights/SidebarInsight.js.map gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js.map gen/front_end/panels/timeline/components/insights/Table.js gen/front_end/panels/timeline/components/insights/Table.js.map gen/front_end/panels/timeline/components/insights/ThirdParties.js gen/front_end/panels/timeline/components/insights/ThirdParties.js.map gen/front_end/panels/timeline/components/insights/Viewport.js gen/front_end/panels/timeline/components/insights/Viewport.js.map gen/front_end/panels/timeline/components/insights/types.js gen/front_end/panels/timeline/components/insights/types.js.map
python3 ../../scripts/build/typescript/ts_library.py --tsconfig_output_location gen/front_end/panels/timeline/components/insights/insights-tsconfig.json --deps ../../../../core/common/bundle-tsconfig.json ../../../../core/platform/bundle-tsconfig.json ../../../../core/sdk/bundle-tsconfig.json ../../../../models/trace/bundle-tsconfig.json ../../../../services/trace_bounds/bundle-tsconfig.json ../../../../ui/components/buttons/bundle-tsconfig.json ../../../../ui/components/helpers/bundle-tsconfig.json ../../../../ui/components/icon_button/bundle-tsconfig.json ../../../../ui/components/linkifier/bundle-tsconfig.json ../../../../ui/lit/bundle-tsconfig.json ../../overlays/bundle-tsconfig.json ../../utils/bundle-tsconfig.json --front_end_directory ../../front_end/panels/timeline/components/insights --reset_timestamps --use-esbuild --sources ../../front_end/panels/timeline/components/insights/BaseInsightComponent.ts ../../front_end/panels/timeline/components/insights/CLSCulprits.ts ../../front_end/panels/timeline/components/insights/Cache.ts ../../front_end/panels/timeline/components/insights/Checklist.ts ../../front_end/panels/timeline/components/insights/DOMSize.ts ../../front_end/panels/timeline/components/insights/DocumentLatency.ts ../../front_end/panels/timeline/components/insights/DuplicatedJavaScript.ts ../../front_end/panels/timeline/components/insights/EventRef.ts ../../front_end/panels/timeline/components/insights/FontDisplay.ts ../../front_end/panels/timeline/components/insights/ForcedReflow.ts ../../front_end/panels/timeline/components/insights/Helpers.ts ../../front_end/panels/timeline/components/insights/ImageDelivery.ts ../../front_end/panels/timeline/components/insights/InteractionToNextPaint.ts ../../front_end/panels/timeline/components/insights/LCPDiscovery.ts ../../front_end/panels/timeline/components/insights/LCPPhases.ts ../../front_end/panels/timeline/components/insights/LegacyJavaScript.ts ../../front_end/panels/timeline/components/insights/ModernHTTP.ts ../../front_end/panels/timeline/components/insights/NetworkDependencyTree.ts ../../front_end/panels/timeline/components/insights/NodeLink.ts ../../front_end/panels/timeline/components/insights/RenderBlocking.ts ../../front_end/panels/timeline/components/insights/ScriptRef.ts ../../front_end/panels/timeline/components/insights/SidebarInsight.ts ../../front_end/panels/timeline/components/insights/SlowCSSSelector.ts ../../front_end/panels/timeline/components/insights/Table.ts ../../front_end/panels/timeline/components/insights/ThirdParties.ts ../../front_end/panels/timeline/components/insights/Viewport.ts ../../front_end/panels/timeline/components/insights/types.ts
✘ [ERROR] Expected ";" but found "UIStrings"

    ../../front_end/panels/timeline/components/insights/Table.ts:17:8:
      17 │ const a UIStrings = {
         │         ~~~~~~~~~
         ╵         ;

[  0% | 2/1/266] ACTION //front_end/core/i18n/locales:collect_strings(//build/toolchain/linux:x64)
ninja: build stopped: subcommand failed.
`;

      const {message} = new BuildError(BuildStep.AUTONINJA, {cause, target, outDir});

      assert.strictEqual(message, `TypeScript compilation failed for \`Default'

front_end/panels/timeline/components/insights/Table.ts(17,8): error TS0666: Expected ";" but found "UIStrings"
`);
    });

    it('correctly extracts multiple esbuild errors from the same module', () => {
      const cause = new Error();
      cause.stdout =
          `ninja: Entering directory \`/usr/local/google/home/bmeurer/Projects/devtools/devtools-frontend/out/Default'
[  0% | 1/2/266] ACTION //front_end/panels/timeline/components/insights:insights(//build/toolchain/linux:x64)
FAILED: gen/front_end/panels/timeline/components/insights/insights-tsconfig.json gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js.map gen/front_end/panels/timeline/components/insights/CLSCulprits.js gen/front_end/panels/timeline/components/insights/CLSCulprits.js.map gen/front_end/panels/timeline/components/insights/Cache.js gen/front_end/panels/timeline/components/insights/Cache.js.map gen/front_end/panels/timeline/components/insights/Checklist.js gen/front_end/panels/timeline/components/insights/Checklist.js.map gen/front_end/panels/timeline/components/insights/DOMSize.js gen/front_end/panels/timeline/components/insights/DOMSize.js.map gen/front_end/panels/timeline/components/insights/DocumentLatency.js gen/front_end/panels/timeline/components/insights/DocumentLatency.js.map gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js.map gen/front_end/panels/timeline/components/insights/EventRef.js gen/front_end/panels/timeline/components/insights/EventRef.js.map gen/front_end/panels/timeline/components/insights/FontDisplay.js gen/front_end/panels/timeline/components/insights/FontDisplay.js.map gen/front_end/panels/timeline/components/insights/ForcedReflow.js gen/front_end/panels/timeline/components/insights/ForcedReflow.js.map gen/front_end/panels/timeline/components/insights/Helpers.js gen/front_end/panels/timeline/components/insights/Helpers.js.map gen/front_end/panels/timeline/components/insights/ImageDelivery.js gen/front_end/panels/timeline/components/insights/ImageDelivery.js.map gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js.map gen/front_end/panels/timeline/components/insights/LCPDiscovery.js gen/front_end/panels/timeline/components/insights/LCPDiscovery.js.map gen/front_end/panels/timeline/components/insights/LCPPhases.js gen/front_end/panels/timeline/components/insights/LCPPhases.js.map gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js.map gen/front_end/panels/timeline/components/insights/ModernHTTP.js gen/front_end/panels/timeline/components/insights/ModernHTTP.js.map gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js.map gen/front_end/panels/timeline/components/insights/NodeLink.js gen/front_end/panels/timeline/components/insights/NodeLink.js.map gen/front_end/panels/timeline/components/insights/RenderBlocking.js gen/front_end/panels/timeline/components/insights/RenderBlocking.js.map gen/front_end/panels/timeline/components/insights/ScriptRef.js gen/front_end/panels/timeline/components/insights/ScriptRef.js.map gen/front_end/panels/timeline/components/insights/SidebarInsight.js gen/front_end/panels/timeline/components/insights/SidebarInsight.js.map gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js.map gen/front_end/panels/timeline/components/insights/Table.js gen/front_end/panels/timeline/components/insights/Table.js.map gen/front_end/panels/timeline/components/insights/ThirdParties.js gen/front_end/panels/timeline/components/insights/ThirdParties.js.map gen/front_end/panels/timeline/components/insights/Viewport.js gen/front_end/panels/timeline/components/insights/Viewport.js.map gen/front_end/panels/timeline/components/insights/types.js gen/front_end/panels/timeline/components/insights/types.js.map
python3 ../../scripts/build/typescript/ts_library.py --tsconfig_output_location gen/front_end/panels/timeline/components/insights/insights-tsconfig.json --deps ../../../../core/common/bundle-tsconfig.json ../../../../core/platform/bundle-tsconfig.json ../../../../core/sdk/bundle-tsconfig.json ../../../../models/trace/bundle-tsconfig.json ../../../../services/trace_bounds/bundle-tsconfig.json ../../../../ui/components/buttons/bundle-tsconfig.json ../../../../ui/components/helpers/bundle-tsconfig.json ../../../../ui/components/icon_button/bundle-tsconfig.json ../../../../ui/components/linkifier/bundle-tsconfig.json ../../../../ui/lit/bundle-tsconfig.json ../../overlays/bundle-tsconfig.json ../../utils/bundle-tsconfig.json --front_end_directory ../../front_end/panels/timeline/components/insights --reset_timestamps --use-esbuild --sources ../../front_end/panels/timeline/components/insights/BaseInsightComponent.ts ../../front_end/panels/timeline/components/insights/CLSCulprits.ts ../../front_end/panels/timeline/components/insights/Cache.ts ../../front_end/panels/timeline/components/insights/Checklist.ts ../../front_end/panels/timeline/components/insights/DOMSize.ts ../../front_end/panels/timeline/components/insights/DocumentLatency.ts ../../front_end/panels/timeline/components/insights/DuplicatedJavaScript.ts ../../front_end/panels/timeline/components/insights/EventRef.ts ../../front_end/panels/timeline/components/insights/FontDisplay.ts ../../front_end/panels/timeline/components/insights/ForcedReflow.ts ../../front_end/panels/timeline/components/insights/Helpers.ts ../../front_end/panels/timeline/components/insights/ImageDelivery.ts ../../front_end/panels/timeline/components/insights/InteractionToNextPaint.ts ../../front_end/panels/timeline/components/insights/LCPDiscovery.ts ../../front_end/panels/timeline/components/insights/LCPPhases.ts ../../front_end/panels/timeline/components/insights/LegacyJavaScript.ts ../../front_end/panels/timeline/components/insights/ModernHTTP.ts ../../front_end/panels/timeline/components/insights/NetworkDependencyTree.ts ../../front_end/panels/timeline/components/insights/NodeLink.ts ../../front_end/panels/timeline/components/insights/RenderBlocking.ts ../../front_end/panels/timeline/components/insights/ScriptRef.ts ../../front_end/panels/timeline/components/insights/SidebarInsight.ts ../../front_end/panels/timeline/components/insights/SlowCSSSelector.ts ../../front_end/panels/timeline/components/insights/Table.ts ../../front_end/panels/timeline/components/insights/ThirdParties.ts ../../front_end/panels/timeline/components/insights/Viewport.ts ../../front_end/panels/timeline/components/insights/types.ts
✘ [ERROR] Expected ";" but found "UIStrings"

    ../../front_end/panels/timeline/components/insights/Checklist.ts:21:8:
      21 │ const b UIStrings = {
         │         ~~~~~~~~~
         ╵         ;

✘ [ERROR] Expected ";" but found "UIStrings"

    ../../front_end/panels/timeline/components/insights/Table.ts:17:8:
      17 │ const a UIStrings = {
         │         ~~~~~~~~~
         ╵         ;

[  0% | 2/1/266] ACTION //front_end/core/i18n/locales:collect_strings(//build/toolchain/linux:x64)
ninja: build stopped: subcommand failed.
`;

      const {message} = new BuildError(BuildStep.AUTONINJA, {cause, target, outDir});

      assert.strictEqual(message, `TypeScript compilation failed for \`Default'

front_end/panels/timeline/components/insights/Checklist.ts(21,8): error TS0666: Expected ";" but found "UIStrings"
front_end/panels/timeline/components/insights/Table.ts(17,8): error TS0666: Expected ";" but found "UIStrings"
`);
    });

    it('correctly extracts multiple tsc errors from the same module', () => {
      const cause = new Error();
      cause.stdout = `ninja: Entering directory \`out/Default'
[  1% | 3/1/267] ACTION //front_end/panels/timeline/components/insights:insights(//build/toolchain/linux:x64)
FAILED: gen/front_end/panels/timeline/components/insights/insights-tsconfig.json gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js gen/front_end/panels/timeline/components/insights/BaseInsightComponent.js.map gen/front_end/panels/timeline/components/insights/BaseInsightComponent.d.ts gen/front_end/panels/timeline/components/insights/CLSCulprits.js gen/front_end/panels/timeline/components/insights/CLSCulprits.js.map gen/front_end/panels/timeline/components/insights/CLSCulprits.d.ts gen/front_end/panels/timeline/components/insights/Cache.js gen/front_end/panels/timeline/components/insights/Cache.js.map gen/front_end/panels/timeline/components/insights/Cache.d.ts gen/front_end/panels/timeline/components/insights/Checklist.js gen/front_end/panels/timeline/components/insights/Checklist.js.map gen/front_end/panels/timeline/components/insights/Checklist.d.ts gen/front_end/panels/timeline/components/insights/DOMSize.js gen/front_end/panels/timeline/components/insights/DOMSize.js.map gen/front_end/panels/timeline/components/insights/DOMSize.d.ts gen/front_end/panels/timeline/components/insights/DocumentLatency.js gen/front_end/panels/timeline/components/insights/DocumentLatency.js.map gen/front_end/panels/timeline/components/insights/DocumentLatency.d.ts gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.js.map gen/front_end/panels/timeline/components/insights/DuplicatedJavaScript.d.ts gen/front_end/panels/timeline/components/insights/EventRef.js gen/front_end/panels/timeline/components/insights/EventRef.js.map gen/front_end/panels/timeline/components/insights/EventRef.d.ts gen/front_end/panels/timeline/components/insights/FontDisplay.js gen/front_end/panels/timeline/components/insights/FontDisplay.js.map gen/front_end/panels/timeline/components/insights/FontDisplay.d.ts gen/front_end/panels/timeline/components/insights/ForcedReflow.js gen/front_end/panels/timeline/components/insights/ForcedReflow.js.map gen/front_end/panels/timeline/components/insights/ForcedReflow.d.ts gen/front_end/panels/timeline/components/insights/Helpers.js gen/front_end/panels/timeline/components/insights/Helpers.js.map gen/front_end/panels/timeline/components/insights/Helpers.d.ts gen/front_end/panels/timeline/components/insights/ImageDelivery.js gen/front_end/panels/timeline/components/insights/ImageDelivery.js.map gen/front_end/panels/timeline/components/insights/ImageDelivery.d.ts gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.js.map gen/front_end/panels/timeline/components/insights/InteractionToNextPaint.d.ts gen/front_end/panels/timeline/components/insights/LCPDiscovery.js gen/front_end/panels/timeline/components/insights/LCPDiscovery.js.map gen/front_end/panels/timeline/components/insights/LCPDiscovery.d.ts gen/front_end/panels/timeline/components/insights/LCPPhases.js gen/front_end/panels/timeline/components/insights/LCPPhases.js.map gen/front_end/panels/timeline/components/insights/LCPPhases.d.ts gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js gen/front_end/panels/timeline/components/insights/LegacyJavaScript.js.map gen/front_end/panels/timeline/components/insights/LegacyJavaScript.d.ts gen/front_end/panels/timeline/components/insights/ModernHTTP.js gen/front_end/panels/timeline/components/insights/ModernHTTP.js.map gen/front_end/panels/timeline/components/insights/ModernHTTP.d.ts gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.js.map gen/front_end/panels/timeline/components/insights/NetworkDependencyTree.d.ts gen/front_end/panels/timeline/components/insights/NodeLink.js gen/front_end/panels/timeline/components/insights/NodeLink.js.map gen/front_end/panels/timeline/components/insights/NodeLink.d.ts gen/front_end/panels/timeline/components/insights/RenderBlocking.js gen/front_end/panels/timeline/components/insights/RenderBlocking.js.map gen/front_end/panels/timeline/components/insights/RenderBlocking.d.ts gen/front_end/panels/timeline/components/insights/ScriptRef.js gen/front_end/panels/timeline/components/insights/ScriptRef.js.map gen/front_end/panels/timeline/components/insights/ScriptRef.d.ts gen/front_end/panels/timeline/components/insights/SidebarInsight.js gen/front_end/panels/timeline/components/insights/SidebarInsight.js.map gen/front_end/panels/timeline/components/insights/SidebarInsight.d.ts gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js gen/front_end/panels/timeline/components/insights/SlowCSSSelector.js.map gen/front_end/panels/timeline/components/insights/SlowCSSSelector.d.ts gen/front_end/panels/timeline/components/insights/Table.js gen/front_end/panels/timeline/components/insights/Table.js.map gen/front_end/panels/timeline/components/insights/Table.d.ts gen/front_end/panels/timeline/components/insights/ThirdParties.js gen/front_end/panels/timeline/components/insights/ThirdParties.js.map gen/front_end/panels/timeline/components/insights/ThirdParties.d.ts gen/front_end/panels/timeline/components/insights/Viewport.js gen/front_end/panels/timeline/components/insights/Viewport.js.map gen/front_end/panels/timeline/components/insights/Viewport.d.ts gen/front_end/panels/timeline/components/insights/types.js gen/front_end/panels/timeline/components/insights/types.js.map gen/front_end/panels/timeline/components/insights/types.d.ts
python3 ../../scripts/build/typescript/ts_library.py --tsconfig_output_location gen/front_end/panels/timeline/components/insights/insights-tsconfig.json --deps ../../../../core/common/bundle-tsconfig.json ../../../../core/platform/bundle-tsconfig.json ../../../../core/sdk/bundle-tsconfig.json ../../../../models/trace/bundle-tsconfig.json ../../../../services/trace_bounds/bundle-tsconfig.json ../../../../ui/components/buttons/bundle-tsconfig.json ../../../../ui/components/helpers/bundle-tsconfig.json ../../../../ui/components/icon_button/bundle-tsconfig.json ../../../../ui/components/linkifier/bundle-tsconfig.json ../../../../ui/lit/bundle-tsconfig.json ../../overlays/bundle-tsconfig.json ../../utils/bundle-tsconfig.json --front_end_directory ../../front_end/panels/timeline/components/insights --reset_timestamps --sources ../../front_end/panels/timeline/components/insights/BaseInsightComponent.ts ../../front_end/panels/timeline/components/insights/CLSCulprits.ts ../../front_end/panels/timeline/components/insights/Cache.ts ../../front_end/panels/timeline/components/insights/Checklist.ts ../../front_end/panels/timeline/components/insights/DOMSize.ts ../../front_end/panels/timeline/components/insights/DocumentLatency.ts ../../front_end/panels/timeline/components/insights/DuplicatedJavaScript.ts ../../front_end/panels/timeline/components/insights/EventRef.ts ../../front_end/panels/timeline/components/insights/FontDisplay.ts ../../front_end/panels/timeline/components/insights/ForcedReflow.ts ../../front_end/panels/timeline/components/insights/Helpers.ts ../../front_end/panels/timeline/components/insights/ImageDelivery.ts ../../front_end/panels/timeline/components/insights/InteractionToNextPaint.ts ../../front_end/panels/timeline/components/insights/LCPDiscovery.ts ../../front_end/panels/timeline/components/insights/LCPPhases.ts ../../front_end/panels/timeline/components/insights/LegacyJavaScript.ts ../../front_end/panels/timeline/components/insights/ModernHTTP.ts ../../front_end/panels/timeline/components/insights/NetworkDependencyTree.ts ../../front_end/panels/timeline/components/insights/NodeLink.ts ../../front_end/panels/timeline/components/insights/RenderBlocking.ts ../../front_end/panels/timeline/components/insights/ScriptRef.ts ../../front_end/panels/timeline/components/insights/SidebarInsight.ts ../../front_end/panels/timeline/components/insights/SlowCSSSelector.ts ../../front_end/panels/timeline/components/insights/Table.ts ../../front_end/panels/timeline/components/insights/ThirdParties.ts ../../front_end/panels/timeline/components/insights/Viewport.ts ../../front_end/panels/timeline/components/insights/types.ts

TypeScript compilation failed. Used tsconfig gen/front_end/panels/timeline/components/insights/insights-tsconfig.json

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
