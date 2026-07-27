// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

// eslint-disable-next-line @devtools/es-modules-import
import * as SDK from './sdk.js';

interface GlobalWithCSS {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CSS?: unknown;
}

describe('CSSModel API Test', () => {
  it('adds a semicolon when enabling a property that lacked one, inserts properties, and enables them correctly',
     async ({inspectedPage, universe}) => {
       // Mock CSS.supports in Node environment for API tests.
       let cssMocked = false;
       if (typeof globalThis.CSS === 'undefined') {
         (globalThis as unknown as GlobalWithCSS).CSS = undefined;
         cssMocked = true;
       }
       const stub = sinon.stub(globalThis, 'CSS').value({
         supports: () => true,
       });

       try {
         const primaryTarget = universe.targetManager.primaryPageTarget();
         assert.isNotNull(primaryTarget);

         const domModel = primaryTarget.model(SDK.DOMModel.DOMModel);
         assert.isNotNull(domModel);

         const cssModel = primaryTarget.model(SDK.CSSModel.CSSModel);
         assert.isNotNull(cssModel);

         await inspectedPage.goToHtml(`
           <style>
           #formatted {
               color: red;
               margin: 0
           }
           </style>
           <div id="formatted">Formatted</div>
         `);

         const documentNode = await domModel.requestDocument();
         assert.isNotNull(documentNode);

         // Retrieve the subtree to populate the DOMModel cache.
         await documentNode.getSubtree(5, true);

         const nodeId = await domModel.querySelector(documentNode.id, '#formatted');
         assert.isNotNull(nodeId);

         const matchedResult = await cssModel.getMatchedStyles(nodeId);
         assert.isNotNull(matchedResult);

         const style = matchedResult.nodeStyles()[1];
         assert.isNotNull(style);

         cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, event => {
           const {edit} = event.data;
           if (edit) {
             style.rebase(edit);
           }
         });

         const marginProperty = style.allProperties()[1];
         assert.strictEqual(marginProperty.name, 'margin');
         assert.strictEqual(marginProperty.value, '0');

         let success = await marginProperty.setDisabled(true);
         assert.isTrue(success);
         assert.include(style.cssText, '/* margin: 0; */');

         const insertPromise = new Promise<void>(resolve => {
           style.insertPropertyAt(2, 'endProperty', 'endValue', success => {
             assert.isTrue(success);
             resolve();
           });
         });
         await insertPromise;
         assert.include(style.cssText, '/* margin: 0; */');
         assert.include(style.cssText, 'endProperty: endValue;');

         const updatedMarginProperty = style.allProperties()[1];
         success = await updatedMarginProperty.setDisabled(false);
         assert.isTrue(success);
         assert.include(style.cssText, 'margin: 0;');
         assert.include(style.cssText, 'endProperty: endValue;');
       } finally {
         // Clean up the mock to avoid polluting the global scope.
         stub.restore();
         if (cssMocked) {
           delete (globalThis as unknown as GlobalWithCSS).CSS;
         }
       }
     });
});
