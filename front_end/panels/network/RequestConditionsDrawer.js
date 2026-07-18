// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/lists/lists.js';
import '../../ui/components/tooltips/tooltips.js';
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as PanelUtils from '../utils/utils.js';
import requestConditionsDrawerStyles from './requestConditionsDrawer.css.js';
const { ref, live, ifDefined } = Directives;
const { widget } = UI.Widget;
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
    noThrottlingOrBlockingPattern: `To throttle or block a network request, add a rule here manually or via the network panel’s context menu. {PH1}`,
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
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestConditionsDrawer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const NETWORK_REQUEST_BLOCKING_EXPLANATION_URL = 'https://developer.chrome.com/docs/devtools/network-request-blocking';
const { bindToAction } = UI.UIUtils;
export const DEFAULT_VIEW = (input, output, target) => {
    render(
    // clang-format off
    html `
    <style>${requestConditionsDrawerStyles}</style>
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
    ${input.conditions.length === 0 ? html `
    <div class="list">
      <div class=empty-state>
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
    </div>
    ` : html `
    <devtools-list
        class="blocked-urls list square-corners"
        ?deletable=${input.enabled}
        @edit=${(e) => input.onBeginEdit(input.conditions[e.detail.index])}
        @delete=${(e) => input.onRemove(input.conditions[e.detail.index])}>
      ${input.conditions.map((condition, index) => html `
        <div class="blocked-url" ${ref(e => {
        output.itemRefs.set(condition, e);
    })}>
          ${renderItem({
        condition,
        editing: input.editingCondition === condition,
        editable: input.enabled,
        index,
        onToggle: input.onToggle,
        onConditionsChanged: input.onConditionsChanged,
        onIncreasePriority: input.onIncreasePriority,
        onDecreasePriority: input.onDecreasePriority,
        onCommit: input.onCommit,
        onCancel: input.onCancel,
        onBeginEdit: input.onBeginEdit,
        validator: val => input.validator(condition, val),
        lookUpRequestCount: input.lookUpRequestCount
    })}
        </div>
      `)}
    </devtools-list>
    `}
    `, 
    // clang-format on
    target, { container: { classes: (!input.enabled && input.conditions.length > 0) ? ['blocking-disabled'] : [] } });
};
function renderItem({ condition, editing, editable, index, onToggle, onConditionsChanged, onIncreasePriority, onDecreasePriority, onCommit, onCancel, onBeginEdit, validator, lookUpRequestCount }) {
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
    const onPromptActivate = (e) => {
        if (!editable || editing) {
            return;
        }
        onBeginEdit(condition);
        e.consume(true);
    };
    const promptKeyDown = (e) => {
        if (!editable || editing) {
            return;
        }
        const keyboardEvent = e;
        if (keyboardEvent.key === 'Enter') {
            onBeginEdit(condition);
            e.consume(true);
        }
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
    ${!editing && originalOrUpgradedURLPattern ? html `
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
    ${!editing && wildcardURL ? html `
      <devtools-icon name=warning-filled class="small warning" aria-details=url-pattern-warning-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-warning-${index}>
        ${i18nString(UIStrings.patternWasUpgraded, { PH1: wildcardURL })}
      </devtools-tooltip>
      ` : nothing}
    ${!editing && !originalOrUpgradedURLPattern ? html `
      <devtools-icon name=cross-circle-filled class=small aria-details=url-pattern-error-${index}>
      </devtools-icon>
      <devtools-tooltip variant=rich jslogcontext=url-pattern-warning id=url-pattern-error-${index}>
        ${SDK.NetworkManager.RequestURLPattern.isValidPattern(constructorStringOrWildcardURL) ===
        "has-regexp-groups" /* SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS */
        ? i18nString(UIStrings.patternFailedWithRegExpGroups)
        : i18nString(UIStrings.patternFailedToParse)}
        ${learnMore()}
      </devtools-tooltip>` : nothing}
    <devtools-prompt
      @click=${onPromptActivate}
      @keydown=${promptKeyDown}
      @focus=${onPromptActivate}
      tabindex=${ifDefined(editing ? undefined : 0)}
      @commit=${(e) => onCommit(condition, e.detail)}
      @cancel=${() => onCancel(condition)}
      ?disabled=${!editable}
      placeholder=${i18nString(UIStrings.textEditPattern)}
      value=${constructorStringOrWildcardURL}
      ?editing=${editable && editing}
      .validator=${validator}
      class=blocked-url-label
      aria-details=url-pattern-${index}>
        ${constructorStringOrWildcardURL}
    </devtools-prompt>
    <select
       class=conditions-selector
       title=${i18nString(UIStrings.requestConditionsLabel)}
       @ConditionsChanged=${(e) => {
        onConditionsChanged(condition, e.detail);
    }}
       ${widget(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
        variant: "individual-request-conditions" /* MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect.Variant.INDIVIDUAL_REQUEST_CONDITIONS */,
        jslogContext: 'request-conditions',
        disabled: !editable,
        currentConditions: condition.conditions,
    })}></select>
    <devtools-widget
      ?disabled=${!editable || !originalOrUpgradedURLPattern}
      ${widget(AffectedCountWidget, { condition, lookUpRequestCount })}></devtools-widget>`;
    // clang-format on
}
export const AFFECTED_COUNT_DEFAULT_VIEW = (input, output, target) => {
    render(html `${i18nString(UIStrings.dAffected, { PH1: input.count })}`, target, { container: { classes: ['blocked-url-count'] } });
};
function matchesUrl(conditions, url) {
    return Boolean(conditions.originalOrUpgradedURLPattern?.test(url));
}
export class AffectedCountWidget extends UI.Widget.Widget {
    #view;
    #condition;
    #lookUpRequestCount;
    constructor(target, view = AFFECTED_COUNT_DEFAULT_VIEW) {
        super(target);
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
    blockedCountForUrl;
    #throttledCount = new Map();
    #view;
    #viewOutput = { itemRefs: new Map() };
    #editingCondition;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, {
            jslog: `${VisualLogging.panel('network.blocked-urls').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.#view = view;
        this.manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
        this.manager.addEventListener("BlockedPatternsChanged" /* SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED */, this.requestUpdate, this);
        this.blockedCountForUrl = new Map();
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.NetworkManager.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this, { scoped: true });
        this.requestUpdate();
        Logs.NetworkLog.NetworkLog.instance().addEventListener(Logs.NetworkLog.Events.Reset, this.onNetworkLogReset, this);
    }
    performUpdate() {
        this.#viewOutput.itemRefs.clear();
        const enabled = this.manager.requestConditions.conditionsEnabled;
        const conditions = Array.from(this.manager.requestConditions.conditions);
        if (this.#editingCondition && !conditions.includes(this.#editingCondition)) {
            conditions.unshift(this.#editingCondition);
        }
        const input = {
            addPattern: this.addPattern.bind(this),
            toggleEnabled: this.toggleEnabled.bind(this),
            enabled,
            conditions,
            editingCondition: this.#editingCondition,
            onToggle: (condition) => {
                if (enabled) {
                    condition.enabled = !condition.enabled;
                }
            },
            onConditionsChanged: (condition, conditions) => {
                if (enabled) {
                    condition.conditions = conditions;
                }
            },
            onIncreasePriority: (condition) => {
                if (enabled) {
                    UI.ARIAUtils.LiveAnnouncer.status(i18nString(UIStrings.patternMovedUp));
                    this.manager.requestConditions.increasePriority(condition);
                }
            },
            onDecreasePriority: (condition) => {
                if (enabled) {
                    UI.ARIAUtils.LiveAnnouncer.status(i18nString(UIStrings.patternMovedDown));
                    this.manager.requestConditions.decreasePriority(condition);
                }
            },
            onBeginEdit: (condition) => {
                if (this.#editingCondition) {
                    this.#cancelEdit(this.#editingCondition);
                }
                this.#editingCondition = condition;
                this.requestUpdate();
            },
            onRemove: (condition) => {
                this.manager.requestConditions.delete(condition);
                UI.ARIAUtils.LiveAnnouncer.alert(UIStrings.itemDeleted);
            },
            onCommit: this.#commitEdit.bind(this),
            onCancel: this.#cancelEdit.bind(this),
            validator: this.#validator.bind(this),
            lookUpRequestCount: this.#getRequestCount.bind(this),
        };
        this.#view(input, this.#viewOutput, this.contentElement);
    }
    addPattern() {
        this.manager.requestConditions.conditionsEnabled = true;
        if (this.#editingCondition) {
            this.#cancelEdit(this.#editingCondition);
        }
        const condition = SDK.NetworkManager.RequestCondition.createFromSetting({ url: Platform.DevToolsPath.EmptyUrlString, enabled: true }, Common.Settings.Settings.instance());
        this.#editingCondition = condition;
        this.requestUpdate();
    }
    removeAllPatterns() {
        this.manager.requestConditions.clear();
    }
    #validator(condition, value) {
        if (!value) {
            return i18nString(UIStrings.patternInputCannotBeEmpty);
        }
        const parsedPattern = SDK.NetworkManager.RequestURLPattern.create(value);
        const stringToCheck = parsedPattern ? parsedPattern.constructorString : value;
        const existingCondition = this.manager.requestConditions.findCondition(stringToCheck);
        if (existingCondition && existingCondition !== condition) {
            return i18nString(UIStrings.patternAlreadyExists);
        }
        const isValid = SDK.NetworkManager.RequestURLPattern.isValidPattern(value);
        switch (isValid) {
            case "failed-to-parse" /* SDK.NetworkManager.RequestURLPatternValidity.FAILED_TO_PARSE */:
                return i18nString(UIStrings.patternFailedToParse);
            case "has-regexp-groups" /* SDK.NetworkManager.RequestURLPatternValidity.HAS_REGEXP_GROUPS */:
                return i18nString(UIStrings.patternFailedWithRegExpGroups);
        }
        return null;
    }
    toggleEnabled() {
        this.manager.requestConditions.conditionsEnabled = !this.manager.requestConditions.conditionsEnabled;
        this.requestUpdate();
    }
    #commitEdit(condition, value) {
        if (this.#editingCondition !== condition) {
            return;
        }
        if (condition.constructorStringOrWildcardURL === value &&
            Array.from(this.manager.requestConditions.conditions).includes(condition)) {
            this.#editingCondition = undefined;
            this.requestUpdate();
            return;
        }
        const constructorString = value;
        const pattern = SDK.NetworkManager.RequestURLPattern.create(constructorString);
        if (!pattern) {
            return;
        }
        condition.pattern = pattern;
        // If it's a new item, it isn't in the manager yet. Add it.
        if (!Array.from(this.manager.requestConditions.conditions).includes(condition)) {
            this.manager.requestConditions.add(condition);
        }
        this.#editingCondition = undefined;
        this.requestUpdate();
    }
    #cancelEdit(condition) {
        if (this.#editingCondition === condition) {
            this.#editingCondition = undefined;
            this.requestUpdate();
        }
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
        const condition = drawer.manager.requestConditions.conditions.find(condition => condition.ruleIds.has(appliedConditions.appliedNetworkConditionsId) &&
            condition.constructorString && condition.constructorString === appliedConditions.urlPattern);
        if (condition) {
            const element = drawer.#viewOutput.itemRefs.get(condition);
            if (element) {
                PanelUtils.PanelUtils.highlightElement(element);
            }
        }
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