// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import '../../ui/components/tooltips/tooltips.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import { Link } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as PanelUtils from '../utils/utils.js';
import requestConditionsDrawerStyles from './requestConditionsDrawer.css.js';
const { ref, live } = Directives;
const { widgetConfig } = UI.Widget;
const UIStrings = {
    /**
     * @description Text to enable blocking of network requests
     */
    enableBlockingAndThrottling: 'Enable blocking and throttling',
    /**
     * @description Tooltip text that appears when hovering over the plus button in the Blocked URLs Pane of the Network panel
     */
    addRule: 'Add rule',
    /**
     * @description Accessible label for the button to add request blocking patterns in the network request blocking tool
     */
    addPatternLabel: 'Add network request throttling or blocking pattern',
    /**
     * @description Text that shows in the network request blocking panel if no pattern has yet been added.
     */
    noPattern: 'Nothing throttled or blocked',
    /**
     * @description Text that shows in the network request blocking panel if no pattern has yet been added.
     * @example {Learn more} PH1
     */
    noThrottlingOrBlockingPattern: `To throttle or block a network request, add a rule here manually or via the network panel's context menu. {PH1}`,
    /**
     * @description Text in Blocked URLs Pane of the Network panel
     * @example {4} PH1
     */
    dAffected: '{PH1} affected',
    /**
     * @description Text in Blocked URLs Pane of the Network panel
     */
    textEditPattern: 'Text pattern to block or throttle matching requests; use URL Pattern syntax.',
    /**
     * @description Error text for empty list widget input in Request Blocking tool
     */
    patternInputCannotBeEmpty: 'Pattern input cannot be empty.',
    /**
     * @description Error text for duplicate list widget input in Request Blocking tool
     */
    patternAlreadyExists: 'Pattern already exists.',
    /**
     * @description Tooltip message when a pattern failed to parse as a URLPattern
     */
    patternFailedToParse: 'This pattern failed to parse as a URLPattern',
    /**
     * @description Tooltip message when a pattern failed to parse as a URLPattern because it contains RegExp groups
     */
    patternFailedWithRegExpGroups: 'RegExp groups are not allowed',
    /**
     * @description Tooltip message when a pattern was converted to a URLPattern
     * @example {example.com} PH1
     */
    patternWasUpgraded: 'This pattern was upgraded from "{PH1}"',
    /**
     * @description Message to be announced for a when list item is removed from list widget
     */
    itemDeleted: 'Item successfully deleted',
    /**
     * @description Message to be announced for a when list item is removed from list widget
     */
    learnMore: 'Learn more',
    /**
     * @description Accessibility label on a `Learn more` link
     */
    learnMoreLabel: 'Learn more about URL pattern syntax',
    /**
     * @description Tooltip on a button moving an entry up
     * @example {*://example.com} PH1
     */
    increasePriority: 'Move up {PH1}',
    /**
     * @description Tooltip on a button moving an entry down
     * @example {*://example.com} PH1
     */
    decreasePriority: 'Move down {PH1}',
    /**
     * @description Tooltip on a checkbox togging the effects for a pattern
     * @example {*://example.com} PH1
     */
    enableThrottlingToggleLabel: 'Throttle or block {PH1}',
    /**
     * @description Tooltip on a combobox selecting the request conditions
     */
    requestConditionsLabel: 'Request conditions',
    /**
     * @description Aria announcement when a pattern was moved up
     */
    patternMovedUp: 'URL pattern was moved up',
    /**
     * @description Aria announcemenet when a pattern was moved down
     */
    patternMovedDown: 'URL pattern was moved down',
    /**
     * @description Text on a button to start editing text
     * @example {*://example.com} PH1
     */
    editPattern: 'Edit {PH1}',
    /**
     * @description Label for an item to remove something
     * @example {*://example.com} PH1
     */
    removePattern: 'Remove {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestConditionsDrawer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const NETWORK_REQUEST_BLOCKING_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/network-request-blocking';
const PATTERN_API_DOCS_URL = 'https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API';
const { bindToAction } = UI.UIUtils;
export const DEFAULT_VIEW = (input, output, target) => {
    render(
    // clang-format off
    html `
    <devtools-toolbar jslog=${VisualLogging.toolbar()}>
      <devtools-checkbox
        ?checked=${input.enabled}
        @click=${input.toggleEnabled}
        .jslogContext=${'network.enable-request-blocking'}>
        ${i18nString(UIStrings.enableBlockingAndThrottling)}
      </devtools-checkbox>
      <div class="toolbar-divider"></div>
      <devtools-button ${bindToAction('network.add-network-request-blocking-pattern')}></devtools-button>
      <devtools-button ${bindToAction('network.remove-all-network-request-blocking-patterns')}></devtools-button>
    </devtools-toolbar>
    <div class=empty-state ${ref(e => input.list.setEmptyPlaceholder(e ?? null))}>
      <span class=empty-state-header>${i18nString(UIStrings.noPattern)}</span>
      <div class=empty-state-description>
        ${uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.noThrottlingOrBlockingPattern, { PH1: learnMore() })}
      </div>
      <devtools-button
        @click=${input.addPattern}
        class=add-button
        .jslogContext=${'network.add-network-request-blocking-pattern'}
        title=${i18nString(UIStrings.addPatternLabel)}
        .variant=${"tonal" /* Buttons.Button.Variant.TONAL */}>
          ${i18nString(UIStrings.addRule)}
      </devtools-button>
    </div>
    <devtools-widget .widgetConfig=${UI.Widget.widgetConfig(UI.Widget.VBox)}>
      ${input.list.element}
    </devtools-widget>
    `, 
    // clang-format on
    target);
};
function renderItem(condition, editable, index, onToggle, onConditionsChanged, onIncreasePriority, onDecreasePriority, lookUpRequestCount) {
    const { enabled, originalOrUpgradedURLPattern, constructorStringOrWildcardURL, wildcardURL } = condition;
    const toggle = (e) => {
        e.consume(true);
        onToggle(condition);
    };
    const moveUp = (e) => {
        e.consume(true);
        onIncreasePriority(condition);
    };
    const moveDown = (e) => {
        e.consume(true);
        onDecreasePriority(condition);
    };
    // clang-format off
    return html `
    <input class=blocked-url-checkbox
      @change=${toggle}
      type=checkbox
      title=${i18nString(UIStrings.enableThrottlingToggleLabel, { PH1: constructorStringOrWildcardURL })}
      .checked=${live(enabled)}
      .disabled=${!editable || !originalOrUpgradedURLPattern}
      jslog=${VisualLogging.toggle().track({ change: true })}>
    <devtools-button
      .iconName=${'arrow-up'}
      .variant=${"icon" /* Buttons.Button.Variant.ICON */}
      .title=${i18nString(UIStrings.increasePriority, { PH1: constructorStringOrWildcardURL })}
      .jslogContext=${'decrease-priority'}
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      @click=${moveUp}>
    </devtools-button>
    <devtools-button
      .iconName=${'arrow-down'}
      .variant=${"icon" /* Buttons.Button.Variant.ICON */}
      .title=${i18nString(UIStrings.decreasePriority, { PH1: constructorStringOrWildcardURL })}
      .jslogContext=${'increase-priority'}
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      @click=${moveDown}></devtools-button>
    ${originalOrUpgradedURLPattern ? html `
      <devtools-tooltip variant=rich jslogcontext=url-pattern id=url-pattern-${index}>
        <div>hash: ${originalOrUpgradedURLPattern.hash}</div>
        <div>hostname: ${originalOrUpgradedURLPattern.hostname}</div>
        <div>password: ${originalOrUpgradedURLPattern.password}</div>
        <div>pathname: ${originalOrUpgradedURLPattern.pathname}</div>
        <div>port: ${originalOrUpgradedURLPattern.port}</div>
        <div>protocol: ${originalOrUpgradedURLPattern.protocol}</div>
        <div>search: ${originalOrUpgradedURLPattern.search}</div>
        <div>username: ${originalOrUpgradedURLPattern.username}</div>
        <hr />
        ${learnMore()}
      </devtools-tooltip>` : nothing}
    ${wildcardURL ? html `
      <devtools-icon name=warning-filled class="small warning" aria-details=url-pattern-warning-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-warning-${index}>
        ${i18nString(UIStrings.patternWasUpgraded, { PH1: wildcardURL })}
      </devtools-tooltip>
      ` : nothing}
    ${!originalOrUpgradedURLPattern ? html `
      <devtools-icon name=cross-circle-filled class=small aria-details=url-pattern-error-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-error-${index}>
        ${SDK.NetworkManager.RequestURLPattern.isValidPattern(constructorStringOrWildcardURL) ===
        "has-regexp-groups" /* SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS */
        ? i18nString(UIStrings.patternFailedWithRegExpGroups)
        : i18nString(UIStrings.patternFailedToParse)}
        ${learnMore()}
      </devtools-tooltip>` : nothing}
    <div
      @click=${toggle}
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      class=blocked-url-label
      aria-details=url-pattern-${index}>
        ${constructorStringOrWildcardURL}
    </div>
    <devtools-widget
       class=conditions-selector
       title=${i18nString(UIStrings.requestConditionsLabel)}
       .widgetConfig=${UI.Widget.widgetConfig(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelectorWidget, {
        variant: "individual-request-conditions" /* MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS */,
        jslogContext: 'request-conditions',
        disabled: !editable,
        onConditionsChanged: conditions => onConditionsChanged(condition, conditions),
        currentConditions: condition.conditions,
    })}></devtools-widget>
    <devtools-widget
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      .widgetConfig=${widgetConfig(AffectedCountWidget, { condition, lookUpRequestCount })}></devtools-widget>`;
    // clang-format on
}
export const AFFECTED_COUNT_DEFAULT_VIEW = (input, output, target) => {
    render(html `${i18nString(UIStrings.dAffected, { PH1: input.count })}`, target);
};
function matchesUrl(conditions, url) {
    return Boolean(conditions.originalOrUpgradedURLPattern?.test(url));
}
export class AffectedCountWidget extends UI.Widget.Widget {
    #view;
    #condition;
    #lookUpRequestCount;
    constructor(target, view = AFFECTED_COUNT_DEFAULT_VIEW) {
        super(target, { classes: ['blocked-url-count'] });
        this.#view = view;
    }
    get lookUpRequestCount() {
        return this.#lookUpRequestCount;
    }
    set lookUpRequestCount(val) {
        this.#lookUpRequestCount = val;
    }
    get condition() {
        return this.#condition;
    }
    set condition(conditions) {
        this.#condition = conditions;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#condition || !this.#lookUpRequestCount) {
            return;
        }
        this.#view({ count: this.#lookUpRequestCount(this.#condition) }, {}, this.element);
    }
    wasShown() {
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this, { scoped: true });
        Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
        super.wasShown();
    }
    willHide() {
        super.willHide();
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.#onRequestFinished, this);
        Logs.NetworkLog.NetworkLog.instance().removeEventListener(Logs.NetworkLog.Events.Reset, this.requestUpdate, this);
    }
    #onRequestFinished(event) {
        if (!this.#condition) {
            return;
        }
        const request = event.data;
        if ((request.appliedNetworkConditionsId && this.#condition.ruleIds.has(request.appliedNetworkConditionsId)) ||
            (request.wasBlocked() && matchesUrl(this.#condition, request.url()))) {
            this.requestUpdate();
        }
    }
}
function learnMore() {
    return html `<devtools-link
        href=${NETWORK_REQUEST_BLOCKING_EXPLANATION_URL}
        tabindex=0
        class=devtools-link
        .jslogContext=${'learn-more'}>
          ${i18nString(UIStrings.learnMore)}
      </devtools-link>`;
}
export class RequestConditionsDrawer extends UI.Widget.VBox {
    manager;
    list;
    editor;
    blockedCountForUrl;
    #throttledCount = new Map();
    #view;
    #listElements = new WeakMap();
    constructor(target, view = DEFAULT_VIEW) {
        super(target, {
            jslog: `${VisualLogging.panel('network.blocked-urls').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
        this.manager.addEventListener("BlockedPatternsChanged" /* SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED */, this.update, this);
        this.list = new UI.ListWidget.ListWidget(this);
        this.list.registerRequiredCSS(requestConditionsDrawerStyles);
        this.list.element.classList.add('blocked-urls');
        this.editor = null;
        this.blockedCountForUrl = new Map();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this, { scoped: true });
        this.update();
        Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
    }
    performUpdate() {
        const enabled = this.manager.requestConditions.conditionsEnabled;
        this.list.element.classList.toggle('blocking-disabled', !enabled && Boolean(this.manager.requestConditions.count));
        const input = {
            addPattern: this.addPattern.bind(this),
            toggleEnabled: this.toggleEnabled.bind(this),
            enabled,
            list: this.list,
        };
        this.#view(input, {}, this.contentElement);
    }
    addPattern() {
        this.manager.requestConditions.conditionsEnabled = true;
        this.list.addNewItem(0, SDK.NetworkManager.RequestCondition.createFromSetting({ url: Platform.DevToolsPath.EmptyUrlString, enabled: true }));
    }
    removeAllPatterns() {
        this.manager.requestConditions.clear();
    }
    renderItem(condition, editable, index) {
        const element = document.createElement('div');
        this.#listElements.set(condition, element);
        element.classList.add('blocked-url');
        this.updateItem(element, condition, editable, index);
        return element;
    }
    updateItem(element, condition, editable, index) {
        const onToggle = (condition) => {
            if (editable) {
                condition.enabled = !condition.enabled;
            }
        };
        const onConditionsChanged = (condition, conditions) => {
            if (editable) {
                condition.conditions = conditions;
            }
        };
        const onIncreasePriority = (condition) => {
            if (this.manager.requestConditions.conditionsEnabled) {
                UI.ARIAUtils.LiveAnnouncer.status(i18nString(UIStrings.patternMovedUp));
                this.manager.requestConditions.increasePriority(condition);
            }
        };
        const onDecreasePriority = (condition) => {
            if (this.manager.requestConditions.conditionsEnabled) {
                UI.ARIAUtils.LiveAnnouncer.status(i18nString(UIStrings.patternMovedDown));
                this.manager.requestConditions.decreasePriority(condition);
            }
        };
        render(renderItem(condition, editable, index, onToggle, onConditionsChanged, onIncreasePriority, onDecreasePriority, this.#getRequestCount.bind(this)), element);
    }
    toggleEnabled() {
        this.manager.requestConditions.conditionsEnabled = !this.manager.requestConditions.conditionsEnabled;
        this.update();
    }
    removeItemRequested(condition) {
        this.manager.requestConditions.delete(condition);
        UI.ARIAUtils.LiveAnnouncer.alert(UIStrings.itemDeleted);
    }
    beginEdit(pattern) {
        this.editor = this.createEditor();
        this.editor.control('url').value = pattern.constructorStringOrWildcardURL;
        return this.editor;
    }
    commitEdit(item, editor, isNew) {
        const constructorString = editor.control('url').value;
        const pattern = SDK.NetworkManager.RequestURLPattern.create(constructorString);
        if (!pattern) {
            throw new Error('Failed to parse pattern');
        }
        item.pattern = pattern;
        if (isNew) {
            this.manager.requestConditions.add(item);
        }
    }
    createEditor() {
        if (this.editor) {
            return this.editor;
        }
        const editor = new UI.ListWidget.Editor();
        const content = editor.contentElement();
        const titles = content.createChild('div', 'blocked-url-edit-row');
        const label = titles.createChild('label');
        const learnMore = Link.create(PATTERN_API_DOCS_URL, i18nString(UIStrings.learnMore), undefined, 'learn-more');
        learnMore.title = i18nString(UIStrings.learnMoreLabel);
        titles.append('\xA0', learnMore);
        label.textContent = i18nString(UIStrings.textEditPattern);
        const fields = content.createChild('div', 'blocked-url-edit-row');
        const validator = (_item, _index, input) => {
            if (!input.value) {
                return { errorMessage: i18nString(UIStrings.patternInputCannotBeEmpty), valid: false };
            }
            if (this.manager.requestConditions.has(input.value)) {
                return { errorMessage: i18nString(UIStrings.patternAlreadyExists), valid: false };
            }
            const isValid = SDK.NetworkManager.RequestURLPattern.isValidPattern(input.value);
            switch (isValid) {
                case "failed-to-parse" /* SDK.NetworkManager.RequestURLPatternValidity.FAILED_TO_PARSE */:
                    return { errorMessage: i18nString(UIStrings.patternFailedToParse), valid: false };
                case "has-regexp-groups" /* SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS */:
                    return { errorMessage: i18nString(UIStrings.patternFailedWithRegExpGroups), valid: false };
            }
            return { valid: true, errorMessage: undefined };
        };
        const urlInput = editor.createInput('url', 'text', '', validator);
        label.htmlFor = urlInput.id = 'editor-url-input';
        fields.createChild('div', 'blocked-url-edit-value').appendChild(urlInput);
        return editor;
    }
    update() {
        const enabled = this.manager.requestConditions.conditionsEnabled;
        const newItems = Array.from(this.manager.requestConditions.conditions);
        let oldIndex = 0;
        for (; oldIndex < newItems.length; ++oldIndex) {
            const pattern = newItems[oldIndex];
            this.list.updateItem(oldIndex, pattern, enabled, 
            /* focusable=*/ false, {
                edit: i18nString(UIStrings.editPattern, { PH1: pattern.constructorStringOrWildcardURL }),
                delete: i18nString(UIStrings.removePattern, { PH1: pattern.constructorStringOrWildcardURL })
            });
        }
        while (oldIndex < this.list.items.length) {
            this.list.removeItem(oldIndex);
        }
        this.requestUpdate();
    }
    #getRequestCount(condition) {
        if (condition.isBlocking) {
            let result = 0;
            for (const blockedUrl of this.blockedCountForUrl.keys()) {
                if (matchesUrl(condition, blockedUrl)) {
                    result += this.blockedCountForUrl.get(blockedUrl);
                }
            }
            return result;
        }
        let result = 0;
        for (const ruleId of condition.ruleIds) {
            result += this.#throttledCount.get(ruleId) ?? 0;
        }
        return result;
    }
    onNetworkLogReset(_event) {
        this.blockedCountForUrl.clear();
        this.#throttledCount.clear();
    }
    onRequestFinished(event) {
        const request = event.data;
        if (request.appliedNetworkConditionsId) {
            const count = this.#throttledCount.get(request.appliedNetworkConditionsId) ?? 0;
            this.#throttledCount.set(request.appliedNetworkConditionsId, count + 1);
        }
        if (request.wasBlocked()) {
            const count = this.blockedCountForUrl.get(request.url()) || 0;
            this.blockedCountForUrl.set(request.url(), count + 1);
        }
    }
    wasShown() {
        UI.Context.Context.instance().setFlavor(RequestConditionsDrawer, this);
        super.wasShown();
    }
    willHide() {
        super.willHide();
        UI.Context.Context.instance().setFlavor(RequestConditionsDrawer, null);
    }
    static async reveal(appliedConditions) {
        await UI.ViewManager.ViewManager.instance().showView('network.blocked-urls');
        const drawer = UI.Context.Context.instance().flavor(RequestConditionsDrawer);
        if (!drawer) {
            console.assert(!!drawer, 'Drawer not initialized');
            return;
        }
        const conditions = drawer.manager.requestConditions.conditions.find(condition => condition.ruleIds.has(appliedConditions.appliedNetworkConditionsId) &&
            condition.constructorString && condition.constructorString === appliedConditions.urlPattern);
        const element = (conditions && drawer.#listElements.get(conditions));
        element && PanelUtils.PanelUtils.highlightElement(element);
    }
}
export class ActionDelegate {
    handleAction(context, actionId) {
        const drawer = context.flavor(RequestConditionsDrawer);
        if (drawer === null) {
            return false;
        }
        switch (actionId) {
            case 'network.add-network-request-blocking-pattern': {
                drawer.addPattern();
                return true;
            }
            case 'network.remove-all-network-request-blocking-patterns': {
                drawer.removeAllPatterns();
                return true;
            }
        }
        return false;
    }
}
export class AppliedConditionsRevealer {
    async reveal(request) {
        if (request.urlPattern) {
            await RequestConditionsDrawer.reveal(request);
        }
    }
}
//# sourceMappingURL=RequestConditionsDrawer.js.map