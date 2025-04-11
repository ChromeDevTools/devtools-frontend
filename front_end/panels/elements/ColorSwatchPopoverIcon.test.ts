// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {describeWithEnvironment, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {getMatchedStyles} from '../../testing/StyleHelpers.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';

import * as Elements from './elements.js';

describeWithMockConnection('ColorSwatchPopoverIcon', () => {
  describeWithEnvironment('', () => {
    setupActionRegistry();
    beforeEach(() => {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const resourceMapping =
          new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace);
      Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance(
          {forceNew: true, resourceMapping, targetManager: SDK.TargetManager.TargetManager.instance()});
    });
    it('correctly reports changed colors with custom property color names', async () => {
      const property = new SDK.CSSProperty.CSSProperty(
          sinon.createStubInstance(SDK.CSSStyleDeclaration.CSSStyleDeclaration), 0, 'color', 'red', true, false, true,
          false, '', undefined, []);
      const treeElement = new Elements.StylePropertyTreeElement.StylePropertyTreeElement({
        stylesPane:
            new Elements.StylesSidebarPane.StylesSidebarPane(new Elements.ComputedStyleModel.ComputedStyleModel()),
        section: sinon.createStubInstance(Elements.StylePropertiesSection.StylePropertiesSection),
        matchedStyles: await getMatchedStyles(),
        property,
        isShorthand: false,
        inherited: false,
        overloaded: false,
        newProperty: true,
      });

      const helper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
      const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
      swatch.setColor(Common.Color.parse('red')!);
      const showPopoverStub = sinon.stub(helper, 'show');
      const icon = new Elements.ColorSwatchPopoverIcon.ColorSwatchPopoverIcon(treeElement, helper, swatch);
      const iconColorChanged = sinon.stub<[Common.EventTarget.EventTargetEvent<
          Common.Color.Color, Elements.ColorSwatchPopoverIcon.ColorSwatchPopoverIconEventTypes>]>();
      icon.addEventListener(
          Elements.ColorSwatchPopoverIcon.ColorSwatchPopoverIconEvents.COLOR_CHANGED, iconColorChanged);
      icon.showPopover();
      sinon.assert.calledOnce(showPopoverStub);
      const spectrum = showPopoverStub.args[0][0];
      assert.instanceOf(spectrum, ColorPicker.Spectrum.Spectrum);
      sinon.stub(spectrum, 'colorName').returns('--yellow');
      spectrum.dispatchEventToListeners(ColorPicker.Spectrum.Events.COLOR_CHANGED, 'yellow');
      sinon.assert.calledOnce(iconColorChanged);
      assert.strictEqual(iconColorChanged.args[0][0].data.asString(), '#ffff00');
      assert.strictEqual(iconColorChanged.args[0][0].data.getAuthoredText(), 'var(--yellow)');
    });
  });
});
