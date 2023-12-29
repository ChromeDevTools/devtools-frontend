// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const container = document.getElementById('container');
const throttlingIconUrl = new URL('../../../../panels/recorder/images/throttling_icon.svg', import.meta.url).toString();
const playIconUrl = new URL('../../../../images/play_icon.svg', import.meta.url).toString();

const items = [
  {
    value: 'performance',
    label: (): string => 'Performance panel',
    buttonIconUrl: throttlingIconUrl,
  },
  {
    value: 'performance_insights',
    label: (): string => 'Performance insights panel',
    buttonIconUrl: throttlingIconUrl,
  },
];

const replayItems = [
  {
    value: 'normal',
    buttonIconUrl: playIconUrl,
    buttonLabel: (): string => 'Replay',
    label: (): string => 'Normal (Default)',
  },
  {value: 'slow', buttonIconUrl: playIconUrl, buttonLabel: (): string => 'Slow replay', label: (): string => 'Slow'},
  {
    value: 'very_slow',
    buttonIconUrl: playIconUrl,
    buttonLabel: (): string => 'Very slow replay',
    label: (): string => 'Very slow',
  },
  {
    value: 'extremely_slow',
    buttonIconUrl: playIconUrl,
    buttonLabel: (): string => 'Extremely slow replay',
    label: (): string => 'Extremely slow',
  },
];

function litRender(template: LitHtml.TemplateResult): void {
  const div = document.createElement('div');
  div.style.width = '400px';
  div.style.display = 'flex';
  div.style.margin = '10px';
  div.style.flexDirection = 'row-reverse';
  container?.appendChild(div);
  LitHtml.render(template, div);  // eslint-disable-line
}

litRender(LitHtml.html`
    <${RecorderComponents.SelectButton.SelectButton.litTagName} .items=${items} .value=${items[0].value}></${
    RecorderComponents.SelectButton.SelectButton.litTagName}>`);
litRender(LitHtml.html`
    <${RecorderComponents.SelectButton.SelectButton.litTagName} .disabled=${true} .items=${items} .value=${
    items[0].value}></${RecorderComponents.SelectButton.SelectButton.litTagName}>`);
litRender(LitHtml.html`
    <${RecorderComponents.SelectButton.SelectButton.litTagName}
    .variant=${RecorderComponents.SelectButton.Variant.SECONDARY}
    .items=${replayItems}
    .value=${replayItems[0].value}></${RecorderComponents.SelectButton.SelectButton.litTagName}>`);
litRender(LitHtml.html`
    <${RecorderComponents.SelectButton.SelectButton.litTagName}
    .disabled=${true}
    .variant=${RecorderComponents.SelectButton.Variant.SECONDARY}
    .items=${replayItems}
    .value=${replayItems[2].value}></${RecorderComponents.SelectButton.SelectButton.litTagName}>`);
