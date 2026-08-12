// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

// eslint-disable-next-line @devtools/es-modules-import
import * as SDK from './sdk.js';

describe('DebuggerModel API Test', () => {
  it('verifies that skipAllPauses setting works when navigating to a page with a debugger stmt',
     async ({inspectedPage, universe}) => {
       const primaryTarget = universe.targetManager.primaryPageTarget();
       assert.isNotNull(primaryTarget, 'Primary page target should exist');

       const debuggerModel = primaryTarget.model(SDK.DebuggerModel.DebuggerModel);
       assert.isNotNull(debuggerModel, 'DebuggerModel should exist');

       const skipAllPausesSetting = universe.settings.resolve(SDK.DebuggerModel.skipAllPausesSettingDescriptor);
       skipAllPausesSetting.set(true);

       let debuggerPausedFired = false;
       const listener = (): void => {
         debuggerPausedFired = true;
       };
       debuggerModel.addEventListener(SDK.DebuggerModel.Events.DebuggerPaused, listener);

       await inspectedPage.goToHtml(`
         <!DOCTYPE html>
         <html>
           <body>
             <script>
               debugger;
             </script>
           </body>
         </html>
       `);

       assert.isFalse(debuggerPausedFired, 'DebuggerPaused event should not fire when skipAllPauses is enabled');
       assert.isFalse(debuggerModel.isPaused(), 'DebuggerModel should not be paused when skipAllPauses is enabled');

       debuggerModel.removeEventListener(SDK.DebuggerModel.Events.DebuggerPaused, listener);
     });
});
