// gen/front_end/models/badges/AiExplorerBadge.js
import * as Common2 from "./../../core/common/common.js";

// gen/front_end/models/badges/Badge.js
import * as Common from "./../../core/common/common.js";
var BadgeAction;
(function(BadgeAction2) {
  BadgeAction2["GDP_SIGN_UP_COMPLETE"] = "gdp-sign-up-complete";
  BadgeAction2["RECEIVE_BADGES_SETTING_ENABLED"] = "receive-badges-setting-enabled";
  BadgeAction2["CSS_RULE_MODIFIED"] = "css-rule-modified";
  BadgeAction2["DOM_ELEMENT_OR_ATTRIBUTE_EDITED"] = "dom-element-or-attribute-edited";
  BadgeAction2["MODERN_DOM_BADGE_CLICKED"] = "modern-dom-badge-clicked";
  BadgeAction2["STARTED_AI_CONVERSATION"] = "started-ai-conversation";
  BadgeAction2["PERFORMANCE_INSIGHT_CLICKED"] = "performance-insight-clicked";
  BadgeAction2["DEBUGGER_PAUSED"] = "debugger-paused";
  BadgeAction2["BREAKPOINT_ADDED"] = "breakpoint-added";
  BadgeAction2["CONSOLE_PROMPT_EXECUTED"] = "console-prompt-executed";
  BadgeAction2["PERFORMANCE_RECORDING_STARTED"] = "performance-recording-started";
  BadgeAction2["NETWORK_SPEED_THROTTLED"] = "network-speed-throttled";
  BadgeAction2["RECORDER_RECORDING_STARTED"] = "recorder-recording-started";
})(BadgeAction || (BadgeAction = {}));
var Badge = class {
  #onTriggerBadge;
  #badgeActionEventTarget;
  #eventListeners = [];
  #triggeredBefore = false;
  isStarterBadge = false;
  constructor(context) {
    this.#onTriggerBadge = context.onTriggerBadge;
    this.#badgeActionEventTarget = context.badgeActionEventTarget;
  }
  trigger(opts) {
    if (this.#triggeredBefore) {
      return;
    }
    this.#triggeredBefore = true;
    this.deactivate();
    this.#onTriggerBadge(this, opts);
  }
  activate() {
    if (this.#eventListeners.length > 0) {
      return;
    }
    this.#eventListeners = this.interestedActions.map((actionType) => this.#badgeActionEventTarget.addEventListener(actionType, () => {
      this.handleAction(actionType);
    }, this));
  }
  deactivate() {
    if (!this.#eventListeners.length) {
      return;
    }
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#eventListeners = [];
    this.#triggeredBefore = false;
  }
};

// gen/front_end/models/badges/AiExplorerBadge.js
var AI_EXPLORER_BADGE_URI = new URL("../../Images/ai-explorer-badge.svg", import.meta.url).toString();
var AI_CONVERSATION_COUNT_SETTING_NAME = "gdp.ai-conversation-count";
var AI_CONVERSATION_COUNT_LIMIT = 5;
var AiExplorerBadge = class extends Badge {
  name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fai-explorer";
  title = "AI Explorer";
  jslogContext = "ai-explorer";
  imageUri = AI_EXPLORER_BADGE_URI;
  #aiConversationCountSetting = Common2.Settings.Settings.instance().createSetting(
    AI_CONVERSATION_COUNT_SETTING_NAME,
    0,
    "Synced"
    /* Common.Settings.SettingStorageType.SYNCED */
  );
  interestedActions = [
    BadgeAction.STARTED_AI_CONVERSATION
  ];
  handleAction(_action) {
    const currentCount = this.#aiConversationCountSetting.get();
    if (currentCount >= AI_CONVERSATION_COUNT_LIMIT) {
      return;
    }
    this.#aiConversationCountSetting.set(currentCount + 1);
    if (this.#aiConversationCountSetting.get() === AI_CONVERSATION_COUNT_LIMIT) {
      this.trigger();
    }
  }
};

// gen/front_end/models/badges/SpeedsterBadge.js
var SPEEDSTER_BADGE_URI = new URL("../../Images/speedster-badge.svg", import.meta.url).toString();
var SpeedsterBadge = class extends Badge {
  name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fspeedster";
  title = "Speedster";
  jslogContext = "speedster";
  interestedActions = [
    BadgeAction.PERFORMANCE_INSIGHT_CLICKED
  ];
  imageUri = SPEEDSTER_BADGE_URI;
  handleAction(_action) {
    this.trigger();
  }
};

// gen/front_end/models/badges/StarterBadge.js
var STARTER_BADGE_IMAGE_URI = new URL("../../Images/devtools-user-badge.svg", import.meta.url).toString();
var StarterBadge = class extends Badge {
  isStarterBadge = true;
  name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fchrome-devtools-user";
  title = "Chrome DevTools User";
  jslogContext = "chrome-devtools-user";
  imageUri = STARTER_BADGE_IMAGE_URI;
  // TODO(ergunsh): Add remaining non-trivial event definitions
  interestedActions = [
    BadgeAction.GDP_SIGN_UP_COMPLETE,
    BadgeAction.RECEIVE_BADGES_SETTING_ENABLED,
    BadgeAction.CSS_RULE_MODIFIED,
    BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED,
    BadgeAction.BREAKPOINT_ADDED,
    BadgeAction.CONSOLE_PROMPT_EXECUTED,
    BadgeAction.PERFORMANCE_RECORDING_STARTED,
    BadgeAction.NETWORK_SPEED_THROTTLED,
    BadgeAction.RECORDER_RECORDING_STARTED
  ];
  handleAction(action) {
    this.trigger({ immediate: action === BadgeAction.GDP_SIGN_UP_COMPLETE });
  }
};

// gen/front_end/models/badges/UserBadges.js
import * as Common3 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";

// gen/front_end/models/badges/CodeWhispererBadge.js
var CODE_WHISPERER_BADGE_IMAGE_URI = new URL("../../Images/code-whisperer-badge.svg", import.meta.url).toString();
var CodeWhispererBadge = class extends Badge {
  name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fcode-whisperer";
  title = "Code Whisperer";
  jslogContext = "code-whisperer";
  imageUri = CODE_WHISPERER_BADGE_IMAGE_URI;
  interestedActions = [BadgeAction.DEBUGGER_PAUSED];
  handleAction(_action) {
    this.trigger();
  }
};

// gen/front_end/models/badges/DOMDetectiveBadge.js
var DOM_DETECTIVE_BADGE_IMAGE_URI = new URL("../../Images/dom-detective-badge.svg", import.meta.url).toString();
var DOMDetectiveBadge = class extends Badge {
  name = "profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fdom-detective";
  title = "DOM Detective";
  jslogContext = "dom-detective";
  imageUri = DOM_DETECTIVE_BADGE_IMAGE_URI;
  interestedActions = [
    BadgeAction.MODERN_DOM_BADGE_CLICKED
  ];
  handleAction(_action) {
    this.trigger();
  }
};

// gen/front_end/models/badges/UserBadges.js
var SNOOZE_TIME_MS = 24 * 60 * 60 * 1e3;
var MAX_SNOOZE_COUNT = 3;
var DELAY_BEFORE_TRIGGER = 1500;
var userBadgesInstance = void 0;
var UserBadges = class _UserBadges extends Common3.ObjectWrapper.ObjectWrapper {
  #badgeActionEventTarget = new Common3.ObjectWrapper.ObjectWrapper();
  #receiveBadgesSetting;
  #allBadges;
  #starterBadgeSnoozeCount;
  #starterBadgeLastSnoozedTimestamp;
  #starterBadgeDismissed;
  static BADGE_REGISTRY = [
    StarterBadge,
    SpeedsterBadge,
    DOMDetectiveBadge,
    CodeWhispererBadge,
    AiExplorerBadge
  ];
  constructor() {
    super();
    this.#receiveBadgesSetting = Common3.Settings.Settings.instance().moduleSetting("receive-gdp-badges");
    if (!Host.GdpClient.isBadgesEnabled()) {
      this.#receiveBadgesSetting.set(false);
    }
    this.#receiveBadgesSetting.addChangeListener(this.#reconcileBadges, this);
    this.#starterBadgeSnoozeCount = Common3.Settings.Settings.instance().createSetting(
      "starter-badge-snooze-count",
      0,
      "Synced"
      /* Common.Settings.SettingStorageType.SYNCED */
    );
    this.#starterBadgeLastSnoozedTimestamp = Common3.Settings.Settings.instance().createSetting(
      "starter-badge-last-snoozed-timestamp",
      0,
      "Synced"
      /* Common.Settings.SettingStorageType.SYNCED */
    );
    this.#starterBadgeDismissed = Common3.Settings.Settings.instance().createSetting(
      "starter-badge-dismissed",
      false,
      "Synced"
      /* Common.Settings.SettingStorageType.SYNCED */
    );
    this.#allBadges = _UserBadges.BADGE_REGISTRY.map((badgeCtor) => new badgeCtor({
      onTriggerBadge: this.#onTriggerBadge.bind(this),
      badgeActionEventTarget: this.#badgeActionEventTarget
    }));
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!userBadgesInstance || forceNew) {
      userBadgesInstance = new _UserBadges();
    }
    return userBadgesInstance;
  }
  async initialize() {
    return await this.#reconcileBadges();
  }
  snoozeStarterBadge() {
    this.#starterBadgeSnoozeCount.set(this.#starterBadgeSnoozeCount.get() + 1);
    this.#starterBadgeLastSnoozedTimestamp.set(Date.now());
  }
  dismissStarterBadge() {
    this.#starterBadgeDismissed.set(true);
  }
  recordAction(action) {
    this.#badgeActionEventTarget.dispatchEventToListeners(action);
  }
  async #resolveBadgeTriggerReason(badge) {
    if (!badge.isStarterBadge) {
      return "Award";
    }
    const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
    if (!getProfileResponse) {
      return;
    }
    const hasGdpProfile = Boolean(getProfileResponse.profile);
    const receiveBadgesSettingEnabled = Boolean(this.#receiveBadgesSetting.get());
    if (hasGdpProfile && receiveBadgesSettingEnabled) {
      return "Award";
    }
    if (this.#isStarterBadgeDismissed() || this.#isStarterBadgeSnoozed()) {
      return;
    }
    if (hasGdpProfile && !receiveBadgesSettingEnabled) {
      return "StarterBadgeSettingsNudge";
    }
    return "StarterBadgeProfileNudge";
  }
  async #onTriggerBadge(badge, opts) {
    const triggerTime = Date.now();
    const reason = await this.#resolveBadgeTriggerReason(badge);
    if (!reason) {
      return;
    }
    if (reason === "Award") {
      const result = await Host.GdpClient.GdpClient.instance().createAward({ name: badge.name });
      if (!result) {
        return;
      }
    }
    const timeElapsedAfterTriggerCall = Date.now() - triggerTime;
    const delay = opts?.immediate ? 0 : Math.max(DELAY_BEFORE_TRIGGER - timeElapsedAfterTriggerCall, 0);
    setTimeout(() => {
      this.dispatchEventToListeners("BadgeTriggered", { badge, reason });
    }, delay);
  }
  #deactivateAllBadges() {
    this.#allBadges.forEach((badge) => {
      badge.deactivate();
    });
  }
  #isStarterBadgeDismissed() {
    return this.#starterBadgeDismissed.get();
  }
  #isStarterBadgeSnoozed() {
    const snoozeCount = this.#starterBadgeSnoozeCount.get();
    const lastSnoozed = this.#starterBadgeLastSnoozedTimestamp.get();
    const snoozedRecently = Date.now() - lastSnoozed < SNOOZE_TIME_MS;
    return snoozeCount >= MAX_SNOOZE_COUNT || snoozedRecently;
  }
  async #reconcileBadges() {
    const syncInfo = await new Promise((resolve) => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
    if (!syncInfo.accountEmail) {
      this.#deactivateAllBadges();
      return;
    }
    if (!Host.GdpClient.isGdpProfilesAvailable() || !Host.GdpClient.isBadgesEnabled()) {
      this.#deactivateAllBadges();
      return;
    }
    const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
    if (!getProfileResponse) {
      this.#deactivateAllBadges();
      return;
    }
    const hasGdpProfile = Boolean(getProfileResponse.profile);
    const isEligibleToCreateProfile = getProfileResponse.isEligible;
    if (!hasGdpProfile && !isEligibleToCreateProfile) {
      this.#deactivateAllBadges();
      return;
    }
    let awardedBadgeNames = null;
    if (hasGdpProfile) {
      awardedBadgeNames = await Host.GdpClient.GdpClient.instance().getAwardedBadgeNames({ names: this.#allBadges.map((badge) => badge.name) });
      if (!awardedBadgeNames) {
        this.#deactivateAllBadges();
        return;
      }
    }
    const receiveBadgesSettingEnabled = Boolean(this.#receiveBadgesSetting.get());
    for (const badge of this.#allBadges) {
      if (awardedBadgeNames?.has(badge.name)) {
        badge.deactivate();
        continue;
      }
      const shouldActivateStarterBadge = badge.isStarterBadge && isEligibleToCreateProfile && Host.GdpClient.isStarterBadgeEnabled() && !this.#isStarterBadgeDismissed() && !this.#isStarterBadgeSnoozed();
      const shouldActivateActivityBasedBadge = !badge.isStarterBadge && hasGdpProfile && receiveBadgesSettingEnabled;
      if (shouldActivateStarterBadge || shouldActivateActivityBasedBadge) {
        badge.activate();
      } else {
        badge.deactivate();
      }
    }
    this.reconcileBadgesFinishedForTest();
  }
  reconcileBadgesFinishedForTest() {
  }
  isReceiveBadgesSettingEnabled() {
    return Boolean(this.#receiveBadgesSetting.get());
  }
};
export {
  AiExplorerBadge,
  Badge,
  BadgeAction,
  SpeedsterBadge,
  StarterBadge,
  UserBadges
};
//# sourceMappingURL=badges.js.map
