// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as ObjectUI from './object_ui.js';

describe('ObjectPropertiesSection', () => {
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

describeWithEnvironment('ObjectPropertyTreeElement', () => {
  it('can edit values', async () => {
    const property = new SDK.RemoteObject.RemoteObjectProperty(
        'name', SDK.RemoteObject.RemoteObject.fromLocalObject(42), true, true);
    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement(
        new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property));
    section.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();

    const promptStub =
        sinon.stub(ObjectUI.ObjectPropertiesSection.ObjectPropertyPrompt.prototype, 'attachAndStartEditing');
    promptStub.returns(document.createElement('div'));
    renderElementIntoDOM(section.listItemElement);
    section.update();
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    section.valueElement.dispatchEvent(event);
    sinon.assert.calledOnce(promptStub);
  });

  it('shows expandable text contents for lengthy strings', async () => {
    const longString = `l${'o'.repeat(15000)}ng`;
    const value = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
        SDK.RemoteObject.RemoteObject.fromLocalObject(longString), false, true);

    renderElementIntoDOM(value, {includeCommonStyles: true});

    await assertScreenshot('object_ui/expandable_strings.png');

    const copyStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
    const copyButton = value.querySelector<HTMLButtonElement>('[data-text="Copy"]');
    assert.exists(copyButton);
    const expandButton = value.querySelector<HTMLButtonElement>('[data-text="Show more (15.0\xA0kB)"]');
    assert.exists(expandButton);

    sinon.assert.notCalled(copyStub);
    copyButton.click();
    sinon.assert.calledOnceWithExactly(copyStub, `"${longString}"`);

    assert.notStrictEqual(value.textContent, `"${longString}"`);
    expandButton.click();
    assert.strictEqual(value.textContent, `"${longString}"`);
  });
});
