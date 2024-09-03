// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import propertiesWidgetStyles from './propertiesWidget.css.js';

const OBJECT_GROUP_NAME = 'properties-sidebar-pane';

const UIStrings = {
  /**
   * @description Text on the checkbox in the Properties tab of the Elements panel, which controls whether
   * all properties of the currently selected DOM element are shown, or only meaningful properties (i.e.
   * excluding properties whose values aren't set for example).
   */
  showAll: 'Show all',
  /**
   * @description Tooltip on the checkbox in the Properties tab of the Elements panel, which controls whether
   * all properties of the currently selected DOM element are shown, or only meaningful properties (i.e.
   * excluding properties whose values aren't set for example).
   */
  showAllTooltip: 'When unchecked, only properties whose values are neither null nor undefined will be shown',
  /**
   * @description Text shown to the user when a filter is applied in the Properties tab of the Elements panel, but
   * no properties matched the filter and thus no results were returned.
   */
  noMatchingProperty: 'No matching property',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/PropertiesWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PropertiesWidget extends UI.ThrottledWidget.ThrottledWidget {
  private node: SDK.DOMModel.DOMNode|null;
  private readonly showAllPropertiesSetting: Common.Settings.Setting<boolean>;
  private filterRegex: RegExp|null = null;
  private readonly noMatchesElement: HTMLElement;
  private readonly treeOutline: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;
  private readonly expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;
  private lastRequestedNode?: SDK.DOMModel.DOMNode;
  constructor(throttlingTimeout?: number) {
    super(true /* isWebComponent */, throttlingTimeout);

    this.showAllPropertiesSetting = Common.Settings.Settings.instance().createSetting('show-all-properties', false);
    this.showAllPropertiesSetting.addChangeListener(this.filterList.bind(this));

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this.onNodeChange, this, {scoped: true});
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this.onNodeChange, this, {scoped: true});
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.setNode, this);
    this.node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    const hbox = this.contentElement.createChild('div', 'hbox properties-widget-toolbar');
    const toolbar = new UI.Toolbar.Toolbar('styles-pane-toolbar', hbox);
    const filterInput = new UI.Toolbar.ToolbarFilter(undefined, 1, 1, undefined, undefined, false);
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onFilterChanged, this);
    toolbar.appendToolbarItem(filterInput);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(
        this.showAllPropertiesSetting, i18nString(UIStrings.showAllTooltip), i18nString(UIStrings.showAll)));

    this.contentElement.setAttribute('jslog', `${VisualLogging.pane('element-properties').track({resize: true})}`);
    this.noMatchesElement = this.contentElement.createChild('div', 'gray-info-message hidden');
    this.noMatchesElement.textContent = i18nString(UIStrings.noMatchingProperty);

    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline({readOnly: true});
    this.treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true, /* preventTabOrder */ false);
    this.expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);
    this.contentElement.appendChild(this.treeOutline.element);

    this.treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.DOMPropertiesExpanded);
    });

    this.update();
  }

  private onFilterChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.filterRegex = event.data ? new RegExp(Platform.StringUtilities.escapeForRegExp(event.data), 'i') : null;
    this.filterList();
  }

  private filterList(): void {
    let noMatches = true;
    for (const element of this.treeOutline.rootElement().children()) {
      const {property} = element as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement;
      const hidden = !property?.match({
        includeNullOrUndefinedValues: this.showAllPropertiesSetting.get(),
        regex: this.filterRegex,
      });
      if (!hidden) {
        noMatches = false;
      }
      element.hidden = hidden;
    }
    this.noMatchesElement.classList.toggle('hidden', !noMatches);
  }

  private setNode(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode|null>): void {
    this.node = event.data;
    this.update();
  }

  override async doUpdate(): Promise<void> {
    if (this.lastRequestedNode) {
      this.lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(OBJECT_GROUP_NAME);
      delete this.lastRequestedNode;
    }

    if (!this.node) {
      this.treeOutline.removeChildren();
      return;
    }

    this.lastRequestedNode = this.node;
    const object = await this.node.resolveToObject(OBJECT_GROUP_NAME);
    if (!object) {
      return;
    }

    const treeElement = this.treeOutline.rootElement();
    let {properties} = await SDK.RemoteObject.RemoteObject.loadFromObjectPerProto(object, true /* generatePreview */);
    treeElement.removeChildren();
    if (properties === null) {
      properties = [];
    }
    ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populateWithProperties(
        treeElement, properties, null, true /* skipProto */, true /* skipGettersAndSetters */, object);
    this.filterList();
  }

  private onNodeChange(event: Common.EventTarget
                           .EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}|SDK.DOMModel.DOMNode>): void {
    if (!this.node) {
      return;
    }
    const data = event.data;
    const node = (data instanceof SDK.DOMModel.DOMNode ? data : data.node as SDK.DOMModel.DOMNode);
    if (this.node !== node) {
      return;
    }
    this.update();
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([propertiesWidgetStyles]);
  }
}
