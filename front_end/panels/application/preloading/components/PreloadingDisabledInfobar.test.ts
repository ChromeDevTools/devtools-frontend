// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';

import * as PreloadingComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('PreloadingDisabledInfobar', () => {
  it('renders nothing when enabled', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.wasShown();
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: null,
      warnings: [],
    });
  });

  it('renders disabled by preference', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByPreference = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is disabled'),
      warnings: [{
        key: i18n.i18n.lockedString('User settings or extensions'),
        valueId:
            'Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.',
        placeholders: {
          PH1: {
            title: i18n.i18n.lockedString('Preload pages settings'),
            href: urlString`chrome://settings/performance`,
          },
          PH2: {
            title: i18n.i18n.lockedString('Extensions settings'),
            href: urlString`chrome://extensions`,
          },
        },
      }],
    });
  });

  it('renders disabled by Data Saver', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByDataSaver = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is disabled'),
      warnings: [{
        key: i18n.i18n.lockedString('Data Saver'),
        valueId: 'Speculative loading is disabled because of the operating system\'s Data Saver mode.',
      }],
    });
  });

  it('renders disabled by Battery Saver', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByBatterySaver = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is disabled'),
      warnings: [{
        key: i18n.i18n.lockedString('Battery Saver'),
        valueId: 'Speculative loading is disabled because of the operating system\'s Battery Saver mode.',
      }],
    });
  });

  it('renders force enabled by prefetch holdback', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByHoldbackPrefetchSpeculationRules = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is force-enabled'),
      warnings: [{
        key: i18n.i18n.lockedString('Prefetch was disabled, but is force-enabled now'),
        valueId:
            'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
      }],
    });
  });

  it('renders force enabled by prerender holdback', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByHoldbackPrerenderSpeculationRules = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is force-enabled'),
      warnings: [{
        key: i18n.i18n.lockedString('Prerendering was disabled, but is force-enabled now'),
        valueId:
            'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
      }],
    });
  });

  it('renders multiple warnings', async () => {
    const view = createViewFunctionStub(PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar);
    const component = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar(view);
    component.disabledByPreference = true;
    component.disabledByDataSaver = true;
    component.disabledByBatterySaver = true;
    component.disabledByHoldbackPrefetchSpeculationRules = true;
    component.disabledByHoldbackPrerenderSpeculationRules = true;
    const input = await view.nextInput;

    assert.deepEqual(input, {
      header: i18n.i18n.lockedString('Speculative loading is disabled'),
      warnings: [
        {
          key: i18n.i18n.lockedString('User settings or extensions'),
          valueId:
              'Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.',
          placeholders: {
            PH1: {
              title: i18n.i18n.lockedString('Preload pages settings'),
              href: urlString`chrome://settings/performance`,
            },
            PH2: {
              title: i18n.i18n.lockedString('Extensions settings'),
              href: urlString`chrome://extensions`,
            },
          },
        },
        {
          key: i18n.i18n.lockedString('Data Saver'),
          valueId: 'Speculative loading is disabled because of the operating system\'s Data Saver mode.',
        },
        {
          key: i18n.i18n.lockedString('Battery Saver'),
          valueId: 'Speculative loading is disabled because of the operating system\'s Battery Saver mode.',
        },
        {
          key: i18n.i18n.lockedString('Prefetch was disabled, but is force-enabled now'),
          valueId:
              'Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.',
        },
        {
          key: i18n.i18n.lockedString('Prerendering was disabled, but is force-enabled now'),
          valueId:
              'Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.',
        },
      ],
    });
  });
});
