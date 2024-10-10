// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../components/panel_introduction_steps/panel_introduction_steps.js';

import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

const {html} = LitHtml;

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const container = document.getElementById('container');
if (container) {
  LitHtml.render(
      html`
<devtools-panel-introduction-steps>
<span slot="title">Get actionable insights on your website's performance</span>
<span slot="step-1">Record or import a trace into the Performance Insights panel</span>
<span slot="step-2">Get an overview of your page’s runtime performance</span>
<span slot="step-3">Identify improvements to your performance via a list of actionable insights</span>
</devtools-panel-introduction-steps>
                 `,
      container, {host: this});
}
