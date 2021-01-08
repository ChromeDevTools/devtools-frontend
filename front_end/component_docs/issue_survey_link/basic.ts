// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Issues from '../../issues/issues.js';

const link = new Issues.IssueSurveyLink.IssueSurveyLink();
document.getElementById('container')?.appendChild(link);

// TODO(petermarshall): The icon doesn't render because importing sub-components cross-module
// is tricky. Add some more interesting examples once it does.

link.data = {
  trigger: 'test trigger',
  canShowSurvey: (trigger, callback): void => {
    setTimeout(callback.bind(undefined, {canShowSurvey: true}), 500);
  },
  showSurvey: (trigger, callback): void => {
    setTimeout(callback.bind(undefined, {surveyShown: true}), 1500);
  },
};
