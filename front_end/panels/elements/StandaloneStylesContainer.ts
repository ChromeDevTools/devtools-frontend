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

export const enum Events {
  STYLES_UPDATE_COMPLETED = 'StylesUpdateCompleted',
}

export interface EventTypes {
  [Events.STYLES_UPDATE_COMPLETED]: void;
}

export class StandaloneStylesContainer extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) implements StylesContainer {
  activeCSSAngle: InlineEditor.CSSAngle.CSSAngle|null = null;
  isEditingStyle = false;
  readonly sectionByElement = new WeakMap<Node, StylePropertiesSection>();
  // TODO: Reference the MAX_LINK_LENGTH from StylesSidebarPane at a later stage, when we have a reference to it.
  readonly linkifier: Components.Linkifier.Linkifier =
      new Components.Linkifier.Linkifier(23, /* useLinkDecorator */ true);

  #webCustomData: WebCustomData|undefined;
  userOperation = false;
  #sections: StylePropertiesSection[] = [];
  #swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
  #computedStyleModelInternal = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
  #view: View;
  #filter: RegExp|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.#computedStyleModelInternal.addEventListener(
        ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED, this.#onCSSModelChanged, this);
  }

  async #onCSSModelChanged(
      event: Common.EventTarget.EventTargetEvent<ComputedStyle.ComputedStyleModel.CSSModelChangedEvent>):
      Promise<void> {
    // We only recreate sections if this update is more than an "edit" operation.
    // Sections will pull their own updates in the case of an "edit".
    if (event?.data && 'edit' in event.data && event?.data.edit) {
      return;
    }

    if (this.isEditingStyle || this.userOperation) {
      return;
    }

    this.node()?.domModel().cssModel().discardCachedMatchedCascade();
    await this.#updateSections();
    this.requestUpdate();
  }

  get webCustomData(): WebCustomData|undefined {
    if (!this.#webCustomData &&
        Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
      this.#webCustomData = WebCustomData.create();
    }
    return this.#webCustomData;
  }

  async #updateSections(): Promise<void> {
    for (const section of this.#sections) {
      section.dispose();
    }
    const node = this.node();
    if (!node) {
      this.#sections = [];
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
    this.hideAllPopovers();

    this.#updateFilter();

    const viewInput: ViewInput = {
      sections: this.#sections,
    };
    this.#view(viewInput, undefined, this.contentElement);
    this.#onUpdateFinished();
  }

  #onUpdateFinished(): void {
    this.dispatchEventToListeners(Events.STYLES_UPDATE_COMPLETED);
  }

  #updateFilter(): void {
    for (const section of this.#sections) {
      section.updateFilter();
    }
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
  }

  set filter(regex: RegExp|null) {
    this.#filter = regex;
    this.#updateFilter();
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
      this.#onUpdateFinished();
      return;
    }

    for (const section of this.#sections) {
      section.update(section === editedSection);
    }
    this.swatchPopoverHelper().reposition();
    this.#onUpdateFinished();
  }

  filterRegex(): RegExp|null {
    return this.#filter;
  }

  setEditingStyle(editing: boolean): void {
    this.isEditingStyle = editing;
  }

  setUserOperation(userOperation: boolean): void {
    this.userOperation = userOperation;
  }

  forceUpdate(): void {
    this.node()?.domModel().cssModel().discardCachedMatchedCascade();
    void this.#updateSections().then(() => {
      this.requestUpdate();
    });
  }

  hideAllPopovers(): void {
    this.#swatchPopoverHelper.hide();
    if (this.activeCSSAngle) {
      this.activeCSSAngle.minify();
      this.activeCSSAngle = null;
    }
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

  addStyleUpdateListener(listener: () => void): void {
    this.addEventListener(Events.STYLES_UPDATE_COMPLETED, listener);
  }

  removeStyleUpdateListener(listener: () => void): void {
    this.removeEventListener(Events.STYLES_UPDATE_COMPLETED, listener);
  }
}
