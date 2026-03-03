// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ElementsComponents from './components/components.js';
import {StylePropertiesSection} from './StylePropertiesSection.js';
import type {StylePropertyTreeElement} from './StylePropertyTreeElement.js';
import type {StylesContainer} from './StylesContainer.js';
import stylesSidebarPaneStyles from './stylesSidebarPane.css.js';
import {WebCustomData} from './WebCustomData.js';

interface ViewInput {
  sections: StylePropertiesSection[];
}

type View = (input: ViewInput, output_: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  render(
      html`
    <style>${stylesSidebarPaneStyles}</style>
    <div class="style-panes-wrapper" jslog=${VisualLogging.section('standalone-styles').track({
        resize: true
      })}>
      <div class="styles-pane">
        ${input.sections.map(section => section.element)}
      </div>
    </div>
  `,
      target);
};

export class StandaloneStylesContainer extends UI.Widget.VBox implements StylesContainer {
  activeCSSAngle: InlineEditor.CSSAngle.CSSAngle|null = null;
  isEditingStyle = false;
  readonly sectionByElement = new WeakMap<Node, StylePropertiesSection>();
  // TODO: Reference the MAX_LINK_LENGTH from StylesSidebarPane at a later stage, when we have a reference to it.
  readonly linkifier: Components.Linkifier.Linkifier =
      new Components.Linkifier.Linkifier(23, /* useLinkDecorator */ true);

  #webCustomData: WebCustomData|undefined;
  #userOperation = false;
  #sections: StylePropertiesSection[] = [];
  #swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
  #computedStyleModelInternal = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
  #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  get userOperation(): boolean {
    return this.#userOperation;
  }

  get webCustomData(): WebCustomData|undefined {
    if (!this.#webCustomData &&
        Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
      this.#webCustomData = WebCustomData.create();
    }
    return this.#webCustomData;
  }

  async #updateSections(): Promise<void> {
    const node = this.node();
    if (!node) {
      this.#sections = [];
      this.requestUpdate();
      return;
    }

    const cssModel = node.domModel().cssModel();
    const matchedStyles = await cssModel.cachedMatchedCascadeForNode(node);
    const parentNodeId = matchedStyles?.getParentLayoutNodeId();

    const [parentStyles, computedStyles, extraStyles] = await Promise.all([
      parentNodeId ? cssModel.getComputedStyle(parentNodeId) : null, cssModel.getComputedStyle(node.id),
      cssModel.getComputedStyleExtraFields(node.id)
    ]);

    if (!matchedStyles) {
      return;
    }

    const newSections: StylePropertiesSection[] = [];
    let sectionIdx = 0;
    for (const style of matchedStyles.nodeStyles()) {
      const section = new StylePropertiesSection(
          this, matchedStyles, style, sectionIdx++, computedStyles, parentStyles, extraStyles);
      newSections.push(section);
      this.sectionByElement.set(section.element, section);
    }
    this.#sections = newSections;
    this.swatchPopoverHelper().reposition();
  }

  override async performUpdate(): Promise<void> {
    if (this.isEditingStyle || this.#userOperation) {
      return;
    }

    await this.#updateSections();

    const viewInput: ViewInput = {
      sections: this.#sections,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  swatchPopoverHelper(): InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper {
    return this.#swatchPopoverHelper;
  }

  // TODO: Refactor StylesContainer to use getter for node(), so that we can have a `node` setter here: set node().
  set domNode(node: SDK.DOMModel.DOMNode|null) {
    if (this.#computedStyleModelInternal.node === node) {
      return;
    }
    this.#computedStyleModelInternal.node = node;
    this.requestUpdate();
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.#computedStyleModelInternal.node;
  }

  cssModel(): SDK.CSSModel.CSSModel|null {
    return this.#computedStyleModelInternal.cssModel();
  }

  computedStyleModel(): ComputedStyle.ComputedStyleModel.ComputedStyleModel {
    return this.#computedStyleModelInternal;
  }

  setActiveProperty(_treeElement: StylePropertyTreeElement|null): void {
  }

  refreshUpdate(editedSection: StylePropertiesSection, editedTreeElement?: StylePropertyTreeElement): void {
    if (editedTreeElement) {
      for (const section of this.#sections) {
        section.updateVarFunctions(editedTreeElement);
      }
    }

    if (this.isEditingStyle) {
      return;
    }

    for (const section of this.#sections) {
      section.update(section === editedSection);
    }
    this.swatchPopoverHelper().reposition();
  }

  filterRegex(): RegExp|null {
    return null;
  }

  setEditingStyle(editing: boolean): void {
    this.isEditingStyle = editing;
  }

  setUserOperation(userOperation: boolean): void {
    this.#userOperation = userOperation;
  }

  forceUpdate(): void {
    this.hideAllPopovers();
    this.requestUpdate();
  }

  hideAllPopovers(): void {
    this.#swatchPopoverHelper.hide();
  }

  allSections(): StylePropertiesSection[] {
    return this.#sections;
  }

  getVariablePopoverContents(
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, variableName: string,
      computedValue: string|null): ElementsComponents.CSSVariableValueView.CSSVariableValueView {
    const registration = matchedStyles.getRegisteredProperty(variableName);
    return new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
      variableName,
      value: computedValue ?? undefined,
      // TODO: provide a goToDefinition to jump to the StylesSidebarPane
      details: registration ? {registration, goToDefinition: () => {}} : undefined,
    });
  }

  getVariableParserError(_matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles, _variableName: string):
      ElementsComponents.CSSVariableValueView.CSSVariableParserError|null {
    return null;
  }

  jumpToFunctionDefinition(_functionName: string): void {
  }

  continueEditingElement(_sectionIndex: number, _propertyIndex: number): void {
  }

  revealProperty(_cssProperty: SDK.CSSProperty.CSSProperty): void {
  }

  resetFocus(): void {
    const firstVisibleSection = this.#sections[0]?.findCurrentOrNextVisible(true);
    if (firstVisibleSection) {
      firstVisibleSection.element.tabIndex = this.hasFocus() ? -1 : 0;
    }
  }

  removeSection(_section: StylePropertiesSection): void {
  }

  focusedSectionIndex(): number {
    return this.#sections.findIndex(section => section.element.hasFocus());
  }

  addBlankSection(
      _insertAfterSection: StylePropertiesSection, _styleSheetHeader: SDK.CSSStyleSheetHeader.CSSStyleSheetHeader,
      _ruleLocation: TextUtils.TextRange.TextRange): void {
  }

  jumpToProperty(_propertyName: string, _sectionName?: string, _blockName?: string): boolean {
    return false;
  }

  jumpToSectionBlock(_section: string): void {
  }

  jumpToFontPaletteDefinition(_paletteName: string): void {
  }

  jumpToDeclaration(_valueSource: SDK.CSSMatchedStyles.CSSValueSource): void {
  }

  addStyleUpdateListener(_listener: () => void): void {
  }

  removeStyleUpdateListener(_listener: () => void): void {
  }
}
