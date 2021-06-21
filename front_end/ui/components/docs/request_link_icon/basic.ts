// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

import type * as RequestLinkIconModule from '../../../../ui/components/request_link_icon/request_link_icon.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const RequestLinkIcon: typeof RequestLinkIconModule =
    await import('../../../../ui/components/request_link_icon/request_link_icon.js');

function appendComponent(data: RequestLinkIconModule.RequestLinkIcon.RequestLinkIconData) {
  const component = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
  component.data = data;
  document.getElementById('container')?.appendChild(component);
}

appendComponent({});
