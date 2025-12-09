var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/ApplicationPanelSidebar.js
var ApplicationPanelSidebar_exports = {};
__export(ApplicationPanelSidebar_exports, {
  AppManifestTreeElement: () => AppManifestTreeElement,
  ApplicationPanelSidebar: () => ApplicationPanelSidebar,
  BackgroundServiceTreeElement: () => BackgroundServiceTreeElement,
  ClearStorageTreeElement: () => ClearStorageTreeElement,
  CookieTreeElement: () => CookieTreeElement,
  DOMStorageTreeElement: () => DOMStorageTreeElement,
  ExtensionStorageTreeElement: () => ExtensionStorageTreeElement,
  ExtensionStorageTreeParentElement: () => ExtensionStorageTreeParentElement,
  FrameResourceTreeElement: () => FrameResourceTreeElement,
  FrameTreeElement: () => FrameTreeElement,
  IDBDatabaseTreeElement: () => IDBDatabaseTreeElement,
  IDBIndexTreeElement: () => IDBIndexTreeElement,
  IDBObjectStoreTreeElement: () => IDBObjectStoreTreeElement,
  IndexedDBTreeElement: () => IndexedDBTreeElement,
  ManifestChildTreeElement: () => ManifestChildTreeElement,
  ResourcesSection: () => ResourcesSection,
  ServiceWorkersTreeElement: () => ServiceWorkersTreeElement,
  StorageCategoryView: () => StorageCategoryView
});
import * as Common16 from "./../../core/common/common.js";
import * as Host9 from "./../../core/host/host.js";
import * as i18n55 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as SDK23 from "./../../core/sdk/sdk.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as LegacyWrapper5 from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import { createIcon as createIcon11 } from "./../../ui/kit/kit.js";
import * as SourceFrame5 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI21 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/application/ApplicationPanelTreeElement.js
import * as Common from "./../../core/common/common.js";
import * as UI from "./../../ui/legacy/legacy.js";
var ApplicationPanelTreeElement = class _ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
  resourcesPanel;
  constructor(resourcesPanel, title, expandable, jslogContext) {
    super(title, expandable, jslogContext);
    this.resourcesPanel = resourcesPanel;
    UI.ARIAUtils.setLabel(this.listItemElement, title);
    this.listItemElement.tabIndex = -1;
  }
  deselect() {
    super.deselect();
    this.listItemElement.tabIndex = -1;
  }
  get itemURL() {
    throw new Error("Unimplemented Method");
  }
  onselect(selectedByUser) {
    if (!selectedByUser) {
      return false;
    }
    const path = [];
    for (let el = this; el; el = el.parent) {
      const url = el instanceof _ApplicationPanelTreeElement && el.itemURL;
      if (!url) {
        break;
      }
      path.push(url);
    }
    this.resourcesPanel.setLastSelectedItemPath(path);
    return false;
  }
  showView(view) {
    this.resourcesPanel.showView(view);
  }
};
var ExpandableApplicationPanelTreeElement = class extends ApplicationPanelTreeElement {
  expandedSetting;
  categoryName;
  categoryLink;
  // These strings are used for the empty state in each top most tree element
  // in the Application Panel.
  emptyCategoryHeadline;
  categoryDescription;
  constructor(resourcesPanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
    super(resourcesPanel, categoryName, false, settingsKey);
    this.expandedSetting = Common.Settings.Settings.instance().createSetting("resources-" + settingsKey + "-expanded", settingsDefault);
    this.categoryName = categoryName;
    this.categoryLink = null;
    this.emptyCategoryHeadline = emptyCategoryHeadline;
    this.categoryDescription = categoryDescription;
  }
  get itemURL() {
    return "category://" + this.categoryName;
  }
  setLink(link4) {
    this.categoryLink = link4;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.updateCategoryView();
    return false;
  }
  updateCategoryView() {
    const headline = this.childCount() === 0 ? this.emptyCategoryHeadline : this.categoryName;
    this.resourcesPanel.showCategoryView(this.categoryName, headline, this.categoryDescription, this.categoryLink);
  }
  appendChild(child, comparator) {
    super.appendChild(child, comparator);
    if (this.selected && this.childCount() === 1) {
      this.updateCategoryView();
    }
  }
  removeChild(child) {
    super.removeChild(child);
    if (this.selected && this.childCount() === 0) {
      this.updateCategoryView();
    }
  }
  onattach() {
    super.onattach();
    if (this.expandedSetting.get()) {
      this.expand();
    }
  }
  onexpand() {
    this.expandedSetting.set(true);
  }
  oncollapse() {
    this.expandedSetting.set(false);
  }
};

// gen/front_end/panels/application/AppManifestView.js
var AppManifestView_exports = {};
__export(AppManifestView_exports, {
  AppManifestView: () => AppManifestView,
  DEFAULT_VIEW: () => DEFAULT_VIEW
});
import "./../../ui/kit/kit.js";
import "./../../ui/legacy/components/inline_editor/inline_editor.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { html, i18nTemplate, nothing, render } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/appManifestView.css.js
var appManifestView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.report-field-name {
  flex-basis: 152px;
}

.manifest-view-header {
  min-width: 600px;
  flex-shrink: 0;
  flex-grow: 0;
}

.manifest-container {
  overflow: auto;
}

.inline-icon {
  width: 16px;
  height: 16px;
  margin-inline: var(--sys-size-3);

  &[name="check-circle"] {
    color: var(--icon-checkmark-green);
  }
}

.multiline-value {
  padding-top: var(--sys-size-5);
  white-space: normal;
}

select {
  margin: 4px;
}

.inline-button {
  vertical-align: sub;
}

/*# sourceURL=${import.meta.resolve("./appManifestView.css")} */`;

// gen/front_end/panels/application/AppManifestView.js
import * as ApplicationComponents from "./components/components.js";
var UIStrings = {
  /**
   * @description Text in App Manifest View of the Application panel
   */
  noManifestDetected: "No manifest detected",
  /**
   * @description Description text on manifests in App Manifest View of the Application panel which describes the app manifest view tab
   */
  manifestDescription: "A manifest defines how your app appears on phone\u2019s home screens and what the app looks like on launch.",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  appManifest: "Manifest",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  errorsAndWarnings: "Errors and warnings",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  installability: "Installability",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  identity: "Identity",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  presentation: "Presentation",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  protocolHandlers: "Protocol Handlers",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  icons: "Icons",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  windowControlsOverlay: "Window Controls Overlay",
  /**
   * @description Label in the App Manifest View for the "name" property of web app or shortcut item
   */
  name: "Name",
  /**
   * @description Label in the App Manifest View for the "short_name" property of web app or shortcut item
   */
  shortName: "Short name",
  /**
   * @description Label in the App Manifest View for the "url" property of shortcut item
   */
  url: "URL",
  /**
   * @description Label in the App Manifest View for the Computed App Id
   */
  computedAppId: "Computed App ID",
  /**
   * @description Popup-text explaining what the App Id is used for.
   */
  appIdExplainer: "This is used by the browser to know whether the manifest should be updating an existing application, or whether it refers to a new web app that can be installed.",
  /**
   * @description Text which is a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Explanation why it is advisable to specify an 'id' field in the manifest.
   * @example {/index.html} PH1
   * @example {(button for copying suggested value into clipboard)} PH2
   */
  appIdNote: "Note: `id` is not specified in the manifest, `start_url` is used instead. To specify an App ID that matches the current identity, set the `id` field to {PH1} {PH2}.",
  /**
   * @description Tooltip text that appears when hovering over a button which copies the previous text to the clipboard.
   */
  copyToClipboard: "Copy suggested ID to clipboard",
  /**
   * @description Screen reader announcement string when the user clicks the copy to clipboard button.
   * @example {/index.html} PH1
   */
  copiedToClipboard: "Copied suggested ID {PH1} to clipboard",
  /**
   * @description Label in the App Manifest View for the "description" property of web app or shortcut item
   */
  description: "Description",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  startUrl: "Start URL",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  themeColor: "Theme color",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  backgroundColor: "Background color",
  /**
   * @description Text for the orientation of something
   */
  orientation: "Orientation",
  /**
   * @description Title of the display attribute in App Manifest View of the Application panel
   * The display attribute defines the preferred display mode for the app such fullscreen or
   * standalone.
   * For more details see https://www.w3.org/TR/appmanifest/#display-member.
   */
  display: "Display",
  /**
   * @description Title of the new_note_url attribute in the Application panel
   */
  newNoteUrl: "New note URL",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  descriptionMayBeTruncated: "Description may be truncated.",
  /**
   * @description Warning text about too many shortcuts
   */
  shortcutsMayBeNotAvailable: "The maximum number of shortcuts is platform dependent. Some shortcuts may be not available.",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  showOnlyTheMinimumSafeAreaFor: "Show only the minimum safe area for maskable icons",
  /**
   * @description Link text for more information on maskable icons in App Manifest view of the Application panel
   */
  documentationOnMaskableIcons: "documentation on maskable icons",
  /**
   * @description Text wrapping a link pointing to more information on maskable icons in App Manifest view of the Application panel
   * @example {https://web.dev/maskable-icon/} PH1
   */
  needHelpReadOurS: "Need help? Read the {PH1}.",
  /**
   * @description Text in App Manifest View of the Application panel
   * @example {1} PH1
   */
  shortcutS: "Shortcut #{PH1}",
  /**
   * @description Text in App Manifest View of the Application panel
   * @example {1} PH1
   */
  shortcutSShouldIncludeAXPixel: "Shortcut #{PH1} should include a 96\xD796 pixel icon",
  /**
   * @description Text in App Manifest View of the Application panel
   * @example {1} PH1
   */
  screenshotS: "Screenshot #{PH1}",
  /**
   * @description Manifest installability error in the Application panel
   */
  pageIsNotLoadedInTheMainFrame: "Page is not loaded in the main frame",
  /**
   * @description Manifest installability error in the Application panel
   */
  pageIsNotServedFromASecureOrigin: "Page is not served from a secure origin",
  /**
   * @description Manifest installability error in the Application panel
   */
  pageHasNoManifestLinkUrl: "Page has no manifest <link> `URL`",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestCouldNotBeFetchedIsEmpty: "Manifest could not be fetched, is empty, or could not be parsed",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestStartUrlIsNotValid: "Manifest '`start_url`' is not valid",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestDoesNotContainANameOr: "Manifest does not contain a '`name`' or '`short_name`' field",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestDisplayPropertyMustBeOne: "Manifest '`display`' property must be one of '`standalone`', '`fullscreen`', or '`minimal-ui`'",
  /**
   * @description Manifest installability error in the Application panel
   * @example {100} PH1
   */
  manifestDoesNotContainASuitable: "Manifest does not contain a suitable icon\u2014PNG, SVG, or WebP format of at least {PH1}px is required, the '`sizes`' attribute must be set, and the '`purpose`' attribute, if set, must include '`any`'.",
  /**
   * @description Manifest installability error in the Application panel
   */
  avoidPurposeAnyAndMaskable: "Declaring an icon with '`purpose`' of '`any maskable`' is discouraged. It is likely to look incorrect on some platforms due to too much or too little padding.",
  /**
   * @description Manifest installability error in the Application panel
   * @example {100} PH1
   */
  noSuppliedIconIsAtLeastSpxSquare: "No supplied icon is at least {PH1} pixels square in `PNG`, `SVG`, or `WebP` format, with the purpose attribute unset or set to '`any`'.",
  /**
   * @description Manifest installability error in the Application panel
   */
  couldNotDownloadARequiredIcon: "Could not download a required icon from the manifest",
  /**
   * @description Manifest installability error in the Application panel
   */
  downloadedIconWasEmptyOr: "Downloaded icon was empty or corrupted",
  /**
   * @description Manifest installability error in the Application panel
   */
  theSpecifiedApplicationPlatform: "The specified application platform is not supported on Android",
  /**
   * @description Manifest installability error in the Application panel
   */
  noPlayStoreIdProvided: "No Play store ID provided",
  /**
   * @description Manifest installability error in the Application panel
   */
  thePlayStoreAppUrlAndPlayStoreId: "The Play Store app URL and Play Store ID do not match",
  /**
   * @description Manifest installability error in the Application panel
   */
  theAppIsAlreadyInstalled: "The app is already installed",
  /**
   * @description Manifest installability error in the Application panel
   */
  aUrlInTheManifestContainsA: "A URL in the manifest contains a username, password, or port",
  /**
   * @description Manifest installability error in the Application panel
   */
  pageIsLoadedInAnIncognitoWindow: "Page is loaded in an incognito window",
  /**
   * @description Manifest installability error in the Application panel
   */
  pageDoesNotWorkOffline: "Page does not work offline",
  /**
   * @description Manifest installability error in the Application panel
   */
  couldNotCheckServiceWorker: "Could not check `service worker` without a '`start_url`' field in the manifest",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestSpecifies: "Manifest specifies '`prefer_related_applications`: true'",
  /**
   * @description Manifest installability error in the Application panel
   */
  preferrelatedapplicationsIsOnly: "'`prefer_related_applications`' is only supported on `Chrome` Beta and Stable channels on `Android`.",
  /**
   * @description Manifest installability error in the Application panel
   */
  manifestContainsDisplayoverride: "Manifest contains '`display_override`' field, and the first supported display mode must be one of '`standalone`', '`fullscreen`', or '`minimal-ui`'",
  /**
   * @description Warning message for offline capability check
   * @example {https://developer.chrome.com/blog/improved-pwa-offline-detection} PH1
   */
  pageDoesNotWorkOfflineThePage: "Page does not work offline. Starting in Chrome 93, the installability criteria are changing, and this site will not be installable. See {PH1} for more information.",
  /**
   * @description Text to indicate the source of an image
   * @example {example.com} PH1
   */
  imageFromS: "Image from {PH1}",
  /**
   * @description Text for one or a group of screenshots
   */
  screenshot: "Screenshot",
  /**
   * @description Label in the App Manifest View for the "form_factor" property of screenshot
   */
  formFactor: "Form factor",
  /**
   * @description Label in the App Manifest View for the "label" property of screenshot
   */
  label: "Label",
  /**
   * @description Label in the App Manifest View for the "platform" property of screenshot
   */
  platform: "Platform",
  /**
   * @description Text in App Manifest View of the Application panel
   */
  icon: "Icon",
  /**
   * @description This is a warning message telling the user about a problem where the src attribute
   * of an image has not be entered/provided correctly. 'src' is part of the DOM API and should not
   * be translated.
   * @example {ImageName} PH1
   */
  sSrcIsNotSet: "{PH1} '`src`' is not set",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Screenshot} PH1
   * @example {https://example.com/image.png} PH2
   */
  sUrlSFailedToParse: "{PH1} URL ''{PH2}'' failed to parse",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSFailedToLoad: "{PH1} {PH2} failed to load",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSDoesNotSpecifyItsSizeInThe: "{PH1} {PH2} does not specify its size in the manifest",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSShouldSpecifyItsSizeAs: "{PH1} {PH2} should specify its size as `[width]x[height]`",
  /**
   * @description Warning message for image resources from the manifest
   */
  sSShouldHaveSquareIcon: "Most operating systems require square icons. Please include at least one square icon in the array.",
  /**
   * @description Warning message for image resources from the manifest
   * @example {100} PH1
   * @example {100} PH2
   * @example {Image} PH3
   * @example {https://example.com/image.png} PH4
   * @example {200} PH5
   * @example {200} PH6
   */
  actualSizeSspxOfSSDoesNotMatch: "Actual size ({PH1}\xD7{PH2})px of {PH3} {PH4} does not match specified size ({PH5}\xD7{PH6}px)",
  /**
   * @description Warning message for image resources from the manifest
   * @example {100} PH1
   * @example {Image} PH2
   * @example {https://example.com/image.png} PH3
   * @example {200} PH4
   */
  actualWidthSpxOfSSDoesNotMatch: "Actual width ({PH1}px) of {PH2} {PH3} does not match specified width ({PH4}px)",
  /**
   * @description Warning message for image resources from the manifest
   * @example {100} PH1
   * @example {Image} PH2
   * @example {https://example.com/image.png} PH3
   * @example {100} PH4
   */
  actualHeightSpxOfSSDoesNotMatch: "Actual height ({PH1}px) of {PH2} {PH3} does not match specified height ({PH4}px)",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSSizeShouldBeAtLeast320: "{PH1} {PH2} size should be at least 320\xD7320",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSSizeShouldBeAtMost3840: "{PH1} {PH2} size should be at most 3840\xD73840",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSWidthDoesNotComplyWithRatioRequirement: "{PH1} {PH2} width can't be more than 2.3 times as long as the height",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSHeightDoesNotComplyWithRatioRequirement: "{PH1} {PH2} height can't be more than 2.3 times as long as the width",
  /**
   * @description Manifest installability error in the Application panel
   * @example {https://example.com/image.png} url
   */
  screenshotPixelSize: "Screenshot {url} should specify a pixel size `[width]x[height]` instead of `any` as first size.",
  /**
   * @description Warning text about screenshots for Richer PWA Install UI on desktop
   */
  noScreenshotsForRicherPWAInstallOnDesktop: "Richer PWA Install UI won\u2019t be available on desktop. Please add at least one screenshot with the `form_factor` set to `wide`.",
  /**
   * @description Warning text about screenshots for Richer PWA Install UI on mobile
   */
  noScreenshotsForRicherPWAInstallOnMobile: "Richer PWA Install UI won\u2019t be available on mobile. Please add at least one screenshot for which `form_factor` is not set or set to a value other than `wide`.",
  /**
   * @description Warning text about too many screenshots for desktop
   */
  tooManyScreenshotsForDesktop: "No more than 8 screenshots will be displayed on desktop. The rest will be ignored.",
  /**
   * @description Warning text about too many screenshots for mobile
   */
  tooManyScreenshotsForMobile: "No more than 5 screenshots will be displayed on mobile. The rest will be ignored.",
  /**
   * @description Warning text about not all screenshots matching the appropriate form factor have the same aspect ratio
   */
  screenshotsMustHaveSameAspectRatio: "All screenshots with the same `form_factor` must have the same aspect ratio as the first screenshot with that `form_factor`. Some screenshots will be ignored.",
  /**
   * @description Message for Window Controls Overlay value succsessfully found with links to documnetation
   * @example {window-controls-overlay} PH1
   * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override} PH2
   * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest} PH3
   */
  wcoFound: "Chrome has successfully found the {PH1} value for the {PH2} field in the {PH3}.",
  /**
   * @description Message for Windows Control Overlay value not found with link to documentation
   * @example {https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override} PH1
   */
  wcoNotFound: "Define {PH1} in the manifest to use the Window Controls Overlay API and customize your app's title bar.",
  /**
   * @description Link text for more information on customizing Window Controls Overlay title bar in the Application panel
   */
  customizePwaTitleBar: "Customize the window controls overlay of your PWA's title bar",
  /**
   * @description Text wrapping link to documentation on how to customize WCO title bar
   * @example {https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay} PH1
   */
  wcoNeedHelpReadMore: "Need help? Read {PH1}.",
  /**
   * @description Text for emulation OS selection dropdown
   */
  selectWindowControlsOverlayEmulationOs: "Emulate the Window Controls Overlay on"
};
var str_ = i18n.i18n.registerUIStrings("panels/application/AppManifestView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function renderErrors(errorsSection, warnings, manifestErrors, imageErrors) {
  errorsSection.clearContent();
  errorsSection.element.classList.toggle("hidden", !manifestErrors?.length && !warnings?.length && !imageErrors?.length);
  for (const error of manifestErrors ?? []) {
    const icon = UI2.UIUtils.createIconLabel({
      title: error.message,
      iconName: error.critical ? "cross-circle-filled" : "warning-filled",
      color: error.critical ? "var(--icon-error)" : "var(--icon-warning)"
    });
    errorsSection.appendRow().appendChild(icon);
  }
  for (const warning of warnings ?? []) {
    const msgElement = document.createTextNode(warning);
    errorsSection.appendRow().appendChild(msgElement);
  }
  for (const error of imageErrors ?? []) {
    const msgElement = document.createTextNode(error);
    errorsSection.appendRow().appendChild(msgElement);
  }
}
function renderIdentity(identitySection, identityData) {
  const { name, shortName, description, appId, recommendedId, hasId } = identityData;
  const fields = [];
  fields.push({ title: i18nString(UIStrings.name), content: name });
  fields.push({ title: i18nString(UIStrings.shortName), content: shortName });
  fields.push({ title: i18nString(UIStrings.description), content: description });
  if (appId && recommendedId) {
    const onCopy = () => {
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.copiedToClipboard, { PH1: recommendedId }));
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(recommendedId);
    };
    fields.push({ title: i18nString(UIStrings.computedAppId), label: "App Id", content: html`
      ${appId}
      <devtools-icon class="inline-icon" name="help" title=${i18nString(UIStrings.appIdExplainer)}
          jslog=${VisualLogging.action("help").track({ hover: true })}>
      </devtools-icon>
      <devtools-link href="https://developer.chrome.com/blog/pwa-manifest-id/"
                    .jslogContext=${"learn-more"}>
        ${i18nString(UIStrings.learnMore)}
      </devtools-link>
      ${!hasId ? html`
        <div class="multiline-value">
          ${i18nTemplate(str_, UIStrings.appIdNote, {
      PH1: html`<code>${recommendedId}</code>`,
      PH2: html`<devtools-button class="inline-button" @click=${onCopy}
                        .iconName=${"copy"}
                        .variant=${"icon"}
                        .size=${"SMALL"}
                        .jslogContext=${"manifest.copy-id"}
                        .title=${i18nString(UIStrings.copyToClipboard)}>
                      </devtools-button>`
    })}
      </div>` : nothing}` });
  } else {
    identitySection.removeField(i18nString(UIStrings.computedAppId));
  }
  setSectionContents(fields, identitySection);
}
function renderPresentation(presentationSection, presentationData) {
  const { startUrl, completeStartUrl, themeColor, backgroundColor, orientation, display, newNoteUrl, hasNewNoteUrl, completeNewNoteUrl } = presentationData;
  const fields = [
    {
      title: i18nString(UIStrings.startUrl),
      label: i18nString(UIStrings.startUrl),
      content: completeStartUrl ? Components.Linkifier.Linkifier.linkifyURL(completeStartUrl, { text: startUrl, tabStop: true, jslogContext: "start-url" }) : nothing
    },
    {
      title: i18nString(UIStrings.themeColor),
      content: themeColor ? html`<devtools-color-swatch .color=${themeColor}></devtools-color-swatch>` : nothing
    },
    {
      title: i18nString(UIStrings.backgroundColor),
      content: backgroundColor ? html`<devtools-color-swatch .color=${backgroundColor}></devtools-color-swatch>` : nothing
    },
    { title: i18nString(UIStrings.orientation), content: orientation },
    { title: i18nString(UIStrings.display), content: display }
  ];
  if (completeNewNoteUrl) {
    fields.push({
      title: i18nString(UIStrings.newNoteUrl),
      content: hasNewNoteUrl ? Components.Linkifier.Linkifier.linkifyURL(completeNewNoteUrl, { text: newNoteUrl, tabStop: true }) : nothing
    });
  }
  setSectionContents(fields, presentationSection);
}
function renderProtocolHandlers(protocolHandlersView, data) {
  protocolHandlersView.protocolHandlers = data.protocolHandlers;
  protocolHandlersView.manifestLink = data.manifestLink;
}
function renderImage(imageSrc, imageUrl, naturalWidth) {
  return html`
    <div class="image-wrapper">
      <img src=${imageSrc} alt=${i18nString(UIStrings.imageFromS, { PH1: imageUrl })}
          width=${naturalWidth}>
    </div>`;
}
function renderIcons(iconsSection, data) {
  iconsSection.clearContent();
  const contents = [
    // clang-format off
    {
      content: html`<devtools-checkbox class="mask-checkbox"
        jslog=${VisualLogging.toggle("show-minimal-safe-area-for-maskable-icons").track({ change: true })}
        @click=${(event) => {
        iconsSection.setIconMasked(event.target.checked);
      }}>
      ${i18nString(UIStrings.showOnlyTheMinimumSafeAreaFor)}
    </devtools-checkbox>`
    },
    // clang-format on
    {
      content: i18nTemplate(str_, UIStrings.needHelpReadOurS, {
        PH1: html`
          <devtools-link href="https://web.dev/maskable-icon/" .jslogContext=${"learn-more"}>
            ${i18nString(UIStrings.documentationOnMaskableIcons)}
          </devtools-link>`
      })
    }
  ];
  for (const [title, images] of data.icons) {
    const content = images.filter((icon) => "imageSrc" in icon).map((icon) => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth));
    contents.push({ title, content, flexed: true });
  }
  setSectionContents(contents, iconsSection);
}
function renderShortcuts(reportView, shortcutSections, data) {
  for (const shortcutsSection of shortcutSections) {
    shortcutsSection.detach(
      /** overrideHideOnDetach= */
      true
    );
  }
  shortcutSections.length = 0;
  let shortcutIndex = 1;
  for (const shortcut of data.shortcuts) {
    const shortcutSection = reportView.appendSection(i18nString(UIStrings.shortcutS, { PH1: shortcutIndex }));
    shortcutSection.element.setAttribute("jslog", `${VisualLogging.section("shortcuts")}`);
    shortcutSections.push(shortcutSection);
    const fields = [
      { title: i18nString(UIStrings.name), flexed: true, content: shortcut.name }
    ];
    if (shortcut.shortName) {
      fields.push({ title: i18nString(UIStrings.shortName), flexed: true, content: shortcut.shortName });
    }
    if (shortcut.description) {
      fields.push({ title: i18nString(UIStrings.description), flexed: true, content: shortcut.description });
    }
    fields.push({
      title: i18nString(UIStrings.url),
      flexed: true,
      content: Components.Linkifier.Linkifier.linkifyURL(shortcut.shortcutUrl, { text: shortcut.url, tabStop: true, jslogContext: "shortcut" })
    });
    for (const [title, images] of shortcut.icons) {
      const content = images.filter((icon) => "imageSrc" in icon).map((icon) => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth));
      fields.push({ title, content, flexed: true });
    }
    setSectionContents(fields, shortcutSection);
    shortcutIndex++;
  }
}
function renderScreenshots(reportView, screenshotsSections, data) {
  for (const screenshotSection of screenshotsSections) {
    screenshotSection.detach(
      /** overrideHideOnDetach= */
      true
    );
  }
  screenshotsSections.length = 0;
  let screenshotIndex = 1;
  for (const processedScreenshot of data.screenshots) {
    const { screenshot, processedImage } = processedScreenshot;
    const screenshotSection = reportView.appendSection(i18nString(UIStrings.screenshotS, { PH1: screenshotIndex }));
    screenshotsSections.push(screenshotSection);
    const fields = [];
    if (screenshot.form_factor) {
      fields.push({ title: i18nString(UIStrings.formFactor), flexed: true, content: screenshot.form_factor });
    }
    if (screenshot.label) {
      fields.push({ title: i18nString(UIStrings.label), flexed: true, content: screenshot.label });
    }
    if (screenshot.platform) {
      fields.push({ title: i18nString(UIStrings.platform), flexed: true, content: screenshot.platform });
    }
    if ("imageSrc" in processedImage) {
      const content = renderImage(processedImage.imageSrc, processedImage.imageUrl, processedImage.naturalWidth);
      fields.push({ title: processedImage.title, content, flexed: true });
    }
    setSectionContents(fields, screenshotSection);
    screenshotIndex++;
  }
}
function renderInstallability(installabilitySection, installabilityErrors) {
  installabilitySection.clearContent();
  installabilitySection.element.classList.toggle("hidden", !installabilityErrors.length);
  const errorMessages = getInstallabilityErrorMessages(installabilityErrors);
  setSectionContents(errorMessages.map((content) => ({ content })), installabilitySection);
}
function renderWindowControlsSection(windowControlsSection, data, selectedPlatform, onSelectOs, onToggleWcoToolbar) {
  const { hasWco, url } = data;
  const contents = [];
  if (hasWco) {
    contents.push({ content: html`
      <devtools-icon class="inline-icon" name="check-circle"></devtools-icon>
      ${i18nTemplate(str_, UIStrings.wcoFound, {
      PH1: html`<code class="wco">window-controls-overlay</code>`,
      PH2: html`<code>
          <devtools-link href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                        .jslogContext=${"display-override"}>
            display-override
          </devtools-link>
        </code>`,
      PH3: html`${Components.Linkifier.Linkifier.linkifyURL(url)}`
    })}` });
    if (selectedPlatform && onSelectOs && onToggleWcoToolbar) {
      const controls = renderWindowControls(selectedPlatform, onSelectOs, onToggleWcoToolbar);
      contents.push(controls);
    }
  } else {
    contents.push({ content: html`
      <devtools-icon class="inline-icon" name="info"></devtools-icon>
      ${i18nTemplate(str_, UIStrings.wcoNotFound, {
      PH1: html`<code>
            <devtools-link href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                          .jslogContext=${"display-override"}>
              display-override
          </devtools-link>
        </code>`
    })}` });
  }
  contents.push({ content: i18nTemplate(str_, UIStrings.wcoNeedHelpReadMore, { PH1: html`<devtools-link
      href="https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay"
      .jslogContext=${"customize-pwa-tittle-bar"}>
    ${i18nString(UIStrings.customizePwaTitleBar)}
  </devtools-link>` }) });
  windowControlsSection.clearContent();
  setSectionContents(contents, windowControlsSection);
}
function getInstallabilityErrorMessages(installabilityErrors) {
  const errorMessages = [];
  for (const installabilityError of installabilityErrors) {
    let errorMessage;
    switch (installabilityError.errorId) {
      case "not-in-main-frame":
        errorMessage = i18nString(UIStrings.pageIsNotLoadedInTheMainFrame);
        break;
      case "not-from-secure-origin":
        errorMessage = i18nString(UIStrings.pageIsNotServedFromASecureOrigin);
        break;
      case "no-manifest":
        errorMessage = i18nString(UIStrings.pageHasNoManifestLinkUrl);
        break;
      case "manifest-empty":
        errorMessage = i18nString(UIStrings.manifestCouldNotBeFetchedIsEmpty);
        break;
      case "start-url-not-valid":
        errorMessage = i18nString(UIStrings.manifestStartUrlIsNotValid);
        break;
      case "manifest-missing-name-or-short-name":
        errorMessage = i18nString(UIStrings.manifestDoesNotContainANameOr);
        break;
      case "manifest-display-not-supported":
        errorMessage = i18nString(UIStrings.manifestDisplayPropertyMustBeOne);
        break;
      case "manifest-missing-suitable-icon":
        if (installabilityError.errorArguments.length !== 1 || installabilityError.errorArguments[0].name !== "minimum-icon-size-in-pixels") {
          console.error("Installability error does not have the correct errorArguments");
          break;
        }
        errorMessage = i18nString(UIStrings.manifestDoesNotContainASuitable, { PH1: installabilityError.errorArguments[0].value });
        break;
      case "no-acceptable-icon":
        if (installabilityError.errorArguments.length !== 1 || installabilityError.errorArguments[0].name !== "minimum-icon-size-in-pixels") {
          console.error("Installability error does not have the correct errorArguments");
          break;
        }
        errorMessage = i18nString(UIStrings.noSuppliedIconIsAtLeastSpxSquare, { PH1: installabilityError.errorArguments[0].value });
        break;
      case "cannot-download-icon":
        errorMessage = i18nString(UIStrings.couldNotDownloadARequiredIcon);
        break;
      case "no-icon-available":
        errorMessage = i18nString(UIStrings.downloadedIconWasEmptyOr);
        break;
      case "platform-not-supported-on-android":
        errorMessage = i18nString(UIStrings.theSpecifiedApplicationPlatform);
        break;
      case "no-id-specified":
        errorMessage = i18nString(UIStrings.noPlayStoreIdProvided);
        break;
      case "ids-do-not-match":
        errorMessage = i18nString(UIStrings.thePlayStoreAppUrlAndPlayStoreId);
        break;
      case "already-installed":
        errorMessage = i18nString(UIStrings.theAppIsAlreadyInstalled);
        break;
      case "url-not-supported-for-webapk":
        errorMessage = i18nString(UIStrings.aUrlInTheManifestContainsA);
        break;
      case "in-incognito":
        errorMessage = i18nString(UIStrings.pageIsLoadedInAnIncognitoWindow);
        break;
      case "not-offline-capable":
        errorMessage = i18nString(UIStrings.pageDoesNotWorkOffline);
        break;
      case "no-url-for-service-worker":
        errorMessage = i18nString(UIStrings.couldNotCheckServiceWorker);
        break;
      case "prefer-related-applications":
        errorMessage = i18nString(UIStrings.manifestSpecifies);
        break;
      case "prefer-related-applications-only-beta-stable":
        errorMessage = i18nString(UIStrings.preferrelatedapplicationsIsOnly);
        break;
      case "manifest-display-override-not-supported":
        errorMessage = i18nString(UIStrings.manifestContainsDisplayoverride);
        break;
      case "warn-not-offline-capable":
        errorMessage = i18nString(UIStrings.pageDoesNotWorkOfflineThePage, { PH1: "https://developer.chrome.com/blog/improved-pwa-offline-detection/" });
        break;
      default:
        console.error(`Installability error id '${installabilityError.errorId}' is not recognized`);
        break;
    }
    if (errorMessage) {
      errorMessages.push(errorMessage);
    }
  }
  return errorMessages;
}
function renderWindowControls(selectedPlatform, onSelectOs, onToggleWcoToolbar) {
  return { content: html`
      <devtools-checkbox @click=${(event) => onToggleWcoToolbar(event.target.checked)}
          title=${i18nString(UIStrings.selectWindowControlsOverlayEmulationOs)}>
        ${i18nString(UIStrings.selectWindowControlsOverlayEmulationOs)}
      </devtools-checkbox>
      <select value=${selectedPlatform}
              @change=${(event) => {
    const target = event.target;
    const selectedOS = target.options[target.selectedIndex].value;
    void onSelectOs(selectedOS);
  }}
             .selectedIndex=${0}>
        <option value=${"Windows"}
                jslog=${VisualLogging.item("windows").track({ click: true })}>
          Windows
        </option>
        <option value=${"Mac"}
                jslog=${VisualLogging.item("macos").track({ click: true })}>
          macOS
        </option>
        <option value=${"Linux"}
                jslog=${VisualLogging.item("linux").track({ click: true })}>
          Linux
        </option>
      </select>` };
}
function setSectionContents(items, section9) {
  for (const item2 of items) {
    if (!item2.title) {
      render(item2.content, section9.appendRow());
      continue;
    }
    const element = item2.flexed ? section9.appendFlexedField(item2.title) : section9.appendField(item2.title);
    if (item2.label) {
      UI2.ARIAUtils.setLabel(element, item2.label);
    }
    render(item2.content, element);
  }
}
var DEFAULT_VIEW = (input, _output, _target) => {
  const { reportView, errorsSection, installabilitySection, identitySection, presentationSection, protocolHandlersView, iconsSection, windowControlsSection, shortcutSections, screenshotsSections, identityData, presentationData, protocolHandlersData, iconsData, shortcutsData, screenshotsData, installabilityErrors, warnings, errors, imageErrors, windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar } = input;
  if (identitySection && identityData) {
    renderIdentity(identitySection, identityData);
  }
  if (presentationSection && presentationData) {
    renderPresentation(presentationSection, presentationData);
  }
  if (protocolHandlersView && protocolHandlersData) {
    renderProtocolHandlers(protocolHandlersView, protocolHandlersData);
  }
  if (iconsSection && iconsData) {
    renderIcons(iconsSection, iconsData);
  }
  if (shortcutSections && shortcutsData) {
    renderShortcuts(reportView, shortcutSections, shortcutsData);
  }
  if (screenshotsSections && screenshotsData) {
    renderScreenshots(reportView, screenshotsSections, screenshotsData);
  }
  if (installabilitySection && installabilityErrors) {
    renderInstallability(installabilitySection, installabilityErrors);
  }
  if (windowControlsSection && windowControlsData) {
    renderWindowControlsSection(windowControlsSection, windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar);
  }
  if (errorsSection) {
    renderErrors(errorsSection, warnings, errors, imageErrors);
  }
};
var AppManifestView = class extends Common2.ObjectWrapper.eventMixin(UI2.Widget.VBox) {
  emptyView;
  reportView;
  errorsSection;
  installabilitySection;
  identitySection;
  presentationSection;
  iconsSection;
  windowControlsSection;
  protocolHandlersSection;
  shortcutSections;
  screenshotsSections;
  registeredListeners;
  target;
  resourceTreeModel;
  serviceWorkerManager;
  overlayModel;
  protocolHandlersView;
  manifestUrl;
  manifestData;
  manifestErrors;
  installabilityErrors;
  appIdResponse;
  wcoToolbarEnabled = false;
  view;
  constructor(view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.pane("manifest")}`,
      useShadowDom: true
    });
    this.view = view;
    this.registerRequiredCSS(appManifestView_css_default);
    this.contentElement.classList.add("manifest-container");
    this.emptyView = new UI2.EmptyWidget.EmptyWidget(i18nString(UIStrings.noManifestDetected), i18nString(UIStrings.manifestDescription));
    this.emptyView.link = "https://web.dev/add-manifest/";
    this.emptyView.show(this.contentElement);
    this.emptyView.hideWidget();
    this.reportView = new UI2.ReportView.ReportView(i18nString(UIStrings.appManifest));
    this.reportView.registerRequiredCSS(appManifestView_css_default);
    this.reportView.element.classList.add("manifest-view-header");
    this.reportView.show(this.contentElement);
    this.reportView.hideWidget();
    this.errorsSection = this.reportView.appendSection(i18nString(UIStrings.errorsAndWarnings), void 0, "errors-and-warnings");
    this.installabilitySection = this.reportView.appendSection(i18nString(UIStrings.installability), void 0, "installability");
    this.identitySection = this.reportView.appendSection(i18nString(UIStrings.identity), "undefined,identity");
    this.presentationSection = this.reportView.appendSection(i18nString(UIStrings.presentation), "undefined,presentation");
    this.protocolHandlersSection = this.reportView.appendSection(i18nString(UIStrings.protocolHandlers), "undefined,protocol-handlers");
    this.protocolHandlersView = new ApplicationComponents.ProtocolHandlersView.ProtocolHandlersView();
    this.protocolHandlersView.show(this.protocolHandlersSection.getFieldElement());
    this.iconsSection = this.reportView.appendSection(i18nString(UIStrings.icons), "report-section-icons", "icons");
    this.windowControlsSection = this.reportView.appendSection(UIStrings.windowControlsOverlay, void 0, "window-controls-overlay");
    this.shortcutSections = [];
    this.screenshotsSections = [];
    SDK.TargetManager.TargetManager.instance().observeTargets(this);
    this.registeredListeners = [];
    this.manifestUrl = Platform.DevToolsPath.EmptyUrlString;
    this.manifestData = null;
    this.manifestErrors = [];
    this.installabilityErrors = [];
    this.appIdResponse = null;
  }
  getStaticSections() {
    return [
      this.identitySection,
      this.presentationSection,
      this.protocolHandlersSection,
      this.iconsSection,
      this.windowControlsSection
    ];
  }
  getManifestElement() {
    return this.reportView.getHeaderElement();
  }
  targetAdded(target) {
    if (target !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.target = target;
    this.resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    this.serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    this.overlayModel = target.model(SDK.OverlayModel.OverlayModel);
    if (!this.resourceTreeModel || !this.serviceWorkerManager || !this.overlayModel) {
      return;
    }
    void this.updateManifest(true);
    this.registeredListeners = [
      this.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.DOMContentLoaded, () => {
        void this.updateManifest(true);
      }),
      this.serviceWorkerManager.addEventListener("RegistrationUpdated", () => {
        void this.updateManifest(false);
      })
    ];
  }
  targetRemoved(target) {
    if (this.target !== target) {
      return;
    }
    if (!this.resourceTreeModel || !this.serviceWorkerManager || !this.overlayModel) {
      return;
    }
    delete this.resourceTreeModel;
    delete this.serviceWorkerManager;
    delete this.overlayModel;
    Common2.EventTarget.removeEventListeners(this.registeredListeners);
  }
  async updateManifest(immediately) {
    if (!this.resourceTreeModel) {
      return;
    }
    const [{ url, data, errors }, installabilityErrors, appId] = await Promise.all([
      this.resourceTreeModel.fetchAppManifest(),
      this.resourceTreeModel.getInstallabilityErrors(),
      this.resourceTreeModel.getAppId()
    ]);
    this.manifestUrl = url;
    this.manifestData = data;
    this.manifestErrors = errors;
    this.installabilityErrors = installabilityErrors;
    this.appIdResponse = appId;
    if (immediately) {
      await this.performUpdate();
    } else {
      await this.requestUpdate();
    }
  }
  async performUpdate() {
    const url = this.manifestUrl;
    let data = this.manifestData;
    const errors = this.manifestErrors;
    const installabilityErrors = this.installabilityErrors;
    const appIdResponse = this.appIdResponse;
    const appId = appIdResponse?.appId || null;
    const recommendedId = appIdResponse?.recommendedId || null;
    if ((!data || data === "{}") && !errors.length) {
      this.emptyView.showWidget();
      this.reportView.hideWidget();
      this.view({ emptyView: this.emptyView, reportView: this.reportView }, void 0, this.contentElement);
      this.dispatchEventToListeners("ManifestDetected", false);
      return;
    }
    this.emptyView.hideWidget();
    this.reportView.showWidget();
    this.dispatchEventToListeners("ManifestDetected", true);
    const link4 = Components.Linkifier.Linkifier.linkifyURL(url, { tabStop: true });
    this.reportView.setURL(link4);
    if (!data) {
      this.view({ emptyView: this.emptyView, reportView: this.reportView, errorsSection: this.errorsSection, errors }, void 0, this.contentElement);
      return;
    }
    if (data.charCodeAt(0) === 65279) {
      data = data.slice(1);
    }
    const parsedManifest = JSON.parse(data);
    const identityData = this.processIdentity(parsedManifest, appId, recommendedId);
    const presentationData = this.processPresentation(parsedManifest, url);
    const protocolHandlersData = this.processProtocolHandlers(parsedManifest, url);
    const iconsData = await this.processIcons(parsedManifest, url);
    const shortcutsData = await this.processShortcuts(parsedManifest, url);
    const screenshotsData = await this.processScreenshots(parsedManifest, url);
    const warnings = [
      ...identityData.warnings,
      ...shortcutsData.warnings,
      ...screenshotsData.warnings
    ];
    const imageErrors = [
      ...iconsData.imageResourceErrors,
      ...shortcutsData.imageResourceErrors,
      ...screenshotsData.imageResourceErrors
    ];
    const windowControlsData = await this.processWindowControls(parsedManifest, url);
    const selectedPlatform = this.overlayModel?.getWindowControlsConfig().selectedPlatform;
    const onSelectOs = this.overlayModel ? (selectedOS) => this.onSelectOs(selectedOS, windowControlsData.themeColor) : void 0;
    const onToggleWcoToolbar = this.overlayModel ? (enabled) => this.onToggleWcoToolbar(enabled) : void 0;
    this.view({
      emptyView: this.emptyView,
      reportView: this.reportView,
      errorsSection: this.errorsSection,
      installabilitySection: this.installabilitySection,
      identitySection: this.identitySection,
      presentationSection: this.presentationSection,
      protocolHandlersView: this.protocolHandlersView,
      iconsSection: this.iconsSection,
      windowControlsSection: this.windowControlsSection,
      shortcutSections: this.shortcutSections,
      screenshotsSections: this.screenshotsSections,
      parsedManifest,
      url,
      identityData,
      presentationData,
      protocolHandlersData,
      iconsData,
      shortcutsData,
      screenshotsData,
      installabilityErrors,
      warnings,
      errors,
      imageErrors,
      windowControlsData,
      selectedPlatform,
      onSelectOs,
      onToggleWcoToolbar
    }, void 0, this.contentElement);
  }
  stringProperty(parsedManifest, name) {
    const value = parsedManifest[name];
    if (typeof value !== "string") {
      return "";
    }
    return value;
  }
  async loadImage(url) {
    const frameId = this.resourceTreeModel?.mainFrame?.id;
    if (!this.target) {
      throw new Error("no target");
    }
    if (!frameId) {
      throw new Error("no main frame found");
    }
    const { content } = await SDK.PageResourceLoader.PageResourceLoader.instance().loadResource(
      url,
      {
        target: this.target,
        frameId,
        initiatorUrl: this.target.inspectedURL()
      },
      /* isBinary=*/
      true
    );
    const image = document.createElement("img");
    const result = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = "data:application/octet-stream;base64," + await Common2.Base64.encode(content);
    try {
      await result;
      return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, src: image.src };
    } catch {
    }
    return null;
  }
  parseSizes(sizes, resourceName, imageUrl, imageResourceErrors) {
    const rawSizeArray = sizes ? sizes.split(/\s+/) : [];
    const parsedSizes = [];
    for (const size of rawSizeArray) {
      if (size === "any") {
        if (!parsedSizes.find((x) => "any" in x)) {
          parsedSizes.push({ any: "any", formatted: "any" });
        }
        continue;
      }
      const match = size.match(/^(?<width>\d+)[xX](?<height>\d+)$/);
      if (match) {
        const width = parseInt(match.groups?.width || "", 10);
        const height = parseInt(match.groups?.height || "", 10);
        const formatted = `${width}\xD7${height}px`;
        parsedSizes.push({ width, height, formatted });
      } else {
        imageResourceErrors.push(i18nString(UIStrings.sSShouldSpecifyItsSizeAs, { PH1: resourceName, PH2: imageUrl }));
      }
    }
    return parsedSizes;
  }
  checkSizeProblem(size, naturalWidth, naturalHeight, resourceName, imageUrl) {
    if ("any" in size) {
      return { hasSquareSize: naturalWidth === naturalHeight };
    }
    const hasSquareSize = size.width === size.height;
    if (naturalWidth !== size.width && naturalHeight !== size.height) {
      return {
        error: i18nString(UIStrings.actualSizeSspxOfSSDoesNotMatch, {
          PH1: naturalWidth,
          PH2: naturalHeight,
          PH3: resourceName,
          PH4: imageUrl,
          PH5: size.width,
          PH6: size.height
        }),
        hasSquareSize
      };
    }
    if (naturalWidth !== size.width) {
      return {
        error: i18nString(UIStrings.actualWidthSpxOfSSDoesNotMatch, { PH1: naturalWidth, PH2: resourceName, PH3: imageUrl, PH4: size.width }),
        hasSquareSize
      };
    }
    if (naturalHeight !== size.height) {
      return {
        error: i18nString(UIStrings.actualHeightSpxOfSSDoesNotMatch, { PH1: naturalHeight, PH2: resourceName, PH3: imageUrl, PH4: size.height }),
        hasSquareSize
      };
    }
    return { hasSquareSize };
  }
  async processImageResource(baseUrl, imageResource, isScreenshot) {
    const imageResourceErrors = [];
    const resourceName = isScreenshot ? i18nString(UIStrings.screenshot) : i18nString(UIStrings.icon);
    if (!imageResource.src) {
      imageResourceErrors.push(i18nString(UIStrings.sSrcIsNotSet, { PH1: resourceName }));
      return { imageResourceErrors };
    }
    const imageUrl = Common2.ParsedURL.ParsedURL.completeURL(baseUrl, imageResource["src"]);
    if (!imageUrl) {
      imageResourceErrors.push(i18nString(UIStrings.sUrlSFailedToParse, { PH1: resourceName, PH2: imageResource["src"] }));
      return { imageResourceErrors, imageUrl: imageResource["src"] };
    }
    const result = await this.loadImage(imageUrl);
    if (!result) {
      imageResourceErrors.push(i18nString(UIStrings.sSFailedToLoad, { PH1: resourceName, PH2: imageUrl }));
      return { imageResourceErrors, imageUrl };
    }
    const { src, naturalWidth, naturalHeight } = result;
    const sizes = this.parseSizes(imageResource["sizes"], resourceName, imageUrl, imageResourceErrors);
    const title = sizes.map((x) => x.formatted).join(" ") + "\n" + (imageResource["type"] || "");
    let squareSizedIconAvailable = false;
    if (!imageResource.sizes) {
      imageResourceErrors.push(i18nString(UIStrings.sSDoesNotSpecifyItsSizeInThe, { PH1: resourceName, PH2: imageUrl }));
    } else {
      if (isScreenshot && sizes.length > 0 && "any" in sizes[0]) {
        imageResourceErrors.push(i18nString(UIStrings.screenshotPixelSize, { url: imageUrl }));
      }
      for (const size of sizes) {
        const { error, hasSquareSize } = this.checkSizeProblem(size, naturalWidth, naturalHeight, resourceName, imageUrl);
        squareSizedIconAvailable = squareSizedIconAvailable || hasSquareSize;
        if (error) {
          imageResourceErrors.push(error);
        } else if (isScreenshot) {
          const width = "any" in size ? naturalWidth : size.width;
          const height = "any" in size ? naturalHeight : size.height;
          if (width < 320 || height < 320) {
            imageResourceErrors.push(i18nString(UIStrings.sSSizeShouldBeAtLeast320, { PH1: resourceName, PH2: imageUrl }));
          } else if (width > 3840 || height > 3840) {
            imageResourceErrors.push(i18nString(UIStrings.sSSizeShouldBeAtMost3840, { PH1: resourceName, PH2: imageUrl }));
          } else if (width > height * 2.3) {
            imageResourceErrors.push(i18nString(UIStrings.sSWidthDoesNotComplyWithRatioRequirement, { PH1: resourceName, PH2: imageUrl }));
          } else if (height > width * 2.3) {
            imageResourceErrors.push(i18nString(UIStrings.sSHeightDoesNotComplyWithRatioRequirement, { PH1: resourceName, PH2: imageUrl }));
          }
        }
      }
    }
    const purpose = typeof imageResource["purpose"] === "string" ? imageResource["purpose"].toLowerCase() : "";
    if (purpose.includes("any") && purpose.includes("maskable")) {
      imageResourceErrors.push(i18nString(UIStrings.avoidPurposeAnyAndMaskable));
    }
    return {
      imageResourceErrors,
      squareSizedIconAvailable,
      naturalWidth,
      naturalHeight,
      title,
      imageSrc: src,
      imageUrl
    };
  }
  async onToggleWcoToolbar(enabled) {
    this.wcoToolbarEnabled = enabled;
    if (this.overlayModel) {
      await this.overlayModel.toggleWindowControlsToolbar(this.wcoToolbarEnabled);
    }
  }
  async onSelectOs(selectedOS, themeColor) {
    if (this.overlayModel) {
      this.overlayModel.setWindowControlsPlatform(selectedOS);
      this.overlayModel.setWindowControlsThemeColor(themeColor);
      await this.overlayModel.toggleWindowControlsToolbar(this.wcoToolbarEnabled);
    }
  }
  processIdentity(parsedManifest, appId, recommendedId) {
    const description = this.stringProperty(parsedManifest, "description");
    const warnings = [];
    if (description.length > 300) {
      warnings.push(i18nString(UIStrings.descriptionMayBeTruncated));
    }
    return {
      name: this.stringProperty(parsedManifest, "name"),
      shortName: this.stringProperty(parsedManifest, "short_name"),
      description: this.stringProperty(parsedManifest, "description"),
      appId,
      recommendedId,
      hasId: Boolean(this.stringProperty(parsedManifest, "id")),
      warnings
    };
  }
  async processIcons(parsedManifest, url) {
    const icons = parsedManifest["icons"] || [];
    const imageErrors = [];
    const processedIcons = [];
    let squareSizedIconAvailable = false;
    for (const icon of icons) {
      const result = await this.processImageResource(
        url,
        icon,
        /** isScreenshot= */
        false
      );
      processedIcons.push(result);
      imageErrors.push(...result.imageResourceErrors);
      if (result.squareSizedIconAvailable) {
        squareSizedIconAvailable = true;
      }
    }
    const processedIconsByTitle = Map.groupBy(processedIcons.filter((icon) => "title" in icon), (img) => img.title);
    if (!squareSizedIconAvailable) {
      imageErrors.push(i18nString(UIStrings.sSShouldHaveSquareIcon));
    }
    return { icons: processedIconsByTitle, imageResourceErrors: imageErrors };
  }
  async processShortcuts(parsedManifest, url) {
    const shortcuts = parsedManifest["shortcuts"] || [];
    const processedShortcuts = [];
    const warnings = [];
    const imageErrors = [];
    if (shortcuts.length > 4) {
      warnings.push(i18nString(UIStrings.shortcutsMayBeNotAvailable));
    }
    let shortcutIndex = 1;
    for (const shortcut of shortcuts) {
      const shortcutUrl = Common2.ParsedURL.ParsedURL.completeURL(url, shortcut.url);
      const shortcutIcons = shortcut.icons || [];
      const processedIcons = [];
      let hasShortcutIconLargeEnough = false;
      for (const shortcutIcon of shortcutIcons) {
        const result = await this.processImageResource(
          url,
          shortcutIcon,
          /** isScreenshot= */
          false
        );
        processedIcons.push(result);
        imageErrors.push(...result.imageResourceErrors);
        if (!hasShortcutIconLargeEnough && shortcutIcon.sizes) {
          const shortcutIconSize = shortcutIcon.sizes.match(/^(\d+)x(\d+)$/);
          if (shortcutIconSize && Number(shortcutIconSize[1]) >= 96 && Number(shortcutIconSize[2]) >= 96) {
            hasShortcutIconLargeEnough = true;
          }
        }
      }
      const iconsByTitle = Map.groupBy(processedIcons.filter((icon) => "title" in icon), (img) => img.title);
      processedShortcuts.push({
        name: shortcut.name,
        shortName: shortcut.short_name,
        description: shortcut.description,
        url: shortcut.url,
        shortcutUrl,
        icons: iconsByTitle
      });
      if (!hasShortcutIconLargeEnough) {
        imageErrors.push(i18nString(UIStrings.shortcutSShouldIncludeAXPixel, { PH1: shortcutIndex }));
      }
      shortcutIndex++;
    }
    return { shortcuts: processedShortcuts, warnings, imageResourceErrors: imageErrors };
  }
  async processScreenshots(parsedManifest, url) {
    const screenshots = parsedManifest["screenshots"] || [];
    const processedScreenshots = [];
    const warnings = [];
    const imageErrors = [];
    let haveScreenshotsDifferentAspectRatio = false;
    const formFactorScreenshotDimensions = /* @__PURE__ */ new Map();
    for (const screenshot of screenshots) {
      const result = await this.processImageResource(
        url,
        screenshot,
        /** isScreenshot= */
        true
      );
      processedScreenshots.push({ screenshot, processedImage: result });
      imageErrors.push(...result.imageResourceErrors);
      if (screenshot.form_factor && "naturalWidth" in result) {
        const width = result.naturalWidth;
        const height = result.naturalHeight;
        formFactorScreenshotDimensions.has(screenshot.form_factor) || formFactorScreenshotDimensions.set(screenshot.form_factor, { width, height });
        const formFactorFirstScreenshotDimensions = formFactorScreenshotDimensions.get(screenshot.form_factor);
        if (formFactorFirstScreenshotDimensions) {
          haveScreenshotsDifferentAspectRatio = haveScreenshotsDifferentAspectRatio || width * formFactorFirstScreenshotDimensions.height !== height * formFactorFirstScreenshotDimensions.width;
        }
      }
    }
    if (haveScreenshotsDifferentAspectRatio) {
      warnings.push(i18nString(UIStrings.screenshotsMustHaveSameAspectRatio));
    }
    const screenshotsForDesktop = screenshots.filter((screenshot) => screenshot.form_factor === "wide");
    const screenshotsForMobile = screenshots.filter((screenshot) => screenshot.form_factor !== "wide");
    if (screenshotsForDesktop.length < 1) {
      warnings.push(i18nString(UIStrings.noScreenshotsForRicherPWAInstallOnDesktop));
    }
    if (screenshotsForMobile.length < 1) {
      warnings.push(i18nString(UIStrings.noScreenshotsForRicherPWAInstallOnMobile));
    }
    if (screenshotsForDesktop.length > 8) {
      warnings.push(i18nString(UIStrings.tooManyScreenshotsForDesktop));
    }
    if (screenshotsForMobile.length > 5) {
      warnings.push(i18nString(UIStrings.tooManyScreenshotsForMobile));
    }
    return { screenshots: processedScreenshots, warnings, imageResourceErrors: imageErrors };
  }
  async processWindowControls(parsedManifest, url) {
    const displayOverride = parsedManifest["display_override"] || [];
    const hasWco = displayOverride.includes("window-controls-overlay");
    const themeColor = this.stringProperty(parsedManifest, "theme_color");
    let wcoStyleSheetText = false;
    if (this.overlayModel) {
      wcoStyleSheetText = await this.overlayModel.hasStyleSheetText(url);
    }
    return {
      hasWco,
      themeColor,
      wcoStyleSheetText,
      url
    };
  }
  processPresentation(parsedManifest, url) {
    const startURL = this.stringProperty(parsedManifest, "start_url");
    const completeURL = startURL ? Common2.ParsedURL.ParsedURL.completeURL(url, startURL) : null;
    const themeColorString = this.stringProperty(parsedManifest, "theme_color");
    const themeColor = themeColorString ? Common2.Color.parse(themeColorString) ?? Common2.Color.parse("white") : null;
    const backgroundColorString = this.stringProperty(parsedManifest, "background_color");
    const backgroundColor = backgroundColorString ? Common2.Color.parse(backgroundColorString) ?? Common2.Color.parse("white") : null;
    const noteTaking = parsedManifest["note_taking"] || {};
    const newNoteUrl = noteTaking["new_note_url"];
    const hasNewNoteUrl = typeof newNoteUrl === "string";
    const completeNewNoteUrl = hasNewNoteUrl ? Common2.ParsedURL.ParsedURL.completeURL(url, newNoteUrl) : null;
    return {
      startUrl: startURL,
      completeStartUrl: completeURL,
      themeColor,
      backgroundColor,
      orientation: this.stringProperty(parsedManifest, "orientation"),
      display: this.stringProperty(parsedManifest, "display"),
      newNoteUrl,
      hasNewNoteUrl,
      completeNewNoteUrl
    };
  }
  processProtocolHandlers(parsedManifest, url) {
    return {
      protocolHandlers: parsedManifest["protocol_handlers"] || [],
      manifestLink: url
    };
  }
};

// gen/front_end/panels/application/BackForwardCacheTreeElement.js
import * as Host2 from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import { createIcon } from "./../../ui/kit/kit.js";
import * as ApplicationComponents2 from "./components/components.js";
var UIStrings2 = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  backForwardCache: "Back/forward cache"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/application/BackForwardCacheTreeElement.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var BackForwardCacheTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(resourcesPanel) {
    super(resourcesPanel, i18nString2(UIStrings2.backForwardCache), false, "bfcache");
    const icon = createIcon("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "bfcache://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ApplicationComponents2.BackForwardCacheView.BackForwardCacheView();
    }
    this.showView(this.view);
    Host2.userMetrics.panelShown("back-forward-cache");
    return false;
  }
};

// gen/front_end/panels/application/BackgroundServiceModel.js
var BackgroundServiceModel_exports = {};
__export(BackgroundServiceModel_exports, {
  BackgroundServiceModel: () => BackgroundServiceModel,
  Events: () => Events
});
import * as SDK2 from "./../../core/sdk/sdk.js";
var BackgroundServiceModel = class extends SDK2.SDKModel.SDKModel {
  backgroundServiceAgent;
  events;
  constructor(target) {
    super(target);
    this.backgroundServiceAgent = target.backgroundServiceAgent();
    target.registerBackgroundServiceDispatcher(this);
    this.events = /* @__PURE__ */ new Map();
  }
  enable(service) {
    this.events.set(service, []);
    void this.backgroundServiceAgent.invoke_startObserving({ service });
  }
  setRecording(shouldRecord, service) {
    void this.backgroundServiceAgent.invoke_setRecording({ shouldRecord, service });
  }
  clearEvents(service) {
    this.events.set(service, []);
    void this.backgroundServiceAgent.invoke_clearEvents({ service });
  }
  getEvents(service) {
    return this.events.get(service) || [];
  }
  recordingStateChanged({ isRecording, service }) {
    this.dispatchEventToListeners(Events.RecordingStateChanged, { isRecording, serviceName: service });
  }
  backgroundServiceEventReceived({ backgroundServiceEvent }) {
    this.events.get(backgroundServiceEvent.service).push(backgroundServiceEvent);
    this.dispatchEventToListeners(Events.BackgroundServiceEventReceived, backgroundServiceEvent);
  }
};
SDK2.SDKModel.SDKModel.register(BackgroundServiceModel, { capabilities: 1, autostart: false });
var Events;
(function(Events3) {
  Events3["RecordingStateChanged"] = "RecordingStateChanged";
  Events3["BackgroundServiceEventReceived"] = "BackgroundServiceEventReceived";
})(Events || (Events = {}));

// gen/front_end/panels/application/BackgroundServiceView.js
var BackgroundServiceView_exports = {};
__export(BackgroundServiceView_exports, {
  ActionDelegate: () => ActionDelegate,
  BackgroundServiceView: () => BackgroundServiceView,
  EventDataNode: () => EventDataNode
});
import "./../../ui/legacy/legacy.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as DataGrid from "./../../ui/legacy/components/data_grid/data_grid.js";

// gen/front_end/ui/legacy/emptyWidget.css.js
var emptyWidget_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.empty-view-scroller {
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./emptyWidget.css")} */`;

// gen/front_end/panels/application/BackgroundServiceView.js
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/backgroundServiceView.css.js
var backgroundServiceView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.background-service-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

.data-grid {
  flex: auto;
  border: none;
}

[slot="insertion-point-main"] {
  overflow: auto;
}

.background-service-preview {
  position: absolute;
  background-color: var(--sys-color-cdt-base-container);
  justify-content: center;
  align-items: center;
  overflow: auto;
  font-size: 13px;
  color: var(--sys-color-on-surface-subtle);
}

.background-service-preview > div {
  max-width: 450px;
  margin: 10px;
  text-align: center;
}

.background-service-preview > div > p {
  flex: none;
  white-space: pre-line;
}

.background-service-shortcut {
  color: var(--sys-color-on-surface-subtle);
}

.background-service-metadata {
  padding-left: 5px;
  padding-top: 10px;
}

.background-service-metadata-entry {
  padding-left: 10px;
  padding-bottom: 5px;
}

.background-service-metadata-name {
  color: var(--sys-color-on-surface-subtle);
  display: inline-block;
  margin-right: 0.25em;
  font-weight: bold;
}

.background-service-metadata-value {
  display: inline;
  margin-right: 1em;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
}

.background-service-empty-value {
  color: var(--sys-color-state-disabled);
  font-style: italic;
}

.background-service-record-inline-button {
  margin-bottom: 6px;
}

/*# sourceURL=${import.meta.resolve("./backgroundServiceView.css")} */`;

// gen/front_end/panels/application/BackgroundServiceView.js
var UIStrings3 = {
  /**
   * @description Text in Background Service View of the Application panel
   */
  backgroundFetch: "Background fetch",
  /**
   * @description Text in Background Service View of the Application panel
   */
  backgroundSync: "Background sync",
  /**
   * @description Text in Background Service View of the Application panel
   */
  pushMessaging: "Push messaging",
  /**
   * @description Text in Background Service View of the Application panel
   */
  notifications: "Notifications",
  /**
   * @description Text in Background Service View of the Application panel
   */
  paymentHandler: "Payment handler",
  /**
   * @description Text in the Periodic Background Service View of the Application panel
   */
  periodicBackgroundSync: "Periodic background sync",
  /**
   * @description Text to clear content
   */
  clear: "Clear",
  /**
   * @description Tooltip text that appears when hovering over the largeicon download button in the Background Service View of the Application panel
   */
  saveEvents: "Save events",
  /**
   * @description Text in Background Service View of the Application panel
   */
  showEventsFromOtherDomains: "Show events from other domains",
  /**
   * @description Text of a checkbox to show events for other storage keys
   */
  showEventsForOtherStorageKeys: "Show events from other storage partitions",
  /**
   * @description Title of an action under the Background Services category that can be invoked through the Command Menu
   */
  stopRecordingEvents: "Stop recording events",
  /**
   * @description Title of an action under the Background Services category that can be invoked through the Command Menu
   */
  startRecordingEvents: "Start recording events",
  /**
   * @description Text for timestamps of items
   */
  timestamp: "Timestamp",
  /**
   * @description Text that refers to some events
   */
  event: "Event",
  /**
   * @description Text for the origin of something
   */
  origin: "Origin",
  /**
   * @description Text for the storage key of something
   */
  storageKey: "Storage Key",
  /**
   * @description Text in Background Service View of the Application panel. The Scope is a URL associated with the Service Worker, which limits which pages/sites the Service Worker operates on.
   */
  swScope: "Service Worker Scope",
  /**
   * @description Text in Background Service View of the Application panel
   */
  instanceId: "Instance ID",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  backgroundServices: "Background services",
  /**
   * @description Text in Background Service View of the Application panel.
   *             An event here refers to a background service event that is an entry in a table.
   */
  noEventSelected: "No event selected",
  /**
   * @description Text in Background Service View of the Application panel
   */
  selectAnEventToViewMetadata: "Select an event to view its metadata",
  /**
   * @description Text in Background Service View of the Application panel
   * @example {Background Fetch} PH1
   */
  recordingSActivity: "Recording {PH1} activity\u2026",
  /**
   * @description Text in Background Service View of the Application panel
   */
  noRecording: "No recording yet",
  /**
   * @description Inform users that DevTools are recording/waiting for events in the Periodic Background Sync tool of the Application panel
   * @example {Background Fetch} PH1
   */
  devtoolsWillRecordAllSActivity: "DevTools will record all {PH1} activity for up to 3 days, even when closed.",
  /**
   * @description Text in Background Service View of the Application panel to instruct the user on how to start a recording for
   * background services.
   * @example {Start recording events} PH1
   * @example {Ctrl + E} PH2
   */
  startRecordingToDebug: 'Start to debug background services by using the "{PH1}" button or by pressing {PH2}.',
  /**
   * @description Text to show an item is empty
   */
  empty: "empty",
  /**
   * @description Text in Background Service View of the Application panel
   */
  noMetadataForThisEvent: "No metadata for this event"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/application/BackgroundServiceView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var BackgroundServiceView = class _BackgroundServiceView extends UI3.Widget.VBox {
  serviceName;
  model;
  serviceWorkerManager;
  securityOriginManager;
  storageKeyManager;
  recordAction;
  recordButton;
  originCheckbox;
  storageKeyCheckbox;
  saveButton;
  toolbar;
  splitWidget;
  dataGrid;
  previewPanel;
  selectedEventNode;
  preview;
  static getUIString(serviceName) {
    switch (serviceName) {
      case "backgroundFetch":
        return i18nString3(UIStrings3.backgroundFetch);
      case "backgroundSync":
        return i18nString3(UIStrings3.backgroundSync);
      case "pushMessaging":
        return i18nString3(UIStrings3.pushMessaging);
      case "notifications":
        return i18nString3(UIStrings3.notifications);
      case "paymentHandler":
        return i18nString3(UIStrings3.paymentHandler);
      case "periodicBackgroundSync":
        return i18nString3(UIStrings3.periodicBackgroundSync);
      default:
        return "";
    }
  }
  constructor(serviceName, model) {
    super({
      jslog: `${VisualLogging2.pane().context(Platform2.StringUtilities.toKebabCase(serviceName))}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(emptyWidget_css_default, backgroundServiceView_css_default);
    this.serviceName = serviceName;
    this.model = model;
    this.model.addEventListener(Events.RecordingStateChanged, this.onRecordingStateChanged, this);
    this.model.addEventListener(Events.BackgroundServiceEventReceived, this.onEventReceived, this);
    this.model.enable(this.serviceName);
    this.serviceWorkerManager = this.model.target().model(SDK3.ServiceWorkerManager.ServiceWorkerManager);
    this.securityOriginManager = this.model.target().model(SDK3.SecurityOriginManager.SecurityOriginManager);
    if (!this.securityOriginManager) {
      throw new Error("SecurityOriginManager instance is missing");
    }
    this.securityOriginManager.addEventListener(SDK3.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this.onOriginChanged());
    this.storageKeyManager = this.model.target().model(SDK3.StorageKeyManager.StorageKeyManager);
    if (!this.storageKeyManager) {
      throw new Error("StorageKeyManager instance is missing");
    }
    this.storageKeyManager.addEventListener("MainStorageKeyChanged", () => this.onStorageKeyChanged());
    this.recordAction = UI3.ActionRegistry.ActionRegistry.instance().getAction("background-service.toggle-recording");
    this.toolbar = this.contentElement.createChild("devtools-toolbar", "background-service-toolbar");
    this.toolbar.setAttribute("jslog", `${VisualLogging2.toolbar()}`);
    void this.setupToolbar();
    this.splitWidget = new UI3.SplitWidget.SplitWidget(
      /* isVertical= */
      false,
      /* secondIsSidebar= */
      true
    );
    this.splitWidget.show(this.contentElement);
    this.dataGrid = this.createDataGrid();
    this.previewPanel = new UI3.Widget.VBox();
    this.previewPanel.element.setAttribute("jslog", `${VisualLogging2.pane("preview").track({ resize: true })}`);
    this.selectedEventNode = null;
    this.preview = null;
    this.splitWidget.setMainWidget(this.dataGrid.asWidget());
    this.splitWidget.setSidebarWidget(this.previewPanel);
    this.splitWidget.hideMain();
    this.showPreview(null);
  }
  getDataGrid() {
    return this.dataGrid;
  }
  /**
   * Creates the toolbar UI element.
   */
  async setupToolbar() {
    this.toolbar.wrappable = true;
    this.recordButton = UI3.Toolbar.Toolbar.createActionButton(this.recordAction);
    this.recordButton.toggleOnClick(false);
    this.toolbar.appendToolbarItem(this.recordButton);
    const clearButton = new UI3.Toolbar.ToolbarButton(i18nString3(UIStrings3.clear), "clear", void 0, "background-service.clear");
    clearButton.addEventListener("Click", () => this.clearEvents());
    this.toolbar.appendToolbarItem(clearButton);
    this.toolbar.appendSeparator();
    this.saveButton = new UI3.Toolbar.ToolbarButton(i18nString3(UIStrings3.saveEvents), "download", void 0, "background-service.save-events");
    this.saveButton.addEventListener("Click", (_event) => {
      void this.saveToFile();
    });
    this.saveButton.setEnabled(false);
    this.toolbar.appendToolbarItem(this.saveButton);
    this.toolbar.appendSeparator();
    this.originCheckbox = new UI3.Toolbar.ToolbarCheckbox(i18nString3(UIStrings3.showEventsFromOtherDomains), i18nString3(UIStrings3.showEventsFromOtherDomains), () => this.refreshView(), "show-events-from-other-domains");
    this.toolbar.appendToolbarItem(this.originCheckbox);
    this.storageKeyCheckbox = new UI3.Toolbar.ToolbarCheckbox(i18nString3(UIStrings3.showEventsForOtherStorageKeys), i18nString3(UIStrings3.showEventsForOtherStorageKeys), () => this.refreshView(), "show-events-from-other-partitions");
    this.toolbar.appendToolbarItem(this.storageKeyCheckbox);
  }
  /**
   * Displays all available events in the grid.
   */
  refreshView() {
    this.clearView();
    const events = this.model.getEvents(this.serviceName).filter((event) => this.acceptEvent(event));
    for (const event of events) {
      this.addEvent(event);
    }
  }
  /**
   * Clears the grid and panel.
   */
  clearView() {
    this.selectedEventNode = null;
    this.dataGrid.rootNode().removeChildren();
    this.splitWidget.hideMain();
    this.saveButton.setEnabled(false);
    this.showPreview(null);
  }
  /**
   * Called when the `Toggle Record` button is clicked.
   */
  toggleRecording() {
    const isRecording = !this.recordButton.isToggled();
    this.model.setRecording(isRecording, this.serviceName);
    const featureName = _BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
    if (isRecording) {
      UI3.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.recordingSActivity, { PH1: featureName }) + " " + i18nString3(UIStrings3.devtoolsWillRecordAllSActivity, { PH1: featureName }));
      this.preview?.focus();
    }
  }
  /**
   * Called when the `Clear` button is clicked.
   */
  clearEvents() {
    this.model.clearEvents(this.serviceName);
    this.clearView();
  }
  onRecordingStateChanged({ data: state }) {
    if (state.serviceName !== this.serviceName) {
      return;
    }
    if (state.isRecording === this.recordButton.isToggled()) {
      return;
    }
    this.recordButton.setToggled(state.isRecording);
    this.updateRecordButtonTooltip();
    this.showPreview(this.selectedEventNode);
  }
  updateRecordButtonTooltip() {
    const buttonTooltip = this.recordButton.isToggled() ? i18nString3(UIStrings3.stopRecordingEvents) : i18nString3(UIStrings3.startRecordingEvents);
    this.recordButton.setTitle(buttonTooltip, "background-service.toggle-recording");
  }
  onEventReceived({ data: serviceEvent }) {
    if (!this.acceptEvent(serviceEvent)) {
      return;
    }
    this.addEvent(serviceEvent);
  }
  onOriginChanged() {
    if (this.originCheckbox.checked()) {
      return;
    }
    this.refreshView();
  }
  onStorageKeyChanged() {
    if (this.storageKeyCheckbox.checked()) {
      return;
    }
    this.refreshView();
  }
  addEvent(serviceEvent) {
    const data = this.createEventData(serviceEvent);
    const dataNode = new EventDataNode(data, serviceEvent.eventMetadata);
    this.dataGrid.rootNode().appendChild(dataNode);
    if (this.splitWidget.showMode() !== "Both") {
      this.splitWidget.showBoth();
    }
    if (this.dataGrid.rootNode().children.length === 1) {
      this.saveButton.setEnabled(true);
      this.showPreview(this.selectedEventNode);
    }
  }
  createDataGrid() {
    const columns = [
      { id: "id", title: "#", weight: 1 },
      { id: "timestamp", title: i18nString3(UIStrings3.timestamp), weight: 7 },
      { id: "event-name", title: i18nString3(UIStrings3.event), weight: 8 },
      { id: "origin", title: i18nString3(UIStrings3.origin), weight: 8 },
      { id: "storage-key", title: i18nString3(UIStrings3.storageKey), weight: 8 },
      { id: "sw-scope", title: i18nString3(UIStrings3.swScope), weight: 4 },
      { id: "instance-id", title: i18nString3(UIStrings3.instanceId), weight: 8 }
    ];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString3(UIStrings3.backgroundServices),
      columns,
      refreshCallback: void 0,
      deleteCallback: void 0
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener("SelectedNode", (event) => this.showPreview(event.data));
    return dataGrid;
  }
  /**
   * Creates the data object to pass to the DataGrid Node.
   */
  createEventData(serviceEvent) {
    let swScope = "";
    const registration = this.serviceWorkerManager ? this.serviceWorkerManager.registrations().get(serviceEvent.serviceWorkerRegistrationId) : void 0;
    if (registration) {
      swScope = registration.scopeURL.substr(registration.securityOrigin.length);
    }
    return {
      id: this.dataGrid.rootNode().children.length + 1,
      timestamp: UI3.UIUtils.formatTimestamp(
        serviceEvent.timestamp * 1e3,
        /* full= */
        true
      ),
      origin: serviceEvent.origin,
      "storage-key": serviceEvent.storageKey,
      "sw-scope": swScope,
      "event-name": serviceEvent.eventName,
      "instance-id": serviceEvent.instanceId
    };
  }
  /**
   * Filtration function to know whether event should be shown or not.
   */
  acceptEvent(event) {
    if (event.service !== this.serviceName) {
      return false;
    }
    if (this.originCheckbox.checked() || this.storageKeyCheckbox.checked()) {
      return true;
    }
    const origin = event.origin.substr(0, event.origin.length - 1);
    const storageKey = event.storageKey;
    return this.securityOriginManager.securityOrigins().includes(origin) || this.storageKeyManager.storageKeys().includes(storageKey);
  }
  createLearnMoreLink() {
    let url = "https://developer.chrome.com/docs/devtools/javascript/background-services/";
    switch (this.serviceName) {
      case "backgroundFetch":
        url += "#fetch";
        break;
      case "backgroundSync":
        url += "#sync";
        break;
      case "pushMessaging":
        url += "#push";
        break;
      case "notifications":
        url += "#notifications";
        break;
      default:
        break;
    }
    return url;
  }
  showPreview(dataNode) {
    if (this.selectedEventNode && this.selectedEventNode === dataNode) {
      return;
    }
    this.selectedEventNode = dataNode;
    if (this.preview) {
      this.preview.detach();
    }
    if (this.selectedEventNode) {
      this.preview = this.selectedEventNode.createPreview();
      this.preview.show(this.previewPanel.contentElement);
      return;
    }
    let emptyWidget;
    if (this.dataGrid.rootNode().children.length) {
      emptyWidget = new UI3.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.noEventSelected), i18nString3(UIStrings3.selectAnEventToViewMetadata));
    } else if (this.recordButton.isToggled()) {
      const featureName = _BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
      emptyWidget = new UI3.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.recordingSActivity, { PH1: featureName }), i18nString3(UIStrings3.devtoolsWillRecordAllSActivity, { PH1: featureName }));
    } else {
      const recordShortcuts = UI3.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("background-service.toggle-recording")[0];
      emptyWidget = new UI3.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.noRecording), i18nString3(UIStrings3.startRecordingToDebug, {
        PH1: i18nString3(UIStrings3.startRecordingEvents),
        PH2: recordShortcuts.title()
      }));
      emptyWidget.link = this.createLearnMoreLink();
      const button = UI3.UIUtils.createTextButton(i18nString3(UIStrings3.startRecordingEvents), () => this.toggleRecording(), {
        jslogContext: "start-recording",
        variant: "tonal"
        /* Buttons.Button.Variant.TONAL */
      });
      emptyWidget.contentElement.appendChild(button);
    }
    emptyWidget.setDefaultFocusedElement(emptyWidget.contentElement);
    this.preview = emptyWidget;
    this.preview.show(this.previewPanel.contentElement);
  }
  /**
   * Saves all currently displayed events in a file (JSON format).
   */
  async saveToFile() {
    const fileName = `${this.serviceName}-${Platform2.DateUtilities.toISO8601Compact(/* @__PURE__ */ new Date())}.json`;
    const stream = new Bindings.FileUtils.FileOutputStream();
    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }
    const events = this.model.getEvents(this.serviceName).filter((event) => this.acceptEvent(event));
    await stream.write(JSON.stringify(events, void 0, 2));
    void stream.close();
  }
};
var EventDataNode = class extends DataGrid.DataGrid.DataGridNode {
  eventMetadata;
  constructor(data, eventMetadata) {
    super(data);
    this.eventMetadata = eventMetadata.sort((m1, m2) => Platform2.StringUtilities.compare(m1.key, m2.key));
  }
  createPreview() {
    const preview = new UI3.Widget.VBox();
    preview.element.classList.add("background-service-metadata");
    preview.element.setAttribute("jslog", `${VisualLogging2.section("metadata")}`);
    for (const entry of this.eventMetadata) {
      const div = document.createElement("div");
      div.classList.add("background-service-metadata-entry");
      div.createChild("div", "background-service-metadata-name").textContent = entry.key + ": ";
      if (entry.value) {
        div.createChild("div", "background-service-metadata-value source-code").textContent = entry.value;
      } else {
        div.createChild("div", "background-service-metadata-value background-service-empty-value").textContent = i18nString3(UIStrings3.empty);
      }
      preview.element.appendChild(div);
    }
    if (!preview.element.children.length) {
      const div = document.createElement("div");
      div.classList.add("background-service-metadata-entry");
      div.createChild("div", "background-service-metadata-name background-service-empty-value").textContent = i18nString3(UIStrings3.noMetadataForThisEvent);
      preview.element.appendChild(div);
    }
    return preview;
  }
};
var ActionDelegate = class {
  handleAction(context, actionId) {
    const view = context.flavor(BackgroundServiceView);
    switch (actionId) {
      case "background-service.toggle-recording": {
        if (!view) {
          throw new Error("BackgroundServiceView instance is missing");
        }
        view.toggleRecording();
        return true;
      }
    }
    return false;
  }
};

// gen/front_end/panels/application/BounceTrackingMitigationsTreeElement.js
var BounceTrackingMitigationsTreeElement_exports = {};
__export(BounceTrackingMitigationsTreeElement_exports, {
  BounceTrackingMitigationsTreeElement: () => BounceTrackingMitigationsTreeElement,
  i18nString: () => i18nString4
});
import * as Host3 from "./../../core/host/host.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon2 } from "./../../ui/kit/kit.js";
import * as ApplicationComponents3 from "./components/components.js";
var UIStrings4 = {
  /**
   * @description Hover text for the Bounce Tracking Mitigations element in the Application Panel sidebar.
   */
  bounceTrackingMitigations: "Bounce tracking mitigations"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/application/BounceTrackingMitigationsTreeElement.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var BounceTrackingMitigationsTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(resourcesPanel) {
    super(resourcesPanel, i18nString4(UIStrings4.bounceTrackingMitigations), false, "bounce-tracking-mitigations");
    const icon = createIcon2("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "bounce-tracking-mitigations://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ApplicationComponents3.BounceTrackingMitigationsView.BounceTrackingMitigationsView();
    }
    this.showView(this.view);
    Host3.userMetrics.panelShown("bounce-tracking-mitigations");
    return false;
  }
};

// gen/front_end/panels/application/DOMStorageModel.js
var DOMStorageModel_exports = {};
__export(DOMStorageModel_exports, {
  DOMStorage: () => DOMStorage,
  DOMStorageDispatcher: () => DOMStorageDispatcher,
  DOMStorageModel: () => DOMStorageModel
});
import * as Common3 from "./../../core/common/common.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
var DOMStorage = class _DOMStorage extends Common3.ObjectWrapper.ObjectWrapper {
  model;
  #storageKey;
  #isLocalStorage;
  constructor(model, storageKey, isLocalStorage) {
    super();
    this.model = model;
    this.#storageKey = storageKey;
    this.#isLocalStorage = isLocalStorage;
  }
  static storageId(storageKey, isLocalStorage) {
    return { storageKey, isLocalStorage };
  }
  get id() {
    return _DOMStorage.storageId(this.#storageKey, this.#isLocalStorage);
  }
  get storageKey() {
    return this.#storageKey;
  }
  get isLocalStorage() {
    return this.#isLocalStorage;
  }
  getItems() {
    return this.model.agent.invoke_getDOMStorageItems({ storageId: this.id }).then(({ entries }) => entries);
  }
  setItem(key, value) {
    void this.model.agent.invoke_setDOMStorageItem({ storageId: this.id, key, value });
  }
  removeItem(key) {
    void this.model.agent.invoke_removeDOMStorageItem({ storageId: this.id, key });
  }
  clear() {
    void this.model.agent.invoke_clear({ storageId: this.id });
  }
};
var DOMStorageModel = class extends SDK4.SDKModel.SDKModel {
  #storageKeyManager;
  #storages;
  agent;
  enabled;
  constructor(target) {
    super(target);
    this.#storageKeyManager = target.model(SDK4.StorageKeyManager.StorageKeyManager);
    this.#storages = {};
    this.agent = target.domstorageAgent();
  }
  enable() {
    if (this.enabled) {
      return;
    }
    this.target().registerDOMStorageDispatcher(new DOMStorageDispatcher(this));
    if (this.#storageKeyManager) {
      this.#storageKeyManager.addEventListener("StorageKeyAdded", this.storageKeyAdded, this);
      this.#storageKeyManager.addEventListener("StorageKeyRemoved", this.storageKeyRemoved, this);
      for (const storageKey of this.#storageKeyManager.storageKeys()) {
        this.addStorageKey(storageKey);
      }
    }
    void this.agent.invoke_enable();
    this.enabled = true;
  }
  clearForStorageKey(storageKey) {
    if (!this.enabled) {
      return;
    }
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      const storage = this.#storages[key];
      if (!storage) {
        return;
      }
      storage.clear();
    }
    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }
  storageKeyAdded(event) {
    this.addStorageKey(event.data);
  }
  addStorageKey(storageKey) {
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      console.assert(!this.#storages[key]);
      const storage = new DOMStorage(this, storageKey, isLocal);
      this.#storages[key] = storage;
      this.dispatchEventToListeners("DOMStorageAdded", storage);
    }
  }
  storageKeyRemoved(event) {
    this.removeStorageKey(event.data);
  }
  removeStorageKey(storageKey) {
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      const storage = this.#storages[key];
      if (!storage) {
        continue;
      }
      delete this.#storages[key];
      this.dispatchEventToListeners("DOMStorageRemoved", storage);
    }
  }
  storageKey(storageKey, isLocalStorage) {
    return JSON.stringify(DOMStorage.storageId(storageKey, isLocalStorage));
  }
  domStorageItemsCleared(storageId) {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }
    domStorage.dispatchEventToListeners(
      "DOMStorageItemsCleared"
      /* DOMStorage.Events.DOM_STORAGE_ITEMS_CLEARED */
    );
  }
  domStorageItemRemoved(storageId, key) {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }
    const eventData = { key };
    domStorage.dispatchEventToListeners("DOMStorageItemRemoved", eventData);
  }
  domStorageItemAdded(storageId, key, value) {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }
    const eventData = { key, value };
    domStorage.dispatchEventToListeners("DOMStorageItemAdded", eventData);
  }
  domStorageItemUpdated(storageId, key, oldValue, value) {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }
    const eventData = { key, oldValue, value };
    domStorage.dispatchEventToListeners("DOMStorageItemUpdated", eventData);
  }
  storageForId(storageId) {
    console.assert(Boolean(storageId.storageKey));
    return this.#storages[this.storageKey(storageId.storageKey || "", storageId.isLocalStorage)];
  }
  storages() {
    const result = [];
    for (const id in this.#storages) {
      result.push(this.#storages[id]);
    }
    return result;
  }
};
SDK4.SDKModel.SDKModel.register(DOMStorageModel, { capabilities: 2, autostart: false });
var DOMStorageDispatcher = class {
  model;
  constructor(model) {
    this.model = model;
  }
  domStorageItemsCleared({ storageId }) {
    this.model.domStorageItemsCleared(storageId);
  }
  domStorageItemRemoved({ storageId, key }) {
    this.model.domStorageItemRemoved(storageId, key);
  }
  domStorageItemAdded({ storageId, key, newValue }) {
    this.model.domStorageItemAdded(storageId, key, newValue);
  }
  domStorageItemUpdated({ storageId, key, oldValue, newValue }) {
    this.model.domStorageItemUpdated(storageId, key, oldValue, newValue);
  }
};

// gen/front_end/panels/application/ExtensionStorageModel.js
var ExtensionStorageModel_exports = {};
__export(ExtensionStorageModel_exports, {
  ExtensionStorage: () => ExtensionStorage,
  ExtensionStorageModel: () => ExtensionStorageModel
});
import * as Common4 from "./../../core/common/common.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
var ExtensionStorage = class extends Common4.ObjectWrapper.ObjectWrapper {
  #model;
  #extensionId;
  #name;
  #storageArea;
  constructor(model, extensionId, name, storageArea) {
    super();
    this.#model = model;
    this.#extensionId = extensionId;
    this.#name = name;
    this.#storageArea = storageArea;
  }
  get model() {
    return this.#model;
  }
  get extensionId() {
    return this.#extensionId;
  }
  get name() {
    return this.#name;
  }
  // Returns a key that uniquely identifies this extension ID and storage area,
  // but which is not unique across targets, so we can identify two identical
  // storage areas across frames.
  get key() {
    return `${this.extensionId}-${this.storageArea}`;
  }
  get storageArea() {
    return this.#storageArea;
  }
  async getItems(keys) {
    const params = {
      id: this.#extensionId,
      storageArea: this.#storageArea
    };
    if (keys) {
      params.keys = keys;
    }
    const response = await this.#model.agent.invoke_getStorageItems(params);
    if (response.getError()) {
      throw new Error(response.getError());
    }
    return response.data;
  }
  async setItem(key, value) {
    const response = await this.#model.agent.invoke_setStorageItems({ id: this.#extensionId, storageArea: this.#storageArea, values: { [key]: value } });
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }
  async removeItem(key) {
    const response = await this.#model.agent.invoke_removeStorageItems({ id: this.#extensionId, storageArea: this.#storageArea, keys: [key] });
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }
  async clear() {
    const response = await this.#model.agent.invoke_clearStorageItems({ id: this.#extensionId, storageArea: this.#storageArea });
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }
  matchesTarget(target) {
    if (!target) {
      return false;
    }
    const targetURL = target.targetInfo()?.url;
    const parsedURL = targetURL ? Common4.ParsedURL.ParsedURL.fromString(targetURL) : null;
    return parsedURL?.scheme === "chrome-extension" && parsedURL?.host === this.extensionId;
  }
};
var ExtensionStorageModel = class extends SDK5.SDKModel.SDKModel {
  #runtimeModel;
  #storages;
  agent;
  #enabled;
  constructor(target) {
    super(target);
    this.#runtimeModel = target.model(SDK5.RuntimeModel.RuntimeModel);
    this.#storages = /* @__PURE__ */ new Map();
    this.agent = target.extensionsAgent();
  }
  enable() {
    if (this.#enabled) {
      return;
    }
    if (this.#runtimeModel) {
      this.#runtimeModel.addEventListener(SDK5.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated, this);
      this.#runtimeModel.addEventListener(SDK5.RuntimeModel.Events.ExecutionContextDestroyed, this.#onExecutionContextDestroyed, this);
      this.#runtimeModel.executionContexts().forEach(this.#executionContextCreated, this);
    }
    this.#enabled = true;
  }
  #getStoragesForExtension(id) {
    const existingStorages = this.#storages.get(id);
    if (existingStorages) {
      return existingStorages;
    }
    const newStorages = /* @__PURE__ */ new Map();
    this.#storages.set(id, newStorages);
    return newStorages;
  }
  #addExtension(id, name) {
    for (const storageArea of [
      "session",
      "local",
      "sync",
      "managed"
      /* Protocol.Extensions.StorageArea.Managed */
    ]) {
      const storages = this.#getStoragesForExtension(id);
      const storage = new ExtensionStorage(this, id, name, storageArea);
      console.assert(!storages.get(storageArea));
      storage.getItems([]).then(() => {
        if (this.#storages.get(id) !== storages) {
          return;
        }
        if (storages.get(storageArea)) {
          return;
        }
        storages.set(storageArea, storage);
        this.dispatchEventToListeners("ExtensionStorageAdded", storage);
      }).catch(() => {
      });
    }
  }
  #removeExtension(id) {
    const storages = this.#storages.get(id);
    if (!storages) {
      return;
    }
    for (const [key, storage] of storages) {
      storages.delete(key);
      this.dispatchEventToListeners("ExtensionStorageRemoved", storage);
    }
    this.#storages.delete(id);
  }
  #executionContextCreated(context) {
    const extensionId = this.#extensionIdForContext(context);
    if (extensionId) {
      this.#addExtension(extensionId, context.name);
    }
  }
  #onExecutionContextCreated(event) {
    this.#executionContextCreated(event.data);
  }
  #extensionIdForContext(context) {
    const url = Common4.ParsedURL.ParsedURL.fromString(context.origin);
    return url?.scheme === "chrome-extension" ? url.host : void 0;
  }
  #executionContextDestroyed(context) {
    const extensionId = this.#extensionIdForContext(context);
    if (extensionId) {
      if (this.#runtimeModel?.executionContexts().some((c) => this.#extensionIdForContext(c) === extensionId)) {
        return;
      }
      this.#removeExtension(extensionId);
    }
  }
  #onExecutionContextDestroyed(event) {
    this.#executionContextDestroyed(event.data);
  }
  storageForIdAndArea(id, storageArea) {
    return this.#storages.get(id)?.get(storageArea);
  }
  storages() {
    const result = [];
    for (const storages of this.#storages.values()) {
      result.push(...storages.values());
    }
    return result;
  }
};
SDK5.SDKModel.SDKModel.register(ExtensionStorageModel, { capabilities: 4, autostart: false });

// gen/front_end/panels/application/FrameDetailsView.js
var FrameDetailsView_exports = {};
__export(FrameDetailsView_exports, {
  FrameDetailsReportView: () => FrameDetailsReportView
});
import "./../../ui/components/expandable_list/expandable_list.js";
import "./../../ui/components/report_view/report_view.js";
import * as Common5 from "./../../core/common/common.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as PanelCommon from "./../common/common.js";
import * as NetworkForward from "./../network/forward/forward.js";
import * as CspEvaluator from "./../../third_party/csp_evaluator/csp_evaluator.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import { html as html3, nothing as nothing3, render as render3 } from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents4 from "./components/components.js";

// gen/front_end/panels/application/frameDetailsReportView.css.js
var frameDetailsReportView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: auto;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

button ~ .text-ellipsis {
  padding-left: 2px;
}

.link,
.devtools-link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  padding: 0;
  margin-left: var(--sys-size-3);
  white-space: nowrap;;
}

button.link {
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  height: 16px;
}

button.link:has(devtools-icon) {
  margin-top: 5px;
}

devtools-button.help-button {
  top: 4px;
  position: relative;
}

button.text-link {
  padding-left: 2px;
  height: 26px;
}

.inline-button {
  padding-left: 1ex;
}

.inline-comment {
  padding-left: 1ex;
  white-space: pre-line;
}

.inline-comment::before {
  content: "(";
}

.inline-comment::after {
  content: ")";
}

.inline-name {
  color: var(--sys-color-token-subtle);
  padding-inline: 4px;
  user-select: none;
  white-space: pre-line;
}

.inline-items {
  display: flex;
}

.span-cols {
  grid-column-start: span 2;
  margin-left: var(--sys-size-9);
  line-height: 28px;
}

.report-section:has(.link) {
  line-height: var(--sys-size-12);
}

.without-min-width {
  min-width: auto;
}

.bold {
  font-weight: bold;
}

.link:not(button):has(devtools-icon) {
  vertical-align: baseline;
  margin-inline-start: 3px;
}

.inline-icon {
  margin-bottom: -5px;
  width: 18px;
  height: 18px;
  vertical-align: baseline;
}

@media (forced-colors: active) {
  .link,
  .devtools-link {
    color: linktext;
    text-decoration-color: linktext;
  }
}
/*# sourceURL=${import.meta.resolve("./frameDetailsReportView.css")} */`;

// gen/front_end/panels/application/OriginTrialTreeView.js
var OriginTrialTreeView_exports = {};
__export(OriginTrialTreeView_exports, {
  OriginTrialTokenRows: () => OriginTrialTokenRows,
  OriginTrialTreeView: () => OriginTrialTreeView
});
import "./../../ui/kit/kit.js";
import "./../../ui/legacy/legacy.js";
import "./../../ui/components/adorners/adorners.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import { Directives, html as html2, nothing as nothing2, render as render2 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/application/originTrialTokenRows.css.js
var originTrialTokenRows_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.content {
  display: grid;
  grid-template-columns: min-content 1fr;
}

.key {
  color: var(--sys-color-token-subtle);
  padding: 0 6px;
  text-align: right;
  white-space: pre;
}

.value {
  color: var(--sys-color-token-subtle);
  margin-inline-start: 0;
  padding: 0 6px;
}

.error-text {
  color: var(--sys-color-error-bright);
  font-weight: bold;
}

/*# sourceURL=${import.meta.resolve("./originTrialTokenRows.css")} */`;

// gen/front_end/panels/application/originTrialTreeView.css.js
var originTrialTreeView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  .status-badge {
    border-radius: 4px;
    padding: 4px;
    background: var(--sys-color-neutral-container);

    & > devtools-icon {
      vertical-align: sub;
    }
  }

  .badge-error {
    --override-adorner-text-color: var(--sys-color-error-bright);
    --override-adorner-border-color: var(--sys-color-error-bright);
  }

  .badge-success {
    --override-adorner-text-color: var(--sys-color-tertiary);
    --override-adorner-border-color: var(--sys-color-tertiary);
  }

  .badge-secondary {
    --override-adorner-text-color: var(--sys-color-token-subtle);
    --override-adorner-border-color: var(--sys-color-token-subtle);
  }

  /* Use mono-space source code font to assist reading of adorner content */
  devtools-adorner {
    font-family: var(--source-code-font-family);
  }

  .token-status-badge {
    display: none;
  }

  [aria-expanded='false'] .token-status-badge {
    display: inline-flex;
  }
}
/*# sourceURL=${import.meta.resolve("./originTrialTreeView.css")} */`;

// gen/front_end/panels/application/OriginTrialTreeView.js
var { classMap } = Directives;
var { widgetConfig } = UI4.Widget;
var UIStrings5 = {
  /**
   * @description Label for the 'origin' field in a parsed Origin Trial Token.
   */
  origin: "Origin",
  /**
   * @description Label for `trialName` field in a parsed Origin Trial Token.
   * This field is only shown when token has unknown trial name as the token
   * will be put into 'UNKNOWN' group.
   */
  trialName: "Trial Name",
  /**
   * @description Label for `expiryTime` field in a parsed Origin Trial Token.
   */
  expiryTime: "Expiry Time",
  /**
   * @description Label for `usageRestriction` field in a parsed Origin Trial Token.
   */
  usageRestriction: "Usage Restriction",
  /**
   * @description Label for `isThirdParty` field in a parsed Origin Trial Token.
   */
  isThirdParty: "Third Party",
  /**
   * @description Label for a field containing info about an Origin Trial Token's `matchSubDomains` field.
   *An Origin Trial Token contains an origin URL. The `matchSubDomains` field describes whether the token
   *only applies to the origin URL or to all subdomains of the origin URL as well.
   *The field contains either 'true' or 'false'.
   */
  matchSubDomains: "Subdomain Matching",
  /**
   * @description Label for the raw(= encoded / not human-readable) Origin Trial Token.
   */
  rawTokenText: "Raw Token",
  /**
   * @description Label for `status` field in an Origin Trial Token.
   */
  status: "Token Status",
  /**
   * @description Label for tokenWithStatus node.
   */
  token: "Token",
  /**
   * @description Label for a badge showing the number of Origin Trial Tokens. This number is always greater than 1.
   * @example {2} PH1
   */
  tokens: "{PH1} tokens",
  /**
   * @description Label shown when there are no Origin Trial Tokens in the Frame view of the Application panel.
   */
  noTrialTokens: "No trial tokens"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/application/OriginTrialTreeView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
function renderOriginTrialTree(originTrial) {
  const success = originTrial.status === "Enabled";
  return html2`
    <li role="treeitem">
      ${originTrial.trialName}
      <devtools-adorner class="badge-${success ? "success" : "error"}">
        ${originTrial.status}
      </devtools-adorner>
      ${originTrial.tokensWithStatus.length > 1 ? html2`
        <devtools-adorner class="badge-secondary">
          ${i18nString5(UIStrings5.tokens, { PH1: originTrial.tokensWithStatus.length })}
        </devtools-adorner>` : nothing2}
      <ul role="group" hidden>
        ${originTrial.tokensWithStatus.length > 1 ? originTrial.tokensWithStatus.map(renderTokenNode) : renderTokenDetailsNodes(originTrial.tokensWithStatus[0])}
      </ul>
    </li>`;
}
function renderTokenNode(token) {
  const success = token.status === "Success";
  return html2`
    <li role="treeitem">
      ${i18nString5(UIStrings5.token)}
      <devtools-adorner class="token-status-badge badge-${success ? "success" : "error"}">
        ${token.status}
      </devtools-adorner>
      <ul role="group" hidden>
        ${renderTokenDetailsNodes(token)}
      </ul>
    </li>`;
}
function renderTokenDetails(token) {
  return html2`
    <li role="treeitem">
      <devtools-widget .widgetConfig=${widgetConfig(OriginTrialTokenRows, { data: token })}>
      </devtools-widget>
    </li>`;
}
function renderTokenDetailsNodes(token) {
  return html2`
    ${renderTokenDetails(token)}
    ${renderRawTokenTextNode(token.rawTokenText)}
  `;
}
function renderRawTokenTextNode(tokenText) {
  return html2`
    <li role="treeitem">
      ${i18nString5(UIStrings5.rawTokenText)}
      <ul role="group" hidden>
        <li role="treeitem">
          <div style="overflow-wrap: break-word;">
            ${tokenText}
          </div>
        </li>
      </ul>
    </li>`;
}
var ROWS_DEFAULT_VIEW = (input, _output, target) => {
  const success = input.tokenWithStatus.status === "Success";
  render2(html2`
    <style>
      ${originTrialTokenRows_css_default}
      ${originTrialTreeView_css_default}
    </style>
    <div class="content">
      <div class="key">${i18nString5(UIStrings5.status)}</div>
      <div class="value">
        <devtools-adorner class="badge-${success ? "success" : "error"}">
          ${input.tokenWithStatus.status}
        </devtools-adorner>
      </div>
      ${input.parsedTokenDetails.map((field) => html2`
        <div class="key">${field.name}</div>
        <div class="value">
          <div class=${classMap({ "error-text": Boolean(field.value.hasError) })}>
            ${field.value.text}
          </div>
        </div>
      `)}
    </div>`, target);
};
var OriginTrialTokenRows = class extends UI4.Widget.Widget {
  #view;
  #tokenWithStatus = null;
  #parsedTokenDetails = [];
  #dateFormatter = new Intl.DateTimeFormat(i18n9.DevToolsLocale.DevToolsLocale.instance().locale, { dateStyle: "long", timeStyle: "long" });
  constructor(element, view = ROWS_DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#tokenWithStatus = data;
    this.#setTokenFields();
  }
  connectedCallback() {
    this.requestUpdate();
  }
  #setTokenFields() {
    if (!this.#tokenWithStatus?.parsedToken) {
      return;
    }
    this.#parsedTokenDetails = [
      {
        name: i18nString5(UIStrings5.origin),
        value: {
          text: this.#tokenWithStatus.parsedToken.origin,
          hasError: this.#tokenWithStatus.status === "WrongOrigin"
        }
      },
      {
        name: i18nString5(UIStrings5.expiryTime),
        value: {
          text: this.#dateFormatter.format(this.#tokenWithStatus.parsedToken.expiryTime * 1e3),
          hasError: this.#tokenWithStatus.status === "Expired"
          /* Protocol.Page.OriginTrialTokenStatus.Expired */
        }
      },
      {
        name: i18nString5(UIStrings5.usageRestriction),
        value: { text: this.#tokenWithStatus.parsedToken.usageRestriction }
      },
      {
        name: i18nString5(UIStrings5.isThirdParty),
        value: { text: this.#tokenWithStatus.parsedToken.isThirdParty.toString() }
      },
      {
        name: i18nString5(UIStrings5.matchSubDomains),
        value: { text: this.#tokenWithStatus.parsedToken.matchSubDomains.toString() }
      }
    ];
    if (this.#tokenWithStatus.status === "UnknownTrial") {
      this.#parsedTokenDetails = [
        {
          name: i18nString5(UIStrings5.trialName),
          value: { text: this.#tokenWithStatus.parsedToken.trialName }
        },
        ...this.#parsedTokenDetails
      ];
    }
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#tokenWithStatus) {
      return;
    }
    const viewInput = {
      tokenWithStatus: this.#tokenWithStatus,
      parsedTokenDetails: this.#parsedTokenDetails
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};
var DEFAULT_VIEW2 = (input, _output, target) => {
  if (!input.trials.length) {
    render2(html2`
      <span class="status-badge">
        <devtools-icon class="medium" name="clear"></devtools-icon>
        <span>${i18nString5(UIStrings5.noTrialTokens)}</span>
      </span>`, target);
    return;
  }
  render2(html2`
    <style>${originTrialTreeView_css_default}</style>
    <devtools-tree .template=${html2`
      <style>${originTrialTreeView_css_default}</style>
      <ul role="tree">
        ${input.trials.map(renderOriginTrialTree)}
      </ul>
    `}>
    </devtools-tree>
  `, target);
};
var OriginTrialTreeView = class extends UI4.Widget.Widget {
  #data = { trials: [] };
  #view;
  constructor(element, view = DEFAULT_VIEW2) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view(this.#data, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/FrameDetailsView.js
var { widgetConfig: widgetConfig2 } = UI5.Widget;
var UIStrings6 = {
  /**
   * @description Section header in the Frame Details view
   */
  additionalInformation: "Additional Information",
  /**
   * @description Explanation for why the additional information section is being shown
   */
  thisAdditionalDebugging: "This additional (debugging) information is shown because the 'Protocol Monitor' experiment is enabled.",
  /**
   * @description Label for subtitle of frame details view
   */
  frameId: "Frame ID",
  /**
   * @description Name of a network resource type
   */
  document: "Document",
  /**
   * @description A web URL (for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  url: "URL",
  /**
   * /**
   * @description Title for a link to the Sources panel
   */
  clickToOpenInSourcesPanel: "Click to open in Sources panel",
  /**
   * @description Title for a link to the Network panel
   */
  clickToOpenInNetworkPanel: "Click to open in Network panel",
  /**
   * @description Title for unreachable URL field
   */
  unreachableUrl: "Unreachable URL",
  /**
   * @description Title for a link that applies a filter to the network panel
   */
  clickToOpenInNetworkPanelMight: "Click to open in Network panel (might require page reload)",
  /**
   * @description The origin of a URL (https://web.dev/same-site-same-origin/#origin)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  origin: "Origin",
  /**
   * /**
   * @description Related node label in Timeline UIUtils of the Performance panel
   */
  ownerElement: "Owner Element",
  /**
   * @description Title for ad frame type field
   */
  adStatus: "Ad Status",
  /**
   * @description Description for ad frame type
   */
  rootDescription: "This frame has been identified as the root frame of an ad",
  /**
   * @description Value for ad frame type
   */
  root: "root",
  /**
   * @description Description for ad frame type
   */
  childDescription: "This frame has been identified as a child frame of an ad",
  /**
   * @description Value for ad frame type
   */
  child: "child",
  /**
   * @description Section header in the Frame Details view
   */
  securityIsolation: "Security & Isolation",
  /**
   * @description Section header in the Frame Details view
   */
  contentSecurityPolicy: "Content Security Policy (CSP)",
  /**
   * @description Row title for in the Frame Details view
   */
  secureContext: "Secure Context",
  /**
   * @description Text in Timeline indicating that input has happened recently
   */
  yes: "Yes",
  /**
   * @description Text in Timeline indicating that input has not happened recently
   */
  no: "No",
  /**
   * @description Label for whether a frame is cross-origin isolated
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages this does not need to be translated, please translate only where necessary)
   */
  crossoriginIsolated: "Cross-Origin Isolated",
  /**
   * @description Explanatory text in the Frame Details view
   */
  localhostIsAlwaysASecureContext: "`Localhost` is always a secure context",
  /**
   * @description Explanatory text in the Frame Details view
   */
  aFrameAncestorIsAnInsecure: "A frame ancestor is an insecure context",
  /**
   * @description Explanatory text in the Frame Details view
   */
  theFramesSchemeIsInsecure: "The frame's scheme is insecure",
  /**
   * @description This label specifies the server endpoints to which the server is reporting errors
   *and warnings through the Report-to API. Following this label will be the URL of the server.
   */
  reportingTo: "reporting to",
  /**
   * @description Section header in the Frame Details view
   */
  apiAvailability: "API availability",
  /**
   * @description Explanation of why cross-origin isolation is important
   *(https://web.dev/why-coop-coep/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
   */
  availabilityOfCertainApisDepends: "Availability of certain APIs depends on the document being cross-origin isolated.",
  /**
   * @description Description of the SharedArrayBuffer status
   */
  availableTransferable: "available, transferable",
  /**
   * @description Description of the SharedArrayBuffer status
   */
  availableNotTransferable: "available, not transferable",
  /**
   * @description Explanation for the SharedArrayBuffer availability status
   */
  unavailable: "unavailable",
  /**
   * @description Tooltip for the SharedArrayBuffer availability status
   */
  sharedarraybufferConstructorIs: "`SharedArrayBuffer` constructor is available and `SABs` can be transferred via `postMessage`",
  /**
   * @description Tooltip for the SharedArrayBuffer availability status
   */
  sharedarraybufferConstructorIsAvailable: "`SharedArrayBuffer` constructor is available but `SABs` cannot be transferred via `postMessage`",
  /**
   * @description Explanation why SharedArrayBuffer will not be available in the future
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary)
   */
  willRequireCrossoriginIsolated: "\u26A0\uFE0F will require cross-origin isolated context in the future",
  /**
   * @description Explanation why SharedArrayBuffer is not available
   *(https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/)
   *(for a lot of languages 'cross-origin isolation' does not need to be translated, please translate only where necessary).
   */
  requiresCrossoriginIsolated: "requires cross-origin isolated context",
  /**
   * @description Explanation for the SharedArrayBuffer availability status in case the transfer of a SAB requires the
   * permission policy `cross-origin-isolated` to be enabled (e.g. because the message refers to the situation in an iframe).
   */
  transferRequiresCrossoriginIsolatedPermission: "`SharedArrayBuffer` transfer requires enabling the permission policy:",
  /**
   * @description Explanation for the Measure Memory availability status
   */
  available: "available",
  /**
   * @description Tooltip for the Measure Memory availability status
   */
  thePerformanceAPI: "The `performance.measureUserAgentSpecificMemory()` API is available",
  /**
   * @description Tooltip for the Measure Memory availability status
   */
  thePerformancemeasureuseragentspecificmemory: "The `performance.measureUserAgentSpecificMemory()` API is not available",
  /**
   * @description Entry in the API availability section of the frame details view
   */
  measureMemory: "Measure Memory",
  /**
   * @description Text that is usually a hyperlink to more documentation
   */
  learnMore: "Learn more",
  /**
   * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
   * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
   */
  creationStackTrace: "Frame Creation `Stack Trace`",
  /**
   * @description Tooltip for 'Frame Creation Stack Trace' explaining that the stack
   *trace shows where in the code the frame has been created programmatically
   */
  creationStackTraceExplanation: "This frame was created programmatically. The `stack trace` shows where this happened.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  parentIsAdExplanation: "This frame is considered an ad frame because its parent frame is an ad frame.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  matchedBlockingRuleExplanation: "This frame is considered an ad frame because its current (or previous) main document is an ad resource.",
  /**
   * @description Text descripting why a frame has been indentified as an advertisement.
   */
  createdByAdScriptExplanation: "There was an ad script in the `(async) stack` when this frame was created. Examining the creation `stack trace` of this frame might provide more insight.",
  /**
   * @description Label for the link(s) to the ad script(s) that led to this frame's creation.
   */
  creatorAdScriptAncestry: "Creator Ad Script Ancestry",
  /**
   * @description Label for the filterlist rule that identified the root script in 'Creator Ad Script Ancestry' as an ad.
   */
  rootScriptFilterlistRule: "Root Script Filterlist Rule",
  /**
   * @description Text describing the absence of a value.
   */
  none: "None",
  /**
   * @description Explanation of what origin trials are
   *(https://developer.chrome.com/docs/web-platform/origin-trials/)
   *(please don't translate 'origin trials').
   */
  originTrialsExplanation: "Origin trials give you access to a new or experimental feature."
};
var str_6 = i18n11.i18n.registerUIStrings("panels/application/FrameDetailsView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var DEFAULT_VIEW3 = (input, _output, target) => {
  if (!input.frame) {
    return;
  }
  render3(html3`
    <style>${frameDetailsReportView_css_default}</style>
    <devtools-report .data=${{ reportTitle: input.frame.displayName() }}
    jslog=${VisualLogging3.pane("frames")}>
      ${renderDocumentSection(input)}
      ${renderIsolationSection(input)}
      ${renderApiAvailabilitySection(input.frame)}
      ${renderOriginTrial(input.trials)}
      ${input.permissionsPolicies ? html3`
          <devtools-widget .widgetConfig=${widgetConfig2(ApplicationComponents4.PermissionsPolicySection.PermissionsPolicySection, {
    policies: input.permissionsPolicies,
    showDetails: false
  })}>
          </devtools-widget>` : nothing3}
      ${input.protocolMonitorExperimentEnabled ? renderAdditionalInfoSection(input.frame) : nothing3}
    </devtools-report>
  `, target);
};
function renderOriginTrial(trials) {
  if (!trials) {
    return nothing3;
  }
  const data = { trials };
  return html3`
    <devtools-report-section-header>
      ${i18n11.i18n.lockedString("Origin trials")}
    </devtools-report-section-header>
    <devtools-report-section>
      <span class="report-section">
        ${i18nString6(UIStrings6.originTrialsExplanation)}
        <x-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
                jslog=${VisualLogging3.link("learn-more.origin-trials").track({ click: true })}>
          ${i18nString6(UIStrings6.learnMore)}
        </x-link>
      </span>
    </devtools-report-section>
    <devtools-widget class="span-cols" .widgetConfig=${widgetConfig2(OriginTrialTreeView, { data })}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
}
function renderDocumentSection(input) {
  if (!input.frame) {
    return nothing3;
  }
  return html3`
      <devtools-report-section-header>${i18nString6(UIStrings6.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString6(UIStrings6.url)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${!input.frame?.unreachableUrl() ? renderSourcesLinkForURL(input.onRevealInSources) : nothing3}
          ${input.onRevealInNetwork ? renderNetworkLinkForURL(input.onRevealInNetwork) : nothing3}
          <div class="text-ellipsis" title=${input.frame.url}>${input.frame.url}</div>
        </div>
      </devtools-report-value>
      ${maybeRenderUnreachableURL(input.frame?.unreachableUrl())}
      ${maybeRenderOrigin(input.frame?.securityOrigin)}
      ${renderOwnerElement(input.linkTargetDOMNode)}
      ${maybeRenderCreationStacktrace(input.creationStackTrace, input.creationTarget)}
      ${maybeRenderAdStatus(input.frame?.adFrameType(), input.frame?.adFrameStatus())}
      ${maybeRenderCreatorAdScriptAncestry(input.frame?.adFrameType(), input.target, input.adScriptAncestry)}
      <devtools-report-divider></devtools-report-divider>`;
}
function renderSourcesLinkForURL(onRevealInSources) {
  return ApplicationComponents4.PermissionsPolicySection.renderIconLink("label", i18nString6(UIStrings6.clickToOpenInSourcesPanel), onRevealInSources, "reveal-in-sources");
}
function renderNetworkLinkForURL(onRevealInNetwork) {
  return ApplicationComponents4.PermissionsPolicySection.renderIconLink("arrow-up-down-circle", i18nString6(UIStrings6.clickToOpenInNetworkPanel), onRevealInNetwork, "reveal-in-network");
}
function maybeRenderUnreachableURL(unreachableUrl) {
  if (!unreachableUrl) {
    return nothing3;
  }
  return html3`
      <devtools-report-key>${i18nString6(UIStrings6.unreachableUrl)}</devtools-report-key>
      <devtools-report-value>
        <div class="inline-items">
          ${renderNetworkLinkForUnreachableURL(unreachableUrl)}
          <div class="text-ellipsis" title=${unreachableUrl}>${unreachableUrl}</div>
        </div>
      </devtools-report-value>
    `;
}
function renderNetworkLinkForUnreachableURL(unreachableUrlString) {
  const unreachableUrl = Common5.ParsedURL.ParsedURL.fromString(unreachableUrlString);
  if (unreachableUrl) {
    return ApplicationComponents4.PermissionsPolicySection.renderIconLink("arrow-up-down-circle", i18nString6(UIStrings6.clickToOpenInNetworkPanelMight), () => {
      void Common5.Revealer.reveal(NetworkForward.UIFilter.UIRequestFilter.filters([
        {
          filterType: NetworkForward.UIFilter.FilterType.Domain,
          filterValue: unreachableUrl.domain()
        },
        {
          filterType: null,
          filterValue: unreachableUrl.path
        }
      ]));
    }, "unreachable-url.reveal-in-network");
  }
  return nothing3;
}
function maybeRenderOrigin(securityOrigin) {
  if (securityOrigin && securityOrigin !== "://") {
    return html3`
        <devtools-report-key>${i18nString6(UIStrings6.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${securityOrigin}>${securityOrigin}</div>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function renderOwnerElement(linkTargetDOMNode) {
  if (linkTargetDOMNode) {
    return html3`
        <devtools-report-key>${i18nString6(UIStrings6.ownerElement)}</devtools-report-key>
        <devtools-report-value class="without-min-width">
          <div class="inline-items">
            <devtools-widget .widgetConfig=${widgetConfig2(PanelCommon.DOMLinkifier.DOMNodeLink, {
      node: linkTargetDOMNode
    })}>
            </devtools-widget>
          </div>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function maybeRenderCreationStacktrace(stackTrace, target) {
  if (stackTrace && target) {
    return html3`
        <devtools-report-key title=${i18nString6(UIStrings6.creationStackTraceExplanation)}>${i18nString6(UIStrings6.creationStackTrace)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging3.section("frame-creation-stack-trace")}>
          <devtools-widget .widgetConfig=${UI5.Widget.widgetConfig(Components2.JSPresentationUtils.StackTracePreviewContent, { target, stackTrace, options: { expandable: true } })}>
          </devtools-widget>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function getAdFrameTypeStrings(type) {
  switch (type) {
    case "child":
      return { value: i18nString6(UIStrings6.child), description: i18nString6(UIStrings6.childDescription) };
    case "root":
      return { value: i18nString6(UIStrings6.root), description: i18nString6(UIStrings6.rootDescription) };
  }
}
function getAdFrameExplanationString(explanation) {
  switch (explanation) {
    case "CreatedByAdScript":
      return i18nString6(UIStrings6.createdByAdScriptExplanation);
    case "MatchedBlockingRule":
      return i18nString6(UIStrings6.matchedBlockingRuleExplanation);
    case "ParentIsAd":
      return i18nString6(UIStrings6.parentIsAdExplanation);
  }
}
function maybeRenderAdStatus(adFrameType, adFrameStatus) {
  if (adFrameType === void 0 || adFrameType === "none") {
    return nothing3;
  }
  const typeStrings = getAdFrameTypeStrings(adFrameType);
  const rows = [html3`<div title=${typeStrings.description}>${typeStrings.value}</div>`];
  for (const explanation of adFrameStatus?.explanations || []) {
    rows.push(html3`<div>${getAdFrameExplanationString(explanation)}</div>`);
  }
  return html3`
      <devtools-report-key>${i18nString6(UIStrings6.adStatus)}</devtools-report-key>
      <devtools-report-value class="ad-status-list" jslog=${VisualLogging3.section("ad-status")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString6(UIStrings6.adStatus) }}>
        </devtools-expandable-list>
      </devtools-report-value>`;
}
function maybeRenderCreatorAdScriptAncestry(adFrameType, target, adScriptAncestry) {
  if (adFrameType === "none") {
    return nothing3;
  }
  if (!target || !adScriptAncestry || adScriptAncestry.ancestryChain.length === 0) {
    return nothing3;
  }
  const rows = adScriptAncestry.ancestryChain.map((adScriptId) => {
    return html3`<div>
      <devtools-widget .widgetConfig=${widgetConfig2(Components2.Linkifier.ScriptLocationLink, {
      target,
      scriptId: adScriptId.scriptId,
      options: { jslogContext: "ad-script" }
    })}>
      </devtools-widget>
    </div>`;
  });
  const shouldRenderFilterlistRule = adScriptAncestry.rootScriptFilterlistRule !== void 0;
  return html3`
      <devtools-report-key>${i18nString6(UIStrings6.creatorAdScriptAncestry)}</devtools-report-key>
      <devtools-report-value class="creator-ad-script-ancestry-list" jslog=${VisualLogging3.section("creator-ad-script-ancestry")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString6(UIStrings6.creatorAdScriptAncestry) }}>
        </devtools-expandable-list>
      </devtools-report-value>
      ${shouldRenderFilterlistRule ? html3`
        <devtools-report-key>${i18nString6(UIStrings6.rootScriptFilterlistRule)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging3.section("root-script-filterlist-rule")}>${adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : nothing3}
    `;
}
function renderIsolationSection(input) {
  if (!input.frame) {
    return nothing3;
  }
  return html3`
      <devtools-report-section-header>${i18nString6(UIStrings6.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString6(UIStrings6.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isSecureContext() ? i18nString6(UIStrings6.yes) : i18nString6(UIStrings6.no)}\xA0${maybeRenderSecureContextExplanation(input.frame)}
      </devtools-report-value>
      <devtools-report-key>${i18nString6(UIStrings6.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isCrossOriginIsolated() ? i18nString6(UIStrings6.yes) : i18nString6(UIStrings6.no)}
      </devtools-report-value>
      ${maybeRenderCoopCoepCSPStatus(input.securityIsolationInfo)}
      <devtools-report-divider></devtools-report-divider>
    `;
}
function maybeRenderSecureContextExplanation(frame) {
  const explanation = getSecureContextExplanation(frame);
  if (explanation) {
    return html3`<span class="inline-comment">${explanation}</span>`;
  }
  return nothing3;
}
function getSecureContextExplanation(frame) {
  switch (frame?.getSecureContextType()) {
    case "Secure":
      return null;
    case "SecureLocalhost":
      return i18nString6(UIStrings6.localhostIsAlwaysASecureContext);
    case "InsecureAncestor":
      return i18nString6(UIStrings6.aFrameAncestorIsAnInsecure);
    case "InsecureScheme":
      return i18nString6(UIStrings6.theFramesSchemeIsInsecure);
  }
  return null;
}
function maybeRenderCoopCoepCSPStatus(info) {
  if (info) {
    return html3`
          ${maybeRenderCrossOriginStatus(
      info.coep,
      i18n11.i18n.lockedString("Cross-Origin Embedder Policy (COEP)"),
      "None"
      /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */
    )}
          ${maybeRenderCrossOriginStatus(
      info.coop,
      i18n11.i18n.lockedString("Cross-Origin Opener Policy (COOP)"),
      "UnsafeNone"
      /* Protocol.Network.CrossOriginOpenerPolicyValue.UnsafeNone */
    )}
          ${renderCSPSection(info.csp)}
        `;
  }
  return nothing3;
}
function maybeRenderCrossOriginStatus(info, policyName, noneValue) {
  if (!info) {
    return nothing3;
  }
  function crossOriginValueToString(value) {
    switch (value) {
      case "Credentialless":
        return "credentialless";
      case "None":
        return "none";
      case "RequireCorp":
        return "require-corp";
      case "NoopenerAllowPopups":
        return "noopenener-allow-popups";
      case "SameOrigin":
        return "same-origin";
      case "SameOriginAllowPopups":
        return "same-origin-allow-popups";
      case "SameOriginPlusCoep":
        return "same-origin-plus-coep";
      case "RestrictProperties":
        return "restrict-properties";
      case "RestrictPropertiesPlusCoep":
        return "restrict-properties-plus-coep";
      case "UnsafeNone":
        return "unsafe-none";
    }
  }
  const isEnabled = info.value !== noneValue;
  const isReportOnly = !isEnabled && info.reportOnlyValue !== noneValue;
  const endpoint = isEnabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
  return html3`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${crossOriginValueToString(isEnabled ? info.value : info.reportOnlyValue)}
        ${isReportOnly ? html3`<span class="inline-comment">report-only</span>` : nothing3}
        ${endpoint ? html3`<span class="inline-name">${i18nString6(UIStrings6.reportingTo)}</span>${endpoint}` : nothing3}
      </devtools-report-value>
    `;
}
function renderEffectiveDirectives(directives) {
  const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
  const result = [];
  for (const directive in parsedDirectives) {
    result.push(html3`
          <div>
            <span class="bold">${directive}</span>
            ${": " + parsedDirectives[directive]?.join(", ")}
          </div>`);
  }
  return result;
}
function renderSingleCSP(cspInfo, divider) {
  return html3`
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n11.i18n.lockedString("Content-Security-Policy") : html3`
          ${i18n11.i18n.lockedString("Content-Security-Policy-Report-Only")}
          <devtools-button
            .iconName=${"help"}
            class='help-button'
            .variant=${"icon"}
            .size=${"SMALL"}
            @click=${() => {
    window.location.href = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only";
  }}
            jslog=${VisualLogging3.link("learn-more.csp-report-only").track({ click: true })}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === "HTTP" ? i18n11.i18n.lockedString("HTTP header") : i18n11.i18n.lockedString("Meta tag")}
        ${renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html3`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing3}
    `;
}
function renderCSPSection(cspInfos) {
  return html3`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString6(UIStrings6.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${cspInfos?.length ? cspInfos.map((cspInfo, index) => renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html3`
        <devtools-report-key>
          ${i18n11.i18n.lockedString("Content-Security-Policy")}
        </devtools-report-key>
        <devtools-report-value>
          ${i18nString6(UIStrings6.none)}
        </devtools-report-value>
      `}
    `;
}
function renderApiAvailabilitySection(frame) {
  if (!frame) {
    return nothing3;
  }
  return html3`
      <devtools-report-section-header>
        ${i18nString6(UIStrings6.apiAvailability)}
      </devtools-report-section-header>
      <devtools-report-section>
        <span class="report-section">
          ${i18nString6(UIStrings6.availabilityOfCertainApisDepends)}
          <x-link
            href="https://web.dev/why-coop-coep/" class="link"
            jslog=${VisualLogging3.link("learn-more.coop-coep").track({ click: true })}>
            ${i18nString6(UIStrings6.learnMore)}
          </x-link>
        </span>
      </devtools-report-section>
      ${renderSharedArrayBufferAvailability(frame)}
      ${renderMeasureMemoryAvailability(frame)}
      <devtools-report-divider></devtools-report-divider>`;
}
function renderSharedArrayBufferAvailability(frame) {
  if (frame) {
    const features = frame.getGatedAPIFeatures();
    if (features) {
      let renderHint = function(frame2) {
        switch (frame2.getCrossOriginIsolatedContextType()) {
          case "Isolated":
            return nothing3;
          case "NotIsolated":
            if (sabAvailable) {
              return html3`
                  <span class="inline-comment">
                    ${i18nString6(UIStrings6.willRequireCrossoriginIsolated)}
                  </span>`;
            }
            return html3`<span class="inline-comment">${i18nString6(UIStrings6.requiresCrossoriginIsolated)}</span>`;
          case "NotIsolatedFeatureDisabled":
            if (!sabTransferAvailable) {
              return html3`
                  <span class="inline-comment">
                    ${i18nString6(UIStrings6.transferRequiresCrossoriginIsolatedPermission)}
                    <code> cross-origin-isolated</code>
                  </span>`;
            }
            break;
        }
        return nothing3;
      };
      const sabAvailable = features.includes(
        "SharedArrayBuffers"
        /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffers */
      );
      const sabTransferAvailable = sabAvailable && features.includes(
        "SharedArrayBuffersTransferAllowed"
        /* Protocol.Page.GatedAPIFeatures.SharedArrayBuffersTransferAllowed */
      );
      const availabilityText = sabTransferAvailable ? i18nString6(UIStrings6.availableTransferable) : sabAvailable ? i18nString6(UIStrings6.availableNotTransferable) : i18nString6(UIStrings6.unavailable);
      const tooltipText = sabTransferAvailable ? i18nString6(UIStrings6.sharedarraybufferConstructorIs) : sabAvailable ? i18nString6(UIStrings6.sharedarraybufferConstructorIsAvailable) : "";
      return html3`
          <devtools-report-key>SharedArrayBuffers</devtools-report-key>
          <devtools-report-value title=${tooltipText}>
            ${availabilityText}\xA0${renderHint(frame)}
          </devtools-report-value>
        `;
    }
  }
  return nothing3;
}
function renderMeasureMemoryAvailability(frame) {
  if (frame) {
    const measureMemoryAvailable = frame.isCrossOriginIsolated();
    const availabilityText = measureMemoryAvailable ? i18nString6(UIStrings6.available) : i18nString6(UIStrings6.unavailable);
    const tooltipText = measureMemoryAvailable ? i18nString6(UIStrings6.thePerformanceAPI) : i18nString6(UIStrings6.thePerformancemeasureuseragentspecificmemory);
    return html3`
        <devtools-report-key>${i18nString6(UIStrings6.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>\xA0<x-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslog=${VisualLogging3.link("learn-more.monitor-memory-usage").track({ click: true })}>${i18nString6(UIStrings6.learnMore)}</x-link>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function renderAdditionalInfoSection(frame) {
  if (!frame) {
    return nothing3;
  }
  return html3`
      <devtools-report-section-header
        title=${i18nString6(UIStrings6.thisAdditionalDebugging)}
      >${i18nString6(UIStrings6.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString6(UIStrings6.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${frame.id}>${frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
}
var FrameDetailsReportView = class extends UI5.Widget.Widget {
  #frame;
  #target = null;
  #creationStackTrace = null;
  #creationTarget = null;
  #securityIsolationInfo = null;
  #linkTargetDOMNode = null;
  #trials = null;
  #protocolMonitorExperimentEnabled = false;
  #permissionsPolicies = null;
  #linkifier = new Components2.Linkifier.Linkifier();
  #adScriptAncestry = null;
  #view;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element, { useShadowDom: true });
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled("protocol-monitor");
    this.#view = view;
  }
  set frame(frame) {
    this.#frame = frame;
    void this.#frame.getPermissionsPolicyState().then((permissionsPolicies) => {
      this.#permissionsPolicies = permissionsPolicies;
      this.requestUpdate();
    });
    const { creationStackTrace: rawCreationStackTrace, creationStackTraceTarget: creationTarget } = frame.getCreationStackTraceData();
    this.#creationTarget = creationTarget;
    if (rawCreationStackTrace) {
      void Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(rawCreationStackTrace, creationTarget).then((creationStackTrace) => {
        this.#creationStackTrace = creationStackTrace;
        this.requestUpdate();
      });
    }
    const networkManager = frame.resourceTreeModel().target().model(SDK6.NetworkManager.NetworkManager);
    void networkManager?.getSecurityIsolationStatus(frame.id).then((securityIsolationInfo) => {
      this.#securityIsolationInfo = securityIsolationInfo;
      this.requestUpdate();
    });
    void frame.getOwnerDOMNodeOrDocument().then((linkTargetDOMNode) => {
      this.#linkTargetDOMNode = linkTargetDOMNode;
      this.requestUpdate();
    });
    void frame.getOriginTrials().then((trials) => {
      this.#trials = trials;
      this.requestUpdate();
    });
    this.requestUpdate();
  }
  get frame() {
    return this.#frame;
  }
  async performUpdate() {
    const result = await this.#frame?.parentFrame()?.getAdScriptAncestry(this.#frame?.id);
    if (result && result.ancestryChain.length > 0) {
      this.#adScriptAncestry = result;
      const firstScript = this.#adScriptAncestry.ancestryChain[0];
      const debuggerModel = firstScript?.debuggerId ? await SDK6.DebuggerModel.DebuggerModel.modelForDebuggerId(firstScript.debuggerId) : null;
      this.#target = debuggerModel?.target() ?? null;
    }
    const frame = this.#frame;
    if (!frame) {
      return;
    }
    const frameRequest = frame.resourceForURL(frame.url)?.request;
    const input = {
      frame,
      target: this.#target,
      creationStackTrace: this.#creationStackTrace,
      creationTarget: this.#creationTarget,
      protocolMonitorExperimentEnabled: this.#protocolMonitorExperimentEnabled,
      permissionsPolicies: this.#permissionsPolicies,
      adScriptAncestry: this.#adScriptAncestry,
      linkifier: this.#linkifier,
      linkTargetDOMNode: this.#linkTargetDOMNode,
      trials: this.#trials,
      securityIsolationInfo: this.#securityIsolationInfo,
      onRevealInNetwork: frameRequest ? () => {
        const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(
          frameRequest,
          "headers-component"
          /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */
        );
        return Common5.Revealer.reveal(requestLocation);
      } : void 0,
      onRevealInSources: async () => {
        const sourceCode = this.#uiSourceCodeForFrame(frame);
        if (sourceCode) {
          await Common5.Revealer.reveal(sourceCode);
        }
      }
    };
    this.#view(input, void 0, this.contentElement);
  }
  #uiSourceCodeForFrame(frame) {
    for (const project of Workspace.Workspace.WorkspaceImpl.instance().projects()) {
      const projectTarget = Bindings2.NetworkProject.NetworkProject.getTargetForProject(project);
      if (projectTarget && projectTarget === frame.resourceTreeModel().target()) {
        const uiSourceCode = project.uiSourceCodeForURL(frame.url);
        if (uiSourceCode) {
          return uiSourceCode;
        }
      }
    }
    return null;
  }
};

// gen/front_end/panels/application/IndexedDBModel.js
var IndexedDBModel_exports = {};
__export(IndexedDBModel_exports, {
  Database: () => Database,
  DatabaseId: () => DatabaseId,
  Entry: () => Entry,
  Events: () => Events2,
  Index: () => Index,
  IndexedDBModel: () => IndexedDBModel,
  ObjectStore: () => ObjectStore
});
import * as Common6 from "./../../core/common/common.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
var DEFAULT_BUCKET = "";
var IndexedDBModel = class _IndexedDBModel extends SDK7.SDKModel.SDKModel {
  storageBucketModel;
  indexedDBAgent;
  storageAgent;
  // Used in web tests
  databasesInternal;
  databaseNamesByStorageKeyAndBucket;
  updatedStorageBuckets;
  throttler;
  enabled;
  constructor(target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageBucketModel = target.model(SDK7.StorageBucketsModel.StorageBucketsModel);
    this.indexedDBAgent = target.indexedDBAgent();
    this.storageAgent = target.storageAgent();
    this.databasesInternal = /* @__PURE__ */ new Map();
    this.databaseNamesByStorageKeyAndBucket = /* @__PURE__ */ new Map();
    this.updatedStorageBuckets = /* @__PURE__ */ new Set();
    this.throttler = new Common6.Throttler.Throttler(1e3);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static keyFromIDBKey(idbKey) {
    if (typeof idbKey === "undefined" || idbKey === null) {
      return void 0;
    }
    let key;
    switch (typeof idbKey) {
      case "number":
        key = {
          type: "number",
          number: idbKey
        };
        break;
      case "string":
        key = {
          type: "string",
          string: idbKey
        };
        break;
      case "object":
        if (idbKey instanceof Date) {
          key = {
            type: "date",
            date: idbKey.getTime()
          };
        } else if (Array.isArray(idbKey)) {
          const array = [];
          for (let i = 0; i < idbKey.length; ++i) {
            const nestedKey = _IndexedDBModel.keyFromIDBKey(idbKey[i]);
            if (nestedKey) {
              array.push(nestedKey);
            }
          }
          key = {
            type: "array",
            array
          };
        } else {
          return void 0;
        }
        break;
      default:
        return void 0;
    }
    return key;
  }
  static keyRangeFromIDBKeyRange(idbKeyRange) {
    return {
      lower: _IndexedDBModel.keyFromIDBKey(idbKeyRange.lower),
      upper: _IndexedDBModel.keyFromIDBKey(idbKeyRange.upper),
      lowerOpen: Boolean(idbKeyRange.lowerOpen),
      upperOpen: Boolean(idbKeyRange.upperOpen)
    };
  }
  static idbKeyPathFromKeyPath(keyPath) {
    let idbKeyPath;
    switch (keyPath.type) {
      case "null":
        idbKeyPath = null;
        break;
      case "string":
        idbKeyPath = keyPath.string;
        break;
      case "array":
        idbKeyPath = keyPath.array;
        break;
    }
    return idbKeyPath;
  }
  static keyPathStringFromIDBKeyPath(idbKeyPath) {
    if (typeof idbKeyPath === "string") {
      return '"' + idbKeyPath + '"';
    }
    if (idbKeyPath instanceof Array) {
      return '["' + idbKeyPath.join('", "') + '"]';
    }
    return null;
  }
  enable() {
    if (this.enabled) {
      return;
    }
    void this.indexedDBAgent.invoke_enable();
    if (this.storageBucketModel) {
      this.storageBucketModel.addEventListener("BucketAdded", this.storageBucketAdded, this);
      this.storageBucketModel.addEventListener("BucketRemoved", this.storageBucketRemoved, this);
      for (const { bucket } of this.storageBucketModel.getBuckets()) {
        this.addStorageBucket(bucket);
      }
    }
    this.enabled = true;
  }
  clearForStorageKey(storageKey) {
    if (!this.enabled || !this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      return;
    }
    for (const [storageBucketName] of this.databaseNamesByStorageKeyAndBucket.get(storageKey) || []) {
      const storageBucket = this.storageBucketModel?.getBucketByName(storageKey, storageBucketName ?? void 0)?.bucket;
      if (storageBucket) {
        this.removeStorageBucket(storageBucket);
      }
    }
    this.databaseNamesByStorageKeyAndBucket.delete(storageKey);
    const bucketInfos = this.storageBucketModel?.getBucketsForStorageKey(storageKey) || [];
    for (const { bucket } of bucketInfos) {
      this.addStorageBucket(bucket);
    }
  }
  async deleteDatabase(databaseId) {
    if (!this.enabled) {
      return;
    }
    await this.indexedDBAgent.invoke_deleteDatabase({ storageBucket: databaseId.storageBucket, databaseName: databaseId.name });
    void this.loadDatabaseNamesByStorageBucket(databaseId.storageBucket);
  }
  async refreshDatabaseNames() {
    for (const [storageKey] of this.databaseNamesByStorageKeyAndBucket) {
      const storageBucketNames = this.databaseNamesByStorageKeyAndBucket.get(storageKey)?.keys() || [];
      for (const storageBucketName of storageBucketNames) {
        const storageBucket = this.storageBucketModel?.getBucketByName(storageKey, storageBucketName ?? void 0)?.bucket;
        if (storageBucket) {
          await this.loadDatabaseNamesByStorageBucket(storageBucket);
        }
      }
    }
    this.dispatchEventToListeners(Events2.DatabaseNamesRefreshed);
  }
  refreshDatabase(databaseId) {
    void this.loadDatabase(databaseId, true);
  }
  async clearObjectStore(databaseId, objectStoreName) {
    await this.indexedDBAgent.invoke_clearObjectStore({ storageBucket: databaseId.storageBucket, databaseName: databaseId.name, objectStoreName });
  }
  async deleteEntries(databaseId, objectStoreName, idbKeyRange) {
    const keyRange = _IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
    await this.indexedDBAgent.invoke_deleteObjectStoreEntries({ storageBucket: databaseId.storageBucket, databaseName: databaseId.name, objectStoreName, keyRange });
  }
  storageBucketAdded({ data: { bucketInfo: { bucket } } }) {
    this.addStorageBucket(bucket);
  }
  storageBucketRemoved({ data: { bucketInfo: { bucket } } }) {
    this.removeStorageBucket(bucket);
  }
  addStorageBucket(storageBucket) {
    const { storageKey } = storageBucket;
    if (!this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      this.databaseNamesByStorageKeyAndBucket.set(storageKey, /* @__PURE__ */ new Map());
      void this.storageAgent.invoke_trackIndexedDBForStorageKey({ storageKey });
    }
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || /* @__PURE__ */ new Map();
    console.assert(!storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET));
    storageKeyBuckets.set(storageBucket.name ?? DEFAULT_BUCKET, /* @__PURE__ */ new Set());
    void this.loadDatabaseNamesByStorageBucket(storageBucket);
  }
  removeStorageBucket(storageBucket) {
    const { storageKey } = storageBucket;
    console.assert(this.databaseNamesByStorageKeyAndBucket.has(storageKey));
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || /* @__PURE__ */ new Map();
    console.assert(storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET));
    const databaseIds = storageKeyBuckets.get(storageBucket.name ?? DEFAULT_BUCKET) || /* @__PURE__ */ new Map();
    for (const databaseId of databaseIds) {
      this.databaseRemovedForStorageBucket(databaseId);
    }
    storageKeyBuckets.delete(storageBucket.name ?? DEFAULT_BUCKET);
    if (storageKeyBuckets.size === 0) {
      this.databaseNamesByStorageKeyAndBucket.delete(storageKey);
      void this.storageAgent.invoke_untrackIndexedDBForStorageKey({ storageKey });
    }
  }
  updateStorageKeyDatabaseNames(storageBucket, databaseNames) {
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageBucket.storageKey);
    if (storageKeyBuckets === void 0) {
      return;
    }
    const newDatabases = new Set(databaseNames.map((databaseName) => new DatabaseId(storageBucket, databaseName)));
    const oldDatabases = new Set(storageKeyBuckets.get(storageBucket.name ?? DEFAULT_BUCKET));
    storageKeyBuckets.set(storageBucket.name ?? DEFAULT_BUCKET, newDatabases);
    for (const database of oldDatabases) {
      if (!database.inSet(newDatabases)) {
        this.databaseRemovedForStorageBucket(database);
      }
    }
    for (const database of newDatabases) {
      if (!database.inSet(oldDatabases)) {
        this.databaseAddedForStorageBucket(database);
      }
    }
  }
  databases() {
    const result = [];
    for (const [, buckets] of this.databaseNamesByStorageKeyAndBucket) {
      for (const [, databases] of buckets) {
        for (const database of databases) {
          result.push(database);
        }
      }
    }
    return result;
  }
  databaseAddedForStorageBucket(databaseId) {
    this.dispatchEventToListeners(Events2.DatabaseAdded, { model: this, databaseId });
  }
  databaseRemovedForStorageBucket(databaseId) {
    this.dispatchEventToListeners(Events2.DatabaseRemoved, { model: this, databaseId });
  }
  async loadDatabaseNamesByStorageBucket(storageBucket) {
    const { storageKey } = storageBucket;
    const { databaseNames } = await this.indexedDBAgent.invoke_requestDatabaseNames({ storageBucket });
    if (!databaseNames) {
      return [];
    }
    if (!this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      return [];
    }
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || /* @__PURE__ */ new Map();
    if (!storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET)) {
      return [];
    }
    this.updateStorageKeyDatabaseNames(storageBucket, databaseNames);
    return databaseNames;
  }
  async loadDatabase(databaseId, entriesUpdated) {
    const databaseWithObjectStores = (await this.indexedDBAgent.invoke_requestDatabase({
      storageBucket: databaseId.storageBucket,
      databaseName: databaseId.name
    })).databaseWithObjectStores;
    if (!this.databaseNamesByStorageKeyAndBucket.get(databaseId.storageBucket.storageKey)?.has(databaseId.storageBucket.name ?? DEFAULT_BUCKET)) {
      return;
    }
    if (!databaseWithObjectStores) {
      return;
    }
    const databaseModel = new Database(databaseId, databaseWithObjectStores.version);
    this.databasesInternal.set(databaseId, databaseModel);
    for (const objectStore of databaseWithObjectStores.objectStores) {
      const objectStoreIDBKeyPath = _IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);
      const objectStoreModel = new ObjectStore(objectStore.name, objectStoreIDBKeyPath, objectStore.autoIncrement);
      for (let j = 0; j < objectStore.indexes.length; ++j) {
        const index = objectStore.indexes[j];
        const indexIDBKeyPath = _IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);
        const indexModel = new Index(index.name, indexIDBKeyPath, index.unique, index.multiEntry);
        objectStoreModel.indexes.set(indexModel.name, indexModel);
      }
      databaseModel.objectStores.set(objectStoreModel.name, objectStoreModel);
    }
    this.dispatchEventToListeners(Events2.DatabaseLoaded, { model: this, database: databaseModel, entriesUpdated });
  }
  loadObjectStoreData(databaseId, objectStoreName, idbKeyRange, skipCount, pageSize, callback) {
    void this.requestData(
      databaseId,
      databaseId.name,
      objectStoreName,
      /* indexName=*/
      void 0,
      idbKeyRange,
      skipCount,
      pageSize,
      callback
    );
  }
  loadIndexData(databaseId, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
    void this.requestData(databaseId, databaseId.name, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback);
  }
  async requestData(databaseId, databaseName, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback) {
    const keyRange = idbKeyRange ? _IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange) : void 0;
    const runtimeModel = this.target().model(SDK7.RuntimeModel.RuntimeModel);
    const response = await this.indexedDBAgent.invoke_requestData({
      storageBucket: databaseId.storageBucket,
      databaseName,
      objectStoreName,
      indexName,
      skipCount,
      pageSize,
      keyRange
    });
    if (!runtimeModel || !this.databaseNamesByStorageKeyAndBucket.get(databaseId.storageBucket.storageKey)?.has(databaseId.storageBucket.name ?? DEFAULT_BUCKET)) {
      return;
    }
    if (response.getError()) {
      console.error("IndexedDBAgent error: " + response.getError());
      return;
    }
    const dataEntries = response.objectStoreDataEntries;
    const entries = [];
    for (const dataEntry of dataEntries) {
      const key = runtimeModel?.createRemoteObject(dataEntry.key);
      const primaryKey = runtimeModel?.createRemoteObject(dataEntry.primaryKey);
      const value = runtimeModel?.createRemoteObject(dataEntry.value);
      if (!key || !primaryKey || !value) {
        return;
      }
      entries.push(new Entry(key, primaryKey, value));
    }
    callback(entries, response.hasMore);
  }
  async getMetadata(databaseId, objectStore) {
    const databaseName = databaseId.name;
    const objectStoreName = objectStore.name;
    const response = await this.indexedDBAgent.invoke_getMetadata({ storageBucket: databaseId.storageBucket, databaseName, objectStoreName });
    if (response.getError()) {
      console.error("IndexedDBAgent error: " + response.getError());
      return null;
    }
    return { entriesCount: response.entriesCount, keyGeneratorValue: response.keyGeneratorValue };
  }
  async refreshDatabaseListForStorageBucket(storageBucket) {
    const databaseNames = await this.loadDatabaseNamesByStorageBucket(storageBucket);
    for (const databaseName of databaseNames) {
      void this.loadDatabase(new DatabaseId(storageBucket, databaseName), false);
    }
  }
  indexedDBListUpdated({ storageKey, bucketId }) {
    const storageBucket = this.storageBucketModel?.getBucketById(bucketId)?.bucket;
    if (storageKey && storageBucket) {
      this.updatedStorageBuckets.add(storageBucket);
      void this.throttler.schedule(() => {
        const promises = Array.from(this.updatedStorageBuckets, (storageBucket2) => {
          void this.refreshDatabaseListForStorageBucket(storageBucket2);
        });
        this.updatedStorageBuckets.clear();
        return Promise.all(promises);
      });
    }
  }
  indexedDBContentUpdated({ bucketId, databaseName, objectStoreName }) {
    const storageBucket = this.storageBucketModel?.getBucketById(bucketId)?.bucket;
    if (storageBucket) {
      const databaseId = new DatabaseId(storageBucket, databaseName);
      this.dispatchEventToListeners(Events2.IndexedDBContentUpdated, { databaseId, objectStoreName, model: this });
    }
  }
  attributionReportingTriggerRegistered(_event) {
  }
  cacheStorageListUpdated(_event) {
  }
  cacheStorageContentUpdated(_event) {
  }
  interestGroupAccessed(_event) {
  }
  interestGroupAuctionEventOccurred(_event) {
  }
  interestGroupAuctionNetworkRequestCreated(_event) {
  }
  sharedStorageAccessed(_event) {
  }
  sharedStorageWorkletOperationExecutionFinished(_event) {
  }
  storageBucketCreatedOrUpdated(_event) {
  }
  storageBucketDeleted(_event) {
  }
  attributionReportingSourceRegistered(_event) {
  }
  attributionReportingReportSent(_event) {
  }
  attributionReportingVerboseDebugReportSent(_event) {
  }
};
SDK7.SDKModel.SDKModel.register(IndexedDBModel, { capabilities: 8192, autostart: false });
var Events2;
(function(Events3) {
  Events3["DatabaseAdded"] = "DatabaseAdded";
  Events3["DatabaseRemoved"] = "DatabaseRemoved";
  Events3["DatabaseLoaded"] = "DatabaseLoaded";
  Events3["DatabaseNamesRefreshed"] = "DatabaseNamesRefreshed";
  Events3["IndexedDBContentUpdated"] = "IndexedDBContentUpdated";
})(Events2 || (Events2 = {}));
var Entry = class {
  key;
  primaryKey;
  value;
  constructor(key, primaryKey, value) {
    this.key = key;
    this.primaryKey = primaryKey;
    this.value = value;
  }
};
var DatabaseId = class {
  storageBucket;
  name;
  constructor(storageBucket, name) {
    this.storageBucket = storageBucket;
    this.name = name;
  }
  inBucket(storageBucket) {
    return this.storageBucket.name === storageBucket.name;
  }
  equals(databaseId) {
    return this.name === databaseId.name && this.storageBucket.name === databaseId.storageBucket.name && this.storageBucket.storageKey === databaseId.storageBucket.storageKey;
  }
  inSet(databaseSet) {
    for (const database of databaseSet) {
      if (this.equals(database)) {
        return true;
      }
    }
    return false;
  }
};
var Database = class {
  databaseId;
  version;
  objectStores;
  constructor(databaseId, version) {
    this.databaseId = databaseId;
    this.version = version;
    this.objectStores = /* @__PURE__ */ new Map();
  }
};
var ObjectStore = class {
  name;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyPath;
  autoIncrement;
  indexes;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name, keyPath, autoIncrement) {
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
    this.indexes = /* @__PURE__ */ new Map();
  }
  get keyPathString() {
    return IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
  }
};
var Index = class {
  name;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyPath;
  unique;
  multiEntry;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name, keyPath, unique, multiEntry) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multiEntry = multiEntry;
  }
  get keyPathString() {
    return IndexedDBModel.keyPathStringFromIDBKeyPath(this.keyPath);
  }
};

// gen/front_end/panels/application/IndexedDBViews.js
var IndexedDBViews_exports = {};
__export(IndexedDBViews_exports, {
  IDBDataGridNode: () => IDBDataGridNode,
  IDBDataView: () => IDBDataView,
  IDBDatabaseView: () => IDBDatabaseView
});
import "./../../ui/components/report_view/report_view.js";
import "./../../ui/legacy/legacy.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as DataGrid3 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents5 from "./components/components.js";

// gen/front_end/panels/application/indexedDBViews.css.js
var indexedDBViews_css_default = `/*
 * Copyright 2012 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.indexed-db-data-view .data-view-toolbar {
  position: relative;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

.indexed-db-data-view .data-grid {
  flex: auto;
}

.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) {
  background-color: var(--sys-color-cdt-base-container);
}

.indexed-db-data-view .data-grid .data-container tr:nth-last-child(1) td {
  border: 0;
}

.indexed-db-data-view .data-grid .data-container tr:nth-last-child(2) td {
  border-bottom: 1px solid var(--sys-color-divider);
}

.indexed-db-data-view .data-grid:focus .data-container tr.selected {
  background-color: var(--sys-color-tonal-container);
  color: inherit;
}

.indexed-db-data-view .section,
.indexed-db-data-view .section > .header,
.indexed-db-data-view .section > .header .title {
  margin: 0;
  min-height: inherit;
  line-height: inherit;
}

.indexed-db-data-view .data-grid .data-container td .section .header .title {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.indexed-db-key-path {
  color: var(--sys-color-error);
  white-space: pre-wrap;
  unicode-bidi: -webkit-isolate;
}

.indexed-db-container {
  overflow: auto;
}

.indexed-db-header {
  min-width: 400px;
  flex-shrink: 0;
  flex-grow: 0;
}

.source-code.indexed-db-key-path {
  font-size: unset !important; /* stylelint-disable-line declaration-no-important */
}

.resources-toolbar {
  padding-right: 10px;
}

.object-store-summary-bar {
  flex: 0 0 27px;
  line-height: 27px;
  padding-left: 5px;
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/*# sourceURL=${import.meta.resolve("./indexedDBViews.css")} */`;

// gen/front_end/panels/application/IndexedDBViews.js
var { html: html4 } = Lit;
var UIStrings7 = {
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  version: "Version",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  objectStores: "Object stores",
  /**
   * @description Text of button in Indexed DBViews of the Application panel
   */
  deleteDatabase: "Delete database",
  /**
   * @description Text of button in Indexed DBViews of the Application panel
   */
  refreshDatabase: "Refresh database",
  /**
   * @description Text in Application panel IndexedDB delete confirmation dialog
   * @example {msb} PH1
   */
  confirmDeleteDatabase: 'Delete "{PH1}" database?',
  /**
   * @description Explanation text in Application panel IndexedDB delete confirmation dialog
   */
  databaseWillBeRemoved: "The selected database and contained data will be removed.",
  /**
   * @description Title of the confirmation dialog in the IndexedDB tab of the Application panel
   *              that the user is about to clear an object store and this cannot be undone.
   * @example {table1} PH1
   */
  confirmClearObjectStore: 'Clear "{PH1}" object store?',
  /**
   * @description Description in the confirmation dialog in the IndexedDB tab of the Application
   *              panel that the user is about to clear an object store and this cannot be undone.
   */
  objectStoreWillBeCleared: "The data contained in the selected object store will be removed.",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  idb: "IDB",
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh",
  /**
   * @description Tooltip text that appears when hovering over the delete button in the Indexed DBViews of the Application panel
   */
  deleteSelected: "Delete selected",
  /**
   * @description Tooltip text that appears when hovering over the clear button in the Indexed DBViews of the Application panel
   */
  clearObjectStore: "Clear object store",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  dataMayBeStale: "Data may be stale",
  /**
   * @description Title of needs refresh in indexed dbviews of the application panel
   */
  someEntriesMayHaveBeenModified: "Some entries may have been modified",
  /**
   * @description Text in DOMStorage Items View of the Application panel
   */
  keyString: "Key",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  primaryKey: "Primary key",
  /**
   * @description Text for the value of something
   */
  valueString: "Value",
  /**
   * @description Data grid name for Indexed DB data grids
   */
  indexedDb: "Indexed DB",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  keyPath: "Key path: ",
  /**
   * @description Tooltip text that appears when hovering over the triangle left button in the Indexed DBViews of the Application panel
   */
  showPreviousPage: "Show previous page",
  /**
   * @description Tooltip text that appears when hovering over the triangle right button in the Indexed DBViews of the Application panel
   */
  showNextPage: "Show next page",
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  filterByKey: "Filter by key (show keys greater or equal to)",
  /**
   * @description Text in Context menu for expanding objects in IndexedDB tables
   */
  expandRecursively: "Expand Recursively",
  /**
   * @description Text in Context menu for collapsing objects in IndexedDB tables
   */
  collapse: "Collapse",
  /**
   * @description Span text content in Indexed DBViews of the Application panel
   * @example {2} PH1
   */
  totalEntriesS: "Total entries: {PH1}",
  /**
   * @description Text in Indexed DBViews of the Application panel
   * @example {2} PH1
   */
  keyGeneratorValueS: "Key generator value: {PH1}"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/application/IndexedDBViews.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var IDBDatabaseView = class extends ApplicationComponents5.StorageMetadataView.StorageMetadataView {
  model;
  database;
  constructor(model, database) {
    super();
    this.model = model;
    this.setShowOnlyBucket(false);
    if (database) {
      this.update(database);
    }
  }
  getTitle() {
    return this.database?.databaseId.name;
  }
  async renderReportContent() {
    if (!this.database) {
      return Lit.nothing;
    }
    return html4`
      ${await super.renderReportContent()}
      ${this.key(i18nString7(UIStrings7.version))}
      ${this.value(this.database.version.toString())}
      ${this.key(i18nString7(UIStrings7.objectStores))}
      ${this.value(this.database.objectStores.size.toString())}
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section>
      <devtools-button
          aria-label=${i18nString7(UIStrings7.deleteDatabase)}
          .variant=${"outlined"}
          @click=${this.deleteDatabase}
          jslog=${VisualLogging4.action("delete-database").track({
      click: true
    })}>
        ${i18nString7(UIStrings7.deleteDatabase)}
      </devtools-button>&nbsp;
      <devtools-button
          aria-label=${i18nString7(UIStrings7.refreshDatabase)}
          .variant=${"outlined"}
          @click=${this.refreshDatabaseButtonClicked}
          jslog=${VisualLogging4.action("refresh-database").track({
      click: true
    })}>
        ${i18nString7(UIStrings7.refreshDatabase)}
      </devtools-button>
      </devtools-report-section>
      `;
  }
  refreshDatabaseButtonClicked() {
    this.model.refreshDatabase(this.database.databaseId);
  }
  update(database) {
    this.database = database;
    const bucketInfo = this.model.target().model(SDK8.StorageBucketsModel.StorageBucketsModel)?.getBucketByName(database.databaseId.storageBucket.storageKey, database.databaseId.storageBucket.name);
    if (bucketInfo) {
      this.setStorageBucket(bucketInfo);
    } else {
      this.setStorageKey(database.databaseId.storageBucket.storageKey);
    }
    void this.render().then(() => this.updatedForTests());
  }
  updatedForTests() {
  }
  async deleteDatabase() {
    const ok = await UI6.UIUtils.ConfirmDialog.show(i18nString7(UIStrings7.databaseWillBeRemoved), i18nString7(UIStrings7.confirmDeleteDatabase, { PH1: this.database.databaseId.name }), this, { jslogContext: "delete-database-confirmation" });
    if (ok) {
      void this.model.deleteDatabase(this.database.databaseId);
    }
  }
  wasShown() {
    super.wasShown();
  }
};
customElements.define("devtools-idb-database-view", IDBDatabaseView);
var IDBDataView = class extends UI6.View.SimpleView {
  model;
  databaseId;
  isIndex;
  refreshObjectStoreCallback;
  refreshButton;
  deleteSelectedButton;
  clearButton;
  needsRefresh;
  clearingObjectStore;
  pageSize;
  skipCount;
  // Used in Web Tests
  entries;
  objectStore;
  index;
  keyInput;
  dataGrid;
  lastPageSize;
  lastSkipCount;
  pageBackButton;
  pageForwardButton;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastKey;
  summaryBarElement;
  constructor(model, databaseId, objectStore, index, refreshObjectStoreCallback) {
    super({
      title: i18nString7(UIStrings7.idb),
      viewId: "idb",
      jslog: `${VisualLogging4.pane("indexed-db-data-view")}`
    });
    this.registerRequiredCSS(indexedDBViews_css_default);
    this.model = model;
    this.databaseId = databaseId;
    this.isIndex = Boolean(index);
    this.refreshObjectStoreCallback = refreshObjectStoreCallback;
    this.element.classList.add("indexed-db-data-view", "storage-view");
    this.refreshButton = new UI6.Toolbar.ToolbarButton(i18nString7(UIStrings7.refresh), "refresh");
    this.refreshButton.addEventListener("Click", this.refreshButtonClicked, this);
    this.refreshButton.element.setAttribute("jslog", `${VisualLogging4.action("refresh").track({ click: true })}`);
    this.deleteSelectedButton = new UI6.Toolbar.ToolbarButton(i18nString7(UIStrings7.deleteSelected), "bin");
    this.deleteSelectedButton.addEventListener("Click", (_event) => {
      void this.deleteButtonClicked(null);
    });
    this.deleteSelectedButton.element.setAttribute("jslog", `${VisualLogging4.action("delete-selected").track({ click: true })}`);
    this.clearButton = new UI6.Toolbar.ToolbarButton(i18nString7(UIStrings7.clearObjectStore), "clear");
    this.clearButton.addEventListener("Click", () => {
      void this.clearButtonClicked();
    }, this);
    this.clearButton.element.setAttribute("jslog", `${VisualLogging4.action("clear-all").track({ click: true })}`);
    const refreshIcon = UI6.UIUtils.createIconLabel({
      title: i18nString7(UIStrings7.dataMayBeStale),
      iconName: "warning",
      color: "var(--icon-warning)",
      width: "20px",
      height: "20px"
    });
    this.needsRefresh = new UI6.Toolbar.ToolbarItem(refreshIcon);
    this.needsRefresh.setVisible(false);
    this.needsRefresh.setTitle(i18nString7(UIStrings7.someEntriesMayHaveBeenModified));
    this.clearingObjectStore = false;
    this.createEditorToolbar();
    this.pageSize = 50;
    this.skipCount = 0;
    this.update(objectStore, index);
    this.entries = [];
  }
  createDataGrid() {
    const keyPath = this.isIndex && this.index ? this.index.keyPath : this.objectStore.keyPath;
    const columns = [];
    const columnDefaults = {
      title: void 0,
      titleDOMFragment: void 0,
      sortable: false,
      sort: void 0,
      align: void 0,
      width: void 0,
      fixedWidth: void 0,
      editable: void 0,
      nonSelectable: void 0,
      longText: void 0,
      disclosure: void 0,
      weight: void 0,
      allowInSortByEvenWhenHidden: void 0,
      dataType: void 0,
      defaultWeight: void 0
    };
    columns.push({ ...columnDefaults, id: "number", title: "#", sortable: false, width: "50px" });
    columns.push({
      ...columnDefaults,
      id: "key",
      titleDOMFragment: this.keyColumnHeaderFragment(i18nString7(UIStrings7.keyString), keyPath),
      sortable: false
    });
    if (this.isIndex) {
      columns.push({
        ...columnDefaults,
        id: "primary-key",
        titleDOMFragment: this.keyColumnHeaderFragment(i18nString7(UIStrings7.primaryKey), this.objectStore.keyPath),
        sortable: false
      });
    }
    const title = i18nString7(UIStrings7.valueString);
    columns.push({ ...columnDefaults, id: "value", title, sortable: false });
    const dataGrid = new DataGrid3.DataGrid.DataGridImpl({
      displayName: i18nString7(UIStrings7.indexedDb),
      columns,
      deleteCallback: this.deleteButtonClicked.bind(this),
      refreshCallback: this.updateData.bind(this, true)
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener("SelectedNode", () => {
      this.updateToolbarEnablement();
    }, this);
    return dataGrid;
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyColumnHeaderFragment(prefix, keyPath) {
    const keyColumnHeaderFragment = document.createDocumentFragment();
    UI6.UIUtils.createTextChild(keyColumnHeaderFragment, prefix);
    if (keyPath === null) {
      return keyColumnHeaderFragment;
    }
    UI6.UIUtils.createTextChild(keyColumnHeaderFragment, " (" + i18nString7(UIStrings7.keyPath));
    if (Array.isArray(keyPath)) {
      UI6.UIUtils.createTextChild(keyColumnHeaderFragment, "[");
      for (let i = 0; i < keyPath.length; ++i) {
        if (i !== 0) {
          UI6.UIUtils.createTextChild(keyColumnHeaderFragment, ", ");
        }
        keyColumnHeaderFragment.appendChild(this.keyPathStringFragment(keyPath[i]));
      }
      UI6.UIUtils.createTextChild(keyColumnHeaderFragment, "]");
    } else {
      const keyPathString = keyPath;
      keyColumnHeaderFragment.appendChild(this.keyPathStringFragment(keyPathString));
    }
    UI6.UIUtils.createTextChild(keyColumnHeaderFragment, ")");
    return keyColumnHeaderFragment;
  }
  keyPathStringFragment(keyPathString) {
    const keyPathStringFragment = document.createDocumentFragment();
    UI6.UIUtils.createTextChild(keyPathStringFragment, '"');
    const keyPathSpan = keyPathStringFragment.createChild("span", "source-code indexed-db-key-path");
    keyPathSpan.textContent = keyPathString;
    UI6.UIUtils.createTextChild(keyPathStringFragment, '"');
    return keyPathStringFragment;
  }
  createEditorToolbar() {
    const editorToolbar = this.element.createChild("devtools-toolbar", "data-view-toolbar");
    editorToolbar.setAttribute("jslog", `${VisualLogging4.toolbar()}`);
    editorToolbar.appendToolbarItem(this.refreshButton);
    editorToolbar.appendToolbarItem(this.clearButton);
    editorToolbar.appendToolbarItem(this.deleteSelectedButton);
    editorToolbar.appendToolbarItem(new UI6.Toolbar.ToolbarSeparator());
    this.pageBackButton = new UI6.Toolbar.ToolbarButton(i18nString7(UIStrings7.showPreviousPage), "triangle-left", void 0, "prev-page");
    this.pageBackButton.addEventListener("Click", this.pageBackButtonClicked, this);
    editorToolbar.appendToolbarItem(this.pageBackButton);
    this.pageForwardButton = new UI6.Toolbar.ToolbarButton(i18nString7(UIStrings7.showNextPage), "triangle-right", void 0, "next-page");
    this.pageForwardButton.setEnabled(false);
    this.pageForwardButton.addEventListener("Click", this.pageForwardButtonClicked, this);
    editorToolbar.appendToolbarItem(this.pageForwardButton);
    this.keyInput = new UI6.Toolbar.ToolbarFilter(i18nString7(UIStrings7.filterByKey), 0.5);
    this.keyInput.addEventListener("TextChanged", this.updateData.bind(this, false));
    editorToolbar.appendToolbarItem(this.keyInput);
    editorToolbar.appendToolbarItem(new UI6.Toolbar.ToolbarSeparator());
    editorToolbar.appendToolbarItem(this.needsRefresh);
  }
  pageBackButtonClicked() {
    this.skipCount = Math.max(0, this.skipCount - this.pageSize);
    this.updateData(false);
  }
  pageForwardButtonClicked() {
    this.skipCount = this.skipCount + this.pageSize;
    this.updateData(false);
  }
  populateContextMenu(contextMenu, gridNode) {
    const node = gridNode;
    if (node.valueObjectPresentation) {
      contextMenu.revealSection().appendItem(i18nString7(UIStrings7.expandRecursively), () => {
        if (!node.valueObjectPresentation) {
          return;
        }
        void node.valueObjectPresentation.objectTreeElement().expandRecursively();
      }, { jslogContext: "expand-recursively" });
      contextMenu.revealSection().appendItem(i18nString7(UIStrings7.collapse), () => {
        if (!node.valueObjectPresentation) {
          return;
        }
        node.valueObjectPresentation.objectTreeElement().collapse();
      }, { jslogContext: "collapse" });
    }
  }
  refreshData() {
    this.updateData(true);
  }
  update(objectStore = null, index = null) {
    if (!objectStore) {
      return;
    }
    this.objectStore = objectStore;
    this.index = index;
    if (this.dataGrid) {
      this.dataGrid.asWidget().detach();
    }
    this.dataGrid = this.createDataGrid();
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));
    this.dataGrid.asWidget().show(this.element);
    this.skipCount = 0;
    this.updateData(true);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseKey(keyString) {
    let result;
    try {
      result = JSON.parse(keyString);
    } catch {
      result = keyString;
    }
    return result;
  }
  updateData(force) {
    const key = this.parseKey(this.keyInput.value());
    const pageSize = this.pageSize;
    let skipCount = this.skipCount;
    let selected = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.data["number"] : 0;
    selected = Math.max(selected, this.skipCount);
    this.clearButton.setEnabled(!this.isIndex);
    if (!force && this.lastKey === key && this.lastPageSize === pageSize && this.lastSkipCount === skipCount) {
      return;
    }
    if (this.lastKey !== key || this.lastPageSize !== pageSize) {
      skipCount = 0;
      this.skipCount = 0;
    }
    this.lastKey = key;
    this.lastPageSize = pageSize;
    this.lastSkipCount = skipCount;
    function callback(entries, hasMore) {
      this.clear();
      this.entries = entries;
      let selectedNode = null;
      for (let i = 0; i < entries.length; ++i) {
        const data = {};
        data["number"] = i + skipCount;
        data["key"] = entries[i].key;
        data["primary-key"] = entries[i].primaryKey;
        data["value"] = entries[i].value;
        const node = new IDBDataGridNode(data);
        this.dataGrid.rootNode().appendChild(node);
        if (data["number"] <= selected) {
          selectedNode = node;
        }
      }
      if (selectedNode) {
        selectedNode.select();
      }
      this.pageBackButton.setEnabled(Boolean(skipCount));
      this.pageForwardButton.setEnabled(hasMore);
      this.needsRefresh.setVisible(false);
      this.updateToolbarEnablement();
      this.updatedDataForTests();
    }
    const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this.isIndex && this.index) {
      this.model.loadIndexData(this.databaseId, this.objectStore.name, this.index.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    } else {
      this.model.loadObjectStoreData(this.databaseId, this.objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    }
    void this.model.getMetadata(this.databaseId, this.objectStore).then(this.updateSummaryBar.bind(this));
  }
  updateSummaryBar(metadata) {
    if (!this.summaryBarElement) {
      this.summaryBarElement = this.element.createChild("div", "object-store-summary-bar");
    }
    this.summaryBarElement.removeChildren();
    if (!metadata) {
      return;
    }
    const separator = "\u2002\u2758\u2002";
    const span = this.summaryBarElement.createChild("span");
    span.textContent = i18nString7(UIStrings7.totalEntriesS, { PH1: String(metadata.entriesCount) });
    if (this.objectStore.autoIncrement) {
      span.textContent += separator;
      span.textContent += i18nString7(UIStrings7.keyGeneratorValueS, { PH1: String(metadata.keyGeneratorValue) });
    }
  }
  updatedDataForTests() {
  }
  refreshButtonClicked() {
    this.updateData(true);
  }
  async clearButtonClicked() {
    const ok = await UI6.UIUtils.ConfirmDialog.show(i18nString7(UIStrings7.objectStoreWillBeCleared), i18nString7(UIStrings7.confirmClearObjectStore, { PH1: this.objectStore.name }), this.element, { jslogContext: "clear-object-store-confirmation" });
    if (ok) {
      this.clearButton.setEnabled(false);
      this.clearingObjectStore = true;
      await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
      this.clearingObjectStore = false;
      this.clearButton.setEnabled(true);
      this.updateData(true);
    }
  }
  markNeedsRefresh() {
    if (this.clearingObjectStore) {
      return;
    }
    this.needsRefresh.setVisible(true);
  }
  async resolveArrayKey(key) {
    const { properties } = await key.getOwnProperties(
      false
      /* generatePreview */
    );
    if (!properties) {
      return [];
    }
    const result = [];
    const propertyPromises = properties.filter((property) => !isNaN(Number(property.name))).map(async (property) => {
      const value = property.value;
      if (!value) {
        return;
      }
      let propertyValue;
      if (value.subtype === "array") {
        propertyValue = await this.resolveArrayKey(value);
      } else {
        propertyValue = value.value;
      }
      result[Number(property.name)] = propertyValue;
    });
    await Promise.all(propertyPromises);
    return result;
  }
  async deleteButtonClicked(node) {
    if (!node) {
      node = this.dataGrid.selectedNode;
      if (!node) {
        return;
      }
    }
    const key = this.isIndex ? node.data["primary-key"] : node.data.key;
    const keyValue = key.subtype === "array" ? await this.resolveArrayKey(key) : key.value;
    await this.model.deleteEntries(this.databaseId, this.objectStore.name, window.IDBKeyRange.only(keyValue));
    this.refreshObjectStoreCallback();
  }
  clear() {
    this.dataGrid.rootNode().removeChildren();
    this.entries = [];
  }
  updateToolbarEnablement() {
    const empty = !this.dataGrid || this.dataGrid.rootNode().children.length === 0;
    this.deleteSelectedButton.setEnabled(!empty && this.dataGrid.selectedNode !== null);
  }
};
var IDBDataGridNode = class extends DataGrid3.DataGrid.DataGridNode {
  selectable;
  valueObjectPresentation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(data) {
    super(data, false);
    this.selectable = true;
    this.valueObjectPresentation = null;
  }
  createCell(columnIdentifier) {
    const cell = super.createCell(columnIdentifier);
    const value = this.data[columnIdentifier];
    switch (columnIdentifier) {
      case "value": {
        cell.removeChildren();
        const objectPropSection = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPropertiesSection(
          value,
          void 0,
          true,
          true
          /* readOnly */
        );
        cell.appendChild(objectPropSection.element);
        this.valueObjectPresentation = objectPropSection;
        break;
      }
      case "key":
      case "primary-key": {
        cell.removeChildren();
        const objectElement = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.defaultObjectPresentation(
          value,
          void 0,
          true,
          true
          /* readOnly */
        );
        cell.appendChild(objectElement);
        break;
      }
    }
    return cell;
  }
};

// gen/front_end/panels/application/InterestGroupStorageModel.js
var InterestGroupStorageModel_exports = {};
__export(InterestGroupStorageModel_exports, {
  InterestGroupStorageModel: () => InterestGroupStorageModel
});
import * as SDK9 from "./../../core/sdk/sdk.js";
var InterestGroupStorageModel = class extends SDK9.SDKModel.SDKModel {
  storageAgent;
  enabled;
  constructor(target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageAgent = target.storageAgent();
    this.enabled = false;
  }
  enable() {
    if (this.enabled) {
      return;
    }
    void this.storageAgent.invoke_setInterestGroupTracking({ enable: true });
  }
  disable() {
    if (!this.enabled) {
      return;
    }
    void this.storageAgent.invoke_setInterestGroupTracking({ enable: false });
  }
  interestGroupAccessed(event) {
    this.dispatchEventToListeners("InterestGroupAccess", event);
  }
  attributionReportingTriggerRegistered(_event) {
  }
  indexedDBListUpdated(_event) {
  }
  indexedDBContentUpdated(_event) {
  }
  interestGroupAuctionEventOccurred(_event) {
  }
  interestGroupAuctionNetworkRequestCreated(_event) {
  }
  cacheStorageListUpdated(_event) {
  }
  cacheStorageContentUpdated(_event) {
  }
  sharedStorageAccessed(_event) {
  }
  sharedStorageWorkletOperationExecutionFinished(_event) {
  }
  storageBucketCreatedOrUpdated(_event) {
  }
  storageBucketDeleted(_event) {
  }
  attributionReportingSourceRegistered(_event) {
  }
  attributionReportingReportSent(_event) {
  }
  attributionReportingVerboseDebugReportSent(_event) {
  }
};
SDK9.SDKModel.SDKModel.register(InterestGroupStorageModel, { capabilities: 8192, autostart: false });

// gen/front_end/panels/application/InterestGroupTreeElement.js
var InterestGroupTreeElement_exports = {};
__export(InterestGroupTreeElement_exports, {
  InterestGroupTreeElement: () => InterestGroupTreeElement,
  i18nString: () => i18nString9
});
import * as Host4 from "./../../core/host/host.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import { createIcon as createIcon3 } from "./../../ui/kit/kit.js";

// gen/front_end/panels/application/InterestGroupStorageView.js
var InterestGroupStorageView_exports = {};
__export(InterestGroupStorageView_exports, {
  InterestGroupStorageView: () => InterestGroupStorageView
});
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents6 from "./components/components.js";

// gen/front_end/panels/application/interestGroupStorageView.css.js
var interestGroupStorageView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

devtools-interest-group-access-grid {
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./interestGroupStorageView.css")} */`;

// gen/front_end/panels/application/InterestGroupStorageView.js
var UIStrings8 = {
  /**
   * @description Placeholder text shown when nothing has been selected for display
   *details.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  noValueSelected: "No interest group selected",
  /**
   * @description Placeholder text instructing the user how to display interest group
   *details.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  clickToDisplayBody: "Select any interest group event to display the group's current state",
  /**
   * @description Placeholder text telling the user no details are available for
   *the selected interest group.
   */
  noDataAvailable: "No details available",
  /**
   * @description Placeholder text explaining to the user a potential reason for not having details on
   * the interest groups.
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction.
   */
  noDataDescription: "The browser may have left the group."
};
var str_8 = i18n15.i18n.registerUIStrings("panels/application/InterestGroupStorageView.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
function eventEquals(a, b) {
  return a.accessTime === b.accessTime && a.type === b.type && a.ownerOrigin === b.ownerOrigin && a.name === b.name;
}
var InterestGroupStorageView = class extends UI7.SplitWidget.SplitWidget {
  interestGroupGrid = new ApplicationComponents6.InterestGroupAccessGrid.InterestGroupAccessGrid();
  events = [];
  detailsGetter;
  noDataView;
  noDisplayView;
  constructor(detailsGetter) {
    super(
      /* isVertical */
      false,
      /* secondIsSidebar: */
      true
    );
    this.element.setAttribute("jslog", `${VisualLogging5.pane("interest-groups")}`);
    this.detailsGetter = detailsGetter;
    const topPanel = new UI7.Widget.VBox();
    this.noDisplayView = new UI7.EmptyWidget.EmptyWidget(i18nString8(UIStrings8.noValueSelected), i18nString8(UIStrings8.clickToDisplayBody));
    this.noDataView = new UI7.EmptyWidget.EmptyWidget(i18nString8(UIStrings8.noDataAvailable), i18nString8(UIStrings8.noDataDescription));
    topPanel.setMinimumSize(0, 120);
    this.setMainWidget(topPanel);
    this.noDisplayView.setMinimumSize(0, 80);
    this.setSidebarWidget(this.noDisplayView);
    this.noDataView.setMinimumSize(0, 80);
    this.noDisplayView.contentElement.setAttribute("jslog", `${VisualLogging5.pane("details").track({ resize: true })}`);
    this.noDataView.contentElement.setAttribute("jslog", `${VisualLogging5.pane("details").track({ resize: true })}`);
    this.hideSidebar();
    topPanel.contentElement.appendChild(this.interestGroupGrid);
    this.interestGroupGrid.addEventListener("select", this.onFocus.bind(this));
  }
  wasShown() {
    super.wasShown();
    const mainWidget = this.mainWidget();
    if (mainWidget) {
      mainWidget.registerRequiredCSS(interestGroupStorageView_css_default);
    }
  }
  addEvent(event) {
    if (this.showMode() !== "Both") {
      this.showBoth();
    }
    const foundEvent = this.events.find((t) => eventEquals(t, event));
    if (!foundEvent) {
      this.events.push(event);
      this.interestGroupGrid.data = this.events;
    }
  }
  clearEvents() {
    this.events = [];
    this.interestGroupGrid.data = this.events;
    this.setSidebarWidget(this.noDisplayView);
    this.sidebarUpdatedForTesting();
  }
  async onFocus(event) {
    const focusedEvent = event;
    const { ownerOrigin, name, type: eventType } = focusedEvent.detail;
    let details = null;
    if (eventType !== "additionalBid" && eventType !== "additionalBidWin" && eventType !== "topLevelAdditionalBid") {
      details = await this.detailsGetter.getInterestGroupDetails(ownerOrigin, name);
    }
    if (details) {
      const jsonView = await SourceFrame.JSONView.JSONView.createView(JSON.stringify(details));
      jsonView?.setMinimumSize(0, 40);
      if (jsonView) {
        jsonView.contentElement.setAttribute("jslog", `${VisualLogging5.pane("details").track({ resize: true })}`);
        this.setSidebarWidget(jsonView);
      }
    } else {
      this.setSidebarWidget(this.noDataView);
    }
    this.sidebarUpdatedForTesting();
  }
  getEventsForTesting() {
    return this.events;
  }
  getInterestGroupGridForTesting() {
    return this.interestGroupGrid;
  }
  sidebarUpdatedForTesting() {
  }
};

// gen/front_end/panels/application/InterestGroupTreeElement.js
var UIStrings9 = {
  /**
   * @description Label for an item in the Application Panel Sidebar of the Application panel
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction. (https://developer.chrome.com/blog/fledge-api/)
   */
  interestGroups: "Interest groups"
};
var str_9 = i18n17.i18n.registerUIStrings("panels/application/InterestGroupTreeElement.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var InterestGroupTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString9(UIStrings9.interestGroups), false, "interest-groups");
    const interestGroupIcon = createIcon3("database");
    this.setLeadingIcons([interestGroupIcon]);
    this.view = new InterestGroupStorageView(this);
  }
  get itemURL() {
    return "interest-groups://";
  }
  async getInterestGroupDetails(owner, name) {
    const mainTarget = SDK10.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return null;
    }
    const response = await mainTarget.storageAgent().invoke_getInterestGroupDetails({ ownerOrigin: owner, name });
    return response.details;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.showView(this.view);
    Host4.userMetrics.panelShown("interest-groups");
    return false;
  }
  addEvent(event) {
    this.view.addEvent(event);
  }
  clearEvents() {
    this.view.clearEvents();
  }
};

// gen/front_end/panels/application/OpenedWindowDetailsView.js
var OpenedWindowDetailsView_exports = {};
__export(OpenedWindowDetailsView_exports, {
  OpenedWindowDetailsView: () => OpenedWindowDetailsView,
  WorkerDetailsView: () => WorkerDetailsView
});
import * as Common7 from "./../../core/common/common.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import { createIcon as createIcon4 } from "./../../ui/kit/kit.js";
import * as UI8 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/application/openedWindowDetailsView.css.js
var openedWindowDetailsView_css_default = `/*
 * Copyright 2020 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.report-content-box {
  overflow: initial;
}

.report-field-name {
  flex: 0 0 200px;
}

.report-field-value {
  user-select: text;
  display: flex;
}

.report-field .inline-name {
  color: var(--sys-color-state-disabled);
  padding-left: 2ex;
  user-select: none;
  white-space: pre-line;
}

.report-field .inline-name::after {
  content: ":\\A0";
}

.report-field .inline-comment {
  color: var(--sys-color-token-subtle);
  padding-left: 1ex;
  white-space: pre-line;
}

.report-field .inline-comment::before {
  content: "(";
}

.report-field .inline-comment::after {
  content: ")";
}

.report-field .inline-span {
  color: var(--sys-color-token-subtle);
  padding-left: 1ex;
  white-space: pre-line;
}

.report-field-value-link {
  display: inline-block;
}

.icon-link.devtools-link {
  background-color: var(--sys-color-primary);
  vertical-align: sub;
}

.frame-details-container {
  overflow: auto;
}

.frame-details-report-container {
  min-width: 550px;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
}

/*# sourceURL=${import.meta.resolve("./openedWindowDetailsView.css")} */`;

// gen/front_end/panels/application/OpenedWindowDetailsView.js
var UIStrings10 = {
  /**
   * @description Text in Timeline indicating that input has happened recently
   */
  yes: "Yes",
  /**
   * @description Text in Timeline indicating that input has not happened recently
   */
  no: "No",
  /**
   * @description Title for a link to the Elements panel
   */
  clickToOpenInElementsPanel: "Click to open in Elements panel",
  /**
   * @description Name of a network resource type
   */
  document: "Document",
  /**
   * @description Text for web URLs
   */
  url: "URL",
  /**
   * @description Title of the 'Security' tool
   */
  security: "Security",
  /**
   * @description Label for link to Opener Frame in Detail View for Opened Window
   */
  openerFrame: "Opener Frame",
  /**
   * @description Label in opened window's details view whether window has access to its opener
   */
  accessToOpener: "Access to opener",
  /**
   * @description Description for the 'Access to Opener' field
   */
  showsWhetherTheOpenedWindowIs: "Shows whether the opened window is able to access its opener and vice versa",
  /**
   * @description Text in Frames View of the Application panel
   */
  windowWithoutTitle: "Window without title",
  /**
   * @description Label suffix in the Application Panel Frames section for windows which are already closed
   */
  closed: "closed",
  /**
   * @description Default name for worker
   */
  worker: "worker",
  /**
   * @description Text that refers to some types
   */
  type: "Type",
  /**
   * @description Section header in the Frame Details view
   */
  securityIsolation: "Security & Isolation",
  /**
   * @description Row title in the Frame Details view
   */
  crossoriginEmbedderPolicy: "Cross-Origin Embedder Policy",
  /**
   * @description Label for worker type: web worker
   */
  webWorker: "Web Worker",
  /**
   * @description Text for an unspecified service worker response source
   */
  unknown: "Unknown",
  /**
   * @description This label specifies the server endpoints to which the server is reporting errors
   *and warnings through the Report-to API. Following this label will be the URL of the server.
   */
  reportingTo: "reporting to"
};
var str_10 = i18n19.i18n.registerUIStrings("panels/application/OpenedWindowDetailsView.ts", UIStrings10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var booleanToYesNo = (b) => b ? i18nString10(UIStrings10.yes) : i18nString10(UIStrings10.no);
function linkifyIcon(iconType, title, eventHandler) {
  const icon = createIcon4(iconType, "icon-link devtools-link");
  const button = document.createElement("button");
  UI8.Tooltip.Tooltip.install(button, title);
  button.classList.add("devtools-link", "link-style", "text-button");
  button.appendChild(icon);
  button.addEventListener("click", (event) => {
    event.consume(true);
    void eventHandler();
  });
  return button;
}
async function maybeCreateLinkToElementsPanel(opener) {
  let openerFrame = null;
  if (opener instanceof SDK11.ResourceTreeModel.ResourceTreeFrame) {
    openerFrame = opener;
  } else if (opener) {
    openerFrame = SDK11.FrameManager.FrameManager.instance().getFrame(opener);
  }
  if (!openerFrame) {
    return null;
  }
  const linkTargetDOMNode = await openerFrame.getOwnerDOMNodeOrDocument();
  if (!linkTargetDOMNode) {
    return null;
  }
  const linkElement = linkifyIcon("code-circle", i18nString10(UIStrings10.clickToOpenInElementsPanel), () => Common7.Revealer.reveal(linkTargetDOMNode));
  const label = document.createElement("span");
  label.textContent = `<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`;
  linkElement.insertBefore(label, linkElement.firstChild);
  linkElement.addEventListener("mouseenter", () => {
    if (openerFrame) {
      void openerFrame.highlight();
    }
  });
  linkElement.addEventListener("mouseleave", () => {
    SDK11.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  });
  return linkElement;
}
var OpenedWindowDetailsView = class extends UI8.Widget.VBox {
  targetInfo;
  isWindowClosed;
  reportView;
  documentSection;
  #urlFieldValue;
  securitySection;
  openerElementField;
  hasDOMAccessValue;
  constructor(targetInfo, isWindowClosed) {
    super();
    this.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.targetInfo = targetInfo;
    this.isWindowClosed = isWindowClosed;
    this.contentElement.classList.add("frame-details-container");
    this.reportView = new UI8.ReportView.ReportView(this.buildTitle());
    this.reportView.show(this.contentElement);
    this.reportView.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.reportView.element.classList.add("frame-details-report-container");
    this.documentSection = this.reportView.appendSection(i18nString10(UIStrings10.document));
    this.#urlFieldValue = this.documentSection.appendField(i18nString10(UIStrings10.url)).createChild("div", "text-ellipsis");
    this.securitySection = this.reportView.appendSection(i18nString10(UIStrings10.security));
    this.openerElementField = this.securitySection.appendField(i18nString10(UIStrings10.openerFrame));
    this.securitySection.setFieldVisible(i18nString10(UIStrings10.openerFrame), false);
    this.hasDOMAccessValue = this.securitySection.appendField(i18nString10(UIStrings10.accessToOpener));
    UI8.Tooltip.Tooltip.install(this.hasDOMAccessValue, i18nString10(UIStrings10.showsWhetherTheOpenedWindowIs));
    this.requestUpdate();
  }
  async performUpdate() {
    this.reportView.setTitle(this.buildTitle());
    this.#urlFieldValue.textContent = this.targetInfo.url;
    this.#urlFieldValue.title = this.targetInfo.url;
    this.hasDOMAccessValue.textContent = booleanToYesNo(this.targetInfo.canAccessOpener);
    void this.maybeDisplayOpenerFrame();
  }
  async maybeDisplayOpenerFrame() {
    this.openerElementField.removeChildren();
    const linkElement = await maybeCreateLinkToElementsPanel(this.targetInfo.openerFrameId);
    if (linkElement) {
      this.openerElementField.append(linkElement);
      this.securitySection.setFieldVisible(i18nString10(UIStrings10.openerFrame), true);
      return;
    }
    this.securitySection.setFieldVisible(i18nString10(UIStrings10.openerFrame), false);
  }
  buildTitle() {
    let title = this.targetInfo.title || i18nString10(UIStrings10.windowWithoutTitle);
    if (this.isWindowClosed) {
      title += ` (${i18nString10(UIStrings10.closed)})`;
    }
    return title;
  }
  setIsWindowClosed(isWindowClosed) {
    this.isWindowClosed = isWindowClosed;
  }
  setTargetInfo(targetInfo) {
    this.targetInfo = targetInfo;
  }
};
var WorkerDetailsView = class extends UI8.Widget.VBox {
  targetInfo;
  reportView;
  documentSection;
  isolationSection;
  coepPolicy;
  constructor(targetInfo) {
    super();
    this.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.targetInfo = targetInfo;
    this.contentElement.classList.add("frame-details-container");
    this.reportView = new UI8.ReportView.ReportView(this.targetInfo.title || this.targetInfo.url || i18nString10(UIStrings10.worker));
    this.reportView.show(this.contentElement);
    this.reportView.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.reportView.element.classList.add("frame-details-report-container");
    this.documentSection = this.reportView.appendSection(i18nString10(UIStrings10.document));
    const URLFieldValue = this.documentSection.appendField(i18nString10(UIStrings10.url)).createChild("div", "text-ellipsis");
    URLFieldValue.textContent = this.targetInfo.url;
    URLFieldValue.title = this.targetInfo.url;
    const workerType = this.documentSection.appendField(i18nString10(UIStrings10.type));
    workerType.textContent = this.workerTypeToString(this.targetInfo.type);
    this.isolationSection = this.reportView.appendSection(i18nString10(UIStrings10.securityIsolation));
    this.coepPolicy = this.isolationSection.appendField(i18nString10(UIStrings10.crossoriginEmbedderPolicy));
    this.requestUpdate();
  }
  workerTypeToString(type) {
    if (type === "worker") {
      return i18nString10(UIStrings10.webWorker);
    }
    if (type === "service_worker") {
      return i18n19.i18n.lockedString("Service Worker");
    }
    return i18nString10(UIStrings10.unknown);
  }
  async updateCoopCoepStatus() {
    const target = SDK11.TargetManager.TargetManager.instance().targetById(this.targetInfo.targetId);
    if (!target) {
      return;
    }
    const model = target.model(SDK11.NetworkManager.NetworkManager);
    const info = model && await model.getSecurityIsolationStatus(null);
    if (!info) {
      return;
    }
    const coepIsEnabled = (value) => value !== "None";
    this.fillCrossOriginPolicy(this.coepPolicy, coepIsEnabled, info.coep);
  }
  fillCrossOriginPolicy(field, isEnabled, info) {
    if (!info) {
      field.textContent = "";
      return;
    }
    const enabled = isEnabled(info.value);
    field.textContent = enabled ? info.value : info.reportOnlyValue;
    if (!enabled && isEnabled(info.reportOnlyValue)) {
      const reportOnly = document.createElement("span");
      reportOnly.classList.add("inline-comment");
      reportOnly.textContent = "report-only";
      field.appendChild(reportOnly);
    }
    const endpoint = enabled ? info.reportingEndpoint : info.reportOnlyReportingEndpoint;
    if (endpoint) {
      const reportingEndpointPrefix = field.createChild("span", "inline-name");
      reportingEndpointPrefix.textContent = i18nString10(UIStrings10.reportingTo);
      const reportingEndpointName = field.createChild("span");
      reportingEndpointName.textContent = endpoint;
    }
  }
  async performUpdate() {
    await this.updateCoopCoepStatus();
  }
};

// gen/front_end/panels/application/PreloadingTreeElement.js
var PreloadingTreeElement_exports = {};
__export(PreloadingTreeElement_exports, {
  PreloadingRuleSetTreeElement: () => PreloadingRuleSetTreeElement,
  PreloadingSummaryTreeElement: () => PreloadingSummaryTreeElement
});
import * as i18n25 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon5 } from "./../../ui/kit/kit.js";
import * as PreloadingHelper from "./preloading/helper/helper.js";

// gen/front_end/panels/application/preloading/PreloadingView.js
var PreloadingView_exports = {};
__export(PreloadingView_exports, {
  PreloadingAttemptView: () => PreloadingAttemptView,
  PreloadingRuleSetView: () => PreloadingRuleSetView,
  PreloadingSummaryView: () => PreloadingSummaryView
});
import "./../../ui/legacy/legacy.js";
import * as Common8 from "./../../core/common/common.js";
import * as i18n23 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined2 } from "./../../core/platform/platform.js";
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as Buttons5 from "./../../ui/components/buttons/buttons.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html5, render as render4 } from "./../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";
import * as PreloadingComponents from "./preloading/components/components.js";

// gen/front_end/panels/application/preloading/components/PreloadingString.js
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as Bindings3 from "./../../models/bindings/bindings.js";
var UIStrings11 = {
  /**
   * @description  Description text for Prefetch status PrefetchFailedIneligibleRedirect.
   */
  PrefetchFailedIneligibleRedirect: "The prefetch was redirected, but the redirect URL is not eligible for prefetch.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedInvalidRedirect.
   */
  PrefetchFailedInvalidRedirect: "The prefetch was redirected, but there was a problem with the redirect.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedMIMENotSupported.
   */
  PrefetchFailedMIMENotSupported: "The prefetch failed because the response's Content-Type header was not supported.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNetError.
   */
  PrefetchFailedNetError: "The prefetch failed because of a network error.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNon2XX.
   */
  PrefetchFailedNon2XX: "The prefetch failed because of a non-2xx HTTP response status code.",
  /**
   * @description  Description text for Prefetch status PrefetchIneligibleRetryAfter.
   */
  PrefetchIneligibleRetryAfter: "A previous prefetch to the origin got a HTTP 503 response with an Retry-After header that has not elapsed yet.",
  /**
   * @description  Description text for Prefetch status PrefetchIsPrivacyDecoy.
   */
  PrefetchIsPrivacyDecoy: "The URL was not eligible to be prefetched because there was a registered service worker or cross-site cookies for that origin, but the prefetch was put on the network anyways and not used, to disguise that the user had some kind of previous relationship with the origin.",
  /**
   * @description  Description text for Prefetch status PrefetchIsStale.
   */
  PrefetchIsStale: "Too much time elapsed between the prefetch and usage, so the prefetch was discarded.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleBrowserContextOffTheRecord.
   */
  PrefetchNotEligibleBrowserContextOffTheRecord: "The prefetch was not performed because the browser is in Incognito or Guest mode.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleDataSaverEnabled.
   */
  PrefetchNotEligibleDataSaverEnabled: "The prefetch was not performed because the operating system is in Data Saver mode.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleExistingProxy.
   */
  PrefetchNotEligibleExistingProxy: "The URL is not eligible to be prefetched, because in the default network context it is configured to use a proxy server.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleHostIsNonUnique.
   */
  PrefetchNotEligibleHostIsNonUnique: "The URL was not eligible to be prefetched because its host was not unique (e.g., a non publicly routable IP address or a hostname which is not registry-controlled), but the prefetch was required to be proxied.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleNonDefaultStoragePartition.
   */
  PrefetchNotEligibleNonDefaultStoragePartition: "The URL was not eligible to be prefetched because it uses a non-default storage partition.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy.
   */
  PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: "The URL was not eligible to be prefetched because the default network context cannot be configured to use the prefetch proxy for a same-site cross-origin prefetch request.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleSchemeIsNotHttps.
   */
  PrefetchNotEligibleSchemeIsNotHttps: "The URL was not eligible to be prefetched because its scheme was not https:.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleUserHasCookies.
   */
  PrefetchNotEligibleUserHasCookies: "The URL was not eligible to be prefetched because it was cross-site, but the user had cookies for that origin.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleUserHasServiceWorker.
   */
  PrefetchNotEligibleUserHasServiceWorker: "The URL was not eligible to be prefetched because there was a registered service worker for that origin, which is currently not supported.",
  /**
   * @description  Description text for Prefetch status PrefetchNotUsedCookiesChanged.
   */
  PrefetchNotUsedCookiesChanged: "The prefetch was not used because it was a cross-site prefetch, and cookies were added for that URL while the prefetch was ongoing, so the prefetched response is now out-of-date.",
  /**
   * @description  Description text for Prefetch status PrefetchProxyNotAvailable.
   */
  PrefetchProxyNotAvailable: "A network error was encountered when trying to set up a connection to the prefetching proxy.",
  /**
   * @description  Description text for Prefetch status PrefetchNotUsedProbeFailed.
   */
  PrefetchNotUsedProbeFailed: "The prefetch was blocked by your Internet Service Provider or network administrator.",
  /**
   * @description  Description text for Prefetch status PrefetchEvictedForNewerPrefetch.
   */
  PrefetchEvictedForNewerPrefetch: "The prefetch was discarded because the initiating page has too many prefetches ongoing, and this was one of the oldest.",
  /**
   * @description Description text for Prefetch status PrefetchEvictedAfterCandidateRemoved.
   */
  PrefetchEvictedAfterCandidateRemoved: "The prefetch was discarded because no speculation rule in the initating page triggers a prefetch for this URL anymore.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleBatterySaverEnabled.
   */
  PrefetchNotEligibleBatterySaverEnabled: "The prefetch was not performed because the Battery Saver setting was enabled.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligiblePreloadingDisabled.
   */
  PrefetchNotEligiblePreloadingDisabled: "The prefetch was not performed because speculative loading was disabled.",
  /**
   * @description  Description text for Prefetch status PrefetchEvictedAfterBrowsingDataRemoved.
   */
  PrefetchEvictedAfterBrowsingDataRemoved: "The prefetch was discarded because browsing data was removed.",
  /**
   *  Description text for PrerenderFinalStatus::kLowEndDevice.
   */
  prerenderFinalStatusLowEndDevice: "The prerender was not performed because this device does not have enough total system memory to support prerendering.",
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeRedirect.
   */
  prerenderFinalStatusInvalidSchemeRedirect: "The prerendering navigation failed because it redirected to a URL whose scheme was not http: or https:.",
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeNavigation.
   */
  prerenderFinalStatusInvalidSchemeNavigation: "The URL was not eligible to be prerendered because its scheme was not http: or https:.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestBlockedByCsp.
   */
  prerenderFinalStatusNavigationRequestBlockedByCsp: "The prerendering navigation was blocked by a Content Security Policy.",
  /**
   * @description Description text for PrerenderFinalStatus::kMojoBinderPolicy.
   * @example {device.mojom.GamepadMonitor} PH1
   */
  prerenderFinalStatusMojoBinderPolicy: "The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: {PH1})",
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessCrashed.
   */
  prerenderFinalStatusRendererProcessCrashed: "The prerendered page crashed.",
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessKilled.
   */
  prerenderFinalStatusRendererProcessKilled: "The prerendered page was killed.",
  /**
   *  Description text for PrerenderFinalStatus::kDownload.
   */
  prerenderFinalStatusDownload: "The prerendered page attempted to initiate a download, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationBadHttpStatus.
   */
  prerenderFinalStatusNavigationBadHttpStatus: "The prerendering navigation failed because of a non-2xx HTTP response status code.",
  /**
   *  Description text for PrerenderFinalStatus::kClientCertRequested.
   */
  prerenderFinalStatusClientCertRequested: "The prerendering navigation required a HTTP client certificate.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestNetworkError.
   */
  prerenderFinalStatusNavigationRequestNetworkError: "The prerendering navigation encountered a network error.",
  /**
   *  Description text for PrerenderFinalStatus::kSslCertificateError.
   */
  prerenderFinalStatusSslCertificateError: "The prerendering navigation failed because of an invalid SSL certificate.",
  /**
   *  Description text for PrerenderFinalStatus::kLoginAuthRequested.
   */
  prerenderFinalStatusLoginAuthRequested: "The prerendering navigation required HTTP authentication, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kUaChangeRequiresReload.
   */
  prerenderFinalStatusUaChangeRequiresReload: "Changing User Agent occurred in prerendering navigation.",
  /**
   *  Description text for PrerenderFinalStatus::kBlockedByClient.
   */
  prerenderFinalStatusBlockedByClient: "Some resource load was blocked.",
  /**
   *  Description text for PrerenderFinalStatus::kAudioOutputDeviceRequested.
   */
  prerenderFinalStatusAudioOutputDeviceRequested: "The prerendered page requested audio output, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kMixedContent.
   */
  prerenderFinalStatusMixedContent: "The prerendered page contained mixed content.",
  /**
   *  Description text for PrerenderFinalStatus::kTriggerBackgrounded.
   */
  prerenderFinalStatusTriggerBackgrounded: "The initiating page was backgrounded, so the prerendered page was discarded.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryLimitExceeded.
   */
  prerenderFinalStatusMemoryLimitExceeded: "The prerender was not performed because the browser exceeded the prerendering memory limit.",
  /**
   *  Description text for PrerenderFinalStatus::kDataSaverEnabled.
   */
  prerenderFinalStatusDataSaverEnabled: "The prerender was not performed because the user requested that the browser use less data.",
  /**
   *  Description text for PrerenderFinalStatus::TriggerUrlHasEffectiveUrl.
   */
  prerenderFinalStatusHasEffectiveUrl: "The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   *  Description text for PrerenderFinalStatus::kTimeoutBackgrounded.
   */
  prerenderFinalStatusTimeoutBackgrounded: "The initiating page was backgrounded for a long time, so the prerendered page was discarded.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInInitialNavigation: "The prerendering navigation failed because the prerendered URL redirected to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInInitialNavigation: "The prerendering navigation failed because it targeted a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation: "The prerendering navigation failed because the prerendered URL redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation: "The prerendering navigation failed because it was to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kActivationNavigationParameterMismatch.
   */
  prerenderFinalStatusActivationNavigationParameterMismatch: "The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.",
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessCrashed.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed: "The initiating page crashed.",
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessKilled.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessKilled: "The initiating page was killed.",
  /**
   *  Description text for PrerenderFinalStatus::kActivationFramePolicyNotCompatible.
   */
  prerenderFinalStatusActivationFramePolicyNotCompatible: "The prerender was not used because the sandboxing flags or permissions policy of the initiating page was not compatible with those of the prerendering page.",
  /**
   *  Description text for PrerenderFinalStatus::kPreloadingDisabled.
   */
  prerenderFinalStatusPreloadingDisabled: "The prerender was not performed because the user disabled preloading in their browser settings.",
  /**
   *  Description text for PrerenderFinalStatus::kBatterySaverEnabled.
   */
  prerenderFinalStatusBatterySaverEnabled: "The prerender was not performed because the user requested that the browser use less battery.",
  /**
   *  Description text for PrerenderFinalStatus::kActivatedDuringMainFrameNavigation.
   */
  prerenderFinalStatusActivatedDuringMainFrameNavigation: "Prerendered page activated during initiating page's main frame navigation.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation: "The prerendered page navigated to a URL which redirected to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation: "The prerendered page navigated to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation: "The prerendered page navigated to a URL which redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation: "The prerendered page navigated to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureOnTrigger.
   */
  prerenderFinalStatusMemoryPressureOnTrigger: "The prerender was not performed because the browser was under critical memory pressure.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureAfterTriggered.
   */
  prerenderFinalStatusMemoryPressureAfterTriggered: "The prerendered page was unloaded because the browser came under critical memory pressure.",
  /**
   *  Description text for PrerenderFinalStatus::kPrerenderingDisabledByDevTools.
   */
  prerenderFinalStatusPrerenderingDisabledByDevTools: "The prerender was not performed because DevTools has been used to disable prerendering.",
  /**
   * Description text for PrerenderFinalStatus::kSpeculationRuleRemoved.
   */
  prerenderFinalStatusSpeculationRuleRemoved: 'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from <script type="speculationrules">.',
  /**
   * Description text for PrerenderFinalStatus::kActivatedWithAuxiliaryBrowsingContexts.
   */
  prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts: "The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded: 'The prerender whose eagerness is "eager" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "eager" to enable further prerendering.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEmbedderPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded: "The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningNonEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded: 'The old non-eager prerender (with a "moderate" or "conservative" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',
  /**
   * Description text for PrenderFinalStatus::kPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusPrerenderingUrlHasEffectiveUrl: "The prerendering navigation failed because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kRedirectedPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl: "The prerendering navigation failed because it redirected to an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kActivationUrlHasEffectiveUrl.
   */
  prerenderFinalStatusActivationUrlHasEffectiveUrl: "The prerender was not used because during activation time, navigation has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kJavaScriptInterfaceAdded.
   */
  prerenderFinalStatusJavaScriptInterfaceAdded: "The prerendered page was unloaded because a new JavaScript interface has been injected by WebView.addJavascriptInterface().",
  /**
   * Description text for PrenderFinalStatus::kJavaScriptInterfaceRemoved.
   */
  prerenderFinalStatusJavaScriptInterfaceRemoved: "The prerendered page was unloaded because a JavaScript interface has been removed by WebView.removeJavascriptInterface().",
  /**
   * Description text for PrenderFinalStatus::kAllPrerenderingCanceled.
   */
  prerenderFinalStatusAllPrerenderingCanceled: "All prerendered pages were unloaded by the browser for some reason (For example, WebViewCompat.addWebMessageListener() was called during prerendering.)",
  /**
   * Description text for PrenderFinalStatus::kWindowClosed.
   */
  prerenderFinalStatusWindowClosed: "The prerendered page was unloaded because it called window.close().",
  /**
   * Description text for PrenderFinalStatus::kBrowsingDataRemoved.
   */
  prerenderFinalStatusBrowsingDataRemoved: "The prerendered page was unloaded because browsing data was removed.",
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: "Not triggered",
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: "Pending",
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: "Running",
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: "Ready",
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: "Success",
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: "Failure"
};
var str_11 = i18n21.i18n.registerUIStrings("panels/application/preloading/components/PreloadingString.ts", UIStrings11);
var i18nLazyString = i18n21.i18n.getLazilyComputedLocalizedString.bind(void 0, str_11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var PrefetchReasonDescription = {
  PrefetchFailedIneligibleRedirect: { name: i18nLazyString(UIStrings11.PrefetchFailedIneligibleRedirect) },
  PrefetchFailedInvalidRedirect: { name: i18nLazyString(UIStrings11.PrefetchFailedInvalidRedirect) },
  PrefetchFailedMIMENotSupported: { name: i18nLazyString(UIStrings11.PrefetchFailedMIMENotSupported) },
  PrefetchFailedNetError: { name: i18nLazyString(UIStrings11.PrefetchFailedNetError) },
  PrefetchFailedNon2XX: { name: i18nLazyString(UIStrings11.PrefetchFailedNon2XX) },
  PrefetchIneligibleRetryAfter: { name: i18nLazyString(UIStrings11.PrefetchIneligibleRetryAfter) },
  PrefetchIsPrivacyDecoy: { name: i18nLazyString(UIStrings11.PrefetchIsPrivacyDecoy) },
  PrefetchIsStale: { name: i18nLazyString(UIStrings11.PrefetchIsStale) },
  PrefetchNotEligibleBrowserContextOffTheRecord: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleBrowserContextOffTheRecord) },
  PrefetchNotEligibleDataSaverEnabled: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleDataSaverEnabled) },
  PrefetchNotEligibleExistingProxy: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleExistingProxy) },
  PrefetchNotEligibleHostIsNonUnique: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleHostIsNonUnique) },
  PrefetchNotEligibleNonDefaultStoragePartition: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleNonDefaultStoragePartition) },
  PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy) },
  PrefetchNotEligibleSchemeIsNotHttps: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleSchemeIsNotHttps) },
  PrefetchNotEligibleUserHasCookies: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleUserHasCookies) },
  PrefetchNotEligibleUserHasServiceWorker: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleUserHasServiceWorker) },
  PrefetchNotUsedCookiesChanged: { name: i18nLazyString(UIStrings11.PrefetchNotUsedCookiesChanged) },
  PrefetchProxyNotAvailable: { name: i18nLazyString(UIStrings11.PrefetchProxyNotAvailable) },
  PrefetchNotUsedProbeFailed: { name: i18nLazyString(UIStrings11.PrefetchNotUsedProbeFailed) },
  PrefetchEvictedForNewerPrefetch: { name: i18nLazyString(UIStrings11.PrefetchEvictedForNewerPrefetch) },
  PrefetchEvictedAfterCandidateRemoved: { name: i18nLazyString(UIStrings11.PrefetchEvictedAfterCandidateRemoved) },
  PrefetchNotEligibleBatterySaverEnabled: { name: i18nLazyString(UIStrings11.PrefetchNotEligibleBatterySaverEnabled) },
  PrefetchNotEligiblePreloadingDisabled: { name: i18nLazyString(UIStrings11.PrefetchNotEligiblePreloadingDisabled) },
  PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler: { name: () => i18n21.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectFromServiceWorker: { name: () => i18n21.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectToServiceWorker: { name: () => i18n21.i18n.lockedString("Unknown") },
  PrefetchEvictedAfterBrowsingDataRemoved: { name: i18nLazyString(UIStrings11.PrefetchEvictedAfterBrowsingDataRemoved) }
};
function ruleSetLocationShort(ruleSet, pageURL2) {
  const url = ruleSet.url === void 0 ? pageURL2 : ruleSet.url;
  return Bindings3.ResourceUtils.displayNameForURL(url);
}
function ruleSetTagOrLocationShort(ruleSet, pageURL2) {
  if (!ruleSet.errorMessage && ruleSet.tag) {
    return '"' + ruleSet.tag + '"';
  }
  return ruleSetLocationShort(ruleSet, pageURL2);
}

// gen/front_end/panels/application/preloading/preloadingView.css.js
var preloadingView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.empty-state {
  display: none;
}

.empty {
  .empty-state {
    display: flex;
  }

  devtools-split-view, .pretty-print-button, devtools-toolbar {
    display: none;
  }
}

.preloading-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);

  button.toolbar-has-dropdown {
    margin: var(--sys-size-2) 0;
  }
}

devtools-split-view {
  .preloading-grid-widget-container > .vbox {
    height: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./preloading/preloadingView.css")} */`;

// gen/front_end/panels/application/preloading/preloadingViewDropDown.css.js
var preloadingViewDropDown_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 2px 1px 2px 2px;
}

.title {
  padding-left: 8px;
}

.subtitle {
  padding-left: 8px;
}

/*# sourceURL=${import.meta.resolve("./preloading/preloadingViewDropDown.css")} */`;

// gen/front_end/panels/application/preloading/PreloadingView.js
var { createRef, ref } = Directives2;
var UIStrings12 = {
  /**
   * @description DropDown title for filtering preloading attempts by rule set
   */
  filterFilterByRuleSet: "Filter by rule set",
  /**
   * @description DropDown text for filtering preloading attempts by rule set: No filter
   */
  filterAllPreloads: "All speculative loads",
  /**
   * @description Dropdown subtitle for filtering preloading attempts by rule set
   *             when there are no rule sets in the page.
   */
  noRuleSets: "no rule sets",
  /**
   * @description Text in grid: Rule set is valid
   */
  validityValid: "Valid",
  /**
   * @description Text in grid: Rule set must be a valid JSON object
   */
  validityInvalid: "Invalid",
  /**
   * @description Text in grid: Rule set contains invalid rules and they are ignored
   */
  validitySomeRulesInvalid: "Some rules invalid",
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: "Not triggered",
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: "Pending",
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: "Running",
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: "Ready",
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: "Success",
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: "Failure",
  /**
   * @description Text to pretty print a file
   */
  prettyPrint: "Pretty print",
  /**
   * @description Placeholder text if there are no rules to show. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noRulesDetected: "No rules detected",
  /**
   * @description Placeholder text if there are no rules to show. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  rulesDescription: "On this page you will see the speculation rules used to prefetch and prerender page navigations.",
  /**
   * @description Placeholder text if there are no speculation attempts for prefetching or prerendering urls. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noPrefetchAttempts: "No speculation detected",
  /**
   * @description Placeholder text if there are no speculation attempts for prefetching or prerendering urls. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  prefetchDescription: "On this page you will see details on speculative loads.",
  /**
   * @description Text for a learn more link
   */
  learnMore: "Learn more"
};
var str_12 = i18n23.i18n.registerUIStrings("panels/application/preloading/PreloadingView.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
var SPECULATION_EXPLANATION_URL = "https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules";
var AllRuleSetRootId = Symbol("AllRuleSetRootId");
var PreloadingUIUtils = class {
  static status(status) {
    switch (status) {
      case "NotTriggered":
        return i18nString12(UIStrings12.statusNotTriggered);
      case "Pending":
        return i18nString12(UIStrings12.statusPending);
      case "Running":
        return i18nString12(UIStrings12.statusRunning);
      case "Ready":
        return i18nString12(UIStrings12.statusReady);
      case "Success":
        return i18nString12(UIStrings12.statusSuccess);
      case "Failure":
        return i18nString12(UIStrings12.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case "NotSupported":
        return i18n23.i18n.lockedString("Internal error");
    }
  }
  static preloadsStatusSummary(countsByStatus) {
    const LIST = [
      "NotTriggered",
      "Pending",
      "Running",
      "Ready",
      "Success",
      "Failure"
    ];
    return LIST.filter((status) => (countsByStatus?.get(status) || 0) > 0).map((status) => (countsByStatus?.get(status) || 0) + " " + this.status(status)).join(", ").toLocaleLowerCase();
  }
  // Summary of error of rule set shown in grid.
  static validity({ errorType }) {
    switch (errorType) {
      case void 0:
        return i18nString12(UIStrings12.validityValid);
      case "SourceIsNotJsonObject":
      case "InvalidRulesetLevelTag":
        return i18nString12(UIStrings12.validityInvalid);
      case "InvalidRulesSkipped":
        return i18nString12(UIStrings12.validitySomeRulesInvalid);
    }
  }
  // Where a rule set came from, shown in grid.
  static location(ruleSet) {
    if (ruleSet.backendNodeId !== void 0) {
      return i18n23.i18n.lockedString("<script>");
    }
    if (ruleSet.url !== void 0) {
      return ruleSet.url;
    }
    throw new Error("unreachable");
  }
  static processLocalId(id) {
    const index = id.indexOf(".");
    return index === -1 ? id : id.slice(index + 1);
  }
};
function pageURL() {
  return SDK13.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() || "";
}
var PreloadingRuleSetView = class extends UI9.Widget.VBox {
  model;
  focusedRuleSetId = null;
  warningsContainer;
  warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  hsplit;
  ruleSetGrid = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  ruleSetGridContainerRef = createRef();
  ruleSetDetailsRef;
  shouldPrettyPrint = Common8.Settings.Settings.instance().moduleSetting("auto-pretty-print-minified").get();
  constructor(model) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(emptyWidget_css_default, preloadingView_css_default);
    this.model = model;
    SDK13.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
      Object.assign(this.warningsView, e.data);
    }, this, { scoped: true });
    this.warningsContainer = document.createElement("div");
    this.warningsContainer.classList.add("flex-none");
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);
    this.ruleSetGrid.addEventListener("select", this.onRuleSetsGridCellFocused, this);
    this.ruleSetDetailsRef = createRef();
    const onPrettyPrintToggle = () => {
      this.shouldPrettyPrint = !this.shouldPrettyPrint;
      this.updateRuleSetDetails();
    };
    render4(html5`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString12(UIStrings12.noRulesDetected)}</span>
          <div class="empty-state-description">
            <span>${i18nString12(UIStrings12.rulesDescription)}</span>
            <x-link
              class="x-link devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslog=${VisualLogging6.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
            >${i18nString12(UIStrings12.learnMore)}</x-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second">
          <div slot="main" ${ref(this.ruleSetGridContainerRef)}>
          </div>
          <div slot="sidebar" jslog=${VisualLogging6.section("rule-set-details")}>
            <devtools-widget .widgetConfig=${UI9.Widget.widgetConfig(PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView, {
      ruleSet: this.getRuleSet(),
      shouldPrettyPrint: this.shouldPrettyPrint
    })} ${ref(this.ruleSetDetailsRef)}></devtools-widget>
          </div>
        </devtools-split-view>
        <div class="pretty-print-button" style="border-top: 1px solid var(--sys-color-divider)">
        <devtools-button
          .iconName=${"brackets"}
          .toggledIconName=${"brackets"}
          .toggled=${this.shouldPrettyPrint}
          .toggleType=${"primary-toggle"}
          .title=${i18nString12(UIStrings12.prettyPrint)}
          .variant=${"icon_toggle"}
          .size=${"REGULAR"}
          @click=${onPrettyPrintToggle}
          jslog=${VisualLogging6.action().track({ click: true }).context("preloading-status-panel-pretty-print")}></devtools-button>
        </div>`, this.contentElement, { host: this });
    this.hsplit = this.contentElement.querySelector("devtools-split-view");
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK13.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK13.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    this.render();
  }
  revealRuleSet(revealInfo) {
    this.focusedRuleSetId = revealInfo.ruleSetId;
    this.render();
  }
  updateRuleSetDetails() {
    const ruleSet = this.getRuleSet();
    const widget = this.ruleSetDetailsRef.value?.getWidget();
    if (widget) {
      widget.shouldPrettyPrint = this.shouldPrettyPrint;
      widget.ruleSet = ruleSet;
    }
    if (ruleSet === null) {
      this.hsplit.setAttribute("sidebar-visibility", "hidden");
    } else {
      this.hsplit.removeAttribute("sidebar-visibility");
    }
  }
  getRuleSet() {
    const id = this.focusedRuleSetId;
    return id === null ? null : this.model.getRuleSetById(id);
  }
  render() {
    const countsByRuleSetId = this.model.getPreloadCountsByRuleSetId();
    const ruleSetRows = this.model.getAllRuleSets().map(({ id, value }) => {
      const countsByStatus = countsByRuleSetId.get(id) || /* @__PURE__ */ new Map();
      return {
        ruleSet: value,
        preloadsStatusSummary: PreloadingUIUtils.preloadsStatusSummary(countsByStatus)
      };
    });
    this.ruleSetGrid.data = { rows: ruleSetRows, pageURL: pageURL() };
    this.contentElement.classList.toggle("empty", ruleSetRows.length === 0);
    this.updateRuleSetDetails();
    const container = this.ruleSetGridContainerRef.value;
    if (container && this.ruleSetGrid.element.parentElement !== container) {
      this.ruleSetGrid.show(container);
    }
  }
  onRuleSetsGridCellFocused(event) {
    this.focusedRuleSetId = event.data;
    this.render();
  }
  getInfobarContainerForTest() {
    return this.warningsView.contentElement;
  }
  getRuleSetGridForTest() {
    return this.ruleSetGrid;
  }
};
var PreloadingAttemptView = class extends UI9.Widget.VBox {
  model;
  // Note that we use id of (representative) preloading attempt while we show pipelines in grid.
  // This is because `NOT_TRIGGERED` preloading attempts don't have pipeline id and we can use it.
  focusedPreloadingAttemptId = null;
  warningsContainer;
  warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  preloadingDetails = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  ruleSetSelector;
  constructor(model) {
    super({
      jslog: `${VisualLogging6.pane("preloading-speculations")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(emptyWidget_css_default, preloadingView_css_default);
    this.model = model;
    SDK13.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
      Object.assign(this.warningsView, e.data);
    }, this, { scoped: true });
    this.warningsContainer = document.createElement("div");
    this.warningsContainer.classList.add("flex-none");
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);
    const vbox = new UI9.Widget.VBox();
    const toolbar6 = vbox.contentElement.createChild("devtools-toolbar", "preloading-toolbar");
    toolbar6.setAttribute("jslog", `${VisualLogging6.toolbar()}`);
    this.ruleSetSelector = new PreloadingRuleSetSelector(() => this.render());
    toolbar6.appendToolbarItem(this.ruleSetSelector.item());
    this.preloadingGrid.onSelect = this.onPreloadingGridCellFocused.bind(this);
    const preloadingGridContainer = document.createElement("div");
    preloadingGridContainer.className = "preloading-grid-widget-container";
    preloadingGridContainer.style = "height: 100%";
    this.preloadingGrid.show(preloadingGridContainer, null, true);
    render4(html5`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString12(UIStrings12.noPrefetchAttempts)}</span>
          <div class="empty-state-description">
            <span>${i18nString12(UIStrings12.prefetchDescription)}</span>
            <x-link
              class="x-link devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslog=${VisualLogging6.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
            >${i18nString12(UIStrings12.learnMore)}</x-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second">
          <div slot="main" class="overflow-auto" style="height: 100%">
            ${preloadingGridContainer}
          </div>
          <div slot="sidebar" class="overflow-auto" style="height: 100%">
            ${this.preloadingDetails}
          </div>
        </devtools-split-view>`, vbox.contentElement, { host: this });
    vbox.show(this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK13.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK13.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    this.render();
  }
  setFilter(filter) {
    let id = filter.ruleSetId;
    if (id !== null && this.model.getRuleSetById(id) === void 0) {
      id = null;
    }
    this.ruleSetSelector.select(id);
  }
  updatePreloadingDetails() {
    const id = this.focusedPreloadingAttemptId;
    const preloadingAttempt = id === null ? null : this.model.getPreloadingAttemptById(id);
    if (preloadingAttempt === null) {
      this.preloadingDetails.data = null;
    } else {
      const pipeline = this.model.getPipeline(preloadingAttempt);
      const ruleSets = preloadingAttempt.ruleSetIds.map((id2) => this.model.getRuleSetById(id2)).filter((x) => x !== null);
      this.preloadingDetails.data = {
        pipeline,
        ruleSets,
        pageURL: pageURL()
      };
    }
  }
  render() {
    const filteringRuleSetId = this.ruleSetSelector.getSelected();
    const rows = this.model.getRepresentativePreloadingAttempts(filteringRuleSetId).map(({ id, value }) => {
      const attempt = value;
      const pipeline = this.model.getPipeline(attempt);
      const ruleSets = attempt.ruleSetIds.flatMap((id2) => {
        const ruleSet = this.model.getRuleSetById(id2);
        return ruleSet === null ? [] : [ruleSet];
      });
      return {
        id,
        pipeline,
        ruleSets
      };
    });
    this.preloadingGrid.rows = rows;
    this.preloadingGrid.pageURL = pageURL();
    this.contentElement.classList.toggle("empty", rows.length === 0);
    this.updatePreloadingDetails();
  }
  onPreloadingGridCellFocused({ rowId }) {
    this.focusedPreloadingAttemptId = rowId;
    this.render();
  }
  getRuleSetSelectorToolbarItemForTest() {
    return this.ruleSetSelector.item();
  }
  getPreloadingGridForTest() {
    return this.preloadingGrid;
  }
  getPreloadingDetailsForTest() {
    return this.preloadingDetails;
  }
  selectRuleSetOnFilterForTest(id) {
    this.ruleSetSelector.select(id);
  }
};
var PreloadingSummaryView = class extends UI9.Widget.VBox {
  model;
  warningsContainer;
  warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  usedPreloading = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  constructor(model) {
    super({
      jslog: `${VisualLogging6.pane("speculative-loads")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(emptyWidget_css_default, preloadingView_css_default);
    this.model = model;
    SDK13.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
      Object.assign(this.warningsView, e.data);
    }, this, { scoped: true });
    this.warningsContainer = document.createElement("div");
    this.warningsContainer.classList.add("flex-none");
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);
    const usedPreloadingContainer = new UI9.Widget.VBox();
    usedPreloadingContainer.contentElement.appendChild(this.usedPreloading);
    usedPreloadingContainer.show(this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK13.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK13.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    this.render();
  }
  render() {
    this.usedPreloading.data = {
      pageURL: SDK13.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() || "",
      previousAttempts: this.model.getRepresentativePreloadingAttemptsOfPreviousPage().map(({ value }) => value),
      currentAttempts: this.model.getRepresentativePreloadingAttempts(null).map(({ value }) => value)
    };
  }
  getUsedPreloadingForTest() {
    return this.usedPreloading;
  }
};
var PreloadingRuleSetSelector = class {
  model;
  onSelectionChanged = () => {
  };
  toolbarItem;
  listModel;
  dropDown;
  constructor(onSelectionChanged) {
    const model = SDK13.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK13.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    SDK13.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK13.TargetManager.TargetManager.instance().addModelListener(SDK13.PreloadingModel.PreloadingModel, "ModelUpdated", this.onModelUpdated, this, { scoped: true });
    this.listModel = new UI9.ListModel.ListModel();
    this.dropDown = new UI9.SoftDropDown.SoftDropDown(this.listModel, this);
    this.dropDown.setRowHeight(36);
    this.dropDown.setPlaceholderText(i18nString12(UIStrings12.filterAllPreloads));
    this.toolbarItem = new UI9.Toolbar.ToolbarItem(this.dropDown.element);
    this.toolbarItem.setTitle(i18nString12(UIStrings12.filterFilterByRuleSet));
    this.toolbarItem.element.classList.add("toolbar-has-dropdown");
    this.toolbarItem.element.setAttribute("jslog", `${VisualLogging6.action("filter-by-rule-set").track({ click: true })}`);
    this.onModelUpdated();
    this.onSelectionChanged = onSelectionChanged;
  }
  onScopeChange() {
    const model = SDK13.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK13.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    this.onModelUpdated();
  }
  onModelUpdated() {
    const ids = this.model.getAllRuleSets().map(({ id }) => id);
    const items = [AllRuleSetRootId, ...ids];
    const selected = this.dropDown.getSelectedItem();
    const newSelected = selected === null || !items.includes(selected) ? AllRuleSetRootId : selected;
    this.listModel.replaceAll(items);
    this.dropDown.selectItem(newSelected);
    this.updateWidth(items);
  }
  // Updates the width for the DropDown element.
  updateWidth(items) {
    const DEFAULT_WIDTH = 315;
    const urlLengths = items.map((x) => this.titleFor(x).length);
    const maxLength = Math.max(...urlLengths);
    const width = Math.min(maxLength * 6 + 16, DEFAULT_WIDTH);
    this.dropDown.setWidth(width);
  }
  // AllRuleSetRootId is used within the selector to indicate the root item. When interacting with PreloadingModel,
  // it should be translated to null.
  translateItemIdToRuleSetId(id) {
    if (id === AllRuleSetRootId) {
      return null;
    }
    return id;
  }
  getSelected() {
    const selectItem = this.dropDown.getSelectedItem();
    if (selectItem === null) {
      return null;
    }
    return this.translateItemIdToRuleSetId(selectItem);
  }
  select(id) {
    this.dropDown.selectItem(id);
  }
  // Method for UI.Toolbar.Provider
  item() {
    return this.toolbarItem;
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  titleFor(id) {
    const convertedId = this.translateItemIdToRuleSetId(id);
    if (convertedId === null) {
      return i18nString12(UIStrings12.filterAllPreloads);
    }
    const ruleSet = this.model.getRuleSetById(convertedId);
    if (ruleSet === null) {
      return i18n23.i18n.lockedString("Internal error");
    }
    return ruleSetTagOrLocationShort(ruleSet, pageURL());
  }
  subtitleFor(id) {
    const convertedId = this.translateItemIdToRuleSetId(id);
    const countsByStatus = this.model.getPreloadCountsByRuleSetId().get(convertedId) || /* @__PURE__ */ new Map();
    return PreloadingUIUtils.preloadsStatusSummary(countsByStatus) || `(${i18nString12(UIStrings12.noRuleSets)})`;
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  createElementForItem(id) {
    const element = document.createElement("div");
    const shadowRoot = UI9.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: preloadingViewDropDown_css_default });
    const title = shadowRoot.createChild("div", "title");
    UI9.UIUtils.createTextChild(title, Platform4.StringUtilities.trimEndWithMaxLength(this.titleFor(id), 100));
    const subTitle = shadowRoot.createChild("div", "subtitle");
    UI9.UIUtils.createTextChild(subTitle, this.subtitleFor(id));
    return element;
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  isItemSelectable(_id) {
    return true;
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  itemSelected(_id) {
    this.onSelectionChanged();
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  highlightedItemChanged(_from, _to, _fromElement, _toElement) {
  }
};

// gen/front_end/panels/application/PreloadingTreeElement.js
var UIStrings13 = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  speculativeLoads: "Speculative loads",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  rules: "Rules",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  speculations: "Speculations"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/application/PreloadingTreeElement.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var PreloadingTreeElementBase = class extends ApplicationPanelTreeElement {
  #model;
  #viewConstructor;
  view;
  #path;
  #selected;
  constructor(panel, viewConstructor, path, title) {
    super(panel, title, false, "speculative-loads");
    this.#viewConstructor = viewConstructor;
    this.#path = path;
    const icon = createIcon5("speculative-loads");
    this.setLeadingIcons([icon]);
    this.#selected = false;
  }
  get itemURL() {
    return this.#path;
  }
  initialize(model) {
    this.#model = model;
    if (this.#selected && !this.view) {
      this.onselect(false);
    }
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.#selected = true;
    if (!this.#model) {
      return false;
    }
    if (!this.view) {
      this.view = new this.#viewConstructor(this.#model);
    }
    this.showView(this.view);
    return false;
  }
};
var PreloadingSummaryTreeElement = class extends ExpandableApplicationPanelTreeElement {
  #model;
  #view;
  #selected;
  #ruleSet = null;
  #attempt = null;
  constructor(panel) {
    super(panel, i18nString13(UIStrings13.speculativeLoads), "", "", "preloading");
    const icon = createIcon5("speculative-loads");
    this.setLeadingIcons([icon]);
    this.#selected = false;
  }
  // Note that
  //
  // - TreeElement.ensureSelection assumes TreeElement.treeOutline initialized.
  // - TreeElement.treeOutline is propagated in TreeElement.appendChild.
  //
  // So, `this.constructChildren` should be called just after `parent.appendChild(this)`
  // to enrich children with TreeElement.selectionElementInternal correctly.
  constructChildren(panel) {
    this.#ruleSet = new PreloadingRuleSetTreeElement(panel);
    this.#attempt = new PreloadingAttemptTreeElement(panel);
    this.appendChild(this.#ruleSet);
    this.appendChild(this.#attempt);
  }
  initialize(model) {
    if (this.#ruleSet === null || this.#attempt === null) {
      throw new Error("unreachable");
    }
    this.#model = model;
    this.#ruleSet.initialize(model);
    this.#attempt.initialize(model);
    if (this.#attempt.selected) {
      const filter = new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(null);
      this.expandAndRevealAttempts(filter);
    } else if (this.#ruleSet.selected) {
      const filter = new PreloadingHelper.PreloadingForward.RuleSetView(null);
      this.expandAndRevealRuleSet(filter);
    } else if (this.#selected && !this.#view) {
      this.onselect(false);
    }
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.#selected = true;
    if (!this.#model) {
      return false;
    }
    if (!this.#view) {
      this.#view = new PreloadingSummaryView(this.#model);
    }
    this.showView(this.#view);
    return false;
  }
  expandAndRevealRuleSet(revealInfo) {
    if (this.#ruleSet === null) {
      throw new Error("unreachable");
    }
    this.expand();
    this.#ruleSet.revealRuleSet(revealInfo);
  }
  expandAndRevealAttempts(filter) {
    if (this.#attempt === null) {
      throw new Error("unreachable");
    }
    this.expand();
    this.#attempt.revealAttempts(filter);
  }
};
var PreloadingRuleSetTreeElement = class extends PreloadingTreeElementBase {
  constructor(panel) {
    super(panel, PreloadingRuleSetView, "preloading://rule-set", i18nString13(UIStrings13.rules));
  }
  revealRuleSet(revealInfo) {
    this.select();
    if (this.view === void 0) {
      return;
    }
    this.view?.revealRuleSet(revealInfo);
  }
};
var PreloadingAttemptTreeElement = class extends PreloadingTreeElementBase {
  constructor(panel) {
    super(panel, PreloadingAttemptView, "preloading://attempt", i18nString13(UIStrings13.speculations));
  }
  revealAttempts(filter) {
    this.select();
    this.view?.setFilter(filter);
  }
};

// gen/front_end/panels/application/ReportingApiTreeElement.js
import * as Host5 from "./../../core/host/host.js";
import * as i18n29 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon6 } from "./../../ui/kit/kit.js";

// gen/front_end/panels/application/ReportingApiView.js
var ReportingApiView_exports = {};
__export(ReportingApiView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  ReportingApiView: () => ReportingApiView,
  i18nString: () => i18nString14
});
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as SourceFrame2 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import { html as html6, render as render5 } from "./../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents7 from "./components/components.js";
var { widgetConfig: widgetConfig3 } = UI10.Widget;
var UIStrings14 = {
  /**
   * @description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  noReportOrEndpoint: "No report or endpoint",
  /**
   * @description Placeholder text that shows if no report or endpoint was detected.
   *             A report contains information on issues or events that were encountered by a web browser.
   *             An endpoint is a URL where the report is sent to.
   *             (https://developer.chrome.com/docs/capabilities/web-apis/reporting-api)
   */
  reportingApiDescription: "On this page you will be able to inspect `Reporting API` reports and endpoints.",
  /**
   * @description Placeholder text that shows if no report was selected for viewing
   *report body (https://developers.google.com/web/updates/2018/09/reportingapi#sending).
   */
  noReportSelected: "No report selected",
  /**
   * @description Placeholder text instructing the user how to display a Reporting API
   *report body (https://developers.google.com/web/updates/2018/09/reportingapi#sending).
   */
  clickToDisplayBody: "Click on any report to display its body"
};
var str_14 = i18n27.i18n.registerUIStrings("panels/application/ReportingApiView.ts", UIStrings14);
var i18nString14 = i18n27.i18n.getLocalizedString.bind(void 0, str_14);
var REPORTING_API_EXPLANATION_URL = "https://developer.chrome.com/docs/capabilities/web-apis/reporting-api";
var DEFAULT_VIEW4 = (input, output, target) => {
  if (input.hasReports || input.hasEndpoints) {
    render5(html6`
      <style>${UI10.inspectorCommonStyles}</style>
      <devtools-split-view sidebar-position="second" sidebar-initial-size="150" jslog=${VisualLogging7.pane("reporting-api")}>
        ${input.hasReports ? html6`
          <devtools-split-view slot="main" sidebar-position="second" sidebar-initial-size="150">
            <div slot="main">
              <devtools-widget .widgetConfig=${widgetConfig3(ApplicationComponents7.ReportsGrid.ReportsGrid, {
      reports: input.reports,
      onReportSelected: input.onReportSelected
    })}></devtools-widget>
            </div>
            <div slot="sidebar" class="vbox" jslog=${VisualLogging7.pane("preview").track({ resize: true })}>
              ${input.focusedReport ? html6`
                <devtools-widget .widgetConfig=${widgetConfig3(SourceFrame2.JSONView.SearchableJsonView, {
      jsonObject: input.focusedReport.body
    })}></devtools-widget>
              ` : html6`
                <devtools-widget .widgetConfig=${widgetConfig3(UI10.EmptyWidget.EmptyWidget, {
      header: i18nString14(UIStrings14.noReportSelected),
      text: i18nString14(UIStrings14.clickToDisplayBody)
    })}></devtools-widget>
              `}
            </div>
          </devtools-split-view>
        ` : html6`
          <div slot="main">
            <devtools-widget .widgetConfig=${widgetConfig3(ApplicationComponents7.ReportsGrid.ReportsGrid, {
      reports: input.reports,
      onReportSelected: input.onReportSelected
    })}></devtools-widget>
          </div>
        `}
        <div slot="sidebar">
          <devtools-widget .widgetConfig=${widgetConfig3(ApplicationComponents7.EndpointsGrid.EndpointsGrid, {
      endpoints: input.endpoints
    })}></devtools-widget>
        </div>
      </devtools-split-view>
    `, target);
  } else {
    render5(html6`
      <devtools-widget .widgetConfig=${widgetConfig3(UI10.EmptyWidget.EmptyWidget, {
      header: i18nString14(UIStrings14.noReportOrEndpoint),
      text: i18nString14(UIStrings14.reportingApiDescription),
      link: REPORTING_API_EXPLANATION_URL
    })} jslog=${VisualLogging7.pane("reporting-api-empty")}></devtools-widget>
    `, target);
  }
};
var ReportingApiView = class extends UI10.Widget.VBox {
  #endpoints;
  #view;
  #networkManager;
  #reports = [];
  #focusedReport;
  constructor(view = DEFAULT_VIEW4) {
    super();
    this.#view = view;
    this.#endpoints = /* @__PURE__ */ new Map();
    SDK14.TargetManager.TargetManager.instance().observeModels(SDK14.NetworkManager.NetworkManager, this);
    this.requestUpdate();
  }
  modelAdded(networkManager) {
    if (networkManager.target() !== SDK14.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.#networkManager = networkManager;
    this.#networkManager.addEventListener(SDK14.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
    this.#networkManager.addEventListener(SDK14.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
    this.#networkManager.addEventListener(SDK14.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
    void this.#networkManager.enableReportingApi();
    this.requestUpdate();
  }
  modelRemoved(networkManager) {
    if (!this.#networkManager || this.#networkManager !== networkManager) {
      return;
    }
    this.#networkManager.removeEventListener(SDK14.NetworkManager.Events.ReportingApiEndpointsChangedForOrigin, this.#onEndpointsChangedForOrigin, this);
    this.#networkManager.removeEventListener(SDK14.NetworkManager.Events.ReportingApiReportAdded, this.#onReportAdded, this);
    this.#networkManager.removeEventListener(SDK14.NetworkManager.Events.ReportingApiReportUpdated, this.#onReportUpdated, this);
    this.#networkManager = void 0;
  }
  performUpdate() {
    const viewInput = {
      hasReports: this.#reports.length > 0,
      hasEndpoints: this.#endpoints.size > 0,
      endpoints: this.#endpoints,
      reports: this.#reports,
      focusedReport: this.#focusedReport,
      onReportSelected: this.#onReportSelected.bind(this)
    };
    this.#view(viewInput, void 0, this.element);
  }
  #onEndpointsChangedForOrigin({ data }) {
    this.#endpoints.set(data.origin, data.endpoints);
    this.requestUpdate();
  }
  #onReportAdded({ data: report }) {
    this.#reports.push(report);
    this.requestUpdate();
  }
  #onReportUpdated({ data: report }) {
    const index = this.#reports.findIndex((oldReport) => oldReport.id === report.id);
    this.#reports[index] = report;
    this.requestUpdate();
  }
  #onReportSelected(id) {
    const report = this.#reports.find((report2) => report2.id === id);
    if (report) {
      this.#focusedReport = report;
      this.requestUpdate();
    }
  }
};

// gen/front_end/panels/application/ReportingApiTreeElement.js
var UIStrings15 = {
  /**
   * @description Label for an item in the Application Panel Sidebar of the Application panel
   */
  reportingApi: "Reporting API"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/application/ReportingApiTreeElement.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var ReportingApiTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString15(UIStrings15.reportingApi), false, "reporting-api");
    const icon = createIcon6("document");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "reportingApi://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ReportingApiView();
    }
    this.showView(this.view);
    Host5.userMetrics.panelShown("reporting-api");
    return false;
  }
};

// gen/front_end/panels/application/resourcesSidebar.css.js
var resourcesSidebar_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline {
  li.storage-group-list-item,
  li.storage-group-list-item:not(:has(devtools-checkbox)) {
    padding: 0 var(--sys-size-8) 0 var(--sys-size-3);

    &::before {
      display: none;
    }

    &:hover .selection,
    &:active .selection::before {
      background-color: transparent;
    }

    & + ol {
      padding-left: 0;
    }
  }

  li.storage-group-list-item:not(:first-child) {
    margin-top: var(--sys-size-6);
  }
}

.icons-container devtools-icon.red-icon {
  color: var(--icon-error);
}

devtools-icon.navigator-file-tree-item {
  color: var(--icon-file-default);
}

devtools-icon.navigator-folder-tree-item {
  color: var(--icon-folder-primary);
}

devtools-icon.navigator-script-tree-item {
  color: var(--icon-file-script);
}

devtools-icon.navigator-stylesheet-tree-item {
  color: var(--icon-file-styles);
}

devtools-icon.navigator-image-tree-item,
devtools-icon.navigator-font-tree-item {
  color: var(--icon-file-image);
}

.window-closed .tree-element-title {
  text-decoration: line-through;
}

/*# sourceURL=${import.meta.resolve("./resourcesSidebar.css")} */`;

// gen/front_end/panels/application/ServiceWorkerCacheTreeElement.js
import * as Host6 from "./../../core/host/host.js";
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as SDK16 from "./../../core/sdk/sdk.js";
import { createIcon as createIcon7 } from "./../../ui/kit/kit.js";
import * as UI12 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/application/ServiceWorkerCacheViews.js
var ServiceWorkerCacheViews_exports = {};
__export(ServiceWorkerCacheViews_exports, {
  DataGridNode: () => DataGridNode,
  RequestView: () => RequestView,
  ServiceWorkerCacheView: () => ServiceWorkerCacheView
});
import "./../../ui/legacy/legacy.js";
import * as Common9 from "./../../core/common/common.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as SDK15 from "./../../core/sdk/sdk.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as LegacyWrapper from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as DataGrid5 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";
import * as NetworkComponents from "./../network/components/components.js";
import * as Network from "./../network/network.js";
import * as ApplicationComponents8 from "./components/components.js";

// gen/front_end/panels/application/serviceWorkerCacheViews.css.js
var serviceWorkerCacheViews_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.service-worker-cache-data-view .data-view-toolbar {
  position: relative;
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  padding-right: 10px;
}

.service-worker-cache-data-view .data-grid {
  flex: auto;
}

.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(1) td {
  border: 0;
}

.service-worker-cache-data-view .data-grid .data-container tr:nth-last-child(2) td {
  border-bottom: 1px solid var(--sys-color-divider);
}

.service-worker-cache-data-view .data-grid .data-container tr.selected {
  background-color: var(--sys-color-neutral-container);
  color: inherit;
}

.service-worker-cache-data-view .data-grid:focus .data-container tr.selected {
  background-color: var(--sys-color-tonal-container);
  color: var(--sys-color-on-tonal-container);
}

.service-worker-cache-data-view .section,
.service-worker-cache-data-view .section > .header,
.service-worker-cache-data-view .section > .header .title {
  margin: 0;
  min-height: inherit;
  line-height: inherit;
}

.service-worker-cache-data-view .data-grid .data-container td .section .header .title {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.cache-preview-panel-resizer {
  background-color: var(--sys-color-surface1);
  height: 4px;
  border-bottom: 1px solid var(--sys-color-divider);
}

.cache-storage-summary-bar {
  flex: 0 0 27px;
  line-height: 27px;
  padding-left: 5px;
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/*# sourceURL=${import.meta.resolve("./serviceWorkerCacheViews.css")} */`;

// gen/front_end/panels/application/ServiceWorkerCacheViews.js
var UIStrings16 = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  cache: "Cache",
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh",
  /**
   * @description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: "Delete Selected",
  /**
   * @description Text in Service Worker Cache Views of the Application panel
   */
  filterByPath: "Filter by path",
  /**
   * @description Text in Service Worker Cache Views of the Application panel that shows if no cache entry is selected for preview
   */
  noCacheEntrySelected: "No cache entry selected",
  /**
   * @description Text in Service Worker Cache Views of the Application panel
   */
  selectACacheEntryAboveToPreview: "Select a cache entry above to preview",
  /**
   * @description Text for the name of something
   */
  name: "Name",
  /**
   * @description Text in Service Worker Cache Views of the Application panel
   */
  timeCached: "Time Cached",
  /**
   * @description Tooltip text that appears when hovering over the vary header column in the Service Worker Cache Views of the Application panel
   */
  varyHeaderWarning: "\u26A0\uFE0F Set ignoreVary to true when matching this entry",
  /**
   * @description Text used to show that data was retrieved from ServiceWorker Cache
   */
  serviceWorkerCache: "`Service Worker` Cache",
  /**
   * @description Span text content in Service Worker Cache Views of the Application panel
   * @example {2} PH1
   */
  matchingEntriesS: "Matching entries: {PH1}",
  /**
   * @description Span text content in Indexed DBViews of the Application panel
   * @example {2} PH1
   */
  totalEntriesS: "Total entries: {PH1}",
  /**
   * @description Text for network request headers
   */
  headers: "Headers",
  /**
   * @description Text for previewing items
   */
  preview: "Preview"
};
var str_16 = i18n31.i18n.registerUIStrings("panels/application/ServiceWorkerCacheViews.ts", UIStrings16);
var i18nString16 = i18n31.i18n.getLocalizedString.bind(void 0, str_16);
var ServiceWorkerCacheView = class extends UI11.View.SimpleView {
  model;
  entriesForTest;
  splitWidget;
  previewPanel;
  preview;
  cache;
  dataGrid;
  refreshThrottler;
  refreshButton;
  deleteSelectedButton;
  entryPathFilter;
  returnCount;
  summaryBarElement;
  loadingPromise;
  metadataView = new ApplicationComponents8.StorageMetadataView.StorageMetadataView();
  constructor(model, cache) {
    super({
      title: i18nString16(UIStrings16.cache),
      viewId: "cache",
      jslog: `${VisualLogging8.pane("cache-storage-data")}`
    });
    this.registerRequiredCSS(serviceWorkerCacheViews_css_default);
    this.model = model;
    this.entriesForTest = null;
    this.element.classList.add("service-worker-cache-data-view");
    this.element.classList.add("storage-view");
    const editorToolbar = this.element.createChild("devtools-toolbar", "data-view-toolbar");
    editorToolbar.setAttribute("jslog", `${VisualLogging8.toolbar()}`);
    this.element.appendChild(this.metadataView);
    this.splitWidget = new UI11.SplitWidget.SplitWidget(false, false);
    this.splitWidget.show(this.element);
    this.previewPanel = new UI11.Widget.VBox();
    const resizer = this.previewPanel.element.createChild("div", "cache-preview-panel-resizer");
    this.splitWidget.setMainWidget(this.previewPanel);
    this.splitWidget.installResizer(resizer);
    this.preview = null;
    this.cache = cache;
    const bucketInfo = this.model.target().model(SDK15.StorageBucketsModel.StorageBucketsModel)?.getBucketByName(cache.storageBucket.storageKey, cache.storageBucket.name);
    this.metadataView.setShowOnlyBucket(false);
    if (bucketInfo) {
      this.metadataView.setStorageBucket(bucketInfo);
    } else if (cache.storageKey) {
      this.metadataView.setStorageKey(cache.storageKey);
    }
    this.dataGrid = null;
    this.refreshThrottler = new Common9.Throttler.Throttler(300);
    this.refreshButton = new UI11.Toolbar.ToolbarButton(i18nString16(UIStrings16.refresh), "refresh", void 0, "cache-storage.refresh");
    this.refreshButton.addEventListener("Click", this.refreshButtonClicked, this);
    editorToolbar.appendToolbarItem(this.refreshButton);
    this.deleteSelectedButton = new UI11.Toolbar.ToolbarButton(i18nString16(UIStrings16.deleteSelected), "cross", void 0, "cache-storage.delete-selected");
    this.deleteSelectedButton.addEventListener("Click", (_event) => {
      void this.deleteButtonClicked(null);
    });
    editorToolbar.appendToolbarItem(this.deleteSelectedButton);
    const entryPathFilterBox = new UI11.Toolbar.ToolbarFilter(i18nString16(UIStrings16.filterByPath), 1);
    editorToolbar.appendToolbarItem(entryPathFilterBox);
    const entryPathFilterThrottler = new Common9.Throttler.Throttler(300);
    this.entryPathFilter = "";
    entryPathFilterBox.addEventListener("TextChanged", () => {
      void entryPathFilterThrottler.schedule(() => {
        this.entryPathFilter = entryPathFilterBox.value();
        return this.updateData(true);
      });
    });
    this.returnCount = null;
    this.summaryBarElement = null;
    this.loadingPromise = null;
    this.update(cache);
  }
  resetDataGrid() {
    if (this.dataGrid) {
      this.dataGrid.asWidget().detach();
    }
    this.dataGrid = this.createDataGrid();
    const dataGridWidget = this.dataGrid.asWidget();
    this.splitWidget.setSidebarWidget(dataGridWidget);
    dataGridWidget.setMinimumSize(0, 250);
  }
  wasShown() {
    super.wasShown();
    this.model.addEventListener("CacheStorageContentUpdated", this.cacheContentUpdated, this);
    void this.updateData(true);
  }
  willHide() {
    super.willHide();
    this.model.removeEventListener("CacheStorageContentUpdated", this.cacheContentUpdated, this);
  }
  showPreview(preview) {
    if (preview && this.preview === preview) {
      return;
    }
    if (this.preview) {
      this.preview.detach();
    }
    if (!preview) {
      preview = new UI11.EmptyWidget.EmptyWidget(i18nString16(UIStrings16.noCacheEntrySelected), i18nString16(UIStrings16.selectACacheEntryAboveToPreview));
    }
    this.preview = preview;
    this.preview.show(this.previewPanel.element);
  }
  createDataGrid() {
    const columns = [
      { id: "number", title: "#", sortable: false, width: "3px" },
      { id: "name", title: i18nString16(UIStrings16.name), weight: 4, sortable: true },
      {
        id: "response-type",
        title: i18n31.i18n.lockedString("Response-Type"),
        weight: 1,
        align: "right",
        sortable: true
      },
      { id: "content-type", title: i18n31.i18n.lockedString("Content-Type"), weight: 1, sortable: true },
      {
        id: "content-length",
        title: i18n31.i18n.lockedString("Content-Length"),
        weight: 1,
        align: "right",
        sortable: true
      },
      {
        id: "response-time",
        title: i18nString16(UIStrings16.timeCached),
        width: "12em",
        weight: 1,
        align: "right",
        sortable: true
      },
      { id: "vary-header", title: i18n31.i18n.lockedString("Vary Header"), weight: 1, sortable: true }
    ];
    const dataGrid = new DataGrid5.DataGrid.DataGridImpl({
      displayName: i18nString16(UIStrings16.serviceWorkerCache),
      columns,
      deleteCallback: this.deleteButtonClicked.bind(this),
      refreshCallback: this.updateData.bind(this, true)
    });
    dataGrid.addEventListener("SortingChanged", this.sortingChanged, this);
    dataGrid.addEventListener("SelectedNode", (event) => {
      void this.previewCachedResponse(event.data.data);
    }, this);
    dataGrid.setStriped(true);
    return dataGrid;
  }
  sortingChanged() {
    if (!this.dataGrid) {
      return;
    }
    const dataGrid = this.dataGrid;
    const accending = dataGrid.isSortOrderAscending();
    const columnId = dataGrid.sortColumnId();
    let comparator;
    if (columnId === "name") {
      comparator = (a, b) => a.name.localeCompare(b.name);
    } else if (columnId === "content-type") {
      comparator = (a, b) => a.data.mimeType.localeCompare(b.data.mimeType);
    } else if (columnId === "content-length") {
      comparator = (a, b) => a.data.resourceSize - b.data.resourceSize;
    } else if (columnId === "response-time") {
      comparator = (a, b) => a.data.endTime - b.data.endTime;
    } else if (columnId === "response-type") {
      comparator = (a, b) => a.responseType.localeCompare(b.responseType);
    } else if (columnId === "vary-header") {
      comparator = (a, b) => a.varyHeader.localeCompare(b.varyHeader);
    }
    const children = dataGrid.rootNode().children.slice();
    dataGrid.rootNode().removeChildren();
    children.sort((a, b) => {
      const result = comparator(a, b);
      return accending ? result : -result;
    });
    children.forEach((child) => dataGrid.rootNode().appendChild(child));
  }
  async deleteButtonClicked(node) {
    if (!node) {
      node = this.dataGrid?.selectedNode ?? null;
      if (!node) {
        return;
      }
    }
    await this.model.deleteCacheEntry(this.cache, node.data.url());
    node.remove();
  }
  update(cache = null) {
    if (!cache) {
      return;
    }
    this.cache = cache;
    this.resetDataGrid();
    void this.updateData(true);
  }
  updateSummaryBar() {
    if (!this.summaryBarElement) {
      this.summaryBarElement = this.element.createChild("div", "cache-storage-summary-bar");
    }
    this.summaryBarElement.removeChildren();
    const span = this.summaryBarElement.createChild("span");
    if (this.entryPathFilter) {
      span.textContent = i18nString16(UIStrings16.matchingEntriesS, { PH1: String(this.returnCount) });
    } else {
      span.textContent = i18nString16(UIStrings16.totalEntriesS, { PH1: String(this.returnCount) });
    }
  }
  updateDataCallback(entries, returnCount) {
    if (!this.dataGrid) {
      return;
    }
    const selected = this.dataGrid.selectedNode?.data.url();
    this.refreshButton.setEnabled(true);
    this.entriesForTest = entries;
    this.returnCount = returnCount;
    this.updateSummaryBar();
    const oldEntries = /* @__PURE__ */ new Map();
    const rootNode = this.dataGrid.rootNode();
    for (const node of rootNode.children) {
      oldEntries.set(node.data.url, node);
    }
    rootNode.removeChildren();
    let selectedNode = null;
    for (let i = 0; i < entries.length; ++i) {
      const entry = entries[i];
      let node = oldEntries.get(entry.requestURL);
      if (!node || node.data.responseTime !== entry.responseTime) {
        node = new DataGridNode(i, this.createRequest(entry), entry.responseType);
        node.selectable = true;
      } else {
        node.data.number = i;
      }
      rootNode.appendChild(node);
      if (entry.requestURL === selected) {
        selectedNode = node;
      }
    }
    if (!selectedNode) {
      this.showPreview(null);
    } else {
      selectedNode.revealAndSelect();
    }
    this.updatedForTest();
  }
  async updateData(force) {
    if (!force && this.loadingPromise) {
      return await this.loadingPromise;
    }
    this.refreshButton.setEnabled(false);
    if (this.loadingPromise) {
      return await this.loadingPromise;
    }
    this.loadingPromise = new Promise((resolve) => {
      this.model.loadAllCacheData(this.cache, this.entryPathFilter, (entries2, returnCount2) => {
        resolve({ entries: entries2, returnCount: returnCount2 });
      });
    });
    const { entries, returnCount } = await this.loadingPromise;
    this.updateDataCallback(entries, returnCount);
    this.loadingPromise = null;
    return;
  }
  refreshButtonClicked() {
    void this.updateData(true);
  }
  cacheContentUpdated(event) {
    const { cacheName, storageBucket } = event.data;
    if (!this.cache.inBucket(storageBucket) || this.cache.cacheName !== cacheName) {
      return;
    }
    void this.refreshThrottler.schedule(
      () => Promise.resolve(this.updateData(true)),
      "AsSoonAsPossible"
      /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */
    );
  }
  async previewCachedResponse(request) {
    let preview = networkRequestToPreview.get(request);
    if (!preview) {
      preview = new RequestView(request);
      networkRequestToPreview.set(request, preview);
    }
    if (request === this.dataGrid?.selectedNode?.data) {
      this.showPreview(preview);
    }
  }
  createRequest(entry) {
    const request = SDK15.NetworkRequest.NetworkRequest.createWithoutBackendRequest("cache-storage-" + entry.requestURL, entry.requestURL, Platform5.DevToolsPath.EmptyUrlString, null);
    request.requestMethod = entry.requestMethod;
    request.setRequestHeaders(entry.requestHeaders);
    request.statusCode = entry.responseStatus;
    request.statusText = entry.responseStatusText;
    request.protocol = new Common9.ParsedURL.ParsedURL(entry.requestURL).scheme;
    request.responseHeaders = entry.responseHeaders;
    request.setRequestHeadersText("");
    request.endTime = entry.responseTime;
    let header = entry.responseHeaders.find((header2) => header2.name.toLowerCase() === "content-type");
    let mimeType = "text/plain";
    if (header) {
      const result = Platform5.MimeType.parseContentType(header.value);
      if (result.mimeType) {
        mimeType = result.mimeType;
      }
    }
    request.mimeType = mimeType;
    header = entry.responseHeaders.find((header2) => header2.name.toLowerCase() === "content-length");
    request.resourceSize = header && Number(header.value) || 0;
    let resourceType = Common9.ResourceType.ResourceType.fromMimeType(mimeType);
    if (!resourceType) {
      resourceType = Common9.ResourceType.ResourceType.fromURL(entry.requestURL) || Common9.ResourceType.resourceTypes.Other;
    }
    request.setResourceType(resourceType);
    request.setContentDataProvider(this.requestContent.bind(this, request));
    return request;
  }
  async requestContent(request) {
    const response = await this.cache.requestCachedResponse(request.url(), request.requestHeaders());
    if (!response) {
      return { error: "No cached response found" };
    }
    return new TextUtils.ContentData.ContentData(
      response.body,
      /* isBase64=*/
      true,
      request.mimeType,
      request.charset() ?? void 0
    );
  }
  updatedForTest() {
  }
};
var networkRequestToPreview = /* @__PURE__ */ new WeakMap();
var DataGridNode = class extends DataGrid5.DataGrid.DataGridNode {
  number;
  name;
  request;
  responseType;
  varyHeader;
  constructor(number, request, responseType) {
    super(request);
    this.number = number;
    const parsed = new Common9.ParsedURL.ParsedURL(request.url());
    if (parsed.isValid) {
      this.name = Platform5.StringUtilities.trimURL(request.url(), parsed.domain());
    } else {
      this.name = request.url();
    }
    this.request = request;
    this.responseType = responseType;
    this.varyHeader = request.responseHeaders.find((header) => header.name.toLowerCase() === "vary")?.value || "";
  }
  createCell(columnId) {
    const cell = this.createTD(columnId);
    let value;
    let tooltip = this.request.url();
    if (columnId === "number") {
      value = String(this.number);
    } else if (columnId === "name") {
      value = this.name;
    } else if (columnId === "response-type") {
      if (this.responseType === "opaqueResponse") {
        value = "opaque";
      } else if (this.responseType === "opaqueRedirect") {
        value = "opaqueredirect";
      } else {
        value = this.responseType;
      }
    } else if (columnId === "content-type") {
      value = this.request.mimeType;
    } else if (columnId === "content-length") {
      value = (this.request.resourceSize | 0).toLocaleString("en-US");
    } else if (columnId === "response-time") {
      value = new Date(this.request.endTime * 1e3).toLocaleString();
    } else if (columnId === "vary-header") {
      value = this.varyHeader;
      if (this.varyHeader) {
        tooltip = i18nString16(UIStrings16.varyHeaderWarning);
      }
    }
    const parentElement = cell.parentElement;
    let gridNode;
    if (parentElement && this.dataGrid) {
      gridNode = this.dataGrid.elementToDataGridNode.get(parentElement);
    }
    DataGrid5.DataGrid.DataGridImpl.setElementText(
      cell,
      value || "",
      /* longText= */
      true,
      gridNode
    );
    UI11.Tooltip.Tooltip.install(cell, tooltip);
    return cell;
  }
};
var RequestView = class extends UI11.Widget.VBox {
  tabbedPane;
  resourceViewTabSetting;
  constructor(request) {
    super();
    this.tabbedPane = new UI11.TabbedPane.TabbedPane();
    this.tabbedPane.element.setAttribute("jslog", `${VisualLogging8.section("network-item-preview")}`);
    this.tabbedPane.addEventListener(UI11.TabbedPane.Events.TabSelected, this.tabSelected, this);
    this.resourceViewTabSetting = Common9.Settings.Settings.instance().createSetting("cache-storage-view-tab", "preview");
    this.tabbedPane.appendTab("headers", i18nString16(UIStrings16.headers), LegacyWrapper.LegacyWrapper.legacyWrapper(UI11.Widget.VBox, new NetworkComponents.RequestHeadersView.RequestHeadersView(request)));
    this.tabbedPane.appendTab("preview", i18nString16(UIStrings16.preview), new Network.RequestPreviewView.RequestPreviewView(request));
    this.tabbedPane.show(this.element);
  }
  wasShown() {
    super.wasShown();
    this.selectTab();
  }
  selectTab(tabId) {
    if (!tabId) {
      tabId = this.resourceViewTabSetting.get();
    }
    if (tabId && !this.tabbedPane.selectTab(tabId)) {
      this.tabbedPane.selectTab("headers");
    }
  }
  tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this.resourceViewTabSetting.set(event.data.tabId);
  }
};

// gen/front_end/panels/application/ServiceWorkerCacheTreeElement.js
var UIStrings17 = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  cacheStorage: "Cache storage",
  /**
   * @description Text in Application Panel if no cache storage was detected.
   */
  noCacheStorage: "No cache storage detected",
  /**
   * @description Description text in Application Panel describing the cache storage tab
   */
  cacheStorageDescription: "On this page you can view and delete cache data.",
  /**
   * @description A context menu item in the Application Panel Sidebar of the Application panel
   */
  refreshCaches: "Refresh Caches",
  /**
   * @description Text to delete something
   */
  delete: "Delete"
};
var str_17 = i18n33.i18n.registerUIStrings("panels/application/ServiceWorkerCacheTreeElement.ts", UIStrings17);
var i18nString17 = i18n33.i18n.getLocalizedString.bind(void 0, str_17);
var ServiceWorkerCacheTreeElement = class extends ExpandableApplicationPanelTreeElement {
  swCacheModels;
  swCacheTreeElements;
  storageBucket;
  constructor(resourcesPanel, storageBucket) {
    super(resourcesPanel, i18nString17(UIStrings17.cacheStorage), i18nString17(UIStrings17.noCacheStorage), i18nString17(UIStrings17.cacheStorageDescription), "cache-storage");
    const icon = createIcon7("database");
    this.setLink("https://developer.chrome.com/docs/devtools/storage/cache/");
    this.setLeadingIcons([icon]);
    this.swCacheModels = /* @__PURE__ */ new Set();
    this.swCacheTreeElements = /* @__PURE__ */ new Set();
    this.storageBucket = storageBucket;
  }
  initialize() {
    this.swCacheModels.clear();
    this.swCacheTreeElements.clear();
    SDK16.TargetManager.TargetManager.instance().observeModels(SDK16.ServiceWorkerCacheModel.ServiceWorkerCacheModel, {
      modelAdded: (model) => this.serviceWorkerCacheModelAdded(model),
      modelRemoved: (model) => this.serviceWorkerCacheModelRemoved(model)
    });
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI12.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString17(UIStrings17.refreshCaches), this.refreshCaches.bind(this), { jslogContext: "refresh-caches" });
    void contextMenu.show();
  }
  refreshCaches() {
    for (const swCacheModel of this.swCacheModels) {
      swCacheModel.refreshCacheNames();
    }
  }
  serviceWorkerCacheModelAdded(model) {
    model.enable();
    this.swCacheModels.add(model);
    for (const cache of model.caches()) {
      this.addCache(model, cache);
    }
    model.addEventListener("CacheAdded", this.cacheAdded, this);
    model.addEventListener("CacheRemoved", this.cacheRemoved, this);
  }
  serviceWorkerCacheModelRemoved(model) {
    for (const cache of model.caches()) {
      this.removeCache(model, cache);
    }
    model.removeEventListener("CacheAdded", this.cacheAdded, this);
    model.removeEventListener("CacheRemoved", this.cacheRemoved, this);
    this.swCacheModels.delete(model);
  }
  cacheAdded(event) {
    const { model, cache } = event.data;
    this.addCache(model, cache);
  }
  cacheInTree(cache) {
    if (this.storageBucket) {
      return cache.inBucket(this.storageBucket);
    }
    return true;
  }
  addCache(model, cache) {
    if (this.cacheInTree(cache)) {
      const swCacheTreeElement = new SWCacheTreeElement(this.resourcesPanel, model, cache, this.storageBucket === void 0);
      this.swCacheTreeElements.add(swCacheTreeElement);
      this.appendChild(swCacheTreeElement);
    }
  }
  cacheRemoved(event) {
    const { model, cache } = event.data;
    if (this.cacheInTree(cache)) {
      this.removeCache(model, cache);
    }
  }
  removeCache(model, cache) {
    const swCacheTreeElement = this.cacheTreeElement(model, cache);
    if (!swCacheTreeElement) {
      return;
    }
    this.removeChild(swCacheTreeElement);
    this.swCacheTreeElements.delete(swCacheTreeElement);
    this.setExpandable(this.childCount() > 0);
  }
  cacheTreeElement(model, cache) {
    for (const cacheTreeElement of this.swCacheTreeElements) {
      if (cacheTreeElement.hasModelAndCache(model, cache)) {
        return cacheTreeElement;
      }
    }
    return null;
  }
};
var SWCacheTreeElement = class extends ApplicationPanelTreeElement {
  model;
  cache;
  view;
  constructor(resourcesPanel, model, cache, appendStorageKey) {
    let cacheName;
    if (appendStorageKey) {
      cacheName = cache.cacheName + " - " + cache.storageKey;
    } else {
      cacheName = cache.cacheName;
    }
    super(resourcesPanel, cacheName, false, "cache-storage-instance");
    this.model = model;
    this.cache = cache;
    this.view = null;
    const icon = createIcon7("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "cache://" + this.cache.cacheId;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI12.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString17(UIStrings17.delete), this.clearCache.bind(this), { jslogContext: "delete" });
    void contextMenu.show();
  }
  clearCache() {
    void this.model.deleteCache(this.cache);
  }
  update(cache) {
    this.cache = cache;
    if (this.view) {
      this.view.update(cache);
    }
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ServiceWorkerCacheView(this.model, this.cache);
    }
    this.showView(this.view);
    Host6.userMetrics.panelShown("service-worker-cache");
    return false;
  }
  hasModelAndCache(model, cache) {
    return this.cache.equals(cache) && this.model === model;
  }
};

// gen/front_end/panels/application/ServiceWorkersView.js
var ServiceWorkersView_exports = {};
__export(ServiceWorkersView_exports, {
  Section: () => Section,
  ServiceWorkersView: () => ServiceWorkersView,
  setThrottleDisabledForDebugging: () => setThrottleDisabledForDebugging
});
import * as Common10 from "./../../core/common/common.js";
import * as Host7 from "./../../core/host/host.js";
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as SDK18 from "./../../core/sdk/sdk.js";
import * as NetworkForward2 from "./../network/forward/forward.js";
import * as Buttons6 from "./../../ui/components/buttons/buttons.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI14 from "./../../ui/legacy/legacy.js";
import * as VisualLogging10 from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../mobile_throttling/mobile_throttling.js";
import * as ApplicationComponents9 from "./components/components.js";

// gen/front_end/panels/application/serviceWorkersView.css.js
var serviceWorkersView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.service-worker-version {
  display: flex;
  /* The status string can be long, allow this line of the report to wrap. */
  align-items: center;
  flex-wrap: wrap;

  devtools-button {
    margin-left: var(--sys-size-3);
  }
}

.service-worker-version-stack {
  position: relative;
}

.service-worker-version-stack-bar {
  position: absolute;
  top: 10px;
  bottom: 20px;
  left: 4px;
  content: "";
  border-left: 1px solid var(--sys-color-divider);
  z-index: 0;
}

.service-worker-version:not(:last-child) {
  margin-bottom: 7px;
}

.service-worker-version-string {
  /* This label contains important information that needs to be legible at all
     times. Don't shrink it. */
  flex-shrink: 0;
}

.service-worker-active-circle,
.service-worker-redundant-circle,
.service-worker-waiting-circle,
.service-worker-installing-circle {
  position: relative;
  display: inline-block;
  width: 10px;
  height: 10px;
  z-index: 10;
  margin-right: 5px;
  border-radius: 50%;
  border: 1px solid var(--sys-color-token-subtle);
  align-self: center;
  /* The circle should not shrink, to avoid risking becoming invisible. */
  flex-shrink: 0;
}

.service-worker-active-circle {
  background-color: var(--sys-color-green-bright);
}

.service-worker-waiting-circle {
  background-color: var(--sys-color-yellow-bright);
}

.service-worker-installing-circle {
  background-color: var(--sys-color-cdt-base-container);
}

.service-worker-redundant-circle {
  background-color: var(--sys-color-neutral-bright);
}

.service-worker-subtitle {
  padding-left: 14px;
  line-height: 14px;
  color: var(--sys-color-state-disabled);
}

.link {
  margin-left: 7px;
}

.service-worker-editor-with-button {
  align-items: baseline;
  display: flex;
}

.service-worker-notification-editor {
  border: 1px solid var(--sys-color-divider);
  display: flex;
  flex: auto;
  margin-right: 4px;
  max-width: 400px;
  min-width: 80px;
}

.report-field-value {
  white-space: normal;
}

.report-field-value-filename,
.service-worker-client-string {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-field-value-filename {
  display: contents;
}

.report-field-value-subtitle {
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-worker-client {
  display: flex;
}

.service-worker-client-focus-link {
  flex: none;
  margin-left: 2px;
  align-self: center;
}

.service-worker-notification-editor.source-code {
  /** Simulate CodeMirror that is shown above */
  padding: 4px;
}

.service-worker-list {
  background-color: var(--sys-color-cdt-base-container);
  overflow: auto;
}

.service-workers-this-origin {
  flex-shrink: 0;
  flex-grow: 0;
}

.devtools-link {
  line-height: 14px;
  align-self: center;
  padding: 1px;
}

button.link {
  padding: 1px;
}

button.link:focus-visible {
  background-color: inherit;
}

/*# sourceURL=${import.meta.resolve("./serviceWorkersView.css")} */`;

// gen/front_end/panels/application/serviceWorkerUpdateCycleView.css.js
var serviceWorkerUpdateCycleView_css_default = `/*
 * Copyright 2020 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.resource-service-worker-update-view {
  display: block;
  margin: 6px;
  color: var(--sys-color-on-surface-subtle);
  overflow: auto;
}

.service-worker-update-timing-table {
  border: 1px solid var(--sys-color-divider);
  border-spacing: 0;
  padding-left: 10px;
  padding-right: 10px;
  line-height: initial;
  table-layout: auto;
  overflow: hidden;
}

.service-worker-update-timing-row {
  position: relative;
  height: 20px;
  overflow: hidden;
  min-width: 80px;
}

.service-worker-update-timing-bar {
  position: absolute;
  min-width: 1px;
  top: 0;
  bottom: 0;
}

.service-worker-update-timing-bar-clickable::before {
  user-select: none;
  mask-image: var(--image-file-triangle-right);
  float: left;
  width: 14px;
  height: 14px;
  margin-right: 2px;
  content: "";
  position: relative;
  background-color: var(--icon-default);
  transition: transform 200ms;
}

.service-worker-update-timing-bar-clickable {
  position: relative;
  left: -12px;
}

.service-worker-update-timing-bar-clickable:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.service-worker-update-timing-bar-clickable[aria-checked="true"]::before {
  transform: rotate(90deg);
}

.service-worker-update-timing-bar-details-collapsed {
  display: none;
}

.service-worker-update-timing-bar-details-expanded {
  display: table-row;
}

.service-worker-update-timing-bar-details:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.service-worker-update-timing-bar.activate {
  top: 5px;
  height: 10px;
  background-color: var(--sys-color-yellow-bright);
}

.service-worker-update-timing-bar.wait {
  top: 5px;
  height: 10px;
  background-color: var(--sys-color-purple-bright);
}

.service-worker-update-timing-bar.install {
  top: 5px;
  height: 10px;
  background-color: var(--sys-color-cyan-bright);
}

.service-worker-update-timing-table > tr > td {
  padding: 4px 0;
  padding-right: 10px;
}

table.service-worker-update-timing-table > tr.service-worker-update-timing-table-header > td {
  border-top: 5px solid transparent;
  color: var(--sys-color-token-subtle);
}

table.service-worker-update-timing-table > tr.service-worker-update-timing-bar-details > td:first-child {
  padding-left: 12px;
}

table.service-worker-update-timing-table > tr.service-worker-update-timeline > td:first-child {
  padding-left: 12px;
}

/*# sourceURL=${import.meta.resolve("./serviceWorkerUpdateCycleView.css")} */`;

// gen/front_end/panels/application/ServiceWorkerUpdateCycleView.js
var ServiceWorkerUpdateCycleView_exports = {};
__export(ServiceWorkerUpdateCycleView_exports, {
  ServiceWorkerUpdateCycleView: () => ServiceWorkerUpdateCycleView
});
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as SDK17 from "./../../core/sdk/sdk.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings18 = {
  /**
   * @description Text in Indexed DBViews of the Application panel
   */
  version: "Version",
  /**
   * @description Table heading for Service Workers update information. Update is a noun.
   */
  updateActivity: "Update Activity",
  /**
   * @description Title for the timeline tab.
   */
  timeline: "Timeline",
  /**
   * @description Text in Service Workers Update Life Cycle
   * @example {2} PH1
   */
  startTimeS: "Start time: {PH1}",
  /**
   * @description Text for end time of an event
   * @example {2} PH1
   */
  endTimeS: "End time: {PH1}"
};
var str_18 = i18n35.i18n.registerUIStrings("panels/application/ServiceWorkerUpdateCycleView.ts", UIStrings18);
var i18nString18 = i18n35.i18n.getLocalizedString.bind(void 0, str_18);
var ServiceWorkerUpdateCycleView = class {
  registration;
  rows;
  selectedRowIndex;
  tableElement;
  constructor(registration) {
    this.registration = registration;
    this.rows = [];
    this.selectedRowIndex = -1;
    this.tableElement = document.createElement("table");
    this.createTimingTable();
  }
  calculateServiceWorkerUpdateRanges() {
    function addRange(ranges, range) {
      if (range.start < Number.MAX_VALUE && range.start <= range.end) {
        ranges.push(range);
      }
    }
    function addNormalizedRanges(ranges, id, startInstallTime, endInstallTime, startActivateTime, endActivateTime, status) {
      addRange(ranges, { id, phase: "Install", start: startInstallTime, end: endInstallTime });
      if (status === "activating" || status === "activated" || status === "redundant") {
        addRange(ranges, {
          id,
          phase: "Wait",
          start: endInstallTime,
          end: startActivateTime
        });
        addRange(ranges, { id, phase: "Activate", start: startActivateTime, end: endActivateTime });
      }
    }
    function rangesForVersion(version) {
      let state = version.currentState;
      let endActivateTime = 0;
      let beginActivateTime = 0;
      let endInstallTime = 0;
      let beginInstallTime = 0;
      const currentStatus = state.status;
      if (currentStatus === "new") {
        return [];
      }
      while (state) {
        if (state.status === "activated") {
          endActivateTime = state.lastUpdatedTimestamp;
        } else if (state.status === "activating") {
          if (endActivateTime === 0) {
            endActivateTime = state.lastUpdatedTimestamp;
          }
          beginActivateTime = state.lastUpdatedTimestamp;
        } else if (state.status === "installed") {
          endInstallTime = state.lastUpdatedTimestamp;
        } else if (state.status === "installing") {
          if (endInstallTime === 0) {
            endInstallTime = state.lastUpdatedTimestamp;
          }
          beginInstallTime = state.lastUpdatedTimestamp;
        }
        state = state.previousState;
      }
      const ranges = [];
      addNormalizedRanges(ranges, version.id, beginInstallTime, endInstallTime, beginActivateTime, endActivateTime, currentStatus);
      return ranges;
    }
    const versions = this.registration.versionsByMode();
    const modes = [
      "active",
      "waiting",
      "installing",
      "redundant"
    ];
    for (const mode of modes) {
      const version = versions.get(mode);
      if (version) {
        const ranges = rangesForVersion(version);
        return ranges;
      }
    }
    return [];
  }
  createTimingTable() {
    this.tableElement.classList.add("service-worker-update-timing-table");
    this.tableElement.setAttribute("jslog", `${VisualLogging9.tree("update-timing-table")}`);
    const timeRanges = this.calculateServiceWorkerUpdateRanges();
    this.updateTimingTable(timeRanges);
  }
  createTimingTableHead() {
    const serverHeader = this.tableElement.createChild("tr", "service-worker-update-timing-table-header");
    UI13.UIUtils.createTextChild(serverHeader.createChild("td"), i18nString18(UIStrings18.version));
    UI13.UIUtils.createTextChild(serverHeader.createChild("td"), i18nString18(UIStrings18.updateActivity));
    UI13.UIUtils.createTextChild(serverHeader.createChild("td"), i18nString18(UIStrings18.timeline));
  }
  removeRows() {
    const rows = this.tableElement.getElementsByTagName("tr");
    while (rows[0]) {
      if (rows[0].parentNode) {
        rows[0].parentNode.removeChild(rows[0]);
      }
    }
    this.rows = [];
  }
  updateTimingTable(timeRanges) {
    this.selectedRowIndex = -1;
    this.removeRows();
    this.createTimingTableHead();
    const timeRangeArray = timeRanges;
    if (timeRangeArray.length === 0) {
      return;
    }
    const startTimes = timeRangeArray.map((r) => r.start);
    const endTimes = timeRangeArray.map((r) => r.end);
    const startTime = startTimes.reduce((a, b) => Math.min(a, b));
    const endTime = endTimes.reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);
    for (const range of timeRangeArray) {
      const phaseName = range.phase;
      const left = scale * (range.start - startTime);
      const right = scale * (endTime - range.end);
      const tr = this.tableElement.createChild("tr", "service-worker-update-timeline");
      tr.setAttribute("jslog", `${VisualLogging9.treeItem("update-timeline").track({
        click: true,
        keydown: "ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Space"
      })}`);
      this.rows.push(tr);
      const timingBarVersionElement = tr.createChild("td");
      UI13.UIUtils.createTextChild(timingBarVersionElement, "#" + range.id);
      timingBarVersionElement.classList.add("service-worker-update-timing-bar-clickable");
      timingBarVersionElement.setAttribute("tabindex", "0");
      timingBarVersionElement.setAttribute("role", "switch");
      timingBarVersionElement.addEventListener("focus", (event) => {
        this.onFocus(event);
      });
      timingBarVersionElement.setAttribute("jslog", `${VisualLogging9.expand("timing-info").track({ click: true })}`);
      UI13.ARIAUtils.setChecked(timingBarVersionElement, false);
      const timingBarTitleElement = tr.createChild("td");
      UI13.UIUtils.createTextChild(timingBarTitleElement, phaseName);
      const barContainer = tr.createChild("td").createChild("div", "service-worker-update-timing-row");
      const bar = barContainer.createChild("span", "service-worker-update-timing-bar " + phaseName.toLowerCase());
      bar.style.left = left + "%";
      bar.style.right = right + "%";
      bar.textContent = "\u200B";
      this.constructUpdateDetails(tr, range);
    }
  }
  /**
   * Detailed information about an update phase. Currently starting and ending time.
   */
  constructUpdateDetails(tr, range) {
    const startRow = this.tableElement.createChild("tr", "service-worker-update-timing-bar-details");
    startRow.classList.add("service-worker-update-timing-bar-details-collapsed");
    const startTimeItem = startRow.createChild("td");
    startTimeItem.colSpan = 3;
    const startTime = new Date(range.start).toISOString();
    UI13.UIUtils.createTextChild(startTimeItem.createChild("span"), i18nString18(UIStrings18.startTimeS, { PH1: startTime }));
    startRow.tabIndex = 0;
    const endRow = this.tableElement.createChild("tr", "service-worker-update-timing-bar-details");
    endRow.classList.add("service-worker-update-timing-bar-details-collapsed");
    const endTimeItem = endRow.createChild("td");
    endTimeItem.colSpan = 3;
    const endTime = new Date(range.end).toISOString();
    UI13.UIUtils.createTextChild(endTimeItem.createChild("span"), i18nString18(UIStrings18.endTimeS, { PH1: endTime }));
    endRow.tabIndex = 0;
    tr.addEventListener("keydown", (event) => {
      this.onKeydown(event, startRow, endRow);
    });
    tr.addEventListener("click", (event) => {
      this.onClick(event, startRow, endRow);
    });
  }
  toggle(startRow, endRow, target, expanded) {
    if (target.classList.contains("service-worker-update-timing-bar-clickable")) {
      startRow.classList.toggle("service-worker-update-timing-bar-details-collapsed");
      startRow.classList.toggle("service-worker-update-timing-bar-details-expanded");
      endRow.classList.toggle("service-worker-update-timing-bar-details-collapsed");
      endRow.classList.toggle("service-worker-update-timing-bar-details-expanded");
      UI13.ARIAUtils.setChecked(target, !expanded);
    }
  }
  onFocus(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    const tr = target.parentElement;
    if (!tr) {
      return;
    }
    this.selectedRowIndex = this.rows.indexOf(tr);
  }
  onKeydown(event, startRow, endRow) {
    if (!event.target) {
      return;
    }
    const target = event.target;
    const keyboardEvent = event;
    const expanded = target.getAttribute("aria-checked") === "true";
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      this.toggle(startRow, endRow, target, expanded);
      event.preventDefault();
      return;
    }
    if (!expanded && keyboardEvent.key === "ArrowRight" || expanded && keyboardEvent.key === "ArrowLeft") {
      this.toggle(startRow, endRow, target, expanded);
      event.preventDefault();
      return;
    }
    if (keyboardEvent.key === "ArrowDown") {
      if (this.selectedRowIndex >= 0) {
        this.selectNextRow();
      } else {
        this.selectFirstRow();
      }
      event.preventDefault();
    }
    if (keyboardEvent.key === "ArrowUp") {
      if (this.selectedRowIndex >= 0) {
        this.selectPreviousRow();
      } else {
        this.selectLastRow();
      }
      event.preventDefault();
    }
  }
  focusRow(row) {
    row.cells[0].focus();
  }
  blurRow(row) {
    row.cells[0].blur();
  }
  selectFirstRow() {
    if (this.rows.length === 0) {
      return;
    }
    this.selectedRowIndex = 0;
    this.focusRow(this.rows[0]);
  }
  selectLastRow() {
    if (this.rows.length === 0) {
      return;
    }
    this.selectedRowIndex = this.rows.length - 1;
    this.focusRow(this.rows[this.selectedRowIndex]);
  }
  selectNextRow() {
    if (this.rows.length === 0) {
      return;
    }
    const previousRowIndex = this.selectedRowIndex;
    this.selectedRowIndex++;
    if (this.selectedRowIndex >= this.rows.length) {
      this.selectedRowIndex = 0;
    }
    this.blurRow(this.rows[previousRowIndex]);
    this.focusRow(this.rows[this.selectedRowIndex]);
  }
  selectPreviousRow() {
    if (this.rows.length === 0) {
      return;
    }
    const previousRowIndex = this.selectedRowIndex;
    this.selectedRowIndex--;
    if (this.selectedRowIndex < 0) {
      this.selectedRowIndex = this.rows.length - 1;
    }
    this.blurRow(this.rows[previousRowIndex]);
    this.focusRow(this.rows[this.selectedRowIndex]);
  }
  onClick(event, startRow, endRow) {
    const tr = event.target;
    if (!tr) {
      return;
    }
    const expanded = tr.getAttribute("aria-checked") === "true";
    this.toggle(startRow, endRow, tr, expanded);
    event.preventDefault();
  }
  refresh() {
    const timeRanges = this.calculateServiceWorkerUpdateRanges();
    this.updateTimingTable(timeRanges);
  }
};

// gen/front_end/panels/application/ServiceWorkersView.js
var UIStrings19 = {
  /**
   * @description Text for linking to other Service Worker registrations
   */
  serviceWorkersFromOtherOrigins: "Service workers from other origins",
  /**
   * @description Title of update on reload setting in service workers view of the application panel
   */
  updateOnReload: "Update on reload",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
   */
  onPageReloadForceTheService: "On page reload, force the `service worker` to update, and activate it",
  /**
   * @description Title of bypass service worker setting in service workers view of the application panel
   */
  bypassForNetwork: "Bypass for network",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Service Workers View of the Application panel
   */
  bypassTheServiceWorkerAndLoad: "Bypass the `service worker` and load resources from the network",
  /**
   * @description Screen reader title for a section of the Service Workers view of the Application panel
   * @example {https://example.com} PH1
   */
  serviceWorkerForS: "`Service worker` for {PH1}",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  testPushMessageFromDevtools: "Test push message from DevTools.",
  /**
   * @description Button label for service worker network requests
   */
  networkRequests: "Network requests",
  /**
   * @description Label for a button in the Service Workers View of the Application panel.
   * Imperative noun. Clicking the button will refresh the list of service worker registrations.
   */
  update: "Update",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  unregisterServiceWorker: "Unregister service worker",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  unregister: "Unregister",
  /**
   * @description Text for the source of something
   */
  source: "Source",
  /**
   * @description Text for the status of something
   */
  status: "Status",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  clients: "Clients",
  /**
   * @description Text in Service Workers View of the Application panel. Label for a section of the
   * tool which allows the developer to send a test push message to the service worker.
   */
  pushString: "Push",
  /**
   * @description Text in Service Workers View of the Application panel. Placeholder text for where
   * the user can type in the data they want to push to the service worker i.e. the 'push data'. Noun
   * phrase.
   */
  pushData: "Push data",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  syncString: "Sync",
  /**
   * @description Placeholder text for the input box where a user is asked for a test tag to sync. This is used as a compound noun, not as a verb.
   */
  syncTag: "Sync tag",
  /**
   * @description Text for button in Service Workers View of the Application panel that dispatches a periodicsync event
   */
  periodicSync: "Periodic sync",
  /**
   * @description Default tag for a periodicsync event in Service Workers View of the Application panel
   */
  periodicSyncTag: "Periodic sync tag",
  /**
   * @description Aria accessible name in Service Workers View of the Application panel
   * @example {3} PH1
   */
  sRegistrationErrors: "{PH1} registration errors",
  /**
   * @description Text in Service Workers View of the Application panel. The Date/time that a service
   * worker version update was received by the webpage.
   * @example {7/3/2019, 3:38:37 PM} PH1
   */
  receivedS: "Received {PH1}",
  /**
   **@description Text in Service Workers View of the Application panel.
   */
  routers: "Routers",
  /**
   * @description Text in Service Workers View of the Application panel
   * @example {example.com} PH1
   */
  sDeleted: "{PH1} - deleted",
  /**
   * @description Text in Service Workers View of the Application panel
   * @example {1} PH1
   * @example {stopped} PH2
   */
  sActivatedAndIsS: "#{PH1} activated and is {PH2}",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  stopString: "Stop",
  /**
   * @description Text in Service Workers View of the Application panel
   */
  startString: "Start",
  /**
   * @description Text in Service Workers View of the Application panel. Service workers have
   * different versions, which are labelled with numbers e.g. version #2. This text indicates that a
   * particular version is now redundant (it was replaced by a newer version). # means 'number' here.
   * @example {2} PH1
   */
  sIsRedundant: "#{PH1} is redundant",
  /**
   * @description Text in Service Workers View of the Application panel
   * @example {2} PH1
   */
  sWaitingToActivate: "#{PH1} waiting to activate",
  /**
   * @description Text in Service Workers View of the Application panel
   * @example {2} PH1
   */
  sTryingToInstall: "#{PH1} trying to install",
  /**
   * @description Text in Service Workers Update Timeline. Update is a noun.
   */
  updateCycle: "Update Cycle",
  /**
   * @description Text of a DOM element in Service Workers View of the Application panel
   * @example {example.com} PH1
   */
  workerS: "Worker: {PH1}",
  /**
   * @description Link text in Service Workers View of the Application panel. When the link is clicked,
   * the focus is moved to the service worker's client page.
   */
  focus: "focus",
  /**
   * @description Link to view all the Service Workers that have been registered.
   */
  seeAllRegistrations: "See all registrations"
};
var str_19 = i18n37.i18n.registerUIStrings("panels/application/ServiceWorkersView.ts", UIStrings19);
var i18nString19 = i18n37.i18n.getLocalizedString.bind(void 0, str_19);
var throttleDisabledForDebugging = false;
var setThrottleDisabledForDebugging = (enable) => {
  throttleDisabledForDebugging = enable;
};
var ServiceWorkersView = class extends UI14.Widget.VBox {
  currentWorkersView;
  toolbar;
  sections;
  manager;
  securityOriginManager;
  sectionToRegistration;
  eventListeners;
  constructor() {
    super({
      jslog: `${VisualLogging10.pane("service-workers")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(serviceWorkersView_css_default);
    this.currentWorkersView = new UI14.ReportView.ReportView(i18n37.i18n.lockedString("Service workers"));
    this.currentWorkersView.setBodyScrollable(false);
    this.contentElement.classList.add("service-worker-list");
    this.currentWorkersView.show(this.contentElement);
    this.currentWorkersView.element.classList.add("service-workers-this-origin");
    this.currentWorkersView.element.setAttribute("jslog", `${VisualLogging10.section("this-origin")}`);
    this.toolbar = this.currentWorkersView.createToolbar();
    this.sections = /* @__PURE__ */ new Map();
    this.manager = null;
    this.securityOriginManager = null;
    this.sectionToRegistration = /* @__PURE__ */ new WeakMap();
    const othersDiv = this.contentElement.createChild("div", "service-workers-other-origin");
    othersDiv.setAttribute("jslog", `${VisualLogging10.section("other-origin")}`);
    const othersView = new UI14.ReportView.ReportView();
    othersView.setHeaderVisible(false);
    othersView.show(othersDiv);
    const othersSection = othersView.appendSection(i18nString19(UIStrings19.serviceWorkersFromOtherOrigins));
    const othersSectionRow = othersSection.appendRow();
    const seeOthers = UI14.Fragment.html`<a class="devtools-link" role="link" tabindex="0" href="chrome://serviceworker-internals" target="_blank" style="display: inline; cursor: pointer;">${i18nString19(UIStrings19.seeAllRegistrations)}</a>`;
    seeOthers.setAttribute("jslog", `${VisualLogging10.link("view-all").track({ click: true })}`);
    self.onInvokeElement(seeOthers, (event) => {
      const rootTarget = SDK18.TargetManager.TargetManager.instance().rootTarget();
      rootTarget && void rootTarget.targetAgent().invoke_createTarget({ url: "chrome://serviceworker-internals?devtools" });
      event.consume(true);
    });
    othersSectionRow.appendChild(seeOthers);
    this.toolbar.appendToolbarItem(MobileThrottling.ThrottlingManager.throttlingManager().createOfflineToolbarCheckbox());
    const updateOnReloadSetting = Common10.Settings.Settings.instance().createSetting("service-worker-update-on-reload", false);
    updateOnReloadSetting.setTitle(i18nString19(UIStrings19.updateOnReload));
    const forceUpdate = new UI14.Toolbar.ToolbarSettingCheckbox(updateOnReloadSetting, i18nString19(UIStrings19.onPageReloadForceTheService));
    this.toolbar.appendToolbarItem(forceUpdate);
    const bypassServiceWorkerSetting = Common10.Settings.Settings.instance().createSetting("bypass-service-worker", false);
    bypassServiceWorkerSetting.setTitle(i18nString19(UIStrings19.bypassForNetwork));
    const fallbackToNetwork = new UI14.Toolbar.ToolbarSettingCheckbox(bypassServiceWorkerSetting, i18nString19(UIStrings19.bypassTheServiceWorkerAndLoad));
    this.toolbar.appendToolbarItem(fallbackToNetwork);
    this.eventListeners = /* @__PURE__ */ new Map();
    SDK18.TargetManager.TargetManager.instance().observeModels(SDK18.ServiceWorkerManager.ServiceWorkerManager, this);
    this.updateListVisibility();
  }
  modelAdded(serviceWorkerManager) {
    if (serviceWorkerManager.target() !== SDK18.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.manager = serviceWorkerManager;
    this.securityOriginManager = serviceWorkerManager.target().model(SDK18.SecurityOriginManager.SecurityOriginManager);
    for (const registration of this.manager.registrations().values()) {
      this.updateRegistration(registration);
    }
    this.eventListeners.set(serviceWorkerManager, [
      this.manager.addEventListener("RegistrationUpdated", this.registrationUpdated, this),
      this.manager.addEventListener("RegistrationDeleted", this.registrationDeleted, this),
      this.securityOriginManager.addEventListener(SDK18.SecurityOriginManager.Events.SecurityOriginAdded, this.updateSectionVisibility, this),
      this.securityOriginManager.addEventListener(SDK18.SecurityOriginManager.Events.SecurityOriginRemoved, this.updateSectionVisibility, this)
    ]);
  }
  modelRemoved(serviceWorkerManager) {
    if (!this.manager || this.manager !== serviceWorkerManager) {
      return;
    }
    Common10.EventTarget.removeEventListeners(this.eventListeners.get(serviceWorkerManager) || []);
    this.eventListeners.delete(serviceWorkerManager);
    this.manager = null;
    this.securityOriginManager = null;
  }
  getTimeStamp(registration) {
    const versions = registration.versionsByMode();
    let timestamp = 0;
    const active = versions.get(
      "active"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE */
    );
    const installing = versions.get(
      "installing"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING */
    );
    const waiting = versions.get(
      "waiting"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING */
    );
    const redundant = versions.get(
      "redundant"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT */
    );
    if (active) {
      timestamp = active.scriptResponseTime;
    } else if (waiting) {
      timestamp = waiting.scriptResponseTime;
    } else if (installing) {
      timestamp = installing.scriptResponseTime;
    } else if (redundant) {
      timestamp = redundant.scriptResponseTime;
    }
    return timestamp || 0;
  }
  updateSectionVisibility() {
    let hasThis = false;
    const movedSections = [];
    for (const section9 of this.sections.values()) {
      const expectedView = this.getReportViewForOrigin(section9.registration.securityOrigin);
      hasThis = hasThis || expectedView === this.currentWorkersView;
      if (section9.section.parentWidget() !== expectedView) {
        movedSections.push(section9);
      }
    }
    for (const section9 of movedSections) {
      const registration = section9.registration;
      this.removeRegistrationFromList(registration);
      this.updateRegistration(registration, true);
    }
    this.currentWorkersView.sortSections((aSection, bSection) => {
      const aRegistration = this.sectionToRegistration.get(aSection);
      const bRegistration = this.sectionToRegistration.get(bSection);
      const aTimestamp = aRegistration ? this.getTimeStamp(aRegistration) : 0;
      const bTimestamp = bRegistration ? this.getTimeStamp(bRegistration) : 0;
      return bTimestamp - aTimestamp;
    });
    for (const section9 of this.sections.values()) {
      if (section9.section.parentWidget() === this.currentWorkersView || this.isRegistrationVisible(section9.registration)) {
        section9.section.showWidget();
      } else {
        section9.section.hideWidget();
      }
    }
    this.contentElement.classList.toggle("service-worker-has-current", Boolean(hasThis));
    this.updateListVisibility();
  }
  registrationUpdated(event) {
    this.updateRegistration(event.data);
    this.gcRegistrations();
  }
  gcRegistrations() {
    if (!this.manager || !this.securityOriginManager) {
      return;
    }
    let hasNonDeletedRegistrations = false;
    const securityOrigins = new Set(this.securityOriginManager.securityOrigins());
    for (const registration of this.manager.registrations().values()) {
      if (!securityOrigins.has(registration.securityOrigin) && !this.isRegistrationVisible(registration)) {
        continue;
      }
      if (!registration.canBeRemoved()) {
        hasNonDeletedRegistrations = true;
        break;
      }
    }
    if (!hasNonDeletedRegistrations) {
      return;
    }
    for (const registration of this.manager.registrations().values()) {
      const visible = securityOrigins.has(registration.securityOrigin) || this.isRegistrationVisible(registration);
      if (!visible && registration.canBeRemoved()) {
        this.removeRegistrationFromList(registration);
      }
    }
  }
  getReportViewForOrigin(origin) {
    if (this.securityOriginManager && (this.securityOriginManager.securityOrigins().includes(origin) || this.securityOriginManager.unreachableMainSecurityOrigin() === origin)) {
      return this.currentWorkersView;
    }
    return null;
  }
  updateRegistration(registration, skipUpdate) {
    let section9 = this.sections.get(registration);
    if (!section9) {
      const title = registration.scopeURL;
      const reportView = this.getReportViewForOrigin(registration.securityOrigin);
      if (!reportView) {
        return;
      }
      const uiSection = reportView.appendSection(title);
      uiSection.setUiGroupTitle(i18nString19(UIStrings19.serviceWorkerForS, { PH1: title }));
      this.sectionToRegistration.set(uiSection, registration);
      section9 = new Section(this.manager, uiSection, registration);
      this.sections.set(registration, section9);
    }
    if (skipUpdate) {
      return;
    }
    this.updateSectionVisibility();
    section9.scheduleUpdate();
  }
  registrationDeleted(event) {
    this.removeRegistrationFromList(event.data);
  }
  removeRegistrationFromList(registration) {
    const section9 = this.sections.get(registration);
    if (section9) {
      section9.section.detach();
    }
    this.sections.delete(registration);
    this.updateSectionVisibility();
  }
  isRegistrationVisible(registration) {
    if (!registration.scopeURL) {
      return true;
    }
    return false;
  }
  updateListVisibility() {
    this.contentElement.classList.toggle("service-worker-list-empty", this.sections.size === 0);
  }
};
var Section = class {
  manager;
  section;
  registration;
  fingerprint;
  pushNotificationDataSetting;
  syncTagNameSetting;
  periodicSyncTagNameSetting;
  updateCycleView;
  routerView;
  networkRequests;
  updateButton;
  deleteButton;
  sourceField;
  statusField;
  clientsField;
  clientInfoCache;
  throttler;
  updateCycleField;
  routerField;
  constructor(manager, section9, registration) {
    this.manager = manager;
    this.section = section9;
    this.registration = registration;
    this.fingerprint = null;
    this.pushNotificationDataSetting = Common10.Settings.Settings.instance().createLocalSetting("push-data", i18nString19(UIStrings19.testPushMessageFromDevtools));
    this.syncTagNameSetting = Common10.Settings.Settings.instance().createLocalSetting("sync-tag-name", "test-tag-from-devtools");
    this.periodicSyncTagNameSetting = Common10.Settings.Settings.instance().createLocalSetting("periodic-sync-tag-name", "test-tag-from-devtools");
    this.updateCycleView = new ServiceWorkerUpdateCycleView(registration);
    this.routerView = new ApplicationComponents9.ServiceWorkerRouterView.ServiceWorkerRouterView();
    this.networkRequests = new Buttons6.Button.Button();
    this.networkRequests.data = {
      variant: "text",
      title: i18nString19(UIStrings19.networkRequests),
      jslogContext: "show-network-requests"
    };
    this.networkRequests.textContent = i18nString19(UIStrings19.networkRequests);
    this.networkRequests.addEventListener("click", this.networkRequestsClicked.bind(this));
    this.section.appendButtonToHeader(this.networkRequests);
    this.updateButton = UI14.UIUtils.createTextButton(i18nString19(UIStrings19.update), this.updateButtonClicked.bind(this), { variant: "text", title: i18nString19(UIStrings19.update), jslogContext: "update" });
    this.section.appendButtonToHeader(this.updateButton);
    this.deleteButton = UI14.UIUtils.createTextButton(i18nString19(UIStrings19.unregister), this.unregisterButtonClicked.bind(this), {
      variant: "text",
      title: i18nString19(UIStrings19.unregisterServiceWorker),
      jslogContext: "unregister"
    });
    this.section.appendButtonToHeader(this.deleteButton);
    this.sourceField = this.wrapWidget(this.section.appendField(i18nString19(UIStrings19.source)));
    this.statusField = this.wrapWidget(this.section.appendField(i18nString19(UIStrings19.status)));
    this.clientsField = this.wrapWidget(this.section.appendField(i18nString19(UIStrings19.clients)));
    this.createSyncNotificationField(i18nString19(UIStrings19.pushString), this.pushNotificationDataSetting.get(), i18nString19(UIStrings19.pushData), this.push.bind(this), "push-message");
    this.createSyncNotificationField(i18nString19(UIStrings19.syncString), this.syncTagNameSetting.get(), i18nString19(UIStrings19.syncTag), this.sync.bind(this), "sync-tag");
    this.createSyncNotificationField(i18nString19(UIStrings19.periodicSync), this.periodicSyncTagNameSetting.get(), i18nString19(UIStrings19.periodicSyncTag), (tag) => this.periodicSync(tag), "periodic-sync-tag");
    this.createUpdateCycleField();
    this.maybeCreateRouterField();
    this.clientInfoCache = /* @__PURE__ */ new Map();
    this.throttler = new Common10.Throttler.Throttler(500);
  }
  createSyncNotificationField(label, initialValue, placeholder, callback, jslogContext) {
    const form = this.wrapWidget(this.section.appendField(label)).createChild("form", "service-worker-editor-with-button");
    const editor = UI14.UIUtils.createInput("source-code service-worker-notification-editor");
    editor.setAttribute("jslog", `${VisualLogging10.textField().track({ change: true }).context(jslogContext)}`);
    form.appendChild(editor);
    const button = UI14.UIUtils.createTextButton(label, void 0, { jslogContext });
    button.type = "submit";
    form.appendChild(button);
    editor.value = initialValue;
    editor.placeholder = placeholder;
    UI14.ARIAUtils.setLabel(editor, label);
    form.addEventListener("submit", (e) => {
      callback(editor.value || "");
      e.consume(true);
    });
  }
  scheduleUpdate() {
    if (throttleDisabledForDebugging) {
      void this.update();
      return;
    }
    void this.throttler.schedule(this.update.bind(this));
  }
  addVersion(versionsStack, icon, label) {
    const installingEntry = versionsStack.createChild("div", "service-worker-version");
    installingEntry.createChild("div", icon);
    const statusString = installingEntry.createChild("span", "service-worker-version-string");
    statusString.textContent = label;
    UI14.ARIAUtils.markAsAlert(statusString);
    return installingEntry;
  }
  updateClientsField(version) {
    this.clientsField.removeChildren();
    this.section.setFieldVisible(i18nString19(UIStrings19.clients), Boolean(version.controlledClients.length));
    for (const client of version.controlledClients) {
      const clientLabelText = this.clientsField.createChild("div", "service-worker-client");
      const info = this.clientInfoCache.get(client);
      if (info) {
        this.updateClientInfo(clientLabelText, info);
      }
      void this.manager.target().targetAgent().invoke_getTargetInfo({ targetId: client }).then(this.onClientInfo.bind(this, clientLabelText));
    }
  }
  updateSourceField(version) {
    this.sourceField.removeChildren();
    const fileName = Common10.ParsedURL.ParsedURL.extractName(version.scriptURL);
    const name = this.sourceField.createChild("div", "report-field-value-filename");
    const link4 = Components3.Linkifier.Linkifier.linkifyURL(version.scriptURL, { text: fileName });
    link4.tabIndex = 0;
    link4.setAttribute("jslog", `${VisualLogging10.link("source-location").track({ click: true })}`);
    name.appendChild(link4);
    if (this.registration.errors.length) {
      const errorsLabel = UI14.UIUtils.createIconLabel({
        title: String(this.registration.errors.length),
        iconName: "cross-circle-filled",
        color: "var(--icon-error)"
      });
      errorsLabel.classList.add("devtools-link", "link");
      errorsLabel.tabIndex = 0;
      UI14.ARIAUtils.setLabel(errorsLabel, i18nString19(UIStrings19.sRegistrationErrors, { PH1: this.registration.errors.length }));
      self.onInvokeElement(errorsLabel, () => Common10.Console.Console.instance().show());
      name.appendChild(errorsLabel);
    }
    if (version.scriptResponseTime !== void 0) {
      this.sourceField.createChild("div", "report-field-value-subtitle").textContent = i18nString19(UIStrings19.receivedS, { PH1: new Date(version.scriptResponseTime * 1e3).toLocaleString() });
    }
  }
  update() {
    const fingerprint = this.registration.fingerprint();
    if (fingerprint === this.fingerprint) {
      return Promise.resolve();
    }
    this.fingerprint = fingerprint;
    this.section.setHeaderButtonsState(this.registration.isDeleted);
    const versions = this.registration.versionsByMode();
    const scopeURL = this.registration.scopeURL;
    const title = this.registration.isDeleted ? i18nString19(UIStrings19.sDeleted, { PH1: scopeURL }) : scopeURL;
    this.section.setTitle(title);
    const active = versions.get(
      "active"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE */
    );
    const waiting = versions.get(
      "waiting"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.WAITING */
    );
    const installing = versions.get(
      "installing"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.INSTALLING */
    );
    const redundant = versions.get(
      "redundant"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.REDUNDANT */
    );
    this.statusField.removeChildren();
    const versionsStack = this.statusField.createChild("div", "service-worker-version-stack");
    versionsStack.createChild("div", "service-worker-version-stack-bar");
    if (active) {
      this.updateSourceField(active);
      const localizedRunningStatus = SDK18.ServiceWorkerManager.ServiceWorkerVersion.RunningStatus[active.currentState.runningStatus]();
      const activeEntry = this.addVersion(versionsStack, "service-worker-active-circle", i18nString19(UIStrings19.sActivatedAndIsS, { PH1: active.id, PH2: localizedRunningStatus }));
      if (active.isRunning() || active.isStarting()) {
        const stopButton = UI14.UIUtils.createTextButton(i18nString19(UIStrings19.stopString), this.stopButtonClicked.bind(this, active.id), { jslogContext: "stop" });
        activeEntry.appendChild(stopButton);
      } else if (active.isStartable()) {
        const startButton = UI14.UIUtils.createTextButton(i18nString19(UIStrings19.startString), this.startButtonClicked.bind(this), { jslogContext: "start" });
        activeEntry.appendChild(startButton);
      }
      this.updateClientsField(active);
      this.maybeCreateRouterField();
    } else if (redundant) {
      this.updateSourceField(redundant);
      this.addVersion(versionsStack, "service-worker-redundant-circle", i18nString19(UIStrings19.sIsRedundant, { PH1: redundant.id }));
      this.updateClientsField(redundant);
    }
    if (waiting) {
      const waitingEntry = this.addVersion(versionsStack, "service-worker-waiting-circle", i18nString19(UIStrings19.sWaitingToActivate, { PH1: waiting.id }));
      const skipWaitingButton = UI14.UIUtils.createTextButton(i18n37.i18n.lockedString("skipWaiting"), this.skipButtonClicked.bind(this), {
        title: i18n37.i18n.lockedString("skipWaiting"),
        jslogContext: "skip-waiting"
      });
      waitingEntry.appendChild(skipWaitingButton);
      if (waiting.scriptResponseTime !== void 0) {
        waitingEntry.createChild("div", "service-worker-subtitle").textContent = i18nString19(UIStrings19.receivedS, { PH1: new Date(waiting.scriptResponseTime * 1e3).toLocaleString() });
      }
    }
    if (installing) {
      const installingEntry = this.addVersion(versionsStack, "service-worker-installing-circle", i18nString19(UIStrings19.sTryingToInstall, { PH1: installing.id }));
      if (installing.scriptResponseTime !== void 0) {
        installingEntry.createChild("div", "service-worker-subtitle").textContent = i18nString19(UIStrings19.receivedS, {
          PH1: new Date(installing.scriptResponseTime * 1e3).toLocaleString()
        });
      }
    }
    this.updateCycleView.refresh();
    return Promise.resolve();
  }
  unregisterButtonClicked() {
    this.manager.deleteRegistration(this.registration.id);
  }
  createUpdateCycleField() {
    this.updateCycleField = this.wrapWidget(this.section.appendField(i18nString19(UIStrings19.updateCycle)));
    this.updateCycleField.appendChild(this.updateCycleView.tableElement);
  }
  maybeCreateRouterField() {
    const versions = this.registration.versionsByMode();
    const active = versions.get(
      "active"
      /* SDK.ServiceWorkerManager.ServiceWorkerVersion.Modes.ACTIVE */
    );
    const title = i18nString19(UIStrings19.routers);
    if (active?.routerRules && active.routerRules.length > 0) {
      if (!this.routerField) {
        this.routerField = this.wrapWidget(this.section.appendField(title));
      }
      if (!this.routerField.lastElementChild) {
        this.routerView.show(this.routerField);
      }
      this.routerView.rules = active.routerRules;
    } else {
      this.section.removeField(title);
      this.routerField = void 0;
    }
  }
  updateButtonClicked() {
    void this.manager.updateRegistration(this.registration.id);
  }
  networkRequestsClicked() {
    void Common10.Revealer.reveal(NetworkForward2.UIFilter.UIRequestFilter.filters([
      {
        filterType: NetworkForward2.UIFilter.FilterType.Is,
        filterValue: "service-worker-intercepted"
      }
    ]));
    Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.ServiceWorkerNetworkRequestClicked);
  }
  push(data) {
    this.pushNotificationDataSetting.set(data);
    void this.manager.deliverPushMessage(this.registration.id, data);
  }
  sync(tag) {
    this.syncTagNameSetting.set(tag);
    void this.manager.dispatchSyncEvent(this.registration.id, tag, true);
  }
  periodicSync(tag) {
    this.periodicSyncTagNameSetting.set(tag);
    void this.manager.dispatchPeriodicSyncEvent(this.registration.id, tag);
  }
  onClientInfo(element, targetInfoResponse) {
    const targetInfo = targetInfoResponse.targetInfo;
    if (!targetInfo) {
      return;
    }
    this.clientInfoCache.set(targetInfo.targetId, targetInfo);
    this.updateClientInfo(element, targetInfo);
  }
  updateClientInfo(element, targetInfo) {
    if (targetInfo.type !== "page" && targetInfo.type === "iframe") {
      const clientString2 = element.createChild("span", "service-worker-client-string");
      UI14.UIUtils.createTextChild(clientString2, i18nString19(UIStrings19.workerS, { PH1: targetInfo.url }));
      return;
    }
    element.removeChildren();
    const clientString = element.createChild("span", "service-worker-client-string");
    UI14.UIUtils.createTextChild(clientString, targetInfo.url);
    const focusButton = new Buttons6.Button.Button();
    focusButton.data = {
      iconName: "select-element",
      variant: "icon",
      size: "SMALL",
      title: i18nString19(UIStrings19.focus),
      jslogContext: "client-focus"
    };
    focusButton.className = "service-worker-client-focus-link";
    focusButton.addEventListener("click", this.activateTarget.bind(this, targetInfo.targetId));
    element.appendChild(focusButton);
  }
  activateTarget(targetId) {
    void this.manager.target().targetAgent().invoke_activateTarget({ targetId });
  }
  startButtonClicked() {
    void this.manager.startWorker(this.registration.scopeURL);
  }
  skipButtonClicked() {
    void this.manager.skipWaiting(this.registration.scopeURL);
  }
  stopButtonClicked(versionId) {
    void this.manager.stopWorker(versionId);
  }
  wrapWidget(container) {
    const shadowRoot = UI14.UIUtils.createShadowRootWithCoreStyles(container, {
      cssFile: [
        serviceWorkersView_css_default,
        /* These styles are for the timing table in serviceWorkerUpdateCycleView but this is the widget that it is rendered
           * inside so we are registering the files here. */
        serviceWorkerUpdateCycleView_css_default
      ]
    });
    const contentElement = document.createElement("div");
    shadowRoot.appendChild(contentElement);
    return contentElement;
  }
};

// gen/front_end/panels/application/SharedStorageListTreeElement.js
var SharedStorageListTreeElement_exports = {};
__export(SharedStorageListTreeElement_exports, {
  SharedStorageListTreeElement: () => SharedStorageListTreeElement
});
import * as Common11 from "./../../core/common/common.js";
import * as i18n41 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon8 } from "./../../ui/kit/kit.js";

// gen/front_end/panels/application/SharedStorageEventsView.js
var SharedStorageEventsView_exports = {};
__export(SharedStorageEventsView_exports, {
  SharedStorageEventsView: () => SharedStorageEventsView
});
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as SDK19 from "./../../core/sdk/sdk.js";
import * as SourceFrame3 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import * as VisualLogging11 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents10 from "./components/components.js";

// gen/front_end/panels/application/sharedStorageEventsView.css.js
var sharedStorageEventsView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

devtools-shared-storage-access-grid {
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./sharedStorageEventsView.css")} */`;

// gen/front_end/panels/application/SharedStorageEventsView.js
var UIStrings20 = {
  /**
   * @description Placeholder text if no shared storage event has been selected.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  noEventSelected: "No shared storage event selected",
  /**
   * @description Placeholder text instructing the user how to display shared
   * storage event details.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  clickToDisplayBody: "Click on any shared storage event to display the event parameters"
};
var str_20 = i18n39.i18n.registerUIStrings("panels/application/SharedStorageEventsView.ts", UIStrings20);
var i18nString20 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
function eventEquals2(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
var SharedStorageEventsView = class extends UI15.SplitWidget.SplitWidget {
  #sharedStorageEventGrid = new ApplicationComponents10.SharedStorageAccessGrid.SharedStorageAccessGrid();
  #events = [];
  #noDisplayView;
  #defaultId = "";
  constructor() {
    super(
      /* isVertical */
      false,
      /* secondIsSidebar: */
      true
    );
    this.element.setAttribute("jslog", `${VisualLogging11.pane("shared-storage-events")}`);
    this.#noDisplayView = new UI15.EmptyWidget.EmptyWidget(i18nString20(UIStrings20.noEventSelected), i18nString20(UIStrings20.clickToDisplayBody));
    this.#noDisplayView.setMinimumSize(0, 40);
    this.#sharedStorageEventGrid.setMinimumSize(0, 80);
    this.#sharedStorageEventGrid.onSelect = this.#onFocus.bind(this);
    this.setMainWidget(this.#sharedStorageEventGrid);
    this.setSidebarWidget(this.#noDisplayView);
    this.hideSidebar();
    this.#getMainFrameResourceTreeModel()?.addEventListener(SDK19.ResourceTreeModel.Events.PrimaryPageChanged, this.clearEvents, this);
  }
  #getMainFrameResourceTreeModel() {
    const primaryPageTarget = SDK19.TargetManager.TargetManager.instance().primaryPageTarget();
    return primaryPageTarget?.model(SDK19.ResourceTreeModel.ResourceTreeModel) || null;
  }
  #getMainFrame() {
    return this.#getMainFrameResourceTreeModel()?.mainFrame || null;
  }
  get id() {
    return this.#getMainFrame()?.id || this.#defaultId;
  }
  wasShown() {
    super.wasShown();
    const sidebar = this.sidebarWidget();
    if (sidebar) {
      sidebar.registerRequiredCSS(sharedStorageEventsView_css_default);
    }
  }
  addEvent(event) {
    if (event.mainFrameId !== this.id) {
      return;
    }
    if (this.#events.some((t) => eventEquals2(t, event))) {
      return;
    }
    if (this.showMode() !== "Both") {
      this.showBoth();
    }
    this.#events.push(event);
    this.#sharedStorageEventGrid.events = this.#events;
  }
  clearEvents() {
    this.#events = [];
    this.#sharedStorageEventGrid.events = this.#events;
    this.setSidebarWidget(this.#noDisplayView);
    this.hideSidebar();
  }
  #onFocus(event) {
    const jsonView = SourceFrame3.JSONView.JSONView.createViewSync(event);
    jsonView.setMinimumSize(0, 40);
    this.setSidebarWidget(jsonView);
  }
  setDefaultIdForTesting(id) {
    this.#defaultId = id;
  }
  getEventsForTesting() {
    return this.#events;
  }
  getSharedStorageAccessGridForTesting() {
    return this.#sharedStorageEventGrid;
  }
};

// gen/front_end/panels/application/SharedStorageListTreeElement.js
var UIStrings21 = {
  /**
   * @description Text in SharedStorage Category View of the Application panel
   */
  sharedStorage: "Shared storage"
};
var str_21 = i18n41.i18n.registerUIStrings("panels/application/SharedStorageListTreeElement.ts", UIStrings21);
var i18nString21 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var SharedStorageListTreeElement = class extends ApplicationPanelTreeElement {
  #expandedSetting;
  view;
  constructor(resourcesPanel, expandedSettingsDefault = false) {
    super(resourcesPanel, i18nString21(UIStrings21.sharedStorage), false, "shared-storage");
    this.#expandedSetting = Common11.Settings.Settings.instance().createSetting("resources-shared-storage-expanded", expandedSettingsDefault);
    const sharedStorageIcon = createIcon8("database");
    this.setLeadingIcons([sharedStorageIcon]);
    this.view = new SharedStorageEventsView();
  }
  get itemURL() {
    return "shared-storage://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showView(this.view);
    return false;
  }
  onattach() {
    super.onattach();
    if (this.#expandedSetting.get()) {
      this.expand();
    }
  }
  onexpand() {
    this.#expandedSetting.set(true);
  }
  oncollapse() {
    this.#expandedSetting.set(false);
  }
  addEvent(event) {
    this.view.addEvent(event);
  }
};

// gen/front_end/panels/application/SharedStorageModel.js
var SharedStorageModel_exports = {};
__export(SharedStorageModel_exports, {
  SharedStorageForOrigin: () => SharedStorageForOrigin,
  SharedStorageModel: () => SharedStorageModel
});
import * as Common12 from "./../../core/common/common.js";
import * as SDK20 from "./../../core/sdk/sdk.js";
var SharedStorageForOrigin = class extends Common12.ObjectWrapper.ObjectWrapper {
  #model;
  #securityOrigin;
  constructor(model, securityOrigin) {
    super();
    this.#model = model;
    this.#securityOrigin = securityOrigin;
  }
  get securityOrigin() {
    return this.#securityOrigin;
  }
  async getMetadata() {
    return await this.#model.storageAgent.invoke_getSharedStorageMetadata({ ownerOrigin: this.securityOrigin }).then(({ metadata }) => metadata);
  }
  async getEntries() {
    return await this.#model.storageAgent.invoke_getSharedStorageEntries({ ownerOrigin: this.securityOrigin }).then(({ entries }) => entries);
  }
  async setEntry(key, value, ignoreIfPresent) {
    await this.#model.storageAgent.invoke_setSharedStorageEntry({ ownerOrigin: this.securityOrigin, key, value, ignoreIfPresent });
  }
  async deleteEntry(key) {
    await this.#model.storageAgent.invoke_deleteSharedStorageEntry({ ownerOrigin: this.securityOrigin, key });
  }
  async clear() {
    await this.#model.storageAgent.invoke_clearSharedStorageEntries({ ownerOrigin: this.securityOrigin });
  }
  async resetBudget() {
    await this.#model.storageAgent.invoke_resetSharedStorageBudget({ ownerOrigin: this.securityOrigin });
  }
};
var SharedStorageModel = class extends SDK20.SDKModel.SDKModel {
  #securityOriginManager;
  #storages;
  storageAgent;
  #enabled;
  constructor(target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.#securityOriginManager = target.model(SDK20.SecurityOriginManager.SecurityOriginManager);
    this.#storages = /* @__PURE__ */ new Map();
    this.storageAgent = target.storageAgent();
    this.#enabled = false;
  }
  async enable() {
    if (this.#enabled) {
      return;
    }
    this.#securityOriginManager.addEventListener(SDK20.SecurityOriginManager.Events.SecurityOriginAdded, this.#securityOriginAdded, this);
    this.#securityOriginManager.addEventListener(SDK20.SecurityOriginManager.Events.SecurityOriginRemoved, this.#securityOriginRemoved, this);
    await this.storageAgent.invoke_setSharedStorageTracking({ enable: true });
    this.#addAllOrigins();
    this.#enabled = true;
  }
  disable() {
    if (!this.#enabled) {
      return;
    }
    this.#securityOriginManager.removeEventListener(SDK20.SecurityOriginManager.Events.SecurityOriginAdded, this.#securityOriginAdded, this);
    this.#securityOriginManager.removeEventListener(SDK20.SecurityOriginManager.Events.SecurityOriginRemoved, this.#securityOriginRemoved, this);
    void this.storageAgent.invoke_setSharedStorageTracking({ enable: false });
    this.#removeAllOrigins();
    this.#enabled = false;
  }
  dispose() {
    this.disable();
  }
  #addAllOrigins() {
    for (const securityOrigin of this.#securityOriginManager.securityOrigins()) {
      void this.#maybeAddOrigin(securityOrigin);
    }
  }
  #removeAllOrigins() {
    for (const securityOrigin of this.#storages.keys()) {
      this.#removeOrigin(securityOrigin);
    }
  }
  #securityOriginAdded(event) {
    this.#maybeAddOrigin(event.data);
  }
  #maybeAddOrigin(securityOrigin) {
    const parsedSecurityOrigin = new Common12.ParsedURL.ParsedURL(securityOrigin);
    if (!parsedSecurityOrigin.isValid || parsedSecurityOrigin.scheme === "data" || parsedSecurityOrigin.scheme === "about" || parsedSecurityOrigin.scheme === "javascript") {
      return;
    }
    if (this.#storages.has(securityOrigin)) {
      return;
    }
    const storage = new SharedStorageForOrigin(this, securityOrigin);
    this.#storages.set(securityOrigin, storage);
    this.dispatchEventToListeners("SharedStorageAdded", storage);
  }
  #securityOriginRemoved(event) {
    this.#removeOrigin(event.data);
  }
  #removeOrigin(securityOrigin) {
    const storage = this.storageForOrigin(securityOrigin);
    if (!storage) {
      return;
    }
    this.#storages.delete(securityOrigin);
    this.dispatchEventToListeners("SharedStorageRemoved", storage);
  }
  storages() {
    return this.#storages.values();
  }
  storageForOrigin(origin) {
    return this.#storages.get(origin) || null;
  }
  numStoragesForTesting() {
    return this.#storages.size;
  }
  isChangeEvent(event) {
    return [
      "set",
      "append",
      "delete",
      "clear"
    ].includes(event.method);
  }
  sharedStorageAccessed(event) {
    if (this.isChangeEvent(event)) {
      const sharedStorage = this.storageForOrigin(event.ownerOrigin);
      if (sharedStorage) {
        const eventData = {
          accessTime: event.accessTime,
          method: event.method,
          mainFrameId: event.mainFrameId,
          ownerSite: event.ownerSite,
          params: event.params,
          scope: event.scope
        };
        sharedStorage.dispatchEventToListeners("SharedStorageChanged", eventData);
      } else {
        void this.#maybeAddOrigin(event.ownerOrigin);
      }
    }
    this.dispatchEventToListeners("SharedStorageAccess", event);
  }
  sharedStorageWorkletOperationExecutionFinished(_event) {
  }
  attributionReportingTriggerRegistered(_event) {
  }
  indexedDBListUpdated(_event) {
  }
  indexedDBContentUpdated(_event) {
  }
  cacheStorageListUpdated(_event) {
  }
  cacheStorageContentUpdated(_event) {
  }
  interestGroupAccessed(_event) {
  }
  interestGroupAuctionEventOccurred(_event) {
  }
  interestGroupAuctionNetworkRequestCreated(_event) {
  }
  storageBucketCreatedOrUpdated(_event) {
  }
  storageBucketDeleted(_event) {
  }
  attributionReportingSourceRegistered(_event) {
  }
  attributionReportingReportSent(_event) {
  }
  attributionReportingVerboseDebugReportSent(_event) {
  }
};
SDK20.SDKModel.SDKModel.register(SharedStorageModel, { capabilities: 8192, autostart: false });

// gen/front_end/panels/application/SharedStorageTreeElement.js
var SharedStorageTreeElement_exports = {};
__export(SharedStorageTreeElement_exports, {
  SharedStorageTreeElement: () => SharedStorageTreeElement
});
import * as VisualLogging14 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/SharedStorageItemsView.js
var SharedStorageItemsView_exports = {};
__export(SharedStorageItemsView_exports, {
  SharedStorageItemsView: () => SharedStorageItemsView
});
import * as Common14 from "./../../core/common/common.js";
import * as i18n47 from "./../../core/i18n/i18n.js";
import * as SourceFrame4 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
import * as ApplicationComponents13 from "./components/components.js";

// gen/front_end/panels/application/KeyValueStorageItemsView.js
var KeyValueStorageItemsView_exports = {};
__export(KeyValueStorageItemsView_exports, {
  KeyValueStorageItemsView: () => KeyValueStorageItemsView
});
import * as i18n45 from "./../../core/i18n/i18n.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import { Directives as LitDirectives, html as html8, nothing as nothing5, render as render7 } from "./../../ui/lit/lit.js";
import * as VisualLogging13 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents12 from "./components/components.js";

// gen/front_end/panels/application/StorageItemsToolbar.js
var StorageItemsToolbar_exports = {};
__export(StorageItemsToolbar_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  StorageItemsToolbar: () => StorageItemsToolbar
});
import "./../../ui/legacy/legacy.js";
import * as Common13 from "./../../core/common/common.js";
import * as i18n43 from "./../../core/i18n/i18n.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as Buttons7 from "./../../ui/components/buttons/buttons.js";
import * as UI16 from "./../../ui/legacy/legacy.js";
import * as Lit2 from "./../../ui/lit/lit.js";
import * as VisualLogging12 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents11 from "./components/components.js";
var UIStrings22 = {
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh",
  /**
   * @description Text to clear everything
   */
  clearAll: "Clear All",
  /**
   * @description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: "Delete Selected",
  /**
   * @description Text that informs screen reader users that the storage table has been refreshed
   */
  refreshedStatus: "Table refreshed"
};
var str_22 = i18n43.i18n.registerUIStrings("panels/application/StorageItemsToolbar.ts", UIStrings22);
var i18nString22 = i18n43.i18n.getLocalizedString.bind(void 0, str_22);
var { html: html7, render: render6 } = Lit2;
var DEFAULT_VIEW5 = (input, _output, target) => {
  render6(
    // clang-format off
    html7`
      <devtools-toolbar class="top-resources-toolbar"
                        jslog=${VisualLogging12.toolbar()}>
        <devtools-button title=${i18nString22(UIStrings22.refresh)}
                         jslog=${VisualLogging12.action("storage-items-view.refresh").track({
      click: true
    })}
                         @click=${input.onRefresh}
                         .iconName=${"refresh"}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-toolbar-input type="filter"
                                ?disabled=${!input.filterItemEnabled}
                                @change=${input.onFilterChanged}
                                style="flex-grow:0.4"></devtools-toolbar-input>
        ${new UI16.Toolbar.ToolbarSeparator().element}
        <devtools-button title=${input.deleteAllButtonTitle}
                         @click=${input.onDeleteAll}
                         id=storage-items-delete-all
                         ?disabled=${!input.deleteAllButtonEnabled}
                         jslog=${VisualLogging12.action("storage-items-view.clear-all").track({
      click: true
    })}
                         .iconName=${input.deleteAllButtonIconName}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-button title=${i18nString22(UIStrings22.deleteSelected)}
                         @click=${input.onDeleteSelected}
                         ?disabled=${!input.deleteSelectedButtonDisabled}
                         jslog=${VisualLogging12.action("storage-items-view.delete-selected").track({
      click: true
    })}
                         .iconName=${"cross"}
                         .variant=${"toolbar"}></devtools-button>
        ${input.mainToolbarItems.map((item2) => item2.element)}
      </devtools-toolbar>
      ${input.metadataView}`,
    // clang-format on
    target
  );
};
var StorageItemsToolbar = class extends Common13.ObjectWrapper.eventMixin(UI16.Widget.VBox) {
  filterRegex;
  #metadataView;
  #view;
  #deleteAllButtonEnabled = true;
  #deleteSelectedButtonDisabled = true;
  #filterItemEnabled = true;
  #deleteAllButtonIconName = "clear";
  #deleteAllButtonTitle = i18nString22(UIStrings22.clearAll);
  #mainToolbarItems = [];
  constructor(element, view = DEFAULT_VIEW5) {
    super(element);
    this.#view = view;
    this.filterRegex = null;
  }
  set metadataView(view) {
    this.#metadataView = view;
  }
  get metadataView() {
    if (!this.#metadataView) {
      this.#metadataView = new ApplicationComponents11.StorageMetadataView.StorageMetadataView();
    }
    return this.#metadataView;
  }
  performUpdate() {
    const viewInput = {
      deleteAllButtonEnabled: this.#deleteAllButtonEnabled,
      deleteSelectedButtonDisabled: this.#deleteSelectedButtonDisabled,
      filterItemEnabled: this.#filterItemEnabled,
      deleteAllButtonIconName: this.#deleteAllButtonIconName,
      deleteAllButtonTitle: this.#deleteAllButtonTitle,
      mainToolbarItems: this.#mainToolbarItems,
      metadataView: this.metadataView,
      onFilterChanged: this.filterChanged.bind(this),
      onRefresh: () => {
        this.dispatchEventToListeners(
          "Refresh"
          /* StorageItemsToolbar.Events.REFRESH */
        );
        UI16.ARIAUtils.LiveAnnouncer.alert(i18nString22(UIStrings22.refreshedStatus));
      },
      onDeleteAll: () => this.dispatchEventToListeners(
        "DeleteAll"
        /* StorageItemsToolbar.Events.DELETE_ALL */
      ),
      onDeleteSelected: () => this.dispatchEventToListeners(
        "DeleteSelected"
        /* StorageItemsToolbar.Events.DELETE_SELECTED */
      )
    };
    this.#view(viewInput, {}, this.contentElement);
  }
  setDeleteAllTitle(title) {
    this.#deleteAllButtonTitle = title;
    this.requestUpdate();
  }
  setDeleteAllGlyph(glyph) {
    this.#deleteAllButtonIconName = glyph;
    this.requestUpdate();
  }
  appendToolbarItem(item2) {
    this.#mainToolbarItems.push(item2);
    this.requestUpdate();
  }
  setStorageKey(storageKey) {
    this.metadataView.setStorageKey(storageKey);
  }
  filterChanged({ detail: text }) {
    this.filterRegex = text ? new RegExp(Platform6.StringUtilities.escapeForRegExp(text), "i") : null;
    this.dispatchEventToListeners(
      "Refresh"
      /* StorageItemsToolbar.Events.REFRESH */
    );
  }
  hasFilter() {
    return Boolean(this.filterRegex);
  }
  setCanDeleteAll(enabled) {
    this.#deleteAllButtonEnabled = enabled;
    this.requestUpdate();
  }
  setCanDeleteSelected(enabled) {
    this.#deleteSelectedButtonDisabled = enabled;
    this.requestUpdate();
  }
  setCanFilter(enabled) {
    this.#filterItemEnabled = enabled;
    this.requestUpdate();
  }
};

// gen/front_end/panels/application/KeyValueStorageItemsView.js
var { ARIAUtils: ARIAUtils7 } = UI17;
var { EmptyWidget: EmptyWidget8 } = UI17.EmptyWidget;
var { VBox, widgetConfig: widgetConfig4 } = UI17.Widget;
var { Size } = Geometry;
var { repeat } = LitDirectives;
var UIStrings23 = {
  /**
   * @description Text that shows in the Application Panel if no value is selected for preview
   */
  noPreviewSelected: "No value selected",
  /**
   * @description Preview text when viewing storage in Application panel
   */
  selectAValueToPreview: "Select a value to preview",
  /**
   * @description Text for announcing number of entries after filtering
   * @example {5} PH1
   */
  numberEntries: "Number of entries shown in table: {PH1}",
  /**
   * @description Text in DOMStorage Items View of the Application panel
   */
  key: "Key",
  /**
   * @description Text for the value of something
   */
  value: "Value"
};
var str_23 = i18n45.i18n.registerUIStrings("panels/application/KeyValueStorageItemsView.ts", UIStrings23);
var i18nString23 = i18n45.i18n.getLocalizedString.bind(void 0, str_23);
var MAX_VALUE_LENGTH = 4096;
var KeyValueStorageItemsView = class extends UI17.Widget.VBox {
  #preview;
  #previewValue;
  #items = [];
  #selectedKey = null;
  #view;
  #isSortOrderAscending = true;
  #editable;
  #toolbar;
  metadataView;
  constructor(title, id, editable, view, metadataView, opts) {
    metadataView ??= new ApplicationComponents12.StorageMetadataView.StorageMetadataView();
    if (!view) {
      view = (input, output, target) => {
        render7(
          html8`
            <devtools-widget
              .widgetConfig=${widgetConfig4(StorageItemsToolbar, { metadataView })}
              class=flex-none
              ${UI17.Widget.widgetRef(StorageItemsToolbar, (view2) => {
            output.toolbar = view2;
          })}
            ></devtools-widget>
            <devtools-split-view sidebar-position="second" name="${id}-split-view-state">
               <devtools-widget
                  slot="main"
                  .widgetConfig=${widgetConfig4(VBox, { minimumSize: new Size(0, 50) })}>
                <devtools-data-grid
                  .name=${`${id}-datagrid-with-preview`}
                  striped
                  style="flex: auto"
                  @sort=${(e) => input.onSort(e.detail.ascending)}
                  @refresh=${input.onReferesh}
                  @create=${(e) => input.onCreate(e.detail.key, e.detail.value)}
                  @deselect=${() => input.onSelect(null)}
                >
                  <table>
                    <tr>
                      <th id="key" sortable ?editable=${input.editable}>
                        ${i18nString23(UIStrings23.key)}
                      </th>
                      <th id="value" ?editable=${input.editable}>
                        ${i18nString23(UIStrings23.value)}
                      </th>
                    </tr>
                    ${repeat(input.items, (item2) => item2.key, (item2) => html8`
                      <tr data-key=${item2.key} data-value=${item2.value}
                          @select=${() => input.onSelect(item2)}
                          @edit=${(e) => input.onEdit(item2.key, item2.value, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                          @delete=${() => input.onDelete(item2.key)}
                          selected=${input.selectedKey === item2.key || nothing5}>
                        <td>${item2.key}</td>
                        <td>${item2.value.substr(0, MAX_VALUE_LENGTH)}</td>
                      </tr>`)}
                      <tr placeholder></tr>
                  </table>
                </devtools-data-grid>
              </devtools-widget>
              <devtools-widget
                  slot="sidebar"
                  .widgetConfig=${widgetConfig4(VBox, { minimumSize: new Size(0, 50) })}
                  jslog=${VisualLogging13.pane("preview").track({ resize: true })}>
               ${input.preview?.element}
              </devtools-widget>
            </devtools-split-view>`,
          // clang-format on
          target
        );
      };
    }
    super(opts);
    this.metadataView = metadataView;
    this.#editable = editable;
    this.#view = view;
    this.performUpdate();
    this.#preview = new EmptyWidget8(i18nString23(UIStrings23.noPreviewSelected), i18nString23(UIStrings23.selectAValueToPreview));
    this.#previewValue = null;
    this.showPreview(null, null);
  }
  wasShown() {
    super.wasShown();
    this.refreshItems();
  }
  performUpdate() {
    const that = this;
    const viewOutput = {
      set toolbar(toolbar6) {
        that.#toolbar?.removeEventListener("DeleteSelected", that.deleteSelectedItem, that);
        that.#toolbar?.removeEventListener("DeleteAll", that.deleteAllItems, that);
        that.#toolbar?.removeEventListener("Refresh", that.refreshItems, that);
        that.#toolbar = toolbar6;
        that.#toolbar.addEventListener("DeleteSelected", that.deleteSelectedItem, that);
        that.#toolbar.addEventListener("DeleteAll", that.deleteAllItems, that);
        that.#toolbar.addEventListener("Refresh", that.refreshItems, that);
      }
    };
    const viewInput = {
      items: this.#items,
      selectedKey: this.#selectedKey,
      editable: this.#editable,
      preview: this.#preview,
      onSelect: (item2) => {
        this.#toolbar?.setCanDeleteSelected(Boolean(item2));
        if (!item2) {
          void this.#previewEntry(null);
        } else {
          void this.#previewEntry(item2);
        }
      },
      onSort: (ascending) => {
        this.#isSortOrderAscending = ascending;
      },
      onCreate: (key, value) => {
        this.#createCallback(key, value);
      },
      onEdit: (key, value, columnId, valueBeforeEditing, newText) => {
        this.#editingCallback(key, value, columnId, valueBeforeEditing, newText);
      },
      onDelete: (key) => {
        this.#deleteCallback(key);
      },
      onReferesh: () => {
        this.refreshItems();
      }
    };
    this.#view(viewInput, viewOutput, this.contentElement);
  }
  get toolbar() {
    return this.#toolbar;
  }
  refreshItems() {
  }
  deleteAllItems() {
  }
  itemsCleared() {
    this.#items = [];
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(false);
  }
  itemRemoved(key) {
    const index = this.#items.findIndex((item2) => item2.key === key);
    if (index === -1) {
      return;
    }
    this.#items.splice(index, 1);
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(this.#items.length > 1);
  }
  itemAdded(key, value) {
    if (this.#items.some((item2) => item2.key === key)) {
      return;
    }
    this.#items.push({ key, value });
    this.performUpdate();
  }
  itemUpdated(key, value) {
    const item2 = this.#items.find((item3) => item3.key === key);
    if (!item2) {
      return;
    }
    if (item2.value === value) {
      return;
    }
    item2.value = value;
    this.performUpdate();
    if (this.#selectedKey !== key) {
      return;
    }
    if (this.#previewValue !== value) {
      void this.#previewEntry({ key, value });
    }
    this.#toolbar?.setCanDeleteSelected(true);
  }
  showItems(items) {
    const sortDirection = this.#isSortOrderAscending ? 1 : -1;
    this.#items = [...items].sort((item1, item2) => sortDirection * (item1.key > item2.key ? 1 : -1));
    const selectedItem = this.#items.find((item2) => item2.key === this.#selectedKey);
    if (!selectedItem) {
      this.#selectedKey = null;
    } else {
      void this.#previewEntry(selectedItem);
    }
    this.performUpdate();
    this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
    ARIAUtils7.LiveAnnouncer.alert(i18nString23(UIStrings23.numberEntries, { PH1: this.#items.length }));
  }
  deleteSelectedItem() {
    if (!this.#selectedKey) {
      return;
    }
    this.#deleteCallback(this.#selectedKey);
  }
  #createCallback(key, value) {
    this.setItem(key, value);
    this.#removeDupes(key, value);
    void this.#previewEntry({ key, value });
  }
  isEditAllowed(_columnIdentifier, _oldText, _newText) {
    return true;
  }
  #editingCallback(key, value, columnIdentifier, oldText, newText) {
    if (!this.isEditAllowed(columnIdentifier, oldText, newText)) {
      return;
    }
    if (columnIdentifier === "key") {
      if (typeof oldText === "string") {
        this.removeItem(oldText);
      }
      this.setItem(newText, value);
      this.#removeDupes(newText, value);
      void this.#previewEntry({ key: newText, value });
    } else {
      this.setItem(key, newText);
      void this.#previewEntry({ key, value: newText });
    }
  }
  #removeDupes(key, value) {
    for (let i = this.#items.length - 1; i >= 0; --i) {
      const child = this.#items[i];
      if (child.key === key && value !== child.value) {
        this.#items.splice(i, 1);
      }
    }
  }
  #deleteCallback(key) {
    this.removeItem(key);
  }
  showPreview(preview, value) {
    if (this.#preview && this.#previewValue === value) {
      return;
    }
    if (this.#preview) {
      this.#preview.detach();
    }
    if (!preview) {
      preview = new EmptyWidget8(i18nString23(UIStrings23.noPreviewSelected), i18nString23(UIStrings23.selectAValueToPreview));
    }
    this.#previewValue = value;
    this.#preview = preview;
    this.performUpdate();
  }
  async #previewEntry(entry) {
    if (entry?.value) {
      this.#selectedKey = entry.key;
      const preview = await this.createPreview(entry.key, entry.value);
      if (this.#selectedKey === entry.key) {
        this.showPreview(preview, entry.value);
      }
    } else {
      this.#selectedKey = null;
      this.showPreview(null, null);
    }
  }
  set editable(editable) {
    this.#editable = editable;
    this.performUpdate();
  }
  keys() {
    return this.#items.map((item2) => item2.key);
  }
};

// gen/front_end/panels/application/SharedStorageItemsView.js
var UIStrings24 = {
  /**
   * @description Text in SharedStorage Items View of the Application panel
   */
  sharedStorage: "Shared storage",
  /**
   * @description Text for announcing that the "Shared Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  sharedStorageItemsCleared: "Shared Storage items cleared",
  /**
   * @description Text for announcing that the filtered "Shared Storage Items" table was cleared, that is,
   * all filtered entries were deleted.
   */
  sharedStorageFilteredItemsCleared: "Shared Storage filtered items cleared",
  /**
   * @description Text for announcing a Shared Storage key/value item has been deleted
   */
  sharedStorageItemDeleted: "The storage item was deleted.",
  /**
   * @description Text for announcing a Shared Storage key/value item has been edited
   */
  sharedStorageItemEdited: "The storage item was edited.",
  /**
   * @description Text for announcing a Shared Storage key/value item edit request has been canceled
   */
  sharedStorageItemEditCanceled: "The storage item edit was canceled."
};
var str_24 = i18n47.i18n.registerUIStrings("panels/application/SharedStorageItemsView.ts", UIStrings24);
var i18nString24 = i18n47.i18n.getLocalizedString.bind(void 0, str_24);
var SharedStorageItemsView = class _SharedStorageItemsView extends KeyValueStorageItemsView {
  #sharedStorage;
  sharedStorageItemsDispatcher;
  constructor(sharedStorage, view) {
    super(
      i18nString24(UIStrings24.sharedStorage),
      "shared-storage-items-view",
      /* editable=*/
      true,
      view,
      new ApplicationComponents13.SharedStorageMetadataView.SharedStorageMetadataView(sharedStorage, sharedStorage.securityOrigin)
    );
    this.#sharedStorage = sharedStorage;
    this.performUpdate();
    this.#sharedStorage.addEventListener("SharedStorageChanged", this.#sharedStorageChanged, this);
    this.sharedStorageItemsDispatcher = new Common14.ObjectWrapper.ObjectWrapper();
  }
  // Use `createView()` instead of the constructor to create a view, so that entries can be awaited asynchronously.
  static async createView(sharedStorage, viewFunction) {
    const view = new _SharedStorageItemsView(sharedStorage, viewFunction);
    await view.updateEntriesOnly();
    return view;
  }
  async updateEntriesOnly() {
    const entries = await this.#sharedStorage.getEntries();
    if (entries) {
      this.#showSharedStorageItems(entries);
    }
  }
  async #sharedStorageChanged() {
    await this.refreshItems();
  }
  async refreshItems() {
    await this.metadataView?.render();
    await this.updateEntriesOnly();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
      "ItemsRefreshed"
      /* SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED */
    );
  }
  async deleteAllItems() {
    if (!this.toolbar?.hasFilter()) {
      await this.#sharedStorage.clear();
      await this.refreshItems();
      this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        "ItemsCleared"
        /* SharedStorageItemsDispatcher.Events.ITEMS_CLEARED */
      );
      UI18.ARIAUtils.LiveAnnouncer.alert(i18nString24(UIStrings24.sharedStorageItemsCleared));
      return;
    }
    await Promise.all(this.keys().map((key) => this.#sharedStorage.deleteEntry(key)));
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
      "FilteredItemsCleared"
      /* SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED */
    );
    UI18.ARIAUtils.LiveAnnouncer.alert(i18nString24(UIStrings24.sharedStorageFilteredItemsCleared));
  }
  isEditAllowed(columnIdentifier, _oldText, newText) {
    if (columnIdentifier === "key" && newText === "") {
      void this.refreshItems().then(() => {
        UI18.ARIAUtils.LiveAnnouncer.alert(i18nString24(UIStrings24.sharedStorageItemEditCanceled));
      });
      return false;
    }
    return true;
  }
  async setItem(key, value) {
    await this.#sharedStorage.setEntry(key, value, false);
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
      "ItemEdited"
      /* SharedStorageItemsDispatcher.Events.ITEM_EDITED */
    );
    UI18.ARIAUtils.LiveAnnouncer.alert(i18nString24(UIStrings24.sharedStorageItemEdited));
  }
  #showSharedStorageItems(items) {
    if (this.toolbar) {
      const filteredList = items.filter((item2) => this.toolbar?.filterRegex?.test(`${item2.key} ${item2.value}`) ?? true);
      this.showItems(filteredList);
    }
  }
  async removeItem(key) {
    await this.#sharedStorage.deleteEntry(key);
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemDeleted", { key });
    UI18.ARIAUtils.LiveAnnouncer.alert(i18nString24(UIStrings24.sharedStorageItemDeleted));
  }
  async createPreview(key, value) {
    const wrappedEntry = key && { key, value: value || "" };
    return SourceFrame4.JSONView.JSONView.createViewSync(wrappedEntry);
  }
};

// gen/front_end/panels/application/SharedStorageTreeElement.js
var SharedStorageTreeElement = class _SharedStorageTreeElement extends ApplicationPanelTreeElement {
  view;
  constructor(resourcesPanel, sharedStorage) {
    super(resourcesPanel, sharedStorage.securityOrigin, false, "shared-storage-instance");
  }
  static async createElement(resourcesPanel, sharedStorage) {
    const treeElement = new _SharedStorageTreeElement(resourcesPanel, sharedStorage);
    treeElement.view = await SharedStorageItemsView.createView(sharedStorage);
    treeElement.view.element.setAttribute("jslog", `${VisualLogging14.pane("shared-storage-data")}`);
    return treeElement;
  }
  get itemURL() {
    return "shared-storage://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showView(this.view);
    return false;
  }
};

// gen/front_end/panels/application/StorageBucketsTreeElement.js
var StorageBucketsTreeElement_exports = {};
__export(StorageBucketsTreeElement_exports, {
  StorageBucketsTreeElement: () => StorageBucketsTreeElement,
  StorageBucketsTreeParentElement: () => StorageBucketsTreeParentElement,
  i18nString: () => i18nString25
});
import * as i18n49 from "./../../core/i18n/i18n.js";
import * as SDK21 from "./../../core/sdk/sdk.js";
import * as LegacyWrapper3 from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import { createIcon as createIcon9 } from "./../../ui/kit/kit.js";
import * as UI19 from "./../../ui/legacy/legacy.js";
import { StorageMetadataView as StorageMetadataView5 } from "./components/components.js";
var UIStrings25 = {
  /**
   * @description Label for an item in the Application Panel Sidebar of the Application panel
   * Storage Buckets allow developers to separate site data into buckets so that they can be
   * deleted independently.
   */
  storageBuckets: "Storage buckets",
  /**
   * @description Text for an item in the Application Panel
   * if no storage buckets are available to show. Storage Buckets allow developers to separate
   * site data into buckets so that they can be
   * deleted independently. https://developer.chrome.com/docs/web-platform/storage-buckets.
   */
  noStorageBuckets: "No storage buckets detected",
  /**
   * @description Description text in the Application Panel describing the storage buckets tab.
   * Storage Buckets allow developers to separate site data into buckets so that they can be
   * deleted independently. https://developer.chrome.com/docs/web-platform/storage-buckets.
   */
  storageBucketsDescription: "On this page you can view and delete storage buckets, and their associated `Storage APIs`."
};
var str_25 = i18n49.i18n.registerUIStrings("panels/application/StorageBucketsTreeElement.ts", UIStrings25);
var i18nString25 = i18n49.i18n.getLocalizedString.bind(void 0, str_25);
var StorageBucketsTreeParentElement = class extends ExpandableApplicationPanelTreeElement {
  bucketTreeElements = /* @__PURE__ */ new Set();
  constructor(storagePanel) {
    super(storagePanel, i18nString25(UIStrings25.storageBuckets), i18nString25(UIStrings25.noStorageBuckets), i18nString25(UIStrings25.storageBucketsDescription), "storage-buckets");
    const icon = createIcon9("bucket");
    this.setLeadingIcons([icon]);
    this.setLink("https://github.com/WICG/storage-buckets/blob/gh-pages/explainer.md");
  }
  initialize() {
    SDK21.TargetManager.TargetManager.instance().addModelListener(SDK21.StorageBucketsModel.StorageBucketsModel, "BucketAdded", this.bucketAdded, this);
    SDK21.TargetManager.TargetManager.instance().addModelListener(SDK21.StorageBucketsModel.StorageBucketsModel, "BucketRemoved", this.bucketRemoved, this);
    SDK21.TargetManager.TargetManager.instance().addModelListener(SDK21.StorageBucketsModel.StorageBucketsModel, "BucketChanged", this.bucketChanged, this);
    for (const bucketsModel of SDK21.TargetManager.TargetManager.instance().models(SDK21.StorageBucketsModel.StorageBucketsModel)) {
      const buckets = bucketsModel.getBuckets();
      for (const bucket of buckets) {
        this.addBucketTreeElement(bucketsModel, bucket);
      }
    }
  }
  removeBucketsForModel(model) {
    for (const bucketTreeElement of this.bucketTreeElements) {
      if (bucketTreeElement.model === model) {
        this.removeBucketTreeElement(bucketTreeElement);
      }
    }
  }
  bucketAdded({ data: { model, bucketInfo } }) {
    this.addBucketTreeElement(model, bucketInfo);
  }
  bucketRemoved({ data: { model, bucketInfo } }) {
    const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this.removeBucketTreeElement(idbDatabaseTreeElement);
  }
  bucketChanged({ data: { model, bucketInfo } }) {
    const idbDatabaseTreeElement = this.getBucketTreeElement(model, bucketInfo);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.bucketInfo = bucketInfo;
  }
  addBucketTreeElement(model, bucketInfo) {
    if (bucketInfo.bucket.name === void 0) {
      return;
    }
    const singleBucketTreeElement = new StorageBucketsTreeElement(this.resourcesPanel, model, bucketInfo);
    this.bucketTreeElements.add(singleBucketTreeElement);
    this.appendChild(singleBucketTreeElement);
    singleBucketTreeElement.initialize();
  }
  removeBucketTreeElement(bucketTreeElement) {
    this.removeChild(bucketTreeElement);
    this.bucketTreeElements.delete(bucketTreeElement);
    this.setExpandable(this.bucketTreeElements.size > 0);
  }
  get itemURL() {
    return "storage-buckets-group://";
  }
  getBucketTreeElement(model, { bucket: { storageKey, name } }) {
    for (const bucketTreeElement of this.bucketTreeElements) {
      if (bucketTreeElement.model === model && bucketTreeElement.bucketInfo.bucket.storageKey === storageKey && bucketTreeElement.bucketInfo.bucket.name === name) {
        return bucketTreeElement;
      }
    }
    return null;
  }
};
var StorageBucketsTreeElement = class extends ExpandableApplicationPanelTreeElement {
  storageBucketInfo;
  bucketModel;
  view;
  constructor(resourcesPanel, model, bucketInfo) {
    const { bucket } = bucketInfo;
    const { origin } = SDK21.StorageKeyManager.parseStorageKey(bucketInfo.bucket.storageKey);
    super(resourcesPanel, `${bucket.name} - ${origin}`, "", "", "storage-bucket");
    this.bucketModel = model;
    this.storageBucketInfo = bucketInfo;
    const icon = createIcon9("database");
    this.setLeadingIcons([icon]);
  }
  initialize() {
    const { bucket } = this.bucketInfo;
    const indexedDBTreeElement = new IndexedDBTreeElement(this.resourcesPanel, bucket);
    this.appendChild(indexedDBTreeElement);
    const serviceWorkerCacheTreeElement = new ServiceWorkerCacheTreeElement(this.resourcesPanel, bucket);
    this.appendChild(serviceWorkerCacheTreeElement);
    serviceWorkerCacheTreeElement.initialize();
  }
  get itemURL() {
    const { bucket } = this.bucketInfo;
    return `storage-buckets-group://${bucket.name}/${bucket.storageKey}`;
  }
  get model() {
    return this.bucketModel;
  }
  get bucketInfo() {
    return this.storageBucketInfo;
  }
  set bucketInfo(bucketInfo) {
    this.storageBucketInfo = bucketInfo;
    if (this.view) {
      this.view.getComponent().setStorageBucket(this.storageBucketInfo);
    }
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = LegacyWrapper3.LegacyWrapper.legacyWrapper(UI19.Widget.Widget, new StorageMetadataView5.StorageMetadataView());
      this.view.getComponent().enableStorageBucketControls(this.model);
      this.view.getComponent().setStorageBucket(this.storageBucketInfo);
    }
    this.showView(this.view);
    return false;
  }
};

// gen/front_end/panels/application/StorageView.js
var StorageView_exports = {};
__export(StorageView_exports, {
  ActionDelegate: () => ActionDelegate2,
  AllStorageTypes: () => AllStorageTypes,
  StorageView: () => StorageView
});
import * as Common15 from "./../../core/common/common.js";
import * as i18n51 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as SDK22 from "./../../core/sdk/sdk.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import { Icon } from "./../../ui/kit/kit.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI20 from "./../../ui/legacy/legacy.js";
import * as VisualLogging15 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/storageView.css.js
var storageView_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.report-row {
  display: flex;
  align-items: center;
  white-space: normal;

  &:has(.quota-override-error:empty) {
    margin: 0;
  }
}

.clear-storage-button .report-row {
  display: flex;
}

.link {
  margin-left: 10px;
  display: none;
}

.report-row:hover .link {
  display: inline;
}

.quota-override-editor-with-button {
  align-items: baseline;
  display: flex;
}

.quota-override-notification-editor {
  border: solid 1px var(--sys-color-neutral-outline);
  border-radius: 4px;
  display: flex;
  flex: auto;
  margin-right: 4px;
  max-width: 200px;
  min-width: 50px;
  min-height: 19px;
  padding-left: 4px;

  &:focus {
    border-color: var(--sys-color-state-focus-ring);
  }

  &:hover:not(:focus) {
    background-color: var(--sys-color-state-hover-on-subtle);
  }
}

.quota-override-error:not(:empty) {
  padding-top: 10px;
  color: var(--sys-color-error);
}

.usage-breakdown-row {
  min-width: fit-content;
}

.clear-storage-container {
  overflow: auto;
}

.clear-storage-header {
  min-width: 400px;
}

.report-content-box {
  overflow: initial;
}

.include-third-party-cookies {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 10px;
}

/*# sourceURL=${import.meta.resolve("./storageView.css")} */`;

// gen/front_end/panels/application/StorageView.js
var UIStrings26 = {
  /**
   * @description Text in the Storage View that expresses the amount of used and available storage quota
   * @example {1.5 MB} PH1
   * @example {123.1 MB} PH2
   */
  storageQuotaUsed: "{PH1} used out of {PH2} storage quota",
  /**
   * @description Tooltip in the Storage View that expresses the precise amount of used and available storage quota
   * @example {200} PH1
   * @example {400} PH2
   */
  storageQuotaUsedWithBytes: "{PH1} bytes used out of {PH2} bytes storage quota",
  /**
   * @description Fragment indicating that a certain data size has been custom configured
   * @example {1.5 MB} PH1
   */
  storageWithCustomMarker: "{PH1} (custom)",
  /**
   * @description Text in Application Panel Sidebar and title text of the Storage View of the Application panel
   */
  storageTitle: "Storage",
  /**
   * @description Title text in Storage View of the Application panel
   */
  usage: "Usage",
  /**
   * @description Unit for data size in DevTools
   */
  mb: "MB",
  /**
   * @description Link to learn more about Progressive Web Apps
   */
  learnMore: "Learn more",
  /**
   * @description Button text for the button in the Storage View of the Application panel for clearing site-specific storage
   */
  clearSiteData: "Clear site data",
  /**
   * @description Announce message when the "clear site data" task is complete
   */
  SiteDataCleared: "Site data cleared",
  /**
   * @description Category description in the Clear Storage section of the Storage View of the Application panel
   */
  application: "Application",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  unregisterServiceWorker: "Unregister service workers",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  localAndSessionStorage: "Local and session storage",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  indexDB: "IndexedDB",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  cookies: "Cookies",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  cacheStorage: "Cache storage",
  /**
   * @description Checkbox label in the Clear Storage section of the Storage View of the Application panel
   */
  includingThirdPartyCookies: "including third-party cookies",
  /**
   * @description Text for error message in Application Quota Override
   * @example {Image} PH1
   */
  sFailedToLoad: "{PH1} (failed to load)",
  /**
   * @description Text for error message in Application Quota Override
   */
  internalError: "Internal error",
  /**
   * @description Text for error message in Application Quota Override
   */
  pleaseEnterANumber: "Please enter a number",
  /**
   * @description Text for error message in Application Quota Override
   */
  numberMustBeNonNegative: "Number must be non-negative",
  /**
   * @description Text for error message in Application Quota Override
   * @example {9000000000000} PH1
   */
  numberMustBeSmaller: "Number must be smaller than {PH1}",
  /**
   * @description Button text for the "Clear site data" button in the Storage View of the Application panel while the clearing action is pending
   */
  clearing: "Clearing\u2026",
  /**
   * @description Quota row title in Clear Storage View of the Application panel
   */
  storageQuotaIsLimitedIn: "Storage quota is limited in Incognito mode",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  fileSystem: "File System",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  other: "Other",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  storageUsage: "Storage usage",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  serviceWorkers: "Service workers",
  /**
   * @description Checkbox label in Application Panel Sidebar of the Application panel.
   * Storage quota refers to the amount of disk available for the website or app.
   */
  simulateCustomStorage: "Simulate custom storage quota"
};
var str_26 = i18n51.i18n.registerUIStrings("panels/application/StorageView.ts", UIStrings26);
var i18nString26 = i18n51.i18n.getLocalizedString.bind(void 0, str_26);
var StorageView = class _StorageView extends UI20.Widget.VBox {
  pieColors;
  reportView;
  target;
  securityOrigin;
  storageKey;
  settings;
  includeThirdPartyCookiesSetting;
  quotaRow;
  quotaUsage;
  pieChart;
  previousOverrideFieldValue;
  quotaOverrideCheckbox;
  quotaOverrideControlRow;
  quotaOverrideEditor;
  quotaOverrideErrorMessage;
  clearButton;
  throttler = new Common15.Throttler.Throttler(1e3);
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(storageView_css_default);
    this.contentElement.classList.add("clear-storage-container");
    this.contentElement.setAttribute("jslog", `${VisualLogging15.pane("clear-storage")}`);
    this.pieColors = /* @__PURE__ */ new Map([
      ["cache_storage", "rgb(229, 113, 113)"],
      // red
      ["cookies", "rgb(239, 196, 87)"],
      // yellow
      ["indexeddb", "rgb(155, 127, 230)"],
      // purple
      ["local_storage", "rgb(116, 178, 102)"],
      // green
      ["service_workers", "rgb(255, 167, 36)"]
      // orange
    ]);
    this.reportView = new UI20.ReportView.ReportView(i18nString26(UIStrings26.storageTitle));
    this.reportView.registerRequiredCSS(storageView_css_default);
    this.reportView.element.classList.add("clear-storage-header");
    this.reportView.show(this.contentElement);
    this.target = null;
    this.securityOrigin = null;
    this.storageKey = null;
    this.settings = /* @__PURE__ */ new Map();
    for (const type of AllStorageTypes) {
      this.settings.set(type, Common15.Settings.Settings.instance().createSetting("clear-storage-" + Platform7.StringUtilities.toKebabCase(type), true));
    }
    this.includeThirdPartyCookiesSetting = Common15.Settings.Settings.instance().createSetting("clear-storage-include-third-party-cookies", false);
    const clearButtonSection = this.reportView.appendSection("", "clear-storage-button").appendRow();
    this.clearButton = UI20.UIUtils.createTextButton(i18nString26(UIStrings26.clearSiteData), this.clear.bind(this), { jslogContext: "storage.clear-site-data" });
    this.clearButton.id = "storage-view-clear-button";
    clearButtonSection.appendChild(this.clearButton);
    const includeThirdPartyCookiesCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString26(UIStrings26.includingThirdPartyCookies), this.includeThirdPartyCookiesSetting);
    includeThirdPartyCookiesCheckbox.classList.add("include-third-party-cookies");
    clearButtonSection.appendChild(includeThirdPartyCookiesCheckbox);
    const quota = this.reportView.appendSection(i18nString26(UIStrings26.usage));
    quota.element.setAttribute("jslog", `${VisualLogging15.section("usage")}`);
    this.quotaRow = quota.appendSelectableRow();
    this.quotaRow.classList.add("quota-usage-row");
    const learnMoreRow = quota.appendRow();
    const learnMore = UI20.XLink.XLink.create("https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses", i18nString26(UIStrings26.learnMore), void 0, void 0, "learn-more");
    learnMoreRow.appendChild(learnMore);
    this.quotaUsage = null;
    this.pieChart = new PerfUI.PieChart.PieChart();
    this.populatePieChart(0, []);
    const usageBreakdownRow = quota.appendRow();
    usageBreakdownRow.classList.add("usage-breakdown-row");
    usageBreakdownRow.appendChild(this.pieChart);
    this.previousOverrideFieldValue = "";
    const quotaOverrideCheckboxRow = quota.appendRow();
    quotaOverrideCheckboxRow.classList.add("quota-override-row");
    this.quotaOverrideCheckbox = UI20.UIUtils.CheckboxLabel.create(i18nString26(UIStrings26.simulateCustomStorage), false);
    this.quotaOverrideCheckbox.setAttribute("jslog", `${VisualLogging15.toggle("simulate-custom-quota").track({ change: true })}`);
    quotaOverrideCheckboxRow.appendChild(this.quotaOverrideCheckbox);
    this.quotaOverrideCheckbox.addEventListener("click", this.onClickCheckbox.bind(this), false);
    this.quotaOverrideControlRow = quota.appendRow();
    this.quotaOverrideEditor = this.quotaOverrideControlRow.createChild("input", "quota-override-notification-editor");
    this.quotaOverrideEditor.setAttribute("placeholder", i18nString26(UIStrings26.pleaseEnterANumber));
    this.quotaOverrideEditor.setAttribute("jslog", `${VisualLogging15.textField("quota-override").track({ change: true })}`);
    this.quotaOverrideControlRow.appendChild(UI20.UIUtils.createLabel(i18nString26(UIStrings26.mb)));
    this.quotaOverrideControlRow.classList.add("hidden");
    this.quotaOverrideEditor.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        void this.applyQuotaOverrideFromInputField();
        event.consume(true);
      }
    });
    this.quotaOverrideEditor.addEventListener("focusout", (event) => {
      void this.applyQuotaOverrideFromInputField();
      event.consume(true);
    });
    const errorMessageRow = quota.appendRow();
    this.quotaOverrideErrorMessage = errorMessageRow.createChild("div", "quota-override-error");
    const application = this.reportView.appendSection(i18nString26(UIStrings26.application));
    application.element.setAttribute("jslog", `${VisualLogging15.section("application")}`);
    this.appendItem(
      application,
      i18nString26(UIStrings26.unregisterServiceWorker),
      "service_workers"
      /* Protocol.Storage.StorageType.Service_workers */
    );
    application.markFieldListAsGroup();
    const storage = this.reportView.appendSection(i18nString26(UIStrings26.storageTitle));
    storage.element.setAttribute("jslog", `${VisualLogging15.section("storage")}`);
    this.appendItem(
      storage,
      i18nString26(UIStrings26.localAndSessionStorage),
      "local_storage"
      /* Protocol.Storage.StorageType.Local_storage */
    );
    this.appendItem(
      storage,
      i18nString26(UIStrings26.indexDB),
      "indexeddb"
      /* Protocol.Storage.StorageType.Indexeddb */
    );
    this.appendItem(
      storage,
      i18nString26(UIStrings26.cookies),
      "cookies"
      /* Protocol.Storage.StorageType.Cookies */
    );
    this.appendItem(
      storage,
      i18nString26(UIStrings26.cacheStorage),
      "cache_storage"
      /* Protocol.Storage.StorageType.Cache_storage */
    );
    storage.markFieldListAsGroup();
    SDK22.TargetManager.TargetManager.instance().observeTargets(this);
  }
  appendItem(section9, title, settingName) {
    const row = section9.appendRow();
    const setting = this.settings.get(settingName);
    if (setting) {
      row.appendChild(SettingsUI.SettingsUI.createSettingCheckbox(title, setting));
    }
  }
  targetAdded(target) {
    if (target !== SDK22.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.target = target;
    const securityOriginManager = target.model(SDK22.SecurityOriginManager.SecurityOriginManager);
    this.updateOrigin(securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
    securityOriginManager.addEventListener(SDK22.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager = target.model(SDK22.StorageKeyManager.StorageKeyManager);
    this.updateStorageKey(storageKeyManager.mainStorageKey());
    storageKeyManager.addEventListener("MainStorageKeyChanged", this.storageKeyChanged, this);
  }
  targetRemoved(target) {
    if (this.target !== target) {
      return;
    }
    const securityOriginManager = target.model(SDK22.SecurityOriginManager.SecurityOriginManager);
    securityOriginManager.removeEventListener(SDK22.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager = target.model(SDK22.StorageKeyManager.StorageKeyManager);
    storageKeyManager.removeEventListener("MainStorageKeyChanged", this.storageKeyChanged, this);
  }
  originChanged(event) {
    const { mainSecurityOrigin, unreachableMainSecurityOrigin } = event.data;
    this.updateOrigin(mainSecurityOrigin, unreachableMainSecurityOrigin);
  }
  storageKeyChanged(event) {
    const { mainStorageKey } = event.data;
    this.updateStorageKey(mainStorageKey);
  }
  updateOrigin(mainOrigin, unreachableMainOrigin) {
    const oldOrigin = this.securityOrigin;
    if (unreachableMainOrigin) {
      this.securityOrigin = unreachableMainOrigin;
      this.reportView.setSubtitle(i18nString26(UIStrings26.sFailedToLoad, { PH1: unreachableMainOrigin }));
    } else {
      this.securityOrigin = mainOrigin;
      this.reportView.setSubtitle(mainOrigin);
    }
    if (oldOrigin !== this.securityOrigin) {
      this.quotaOverrideControlRow.classList.add("hidden");
      this.quotaOverrideCheckbox.checked = false;
      this.quotaOverrideErrorMessage.textContent = "";
    }
    void this.performUpdate();
  }
  updateStorageKey(mainStorageKey) {
    const oldStorageKey = this.storageKey;
    this.storageKey = mainStorageKey;
    this.reportView.setSubtitle(mainStorageKey);
    if (oldStorageKey !== this.storageKey) {
      this.quotaOverrideControlRow.classList.add("hidden");
      this.quotaOverrideCheckbox.checked = false;
      this.quotaOverrideErrorMessage.textContent = "";
    }
    void this.performUpdate();
  }
  async applyQuotaOverrideFromInputField() {
    if (!this.target || !this.securityOrigin) {
      this.quotaOverrideErrorMessage.textContent = i18nString26(UIStrings26.internalError);
      return;
    }
    this.quotaOverrideErrorMessage.textContent = "";
    const editorString = this.quotaOverrideEditor.value;
    if (editorString === "") {
      await this.clearQuotaForOrigin(this.target, this.securityOrigin);
      this.previousOverrideFieldValue = "";
      return;
    }
    const quota = parseFloat(editorString);
    if (!Number.isFinite(quota)) {
      this.quotaOverrideErrorMessage.textContent = i18nString26(UIStrings26.pleaseEnterANumber);
      return;
    }
    if (quota < 0) {
      this.quotaOverrideErrorMessage.textContent = i18nString26(UIStrings26.numberMustBeNonNegative);
      return;
    }
    const cutoff = 9e12;
    if (quota >= cutoff) {
      this.quotaOverrideErrorMessage.textContent = i18nString26(UIStrings26.numberMustBeSmaller, { PH1: cutoff.toLocaleString() });
      return;
    }
    const bytesPerMB = 1e3 * 1e3;
    const quotaInBytes = Math.round(quota * bytesPerMB);
    const quotaFieldValue = `${quotaInBytes / bytesPerMB}`;
    this.quotaOverrideEditor.value = quotaFieldValue;
    this.previousOverrideFieldValue = quotaFieldValue;
    await this.target.storageAgent().invoke_overrideQuotaForOrigin({ origin: this.securityOrigin, quotaSize: quotaInBytes });
  }
  async clearQuotaForOrigin(target, origin) {
    await target.storageAgent().invoke_overrideQuotaForOrigin({ origin });
  }
  async onClickCheckbox() {
    if (this.quotaOverrideControlRow.classList.contains("hidden")) {
      this.quotaOverrideControlRow.classList.remove("hidden");
      this.quotaOverrideCheckbox.checked = true;
      this.quotaOverrideEditor.value = this.previousOverrideFieldValue;
      window.setTimeout(() => this.quotaOverrideEditor.focus(), 500);
    } else if (this.target && this.securityOrigin) {
      this.quotaOverrideControlRow.classList.add("hidden");
      this.quotaOverrideCheckbox.checked = false;
      await this.clearQuotaForOrigin(this.target, this.securityOrigin);
      this.quotaOverrideErrorMessage.textContent = "";
    }
  }
  clear() {
    if (!this.securityOrigin) {
      return;
    }
    const selectedStorageTypes = [];
    for (const type of this.settings.keys()) {
      const setting = this.settings.get(type);
      if (setting?.get()) {
        selectedStorageTypes.push(type);
      }
    }
    if (this.target) {
      const includeThirdPartyCookies = this.includeThirdPartyCookiesSetting.get();
      _StorageView.clear(this.target, this.storageKey, this.securityOrigin, selectedStorageTypes, includeThirdPartyCookies);
    }
    this.clearButton.disabled = true;
    const label = this.clearButton.textContent;
    this.clearButton.textContent = i18nString26(UIStrings26.clearing);
    window.setTimeout(() => {
      this.clearButton.disabled = false;
      this.clearButton.textContent = label;
      this.clearButton.focus();
    }, 500);
    UI20.ARIAUtils.LiveAnnouncer.alert(i18nString26(UIStrings26.SiteDataCleared));
  }
  static clear(target, storageKey, originForCookies, selectedStorageTypes, includeThirdPartyCookies) {
    console.assert(Boolean(storageKey));
    if (!storageKey) {
      return;
    }
    void target.storageAgent().invoke_clearDataForStorageKey({ storageKey, storageTypes: selectedStorageTypes.join(",") });
    const set = new Set(selectedStorageTypes);
    const hasAll = set.has(
      "all"
      /* Protocol.Storage.StorageType.All */
    );
    if (set.has(
      "local_storage"
      /* Protocol.Storage.StorageType.Local_storage */
    ) || hasAll) {
      const storageModel = target.model(DOMStorageModel);
      if (storageModel) {
        storageModel.clearForStorageKey(storageKey);
      }
    }
    if (set.has(
      "indexeddb"
      /* Protocol.Storage.StorageType.Indexeddb */
    ) || hasAll) {
      for (const target2 of SDK22.TargetManager.TargetManager.instance().targets()) {
        const indexedDBModel = target2.model(IndexedDBModel);
        if (indexedDBModel) {
          indexedDBModel.clearForStorageKey(storageKey);
        }
      }
    }
    if (originForCookies && (set.has(
      "cookies"
      /* Protocol.Storage.StorageType.Cookies */
    ) || hasAll)) {
      void target.storageAgent().invoke_clearDataForOrigin({
        origin: originForCookies,
        storageTypes: "cookies"
        /* Protocol.Storage.StorageType.Cookies */
      });
      const cookieModel = target.model(SDK22.CookieModel.CookieModel);
      if (cookieModel) {
        void cookieModel.clear(void 0, includeThirdPartyCookies ? void 0 : originForCookies);
      }
    }
    if (set.has(
      "cache_storage"
      /* Protocol.Storage.StorageType.Cache_storage */
    ) || hasAll) {
      const target2 = SDK22.TargetManager.TargetManager.instance().primaryPageTarget();
      const model = target2?.model(SDK22.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      if (model) {
        model.clearForStorageKey(storageKey);
      }
    }
  }
  async performUpdate() {
    if (!this.securityOrigin || !this.target) {
      this.quotaRow.textContent = "";
      this.populatePieChart(0, []);
      return;
    }
    const securityOrigin = this.securityOrigin;
    const response = await this.target.storageAgent().invoke_getUsageAndQuota({ origin: securityOrigin });
    this.quotaRow.textContent = "";
    if (response.getError()) {
      this.populatePieChart(0, []);
      return;
    }
    const quotaOverridden = response.overrideActive;
    const quotaAsString = i18n51.ByteUtilities.bytesToString(response.quota);
    const usageAsString = i18n51.ByteUtilities.bytesToString(response.usage);
    const formattedQuotaAsString = i18nString26(UIStrings26.storageWithCustomMarker, { PH1: quotaAsString });
    const quota = quotaOverridden ? UI20.Fragment.Fragment.build`<b>${formattedQuotaAsString}</b>`.element() : quotaAsString;
    const element = uiI18n.getFormatLocalizedString(str_26, UIStrings26.storageQuotaUsed, { PH1: usageAsString, PH2: quota });
    this.quotaRow.appendChild(element);
    UI20.Tooltip.Tooltip.install(this.quotaRow, i18nString26(UIStrings26.storageQuotaUsedWithBytes, { PH1: response.usage.toLocaleString(), PH2: response.quota.toLocaleString() }));
    if (!response.overrideActive && response.quota < 125829120) {
      const icon = new Icon();
      icon.name = "info";
      icon.style.color = "var(--icon-info)";
      icon.classList.add("small");
      UI20.Tooltip.Tooltip.install(this.quotaRow, i18nString26(UIStrings26.storageQuotaIsLimitedIn));
      this.quotaRow.appendChild(icon);
    }
    if (this.quotaUsage === null || this.quotaUsage !== response.usage) {
      this.quotaUsage = response.usage;
      const slices = [];
      for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
        const value = usageForType.usage;
        if (!value) {
          continue;
        }
        const title = this.getStorageTypeName(usageForType.storageType);
        const color = this.pieColors.get(usageForType.storageType) || "#ccc";
        slices.push({ value, color, title });
      }
      this.populatePieChart(response.usage, slices);
    }
    void this.throttler.schedule(this.requestUpdate.bind(this));
  }
  populatePieChart(total, slices) {
    this.pieChart.data = {
      chartName: i18nString26(UIStrings26.storageUsage),
      size: 110,
      formatter: i18n51.ByteUtilities.bytesToString,
      showLegend: true,
      total,
      slices
    };
  }
  getStorageTypeName(type) {
    switch (type) {
      case "file_systems":
        return i18nString26(UIStrings26.fileSystem);
      case "indexeddb":
        return i18nString26(UIStrings26.indexDB);
      case "cache_storage":
        return i18nString26(UIStrings26.cacheStorage);
      case "service_workers":
        return i18nString26(UIStrings26.serviceWorkers);
      default:
        return i18nString26(UIStrings26.other);
    }
  }
};
var AllStorageTypes = [
  "cache_storage",
  "cookies",
  "indexeddb",
  "local_storage",
  "service_workers"
];
var ActionDelegate2 = class {
  handleAction(_context, actionId) {
    switch (actionId) {
      case "resources.clear":
        return this.handleClear(false);
      case "resources.clear-incl-third-party-cookies":
        return this.handleClear(true);
    }
    return false;
  }
  handleClear(includeThirdPartyCookies) {
    const target = SDK22.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return false;
    }
    const resourceTreeModel = target.model(SDK22.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return false;
    }
    const securityOrigin = resourceTreeModel.getMainSecurityOrigin();
    resourceTreeModel.getMainStorageKey().then((storageKey) => {
      StorageView.clear(target, storageKey, securityOrigin, AllStorageTypes, includeThirdPartyCookies);
    }, (_) => {
    });
    return true;
  }
};

// gen/front_end/panels/application/TrustTokensTreeElement.js
var TrustTokensTreeElement_exports = {};
__export(TrustTokensTreeElement_exports, {
  TrustTokensTreeElement: () => TrustTokensTreeElement,
  i18nString: () => i18nString27
});
import * as Host8 from "./../../core/host/host.js";
import * as i18n53 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon10 } from "./../../ui/kit/kit.js";
import * as ApplicationComponents14 from "./components/components.js";
var UIStrings27 = {
  /**
   * @description Hover text for an info icon in the Private State Token panel.
   * Previously known as 'Trust Tokens'.
   */
  trustTokens: "Private state tokens"
};
var str_27 = i18n53.i18n.registerUIStrings("panels/application/TrustTokensTreeElement.ts", UIStrings27);
var i18nString27 = i18n53.i18n.getLocalizedString.bind(void 0, str_27);
var TrustTokensTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString27(UIStrings27.trustTokens), false, "private-state-tokens");
    const icon = createIcon10("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "trustTokens://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ApplicationComponents14.TrustTokensView.TrustTokensView();
    }
    this.showView(this.view);
    Host8.userMetrics.panelShown("trust-tokens");
    return false;
  }
};

// gen/front_end/panels/application/ApplicationPanelSidebar.js
var UIStrings28 = {
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  application: "Application",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  storage: "Storage",
  /**
   * @description Text in Application Panelthat shows if no local storage
   *             can be shown.
   */
  noLocalStorage: "No local storage detected",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  localStorage: "Local storage",
  /**
   * @description Text in the Application panel describing the local storage tab.
   */
  localStorageDescription: "On this page you can view, add, edit, and delete local storage key-value pairs.",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  sessionStorage: "Session storage",
  /**
   * @description Text in Application Panel if no session storage can be shown.
   */
  noSessionStorage: "No session storage detected",
  /**
   * @description Text in the Application panel describing the session storage tab.
   */
  sessionStorageDescription: "On this page you can view, add, edit, and delete session storage key-value pairs.",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  extensionStorage: "Extension storage",
  /**
   * @description Text in Application Panel if no extension storage can be shown
   */
  noExtensionStorage: "No extension storage detected",
  /**
   * @description Text in the Application panel describing the extension storage tab.
   */
  extensionStorageDescription: "On this page you can view, add, edit, and delete extension storage key-value pairs.",
  /**
   * @description Text for extension session storage in Application panel
   */
  extensionSessionStorage: "Session",
  /**
   * @description Text for extension local storage in Application panel
   */
  extensionLocalStorage: "Local",
  /**
   * @description Text for extension sync storage in Application panel
   */
  extensionSyncStorage: "Sync",
  /**
   * @description Text for extension managed storage in Application panel
   */
  extensionManagedStorage: "Managed",
  /**
   * @description Text for web cookies
   */
  cookies: "Cookies",
  /**
   * @description Text in the Application Panel if no cookies are set
   */
  noCookies: "No cookies set",
  /**
   * @description Text for web cookies
   */
  cookiesDescription: "On this page you can view, add, edit, and delete cookies.",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  backgroundServices: "Background services",
  /**
   * @description Text for rendering frames
   */
  frames: "Frames",
  /**
   * @description Text that appears on a button for the manifest resource type filter.
   */
  manifest: "Manifest",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  indexeddb: "IndexedDB",
  /**
   * @description Text in Application Panel if no indexedDB is detected
   */
  noIndexeddb: "No indexedDB detected",
  /**
   * @description Text in the Application panel describing the extension storage tab.
   */
  indexeddbDescription: "On this page you can view and delete indexedDB key-value pairs and databases.",
  /**
   * @description A context menu item in the Application Panel Sidebar of the Application panel
   */
  refreshIndexeddb: "Refresh IndexedDB",
  /**
   * @description Tooltip in Application Panel Sidebar of the Application panel
   * @example {1.0} PH1
   */
  versionSEmpty: "Version: {PH1} (empty)",
  /**
   * @description Tooltip in Application Panel Sidebar of the Application panel
   * @example {1.0} PH1
   */
  versionS: "Version: {PH1}",
  /**
   * @description Text to clear content
   */
  clear: "Clear",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   * @example {"key path"} PH1
   */
  keyPathS: "Key path: {PH1}",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  localFiles: "Local Files",
  /**
   * @description Tooltip in Application Panel Sidebar of the Application panel
   * @example {https://example.com} PH1
   */
  cookiesUsedByFramesFromS: "Cookies used by frames from {PH1}",
  /**
   * @description Text in Frames View of the Application panel
   */
  openedWindows: "Opened Windows",
  /**
   * @description Text in Frames View of the Application panel
   */
  openedWindowsDescription: "On this page you can view windows opened via window.open().",
  /**
   * @description Label for plural of worker type: web workers
   */
  webWorkers: "Web Workers",
  /**
   * @description Label in frame tree for unavailable document
   */
  documentNotAvailable: "No document detected",
  /**
   * @description Description of content of unavailable document in Application panel
   */
  theContentOfThisDocumentHasBeen: "The content of this document has been generated dynamically via 'document.write()'.",
  /**
   * @description Text in Frames View of the Application panel
   */
  windowWithoutTitle: "Window without title",
  /**
   * @description Default name for worker
   */
  worker: "worker",
  /**
   * @description Description text for describing the dedicated worker tab.
   */
  workerDescription: "On this page you can view dedicated workers that are created by the parent frame.",
  /**
   * @description Aria text for screen reader to announce they can scroll to top of manifest if invoked
   */
  onInvokeManifestAlert: "Manifest: Invoke to scroll to the top of manifest",
  /**
   * @description Aria text for screen reader to announce they can scroll to a section if invoked
   * @example {"Identity"} PH1
   */
  beforeInvokeAlert: "{PH1}: Invoke to scroll to this section in manifest",
  /**
   * @description Alert message for screen reader to announce which subsection is being scrolled to
   * @example {"Identity"} PH1
   */
  onInvokeAlert: "Scrolled to {PH1}",
  /**
   * @description Application sidebar panel
   */
  applicationSidebarPanel: "Application panel sidebar",
  /**
   * @description Tooltip in Application Panel Sidebar of the Application panel
   * @example {https://example.com} PH1
   */
  thirdPartyPhaseout: "Cookies from {PH1} may have been blocked due to third-party cookie phaseout.",
  /**
   * @description Description text in the Application Panel describing a frame's resources
   */
  resourceDescription: "On this page you can view the frame's resources."
};
var str_28 = i18n55.i18n.registerUIStrings("panels/application/ApplicationPanelSidebar.ts", UIStrings28);
var i18nString28 = i18n55.i18n.getLocalizedString.bind(void 0, str_28);
function assertNotMainTarget(targetId) {
  if (targetId === "main") {
    throw new Error("Unexpected main target id");
  }
}
function nameForExtensionStorageArea(storageArea) {
  switch (storageArea) {
    case "session":
      return i18nString28(UIStrings28.extensionSessionStorage);
    case "local":
      return i18nString28(UIStrings28.extensionLocalStorage);
    case "sync":
      return i18nString28(UIStrings28.extensionSyncStorage);
    case "managed":
      return i18nString28(UIStrings28.extensionManagedStorage);
    default:
      throw new Error(`Unrecognized storage type: ${storageArea}`);
  }
}
var ApplicationPanelSidebar = class extends UI21.Widget.VBox {
  panel;
  sidebarTree;
  applicationTreeElement;
  serviceWorkersTreeElement;
  localStorageListTreeElement;
  sessionStorageListTreeElement;
  extensionStorageListTreeElement;
  indexedDBListTreeElement;
  interestGroupTreeElement;
  cookieListTreeElement;
  trustTokensTreeElement;
  cacheStorageListTreeElement;
  sharedStorageListTreeElement;
  storageBucketsTreeElement;
  backForwardCacheListTreeElement;
  backgroundFetchTreeElement;
  backgroundSyncTreeElement;
  bounceTrackingMitigationsTreeElement;
  notificationsTreeElement;
  paymentHandlerTreeElement;
  periodicBackgroundSyncTreeElement;
  pushMessagingTreeElement;
  reportingApiTreeElement;
  preloadingSummaryTreeElement;
  resourcesSection;
  domStorageTreeElements;
  extensionIdToStorageTreeParentElement;
  extensionStorageModels;
  extensionStorageTreeElements;
  sharedStorageTreeElements;
  domains;
  // Holds main frame target.
  target;
  previousHoveredElement;
  sharedStorageTreeElementDispatcher;
  constructor(panel) {
    super();
    this.panel = panel;
    this.sidebarTree = new UI21.TreeOutline.TreeOutlineInShadow(
      "NavigationTree"
      /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */
    );
    this.sidebarTree.registerRequiredCSS(resourcesSidebar_css_default);
    this.sidebarTree.element.classList.add("resources-sidebar");
    this.sidebarTree.setHideOverflow(true);
    this.sidebarTree.element.classList.add("filter-all");
    this.sidebarTree.addEventListener(UI21.TreeOutline.Events.ElementAttached, this.treeElementAdded, this);
    this.contentElement.appendChild(this.sidebarTree.element);
    const applicationSectionTitle = i18nString28(UIStrings28.application);
    this.applicationTreeElement = this.addSidebarSection(applicationSectionTitle, "application");
    const applicationPanelSidebar = this.applicationTreeElement.treeOutline?.contentElement;
    if (applicationPanelSidebar) {
      applicationPanelSidebar.ariaLabel = i18nString28(UIStrings28.applicationSidebarPanel);
    }
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this.applicationTreeElement.appendChild(manifestTreeElement);
    manifestTreeElement.generateChildren();
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this.applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    const clearStorageTreeElement = new ClearStorageTreeElement(panel);
    this.applicationTreeElement.appendChild(clearStorageTreeElement);
    const storageSectionTitle = i18nString28(UIStrings28.storage);
    const storageTreeElement = this.addSidebarSection(storageSectionTitle, "storage");
    this.localStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString28(UIStrings28.localStorage), i18nString28(UIStrings28.noLocalStorage), i18nString28(UIStrings28.localStorageDescription), "local-storage");
    this.localStorageListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/localstorage/");
    const localStorageIcon = createIcon11("table");
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);
    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString28(UIStrings28.sessionStorage), i18nString28(UIStrings28.noSessionStorage), i18nString28(UIStrings28.sessionStorageDescription), "session-storage");
    this.sessionStorageListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/sessionstorage/");
    const sessionStorageIcon = createIcon11("table");
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);
    storageTreeElement.appendChild(this.sessionStorageListTreeElement);
    this.extensionStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString28(UIStrings28.extensionStorage), i18nString28(UIStrings28.noExtensionStorage), i18nString28(UIStrings28.extensionStorageDescription), "extension-storage");
    this.extensionStorageListTreeElement.setLink("https://developer.chrome.com/docs/extensions/reference/api/storage/");
    const extensionStorageIcon = createIcon11("table");
    this.extensionStorageListTreeElement.setLeadingIcons([extensionStorageIcon]);
    storageTreeElement.appendChild(this.extensionStorageListTreeElement);
    this.indexedDBListTreeElement = new IndexedDBTreeElement(panel);
    this.indexedDBListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/indexeddb/");
    storageTreeElement.appendChild(this.indexedDBListTreeElement);
    this.cookieListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString28(UIStrings28.cookies), i18nString28(UIStrings28.noCookies), i18nString28(UIStrings28.cookiesDescription), "cookies");
    this.cookieListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/cookies/");
    const cookieIcon = createIcon11("cookie");
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);
    this.trustTokensTreeElement = new TrustTokensTreeElement(panel);
    storageTreeElement.appendChild(this.trustTokensTreeElement);
    this.interestGroupTreeElement = new InterestGroupTreeElement(panel);
    storageTreeElement.appendChild(this.interestGroupTreeElement);
    this.sharedStorageListTreeElement = new SharedStorageListTreeElement(panel);
    storageTreeElement.appendChild(this.sharedStorageListTreeElement);
    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    storageTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.storageBucketsTreeElement = new StorageBucketsTreeParentElement(panel);
    storageTreeElement.appendChild(this.storageBucketsTreeElement);
    const backgroundServiceSectionTitle = i18nString28(UIStrings28.backgroundServices);
    const backgroundServiceTreeElement = this.addSidebarSection(backgroundServiceSectionTitle, "background-services");
    this.backForwardCacheListTreeElement = new BackForwardCacheTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.backForwardCacheListTreeElement);
    this.backgroundFetchTreeElement = new BackgroundServiceTreeElement(
      panel,
      "backgroundFetch"
      /* Protocol.BackgroundService.ServiceName.BackgroundFetch */
    );
    backgroundServiceTreeElement.appendChild(this.backgroundFetchTreeElement);
    this.backgroundSyncTreeElement = new BackgroundServiceTreeElement(
      panel,
      "backgroundSync"
      /* Protocol.BackgroundService.ServiceName.BackgroundSync */
    );
    backgroundServiceTreeElement.appendChild(this.backgroundSyncTreeElement);
    this.bounceTrackingMitigationsTreeElement = new BounceTrackingMitigationsTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.bounceTrackingMitigationsTreeElement);
    this.notificationsTreeElement = new BackgroundServiceTreeElement(
      panel,
      "notifications"
      /* Protocol.BackgroundService.ServiceName.Notifications */
    );
    backgroundServiceTreeElement.appendChild(this.notificationsTreeElement);
    this.paymentHandlerTreeElement = new BackgroundServiceTreeElement(
      panel,
      "paymentHandler"
      /* Protocol.BackgroundService.ServiceName.PaymentHandler */
    );
    backgroundServiceTreeElement.appendChild(this.paymentHandlerTreeElement);
    this.periodicBackgroundSyncTreeElement = new BackgroundServiceTreeElement(
      panel,
      "periodicBackgroundSync"
      /* Protocol.BackgroundService.ServiceName.PeriodicBackgroundSync */
    );
    backgroundServiceTreeElement.appendChild(this.periodicBackgroundSyncTreeElement);
    this.preloadingSummaryTreeElement = new PreloadingSummaryTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.preloadingSummaryTreeElement);
    this.preloadingSummaryTreeElement.constructChildren(panel);
    this.pushMessagingTreeElement = new BackgroundServiceTreeElement(
      panel,
      "pushMessaging"
      /* Protocol.BackgroundService.ServiceName.PushMessaging */
    );
    backgroundServiceTreeElement.appendChild(this.pushMessagingTreeElement);
    this.reportingApiTreeElement = new ReportingApiTreeElement(panel);
    backgroundServiceTreeElement.appendChild(this.reportingApiTreeElement);
    const resourcesSectionTitle = i18nString28(UIStrings28.frames);
    const resourcesTreeElement = this.addSidebarSection(resourcesSectionTitle, "frames");
    this.resourcesSection = new ResourcesSection(panel, resourcesTreeElement);
    this.domStorageTreeElements = /* @__PURE__ */ new Map();
    this.extensionIdToStorageTreeParentElement = /* @__PURE__ */ new Map();
    this.extensionStorageTreeElements = /* @__PURE__ */ new Map();
    this.extensionStorageModels = [];
    this.sharedStorageTreeElements = /* @__PURE__ */ new Map();
    this.domains = {};
    this.sidebarTree.contentElement.addEventListener("mousemove", this.onmousemove.bind(this), false);
    this.sidebarTree.contentElement.addEventListener("mouseleave", this.onmouseleave.bind(this), false);
    SDK23.TargetManager.TargetManager.instance().observeTargets(this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(SDK23.ResourceTreeModel.ResourceTreeModel, SDK23.ResourceTreeModel.Events.FrameNavigated, this.frameNavigated, this, { scoped: true });
    const selection = this.panel.lastSelectedItemPath();
    if (!selection.length) {
      manifestTreeElement.select();
    }
    SDK23.TargetManager.TargetManager.instance().observeModels(DOMStorageModel, {
      modelAdded: (model) => this.domStorageModelAdded(model),
      modelRemoved: (model) => this.domStorageModelRemoved(model)
    }, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeModels(ExtensionStorageModel, {
      modelAdded: (model) => this.extensionStorageModelAdded(model),
      modelRemoved: (model) => this.extensionStorageModelRemoved(model)
    }, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeModels(IndexedDBModel, {
      modelAdded: (model) => this.indexedDBModelAdded(model),
      modelRemoved: (model) => this.indexedDBModelRemoved(model)
    }, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeModels(InterestGroupStorageModel, {
      modelAdded: (model) => this.interestGroupModelAdded(model),
      modelRemoved: (model) => this.interestGroupModelRemoved(model)
    }, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeModels(SharedStorageModel, {
      modelAdded: (model) => this.sharedStorageModelAdded(model).catch((err) => {
        console.error(err);
      }),
      modelRemoved: (model) => this.sharedStorageModelRemoved(model)
    }, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeModels(SDK23.StorageBucketsModel.StorageBucketsModel, {
      modelAdded: (model) => this.storageBucketsModelAdded(model),
      modelRemoved: (model) => this.storageBucketsModelRemoved(model)
    }, { scoped: true });
    this.sharedStorageTreeElementDispatcher = new Common16.ObjectWrapper.ObjectWrapper();
    this.contentElement.style.contain = "layout style";
  }
  addSidebarSection(title, jslogContext) {
    const treeElement = new UI21.TreeOutline.TreeElement(title, true, jslogContext);
    treeElement.listItemElement.classList.add("storage-group-list-item");
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this.sidebarTree.appendChild(treeElement);
    UI21.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
    UI21.ARIAUtils.setLabel(treeElement.childrenListElement, title);
    return treeElement;
  }
  targetAdded(target) {
    if (target !== target.outermostTarget()) {
      return;
    }
    this.target = target;
    const interestGroupModel = target.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.addEventListener("InterestGroupAccess", this.interestGroupAccess, this);
    }
    const resourceTreeModel = target.model(SDK23.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }
    if (resourceTreeModel.cachedResourcesLoaded()) {
      this.initialize();
    }
    resourceTreeModel.addEventListener(SDK23.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
    resourceTreeModel.addEventListener(SDK23.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
  }
  targetRemoved(target) {
    if (target !== this.target) {
      return;
    }
    delete this.target;
    const resourceTreeModel = target.model(SDK23.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK23.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
      resourceTreeModel.removeEventListener(SDK23.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
    }
    const interestGroupModel = target.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.removeEventListener("InterestGroupAccess", this.interestGroupAccess, this);
    }
    this.resetWithFrames();
  }
  focus() {
    this.sidebarTree.focus();
  }
  initialize() {
    for (const frame of SDK23.ResourceTreeModel.ResourceTreeModel.frames()) {
      this.addCookieDocument(frame);
    }
    const interestGroupModel = this.target?.model(InterestGroupStorageModel);
    if (interestGroupModel) {
      interestGroupModel.enable();
    }
    this.cacheStorageListTreeElement.initialize();
    const backgroundServiceModel = this.target?.model(BackgroundServiceModel) || null;
    this.backgroundFetchTreeElement.initialize(backgroundServiceModel);
    this.backgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.notificationsTreeElement.initialize(backgroundServiceModel);
    this.paymentHandlerTreeElement.initialize(backgroundServiceModel);
    this.periodicBackgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.pushMessagingTreeElement.initialize(backgroundServiceModel);
    this.storageBucketsTreeElement?.initialize();
    const preloadingModel = this.target?.model(SDK23.PreloadingModel.PreloadingModel);
    if (preloadingModel) {
      this.preloadingSummaryTreeElement?.initialize(preloadingModel);
    }
  }
  domStorageModelAdded(model) {
    model.enable();
    model.storages().forEach(this.addDOMStorage.bind(this));
    model.addEventListener("DOMStorageAdded", this.domStorageAdded, this);
    model.addEventListener("DOMStorageRemoved", this.domStorageRemoved, this);
  }
  domStorageModelRemoved(model) {
    model.storages().forEach(this.removeDOMStorage.bind(this));
    model.removeEventListener("DOMStorageAdded", this.domStorageAdded, this);
    model.removeEventListener("DOMStorageRemoved", this.domStorageRemoved, this);
  }
  extensionStorageModelAdded(model) {
    this.extensionStorageModels.push(model);
    model.enable();
    model.storages().forEach(this.addExtensionStorage.bind(this));
    model.addEventListener("ExtensionStorageAdded", this.extensionStorageAdded, this);
    model.addEventListener("ExtensionStorageRemoved", this.extensionStorageRemoved, this);
  }
  extensionStorageModelRemoved(model) {
    console.assert(this.extensionStorageModels.includes(model));
    this.extensionStorageModels.splice(this.extensionStorageModels.indexOf(model), 1);
    model.storages().forEach(this.removeExtensionStorage.bind(this));
    model.removeEventListener("ExtensionStorageAdded", this.extensionStorageAdded, this);
    model.removeEventListener("ExtensionStorageRemoved", this.extensionStorageRemoved, this);
  }
  indexedDBModelAdded(model) {
    model.enable();
    this.indexedDBListTreeElement.addIndexedDBForModel(model);
  }
  indexedDBModelRemoved(model) {
    this.indexedDBListTreeElement.removeIndexedDBForModel(model);
  }
  interestGroupModelAdded(model) {
    model.enable();
    model.addEventListener("InterestGroupAccess", this.interestGroupAccess, this);
  }
  interestGroupModelRemoved(model) {
    model.disable();
    model.removeEventListener("InterestGroupAccess", this.interestGroupAccess, this);
  }
  async sharedStorageModelAdded(model) {
    await model.enable();
    for (const storage of model.storages()) {
      await this.addSharedStorage(storage);
    }
    model.addEventListener("SharedStorageAdded", this.sharedStorageAdded, this);
    model.addEventListener("SharedStorageRemoved", this.sharedStorageRemoved, this);
    model.addEventListener("SharedStorageAccess", this.sharedStorageAccess, this);
  }
  sharedStorageModelRemoved(model) {
    model.disable();
    for (const storage of model.storages()) {
      this.removeSharedStorage(storage);
    }
    model.removeEventListener("SharedStorageAdded", this.sharedStorageAdded, this);
    model.removeEventListener("SharedStorageRemoved", this.sharedStorageRemoved, this);
    model.removeEventListener("SharedStorageAccess", this.sharedStorageAccess, this);
  }
  storageBucketsModelAdded(model) {
    model.enable();
  }
  storageBucketsModelRemoved(model) {
    this.storageBucketsTreeElement?.removeBucketsForModel(model);
  }
  resetWithFrames() {
    this.resourcesSection.reset();
    this.reset();
  }
  treeElementAdded(event) {
    const selection = this.panel.lastSelectedItemPath();
    if (!selection.length) {
      return;
    }
    const element = event.data;
    const elementPath = [element];
    for (let parent = element.parent; parent && "itemURL" in parent && parent.itemURL; parent = parent.parent) {
      elementPath.push(parent);
    }
    let i = selection.length - 1;
    let j = elementPath.length - 1;
    while (i >= 0 && j >= 0 && selection[i] === elementPath[j].itemURL) {
      if (!elementPath[j].expanded) {
        if (i > 0) {
          elementPath[j].expand();
        }
        if (!elementPath[j].selected) {
          elementPath[j].select();
        }
      }
      i--;
      j--;
    }
  }
  reset() {
    this.domains = {};
    this.cookieListTreeElement.removeChildren();
    this.interestGroupTreeElement.clearEvents();
  }
  frameNavigated(event) {
    const frame = event.data;
    if (frame.isOutermostFrame()) {
      this.reset();
    }
    this.addCookieDocument(frame);
  }
  interestGroupAccess(event) {
    this.interestGroupTreeElement.addEvent(event.data);
  }
  addCookieDocument(frame) {
    const urlToParse = frame.unreachableUrl() || frame.url;
    const parsedURL = Common16.ParsedURL.ParsedURL.fromString(urlToParse);
    if (!parsedURL || parsedURL.scheme !== "http" && parsedURL.scheme !== "https" && parsedURL.scheme !== "file") {
      return;
    }
    const domain = parsedURL.securityOrigin();
    if (!this.domains[domain]) {
      this.domains[domain] = true;
      const cookieDomainTreeElement = new CookieTreeElement(this.panel, frame, parsedURL);
      this.cookieListTreeElement.appendChild(cookieDomainTreeElement);
    }
  }
  domStorageAdded(event) {
    const domStorage = event.data;
    this.addDOMStorage(domStorage);
  }
  addDOMStorage(domStorage) {
    console.assert(!this.domStorageTreeElements.get(domStorage));
    console.assert(Boolean(domStorage.storageKey));
    const domStorageTreeElement = new DOMStorageTreeElement(this.panel, domStorage);
    this.domStorageTreeElements.set(domStorage, domStorageTreeElement);
    if (domStorage.isLocalStorage) {
      this.localStorageListTreeElement.appendChild(domStorageTreeElement, comparator);
    } else {
      this.sessionStorageListTreeElement.appendChild(domStorageTreeElement, comparator);
    }
    function comparator(a, b) {
      const aTitle = a.titleAsText().toLocaleLowerCase();
      const bTitle = b.titleAsText().toLocaleUpperCase();
      return aTitle.localeCompare(bTitle);
    }
  }
  domStorageRemoved(event) {
    const domStorage = event.data;
    this.removeDOMStorage(domStorage);
  }
  removeDOMStorage(domStorage) {
    const treeElement = this.domStorageTreeElements.get(domStorage);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      if (wasSelected) {
        parentListTreeElement.select();
      }
    }
    this.domStorageTreeElements.delete(domStorage);
  }
  extensionStorageAdded(event) {
    const extensionStorage = event.data;
    this.addExtensionStorage(extensionStorage);
  }
  useTreeViewForExtensionStorage(extensionStorage) {
    return !extensionStorage.matchesTarget(this.target);
  }
  getExtensionStorageAreaParent(extensionStorage) {
    if (!this.useTreeViewForExtensionStorage(extensionStorage)) {
      return this.extensionStorageListTreeElement;
    }
    const existingParent = this.extensionIdToStorageTreeParentElement.get(extensionStorage.extensionId);
    if (existingParent) {
      return existingParent;
    }
    const parent = new ExtensionStorageTreeParentElement(this.panel, extensionStorage.extensionId, extensionStorage.name);
    this.extensionIdToStorageTreeParentElement.set(extensionStorage.extensionId, parent);
    this.extensionStorageListTreeElement?.appendChild(parent);
    return parent;
  }
  addExtensionStorage(extensionStorage) {
    if (this.extensionStorageModels.find((m) => m !== extensionStorage.model && m.storageForIdAndArea(extensionStorage.extensionId, extensionStorage.storageArea))) {
      return;
    }
    console.assert(Boolean(this.extensionStorageListTreeElement));
    console.assert(!this.extensionStorageTreeElements.get(extensionStorage.key));
    const extensionStorageTreeElement = new ExtensionStorageTreeElement(this.panel, extensionStorage);
    this.extensionStorageTreeElements.set(extensionStorage.key, extensionStorageTreeElement);
    this.getExtensionStorageAreaParent(extensionStorage)?.appendChild(extensionStorageTreeElement, comparator);
    function comparator(a, b) {
      const getStorageArea = (e) => e.storageArea;
      const order = [
        "session",
        "local",
        "sync",
        "managed"
      ];
      return order.indexOf(getStorageArea(a)) - order.indexOf(getStorageArea(b));
    }
  }
  extensionStorageRemoved(event) {
    const extensionStorage = event.data;
    this.removeExtensionStorage(extensionStorage);
  }
  removeExtensionStorage(extensionStorage) {
    if (this.extensionStorageModels.find((m) => m.storageForIdAndArea(extensionStorage.extensionId, extensionStorage.storageArea))) {
      return;
    }
    const treeElement = this.extensionStorageTreeElements.get(extensionStorage.key);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      if (this.useTreeViewForExtensionStorage(extensionStorage) && parentListTreeElement.childCount() === 0) {
        this.extensionStorageListTreeElement?.removeChild(parentListTreeElement);
        this.extensionIdToStorageTreeParentElement.delete(extensionStorage.extensionId);
      } else if (wasSelected) {
        parentListTreeElement.select();
      }
    }
    this.extensionStorageTreeElements.delete(extensionStorage.key);
  }
  async sharedStorageAdded(event) {
    await this.addSharedStorage(event.data);
  }
  async addSharedStorage(sharedStorage) {
    const sharedStorageTreeElement = await SharedStorageTreeElement.createElement(this.panel, sharedStorage);
    if (this.sharedStorageTreeElements.has(sharedStorage.securityOrigin)) {
      return;
    }
    this.sharedStorageTreeElements.set(sharedStorage.securityOrigin, sharedStorageTreeElement);
    this.sharedStorageListTreeElement.appendChild(sharedStorageTreeElement);
    this.sharedStorageTreeElementDispatcher.dispatchEventToListeners("SharedStorageTreeElementAdded", { origin: sharedStorage.securityOrigin });
  }
  sharedStorageRemoved(event) {
    this.removeSharedStorage(event.data);
  }
  removeSharedStorage(sharedStorage) {
    const treeElement = this.sharedStorageTreeElements.get(sharedStorage.securityOrigin);
    if (!treeElement) {
      return;
    }
    const wasSelected = treeElement.selected;
    const parentListTreeElement = treeElement.parent;
    if (parentListTreeElement) {
      parentListTreeElement.removeChild(treeElement);
      parentListTreeElement.setExpandable(parentListTreeElement.childCount() > 0);
      if (wasSelected) {
        parentListTreeElement.select();
      }
    }
    this.sharedStorageTreeElements.delete(sharedStorage.securityOrigin);
  }
  sharedStorageAccess(event) {
    this.sharedStorageListTreeElement.addEvent(event.data);
  }
  async showResource(resource, line, column) {
    await this.resourcesSection.revealResource(resource, line, column);
  }
  showFrame(frame) {
    this.resourcesSection.revealAndSelectFrame(frame);
  }
  showPreloadingRuleSetView(revealInfo) {
    if (this.preloadingSummaryTreeElement) {
      this.preloadingSummaryTreeElement.expandAndRevealRuleSet(revealInfo);
    }
  }
  showPreloadingAttemptViewWithFilter(filter) {
    if (this.preloadingSummaryTreeElement) {
      this.preloadingSummaryTreeElement.expandAndRevealAttempts(filter);
    }
  }
  onmousemove(event) {
    const nodeUnderMouse = event.target;
    if (!nodeUnderMouse) {
      return;
    }
    const listNode = UI21.UIUtils.enclosingNodeOrSelfWithNodeName(nodeUnderMouse, "li");
    if (!listNode) {
      return;
    }
    const element = UI21.TreeOutline.TreeElement.getTreeElementBylistItemNode(listNode);
    if (this.previousHoveredElement === element) {
      return;
    }
    if (this.previousHoveredElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }
    if (element instanceof FrameTreeElement) {
      this.previousHoveredElement = element;
      element.hovered = true;
    }
  }
  onmouseleave(_event) {
    if (this.previousHoveredElement) {
      this.previousHoveredElement.hovered = false;
      delete this.previousHoveredElement;
    }
  }
};
var BackgroundServiceTreeElement = class extends ApplicationPanelTreeElement {
  serviceName;
  view;
  model;
  #selected;
  constructor(storagePanel, serviceName) {
    super(storagePanel, BackgroundServiceView.getUIString(serviceName), false, Platform8.StringUtilities.toKebabCase(serviceName));
    this.serviceName = serviceName;
    this.#selected = false;
    this.view = null;
    this.model = null;
    const backgroundServiceIcon = createIcon11(this.getIconType());
    this.setLeadingIcons([backgroundServiceIcon]);
  }
  getIconType() {
    switch (this.serviceName) {
      case "backgroundFetch":
        return "arrow-up-down";
      case "backgroundSync":
        return "sync";
      case "pushMessaging":
        return "cloud";
      case "notifications":
        return "bell";
      case "paymentHandler":
        return "credit-card";
      case "periodicBackgroundSync":
        return "watch";
      default:
        console.error(`Service ${this.serviceName} does not have a dedicated icon`);
        return "table";
    }
  }
  initialize(model) {
    this.model = model;
    if (this.#selected && !this.view) {
      this.onselect(false);
    }
  }
  get itemURL() {
    return `background-service://${this.serviceName}`;
  }
  get selectable() {
    if (!this.model) {
      return false;
    }
    return super.selectable;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.#selected = true;
    if (!this.model) {
      return false;
    }
    if (!this.view) {
      this.view = new BackgroundServiceView(this.serviceName, this.model);
    }
    this.showView(this.view);
    UI21.Context.Context.instance().setFlavor(BackgroundServiceView, this.view);
    Host9.userMetrics.panelShown("background_service_" + this.serviceName);
    return false;
  }
};
var ServiceWorkersTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18n55.i18n.lockedString("Service workers"), false, "service-workers");
    const icon = createIcon11("gears");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "service-workers://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ServiceWorkersView();
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("service-workers");
    return false;
  }
};
var AppManifestTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString28(UIStrings28.manifest), true, "manifest");
    const icon = createIcon11("document");
    this.setLeadingIcons([icon]);
    self.onInvokeElement(this.listItemElement, this.onInvoke.bind(this));
    this.view = new AppManifestView();
    UI21.ARIAUtils.setLabel(this.listItemElement, i18nString28(UIStrings28.onInvokeManifestAlert));
    const handleExpansion = (hasManifest) => {
      this.setExpandable(hasManifest);
    };
    this.view.addEventListener("ManifestDetected", (event) => handleExpansion(event.data));
  }
  get itemURL() {
    return "manifest://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.showView(this.view);
    Host9.userMetrics.panelShown("app-manifest");
    return false;
  }
  generateChildren() {
    const staticSections = this.view.getStaticSections();
    for (const section9 of staticSections) {
      const sectionElement = section9.getTitleElement();
      const childTitle = section9.title();
      const sectionFieldElement = section9.getFieldElement();
      const child = new ManifestChildTreeElement(this.resourcesPanel, sectionElement, childTitle, sectionFieldElement, section9.jslogContext || "");
      this.appendChild(child);
    }
  }
  onInvoke() {
    this.view.getManifestElement().scrollIntoView();
    UI21.ARIAUtils.LiveAnnouncer.alert(i18nString28(UIStrings28.onInvokeAlert, { PH1: this.listItemElement.title }));
  }
  showManifestView() {
    this.showView(this.view);
  }
};
var ManifestChildTreeElement = class extends ApplicationPanelTreeElement {
  #sectionElement;
  #sectionFieldElement;
  constructor(storagePanel, element, childTitle, fieldElement, jslogContext) {
    super(storagePanel, childTitle, false, jslogContext);
    const icon = createIcon11("document");
    this.setLeadingIcons([icon]);
    this.#sectionElement = element;
    this.#sectionFieldElement = fieldElement;
    self.onInvokeElement(this.listItemElement, this.onInvoke.bind(this));
    this.listItemElement.addEventListener("keydown", this.onInvokeElementKeydown.bind(this));
    UI21.ARIAUtils.setLabel(this.listItemElement, i18nString28(UIStrings28.beforeInvokeAlert, { PH1: this.listItemElement.title }));
  }
  get itemURL() {
    return "manifest://" + this.title;
  }
  onInvoke() {
    this.parent?.showManifestView();
    this.#sectionElement.scrollIntoView();
    UI21.ARIAUtils.LiveAnnouncer.alert(i18nString28(UIStrings28.onInvokeAlert, { PH1: this.listItemElement.title }));
  }
  // direct focus to the corresponding element
  onInvokeElementKeydown(event) {
    if (event.key !== "Tab" || event.shiftKey) {
      return;
    }
    const checkBoxElement = this.#sectionFieldElement.querySelector(".mask-checkbox");
    let focusableElement = this.#sectionFieldElement.querySelector('[tabindex="0"]');
    if (checkBoxElement?.shadowRoot) {
      focusableElement = checkBoxElement.shadowRoot.querySelector("input") || null;
    } else if (!focusableElement) {
      focusableElement = this.#sectionFieldElement.querySelector("devtools-protocol-handlers-view")?.shadowRoot?.querySelector('[tabindex="0"]') || null;
    }
    if (focusableElement) {
      focusableElement?.focus();
      event.consume(true);
    }
  }
};
var ClearStorageTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString28(UIStrings28.storage), false, "storage");
    const icon = createIcon11("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "clear-storage://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new StorageView();
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown(Host9.UserMetrics.PanelCodes[Host9.UserMetrics.PanelCodes.storage]);
    return false;
  }
};
var IndexedDBTreeElement = class extends ExpandableApplicationPanelTreeElement {
  idbDatabaseTreeElements;
  storageBucket;
  constructor(storagePanel, storageBucket) {
    super(storagePanel, i18nString28(UIStrings28.indexeddb), i18nString28(UIStrings28.noIndexeddb), i18nString28(UIStrings28.indexeddbDescription), "indexed-db");
    const icon = createIcon11("database");
    this.setLeadingIcons([icon]);
    this.idbDatabaseTreeElements = [];
    this.storageBucket = storageBucket;
    this.initialize();
  }
  initialize() {
    SDK23.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseAdded, this.indexedDBAdded, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseRemoved, this.indexedDBRemoved, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseLoaded, this.indexedDBLoaded, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.IndexedDBContentUpdated, this.indexedDBContentUpdated, this, { scoped: true });
    this.idbDatabaseTreeElements = [];
    for (const indexedDBModel of SDK23.TargetManager.TargetManager.instance().models(IndexedDBModel, { scoped: true })) {
      const databases = indexedDBModel.databases();
      for (let j = 0; j < databases.length; ++j) {
        this.addIndexedDB(indexedDBModel, databases[j]);
      }
    }
  }
  addIndexedDBForModel(model) {
    for (const databaseId of model.databases()) {
      this.addIndexedDB(model, databaseId);
    }
  }
  removeIndexedDBForModel(model) {
    const idbDatabaseTreeElements = this.idbDatabaseTreeElements.filter((element) => element.model === model);
    for (const idbDatabaseTreeElement of idbDatabaseTreeElements) {
      this.removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
    }
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.refreshIndexeddb), this.refreshIndexedDB.bind(this), { jslogContext: "refresh-indexeddb" });
    void contextMenu.show();
  }
  refreshIndexedDB() {
    for (const indexedDBModel of SDK23.TargetManager.TargetManager.instance().models(IndexedDBModel, { scoped: true })) {
      void indexedDBModel.refreshDatabaseNames();
    }
  }
  databaseInTree(databaseId) {
    if (this.storageBucket) {
      return databaseId.inBucket(this.storageBucket);
    }
    return true;
  }
  indexedDBAdded({ data: { databaseId, model } }) {
    this.addIndexedDB(model, databaseId);
  }
  addIndexedDB(model, databaseId) {
    if (!this.databaseInTree(databaseId)) {
      return;
    }
    const idbDatabaseTreeElement = new IDBDatabaseTreeElement(this.resourcesPanel, model, databaseId);
    this.idbDatabaseTreeElements.push(idbDatabaseTreeElement);
    this.appendChild(idbDatabaseTreeElement);
    model.refreshDatabase(databaseId);
  }
  indexedDBRemoved({ data: { databaseId, model } }) {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    this.removeIDBDatabaseTreeElement(idbDatabaseTreeElement);
  }
  removeIDBDatabaseTreeElement(idbDatabaseTreeElement) {
    idbDatabaseTreeElement.clear();
    this.removeChild(idbDatabaseTreeElement);
    Platform8.ArrayUtilities.removeElement(this.idbDatabaseTreeElements, idbDatabaseTreeElement);
    this.setExpandable(this.childCount() > 0);
  }
  indexedDBLoaded({ data: { database, model, entriesUpdated } }) {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, database.databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.update(database, entriesUpdated);
    this.indexedDBLoadedForTest();
  }
  indexedDBLoadedForTest() {
  }
  indexedDBContentUpdated({ data: { databaseId, objectStoreName, model } }) {
    const idbDatabaseTreeElement = this.idbDatabaseTreeElement(model, databaseId);
    if (!idbDatabaseTreeElement) {
      return;
    }
    idbDatabaseTreeElement.indexedDBContentUpdated(objectStoreName);
  }
  idbDatabaseTreeElement(model, databaseId) {
    return this.idbDatabaseTreeElements.find((x) => x.databaseId.equals(databaseId) && x.model === model) || null;
  }
};
var IDBDatabaseTreeElement = class extends ApplicationPanelTreeElement {
  model;
  databaseId;
  idbObjectStoreTreeElements;
  database;
  view;
  constructor(storagePanel, model, databaseId) {
    super(storagePanel, databaseId.name, false, "indexed-db-database");
    this.model = model;
    this.databaseId = databaseId;
    this.idbObjectStoreTreeElements = /* @__PURE__ */ new Map();
    const icon = createIcon11("database");
    this.setLeadingIcons([icon]);
    this.model.addEventListener(Events2.DatabaseNamesRefreshed, this.refreshIndexedDB, this);
  }
  get itemURL() {
    return "indexedDB://" + this.databaseId.storageBucket.storageKey + "/" + (this.databaseId.storageBucket.name ?? "") + "/" + this.databaseId.name;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.refreshIndexeddb), this.refreshIndexedDB.bind(this), { jslogContext: "refresh-indexeddb" });
    void contextMenu.show();
  }
  refreshIndexedDB() {
    this.model.refreshDatabase(this.databaseId);
  }
  indexedDBContentUpdated(objectStoreName) {
    const treeElement = this.idbObjectStoreTreeElements.get(objectStoreName);
    if (treeElement) {
      treeElement.markNeedsRefresh();
    }
  }
  update(database, entriesUpdated) {
    this.database = database;
    const objectStoreNames = /* @__PURE__ */ new Set();
    for (const objectStoreName of [...this.database.objectStores.keys()].sort()) {
      const objectStore = this.database.objectStores.get(objectStoreName);
      if (!objectStore) {
        continue;
      }
      objectStoreNames.add(objectStore.name);
      let treeElement = this.idbObjectStoreTreeElements.get(objectStore.name);
      if (!treeElement) {
        treeElement = new IDBObjectStoreTreeElement(this.resourcesPanel, this.model, this.databaseId, objectStore);
        this.idbObjectStoreTreeElements.set(objectStore.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(objectStore, entriesUpdated);
    }
    for (const objectStoreName of this.idbObjectStoreTreeElements.keys()) {
      if (!objectStoreNames.has(objectStoreName)) {
        this.objectStoreRemoved(objectStoreName);
      }
    }
    if (this.view) {
      this.view.getComponent().update(database);
    }
    this.updateTooltip();
  }
  updateTooltip() {
    const version = this.database ? this.database.version : "-";
    if (Object.keys(this.idbObjectStoreTreeElements).length === 0) {
      this.tooltip = i18nString28(UIStrings28.versionSEmpty, { PH1: version });
    } else {
      this.tooltip = i18nString28(UIStrings28.versionS, { PH1: version });
    }
  }
  get selectable() {
    if (!this.database) {
      return false;
    }
    return super.selectable;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.database) {
      return false;
    }
    if (!this.view) {
      this.view = LegacyWrapper5.LegacyWrapper.legacyWrapper(UI21.Widget.VBox, new IDBDatabaseView(this.model, this.database), "indexeddb-data");
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("indexed-db");
    return false;
  }
  objectStoreRemoved(objectStoreName) {
    const objectStoreTreeElement = this.idbObjectStoreTreeElements.get(objectStoreName);
    if (objectStoreTreeElement) {
      objectStoreTreeElement.clear();
      this.removeChild(objectStoreTreeElement);
    }
    this.idbObjectStoreTreeElements.delete(objectStoreName);
    this.updateTooltip();
  }
  clear() {
    for (const objectStoreName of this.idbObjectStoreTreeElements.keys()) {
      this.objectStoreRemoved(objectStoreName);
    }
  }
};
var IDBObjectStoreTreeElement = class extends ApplicationPanelTreeElement {
  model;
  databaseId;
  idbIndexTreeElements;
  objectStore;
  view;
  constructor(storagePanel, model, databaseId, objectStore) {
    super(storagePanel, objectStore.name, false, "indexed-db-object-store");
    this.model = model;
    this.databaseId = databaseId;
    this.idbIndexTreeElements = /* @__PURE__ */ new Map();
    this.objectStore = objectStore;
    this.view = null;
    const icon = createIcon11("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "indexedDB://" + this.databaseId.storageBucket.storageKey + "/" + (this.databaseId.storageBucket.name ?? "") + "/" + this.databaseId.name + "/" + this.objectStore.name;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  markNeedsRefresh() {
    if (this.view) {
      this.view.markNeedsRefresh();
    }
    for (const treeElement of this.idbIndexTreeElements.values()) {
      treeElement.markNeedsRefresh();
    }
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.clear), this.clearObjectStore.bind(this), { jslogContext: "clear" });
    void contextMenu.show();
  }
  refreshObjectStore() {
    if (this.view) {
      this.view.refreshData();
    }
    for (const treeElement of this.idbIndexTreeElements.values()) {
      treeElement.refreshIndex();
    }
  }
  async clearObjectStore() {
    await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
    this.update(this.objectStore, true);
  }
  update(objectStore, entriesUpdated) {
    this.objectStore = objectStore;
    const indexNames = /* @__PURE__ */ new Set();
    for (const index of this.objectStore.indexes.values()) {
      indexNames.add(index.name);
      let treeElement = this.idbIndexTreeElements.get(index.name);
      if (!treeElement) {
        treeElement = new IDBIndexTreeElement(this.resourcesPanel, this.model, this.databaseId, this.objectStore, index, this.refreshObjectStore.bind(this));
        this.idbIndexTreeElements.set(index.name, treeElement);
        this.appendChild(treeElement);
      }
      treeElement.update(this.objectStore, index, entriesUpdated);
    }
    for (const indexName of this.idbIndexTreeElements.keys()) {
      if (!indexNames.has(indexName)) {
        this.indexRemoved(indexName);
      }
    }
    for (const [indexName, treeElement] of this.idbIndexTreeElements.entries()) {
      if (!indexNames.has(indexName)) {
        this.removeChild(treeElement);
        this.idbIndexTreeElements.delete(indexName);
      }
    }
    if (this.childCount()) {
      this.expand();
    }
    if (this.view && entriesUpdated) {
      this.view.update(this.objectStore, null);
    }
    this.updateTooltip();
  }
  updateTooltip() {
    const keyPathString = this.objectStore.keyPathString;
    let tooltipString = keyPathString !== null ? i18nString28(UIStrings28.keyPathS, { PH1: keyPathString }) : "";
    if (this.objectStore.autoIncrement) {
      tooltipString += "\n" + i18n55.i18n.lockedString("autoIncrement");
    }
    this.tooltip = tooltipString;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new IDBDataView(this.model, this.databaseId, this.objectStore, null, this.refreshObjectStore.bind(this));
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("indexed-db");
    return false;
  }
  indexRemoved(indexName) {
    const indexTreeElement = this.idbIndexTreeElements.get(indexName);
    if (indexTreeElement) {
      indexTreeElement.clear();
      this.removeChild(indexTreeElement);
    }
    this.idbIndexTreeElements.delete(indexName);
  }
  clear() {
    for (const indexName of this.idbIndexTreeElements.keys()) {
      this.indexRemoved(indexName);
    }
    if (this.view) {
      this.view.clear();
    }
  }
};
var IDBIndexTreeElement = class extends ApplicationPanelTreeElement {
  model;
  databaseId;
  objectStore;
  index;
  refreshObjectStore;
  view;
  constructor(storagePanel, model, databaseId, objectStore, index, refreshObjectStore) {
    super(storagePanel, index.name, false, "indexed-db");
    this.model = model;
    this.databaseId = databaseId;
    this.objectStore = objectStore;
    this.index = index;
    this.refreshObjectStore = refreshObjectStore;
  }
  get itemURL() {
    return "indexedDB://" + this.databaseId.storageBucket.storageKey + "/" + (this.databaseId.storageBucket.name ?? "") + "/" + this.databaseId.name + "/" + this.objectStore.name + "/" + this.index.name;
  }
  markNeedsRefresh() {
    if (this.view) {
      this.view.markNeedsRefresh();
    }
  }
  refreshIndex() {
    if (this.view) {
      this.view.refreshData();
    }
  }
  update(objectStore, index, entriesUpdated) {
    this.objectStore = objectStore;
    this.index = index;
    if (this.view && entriesUpdated) {
      this.view.update(this.objectStore, this.index);
    }
    this.updateTooltip();
  }
  updateTooltip() {
    const tooltipLines = [];
    const keyPathString = this.index.keyPathString;
    tooltipLines.push(i18nString28(UIStrings28.keyPathS, { PH1: keyPathString }));
    if (this.index.unique) {
      tooltipLines.push(i18n55.i18n.lockedString("unique"));
    }
    if (this.index.multiEntry) {
      tooltipLines.push(i18n55.i18n.lockedString("multiEntry"));
    }
    this.tooltip = tooltipLines.join("\n");
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new IDBDataView(this.model, this.databaseId, this.objectStore, this.index, this.refreshObjectStore);
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("indexed-db");
    return false;
  }
  clear() {
    if (this.view) {
      this.view.clear();
    }
  }
};
var DOMStorageTreeElement = class extends ApplicationPanelTreeElement {
  domStorage;
  constructor(storagePanel, domStorage) {
    super(storagePanel, domStorage.storageKey ? SDK23.StorageKeyManager.parseStorageKey(domStorage.storageKey).origin : i18nString28(UIStrings28.localFiles), false, domStorage.isLocalStorage ? "local-storage-for-domain" : "session-storage-for-domain");
    this.domStorage = domStorage;
    const icon = createIcon11("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "storage://" + this.domStorage.storageKey + "/" + (this.domStorage.isLocalStorage ? "local" : "session");
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    Host9.userMetrics.panelShown("dom-storage");
    this.resourcesPanel.showDOMStorage(this.domStorage);
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.clear), () => this.domStorage.clear(), { jslogContext: "clear" });
    void contextMenu.show();
  }
};
var ExtensionStorageTreeElement = class extends ApplicationPanelTreeElement {
  extensionStorage;
  constructor(storagePanel, extensionStorage) {
    super(storagePanel, nameForExtensionStorageArea(extensionStorage.storageArea), false, "extension-storage-for-domain");
    this.extensionStorage = extensionStorage;
    const icon = createIcon11("table");
    this.setLeadingIcons([icon]);
  }
  get storageArea() {
    return this.extensionStorage.storageArea;
  }
  get itemURL() {
    return "extension-storage://" + this.extensionStorage.extensionId + "/" + this.extensionStorage.storageArea;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showExtensionStorage(this.extensionStorage);
    Host9.userMetrics.panelShown("extension-storage");
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.clear), () => this.extensionStorage.clear(), { jslogContext: "clear" });
    void contextMenu.show();
  }
};
var ExtensionStorageTreeParentElement = class extends ApplicationPanelTreeElement {
  extensionId;
  constructor(storagePanel, extensionId, extensionName) {
    super(storagePanel, extensionName || extensionId, true, "extension-storage-for-domain");
    this.extensionId = extensionId;
    const icon = createIcon11("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "extension-storage://" + this.extensionId;
  }
};
var CookieTreeElement = class extends ApplicationPanelTreeElement {
  target;
  #cookieDomain;
  constructor(storagePanel, frame, cookieUrl) {
    super(storagePanel, cookieUrl.securityOrigin() || i18nString28(UIStrings28.localFiles), false, "cookies-for-frame");
    this.target = frame.resourceTreeModel().target();
    this.#cookieDomain = cookieUrl.securityOrigin();
    this.tooltip = i18nString28(UIStrings28.cookiesUsedByFramesFromS, { PH1: this.#cookieDomain });
    const icon = createIcon11("cookie");
    if (IssuesManager.RelatedIssue.hasThirdPartyPhaseoutCookieIssueForDomain(cookieUrl.domain())) {
      icon.name = "warning-filled";
      this.tooltip = i18nString28(UIStrings28.thirdPartyPhaseout, { PH1: this.#cookieDomain });
    }
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "cookies://" + this.#cookieDomain;
  }
  cookieDomain() {
    return this.#cookieDomain;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString28(UIStrings28.clear), () => this.resourcesPanel.clearCookies(this.target, this.#cookieDomain), { jslogContext: "clear" });
    void contextMenu.show();
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCookies(this.target, this.#cookieDomain);
    Host9.userMetrics.panelShown(Host9.UserMetrics.PanelCodes[Host9.UserMetrics.PanelCodes.cookies]);
    return false;
  }
};
var StorageCategoryView = class extends UI21.Widget.VBox {
  emptyWidget;
  constructor() {
    super();
    this.element.classList.add("storage-view");
    this.emptyWidget = new UI21.EmptyWidget.EmptyWidget("", "");
    this.emptyWidget.show(this.element);
  }
  setText(text) {
    this.emptyWidget.text = text;
  }
  setHeadline(header) {
    this.emptyWidget.header = header;
  }
  setLink(link4) {
    this.emptyWidget.link = link4;
  }
};
var ResourcesSection = class {
  panel;
  treeElement;
  treeElementForFrameId;
  treeElementForTargetId;
  constructor(storagePanel, treeElement) {
    this.panel = storagePanel;
    this.treeElement = treeElement;
    UI21.ARIAUtils.setLabel(this.treeElement.listItemNode, "Resources Section");
    this.treeElementForFrameId = /* @__PURE__ */ new Map();
    this.treeElementForTargetId = /* @__PURE__ */ new Map();
    const frameManager = SDK23.FrameManager.FrameManager.instance();
    frameManager.addEventListener("FrameAddedToTarget", (event) => this.frameAdded(event.data.frame), this);
    frameManager.addEventListener("FrameRemoved", (event) => this.frameDetached(event.data.frameId), this);
    frameManager.addEventListener("FrameNavigated", (event) => this.frameNavigated(event.data.frame), this);
    frameManager.addEventListener("ResourceAdded", (event) => this.resourceAdded(event.data.resource), this);
    SDK23.TargetManager.TargetManager.instance().addModelListener(SDK23.ChildTargetManager.ChildTargetManager, "TargetCreated", this.windowOpened, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(SDK23.ChildTargetManager.ChildTargetManager, "TargetInfoChanged", this.windowChanged, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().addModelListener(SDK23.ChildTargetManager.ChildTargetManager, "TargetDestroyed", this.windowDestroyed, this, { scoped: true });
    SDK23.TargetManager.TargetManager.instance().observeTargets(this, { scoped: true });
  }
  initialize() {
    const frameManager = SDK23.FrameManager.FrameManager.instance();
    for (const frame of frameManager.getAllFrames()) {
      if (!this.treeElementForFrameId.get(frame.id)) {
        this.addFrameAndParents(frame);
      }
      const childTargetManager = frame.resourceTreeModel().target().model(SDK23.ChildTargetManager.ChildTargetManager);
      if (childTargetManager) {
        for (const targetInfo of childTargetManager.targetInfos()) {
          this.windowOpened({ data: targetInfo });
        }
      }
    }
  }
  targetAdded(target) {
    if (target.type() === SDK23.Target.Type.Worker || target.type() === SDK23.Target.Type.ServiceWorker) {
      void this.workerAdded(target);
    }
    if (target.type() === SDK23.Target.Type.FRAME && target === target.outermostTarget()) {
      this.initialize();
    }
  }
  async workerAdded(target) {
    const parentTarget = target.parentTarget();
    if (!parentTarget) {
      return;
    }
    const parentTargetId = parentTarget.id();
    const frameTreeElement = this.treeElementForTargetId.get(parentTargetId);
    const targetId = target.id();
    assertNotMainTarget(targetId);
    const { targetInfo } = await parentTarget.targetAgent().invoke_getTargetInfo({ targetId });
    if (frameTreeElement && targetInfo) {
      frameTreeElement.workerCreated(targetInfo);
    }
  }
  targetRemoved(_target) {
  }
  addFrameAndParents(frame) {
    const parentFrame = frame.parentFrame();
    if (parentFrame && !this.treeElementForFrameId.get(parentFrame.id)) {
      this.addFrameAndParents(parentFrame);
    }
    this.frameAdded(frame);
  }
  expandFrame(frame) {
    if (!frame) {
      return false;
    }
    let treeElement = this.treeElementForFrameId.get(frame.id);
    if (!treeElement && !this.expandFrame(frame.parentFrame())) {
      return false;
    }
    treeElement = this.treeElementForFrameId.get(frame.id);
    if (!treeElement) {
      return false;
    }
    treeElement.expand();
    return true;
  }
  async revealResource(resource, line, column) {
    if (!this.expandFrame(resource.frame())) {
      return;
    }
    const resourceTreeElement = FrameResourceTreeElement.forResource(resource);
    if (resourceTreeElement) {
      await resourceTreeElement.revealResource(line, column);
    }
  }
  revealAndSelectFrame(frame) {
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    frameTreeElement?.reveal();
    frameTreeElement?.select();
  }
  frameAdded(frame) {
    if (!SDK23.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const parentFrame = frame.parentFrame();
    const parentTreeElement = parentFrame ? this.treeElementForFrameId.get(parentFrame.id) : this.treeElement;
    if (!parentTreeElement) {
      return;
    }
    const existingElement = this.treeElementForFrameId.get(frame.id);
    if (existingElement) {
      this.treeElementForFrameId.delete(frame.id);
      if (existingElement.parent) {
        existingElement.parent.removeChild(existingElement);
      }
    }
    const frameTreeElement = new FrameTreeElement(this, frame);
    this.treeElementForFrameId.set(frame.id, frameTreeElement);
    const targetId = frame.resourceTreeModel().target().id();
    if (!this.treeElementForTargetId.get(targetId)) {
      this.treeElementForTargetId.set(targetId, frameTreeElement);
    }
    parentTreeElement.appendChild(frameTreeElement);
    for (const resource of frame.resources()) {
      this.resourceAdded(resource);
    }
  }
  frameDetached(frameId) {
    const frameTreeElement = this.treeElementForFrameId.get(frameId);
    if (!frameTreeElement) {
      return;
    }
    this.treeElementForFrameId.delete(frameId);
    if (frameTreeElement.parent) {
      frameTreeElement.parent.removeChild(frameTreeElement);
    }
  }
  frameNavigated(frame) {
    if (!SDK23.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    if (frameTreeElement) {
      void frameTreeElement.frameNavigated(frame);
    }
  }
  resourceAdded(resource) {
    const frame = resource.frame();
    if (!frame) {
      return;
    }
    if (!SDK23.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
      return;
    }
    const frameTreeElement = this.treeElementForFrameId.get(frame.id);
    if (!frameTreeElement) {
      return;
    }
    frameTreeElement.appendResource(resource);
  }
  windowOpened(event) {
    const targetInfo = event.data;
    if (targetInfo.openerId && targetInfo.type === "page") {
      const frameTreeElement = this.treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        this.treeElementForTargetId.set(targetInfo.targetId, frameTreeElement);
        frameTreeElement.windowOpened(targetInfo);
      }
    }
  }
  windowDestroyed(event) {
    const targetId = event.data;
    const frameTreeElement = this.treeElementForTargetId.get(targetId);
    if (frameTreeElement) {
      frameTreeElement.windowDestroyed(targetId);
      this.treeElementForTargetId.delete(targetId);
    }
  }
  windowChanged(event) {
    const targetInfo = event.data;
    if (targetInfo.openerId && targetInfo.type === "page") {
      const frameTreeElement = this.treeElementForFrameId.get(targetInfo.openerId);
      if (frameTreeElement) {
        frameTreeElement.windowChanged(targetInfo);
      }
    }
  }
  reset() {
    this.treeElement.removeChildren();
    this.treeElementForFrameId.clear();
    this.treeElementForTargetId.clear();
  }
};
var FrameTreeElement = class _FrameTreeElement extends ApplicationPanelTreeElement {
  section;
  frame;
  categoryElements;
  treeElementForResource;
  treeElementForWindow;
  treeElementForWorker;
  view;
  constructor(section9, frame) {
    super(section9.panel, "", false, "frame");
    this.section = section9;
    this.frame = frame;
    this.categoryElements = /* @__PURE__ */ new Map();
    this.treeElementForResource = /* @__PURE__ */ new Map();
    this.treeElementForWindow = /* @__PURE__ */ new Map();
    this.treeElementForWorker = /* @__PURE__ */ new Map();
    void this.frameNavigated(frame);
    this.view = null;
  }
  getIconTypeForFrame(frame) {
    if (frame.isOutermostFrame()) {
      return frame.unreachableUrl() ? "frame-crossed" : "frame";
    }
    return frame.unreachableUrl() ? "iframe-crossed" : "iframe";
  }
  async frameNavigated(frame) {
    const icon = createIcon11(this.getIconTypeForFrame(frame));
    if (frame.unreachableUrl()) {
      icon.classList.add("red-icon");
    }
    this.setLeadingIcons([icon]);
    this.invalidateChildren();
    if (this.title !== frame.displayName()) {
      this.title = frame.displayName();
      UI21.ARIAUtils.setLabel(this.listItemElement, this.title);
      if (this.parent) {
        const parent = this.parent;
        parent.removeChild(this);
        parent.appendChild(this);
      }
    }
    this.categoryElements.clear();
    this.treeElementForResource.clear();
    this.treeElementForWorker.clear();
    if (this.selected) {
      this.view = new FrameDetailsReportView();
      this.view.frame = this.frame;
      this.showView(this.view);
    } else {
      this.view = null;
    }
    if (frame.isOutermostFrame()) {
      const targets = SDK23.TargetManager.TargetManager.instance().targets();
      for (const target of targets) {
        if (target.type() === SDK23.Target.Type.ServiceWorker && SDK23.TargetManager.TargetManager.instance().isInScope(target)) {
          const targetId = target.id();
          assertNotMainTarget(targetId);
          const agent = frame.resourceTreeModel().target().targetAgent();
          const targetInfo = (await agent.invoke_getTargetInfo({ targetId })).targetInfo;
          this.workerCreated(targetInfo);
        }
      }
    }
  }
  get itemURL() {
    if (this.frame.isOutermostFrame()) {
      return "frame://";
    }
    return "frame://" + encodeURI(this.frame.url);
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new FrameDetailsReportView();
      this.view.frame = this.frame;
    }
    Host9.userMetrics.panelShown("frame-details");
    this.showView(this.view);
    this.listItemElement.classList.remove("hovered");
    SDK23.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return false;
  }
  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add("hovered");
      void this.frame.highlight();
    } else {
      this.listItemElement.classList.remove("hovered");
      SDK23.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
  }
  appendResource(resource) {
    const statusCode = resource.statusCode();
    if (statusCode >= 301 && statusCode <= 303) {
      return;
    }
    const resourceType = resource.resourceType();
    const categoryName = resourceType.name();
    let categoryElement = resourceType === Common16.ResourceType.resourceTypes.Document ? this : this.categoryElements.get(categoryName);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, resource.resourceType().category().title(), "", i18nString28(UIStrings28.resourceDescription), categoryName, categoryName === "Frames");
      this.categoryElements.set(resourceType.name(), categoryElement);
      this.appendChild(categoryElement, _FrameTreeElement.presentationOrderCompare);
    }
    const resourceTreeElement = new FrameResourceTreeElement(this.section.panel, resource);
    categoryElement.appendChild(resourceTreeElement, _FrameTreeElement.presentationOrderCompare);
    this.treeElementForResource.set(resource.url, resourceTreeElement);
  }
  windowOpened(targetInfo) {
    const categoryKey = "opened-windows";
    let categoryElement = this.categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, i18nString28(UIStrings28.openedWindows), "", i18nString28(UIStrings28.openedWindowsDescription), categoryKey);
      this.categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, _FrameTreeElement.presentationOrderCompare);
    }
    if (!this.treeElementForWindow.get(targetInfo.targetId)) {
      const windowTreeElement = new FrameWindowTreeElement(this.section.panel, targetInfo);
      categoryElement.appendChild(windowTreeElement);
      this.treeElementForWindow.set(targetInfo.targetId, windowTreeElement);
    }
  }
  workerCreated(targetInfo) {
    const categoryKey = targetInfo.type === "service_worker" ? "service-workers" : "web-workers";
    const categoryName = targetInfo.type === "service_worker" ? i18n55.i18n.lockedString("Service workers") : i18nString28(UIStrings28.webWorkers);
    let categoryElement = this.categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, categoryName, "", i18nString28(UIStrings28.workerDescription), categoryKey);
      this.categoryElements.set(categoryKey, categoryElement);
      this.appendChild(categoryElement, _FrameTreeElement.presentationOrderCompare);
    }
    if (!this.treeElementForWorker.get(targetInfo.targetId)) {
      const workerTreeElement = new WorkerTreeElement(this.section.panel, targetInfo);
      categoryElement.appendChild(workerTreeElement);
      this.treeElementForWorker.set(targetInfo.targetId, workerTreeElement);
    }
  }
  windowChanged(targetInfo) {
    const windowTreeElement = this.treeElementForWindow.get(targetInfo.targetId);
    if (!windowTreeElement) {
      return;
    }
    if (windowTreeElement.title !== targetInfo.title) {
      windowTreeElement.title = targetInfo.title;
    }
    windowTreeElement.update(targetInfo);
  }
  windowDestroyed(targetId) {
    const windowTreeElement = this.treeElementForWindow.get(targetId);
    if (windowTreeElement) {
      windowTreeElement.windowClosed();
    }
  }
  appendChild(treeElement, comparator = _FrameTreeElement.presentationOrderCompare) {
    super.appendChild(treeElement, comparator);
  }
  /**
   * Order elements by type (first frames, then resources, last Document resources)
   * and then each of these groups in the alphabetical order.
   */
  static presentationOrderCompare(treeElement1, treeElement2) {
    function typeWeight(treeElement) {
      if (treeElement instanceof ExpandableApplicationPanelTreeElement) {
        return 2;
      }
      if (treeElement instanceof _FrameTreeElement) {
        return 1;
      }
      return 3;
    }
    const typeWeight1 = typeWeight(treeElement1);
    const typeWeight2 = typeWeight(treeElement2);
    return typeWeight1 - typeWeight2 || treeElement1.titleAsText().localeCompare(treeElement2.titleAsText());
  }
};
var resourceToFrameResourceTreeElement = /* @__PURE__ */ new WeakMap();
var FrameResourceTreeElement = class extends ApplicationPanelTreeElement {
  panel;
  resource;
  previewPromise;
  constructor(storagePanel, resource) {
    super(storagePanel, resource.isGenerated ? i18nString28(UIStrings28.documentNotAvailable) : resource.displayName, false, "frame-resource");
    this.panel = storagePanel;
    this.resource = resource;
    this.previewPromise = null;
    this.tooltip = resource.url;
    resourceToFrameResourceTreeElement.set(this.resource, this);
    const icon = createIcon11("document", "navigator-file-tree-item");
    icon.classList.add("navigator-" + resource.resourceType().name() + "-tree-item");
    this.setLeadingIcons([icon]);
  }
  static forResource(resource) {
    return resourceToFrameResourceTreeElement.get(resource);
  }
  get itemURL() {
    return this.resource.url;
  }
  preparePreview() {
    if (this.previewPromise) {
      return this.previewPromise;
    }
    const viewPromise = SourceFrame5.PreviewFactory.PreviewFactory.createPreview(this.resource, this.resource.mimeType);
    this.previewPromise = viewPromise.then((view) => {
      if (view) {
        return view;
      }
      return new UI21.EmptyWidget.EmptyWidget("", this.resource.url);
    });
    return this.previewPromise;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (this.resource.isGenerated) {
      this.panel.showCategoryView("", i18nString28(UIStrings28.documentNotAvailable), i18nString28(UIStrings28.theContentOfThisDocumentHasBeen), null);
    } else {
      void this.panel.scheduleShowView(this.preparePreview());
    }
    Host9.userMetrics.panelShown("frame-resource");
    return false;
  }
  ondblclick(_event) {
    Host9.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.resource.url);
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.draggable = true;
    this.listItemElement.addEventListener("dragstart", this.ondragstart.bind(this), false);
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  ondragstart(event) {
    if (!event.dataTransfer) {
      return false;
    }
    event.dataTransfer.setData("text/plain", this.resource.content || "");
    event.dataTransfer.effectAllowed = "copy";
    return true;
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI21.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.resource);
    void contextMenu.show();
  }
  async revealResource(lineNumber, columnNumber) {
    this.revealAndSelect(true);
    const view = await this.panel.scheduleShowView(this.preparePreview());
    if (!(view instanceof SourceFrame5.ResourceSourceFrame.ResourceSourceFrame) || typeof lineNumber !== "number") {
      return;
    }
    view.revealPosition({ lineNumber, columnNumber }, true);
  }
};
var FrameWindowTreeElement = class extends ApplicationPanelTreeElement {
  targetInfo;
  isWindowClosed;
  view;
  constructor(storagePanel, targetInfo) {
    super(storagePanel, targetInfo.title || i18nString28(UIStrings28.windowWithoutTitle), false, "window");
    this.targetInfo = targetInfo;
    this.isWindowClosed = false;
    this.view = null;
    this.updateIcon(targetInfo.canAccessOpener);
  }
  updateIcon(canAccessOpener) {
    const iconType = canAccessOpener ? "popup" : "frame";
    const icon = createIcon11(iconType);
    this.setLeadingIcons([icon]);
  }
  update(targetInfo) {
    if (targetInfo.canAccessOpener !== this.targetInfo.canAccessOpener) {
      this.updateIcon(targetInfo.canAccessOpener);
    }
    this.targetInfo = targetInfo;
    if (this.view) {
      this.view.setTargetInfo(targetInfo);
      this.view.requestUpdate();
    }
  }
  windowClosed() {
    this.listItemElement.classList.add("window-closed");
    this.isWindowClosed = true;
    if (this.view) {
      this.view.setIsWindowClosed(true);
      this.view.requestUpdate();
    }
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new OpenedWindowDetailsView(this.targetInfo, this.isWindowClosed);
    } else {
      this.view.requestUpdate();
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("frame-window");
    return false;
  }
  get itemURL() {
    return this.targetInfo.url;
  }
};
var WorkerTreeElement = class extends ApplicationPanelTreeElement {
  targetInfo;
  view;
  constructor(storagePanel, targetInfo) {
    super(storagePanel, targetInfo.title || targetInfo.url || i18nString28(UIStrings28.worker), false, "worker");
    this.targetInfo = targetInfo;
    this.view = null;
    const icon = createIcon11("gears", "navigator-file-tree-item");
    this.setLeadingIcons([icon]);
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new WorkerDetailsView(this.targetInfo);
    } else {
      this.view.requestUpdate();
    }
    this.showView(this.view);
    Host9.userMetrics.panelShown("frame-worker");
    return false;
  }
  get itemURL() {
    return this.targetInfo.url;
  }
};

// gen/front_end/panels/application/CookieItemsView.js
var CookieItemsView_exports = {};
__export(CookieItemsView_exports, {
  CookieItemsView: () => CookieItemsView
});
import * as Common17 from "./../../core/common/common.js";
import * as i18n57 from "./../../core/i18n/i18n.js";
import * as SDK24 from "./../../core/sdk/sdk.js";
import * as IssuesManager2 from "./../../models/issues_manager/issues_manager.js";
import * as CookieTable from "./../../ui/legacy/components/cookie_table/cookie_table.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
import * as VisualLogging16 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/cookieItemsView.css.js
var cookieItemsView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.cookie-preview-widget {
  padding: 2px 6px;
}

.cookie-preview-widget-header {
  font-weight: bold;
  user-select: none;
  white-space: nowrap;
  margin-bottom: 4px;
  flex: 0 0 18px;
  display: flex;
  align-items: center;
}

.cookie-preview-widget-header-label {
  line-height: 18px;
  flex-shrink: 0;
}

.cookie-preview-widget-cookie-value {
  user-select: text;
  word-break: break-all;
  flex: 1;
  overflow: auto;
}

.cookie-preview-widget-toggle {
  margin-left: 12px;
  font-weight: normal;
  flex-shrink: 1;
}

/*# sourceURL=${import.meta.resolve("./cookieItemsView.css")} */`;

// gen/front_end/panels/application/CookieItemsView.js
var UIStrings29 = {
  /**
   * @description Label for checkbox to show URL-decoded cookie values
   */
  showUrlDecoded: "Show URL-decoded",
  /**
   * @description Text in Cookie Items View of the Application panel to indicate that no cookie has been selected for preview
   */
  noCookieSelected: "No cookie selected",
  /**
   * @description Text in Cookie Items View of the Application panel
   */
  selectACookieToPreviewItsValue: "Select a cookie to preview its value",
  /**
   * @description Text for filter in Cookies View of the Application panel
   */
  onlyShowCookiesWithAnIssue: "Only show cookies with an issue",
  /**
   * @description Title for filter in the Cookies View of the Application panel
   */
  onlyShowCookiesWhichHaveAn: "Only show cookies that have an associated issue",
  /**
   * @description Label to only delete the cookies that are visible after filtering
   */
  clearFilteredCookies: "Clear filtered cookies",
  /**
   * @description Label to delete all cookies
   */
  clearAllCookies: "Clear all cookies",
  /**
   * @description Alert message for screen reader to announce # of cookies in the table
   * @example {5} PH1
   */
  numberOfCookiesShownInTableS: "Number of cookies shown in table: {PH1}"
};
var str_29 = i18n57.i18n.registerUIStrings("panels/application/CookieItemsView.ts", UIStrings29);
var i18nString29 = i18n57.i18n.getLocalizedString.bind(void 0, str_29);
var CookiePreviewWidget = class extends UI22.Widget.VBox {
  cookie;
  showDecodedSetting;
  toggle;
  value;
  constructor() {
    super({ jslog: `${VisualLogging16.section("cookie-preview")}` });
    this.setMinimumSize(230, 45);
    this.cookie = null;
    this.showDecodedSetting = Common17.Settings.Settings.instance().createSetting("cookie-view-show-decoded", false);
    const header = document.createElement("div");
    header.classList.add("cookie-preview-widget-header");
    const span = document.createElement("span");
    span.classList.add("cookie-preview-widget-header-label");
    span.textContent = "Cookie Value";
    header.appendChild(span);
    this.contentElement.appendChild(header);
    const toggle3 = UI22.UIUtils.CheckboxLabel.create(i18nString29(UIStrings29.showUrlDecoded), this.showDecodedSetting.get(), void 0, "show-url-decoded");
    toggle3.title = i18nString29(UIStrings29.showUrlDecoded);
    toggle3.classList.add("cookie-preview-widget-toggle");
    toggle3.addEventListener("click", () => this.showDecoded(!this.showDecodedSetting.get()));
    header.appendChild(toggle3);
    this.toggle = toggle3;
    const value = document.createElement("div");
    value.classList.add("cookie-preview-widget-cookie-value");
    value.textContent = "";
    value.addEventListener("dblclick", this.handleDblClickOnCookieValue.bind(this));
    this.value = value;
    this.contentElement.classList.add("cookie-preview-widget");
    this.contentElement.appendChild(value);
  }
  showDecoded(decoded) {
    if (!this.cookie) {
      return;
    }
    this.showDecodedSetting.set(decoded);
    this.toggle.checked = decoded;
    this.updatePreview();
  }
  updatePreview() {
    if (this.cookie) {
      this.value.textContent = this.showDecodedSetting.get() ? decodeURIComponent(this.cookie.value()) : this.cookie.value();
    } else {
      this.value.textContent = "";
    }
  }
  setCookie(cookie) {
    this.cookie = cookie;
    this.updatePreview();
  }
  /**
   * Select all text even if there a spaces in it
   */
  handleDblClickOnCookieValue(event) {
    event.preventDefault();
    const range = document.createRange();
    range.selectNode(this.value);
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
};
var CookieItemsView = class extends UI22.Widget.VBox {
  model;
  cookieDomain;
  cookiesTable;
  splitWidget;
  previewPanel;
  previewWidget;
  emptyWidget;
  onlyIssuesFilterUI;
  allCookies;
  shownCookies;
  selectedCookie;
  #toolbar;
  constructor(model, cookieDomain) {
    super({ jslog: `${VisualLogging16.pane("cookies-data")}` });
    this.registerRequiredCSS(cookieItemsView_css_default);
    this.element.classList.add("storage-view");
    this.model = model;
    this.cookieDomain = cookieDomain;
    this.#toolbar = new StorageItemsToolbar();
    this.#toolbar.element.classList.add("flex-none");
    this.#toolbar.show(this.element);
    this.cookiesTable = new CookieTable.CookiesTable.CookiesTable(
      /* renderInline */
      false,
      this.saveCookie.bind(this),
      this.refreshItems.bind(this),
      this.handleCookieSelected.bind(this),
      this.deleteCookie.bind(this)
    );
    this.cookiesTable.setMinimumSize(0, 50);
    this.splitWidget = new UI22.SplitWidget.SplitWidget(
      /* isVertical: */
      false,
      /* secondIsSidebar: */
      true,
      "cookie-items-split-view-state"
    );
    this.splitWidget.show(this.element);
    this.previewPanel = new UI22.Widget.VBox();
    this.previewPanel.element.setAttribute("jslog", `${VisualLogging16.pane("preview").track({ resize: true })}`);
    const resizer = this.previewPanel.element.createChild("div", "preview-panel-resizer");
    this.splitWidget.setMainWidget(this.cookiesTable);
    this.splitWidget.setSidebarWidget(this.previewPanel);
    this.splitWidget.installResizer(resizer);
    this.previewWidget = new CookiePreviewWidget();
    this.emptyWidget = new UI22.EmptyWidget.EmptyWidget(i18nString29(UIStrings29.noCookieSelected), i18nString29(UIStrings29.selectACookieToPreviewItsValue));
    this.emptyWidget.show(this.previewPanel.contentElement);
    this.onlyIssuesFilterUI = new UI22.Toolbar.ToolbarCheckbox(i18nString29(UIStrings29.onlyShowCookiesWithAnIssue), i18nString29(UIStrings29.onlyShowCookiesWhichHaveAn), () => {
      this.updateWithCookies(this.allCookies);
    }, "only-show-cookies-with-issues");
    this.#toolbar.appendToolbarItem(this.onlyIssuesFilterUI);
    this.allCookies = [];
    this.shownCookies = [];
    this.selectedCookie = null;
    this.setCookiesDomain(model, cookieDomain);
    this.#toolbar.addEventListener("DeleteSelected", this.deleteSelectedItem, this);
    this.#toolbar.addEventListener("DeleteAll", this.deleteAllItems, this);
    this.#toolbar.addEventListener("Refresh", this.refreshItems, this);
  }
  setCookiesDomain(model, domain) {
    this.model.removeEventListener("CookieListUpdated", this.onCookieListUpdate, this);
    this.model = model;
    this.cookieDomain = domain;
    this.refreshItems();
    this.model.addEventListener("CookieListUpdated", this.onCookieListUpdate, this);
  }
  wasShown() {
    super.wasShown();
    this.refreshItems();
  }
  showPreview(cookie) {
    if (cookie === this.selectedCookie) {
      return;
    }
    this.selectedCookie = cookie;
    if (!cookie) {
      this.previewWidget.detach();
      this.emptyWidget.show(this.previewPanel.contentElement);
    } else {
      this.emptyWidget.detach();
      this.previewWidget.setCookie(cookie);
      this.previewWidget.show(this.previewPanel.contentElement);
    }
  }
  handleCookieSelected() {
    const cookie = this.cookiesTable.selectedCookie();
    this.#toolbar.setCanDeleteSelected(Boolean(cookie));
    this.showPreview(cookie);
  }
  async saveCookie(newCookie, oldCookie) {
    if (oldCookie && newCookie.key() !== oldCookie.key()) {
      await this.model.deleteCookie(oldCookie);
    }
    return await this.model.saveCookie(newCookie);
  }
  deleteCookie(cookie, callback) {
    void this.model.deleteCookie(cookie).then(callback);
  }
  updateWithCookies(allCookies) {
    this.allCookies = allCookies;
    const parsedURL = Common17.ParsedURL.ParsedURL.fromString(this.cookieDomain);
    const host = parsedURL ? parsedURL.host : "";
    this.cookiesTable.setCookieDomain(host);
    this.shownCookies = this.filter(allCookies, (cookie) => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
    if (this.#toolbar.hasFilter()) {
      this.#toolbar.setDeleteAllTitle(i18nString29(UIStrings29.clearFilteredCookies));
      this.#toolbar.setDeleteAllGlyph("filter-clear");
    } else {
      this.#toolbar.setDeleteAllTitle(i18nString29(UIStrings29.clearAllCookies));
      this.#toolbar.setDeleteAllGlyph("clear-list");
    }
    this.cookiesTable.setCookies(this.shownCookies, this.model.getCookieToBlockedReasonsMap());
    UI22.ARIAUtils.LiveAnnouncer.alert(i18nString29(UIStrings29.numberOfCookiesShownInTableS, { PH1: this.shownCookies.length }));
    this.#toolbar.setCanFilter(true);
    this.#toolbar.setCanDeleteAll(this.shownCookies.length > 0);
    this.#toolbar.setCanDeleteSelected(Boolean(this.cookiesTable.selectedCookie()));
    if (!this.cookiesTable.selectedCookie()) {
      this.showPreview(null);
    }
  }
  filter(items, keyFunction) {
    const predicate = (object) => {
      if (!this.onlyIssuesFilterUI.checked()) {
        return true;
      }
      if (object instanceof SDK24.Cookie.Cookie) {
        return IssuesManager2.RelatedIssue.hasIssues(object);
      }
      return false;
    };
    return items.filter((item2) => this.#toolbar.filterRegex?.test(keyFunction(item2)) ?? true).filter(predicate);
  }
  /**
   * This will only delete the currently visible cookies.
   */
  deleteAllItems() {
    this.showPreview(null);
    void this.model.deleteCookies(this.shownCookies);
  }
  deleteSelectedItem() {
    const selectedCookie = this.cookiesTable.selectedCookie();
    if (selectedCookie) {
      this.showPreview(null);
      void this.model.deleteCookie(selectedCookie);
    }
  }
  onCookieListUpdate() {
    void this.model.getCookiesForDomain(this.cookieDomain).then(this.updateWithCookies.bind(this));
  }
  refreshItems() {
    void this.model.getCookiesForDomain(this.cookieDomain, true).then(this.updateWithCookies.bind(this));
  }
};

// gen/front_end/panels/application/DOMStorageItemsView.js
var DOMStorageItemsView_exports = {};
__export(DOMStorageItemsView_exports, {
  DOMStorageItemsView: () => DOMStorageItemsView
});
import * as Common18 from "./../../core/common/common.js";
import * as i18n59 from "./../../core/i18n/i18n.js";
import * as TextUtils2 from "./../../models/text_utils/text_utils.js";
import * as SourceFrame6 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI23 from "./../../ui/legacy/legacy.js";
import * as VisualLogging17 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings30 = {
  /**
   * @description Name for the "DOM Storage Items" table that shows the content of the DOM Storage.
   */
  domStorageItems: "DOM Storage Items",
  /**
   * @description Text for announcing that the "DOM Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  domStorageItemsCleared: "DOM Storage Items cleared",
  /**
   * @description Text for announcing a DOM Storage key/value item has been deleted
   */
  domStorageItemDeleted: "The storage item was deleted."
};
var str_30 = i18n59.i18n.registerUIStrings("panels/application/DOMStorageItemsView.ts", UIStrings30);
var i18nString30 = i18n59.i18n.getLocalizedString.bind(void 0, str_30);
var DOMStorageItemsView = class extends KeyValueStorageItemsView {
  domStorage;
  eventListeners;
  constructor(domStorage) {
    super(i18nString30(UIStrings30.domStorageItems), "dom-storage", true);
    this.domStorage = domStorage;
    if (domStorage.storageKey) {
      this.toolbar?.setStorageKey(domStorage.storageKey);
    }
    this.element.classList.add("storage-view", "table");
    this.showPreview(null, null);
    this.eventListeners = [];
    this.setStorage(domStorage);
  }
  createPreview(key, value) {
    const protocol = this.domStorage.isLocalStorage ? "localstorage" : "sessionstorage";
    const url = `${protocol}://${key}`;
    const provider = TextUtils2.StaticContentProvider.StaticContentProvider.fromString(url, Common18.ResourceType.resourceTypes.XHR, value);
    return SourceFrame6.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
  }
  setStorage(domStorage) {
    Common18.EventTarget.removeEventListeners(this.eventListeners);
    this.domStorage = domStorage;
    const storageKind = domStorage.isLocalStorage ? "local-storage-data" : "session-storage-data";
    this.element.setAttribute("jslog", `${VisualLogging17.pane().context(storageKind)}`);
    if (domStorage.storageKey) {
      this.toolbar?.setStorageKey(domStorage.storageKey);
    }
    this.eventListeners = [
      this.domStorage.addEventListener("DOMStorageItemsCleared", this.domStorageItemsCleared, this),
      this.domStorage.addEventListener("DOMStorageItemRemoved", this.domStorageItemRemoved, this),
      this.domStorage.addEventListener("DOMStorageItemAdded", this.domStorageItemAdded, this),
      this.domStorage.addEventListener("DOMStorageItemUpdated", this.domStorageItemUpdated, this)
    ];
    this.refreshItems();
  }
  domStorageItemsCleared() {
    if (!this.isShowing()) {
      return;
    }
    this.itemsCleared();
  }
  itemsCleared() {
    super.itemsCleared();
    UI23.ARIAUtils.LiveAnnouncer.alert(i18nString30(UIStrings30.domStorageItemsCleared));
  }
  domStorageItemRemoved(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemRemoved(event.data.key);
  }
  itemRemoved(key) {
    super.itemRemoved(key);
    UI23.ARIAUtils.LiveAnnouncer.alert(i18nString30(UIStrings30.domStorageItemDeleted));
  }
  domStorageItemAdded(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemAdded(event.data.key, event.data.value);
  }
  domStorageItemUpdated(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemUpdated(event.data.key, event.data.value);
  }
  refreshItems() {
    void this.#refreshItems();
  }
  async #refreshItems() {
    const items = await this.domStorage.getItems();
    if (!items || !this.toolbar) {
      return;
    }
    const { filterRegex } = this.toolbar;
    const filteredItems = items.map((item2) => ({ key: item2[0], value: item2[1] })).filter((item2) => filterRegex?.test(`${item2.key} ${item2.value}`) ?? true);
    this.showItems(filteredItems);
  }
  deleteAllItems() {
    this.domStorage.clear();
    this.domStorageItemsCleared();
  }
  removeItem(key) {
    this.domStorage?.removeItem(key);
  }
  setItem(key, value) {
    this.domStorage?.setItem(key, value);
  }
};

// gen/front_end/panels/application/ExtensionStorageItemsView.js
var ExtensionStorageItemsView_exports = {};
__export(ExtensionStorageItemsView_exports, {
  ExtensionStorageItemsView: () => ExtensionStorageItemsView
});
import * as Common19 from "./../../core/common/common.js";
import * as i18n61 from "./../../core/i18n/i18n.js";
import * as TextUtils3 from "./../../models/text_utils/text_utils.js";
import * as JSON5 from "./../../third_party/json5/json5.js";
import * as SourceFrame7 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI24 from "./../../ui/legacy/legacy.js";
import * as VisualLogging18 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings31 = {
  /**
   * @description Name for the "Extension Storage Items" table that shows the content of the extension Storage.
   */
  extensionStorageItems: "Extension Storage Items",
  /**
   * @description Text for announcing that the "Extension Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  extensionStorageItemsCleared: "Extension Storage Items cleared"
};
var str_31 = i18n61.i18n.registerUIStrings("panels/application/ExtensionStorageItemsView.ts", UIStrings31);
var i18nString31 = i18n61.i18n.getLocalizedString.bind(void 0, str_31);
var ExtensionStorageItemsView = class extends KeyValueStorageItemsView {
  #extensionStorage;
  extensionStorageItemsDispatcher;
  constructor(extensionStorage, view) {
    super(i18nString31(UIStrings31.extensionStorageItems), "extension-storage", true, view, void 0, { jslog: `${VisualLogging18.pane().context("extension-storage-data")}`, classes: ["storage-view", "table"] });
    this.extensionStorageItemsDispatcher = new Common19.ObjectWrapper.ObjectWrapper();
    this.setStorage(extensionStorage);
  }
  get #isEditable() {
    return this.#extensionStorage.storageArea !== "managed";
  }
  /**
   * When parsing a value provided by the user, attempt to treat it as JSON,
   * falling back to a string otherwise.
   */
  parseValue(input) {
    try {
      return JSON5.parse(input);
    } catch {
      return input;
    }
  }
  removeItem(key) {
    void this.#extensionStorage.removeItem(key).then(() => {
      this.refreshItems();
    });
  }
  setItem(key, value) {
    void this.#extensionStorage.setItem(key, this.parseValue(value)).then(() => {
      this.refreshItems();
      this.extensionStorageItemsDispatcher.dispatchEventToListeners(
        "ItemEdited"
        /* ExtensionStorageItemsDispatcher.Events.ITEM_EDITED */
      );
    });
  }
  createPreview(key, value) {
    const url = "extension-storage://" + this.#extensionStorage.extensionId + "/" + this.#extensionStorage.storageArea + "/preview/" + key;
    const provider = TextUtils3.StaticContentProvider.StaticContentProvider.fromString(url, Common19.ResourceType.resourceTypes.XHR, value);
    return SourceFrame7.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
  }
  setStorage(extensionStorage) {
    this.#extensionStorage = extensionStorage;
    this.editable = this.#isEditable;
    this.refreshItems();
  }
  #extensionStorageItemsCleared() {
    if (!this.isShowing()) {
      return;
    }
    this.itemsCleared();
    UI24.ARIAUtils.LiveAnnouncer.alert(i18nString31(UIStrings31.extensionStorageItemsCleared));
  }
  deleteSelectedItem() {
    if (!this.#isEditable) {
      return;
    }
    this.deleteSelectedItem();
  }
  refreshItems() {
    void this.#refreshItems();
  }
  async #refreshItems() {
    const items = await this.#extensionStorage.getItems();
    if (!items || !this.toolbar) {
      return;
    }
    const filteredItems = Object.entries(items).map(([key, value]) => ({ key, value: typeof value === "string" ? value : JSON.stringify(value) })).filter((item2) => this.toolbar?.filterRegex?.test(`${item2.key} ${item2.value}`) ?? true);
    this.showItems(filteredItems);
    this.extensionStorageItemsDispatcher.dispatchEventToListeners(
      "ItemsRefreshed"
      /* ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED */
    );
  }
  deleteAllItems() {
    if (!this.#isEditable) {
      return;
    }
    this.#extensionStorage.clear().then(() => {
      this.#extensionStorageItemsCleared();
    }, () => {
      throw new Error("Unable to clear storage.");
    });
  }
};

// gen/front_end/panels/application/ResourcesPanel.js
var ResourcesPanel_exports = {};
__export(ResourcesPanel_exports, {
  AttemptViewWithFilterRevealer: () => AttemptViewWithFilterRevealer,
  FrameDetailsRevealer: () => FrameDetailsRevealer,
  ResourceRevealer: () => ResourceRevealer,
  ResourcesPanel: () => ResourcesPanel,
  RuleSetViewRevealer: () => RuleSetViewRevealer
});
import "./../../ui/legacy/legacy.js";
import * as Common20 from "./../../core/common/common.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as SDK25 from "./../../core/sdk/sdk.js";
import * as SourceFrame8 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI25 from "./../../ui/legacy/legacy.js";
import * as VisualLogging19 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/resourcesPanel.css.js
var resourcesPanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.resources-toolbar {
  border-top: 1px solid var(--sys-color-divider);
  background-color: var(--sys-color-cdt-base-container);
}

.top-resources-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
  background-color: var(--sys-color-cdt-base-container);
}

.resources.panel .status {
  float: right;
  height: 16px;
  margin-top: 1px;
  margin-left: 4px;
  line-height: 1em;
}

.storage-view {
  display: flex;
  overflow: hidden;
}

.storage-view .data-grid:not(.inline) {
  border: none;
  flex: auto;
}

.storage-view .storage-table-error {
  color: var(--sys-color-error);
  font-size: 24px;
  font-weight: bold;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.storage-view.query {
  padding: 2px 0;
  overflow: hidden auto;
}

.storage-view .filter-bar {
  border-top: none;
  border-bottom: 1px solid var(--sys-color-divider);
}

.database-query-group-messages {
  overflow-y: auto;
}

.database-query-prompt-container {
  position: relative;
  padding: 1px 22px 1px 24px;
  min-height: 16px;
}

.database-query-prompt {
  white-space: pre-wrap;
}

.prompt-icon {
  position: absolute;
  display: block;
  left: 7px;
  top: 9px;
  margin-top: -7px;
  user-select: none;
}

.database-user-query .prompt-icon {
  margin-top: -10px;
}

.database-query-prompt-container .prompt-icon {
  top: 6px;
}

.database-user-query {
  position: relative;
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 1px 22px 1px 24px;
  min-height: 16px;
  flex-shrink: 0;
}

.database-user-query:focus-visible {
  background-color: var(--sys-color-state-focus-highlight);
}

.database-query-text {
  color: var(--sys-color-primary-bright);
  user-select: text;
}

.database-query-result {
  position: relative;
  padding: 1px 22px;
  min-height: 16px;
  margin-left: -22px;
  padding-right: 0;
}

.database-query-result.error {
  color: var(--sys-color-token-property-special);
  user-select: text;
}

.database-query-result.error .prompt-icon {
  margin-top: -9px;
}

.resources-sidebar {
  padding: 0;
  overflow-x: auto;
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./resourcesPanel.css")} */`;

// gen/front_end/panels/application/ResourcesPanel.js
var resourcesPanelInstance;
var ResourcesPanel = class _ResourcesPanel extends UI25.Panel.PanelWithSidebar {
  resourcesLastSelectedItemSetting;
  visibleView;
  pendingViewPromise;
  categoryView;
  storageViews;
  storageViewToolbar;
  domStorageView;
  extensionStorageView;
  cookieView;
  sidebar;
  constructor() {
    super("resources");
    this.registerRequiredCSS(resourcesPanel_css_default);
    this.resourcesLastSelectedItemSetting = Common20.Settings.Settings.instance().createSetting("resources-last-selected-element-path", []);
    this.visibleView = null;
    this.pendingViewPromise = null;
    this.categoryView = null;
    const mainContainer = new UI25.Widget.VBox();
    mainContainer.setMinimumSize(100, 0);
    this.storageViews = mainContainer.element.createChild("div", "vbox flex-auto");
    this.storageViewToolbar = mainContainer.element.createChild("devtools-toolbar", "resources-toolbar");
    this.splitWidget().setMainWidget(mainContainer);
    this.domStorageView = null;
    this.extensionStorageView = null;
    this.cookieView = null;
    this.sidebar = new ApplicationPanelSidebar(this);
    this.sidebar.show(this.panelSidebarElement());
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!resourcesPanelInstance || forceNew) {
      resourcesPanelInstance = new _ResourcesPanel();
    }
    return resourcesPanelInstance;
  }
  static shouldCloseOnReset(view) {
    const viewClassesToClose = [
      SourceFrame8.ResourceSourceFrame.ResourceSourceFrame,
      SourceFrame8.ImageView.ImageView,
      SourceFrame8.FontView.FontView,
      StorageItemsToolbar
    ];
    return viewClassesToClose.some((type) => view instanceof type);
  }
  static async showAndGetSidebar() {
    await UI25.ViewManager.ViewManager.instance().showView("resources");
    return _ResourcesPanel.instance().sidebar;
  }
  focus() {
    this.sidebar.focus();
  }
  lastSelectedItemPath() {
    return this.resourcesLastSelectedItemSetting.get();
  }
  setLastSelectedItemPath(path) {
    this.resourcesLastSelectedItemSetting.set(path);
  }
  resetView() {
    if (this.visibleView && _ResourcesPanel.shouldCloseOnReset(this.visibleView)) {
      this.showView(null);
    }
  }
  showView(view) {
    this.pendingViewPromise = null;
    if (this.visibleView === view) {
      return;
    }
    if (this.visibleView) {
      this.visibleView.detach();
    }
    if (view) {
      view.show(this.storageViews);
    }
    this.visibleView = view;
    this.storageViewToolbar.removeToolbarItems();
    this.storageViewToolbar.classList.toggle("hidden", true);
    if (view instanceof UI25.View.SimpleView) {
      void view.toolbarItems().then((items) => {
        items.map((item2) => this.storageViewToolbar.appendToolbarItem(item2));
        this.storageViewToolbar.classList.toggle("hidden", !items.length);
      });
    }
  }
  async scheduleShowView(viewPromise) {
    this.pendingViewPromise = viewPromise;
    const view = await viewPromise;
    if (this.pendingViewPromise !== viewPromise) {
      return null;
    }
    this.showView(view);
    return view;
  }
  showCategoryView(categoryName, categoryHeadline, categoryDescription, categoryLink) {
    if (!this.categoryView) {
      this.categoryView = new StorageCategoryView();
    }
    this.categoryView.element.setAttribute("jslog", `${VisualLogging19.pane().context(Platform9.StringUtilities.toKebabCase(categoryName))}`);
    this.categoryView.setHeadline(categoryHeadline);
    this.categoryView.setText(categoryDescription);
    this.categoryView.setLink(categoryLink);
    this.showView(this.categoryView);
  }
  showDOMStorage(domStorage) {
    if (!domStorage) {
      return;
    }
    if (!this.domStorageView) {
      this.domStorageView = new DOMStorageItemsView(domStorage);
    } else {
      this.domStorageView.setStorage(domStorage);
    }
    this.showView(this.domStorageView);
  }
  showExtensionStorage(extensionStorage) {
    if (!extensionStorage) {
      return;
    }
    if (!this.extensionStorageView) {
      this.extensionStorageView = new ExtensionStorageItemsView(extensionStorage);
    } else {
      this.extensionStorageView.setStorage(extensionStorage);
    }
    this.showView(this.extensionStorageView);
  }
  showCookies(cookieFrameTarget, cookieDomain) {
    const model = cookieFrameTarget.model(SDK25.CookieModel.CookieModel);
    if (!model) {
      return;
    }
    if (!this.cookieView) {
      this.cookieView = new CookieItemsView(model, cookieDomain);
    } else {
      this.cookieView.setCookiesDomain(model, cookieDomain);
    }
    this.showView(this.cookieView);
  }
  clearCookies(target, cookieDomain) {
    const model = target.model(SDK25.CookieModel.CookieModel);
    if (!model) {
      return;
    }
    void model.clear(cookieDomain).then(() => {
      if (this.cookieView) {
        this.cookieView.refreshItems();
      }
    });
  }
};
var ResourceRevealer = class {
  async reveal(resource) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    await sidebar.showResource(resource);
  }
};
var FrameDetailsRevealer = class {
  async reveal(frame) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showFrame(frame);
  }
};
var RuleSetViewRevealer = class {
  async reveal(revealInfo) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showPreloadingRuleSetView(revealInfo);
  }
};
var AttemptViewWithFilterRevealer = class {
  async reveal(filter) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showPreloadingAttemptViewWithFilter(filter);
  }
};
export {
  AppManifestView_exports as AppManifestView,
  ApplicationPanelSidebar_exports as ApplicationPanelSidebar,
  BackgroundServiceModel_exports as BackgroundServiceModel,
  BackgroundServiceView_exports as BackgroundServiceView,
  BounceTrackingMitigationsTreeElement_exports as BounceTrackingMitigationsTreeElement,
  CookieItemsView_exports as CookieItemsView,
  DOMStorageItemsView_exports as DOMStorageItemsView,
  DOMStorageModel_exports as DOMStorageModel,
  ExtensionStorageItemsView_exports as ExtensionStorageItemsView,
  ExtensionStorageModel_exports as ExtensionStorageModel,
  FrameDetailsView_exports as FrameDetailsView,
  IndexedDBModel_exports as IndexedDBModel,
  IndexedDBViews_exports as IndexedDBViews,
  InterestGroupStorageModel_exports as InterestGroupStorageModel,
  InterestGroupStorageView_exports as InterestGroupStorageView,
  InterestGroupTreeElement_exports as InterestGroupTreeElement,
  KeyValueStorageItemsView_exports as KeyValueStorageItemsView,
  OpenedWindowDetailsView_exports as OpenedWindowDetailsView,
  OriginTrialTreeView_exports as OriginTrialTreeView,
  PreloadingTreeElement_exports as PreloadingTreeElement,
  PreloadingView_exports as PreloadingView,
  ReportingApiView_exports as ReportingApiView,
  ResourcesPanel_exports as ResourcesPanel,
  ServiceWorkerCacheViews_exports as ServiceWorkerCacheViews,
  ServiceWorkerUpdateCycleView_exports as ServiceWorkerUpdateCycleView,
  ServiceWorkersView_exports as ServiceWorkersView,
  SharedStorageEventsView_exports as SharedStorageEventsView,
  SharedStorageItemsView_exports as SharedStorageItemsView,
  SharedStorageListTreeElement_exports as SharedStorageListTreeElement,
  SharedStorageModel_exports as SharedStorageModel,
  SharedStorageTreeElement_exports as SharedStorageTreeElement,
  StorageBucketsTreeElement_exports as StorageBucketsTreeElement,
  StorageItemsToolbar_exports as StorageItemsToolbar,
  StorageView_exports as StorageView,
  TrustTokensTreeElement_exports as TrustTokensTreeElement
};
//# sourceMappingURL=application.js.map
