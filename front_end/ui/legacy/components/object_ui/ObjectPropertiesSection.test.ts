// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import {dispatchClickEvent} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {someMutations} from '../../../../testing/MutationHelpers.js';
import {
  describeWithRealConnection,
  getExecutionContext,
} from '../../../../testing/RealConnection.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describe('ObjectPropertiesSection', () => {
  describeWithRealConnection('ObjectPropertiesSection', () => {
    async function evaluateAndGetProperties(code: string, accessorPropertiesOnly = false, generatePreview = false):
        Promise<{object: SDK.RemoteObject.RemoteObject, properties: SDK.RemoteObject.RemoteObjectProperty[]}> {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const target = targetManager.rootTarget();
      assert.exists(target);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const executionContext = await getExecutionContext(runtimeModel);
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      const {result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
          code, false /* throwOnSideEffect */, true /* replMode */, 500 /* timeout */);
      if (!(result && 'object' in result && result.object)) {
        throw new Error('Cannot evaluate test object');
      }
      const {object} = result;
      const {properties} = await object.getAllProperties(accessorPropertiesOnly, generatePreview);
      assert.exists(properties);
      return {object, properties};
    }

    async function setupTreeOutline(code: string, accessorPropertiesOnly: boolean, generatePreview: boolean) {
      const {object, properties} = await evaluateAndGetProperties(code, accessorPropertiesOnly, generatePreview);
      const treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline({readOnly: true});
      ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(
          treeOutline.rootElement(), properties, null, true /* skipProto */, false /* skipGettersAndSetters */, object);
      return treeOutline;
    }

    it('can reveal private accessor values', async () => {
      const VALUE = '42';
      const treeOutline = await setupTreeOutline(
          `(() => {
           class A {
             get #bar() { return ${VALUE}; }
           };
           return new A();
         })()`,
          true, false);

      const propertiesSection =
          treeOutline.rootElement().firstChild() as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;

      propertiesSection.update();

      const calculateValueButton =
          propertiesSection.valueElement.querySelector('.object-value-calculate-value-button') as HTMLElement;
      assert.exists(calculateValueButton);
      const mutations = someMutations(propertiesSection.listItemElement);
      calculateValueButton.click();
      await mutations;

      assert.strictEqual(VALUE, propertiesSection.valueElement.innerHTML);
    });
  });

  describeWithEnvironment('ObjectPropertiesSection', () => {
    describe('appendMemoryIcon', () => {
      it('appends a memory icon for inspectable object types', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(true);

        const div = document.createElement('div');
        assert.isFalse(div.hasChildNodes());
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object);
        assert.isTrue(div.hasChildNodes());
        const icon = div.querySelector('devtools-icon');
        assert.isNotNull(icon);
      });

      it('doesn\'t append a memory icon for non-inspectable object types', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(false);

        const div = document.createElement('div');
        assert.isFalse(div.hasChildNodes());
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object);
        assert.isFalse(div.hasChildNodes());
      });

      it('triggers the correct revealer upon \'click\'', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(true);
        const expression = 'foo';

        const div = document.createElement('div');
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object, expression);
        const icon = div.querySelector('devtools-icon');
        assert.exists(icon);
        const reveal = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

        dispatchClickEvent(icon);

        sinon.assert.calledOnceWithMatch(reveal, sinon.match({object, expression}), false);
      });
    });
  });
});
