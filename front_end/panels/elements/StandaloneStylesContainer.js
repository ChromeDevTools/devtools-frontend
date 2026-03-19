// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as ComputedStyle from '../../models/computed_style/computed_style.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ElementsComponents from './components/components.js';
import { StylePropertiesSection } from './StylePropertiesSection.js';
import stylesSidebarPaneStyles from './stylesSidebarPane.css.js';
import { WebCustomData } from './WebCustomData.js';
export const DEFAULT_VIEW = (input, _output, target) => {
    render(html `
    <style>${stylesSidebarPaneStyles}</style>
    <div class="style-panes-wrapper" jslog=${VisualLogging.section('standalone-styles').track({
        resize: true
    })}>
      <div class="styles-pane">
        ${input.sections.map(section => section.element)}
      </div>
    </div>
  `, target);
};
export class StandaloneStylesContainer extends Common.ObjectWrapper.eventMixin(UI.Widget.VBox) {
    activeCSSAngle = null;
    isEditingStyle = false;
    sectionByElement = new WeakMap();
    // TODO: Reference the MAX_LINK_LENGTH from StylesSidebarPane at a later stage, when we have a reference to it.
    linkifier = new Components.Linkifier.Linkifier(23, /* useLinkDecorator */ true);
    #webCustomData;
    userOperation = false;
    #sections = [];
    #swatchPopoverHelper = new InlineEditor.SwatchPopoverHelper.SwatchPopoverHelper();
    #computedStyleModelInternal = new ComputedStyle.ComputedStyleModel.ComputedStyleModel();
    #view;
    #filter = null;
    #rebuildThrottler = new Common.Throttler.Throttler(200);
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.#computedStyleModelInternal.addEventListener("CSSModelChanged" /* ComputedStyle.ComputedStyleModel.Events.CSS_MODEL_CHANGED */, this.#onCSSModelChanged, this);
        this.#computedStyleModelInternal.addEventListener("ComputedStyleChanged" /* ComputedStyle.ComputedStyleModel.Events.COMPUTED_STYLE_CHANGED */, this.#onComputedStyleChanged, this);
    }
    #onComputedStyleChanged() {
        if (this.isEditingStyle || this.userOperation) {
            return;
        }
        this.#rebuildAndUpdate();
    }
    #rebuildAndUpdate() {
        void this.#rebuildThrottler.schedule(async () => {
            this.node()?.domModel().cssModel().discardCachedMatchedCascade();
            await this.#updateSections();
            this.requestUpdate();
        });
    }
    async #onCSSModelChanged(event) {
        // We only recreate sections if this update is more than an "edit" operation.
        // Sections will pull their own updates in the case of an "edit".
        if (event?.data && 'edit' in event.data && event?.data.edit) {
            return;
        }
        if (this.isEditingStyle || this.userOperation) {
            return;
        }
        this.#rebuildAndUpdate();
    }
    get webCustomData() {
        if (!this.#webCustomData &&
            Common.Settings.Settings.instance().moduleSetting('show-css-property-documentation-on-hover').get()) {
            this.#webCustomData = WebCustomData.create();
        }
        return this.#webCustomData;
    }
    async #updateSections() {
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
        const newSections = [];
        let sectionIdx = 0;
        for (const style of matchedStyles.nodeStyles()) {
            const section = new StylePropertiesSection(this, matchedStyles, style, sectionIdx++, computedStyles, parentStyles, extraStyles);
            newSections.push(section);
            this.sectionByElement.set(section.element, section);
        }
        this.#sections = newSections;
        this.#updateFilter();
        this.swatchPopoverHelper().reposition();
    }
    async performUpdate() {
        const viewInput = {
            sections: this.#sections.filter(section => !section.isHidden()),
        };
        this.#view(viewInput, undefined, this.contentElement);
        this.#onUpdateFinished();
    }
    #onUpdateFinished() {
        this.dispatchEventToListeners("StylesUpdateCompleted" /* Events.STYLES_UPDATE_COMPLETED */);
    }
    #updateFilter() {
        for (const section of this.#sections) {
            section.updateFilter();
        }
    }
    swatchPopoverHelper() {
        return this.#swatchPopoverHelper;
    }
    // TODO: Refactor StylesContainer to use getter for node(), so that we can have a `node` setter here: set node().
    set domNode(node) {
        if (this.#computedStyleModelInternal.node === node) {
            return;
        }
        this.#computedStyleModelInternal.node = node;
    }
    set filter(regex) {
        this.#filter = regex;
        this.#updateFilter();
        this.requestUpdate();
    }
    node() {
        return this.#computedStyleModelInternal.node;
    }
    cssModel() {
        return this.#computedStyleModelInternal.cssModel();
    }
    computedStyleModel() {
        return this.#computedStyleModelInternal;
    }
    setActiveProperty(_treeElement) {
    }
    refreshUpdate(editedSection, editedTreeElement) {
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
    filterRegex() {
        return this.#filter;
    }
    setEditingStyle(editing) {
        this.isEditingStyle = editing;
    }
    setUserOperation(userOperation) {
        this.userOperation = userOperation;
    }
    forceUpdate() {
        this.hideAllPopovers();
        this.#rebuildAndUpdate();
    }
    hideAllPopovers() {
        this.#swatchPopoverHelper.hide();
        if (this.activeCSSAngle) {
            this.activeCSSAngle.minify();
            this.activeCSSAngle = null;
        }
    }
    allSections() {
        return this.#sections;
    }
    getVariablePopoverContents(matchedStyles, variableName, computedValue) {
        const registration = matchedStyles.getRegisteredProperty(variableName);
        return new ElementsComponents.CSSVariableValueView.CSSVariableValueView({
            variableName,
            value: computedValue ?? undefined,
            // TODO: provide a goToDefinition to jump to the StylesSidebarPane
            details: registration ? { registration, goToDefinition: () => { } } : undefined,
        });
    }
    getVariableParserError(_matchedStyles, _variableName) {
        return null;
    }
    jumpToFunctionDefinition(_functionName) {
    }
    continueEditingElement(_sectionIndex, _propertyIndex) {
    }
    revealProperty(_cssProperty) {
    }
    resetFocus() {
        const firstVisibleSection = this.#sections[0]?.findCurrentOrNextVisible(true);
        if (firstVisibleSection) {
            firstVisibleSection.element.tabIndex = this.hasFocus() ? -1 : 0;
        }
    }
    removeSection(_section) {
    }
    focusedSectionIndex() {
        return this.#sections.findIndex(section => section.element.hasFocus());
    }
    addBlankSection(_insertAfterSection, _styleSheetHeader, _ruleLocation) {
    }
    jumpToProperty(_propertyName, _sectionName, _blockName) {
        return false;
    }
    jumpToSectionBlock(_section) {
    }
    jumpToFontPaletteDefinition(_paletteName) {
    }
    jumpToDeclaration(_valueSource) {
    }
    addStyleUpdateListener(listener) {
        this.addEventListener("StylesUpdateCompleted" /* Events.STYLES_UPDATE_COMPLETED */, listener);
    }
    removeStyleUpdateListener(listener) {
        this.removeEventListener("StylesUpdateCompleted" /* Events.STYLES_UPDATE_COMPLETED */, listener);
    }
}
//# sourceMappingURL=StandaloneStylesContainer.js.map