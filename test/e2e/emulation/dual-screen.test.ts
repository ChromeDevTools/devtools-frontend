// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  clickToggleButton,
  selectDualScreen,
  selectNonDualScreenDevice,
  selectToggleButton,
  startEmulationWithDualScreenPage,
  waitForWidthOfDevice,
} from '../helpers/emulation-helpers.js';

const DUO_VERTICAL_SPANNED_WIDTH = '1114';
const DUO_VERTICAL_WIDTH = '540';

describe('Dual screen mode', () => {
  it('User can toggle between single and dual screenmodes for a dual screen device',
     async ({devToolsPage, inspectedPage}) => {
       await startEmulationWithDualScreenPage(devToolsPage, inspectedPage);
       await selectDualScreen(devToolsPage);
       await clickToggleButton(devToolsPage);
       await waitForWidthOfDevice(devToolsPage, DUO_VERTICAL_SPANNED_WIDTH);

       await clickToggleButton(devToolsPage);
       await waitForWidthOfDevice(devToolsPage, DUO_VERTICAL_WIDTH);
     });

  it('User may not click toggle dual screen button for a non-dual screen device',
     async ({devToolsPage, inspectedPage}) => {
       await startEmulationWithDualScreenPage(devToolsPage, inspectedPage);
       await selectNonDualScreenDevice(devToolsPage);
       // toggle button should not be found
       const toggleButton = await selectToggleButton(devToolsPage);
       assert.isNull(toggleButton);
     });
});
