// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import { SurveyLink } from '../survey_link/survey_link.js';
export function render(container) {
    const link = new SurveyLink.SurveyLink();
    container.appendChild(link);
    link.data = {
        trigger: 'test trigger',
        promptText: Common.UIString.LocalizedEmptyString,
        canShowSurvey: (_trigger, callback) => {
            setTimeout(callback.bind(undefined, { canShowSurvey: true }), 500);
        },
        showSurvey: (_trigger, callback) => {
            setTimeout(callback.bind(undefined, { surveyShown: true }), 1500);
        },
    };
}
//# sourceMappingURL=SurveyLink.docs.js.map