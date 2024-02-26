// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../panels/recorder/components/components.js';

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

(document.getElementById('container') as HTMLElement).innerHTML = `
    <devtools-split-view>
        <div slot="main" style="padding: 10px;">
            Left
        </div>
        <div slot="sidebar" style="padding: 10px;">
            Sidebar
        </div>
    </devtools-split-view>
`;
