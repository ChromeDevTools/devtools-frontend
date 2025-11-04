// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../models/trace/trace.js';
import { TimelineController } from './TimelineController.js';
import { UIDevtoolsUtils } from './UIDevtoolsUtils.js';
export class UIDevtoolsController extends TimelineController {
    constructor(rootTarget, primaryPageTarget, client) {
        super(rootTarget, primaryPageTarget, client);
        Trace.Styles.setEventStylesMap(UIDevtoolsUtils.categorizeEvents());
        Trace.Styles.setCategories(UIDevtoolsUtils.categories());
        Trace.Styles.setTimelineMainEventCategories(UIDevtoolsUtils.getMainCategoriesList().filter(Trace.Styles.stringIsEventCategory));
    }
}
//# sourceMappingURL=UIDevtoolsController.js.map