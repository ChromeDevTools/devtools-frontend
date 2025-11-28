var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/issue_counter/IssueCounter.js
var IssueCounter_exports = {};
__export(IssueCounter_exports, {
  IssueCounter: () => IssueCounter,
  getIssueCountsEnumeration: () => getIssueCountsEnumeration,
  getIssueKindIconName: () => getIssueKindIconName
});
import "./../icon_button/icon_button.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as IssuesManager from "./../../../models/issues_manager/issues_manager.js";
import { html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/issue_counter/issueCounter.css.js
var issueCounter_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  white-space: normal;
  display: inline-block;
}

/*# sourceURL=${import.meta.resolve("./issueCounter.css")} */`;

// gen/front_end/ui/components/issue_counter/IssueCounter.js
var UIStrings = {
  /**
   * @description Label for link to Issues tab, specifying how many issues there are.
   */
  pageErrors: "{issueCount, plural, =1 {# page error} other {# page errors}}",
  /**
   * @description Label for link to Issues tab, specifying how many issues there are.
   */
  breakingChanges: "{issueCount, plural, =1 {# breaking change} other {# breaking changes}}",
  /**
   * @description Label for link to Issues tab, specifying how many issues there are.
   */
  possibleImprovements: "{issueCount, plural, =1 {# possible improvement} other {# possible improvements}}"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/issue_counter/IssueCounter.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function getIssueKindIconName(issueKind) {
  switch (issueKind) {
    case "PageError":
      return "issue-cross-filled";
    case "BreakingChange":
      return "issue-exclamation-filled";
    case "Improvement":
      return "issue-text-filled";
  }
}
function toIconGroup(iconName, sizeOverride) {
  if (sizeOverride) {
    return { iconName, iconWidth: sizeOverride, iconHeight: sizeOverride };
  }
  return { iconName };
}
var listFormatter = /* @__PURE__ */ function defineFormatter() {
  let intlListFormat;
  return {
    format(...args) {
      if (!intlListFormat) {
        const opts = { type: "unit", style: "short" };
        intlListFormat = new Intl.ListFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, opts);
      }
      return intlListFormat.format(...args);
    }
  };
}();
function getIssueCountsEnumeration(issuesManager, omitEmpty = true) {
  const counts = [
    issuesManager.numberOfIssues(
      "PageError"
      /* IssuesManager.Issue.IssueKind.PAGE_ERROR */
    ),
    issuesManager.numberOfIssues(
      "BreakingChange"
      /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */
    ),
    issuesManager.numberOfIssues(
      "Improvement"
      /* IssuesManager.Issue.IssueKind.IMPROVEMENT */
    )
  ];
  const phrases = [
    i18nString(UIStrings.pageErrors, { issueCount: counts[0] }),
    i18nString(UIStrings.breakingChanges, { issueCount: counts[1] }),
    i18nString(UIStrings.possibleImprovements, { issueCount: counts[2] })
  ];
  return listFormatter.format(phrases.filter((_, i) => omitEmpty ? counts[i] > 0 : true));
}
var IssueCounter = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #clickHandler = void 0;
  #tooltipCallback = void 0;
  #leadingText = "";
  #throttler;
  #counts = [0, 0, 0];
  #displayMode = "OmitEmpty";
  #issuesManager = void 0;
  #accessibleName = void 0;
  #throttlerTimeout;
  #compact = false;
  scheduleUpdate() {
    if (this.#throttler) {
      void this.#throttler.schedule(async () => this.#render());
    } else {
      this.#render();
    }
  }
  set data(data) {
    this.#clickHandler = data.clickHandler;
    this.#leadingText = data.leadingText ?? "";
    this.#tooltipCallback = data.tooltipCallback;
    this.#displayMode = data.displayMode ?? "OmitEmpty";
    this.#accessibleName = data.accessibleName;
    this.#throttlerTimeout = data.throttlerTimeout;
    this.#compact = Boolean(data.compact);
    if (this.#issuesManager !== data.issuesManager) {
      this.#issuesManager?.removeEventListener("IssuesCountUpdated", this.scheduleUpdate, this);
      this.#issuesManager = data.issuesManager;
      this.#issuesManager.addEventListener("IssuesCountUpdated", this.scheduleUpdate, this);
    }
    if (data.throttlerTimeout !== 0) {
      this.#throttler = new Common.Throttler.Throttler(data.throttlerTimeout ?? 100);
    } else {
      this.#throttler = void 0;
    }
    this.scheduleUpdate();
  }
  get data() {
    return {
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      tooltipCallback: this.#tooltipCallback,
      displayMode: this.#displayMode,
      accessibleName: this.#accessibleName,
      throttlerTimeout: this.#throttlerTimeout,
      compact: this.#compact,
      issuesManager: this.#issuesManager
    };
  }
  #render() {
    if (!this.#issuesManager) {
      return;
    }
    this.#counts = [
      this.#issuesManager.numberOfIssues(
        "PageError"
        /* IssuesManager.Issue.IssueKind.PAGE_ERROR */
      ),
      this.#issuesManager.numberOfIssues(
        "BreakingChange"
        /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */
      ),
      this.#issuesManager.numberOfIssues(
        "Improvement"
        /* IssuesManager.Issue.IssueKind.IMPROVEMENT */
      )
    ];
    const importance = [
      "PageError",
      "BreakingChange",
      "Improvement"
    ];
    const mostImportant = importance[this.#counts.findIndex((x) => x > 0) ?? 2];
    const countToString = (kind, count) => {
      switch (this.#displayMode) {
        case "OmitEmpty":
          return count > 0 ? `${count}` : void 0;
        case "ShowAlways":
          return `${count}`;
        case "OnlyMostImportant":
          return kind === mostImportant ? `${count}` : void 0;
      }
    };
    const iconSize = "2ex";
    const data = {
      groups: [
        {
          ...toIconGroup(getIssueKindIconName(
            "PageError"
            /* IssuesManager.Issue.IssueKind.PAGE_ERROR */
          ), iconSize),
          text: countToString("PageError", this.#counts[0])
        },
        {
          ...toIconGroup(getIssueKindIconName(
            "BreakingChange"
            /* IssuesManager.Issue.IssueKind.BREAKING_CHANGE */
          ), iconSize),
          text: countToString("BreakingChange", this.#counts[1])
        },
        {
          ...toIconGroup(getIssueKindIconName(
            "Improvement"
            /* IssuesManager.Issue.IssueKind.IMPROVEMENT */
          ), iconSize),
          text: countToString("Improvement", this.#counts[2])
        }
      ],
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      accessibleName: this.#accessibleName,
      compact: this.#compact
    };
    render(html`
        <style>${issueCounter_css_default}</style>
        <icon-button .data=${data} .accessibleName=${this.#accessibleName}></icon-button>
        `, this.#shadow, { host: this });
    this.#tooltipCallback?.();
  }
};
customElements.define("devtools-issue-counter", IssueCounter);

// gen/front_end/ui/components/issue_counter/IssueLinkIcon.js
var IssueLinkIcon_exports = {};
__export(IssueLinkIcon_exports, {
  IssueLinkIcon: () => IssueLinkIcon,
  extractShortPath: () => extractShortPath
});
import "./../../kit/kit.js";
import * as Common2 from "./../../../core/common/common.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as IssuesManager2 from "./../../../models/issues_manager/issues_manager.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/issue_counter/issueLinkIcon.css.js
var issueLinkIcon_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: inline-block;
  white-space: nowrap;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
}

:host([hidden]) {
  display: none;
}

button {
  border: none;
  background: transparent;
  margin: 0;
  padding: 0;

  &.link {
    cursor: pointer;

    & > span {
      color: var(--sys-color-primary);
    }
  }
}

devtools-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;

  &[name="issue-cross-filled"] {
    color: var(--icon-error);
  }

  &[name="issue-exclamation-filled"] {
    color: var(--icon-warning);
  }

  &[name="issue-text-filled"] {
    color: var(--icon-info);
  }
}

@media (forced-colors: active) {
  devtools-icon {
    color: ButtonText;
  }
}

/*# sourceURL=${import.meta.resolve("./issueLinkIcon.css")} */`;

// gen/front_end/ui/components/issue_counter/IssueLinkIcon.js
var { html: html2 } = Lit;
var UIStrings2 = {
  /**
   * @description Title for a link to show an issue in the issues tab
   */
  clickToShowIssue: "Click to show issue in the issues tab",
  /**
   * @description Title for a link to show an issue in the issues tab
   * @example {A title of an Issue} title
   */
  clickToShowIssueWithTitle: "Click to open the issue tab and show issue: {title}",
  /**
   * @description Title for an link to show an issue that is unavailable because the issue couldn't be resolved
   */
  issueUnavailable: "Issue unavailable at this time"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/components/issue_counter/IssueLinkIcon.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var extractShortPath = (path) => {
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [""])[0];
};
var IssueLinkIcon = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  // The value `null` indicates that the issue is not available,
  // `undefined` that it is still being resolved.
  #issue;
  #issueTitle = null;
  #issueId;
  #issueResolver;
  #additionalOnClickAction;
  #reveal = Common2.Revealer.reveal;
  set data(data) {
    this.#issue = data.issue;
    this.#issueId = data.issueId;
    this.#issueResolver = data.issueResolver;
    if (!this.#issue) {
      if (!this.#issueId) {
        throw new Error("Either `issue` or `issueId` must be provided");
      } else if (!this.#issueResolver) {
        throw new Error("An `IssueResolver` must be provided if an `issueId` is provided.");
      }
    }
    this.#additionalOnClickAction = data.additionalOnClickAction;
    if (data.revealOverride) {
      this.#reveal = data.revealOverride;
    }
    void this.#fetchIssueData();
    void this.#render();
  }
  async #fetchIssueData() {
    if (!this.#issue && this.#issueId) {
      try {
        this.#issue = await this.#issueResolver?.waitFor(this.#issueId);
      } catch {
        this.#issue = null;
      }
    }
    const description = this.#issue?.getDescription();
    if (description) {
      const title = await IssuesManager2.MarkdownIssueDescription.getIssueTitleFromMarkdownDescription(description);
      if (title) {
        this.#issueTitle = title;
      }
    }
    await this.#render();
  }
  get data() {
    return {
      issue: this.#issue,
      issueId: this.#issueId,
      issueResolver: this.#issueResolver,
      additionalOnClickAction: this.#additionalOnClickAction,
      revealOverride: this.#reveal !== Common2.Revealer.reveal ? this.#reveal : void 0
    };
  }
  handleClick(event) {
    if (event.button !== 0) {
      return;
    }
    if (this.#issue) {
      void this.#reveal(this.#issue);
    }
    this.#additionalOnClickAction?.();
    event.consume();
  }
  #getTooltip() {
    if (this.#issueTitle) {
      return i18nString2(UIStrings2.clickToShowIssueWithTitle, { title: this.#issueTitle });
    }
    if (this.#issue) {
      return i18nString2(UIStrings2.clickToShowIssue);
    }
    return i18nString2(UIStrings2.issueUnavailable);
  }
  #getIconName() {
    if (!this.#issue) {
      return "issue-questionmark-filled";
    }
    const iconName = getIssueKindIconName(this.#issue.getKind());
    return iconName;
  }
  #render() {
    return RenderCoordinator.write(() => {
      Lit.render(html2`
      <style>${issueLinkIcon_css_default}</style>
      <button class=${Lit.Directives.classMap({ link: Boolean(this.#issue) })}
              title=${this.#getTooltip()}
              jslog=${VisualLogging.link("issue").track({ click: true })}
              @click=${this.handleClick}>
        <devtools-icon name=${this.#getIconName()}></devtools-icon>
      </button>`, this.#shadow, { host: this });
    });
  }
};
customElements.define("devtools-issue-link-icon", IssueLinkIcon);
export {
  IssueCounter_exports as IssueCounter,
  IssueLinkIcon_exports as IssueLinkIcon
};
//# sourceMappingURL=issue_counter.js.map
