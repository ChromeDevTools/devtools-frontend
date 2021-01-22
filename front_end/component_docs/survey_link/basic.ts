// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../front_end/common/common.js';
import * as FrontendHelpers from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const link = new Components.SurveyLink.SurveyLink();
document.getElementById('container')?.appendChild(link);

// TODO(petermarshall): The icon doesn't render because importing sub-components cross-module
// is tricky. Add some more interesting examples once it does.

link.data = {
  trigger: 'test trigger',
  promptText: Common.UIString.LocalizedEmptyString,
  canShowSurvey: (trigger, callback): void => {
    setTimeout(callback.bind(undefined, {canShowSurvey: true}), 500);
  },
  showSurvey: (trigger, callback): void => {
    setTimeout(callback.bind(undefined, {surveyShown: true}), 1500);
  },
};
