// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';

import {type Client, TimelineController} from './TimelineController.js';
import {UIDevtoolsUtils} from './UIDevtoolsUtils.js';
import * as Utils from './utils/utils.js';

export class UIDevtoolsController extends TimelineController {
  constructor(rootTarget: SDK.Target.Target, primaryPageTarget: SDK.Target.Target, client: Client) {
    super(rootTarget, primaryPageTarget, client);
    Utils.EntryStyles.setEventStylesMap(UIDevtoolsUtils.categorizeEvents());
    Utils.EntryStyles.setCategories(UIDevtoolsUtils.categories());
    Utils.EntryStyles.setTimelineMainEventCategories(
        UIDevtoolsUtils.getMainCategoriesList().filter(Utils.EntryStyles.stringIsEventCategory));
  }
}
