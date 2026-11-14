// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/kit/kit.js';
import * as Elements from '../../models/elements/elements.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { StylePropertyTreeElement } from './StylePropertyTreeElement.js';
const { ref, repeat } = Directives;
let instance = null;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `<div tabindex="0" autofocus>${input.editorClass ? repeat([input.editorClass], editorClass => editorClass, editorClass => html `<devtools-widget
            ${UI.Widget.widget(editorClass, {
        authoredProperties: input.authoredProperties,
        computedProperties: input.computedProperties,
    })}
            ${UI.Widget.widgetRef(editorClass, editor => {
        output.waitForEditorUpdate = () => editor.updateComplete;
    })}
            @propertyselected=${input.onPropertySelected}
            @propertydeselected=${input.onPropertyDeselected}
          ></devtools-widget>`) : nothing}</div>`, target, { container: { classes: ['with-padding'] } });
    // clang-format on
};
/**
 * Thin UI.Widget wrapper around style editors to allow using it as a popover.
 */
export class StyleEditorWidget extends UI.Widget.VBox {
    #editorClass;
    #stylesContainer;
    #section;
    #view;
    #viewOutput = {};
    #triggerKey;
    #initialProperties = null;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
    getSection() {
        return this.#section;
    }
    async onPropertySelected(event) {
        if (!this.#section) {
            return;
        }
        const { name, value } = event.data;
        const target = ensureTreeElementForProperty(this.#section, name);
        target.property.value = value;
        target.updateTitle();
        await target.applyStyleText(target.renderedPropertyText(), false);
        if (this.#section) {
            this.#stylesContainer?.refreshUpdate(this.#section, target, true);
        }
        this.requestUpdate();
    }
    async onPropertyDeselected(event) {
        if (!this.#section) {
            return;
        }
        const { name } = event.data;
        const target = ensureTreeElementForProperty(this.#section, name);
        await target.applyStyleText('', false);
        if (this.#section) {
            this.#stylesContainer?.refreshUpdate(this.#section, target, true);
        }
        this.requestUpdate();
    }
    bindContext(stylesContainer, section) {
        this.#stylesContainer = stylesContainer;
        this.#section = section;
        if (!this.#initialProperties) {
            this.#initialProperties =
                this.#editorClass ? getAuthoredStyles(section, this.#editorClass.editableProperties) : new Map();
        }
    }
    setTriggerKey(value) {
        this.#triggerKey = value;
    }
    getTriggerKey() {
        return this.#triggerKey;
    }
    unbindContext() {
        this.#stylesContainer = undefined;
        this.#section = undefined;
    }
    #clearEditor() {
        this.#editorClass = undefined;
        this.#initialProperties = null;
        this.#viewOutput.waitForEditorUpdate = undefined;
        this.#view({
            authoredProperties: new Map(),
            computedProperties: new Map(),
            onPropertySelected: this.onPropertySelected.bind(this),
            onPropertyDeselected: this.onPropertyDeselected.bind(this),
        }, this.#viewOutput, this.contentElement);
    }
    #trackChanges() {
        const initialProperties = this.#initialProperties;
        this.#initialProperties = null;
        if (!this.#editorClass || !this.#section || !this.#stylesContainer || !initialProperties) {
            return;
        }
        const finalProperties = getAuthoredStyles(this.#section, this.#editorClass.editableProperties);
        const node = this.#stylesContainer.node() ?? this.#section.matchedStyles.node();
        const ruleHeader = this.#section.headerText();
        for (const { propertyName } of this.#editorClass.editableProperties) {
            const oldValue = initialProperties.get(propertyName) ?? '';
            const newValue = finalProperties.get(propertyName) ?? '';
            Elements.StyleChanges.trackStylePropertyEdit(this.#stylesContainer.changeTracker, node, {
                ruleHeader,
                oldName: oldValue ? propertyName : '',
                oldValue,
                newName: newValue ? propertyName : '',
                newValue,
            });
        }
    }
    async render() {
        if (!this.#editorClass) {
            return;
        }
        const computedProperties = this.#stylesContainer ? await fetchComputedStyles(this.#stylesContainer) : new Map();
        if (!this.#editorClass) {
            return;
        }
        const authoredProperties = this.#section ? getAuthoredStyles(this.#section, this.#editorClass.editableProperties) : new Map();
        this.#view({
            editorClass: this.#editorClass,
            authoredProperties,
            computedProperties,
            onPropertySelected: this.onPropertySelected.bind(this),
            onPropertyDeselected: this.onPropertyDeselected.bind(this),
        }, this.#viewOutput, this.contentElement);
        await this.#viewOutput.waitForEditorUpdate?.();
        if (this.#stylesContainer?.swatchPopoverHelper().isShowing(this)) {
            this.#stylesContainer.swatchPopoverHelper().reposition();
        }
    }
    async performUpdate() {
        await this.render();
    }
    static instance() {
        if (!instance) {
            instance = new StyleEditorWidget();
        }
        return instance;
    }
    setEditor(editorClass) {
        this.#editorClass = editorClass;
    }
    static createTriggerButton(stylesContainer, section, editorClass, buttonTitle, triggerKey, jslogContext, onClick) {
        const popoverHelper = stylesContainer.swatchPopoverHelper();
        let triggerButton;
        // clang-format off
        return html `<devtools-icon
      ${ref(e => {
            triggerButton = e;
            if (e && popoverHelper.isShowing(StyleEditorWidget.instance()) &&
                StyleEditorWidget.instance().getTriggerKey() === triggerKey) {
                popoverHelper.setAnchorElement(e);
            }
        })}
      name="flex-wrap"
      class="styles-pane-button"
      title=${buttonTitle}
      role="button"
      tabindex="-1"
      jslog=${VisualLogging.showStyleEditor(jslogContext).track({ click: true })}
      @click=${async (event) => {
            event.stopPropagation();
            onClick?.();
            if (!triggerButton) {
                return;
            }
            const widget = StyleEditorWidget.instance();
            if (popoverHelper.isShowing()) {
                const isSameTrigger = popoverHelper.isShowing(widget) && widget.getTriggerKey() === triggerKey;
                popoverHelper.hide(true);
                if (isSameTrigger) {
                    return;
                }
            }
            widget.setEditor(editorClass);
            widget.bindContext(stylesContainer, section);
            widget.setTriggerKey(triggerKey);
            await widget.render();
            if (!triggerButton.isConnected) {
                widget.unbindContext();
                widget.#clearEditor();
                return;
            }
            const scrollerElement = triggerButton.enclosingNodeOrSelfWithClass('style-panes-wrapper');
            const onScroll = () => {
                popoverHelper.hide(true);
            };
            const onStylesUpdateCompleted = widget.requestUpdate.bind(widget);
            stylesContainer.addStyleUpdateListener(onStylesUpdateCompleted);
            stylesContainer.setEditingStyle(true);
            popoverHelper.show(widget, triggerButton, () => {
                stylesContainer.setEditingStyle(false);
                widget.#trackChanges();
                widget.unbindContext();
                widget.#clearEditor();
                if (scrollerElement) {
                    scrollerElement.removeEventListener('scroll', onScroll);
                }
                stylesContainer.removeStyleUpdateListener(onStylesUpdateCompleted);
            });
            if (scrollerElement) {
                scrollerElement.addEventListener('scroll', onScroll);
            }
        }}
      @mousedown=${(event) => event.consume()}
      @mouseup=${(event) => {
            // Stop propagation to prevent the property editor from being activated.
            event.stopPropagation();
        }}
    ></devtools-icon>`;
        // clang-format on
    }
}
function ensureTreeElementForProperty(section, propertyName) {
    const target = section.propertiesTreeOutline.rootElement().children().find(child => child instanceof StylePropertyTreeElement && child.property.name === propertyName);
    if (target) {
        return target;
    }
    const newTarget = section.addNewBlankProperty();
    newTarget.property.name = propertyName;
    return newTarget;
}
async function fetchComputedStyles(stylesContainer) {
    const computedStyleModel = stylesContainer.computedStyleModel();
    const style = await computedStyleModel.fetchComputedStyle();
    return style ? style.computedStyle : new Map();
}
function getAuthoredStyles(section, editableProperties) {
    const authoredProperties = new Map();
    const editablePropertiesSet = new Set(editableProperties.map(prop => prop.propertyName));
    for (const prop of section.style().leadingProperties()) {
        if (editablePropertiesSet.has(prop.name)) {
            authoredProperties.set(prop.name, prop.value);
        }
    }
    return authoredProperties;
}
//# sourceMappingURL=StyleEditorWidget.js.map