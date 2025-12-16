// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { createIcon } from '../kit/kit.js';
import { ActionRegistry } from './ActionRegistry.js';
import * as ARIAUtils from './ARIAUtils.js';
import { ContextMenu } from './ContextMenu.js';
import { GlassPane } from './GlassPane.js';
import { TextPrompt } from './TextPrompt.js';
import toolbarStyles from './toolbar.css.js';
import { Tooltip } from './Tooltip.js';
import { bindCheckbox, CheckboxLabel, LongClickController } from './UIUtils.js';
const UIStrings = {
    /**
     * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled on.
     */
    pressed: 'pressed',
    /**
     * @description Announced screen reader message for ToolbarSettingToggle when the setting is toggled off.
     */
    notPressed: 'not pressed',
    /**
     * @description Tooltip shown when the user hovers over the clear icon to empty the text input.
     */
    clearInput: 'Clear',
    /**
     * @description Placeholder for filter bars that shows before the user types in a filter keyword.
     */
    filter: 'Filter',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/Toolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * Custom element for toolbars.
 *
 * @property floating - The `"floating"` attribute is reflected as property.
 * @property wrappable - The `"wrappable"` attribute is reflected as property.
 * @attribute floating - If present the toolbar is rendered in columns, with a border
 *                  around it, and a non-transparent background. This is used to
 *                  build vertical toolbars that open with long-click. Defaults
 *                  to `false`.
 * @attribute wrappable - If present the toolbar items will wrap to a new row and the
 *                   toolbar height increases.
 */
export class Toolbar extends HTMLElement {
    #shadowRoot = this.attachShadow({ mode: 'open' });
    items = [];
    enabled = true;
    compactLayout = false;
    constructor() {
        super();
        this.#shadowRoot.createChild('style').textContent = toolbarStyles;
        this.#shadowRoot.createChild('slot');
    }
    onItemsChange(mutationList) {
        for (const mutation of mutationList) {
            for (const element of mutation.removedNodes) {
                if (!(element instanceof HTMLElement)) {
                    continue;
                }
                for (const item of this.items) {
                    if (item.element === element) {
                        this.items.splice(this.items.indexOf(item), 1);
                        break;
                    }
                }
            }
            for (const element of mutation.addedNodes) {
                if (!(element instanceof HTMLElement)) {
                    continue;
                }
                if (this.items.some(item => item.element === element)) {
                    continue;
                }
                let item;
                if (element instanceof Buttons.Button.Button) {
                    item = new ToolbarButton('', undefined, undefined, undefined, element);
                }
                else if (element instanceof ToolbarInputElement) {
                    item = element.item;
                }
                else if (element instanceof HTMLSelectElement) {
                    item = new ToolbarComboBox(null, element.title, undefined, undefined, element);
                }
                else {
                    item = new ToolbarItem(element);
                }
                if (item) {
                    this.appendToolbarItem(item);
                }
            }
        }
    }
    connectedCallback() {
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'toolbar');
        }
    }
    /**
     * Returns whether this toolbar is floating.
     *
     * @returns `true` if the `"floating"` attribute is present on this toolbar,
     *         otherwise `false`.
     */
    get floating() {
        return this.hasAttribute('floating');
    }
    /**
     * Changes the value of the `"floating"` attribute on this toolbar.
     *
     * @param floating `true` to make the toolbar floating.
     */
    set floating(floating) {
        this.toggleAttribute('floating', floating);
    }
    /**
     * Returns whether this toolbar is wrappable.
     *
     * @returns `true` if the `"wrappable"` attribute is present on this toolbar,
     *         otherwise `false`.
     */
    get wrappable() {
        return this.hasAttribute('wrappable');
    }
    /**
     * Changes the value of the `"wrappable"` attribute on this toolbar.
     *
     * @param wrappable `true` to make the toolbar items wrap to a new row and
     *                  have the toolbar height adjust.
     */
    set wrappable(wrappable) {
        this.toggleAttribute('wrappable', wrappable);
    }
    hasCompactLayout() {
        return this.compactLayout;
    }
    setCompactLayout(enable) {
        if (this.compactLayout === enable) {
            return;
        }
        this.compactLayout = enable;
        for (const item of this.items) {
            item.setCompactLayout(enable);
        }
    }
    static createLongPressActionButton(action, toggledOptions, untoggledOptions) {
        const button = Toolbar.createActionButton(action);
        const mainButtonClone = Toolbar.createActionButton(action);
        let longClickController = null;
        let longClickButtons = null;
        action.addEventListener("Toggled" /* ActionEvents.TOGGLED */, updateOptions);
        updateOptions();
        return button;
        function updateOptions() {
            const buttons = action.toggled() ? (toggledOptions || null) : (untoggledOptions || null);
            if (buttons?.length) {
                if (!longClickController) {
                    longClickController = new LongClickController(button.element, showOptions);
                    button.setLongClickable(true);
                    longClickButtons = buttons;
                }
            }
            else if (longClickController) {
                longClickController.dispose();
                longClickController = null;
                button.setLongClickable(false);
                longClickButtons = null;
            }
        }
        function showOptions() {
            let buttons = longClickButtons ? longClickButtons.slice() : [];
            buttons.push(mainButtonClone);
            const document = button.element.ownerDocument;
            document.documentElement.addEventListener('mouseup', mouseUp, false);
            const optionsGlassPane = new GlassPane();
            optionsGlassPane.setPointerEventsBehavior("BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
            optionsGlassPane.show(document);
            const optionsBar = optionsGlassPane.contentElement.createChild('devtools-toolbar');
            optionsBar.floating = true;
            const buttonHeight = 26;
            const hostButtonPosition = button.element.boxInWindow().relativeToElement(GlassPane.container(document));
            const topNotBottom = hostButtonPosition.y + buttonHeight * buttons.length < document.documentElement.offsetHeight;
            if (topNotBottom) {
                buttons = buttons.reverse();
            }
            optionsBar.style.height = (buttonHeight * buttons.length) + 'px';
            if (topNotBottom) {
                optionsBar.style.top = (hostButtonPosition.y - 5) + 'px';
            }
            else {
                optionsBar.style.top = (hostButtonPosition.y - (buttonHeight * (buttons.length - 1)) - 6) + 'px';
            }
            optionsBar.style.left = (hostButtonPosition.x - 5) + 'px';
            for (let i = 0; i < buttons.length; ++i) {
                buttons[i].element.addEventListener('mousemove', mouseOver, false);
                buttons[i].element.addEventListener('mouseout', mouseOut, false);
                optionsBar.appendToolbarItem(buttons[i]);
            }
            const hostButtonIndex = topNotBottom ? 0 : buttons.length - 1;
            buttons[hostButtonIndex].element.classList.add('emulate-active');
            function mouseOver(e) {
                if (e.which !== 1) {
                    return;
                }
                if (e.target instanceof HTMLElement) {
                    const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-button');
                    buttonElement.classList.add('emulate-active');
                }
            }
            function mouseOut(e) {
                if (e.which !== 1) {
                    return;
                }
                if (e.target instanceof HTMLElement) {
                    const buttonElement = e.target.enclosingNodeOrSelfWithClass('toolbar-button');
                    buttonElement.classList.remove('emulate-active');
                }
            }
            function mouseUp(e) {
                if (e.which !== 1) {
                    return;
                }
                optionsGlassPane.hide();
                document.documentElement.removeEventListener('mouseup', mouseUp, false);
                for (let i = 0; i < buttons.length; ++i) {
                    if (buttons[i].element.classList.contains('emulate-active')) {
                        buttons[i].element.classList.remove('emulate-active');
                        buttons[i].clicked(e);
                        break;
                    }
                }
            }
        }
    }
    static createActionButton(actionOrActionId, options = {}) {
        const action = typeof actionOrActionId === 'string' ? ActionRegistry.instance().getAction(actionOrActionId) : actionOrActionId;
        const button = action.toggleable() ? makeToggle() : makeButton();
        if (options.label) {
            button.setText(options.label() || action.title());
        }
        const handler = () => {
            void action.execute();
        };
        button.addEventListener("Click" /* ToolbarButton.Events.CLICK */, handler, action);
        action.addEventListener("Enabled" /* ActionEvents.ENABLED */, enabledChanged);
        button.setEnabled(action.enabled());
        return button;
        function makeButton() {
            const button = new ToolbarButton(action.title(), action.icon(), undefined, action.id());
            if (action.title()) {
                Tooltip.installWithActionBinding(button.element, action.title(), action.id());
            }
            return button;
        }
        function makeToggle() {
            const toggleButton = new ToolbarToggle(action.title(), action.icon(), action.toggledIcon(), action.id());
            if (action.toggleWithRedColor()) {
                toggleButton.enableToggleWithRedColor();
            }
            action.addEventListener("Toggled" /* ActionEvents.TOGGLED */, toggled);
            toggled();
            return toggleButton;
            function toggled() {
                toggleButton.setToggled(action.toggled());
                if (action.title()) {
                    toggleButton.setTitle(action.title());
                    Tooltip.installWithActionBinding(toggleButton.element, action.title(), action.id());
                }
            }
        }
        function enabledChanged(event) {
            button.setEnabled(event.data);
        }
    }
    empty() {
        return !this.items.length;
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        for (const item of this.items) {
            item.applyEnabledState(this.enabled && item.enabled);
        }
    }
    appendToolbarItem(item) {
        this.items.push(item);
        item.toolbar = this;
        item.setCompactLayout(this.hasCompactLayout());
        if (!this.enabled) {
            item.applyEnabledState(false);
        }
        if (item.element.parentElement !== this) {
            this.appendChild(item.element);
        }
        this.hideSeparatorDupes();
    }
    hasItem(item) {
        return this.items.includes(item);
    }
    prependToolbarItem(item) {
        this.items.unshift(item);
        item.toolbar = this;
        item.setCompactLayout(this.hasCompactLayout());
        if (!this.enabled) {
            item.applyEnabledState(false);
        }
        this.prepend(item.element);
        this.hideSeparatorDupes();
    }
    appendSeparator() {
        this.appendToolbarItem(new ToolbarSeparator());
    }
    appendSpacer() {
        this.appendToolbarItem(new ToolbarSeparator(true));
    }
    appendText(text) {
        this.appendToolbarItem(new ToolbarText(text));
    }
    removeToolbarItem(itemToRemove) {
        const updatedItems = [];
        for (const item of this.items) {
            if (item === itemToRemove) {
                item.element.remove();
            }
            else {
                updatedItems.push(item);
            }
        }
        this.items = updatedItems;
    }
    removeToolbarItems() {
        for (const item of this.items) {
            item.toolbar = null;
        }
        this.items = [];
        this.removeChildren();
    }
    hideSeparatorDupes() {
        if (!this.items.length) {
            return;
        }
        // Don't hide first and last separators if they were added explicitly.
        let previousIsSeparator = false;
        let lastSeparator;
        let nonSeparatorVisible = false;
        for (let i = 0; i < this.items.length; ++i) {
            if (this.items[i] instanceof ToolbarSeparator) {
                this.items[i].setVisible(!previousIsSeparator);
                previousIsSeparator = true;
                lastSeparator = this.items[i];
                continue;
            }
            if (this.items[i].visible()) {
                previousIsSeparator = false;
                lastSeparator = null;
                nonSeparatorVisible = true;
            }
        }
        if (lastSeparator && lastSeparator !== this.items[this.items.length - 1]) {
            lastSeparator.setVisible(false);
        }
        this.classList.toggle('hidden', lastSeparator !== null && lastSeparator !== undefined && lastSeparator.visible() && !nonSeparatorVisible);
    }
    async appendItemsAtLocation(location) {
        const extensions = getRegisteredToolbarItems();
        extensions.sort((extension1, extension2) => {
            const order1 = extension1.order || 0;
            const order2 = extension2.order || 0;
            return order1 - order2;
        });
        const filtered = extensions.filter(e => e.location === location);
        const items = await Promise.all(filtered.map(extension => {
            const { separator, actionId, label, loadItem } = extension;
            if (separator) {
                return new ToolbarSeparator();
            }
            if (actionId) {
                return Toolbar.createActionButton(actionId, { label });
            }
            // TODO(crbug.com/1134103) constratint the case checked with this if using TS type definitions once UI is TS-authored.
            if (!loadItem) {
                throw new Error('Could not load a toolbar item registration with no loadItem function');
            }
            return loadItem().then(p => (p).item());
        }));
        for (const item of items) {
            if (item) {
                this.appendToolbarItem(item);
            }
        }
    }
}
customElements.define('devtools-toolbar', Toolbar);
// We need any here because Common.ObjectWrapper.ObjectWrapper is invariant in T.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ToolbarItem extends Common.ObjectWrapper.ObjectWrapper {
    element;
    #visible;
    enabled;
    toolbar;
    title;
    constructor(element) {
        super();
        this.element = element;
        this.#visible = true;
        this.enabled = true;
        /**
         * Set by the parent toolbar during appending.
         */
        this.toolbar = null;
    }
    setTitle(title, actionId = undefined) {
        if (this.title === title) {
            return;
        }
        this.title = title;
        ARIAUtils.setLabel(this.element, title);
        if (actionId === undefined) {
            Tooltip.install(this.element, title);
        }
        else {
            Tooltip.installWithActionBinding(this.element, title, actionId);
        }
    }
    setEnabled(value) {
        if (this.enabled === value) {
            return;
        }
        this.enabled = value;
        this.applyEnabledState(this.enabled && (!this.toolbar || this.toolbar.enabled));
    }
    applyEnabledState(enabled) {
        // @ts-expect-error: Ignoring in favor of an `instanceof` check for all the different
        //             kind of HTMLElement classes that have a disabled attribute.
        this.element.disabled = !enabled;
    }
    visible() {
        return this.#visible;
    }
    setVisible(x) {
        if (this.#visible === x) {
            return;
        }
        this.element.classList.toggle('hidden', !x);
        this.#visible = x;
        if (this.toolbar && !(this instanceof ToolbarSeparator)) {
            this.toolbar.hideSeparatorDupes();
        }
    }
    setCompactLayout(_enable) {
    }
    setMaxWidth(width) {
        this.element.style.maxWidth = width + 'px';
    }
    setMinWidth(width) {
        this.element.style.minWidth = width + 'px';
    }
}
export class ToolbarItemWithCompactLayout extends ToolbarItem {
    setCompactLayout(enable) {
        this.dispatchEventToListeners("CompactLayoutUpdated" /* ToolbarItemWithCompactLayoutEvents.COMPACT_LAYOUT_UPDATED */, enable);
    }
}
export class ToolbarText extends ToolbarItem {
    constructor(text = '') {
        const element = document.createElement('div');
        element.classList.add('toolbar-text');
        super(element);
        this.setText(text);
    }
    text() {
        return this.element.textContent ?? '';
    }
    setText(text) {
        this.element.textContent = text;
    }
}
export class ToolbarButton extends ToolbarItem {
    button;
    text;
    adorner;
    constructor(title, glyph, text, jslogContext, button) {
        if (!button) {
            button = new Buttons.Button.Button();
            if (glyph && !text) {
                button.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName: glyph };
            }
            else {
                button.variant = "text" /* Buttons.Button.Variant.TEXT */;
                button.reducedFocusRing = true;
                if (glyph) {
                    button.iconName = glyph;
                }
            }
        }
        super(button);
        this.button = button;
        button.classList.add('toolbar-button');
        this.element.addEventListener('click', this.clicked.bind(this), false);
        button.textContent = text || '';
        this.setTitle(title);
        if (jslogContext) {
            button.jslogContext = jslogContext;
        }
    }
    focus() {
        this.element.focus();
    }
    checked(checked) {
        this.button.checked = checked;
    }
    toggleOnClick(toggleOnClick) {
        this.button.toggleOnClick = toggleOnClick;
    }
    isToggled() {
        return this.button.toggled;
    }
    toggled(toggled) {
        this.button.toggled = toggled;
    }
    setToggleType(type) {
        this.button.toggleType = type;
    }
    setLongClickable(longClickable) {
        this.button.longClickable = longClickable;
    }
    setSize(size) {
        this.button.size = size;
    }
    setReducedFocusRing() {
        this.button.reducedFocusRing = true;
    }
    setText(text) {
        if (this.text === text) {
            return;
        }
        this.button.textContent = text;
        this.button.variant = "text" /* Buttons.Button.Variant.TEXT */;
        this.button.reducedFocusRing = true;
        this.text = text;
    }
    setAdorner(adorner) {
        if (this.adorner) {
            this.adorner.replaceWith(adorner);
        }
        else {
            this.element.prepend(adorner);
        }
        this.adorner = adorner;
    }
    setGlyph(iconName) {
        this.button.iconName = iconName;
    }
    setToggledIcon(toggledIconName) {
        this.button.variant = "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */;
        this.button.toggledIconName = toggledIconName;
    }
    setBackgroundImage(iconURL) {
        this.element.style.backgroundImage = 'url(' + iconURL + ')';
    }
    setSecondary() {
        this.element.classList.add('toolbar-button-secondary');
    }
    setDarkText() {
        this.element.classList.add('dark-text');
    }
    clicked(event) {
        if (!this.enabled) {
            return;
        }
        this.dispatchEventToListeners("Click" /* ToolbarButton.Events.CLICK */, event);
        event.consume();
    }
}
export class ToolbarInput extends ToolbarItem {
    prompt;
    proxyElement;
    constructor(placeholder, accessiblePlaceholder, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext, element) {
        if (!element) {
            element = document.createElement('div');
        }
        element.classList.add('toolbar-input');
        super(element);
        const internalPromptElement = this.element.createChild('div', 'toolbar-input-prompt');
        ARIAUtils.setLabel(internalPromptElement, accessiblePlaceholder || placeholder);
        internalPromptElement.addEventListener('focus', () => this.element.classList.add('focused'));
        internalPromptElement.addEventListener('blur', () => this.element.classList.remove('focused'));
        this.prompt = new TextPrompt();
        this.prompt.jslogContext = jslogContext;
        this.proxyElement = this.prompt.attach(internalPromptElement);
        this.proxyElement.classList.add('toolbar-prompt-proxy');
        this.proxyElement.addEventListener('keydown', (event) => this.onKeydownCallback(event));
        this.prompt.initialize(completions || (() => Promise.resolve([])), ' ', dynamicCompletions);
        if (tooltip) {
            this.prompt.setTitle(tooltip);
        }
        this.prompt.setPlaceholder(placeholder, accessiblePlaceholder);
        this.prompt.addEventListener("TextChanged" /* TextPromptEvents.TEXT_CHANGED */, this.onChangeCallback.bind(this));
        if (growFactor) {
            this.element.style.flexGrow = String(growFactor);
        }
        if (shrinkFactor) {
            this.element.style.flexShrink = String(shrinkFactor);
        }
        const clearButtonText = i18nString(UIStrings.clearInput);
        const clearButton = new Buttons.Button.Button();
        clearButton.data = {
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            iconName: 'cross-circle-filled',
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            title: clearButtonText,
        };
        clearButton.className = 'toolbar-input-clear-button';
        clearButton.setAttribute('jslog', `${VisualLogging.action('clear').track({ click: true }).parent('mapped')}`);
        VisualLogging.setMappedParent(clearButton, internalPromptElement);
        clearButton.variant = "icon" /* Buttons.Button.Variant.ICON */;
        clearButton.size = "SMALL" /* Buttons.Button.Size.SMALL */;
        clearButton.iconName = 'cross-circle-filled';
        clearButton.title = clearButtonText;
        clearButton.ariaLabel = clearButtonText;
        clearButton.tabIndex = -1;
        clearButton.addEventListener('click', () => {
            this.setValue('', true);
            this.prompt.focus();
        });
        this.element.appendChild(clearButton);
        this.updateEmptyStyles();
    }
    applyEnabledState(enabled) {
        if (enabled) {
            this.element.classList.remove('disabled');
        }
        else {
            this.element.classList.add('disabled');
        }
        this.prompt.setEnabled(enabled);
    }
    setValue(value, notify) {
        this.prompt.setText(value);
        if (notify) {
            this.onChangeCallback();
        }
        this.updateEmptyStyles();
    }
    value() {
        return this.prompt.textWithCurrentSuggestion();
    }
    valueWithoutSuggestion() {
        return this.prompt.text();
    }
    clearAutocomplete() {
        this.prompt.clearAutocomplete();
    }
    focus() {
        this.prompt.focus();
    }
    onKeydownCallback(event) {
        if (event.key === 'Enter' && this.prompt.text()) {
            this.dispatchEventToListeners("EnterPressed" /* ToolbarInput.Event.ENTER_PRESSED */, this.prompt.text());
        }
        if (!Platform.KeyboardUtilities.isEscKey(event) || !this.prompt.text()) {
            return;
        }
        this.setValue('', true);
        event.consume(true);
    }
    onChangeCallback() {
        this.updateEmptyStyles();
        this.dispatchEventToListeners("TextChanged" /* ToolbarInput.Event.TEXT_CHANGED */, this.prompt.text());
    }
    updateEmptyStyles() {
        this.element.classList.toggle('toolbar-input-empty', !this.prompt.text());
    }
}
export class ToolbarFilter extends ToolbarInput {
    constructor(filterBy, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext, element) {
        const filterPlaceholder = filterBy ? filterBy : i18nString(UIStrings.filter);
        super(filterPlaceholder, filterPlaceholder, growFactor, shrinkFactor, tooltip, completions, dynamicCompletions, jslogContext || 'filter', element);
        const filterIcon = createIcon('filter');
        this.element.prepend(filterIcon);
        this.element.classList.add('toolbar-filter');
    }
}
export class ToolbarInputElement extends HTMLElement {
    static observedAttributes = ['value', 'disabled'];
    item;
    datalist = null;
    value = undefined;
    #disabled = false;
    connectedCallback() {
        if (this.item) {
            return;
        }
        const list = this.getAttribute('list');
        if (list) {
            this.datalist = this.getRootNode().querySelector(`datalist[id="${list}"]`);
        }
        const placeholder = this.getAttribute('placeholder') || '';
        const accessiblePlaceholder = this.getAttribute('aria-placeholder') ?? undefined;
        const tooltip = this.getAttribute('title') ?? undefined;
        const jslogContext = this.id ?? undefined;
        const isFilter = this.getAttribute('type') === 'filter';
        if (isFilter) {
            this.item = new ToolbarFilter(placeholder, /* growFactor=*/ undefined, 
            /* shrinkFactor=*/ undefined, tooltip, this.datalist ? this.#onAutocomplete.bind(this) : undefined, 
            /* dynamicCompletions=*/ undefined, jslogContext || 'filter', this);
        }
        else {
            this.item = new ToolbarInput(placeholder, accessiblePlaceholder, /* growFactor=*/ undefined, 
            /* shrinkFactor=*/ undefined, tooltip, this.datalist ? this.#onAutocomplete.bind(this) : undefined, 
            /* dynamicCompletions=*/ undefined, jslogContext, this);
        }
        if (this.value) {
            this.item.setValue(this.value);
        }
        if (this.#disabled) {
            this.item.setEnabled(false);
        }
        this.item.addEventListener("TextChanged" /* ToolbarInput.Event.TEXT_CHANGED */, event => {
            this.dispatchEvent(new CustomEvent('change', { detail: event.data }));
        });
        this.item.addEventListener("EnterPressed" /* ToolbarInput.Event.ENTER_PRESSED */, event => {
            this.dispatchEvent(new CustomEvent('submit', { detail: event.data }));
        });
    }
    focus() {
        this.item?.focus();
    }
    async #onAutocomplete(expression, prefix, force) {
        if (!prefix && !force && expression || !this.datalist) {
            return [];
        }
        const options = this.datalist.options;
        return [...options].map((({ value }) => value)).filter(value => value.startsWith(prefix)).map(text => ({ text }));
    }
    attributeChangedCallback(name, _oldValue, newValue) {
        if (name === 'value') {
            if (this.item && this.item.value() !== newValue) {
                this.item.setValue(newValue, true);
            }
            else {
                this.value = newValue;
            }
        }
        else if (name === 'disabled') {
            this.#disabled = typeof newValue === 'string';
            if (this.item) {
                this.item.setEnabled(!this.#disabled);
            }
        }
    }
    set disabled(disabled) {
        if (disabled) {
            this.setAttribute('disabled', '');
        }
        else {
            this.removeAttribute('disabled');
        }
    }
    get disabled() {
        return this.hasAttribute('disabled');
    }
}
customElements.define('devtools-toolbar-input', ToolbarInputElement);
export class ToolbarToggle extends ToolbarButton {
    toggledGlyph;
    constructor(title, glyph, toggledGlyph, jslogContext, toggleOnClick) {
        super(title, glyph, '');
        this.toggledGlyph = toggledGlyph ? toggledGlyph : glyph;
        this.setToggledIcon(this.toggledGlyph || '');
        this.setToggleType("primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */);
        this.toggled(false);
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.toggle().track({ click: true }).context(jslogContext)}`);
        }
        if (toggleOnClick !== undefined) {
            this.setToggleOnClick(toggleOnClick);
        }
    }
    setToggleOnClick(toggleOnClick) {
        this.toggleOnClick(toggleOnClick);
    }
    setToggled(toggled) {
        this.toggled(toggled);
    }
    setChecked(checked) {
        this.checked(checked);
    }
    enableToggleWithRedColor() {
        this.setToggleType("red-toggle" /* Buttons.Button.ToggleType.RED */);
    }
}
export class ToolbarMenuButton extends ToolbarItem {
    textElement;
    text;
    iconName;
    adorner;
    contextMenuHandler;
    useSoftMenu;
    keepOpen;
    isIconDropdown;
    triggerTimeoutId;
    #triggerDelay = 200;
    constructor(contextMenuHandler, isIconDropdown, useSoftMenu, jslogContext, iconName, keepOpen) {
        let element;
        if (iconName) {
            element = new Buttons.Button.Button();
            element.data = { variant: "icon" /* Buttons.Button.Variant.ICON */, iconName };
        }
        else {
            element = document.createElement('button');
        }
        element.classList.add('toolbar-button');
        super(element);
        this.element.addEventListener('click', this.clicked.bind(this), false);
        this.iconName = iconName;
        this.setTitle('');
        this.title = '';
        if (!isIconDropdown) {
            this.element.classList.add('toolbar-has-dropdown');
            const dropdownArrowIcon = createIcon('triangle-down', 'toolbar-dropdown-arrow');
            this.element.appendChild(dropdownArrowIcon);
        }
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.dropDown().track({ click: true }).context(jslogContext)}`);
        }
        this.element.addEventListener('mousedown', this.mouseDown.bind(this), false);
        this.contextMenuHandler = contextMenuHandler;
        this.useSoftMenu = Boolean(useSoftMenu);
        this.keepOpen = Boolean(keepOpen);
        this.isIconDropdown = Boolean(isIconDropdown);
        ARIAUtils.markAsMenuButton(this.element);
    }
    setText(text) {
        if (this.text === text || this.iconName) {
            return;
        }
        if (!this.textElement) {
            this.textElement = document.createElement('div');
            this.textElement.classList.add('toolbar-text', 'hidden');
            const dropDownArrow = this.element.querySelector('.toolbar-dropdown-arrow');
            this.element.insertBefore(this.textElement, dropDownArrow);
        }
        this.textElement.textContent = text;
        this.textElement.classList.toggle('hidden', !text);
        this.text = text;
    }
    setAdorner(adorner) {
        if (this.iconName) {
            return;
        }
        if (!this.adorner) {
            this.adorner = adorner;
        }
        else {
            adorner.replaceWith(adorner);
            if (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
        }
        this.element.prepend(adorner);
    }
    setDarkText() {
        this.element.classList.add('dark-text');
    }
    turnShrinkable() {
        this.element.classList.add('toolbar-has-dropdown-shrinkable');
    }
    setTriggerDelay(x) {
        this.#triggerDelay = x;
    }
    mouseDown(event) {
        if (!this.enabled) {
            return;
        }
        if (event.buttons !== 1) {
            return;
        }
        if (!this.triggerTimeoutId) {
            this.triggerTimeoutId = window.setTimeout(this.trigger.bind(this, event), this.#triggerDelay);
        }
    }
    trigger(event) {
        delete this.triggerTimeoutId;
        const horizontalPosition = this.isIconDropdown ? this.element.getBoundingClientRect().right : this.element.getBoundingClientRect().left;
        const contextMenu = new ContextMenu(event, {
            useSoftMenu: this.useSoftMenu,
            keepOpen: this.keepOpen,
            x: horizontalPosition,
            y: this.element.getBoundingClientRect().top + this.element.offsetHeight,
            // Without adding a delay, pointer events will be un-ignored too early, and a single click causes
            // the context menu to be closed and immediately re-opened on Windows (https://crbug.com/339560549).
            onSoftMenuClosed: () => setTimeout(() => this.element.removeAttribute('aria-expanded'), 50),
        });
        this.contextMenuHandler(contextMenu);
        this.element.setAttribute('aria-expanded', 'true');
        void contextMenu.show();
    }
    clicked(event) {
        if (this.triggerTimeoutId) {
            clearTimeout(this.triggerTimeoutId);
        }
        this.trigger(event);
    }
}
export class ToolbarSettingToggle extends ToolbarToggle {
    defaultTitle;
    setting;
    willAnnounceState;
    constructor(setting, glyph, title, toggledGlyph, jslogContext) {
        super(title, glyph, toggledGlyph, jslogContext);
        this.defaultTitle = title;
        this.setting = setting;
        this.settingChanged();
        this.setting.addChangeListener(this.settingChanged, this);
        // Determines whether the toggle state will be announced to a screen reader
        this.willAnnounceState = false;
    }
    settingChanged() {
        const toggled = this.setting.get();
        this.setToggled(toggled);
        const toggleAnnouncement = toggled ? i18nString(UIStrings.pressed) : i18nString(UIStrings.notPressed);
        if (this.willAnnounceState) {
            ARIAUtils.LiveAnnouncer.alert(toggleAnnouncement);
        }
        this.willAnnounceState = false;
        this.setTitle(this.defaultTitle);
    }
    clicked(event) {
        this.willAnnounceState = true;
        this.setting.set(this.isToggled());
        super.clicked(event);
    }
}
export class ToolbarSeparator extends ToolbarItem {
    constructor(spacer) {
        const element = document.createElement('div');
        element.classList.add(spacer ? 'toolbar-spacer' : 'toolbar-divider');
        super(element);
    }
}
export class ToolbarComboBox extends ToolbarItem {
    constructor(changeHandler, title, className, jslogContext, element) {
        if (!element) {
            element = document.createElement('select');
        }
        super(element);
        if (changeHandler) {
            this.element.addEventListener('change', changeHandler, false);
        }
        ARIAUtils.setLabel(this.element, title);
        super.setTitle(title);
        if (className) {
            this.element.classList.add(className);
        }
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context(jslogContext)}`);
        }
    }
    turnShrinkable() {
        this.element.classList.add('toolbar-has-dropdown-shrinkable');
    }
    size() {
        return this.element.childElementCount;
    }
    options() {
        return Array.prototype.slice.call(this.element.children, 0);
    }
    addOption(option) {
        this.element.appendChild(option);
    }
    createOption(label, value, jslogContext) {
        const option = this.element.createChild('option');
        option.text = label;
        if (typeof value !== 'undefined') {
            option.value = value;
        }
        if (!jslogContext) {
            jslogContext = value ? Platform.StringUtilities.toKebabCase(value) : undefined;
        }
        option.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({ click: true })}`);
        return option;
    }
    applyEnabledState(enabled) {
        super.applyEnabledState(enabled);
        this.element.disabled = !enabled;
    }
    removeOption(option) {
        this.element.removeChild(option);
    }
    removeOptions() {
        this.element.removeChildren();
    }
    selectedOption() {
        if (this.element.selectedIndex >= 0) {
            return this.element[this.element.selectedIndex];
        }
        return null;
    }
    select(option) {
        this.element.selectedIndex = Array.prototype.indexOf.call(this.element, option);
    }
    setSelectedIndex(index) {
        this.element.selectedIndex = index;
    }
    selectedIndex() {
        return this.element.selectedIndex;
    }
}
export class ToolbarSettingComboBox extends ToolbarComboBox {
    #options;
    setting;
    muteSettingListener;
    constructor(options, setting, accessibleName) {
        super(null, accessibleName, undefined, setting.name);
        this.#options = options;
        this.setting = setting;
        this.element.addEventListener('change', this.onSelectValueChange.bind(this), false);
        this.setOptions(options);
        setting.addChangeListener(this.onDevToolsSettingChanged, this);
    }
    setOptions(options) {
        this.#options = options;
        this.element.removeChildren();
        for (let i = 0; i < options.length; ++i) {
            const dataOption = options[i];
            const option = this.createOption(dataOption.label, dataOption.value);
            this.element.appendChild(option);
            if (this.setting.get() === dataOption.value) {
                this.setSelectedIndex(i);
            }
        }
    }
    value() {
        return this.#options[this.selectedIndex()].value;
    }
    select(option) {
        const index = Array.prototype.indexOf.call(this.element, option);
        this.setSelectedIndex(index);
    }
    setSelectedIndex(index) {
        super.setSelectedIndex(index);
        const option = this.#options.at(index);
        if (option) {
            this.setTitle(option.label);
        }
    }
    /**
     * Note: wondering why there are two event listeners and what the difference is?
     * It is because this combo box <select> is backed by a Devtools setting and
     * at any time there could be multiple instances of these elements that are
     * backed by the same setting. So they have to listen to two things:
     * 1. When the setting is changed via a different method.
     * 2. When the value of the select is changed, triggering a change to the setting.
     */
    /**
     * Runs when the DevTools setting is changed
     */
    onDevToolsSettingChanged() {
        if (this.muteSettingListener) {
            return;
        }
        const value = this.setting.get();
        for (let i = 0; i < this.#options.length; ++i) {
            if (value === this.#options[i].value) {
                this.setSelectedIndex(i);
                break;
            }
        }
    }
    /**
     * Run when the user interacts with the <select> element.
     */
    onSelectValueChange(_event) {
        const option = this.#options[this.selectedIndex()];
        this.muteSettingListener = true;
        this.setting.set(option.value);
        this.muteSettingListener = false;
        // Because we mute the DevTools setting change listener, we need to
        // manually update the title here.
        this.setTitle(option.label);
    }
}
export class ToolbarCheckbox extends ToolbarItem {
    #checkboxLabel;
    constructor(text, tooltip, listener, jslogContext) {
        const checkboxLabel = CheckboxLabel.create(text, undefined, undefined, jslogContext);
        super(checkboxLabel);
        if (tooltip) {
            Tooltip.install(this.element, tooltip);
        }
        if (listener) {
            this.element.addEventListener('click', listener, false);
        }
        this.#checkboxLabel = checkboxLabel;
    }
    checked() {
        return this.element.checked;
    }
    setChecked(value) {
        this.element.checked = value;
    }
    applyEnabledState(enabled) {
        super.applyEnabledState(enabled);
        this.element.disabled = !enabled;
    }
    setIndeterminate(indeterminate) {
        this.element.indeterminate = indeterminate;
    }
    /**
     * Sets the user visible text shown alongside the checkbox.
     * If you want to update the title/aria-label, use setTitle.
     */
    setLabelText(content) {
        this.#checkboxLabel.setLabelText(content);
    }
}
export class ToolbarSettingCheckbox extends ToolbarCheckbox {
    constructor(setting, tooltip, alternateTitle) {
        super(alternateTitle || setting.title(), tooltip, undefined, setting.name);
        bindCheckbox(this.element, setting);
    }
}
const registeredToolbarItems = [];
export function registerToolbarItem(registration) {
    registeredToolbarItems.push(registration);
}
function getRegisteredToolbarItems() {
    return registeredToolbarItems.filter(item => Root.Runtime.Runtime.isDescriptorEnabled({ experiment: item.experiment, condition: item.condition }));
}
//# sourceMappingURL=Toolbar.js.map