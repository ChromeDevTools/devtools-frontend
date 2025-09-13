// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as Lit from '../../../../../front_end/ui/lit/lit.js';
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';

const {html} = Lit;

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const container = document.getElementById('container');
const throttlingIconUrl = new URL('../../../../panels/recorder/images/throttling_icon.svg', import.meta.url).toString();
const playIconUrl = new URL('../../../../images/play_icon.svg', import.meta.url).toString();

const items = [
  {
    value: 'performance',
    label: () => 'Performance panel',
    buttonIconUrl: throttlingIconUrl,
  },
  {
    value: 'performance_insights',
    label: () => 'Performance insights panel',
    buttonIconUrl: throttlingIconUrl,
  },
];

const replayItems = [
  {
    value: 'normal',
    buttonIconUrl: playIconUrl,
    buttonLabel: () => 'Replay',
    label: () => 'Normal (Default)',
  },
  {value: 'slow', buttonIconUrl: playIconUrl, buttonLabel: () => 'Slow replay', label: (): string => 'Slow'},
  {
    value: 'very_slow',
    buttonIconUrl: playIconUrl,
    buttonLabel: () => 'Very slow replay',
    label: () => 'Very slow',
  },
  {
    value: 'extremely_slow',
    buttonIconUrl: playIconUrl,
    buttonLabel: () => 'Extremely slow replay',
    label: () => 'Extremely slow',
  },
];

function litRender(template: Lit.TemplateResult): void {
  const div = document.createElement('div');
  div.style.width = '400px';
  div.style.display = 'flex';
  div.style.margin = '10px';
  div.style.flexDirection = 'row-reverse';
  container?.appendChild(div);
  Lit.render(template, div);
}

litRender(html`
    <devtools-select-button .items=${items} .value=${items[0].value}></devtools-select-button>`);
litRender(html`
    <devtools-select-button .disabled=${true} .items=${items} .value=${items[0].value}>
    </devtools-select-button>`);
litRender(html`
    <devtools-select-button
      .variant=${RecorderComponents.SelectButton.Variant.OUTLINED}
      .items=${replayItems}
      .value=${replayItems[0].value}>
    </devtools-select-button>`);
litRender(html`
    <devtools-select-button
      .disabled=${true}
      .variant=${RecorderComponents.SelectButton.Variant.OUTLINED}
      .items=${replayItems}
      .value=${replayItems[2].value}>
    </devtools-select-button>`);
