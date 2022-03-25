// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as ObjectUI from '../../../../../../../front_end/ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';

import {describeWithRealConnection, getExecutionContext} from '../../../../helpers/RealConnection.js';
import {someMutations} from '../../../../helpers/MutationHelpers.js';

describeWithRealConnection('ObjectPropertiesSection', () => {
  it('can reveal private accessor values', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const target = targetManager.mainTarget();
    if (!target) {
      throw new Error('Cannot get target');
    }
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!runtimeModel) {
      throw new Error('Cannot get runtimeModel');
    }
    const executionContext = await getExecutionContext(runtimeModel);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);
    const VALUE = '42';

    const {result} = await ObjectUI.JavaScriptREPL.JavaScriptREPL.evaluateAndBuildPreview(
        `(() => {
           class A {
             get #bar() { return ${VALUE}; }
           };
           return new A();
         })()`,
        false /* throwOnSideEffect */, true /* replMode */, 500 /* timeout */);
    if (!(result && 'object' in result && result.object)) {
      throw new Error('Cannot evaluate test object');
    }
    const {properties} =
        await result.object.getAllProperties(true /* accessorPropertiesOnly */, false /* generatePreview */);

    if (!properties || !properties.length) {
      throw new Error('Cannot get test object property');
    }
    const treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline({readOnly: true});
    ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(
        treeOutline.rootElement(), properties, null, true /* skipProto */, false /* skipGettersAndSetters */,
        result.object);

    const propertiesSection =
        treeOutline.rootElement().firstChild() as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;

    propertiesSection.update();

    const calculateValueButton =
        propertiesSection.valueElement.querySelector('.object-value-calculate-value-button') as HTMLElement;
    if (!calculateValueButton) {
      throw new Error('Cannot get calculate value button');
    }
    const mutations = someMutations(propertiesSection.listItemElement);
    calculateValueButton.click();
    await mutations;

    assert.strictEqual(VALUE, propertiesSection.valueElement.innerHTML);
  });
});
