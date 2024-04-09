// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Models from './models.js';

describe('SchemaUtils', () => {
  it('should compare step selectors', () => {
    const {areSelectorsEqual} = Models.SchemaUtils;
    assert.isTrue(
        areSelectorsEqual(
            {type: Models.Schema.StepType.Scroll},
            {type: Models.Schema.StepType.Scroll},
            ),
    );
    assert.isFalse(
        areSelectorsEqual(
            {type: Models.Schema.StepType.Scroll, selectors: [['#id']]},
            {type: Models.Schema.StepType.Scroll},
            ),
    );
    assert.isTrue(
        areSelectorsEqual(
            {type: Models.Schema.StepType.Scroll, selectors: [['#id']]},
            {type: Models.Schema.StepType.Scroll, selectors: [['#id']]},
            ),
    );
    assert.isFalse(
        areSelectorsEqual(
            {type: Models.Schema.StepType.Scroll, selectors: [['#id', '#id2']]},
            {type: Models.Schema.StepType.Scroll, selectors: [['#id']]},
            ),
    );
  });
});
