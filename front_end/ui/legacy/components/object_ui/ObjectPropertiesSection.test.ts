// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../core/sdk/sdk.js';
import * as Common from '../../../../core/common/common.js';
import * as ObjectUI from './object_ui.js';
import * as UI from '../../legacy.js';

import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import {dispatchClickEvent} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {someMutations} from '../../../../testing/MutationHelpers.js';
import {
  describeWithRealConnection,
  getExecutionContext,
} from '../../../../testing/RealConnection.js';

describe('ObjectPropertiesSection', () => {
  describeWithRealConnection('ObjectPropertiesSection', () => {
    async function evaluateAndGetProperties(code: string, accessorPropertiesOnly = false, generatePreview = false):
        Promise<{object: SDK.RemoteObject.RemoteObject, properties: SDK.RemoteObject.RemoteObjectProperty[]}> {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const target = targetManager.rootTarget();
      assertNotNullOrUndefined(target);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assertNotNullOrUndefined(runtimeModel);
      const executionContext = await getExecutionContext(runtimeModel);
      UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
      const {result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
          code, false /* throwOnSideEffect */, true /* replMode */, 500 /* timeout */);
      if (!(result && 'object' in result && result.object)) {
        throw new Error('Cannot evaluate test object');
      }
      const {object} = result;
      const {properties} = await object.getAllProperties(accessorPropertiesOnly, generatePreview);
      assertNotNullOrUndefined(properties);
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
      assertNotNullOrUndefined(calculateValueButton);
      const mutations = someMutations(propertiesSection.listItemElement);
      calculateValueButton.click();
      await mutations;

      assert.strictEqual(VALUE, propertiesSection.valueElement.innerHTML);
    });

    describe('assignWebIDLMetadata', () => {
      async function checkImportProperties(code: string, important: string[], notImportant: string[] = []) {
        const {object, properties} = await evaluateAndGetProperties(code);
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.assignWebIDLMetadata(object, properties);
        const expected = new Set<string>(important);
        const notExpected = new Set<string>(notImportant);
        for (const property of properties) {
          if (property.webIdl?.applicable) {
            expected.delete(property.name);
            notExpected.delete(property.name);
          }
        }

        assert.strictEqual(
            expected.size, 0, `Not all expected properties were found (${[...expected].join(', ')} is missing)`);
        assert.strictEqual(notExpected.size, notImportant.length, 'Unexpected properties were found');
      }

      it('marks important DOM properties for checkbox inputs', async () => {
        await checkImportProperties(
            `(() => {
             const input = document.createElement('input');
             input.type = 'checkbox';
             return input;
           })()`,
            [
              'checked',
              'required',
              'type',
              'value',
            ],
            [
              'accept',
              'files',
              'multiple',
            ],
        );
      });

      it('marks important DOM properties for file inputs', async () => {
        await checkImportProperties(
            `(() => {
             const input = document.createElement('input');
             input.type = 'file';
             return input;
           })()`,
            [
              'accept',
              'files',
              'multiple',
              'required',
              'type',
            ],
            [
              'checked',
            ],
        );
      });

      it('marks important DOM properties for anchors', async () => {
        await checkImportProperties(
            `(() => {
             const a = document.createElement('a');
             a.href = 'https://www.google.com:1234/foo/bar/baz?hello=world#what';
             const code = document.createElement('code');
             code.innerHTML = 'hello world';
             a.append(code);
             return a;
           })()`,
            [
              // https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
              'text',
              // https://html.spec.whatwg.org/multipage/links.html#htmlhyperlinkelementutils
              'href',
              'origin',
              'protocol',
              'hostname',
              'port',
              'pathname',
              'search',
              'hash',
            ],
        );
      });

      it('marks important DOM properties for the window object', async () => {
        await checkImportProperties(
            'window',
            [
              'customElements',
              'document',
              'frames',
              'history',
              'location',
              'navigator',
            ],
        );
      });
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
        assertNotNullOrUndefined(icon);
        const reveal = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

        dispatchClickEvent(icon);

        sinon.assert.calledOnceWithMatch(reveal, sinon.match({object, expression}), false);
      });
    });
  });
});
