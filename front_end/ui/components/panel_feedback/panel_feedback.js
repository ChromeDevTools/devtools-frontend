var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/panel_feedback/FeedbackButton.js
var FeedbackButton_exports = {};
__export(FeedbackButton_exports, {
  FeedbackButton: () => FeedbackButton
});
import * as Host from "./../../../core/host/host.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as ComponentHelpers from "./../helpers/helpers.js";
import { html, render } from "./../../lit/lit.js";
import * as Buttons from "./../buttons/buttons.js";
var UIStrings = {
  /**
   * @description The title of the button that leads to the feedback form.
   */
  feedback: "Feedback"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/panel_feedback/FeedbackButton.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var FeedbackButton = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #props = {
    feedbackUrl: Platform.DevToolsPath.EmptyUrlString
  };
  set data(data) {
    this.#props = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  #onFeedbackClick() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.#props.feedbackUrl);
  }
  #render() {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("FeedbackButton render was not scheduled");
    }
    render(html`
      <devtools-button
          @click=${this.#onFeedbackClick}
          .iconName=${"review"}
          .variant=${"outlined"}
          .jslogContext=${"feedback"}
      >${i18nString(UIStrings.feedback)}</devtools-button>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-feedback-button", FeedbackButton);

// gen/front_end/ui/components/panel_feedback/PanelFeedback.js
var PanelFeedback_exports = {};
__export(PanelFeedback_exports, {
  PanelFeedback: () => PanelFeedback
});
import "./../../legacy/legacy.js";
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../core/platform/platform.js";
import * as ComponentHelpers2 from "./../helpers/helpers.js";
import { html as html2, render as render2 } from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/panel_feedback/panelFeedback.css.js
var panelFeedback_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

.preview {
  padding: 12px 16px;
  border: 1px solid var(--sys-color-divider);
  color: var(--sys-color-on-surface);
  font-size: 13px;
  line-height: 20px;
  border-radius: 12px;
  margin: 42px 0;
  letter-spacing: 0.01em;
}

h2 {
  color: var(--sys-color-primary);
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0.01em;
  margin: 9px 0 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
}

h3 {
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0.04em;
  color: var(--sys-color-on-surface);
  margin-bottom: 2px;
  font-weight: normal;
}

.preview p {
  margin-bottom: 24px;
}

.thumbnail {
  height: 92px;
}

.video {
  display: flex;
  flex-flow: row wrap;
  gap: 20px;
}

x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

x-link.quick-start-link {
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0.04em;
}

.video-description {
  min-width: min-content;
  flex-basis: min-content;
  flex-grow: 1;
}

@media (forced-colors: active) {
  x-link {
    color: linktext;
  }
}

/*# sourceURL=${import.meta.resolve("./panelFeedback.css")} */`;

// gen/front_end/ui/components/panel_feedback/PanelFeedback.js
var UIStrings2 = {
  /**
   * @description Introduction sentence to convey the feature is being actively worked on and we are looking for feedback.
   */
  previewText: "Our team is actively working on this feature and we would love to know what you think.",
  /**
   * @description Link text the user can click to provide feedback to the team.
   */
  previewTextFeedbackLink: "Send us your feedback.",
  /**
   * @description Title of the UI section that shows the user that this feature is in preview. Used as the main heading. Not a verb.
   */
  previewFeature: "Preview feature",
  /**
   * @description Title of the section to the quick start video and documentation on experimental panels.
   */
  videoAndDocumentation: "Video and documentation"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/components/panel_feedback/PanelFeedback.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var videoThumbnailUrl = new URL("../../../Images/preview_feature_video_thumbnail.svg", import.meta.url).toString();
var PanelFeedback = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #props = {
    feedbackUrl: Platform2.DevToolsPath.EmptyUrlString,
    quickStartUrl: Platform2.DevToolsPath.EmptyUrlString,
    quickStartLinkText: ""
  };
  set data(data) {
    this.#props = data;
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("PanelFeedback render was not scheduled");
    }
    render2(html2`
      <style>${panelFeedback_css_default}</style>
      <div class="preview">
        <h2 class="flex">
          <devtools-icon name="experiment" class="extra-large" style="color: var(--icon-primary);"></devtools-icon> ${i18nString2(UIStrings2.previewFeature)}
        </h2>
        <p>${i18nString2(UIStrings2.previewText)} <x-link href=${this.#props.feedbackUrl} jslog=${VisualLogging.link("feedback").track({ click: true })}>${i18nString2(UIStrings2.previewTextFeedbackLink)}</x-link></p>
        <div class="video">
          <div class="thumbnail">
            <img src=${videoThumbnailUrl} role="presentation" />
          </div>
          <div class="video-description">
            <h3>${i18nString2(UIStrings2.videoAndDocumentation)}</h3>
            <x-link class="quick-start-link" href=${this.#props.quickStartUrl} jslog=${VisualLogging.link("css-overview.quick-start").track({ click: true })}>${this.#props.quickStartLinkText}</x-link>
          </div>
        </div>
      </div>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-panel-feedback", PanelFeedback);

// gen/front_end/ui/components/panel_feedback/PreviewToggle.js
var PreviewToggle_exports = {};
__export(PreviewToggle_exports, {
  PreviewToggle: () => PreviewToggle
});
import "./../../legacy/legacy.js";
import * as i18n5 from "./../../../core/i18n/i18n.js";
import * as Root from "./../../../core/root/root.js";
import { html as html3, nothing, render as render3 } from "./../../lit/lit.js";

// gen/front_end/ui/components/panel_feedback/previewToggle.css.js
var previewToggle_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
}

.container {
  display: flex;
  flex-wrap: wrap;
  padding: 4px;
}

.feedback,
.learn-more {
  display: flex;
  align-items: center;
}

.helper {
  flex-basis: 100%;
  text-align: center;
  font-style: italic;
}

.spacer {
  flex: 1;
}

.x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
  margin: 0 4px;
}

.feedback .x-link {
  color: var(--sys-color-token-subtle);
}

/*# sourceURL=${import.meta.resolve("./previewToggle.css")} */`;

// gen/front_end/ui/components/panel_feedback/PreviewToggle.js
var UIStrings3 = {
  /**
   * @description Link text the user can click to provide feedback to the team.
   */
  previewTextFeedbackLink: "Send us your feedback.",
  /**
   * @description Link text the user can click to provide feedback to the team.
   */
  shortFeedbackLink: "Send feedback",
  /**
   * @description Link text the user can click to see documentation.
   */
  learnMoreLink: "Learn More"
};
var str_3 = i18n5.i18n.registerUIStrings("ui/components/panel_feedback/PreviewToggle.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var PreviewToggle = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #name = "";
  #helperText = null;
  #feedbackURL = null;
  #learnMoreURL;
  #experiment = "";
  #onChangeCallback;
  set data(data) {
    this.#name = data.name;
    this.#helperText = data.helperText;
    this.#feedbackURL = data.feedbackURL;
    this.#learnMoreURL = data.learnMoreURL;
    this.#experiment = data.experiment;
    this.#onChangeCallback = data.onChangeCallback;
    this.#render();
  }
  #render() {
    const checked = Root.Runtime.experiments.isEnabled(this.#experiment);
    render3(html3`
      <style>${previewToggle_css_default}</style>
      <div class="container">
          <devtools-checkbox
            ?checked=${checked}
            @change=${this.#checkboxChanged}
            aria-label=${this.#name} />
            <devtools-icon name="experiment" class="medium">
          </devtools-icon>${this.#name}
          </devtools-checkbox>
        <div class="spacer"></div>
        ${this.#feedbackURL && !this.#helperText ? html3`<div class="feedback"><x-link class="x-link" href=${this.#feedbackURL}>${i18nString3(UIStrings3.shortFeedbackLink)}</x-link></div>` : nothing}
        ${this.#learnMoreURL ? html3`<div class="learn-more"><x-link class="x-link" href=${this.#learnMoreURL}>${i18nString3(UIStrings3.learnMoreLink)}</x-link></div>` : nothing}
        <div class="helper">
          ${this.#helperText && this.#feedbackURL ? html3`<p>${this.#helperText} <x-link class="x-link" href=${this.#feedbackURL}>${i18nString3(UIStrings3.previewTextFeedbackLink)}</x-link></p>` : nothing}
        </div>
      </div>`, this.#shadow, {
      host: this
    });
  }
  #checkboxChanged(event) {
    const checked = event.target.checked;
    Root.Runtime.experiments.setEnabled(this.#experiment, checked);
    this.#onChangeCallback?.(checked);
  }
};
customElements.define("devtools-preview-toggle", PreviewToggle);
export {
  FeedbackButton_exports as FeedbackButton,
  PanelFeedback_exports as PanelFeedback,
  PreviewToggle_exports as PreviewToggle
};
//# sourceMappingURL=panel_feedback.js.map
