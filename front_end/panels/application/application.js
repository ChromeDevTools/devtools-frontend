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
  ResourcesSection: () => ResourcesSection,
  ServiceWorkersTreeElement: () => ServiceWorkersTreeElement,
  StorageCategoryView: () => StorageCategoryView,
  StorageTreeElement: () => StorageTreeElement
});
import * as Common18 from "./../../core/common/common.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n59 from "./../../core/i18n/i18n.js";
import * as Platform11 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK25 from "./../../core/sdk/sdk.js";
import * as AiAssistance2 from "./../../models/ai_assistance/ai_assistance.js";
import * as LegacyWrapper3 from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import { createIcon as createIcon11 } from "./../../ui/kit/kit.js";
import * as SourceFrame6 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI31 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/application/ApplicationPanelTreeElement.js
var ApplicationPanelTreeElement_exports = {};
__export(ApplicationPanelTreeElement_exports, {
  ApplicationPanelTreeElement: () => ApplicationPanelTreeElement,
  ExpandableApplicationPanelTreeElement: () => ExpandableApplicationPanelTreeElement
});
import "./../../ui/components/buttons/buttons.js";
import * as Common from "./../../core/common/common.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as AiAssistance from "./../../models/ai_assistance/ai_assistance.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";
var { html } = Lit;
var ApplicationPanelTreeElement = class _ApplicationPanelTreeElement extends UI.TreeOutline.TreeElement {
  resourcesPanel;
  customItemURL;
  aiButtonContainer;
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
    if (this.customItemURL) {
      return this.customItemURL;
    }
    throw new Error("Unimplemented Method");
  }
  set itemURL(value) {
    this.customItemURL = value;
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
  /**
   * Creates the Ask-AI floating button on this tree element.
   * @param storageItemProvider A provider function returning the StorageItem context.
   * Using a function provider allows dynamic context resolution at click time
   * (e.g. for category headers that aren't recreated (e.g. Local Storage) whose target origin may change), while supporting
   * static contexts for individual leaf items under these general category headers.
   */
  createAiButton(storageItemProvider) {
    const STORAGE_FLOATING_BUTTON_ACTION_ID2 = "ai-assistance.storage-floating-button";
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
    if (!actionRegistry.hasAction(STORAGE_FLOATING_BUTTON_ACTION_ID2)) {
      return;
    }
    const action6 = actionRegistry.getAction(STORAGE_FLOATING_BUTTON_ACTION_ID2);
    if (!this.aiButtonContainer) {
      this.aiButtonContainer = this.listItemElement.createChild("span", "ai-button-container");
      const icon = AiAssistance.AiUtils.getIconName();
      const onClick = (ev) => {
        ev.stopPropagation();
        const item2 = storageItemProvider();
        if (item2) {
          UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, item2);
          void action6.execute();
        }
      };
      Lit.render(html`
            <devtools-floating-button
              icon-name=${icon}
              title=${action6.title()}
              jslogcontext="ask-ai"
              @click=${onClick}
              @mousedown=${(ev) => ev.stopPropagation()}>
            </devtools-floating-button>
          `, this.aiButtonContainer);
    }
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
  settingsKey;
  constructor(resourcesPanel, categoryName, emptyCategoryHeadline, categoryDescription, settingsKey, settingsDefault = false) {
    super(resourcesPanel, categoryName, false, settingsKey);
    this.settingsKey = settingsKey;
    this.expandedSetting = Common.Settings.Settings.instance().createSetting("resources-" + settingsKey + "-expanded", settingsDefault);
    this.categoryName = categoryName;
    this.categoryLink = null;
    this.emptyCategoryHeadline = emptyCategoryHeadline;
    this.categoryDescription = categoryDescription;
  }
  createGenericStorageAiContext() {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainPageOrigin = target?.inspectedURL() ? Common.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL()) : "";
    if (!mainPageOrigin) {
      return null;
    }
    if (this.settingsKey === "cookies") {
      return AiAssistance.StorageItem.CookieItem.createGenericContext(mainPageOrigin);
    }
    if (this.settingsKey === "local-storage") {
      return AiAssistance.StorageItem.DOMStorageItem.createGenericContext(mainPageOrigin, "localStorage");
    }
    if (this.settingsKey === "session-storage") {
      return AiAssistance.StorageItem.DOMStorageItem.createGenericContext(mainPageOrigin, "sessionStorage");
    }
    return null;
  }
  get itemURL() {
    return "category://" + this.categoryName;
  }
  set itemURL(value) {
    super.itemURL = value;
  }
  setLink(link2) {
    this.categoryLink = link2;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.updateCategoryView();
    const item2 = this.createGenericStorageAiContext();
    UI.Context.Context.instance().setFlavor(AiAssistance.StorageItem.StorageItem, item2);
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
    if (this.createGenericStorageAiContext()) {
      this.createAiButton(() => this.createGenericStorageAiContext());
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
import "./../../ui/legacy/components/inline_editor/inline_editor.js";
import "./../../ui/components/report_view/report_view.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives, html as html2, i18nTemplate, nothing, render as render2 } from "./../../ui/lit/lit.js";
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

:host {
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

devtools-report .report-row {
  margin: var(--sys-size-3) 0 var(--sys-size-3) var(--sys-size-9);
  grid-column: 1 / 3;

  > devtools-checkbox:first-child {
    margin-left: calc(var(--sys-size-4) * -1);
  }

  > devtools-icon:first-child {
    /* We have inline icons that would otherwise be mis-aligned */
    margin-inline-start: 0;
  }
}

devtools-report .report-section {
  display: grid;
  grid-column: 1 / 3;
  grid-template-columns: subgrid;
  padding-bottom: var(--sys-size-5);
  border-bottom: 1px solid var(--sys-color-divider);
  margin-bottom: var(--sys-size-5);
}

.image-wrapper,
.image-wrapper img {
  max-width: 200px;
  max-height: 200px;
  display: block;
  object-fit: contain;
}

.image-wrapper {
  display: inline-block;
  height: fit-content;
  margin-right: 8px;
}

.show-mask img {
  /* The safe zone is a centrally positioned circle, with radius 2/5
  * (40%) of the minimum of the icon's width and height.
  * https://w3c.github.io/manifest/#icon-masks */
  clip-path: circle(40% at 50% 50%);
}

.show-mask .image-wrapper {
  background: var(--image-file-checker);
}

/*# sourceURL=${import.meta.resolve("./appManifestView.css")} */`;

// gen/front_end/panels/application/AppManifestView.js
import * as ApplicationComponents from "./components/components.js";
var { styleMap, classMap, ref } = Directives;
var { linkifyURL } = Components.Linkifier.Linkifier;
var { widget } = UI2.Widget;
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
  sSWidthDoesNotComplyWithRatioRequirement: "{PH1} {PH2} width can\u2019t be more than 2.3 times as long as the height",
  /**
   * @description Warning message for image resources from the manifest
   * @example {Image} PH1
   * @example {https://example.com/image.png} PH2
   */
  sSHeightDoesNotComplyWithRatioRequirement: "{PH1} {PH2} height can\u2019t be more than 2.3 times as long as the width",
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
  wcoNotFound: "Define {PH1} in the manifest to use the Window Controls Overlay API and customize your app\u2019s title bar.",
  /**
   * @description Link text for more information on customizing Window Controls Overlay title bar in the Application panel
   */
  customizePwaTitleBar: "Customize the window controls overlay of your PWA\u2019s title bar",
  /**
   * @description Text wrapping link to documentation on how to customize WCO title bar
   * @example {https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay} PH1
   */
  wcoNeedHelpReadMore: "Need help? Read {PH1}.",
  /**
   * @description Text for emulation OS selection dropdown
   */
  selectWindowControlsOverlayEmulationOs: "Emulate the Window Controls Overlay on",
  /**
   * @description Alert message for screen reader to announce which subsection is being scrolled to
   * @example {"Identity"} PH1
   */
  onInvokeAlert: "Scrolled to {PH1}"
};
var str_ = i18n.i18n.registerUIStrings("panels/application/AppManifestView.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function renderSectionHeader(text, output) {
  return html2`
    <devtools-report-section-header
        ${ref((e) => {
    if (output && e instanceof HTMLElement) {
      output.scrollToSection.set(text, () => {
        e.scrollIntoView();
      });
    }
  })}>
      ${text}
    </devtools-report-section-header>`;
}
function renderErrors(warnings, manifestErrors, imageErrors, output) {
  return html2`
    ${renderSectionHeader(i18nString(UIStrings.errorsAndWarnings), output)}
    <div class="report-section" jslog=${VisualLogging.section("errors-and-warnings")}>
      ${manifestErrors?.map((error) => html2`<div class="report-row">
          <devtools-icon
          name=${error.critical ? "cross-circle-filled" : "warning-filled"}
          style=${styleMap({ color: error.critical ? "var(--icon-error)" : "var(--icon-warning)" })}>
        </devtools-icon>
        ${error.message}</div>
      `)}
      ${warnings?.map((warning) => html2`<div class="report-row">${warning}</div>`)}
      ${imageErrors?.map((error) => html2`<div class="report-row">${error}</div>`)}
    </div>`;
}
function renderIdentity(identityData, onCopy, output) {
  const { name, shortName, description, appId, recommendedId, hasId } = identityData;
  return html2`${renderSectionHeader(i18nString(UIStrings.identity), output)}
  <div class="report-section" jslog=${VisualLogging.section("identity")}>
    <devtools-report-key>${i18nString(UIStrings.name)}</devtools-report-key>
    <devtools-report-value>${name}</devtools-report-value>
    <devtools-report-key>${i18nString(UIStrings.shortName)}</devtools-report-key>
    <devtools-report-value>${shortName}</devtools-report-value>
    <devtools-report-key>${i18nString(UIStrings.description)}</devtools-report-key>
    <devtools-report-value>${description}</devtools-report-value>
    ${appId && recommendedId ? html2`
      <devtools-report-key aria-label="App Id">${i18nString(UIStrings.computedAppId)}</devtools-report-key>
      <devtools-report-value jslog=${VisualLogging.section("identity")}>
        ${appId}
        <devtools-icon class="inline-icon" name="help" title=${i18nString(UIStrings.appIdExplainer)}
            jslog=${VisualLogging.action("help").track({ hover: true })}>
        </devtools-icon>
        <devtools-link href="https://developer.chrome.com/blog/pwa-manifest-id/"
                      jslogcontext="learn-more"
                      ${ref(setFocusOnSection(i18nString(UIStrings.identity), output))}>
          ${i18nString(UIStrings.learnMore)}
        </devtools-link>
        ${!hasId ? html2`
          <div class="multiline-value">
            ${i18nTemplate(str_, UIStrings.appIdNote, {
    PH1: html2`<code>${recommendedId}</code>`,
    PH2: html2`<devtools-button class="inline-button" @click=${onCopy}
                          .iconName=${"copy"}
                          .variant=${"icon"}
                          .size=${"SMALL"}
                          .jslogContext=${"manifest.copy-id"}
                          .title=${i18nString(UIStrings.copyToClipboard)}>
                        </devtools-button>`
  })}
        </div>` : nothing}
      </devtools-report-value>` : nothing}
    </div>`;
}
function renderPresentation(presentationData, output) {
  const { startUrl, completeStartUrl, themeColor, backgroundColor, orientation, display, newNoteUrl, hasNewNoteUrl, completeNewNoteUrl } = presentationData;
  return html2`${renderSectionHeader(i18nString(UIStrings.presentation), output)}
    <div class="report-section" jslog=${VisualLogging.section("presentation")}>
      <devtools-report-key>${i18nString(UIStrings.startUrl)}</devtools-report-key>
      <devtools-report-value>
      ${completeStartUrl ? (() => {
    const link2 = linkifyURL(completeStartUrl, { text: startUrl, tabStop: true, jslogContext: "start-url" });
    output.focusOnSection.set(i18nString(UIStrings.presentation), () => link2.focus());
    return link2;
  })() : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.themeColor)}</devtools-report-key>
      <devtools-report-value>${themeColor ? html2`<devtools-color-swatch .color=${themeColor}></devtools-color-swatch>` : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.backgroundColor)}</devtools-report-key>
      <devtools-report-value>${backgroundColor ? html2`<devtools-color-swatch .color=${backgroundColor}></devtools-color-swatch>` : nothing}
      </devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.orientation)}</devtools-report-key>
      <devtools-report-value>${orientation}</devtools-report-value>
      <devtools-report-key>${i18nString(UIStrings.display)}</devtools-report-key>
      <devtools-report-value>${display}</devtools-report-value>
      ${completeNewNoteUrl ? html2`
        <devtools-report-key>${i18nString(UIStrings.newNoteUrl)}</devtools-report-key>
        <devtools-report-value>${hasNewNoteUrl ? linkifyURL(completeNewNoteUrl, { text: newNoteUrl, tabStop: true }) : nothing}
        </devtools-report-value>
      ` : nothing}
    </div>
  `;
}
function renderProtocolHandlers(data, output) {
  return html2`${renderSectionHeader(i18nString(UIStrings.protocolHandlers), output)}
    <div class="report-row">
      <devtools-widget ${widget(ApplicationComponents.ProtocolHandlersView.ProtocolHandlersView, { protocolHandlers: data.protocolHandlers, manifestLink: data.manifestLink })}
        ${ref(setFocusOnSection(i18nString(UIStrings.protocolHandlers), output))}>
      </devtools-widget>
    </div>
    <devtools-report-divider></devtools-report-divider>`;
}
function renderImage(imageSrc, imageUrl, naturalWidth) {
  return html2`
    <div class="image-wrapper">
      <img src=${imageSrc} alt=${i18nString(UIStrings.imageFromS, { PH1: imageUrl })}
          width=${naturalWidth}>
    </div>`;
}
function setFocusOnSection(section8, output) {
  return (e) => {
    if (e instanceof HTMLElement) {
      output.focusOnSection.set(section8, () => e.focus());
    }
  };
}
function renderIcons(data, maskedIcons, onToggleIconMasked, output) {
  return html2`${renderSectionHeader(i18nString(UIStrings.icons), output)}
    <div class="report-section" jslog=${VisualLogging.section("icons")}>
      <div class="report-row">
        <devtools-checkbox class="mask-checkbox"
            jslog=${VisualLogging.toggle("show-minimal-safe-area-for-maskable-icons").track({ change: true })}
            @click=${(event) => onToggleIconMasked(event.target.checked)}
            ${ref(setFocusOnSection(i18nString(UIStrings.icons), output))}>
          ${i18nString(UIStrings.showOnlyTheMinimumSafeAreaFor)}
        </devtools-checkbox>
      </div>
      <div class="report-row">
        ${i18nTemplate(str_, UIStrings.needHelpReadOurS, {
    PH1: html2`
            <devtools-link href="https://web.dev/maskable-icon/" jslogcontext="learn-more">
              ${i18nString(UIStrings.documentationOnMaskableIcons)}
            </devtools-link>`
  })}
      </div>
      ${Array.from(data.icons).map(([title, images]) => {
    return html2`
        <devtools-report-key>${title}</devtools-report-key>
        <devtools-report-value class=${classMap({ "show-mask": Boolean(maskedIcons) })}>
          ${images.filter((icon) => "imageSrc" in icon).map((icon) => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth))}
        </devtools-report-value>
      `;
  })}
    </div>`;
}
function renderShortcuts(data) {
  return html2`${data.shortcuts.map((shortcut, index) => html2`
    ${renderSectionHeader(i18nString(UIStrings.shortcutS, { PH1: index + 1 }))}
    <div class="report-section" jslog=${VisualLogging.section("shortcuts")}>
      <devtools-report-key>${i18nString(UIStrings.name)}</devtools-report-key>
      <devtools-report-value>${shortcut.name}</devtools-report-value>
      ${shortcut.shortName ? html2`
        <devtools-report-key>${i18nString(UIStrings.shortName)}</devtools-report-key>
        <devtools-report-value>${shortcut.shortName}</devtools-report-value>
      ` : nothing}
      ${shortcut.description ? html2`
        <devtools-report-key>${i18nString(UIStrings.description)}</devtools-report-key>
        <devtools-report-value>${shortcut.description}</devtools-report-value>
      ` : nothing}
      <devtools-report-key>${i18nString(UIStrings.url)}</devtools-report-key>
      <devtools-report-value>
        ${linkifyURL(shortcut.shortcutUrl, { text: shortcut.url, tabStop: true, jslogContext: "shortcut" })}
      </devtools-report-value>
      ${Array.from(shortcut.icons).map(([title, images]) => html2`
        <devtools-report-key>${title}</devtools-report-key>
        <devtools-report-value>
          ${images.filter((icon) => "imageSrc" in icon).map((icon) => renderImage(icon.imageSrc, icon.imageUrl, icon.naturalWidth))}
        </devtools-report-value>
      `)}
    </div>`)}`;
}
function renderScreenshots(data) {
  return html2`${data.screenshots.map(({ screenshot, processedImage }, index) => html2`
    ${renderSectionHeader(i18nString(UIStrings.screenshotS, { PH1: index + 1 }))}
    <div class="report-section" jslog=${VisualLogging.section("screenshots")}>
      ${screenshot.form_factor ? html2`<devtools-report-key>${i18nString(UIStrings.formFactor)}</devtools-report-key>
          <devtools-report-value>${screenshot.form_factor}</devtools-report-value>` : nothing}
      ${screenshot.label ? html2`<devtools-report-key>${i18nString(UIStrings.label)}</devtools-report-key>
          <devtools-report-value>${screenshot.label}</devtools-report-value>` : nothing}
      ${screenshot.platform ? html2`<devtools-report-key>${i18nString(UIStrings.platform)}</devtools-report-key>
          <devtools-report-value>${screenshot.platform}</devtools-report-value>` : nothing}
      ${"imageSrc" in processedImage ? html2`
        <devtools-report-key>${processedImage.title}</devtools-report-key>
        <devtools-report-value>
          ${renderImage(processedImage.imageSrc, processedImage.imageUrl, processedImage.naturalWidth)}
        </devtools-report-value>` : nothing}
    </div>
  `)}`;
}
function renderInstallability(installabilityErrors) {
  return html2`${renderSectionHeader(i18nString(UIStrings.installability))}
    ${getInstallabilityErrorMessages(installabilityErrors).map((content) => html2`
      <div class="report-row">
        ${content}
      </div>
    `)}`;
}
function renderWindowControlsSection(data, selectedPlatform, onSelectOs, onToggleWcoToolbar, output) {
  return html2`
    ${renderSectionHeader(i18nString(UIStrings.windowControlsOverlay), output)}
    <div class="report-section" jslog=${VisualLogging.section("window-controls-overlay")}>
      ${data?.hasWco && output ? html2`
        <div class="report-row">
          <devtools-icon class="inline-icon" name="check-circle"></devtools-icon>
          ${i18nTemplate(str_, UIStrings.wcoFound, {
    PH1: html2`<code class="wco">window-controls-overlay</code>`,
    PH2: html2`<code>
              <devtools-link
                href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                jslogcontext="display-override"
                ${ref(setFocusOnSection(i18nString(UIStrings.windowControlsOverlay), output))}>
                display-override
              </devtools-link>
            </code>`,
    PH3: html2`${Components.Linkifier.Linkifier.linkifyURL(data.url)}`
  })}
        </div>
        ${selectedPlatform && onSelectOs && onToggleWcoToolbar ? renderWindowControls(selectedPlatform, onSelectOs, onToggleWcoToolbar) : nothing}` : html2`
          <div class="report-row">
            <devtools-icon class="inline-icon" name="info"></devtools-icon>
            ${i18nTemplate(str_, UIStrings.wcoNotFound, { PH1: html2`<code>
                <devtools-link
                    href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override"
                    jslogcontext="display-override"
                    ${ref(setFocusOnSection(i18nString(UIStrings.windowControlsOverlay), output))}>
                  display-override
                </devtools-link>
              </code>` })}
          </div>`}
        <div class="report-row">
          ${i18nTemplate(str_, UIStrings.wcoNeedHelpReadMore, { PH1: html2`<devtools-link
              href="https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay"
              jslogcontext="customize-pwa-tittle-bar">
            ${i18nString(UIStrings.customizePwaTitleBar)}
          </devtools-link>` })}
        </div>
    </div>`;
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
  return html2`<div class="report-row">
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
      </select>
    </div>`;
}
var DEFAULT_VIEW = (input, output, target) => {
  const { isEmpty, identityData, presentationData, protocolHandlersData, iconsData, shortcutsData, screenshotsData, installabilityErrors, warnings, errors, imageErrors, maskedIcons, windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar, onToggleIconMasked, onCopyId, url } = input;
  render2(html2`
    <style>${appManifestView_css_default}</style>
    <style>${UI2.inspectorCommonStyles}</style>
    ${isEmpty ? widget(UI2.EmptyWidget.EmptyWidget, {
    header: i18nString(UIStrings.noManifestDetected),
    text: i18nString(UIStrings.manifestDescription),
    link: "https://web.dev/add-manifest/"
  }) : html2`
    <devtools-report .data=${{ reportTitle: i18nString(UIStrings.appManifest), reportUrl: url }}>
      ${renderErrors(warnings, errors, imageErrors, output)}
      ${installabilityErrors?.length ? renderInstallability(installabilityErrors) : nothing}
      ${identityData && onCopyId ? renderIdentity(identityData, onCopyId, output) : nothing}
      ${presentationData ? renderPresentation(presentationData, output) : nothing}
      ${protocolHandlersData ? renderProtocolHandlers(protocolHandlersData, output) : nothing}
      ${iconsData && onToggleIconMasked ? renderIcons(iconsData, Boolean(maskedIcons), onToggleIconMasked, output) : nothing}
      ${windowControlsData && output ? renderWindowControlsSection(windowControlsData, selectedPlatform, onSelectOs, onToggleWcoToolbar, output) : nothing}
      ${shortcutsData ? renderShortcuts(shortcutsData) : nothing}
      ${screenshotsData ? renderScreenshots(screenshotsData) : nothing}
    </devtools-report>`}`, target);
};
var AppManifestView = class extends Common2.ObjectWrapper.eventMixin(UI2.Widget.VBox) {
  registeredListeners;
  target;
  resourceTreeModel;
  serviceWorkerManager;
  overlayModel;
  manifestUrl;
  manifestData;
  manifestErrors;
  installabilityErrors;
  appIdResponse;
  wcoToolbarEnabled = false;
  maskedIcons = false;
  view;
  output = { scrollToSection: /* @__PURE__ */ new Map(), focusOnSection: /* @__PURE__ */ new Map() };
  constructor(view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.pane("manifest")}`,
      useShadowDom: true
    });
    this.view = view;
    SDK2.TargetManager.TargetManager.instance().observeTargets(this);
    this.registeredListeners = [];
    this.manifestUrl = Platform.DevToolsPath.EmptyUrlString;
    this.manifestData = null;
    this.manifestErrors = [];
    this.installabilityErrors = [];
    this.appIdResponse = null;
  }
  scrollToSection(sectionTitle) {
    const handler = this.output.scrollToSection.get(sectionTitle);
    if (!handler) {
      return;
    }
    handler();
    UI2.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.onInvokeAlert, { PH1: sectionTitle }));
  }
  focusOnSection(sectionTitle) {
    const handler = this.output.focusOnSection.get(sectionTitle);
    if (!handler) {
      return false;
    }
    handler();
    return true;
  }
  getStaticSections() {
    return [
      { title: i18nString(UIStrings.identity), jslogContext: "identity" },
      { title: i18nString(UIStrings.presentation), jslogContext: "presentation" },
      { title: i18nString(UIStrings.protocolHandlers), jslogContext: "protocol-handlers" },
      { title: i18nString(UIStrings.icons), jslogContext: "icons" },
      { title: i18nString(UIStrings.windowControlsOverlay), jslogContext: "window-controls" }
    ];
  }
  getManifestElement() {
    return this.contentElement;
  }
  targetAdded(target) {
    if (target !== SDK2.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.target = target;
    this.resourceTreeModel = target.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    this.serviceWorkerManager = target.model(SDK2.ServiceWorkerManager.ServiceWorkerManager);
    this.overlayModel = target.model(SDK2.OverlayModel.OverlayModel);
    if (!this.resourceTreeModel || !this.serviceWorkerManager || !this.overlayModel) {
      return;
    }
    void this.updateManifest(true);
    this.registeredListeners = [
      this.resourceTreeModel.addEventListener(SDK2.ResourceTreeModel.Events.DOMContentLoaded, () => {
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
      this.view({ isEmpty: true }, this.output, this.contentElement);
      this.dispatchEventToListeners("ManifestDetected", false);
      return;
    }
    this.dispatchEventToListeners("ManifestDetected", true);
    if (!data) {
      this.view({ url, errors }, this.output, this.contentElement);
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
    const onCopyId = recommendedId ? () => {
      UI2.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.copiedToClipboard, { PH1: recommendedId }));
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(recommendedId);
    } : void 0;
    const onToggleIconMasked = (masked) => {
      this.maskedIcons = masked;
      this.requestUpdate();
    };
    this.view({
      maskedIcons: this.maskedIcons,
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
      onToggleWcoToolbar,
      onCopyId,
      onToggleIconMasked
    }, this.output, this.contentElement);
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
    let content;
    try {
      const response = await SDK2.PageResourceLoader.PageResourceLoader.instance().loadResource(
        url,
        {
          target: this.target,
          frameId,
          initiatorUrl: this.target.inspectedURL()
        },
        /* isBinary=*/
        true
      );
      content = response.content;
    } catch {
      return null;
    }
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
import * as i18n3 from "./../../core/i18n/i18n.js";
import { createIcon } from "./../../ui/kit/kit.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
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
    UI3.UIUserMetrics.UIUserMetrics.instance().panelShown("back-forward-cache");
    return false;
  }
};

// gen/front_end/panels/application/BackgroundServiceModel.js
var BackgroundServiceModel_exports = {};
__export(BackgroundServiceModel_exports, {
  BackgroundServiceModel: () => BackgroundServiceModel,
  Events: () => Events
});
import * as SDK3 from "./../../core/sdk/sdk.js";
var BackgroundServiceModel = class extends SDK3.SDKModel.SDKModel {
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
SDK3.SDKModel.SDKModel.register(BackgroundServiceModel, { capabilities: 1, autostart: false });
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
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Workspace from "./../../models/workspace/workspace.js";
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
import * as UI4 from "./../../ui/legacy/legacy.js";
import { html as html3, render as render3 } from "./../../ui/lit/lit.js";
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
var BackgroundServiceView = class _BackgroundServiceView extends UI4.Widget.VBox {
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
  #isRecording = false;
  #selectedEventNode = null;
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
    this.serviceWorkerManager = this.model.target().model(SDK4.ServiceWorkerManager.ServiceWorkerManager);
    this.securityOriginManager = this.model.target().model(SDK4.SecurityOriginManager.SecurityOriginManager);
    if (!this.securityOriginManager) {
      throw new Error("SecurityOriginManager instance is missing");
    }
    this.securityOriginManager.addEventListener(SDK4.SecurityOriginManager.Events.MainSecurityOriginChanged, () => this.onOriginChanged());
    this.storageKeyManager = this.model.target().model(SDK4.StorageKeyManager.StorageKeyManager);
    if (!this.storageKeyManager) {
      throw new Error("StorageKeyManager instance is missing");
    }
    this.storageKeyManager.addEventListener("MainStorageKeyChanged", () => this.onStorageKeyChanged());
    this.recordAction = UI4.ActionRegistry.ActionRegistry.instance().getAction("background-service.toggle-recording");
    this.toolbar = this.contentElement.createChild("devtools-toolbar", "background-service-toolbar");
    this.toolbar.setAttribute("jslog", `${VisualLogging2.toolbar()}`);
    this.setupToolbar();
    this.splitWidget = new UI4.SplitWidget.SplitWidget(
      /* isVertical= */
      false,
      /* secondIsSidebar= */
      true
    );
    this.splitWidget.show(this.contentElement);
    this.dataGrid = this.createDataGrid();
    this.previewPanel = new UI4.Widget.VBox();
    this.previewPanel.element.setAttribute("jslog", `${VisualLogging2.pane("preview").track({ resize: true })}`);
    this.preview = null;
    this.splitWidget.setMainWidget(this.dataGrid.asWidget());
    this.splitWidget.setSidebarWidget(this.previewPanel);
    this.splitWidget.hideMain();
    this.performUpdate();
  }
  getDataGrid() {
    return this.dataGrid;
  }
  /**
   * Creates the toolbar UI element.
   */
  setupToolbar() {
    this.toolbar.wrappable = true;
    this.recordButton = UI4.Toolbar.Toolbar.createActionButton(this.recordAction);
    this.recordButton.toggleOnClick(false);
    this.toolbar.appendToolbarItem(this.recordButton);
    const clearButton = new UI4.Toolbar.ToolbarButton(i18nString3(UIStrings3.clear), "clear", void 0, "background-service.clear");
    clearButton.addEventListener("Click", () => this.clearEvents());
    this.toolbar.appendToolbarItem(clearButton);
    this.toolbar.appendSeparator();
    this.saveButton = new UI4.Toolbar.ToolbarButton(i18nString3(UIStrings3.saveEvents), "download", void 0, "background-service.save-events");
    this.saveButton.addEventListener("Click", (_event) => {
      void this.saveToFile();
    });
    this.toolbar.appendToolbarItem(this.saveButton);
    this.toolbar.appendSeparator();
    this.originCheckbox = new UI4.Toolbar.ToolbarCheckbox(i18nString3(UIStrings3.showEventsFromOtherDomains), i18nString3(UIStrings3.showEventsFromOtherDomains), () => this.refreshView(), "show-events-from-other-domains");
    this.toolbar.appendToolbarItem(this.originCheckbox);
    this.storageKeyCheckbox = new UI4.Toolbar.ToolbarCheckbox(i18nString3(UIStrings3.showEventsForOtherStorageKeys), i18nString3(UIStrings3.showEventsForOtherStorageKeys), () => this.refreshView(), "show-events-from-other-partitions");
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
    this.#selectedEventNode = null;
    this.dataGrid.rootNode().removeChildren();
    this.splitWidget.hideMain();
    this.performUpdate();
  }
  /**
   * Called when the `Toggle Record` button is clicked.
   */
  toggleRecording() {
    const isRecording = !this.#isRecording;
    this.model.setRecording(isRecording, this.serviceName);
    const featureName = _BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
    if (isRecording) {
      UI4.ARIAUtils.LiveAnnouncer.alert(i18nString3(UIStrings3.recordingSActivity, { PH1: featureName }) + " " + i18nString3(UIStrings3.devtoolsWillRecordAllSActivity, { PH1: featureName }));
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
    if (state.isRecording === this.#isRecording) {
      return;
    }
    this.#isRecording = state.isRecording;
    this.performUpdate();
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
      this.performUpdate();
    }
  }
  createDataGrid() {
    const columns = [
      { id: "id", title: "#", weight: 1, sortable: false },
      { id: "timestamp", title: i18nString3(UIStrings3.timestamp), weight: 7, sortable: false },
      { id: "event-name", title: i18nString3(UIStrings3.event), weight: 8, sortable: false },
      { id: "origin", title: i18nString3(UIStrings3.origin), weight: 8, sortable: false },
      { id: "storage-key", title: i18nString3(UIStrings3.storageKey), weight: 8, sortable: false },
      { id: "sw-scope", title: i18nString3(UIStrings3.swScope), weight: 4, sortable: false },
      { id: "instance-id", title: i18nString3(UIStrings3.instanceId), weight: 8, sortable: false }
    ];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString3(UIStrings3.backgroundServices),
      columns
    });
    dataGrid.setStriped(true);
    dataGrid.addEventListener("SelectedNode", (event) => {
      this.#selectedEventNode = event.data;
      this.performUpdate();
    });
    return dataGrid;
  }
  performUpdate() {
    this.#updateToolbar();
    this.#updatePreview();
  }
  #updateToolbar() {
    if (this.recordButton) {
      this.recordButton.setToggled(this.#isRecording);
      const buttonTooltip = this.#isRecording ? i18nString3(UIStrings3.stopRecordingEvents) : i18nString3(UIStrings3.startRecordingEvents);
      this.recordButton.setTitle(buttonTooltip, "background-service.toggle-recording");
    }
    if (this.saveButton) {
      this.saveButton.setEnabled(this.dataGrid.rootNode().children.length > 0);
    }
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
      timestamp: UI4.UIUtils.formatTimestamp(
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
  #updatePreview() {
    if (this.preview) {
      this.preview.detach();
    }
    if (this.#selectedEventNode) {
      this.preview = this.#selectedEventNode.createPreview();
      this.preview.show(this.previewPanel.contentElement);
      return;
    }
    let emptyWidget;
    if (this.dataGrid.rootNode().children.length) {
      emptyWidget = new UI4.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.noEventSelected), i18nString3(UIStrings3.selectAnEventToViewMetadata));
    } else if (this.#isRecording) {
      const featureName = _BackgroundServiceView.getUIString(this.serviceName).toLowerCase();
      emptyWidget = new UI4.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.recordingSActivity, { PH1: featureName }), i18nString3(UIStrings3.devtoolsWillRecordAllSActivity, { PH1: featureName }));
    } else {
      const recordShortcuts = UI4.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction("background-service.toggle-recording")[0];
      emptyWidget = new UI4.EmptyWidget.EmptyWidget(i18nString3(UIStrings3.noRecording), i18nString3(UIStrings3.startRecordingToDebug, {
        PH1: i18nString3(UIStrings3.startRecordingEvents),
        PH2: recordShortcuts ? recordShortcuts.title() : ""
      }));
      emptyWidget.link = this.createLearnMoreLink();
      const button = UI4.UIUtils.createTextButton(i18nString3(UIStrings3.startRecordingEvents), () => this.toggleRecording(), {
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
    const stream = new Bindings.FileUtils.FileOutputStream(Workspace.FileManager.FileManager.instance());
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
    const preview = new UI4.Widget.VBox();
    preview.element.classList.add("background-service-metadata");
    preview.element.setAttribute("jslog", `${VisualLogging2.section("metadata")}`);
    render3(html3`${this.eventMetadata.length > 0 ? this.eventMetadata.map((entry) => html3`
        <div class="background-service-metadata-entry">
          <div class="background-service-metadata-name">${entry.key}: </div>${entry.value ? html3`<div class="background-service-metadata-value source-code">${entry.value}</div>` : html3`<div class="background-service-metadata-value background-service-empty-value">${i18nString3(UIStrings3.empty)}</div>`}
        </div>
      `) : html3`
        <div class="background-service-metadata-entry">
          <div class="background-service-metadata-name background-service-empty-value">${i18nString3(UIStrings3.noMetadataForThisEvent)}</div>
        </div>
      `}`, preview.element, { host: this });
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
import * as i18n7 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon2 } from "./../../ui/kit/kit.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
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
    UI5.UIUserMetrics.UIUserMetrics.instance().panelShown("bounce-tracking-mitigations");
    return false;
  }
};

// gen/front_end/panels/application/ApplicationPanelSidebar.js
import * as ApplicationComponents13 from "./components/components.js";

// gen/front_end/panels/application/DeviceBoundSessionsModel.js
var DeviceBoundSessionsModel_exports = {};
__export(DeviceBoundSessionsModel_exports, {
  DeviceBoundSessionsModel: () => DeviceBoundSessionsModel
});
import * as Common3 from "./../../core/common/common.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
var DeviceBoundSessionsModel = class extends Common3.ObjectWrapper.ObjectWrapper {
  #siteSessions = /* @__PURE__ */ new Map();
  #visibleSites = /* @__PURE__ */ new Set();
  constructor() {
    super();
    SDK5.TargetManager.TargetManager.instance().observeModels(SDK5.NetworkManager.NetworkManager, this, { scoped: true });
  }
  modelAdded(networkManager) {
    networkManager.addEventListener(SDK5.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
    networkManager.addEventListener(SDK5.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
    void networkManager.enableDeviceBoundSessions();
  }
  modelRemoved(networkManager) {
    networkManager.removeEventListener(SDK5.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
    networkManager.removeEventListener(SDK5.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
  }
  addVisibleSite(site) {
    if (this.#visibleSites.has(site)) {
      return;
    }
    this.#visibleSites.add(site);
    this.dispatchEventToListeners("ADD_VISIBLE_SITE", { site });
  }
  clearVisibleSites() {
    if (this.getPreserveLogSetting().get()) {
      return;
    }
    this.#visibleSites.clear();
    this.dispatchEventToListeners(
      "CLEAR_VISIBLE_SITES"
      /* DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES */
    );
  }
  clearEvents() {
    if (this.getPreserveLogSetting().get()) {
      return;
    }
    const emptySessions = /* @__PURE__ */ new Map();
    const noLongerFailedSessions = /* @__PURE__ */ new Map();
    const emptySites = /* @__PURE__ */ new Set();
    for (const [site, sessionIdToSessionMap] of [...this.#siteSessions]) {
      let emptySessionsSiteEntry = emptySessions.get(site);
      let noLongerFailedSessionsSiteEntry = noLongerFailedSessions.get(site);
      for (const [sessionId, sessionAndEvents] of sessionIdToSessionMap) {
        sessionAndEvents.eventsById.clear();
        if (sessionAndEvents.hasErrors) {
          sessionAndEvents.hasErrors = false;
          if (!noLongerFailedSessionsSiteEntry) {
            noLongerFailedSessionsSiteEntry = [];
            noLongerFailedSessions.set(site, noLongerFailedSessionsSiteEntry);
          }
          noLongerFailedSessionsSiteEntry.push(sessionId);
        }
        if (sessionAndEvents.session) {
          continue;
        }
        sessionIdToSessionMap.delete(sessionId);
        if (!emptySessionsSiteEntry) {
          emptySessionsSiteEntry = [];
          emptySessions.set(site, emptySessionsSiteEntry);
        }
        emptySessionsSiteEntry.push(sessionId);
      }
      if (sessionIdToSessionMap.size === 0) {
        this.#siteSessions.delete(site);
        emptySites.add(site);
      }
    }
    this.dispatchEventToListeners("CLEAR_EVENTS", { emptySessions, emptySites, noLongerFailedSessions });
  }
  deleteSession(site, id) {
    for (const networkManager of SDK5.TargetManager.TargetManager.instance().models(SDK5.NetworkManager.NetworkManager, { scoped: true })) {
      void networkManager.deleteDeviceBoundSession({ site, id });
    }
  }
  isSiteVisible(site) {
    return this.#visibleSites.has(site);
  }
  isSessionTerminated(site, sessionId) {
    const session = this.getSession(site, sessionId);
    if (session === void 0) {
      return false;
    }
    return session.isSessionTerminated;
  }
  sessionHasErrors(site, sessionId) {
    const session = this.getSession(site, sessionId);
    if (session === void 0) {
      return false;
    }
    return session.hasErrors;
  }
  getSession(site, sessionId) {
    return this.#siteSessions.get(site)?.get(sessionId);
  }
  getPreserveLogSetting() {
    return Common3.Settings.Settings.instance().createSetting("device-bound-sessions-preserve-log", false);
  }
  #onSessionsSet({ data: sessions }) {
    for (const session of sessions) {
      const sessionAndEvents = this.#ensureSiteAndSessionInitialized(session.key.site, session.key.id);
      sessionAndEvents.session = session;
    }
    this.dispatchEventToListeners("INITIALIZE_SESSIONS", { sessions });
  }
  #ensureSiteAndSessionInitialized(site, sessionId) {
    let sessionIdToSessionMap = this.#siteSessions.get(site);
    if (!sessionIdToSessionMap) {
      sessionIdToSessionMap = /* @__PURE__ */ new Map();
      this.#siteSessions.set(site, sessionIdToSessionMap);
    }
    let sessionAndEvent = sessionIdToSessionMap.get(sessionId);
    if (!sessionAndEvent) {
      sessionAndEvent = {
        isSessionTerminated: false,
        hasErrors: false,
        eventsById: /* @__PURE__ */ new Map()
      };
      sessionIdToSessionMap.set(sessionId, sessionAndEvent);
    }
    return sessionAndEvent;
  }
  #onEventOccurred({ data: event }) {
    const sessionAndEvent = this.#ensureSiteAndSessionInitialized(event.site, event.sessionId);
    if (sessionAndEvent.eventsById.has(event.eventId)) {
      return;
    }
    const eventWithTimestamp = { event, timestamp: /* @__PURE__ */ new Date() };
    sessionAndEvent.eventsById.set(event.eventId, eventWithTimestamp);
    const newSession = event.creationEventDetails?.newSession || event.refreshEventDetails?.newSession;
    if (newSession) {
      sessionAndEvent.session = newSession;
    }
    if (event.succeeded && sessionAndEvent.session && event.challengeEventDetails) {
      sessionAndEvent.session.cachedChallenge = event.challengeEventDetails.challenge;
    }
    if (event.succeeded) {
      if (event.terminationEventDetails) {
        sessionAndEvent.isSessionTerminated = true;
      } else if (event.creationEventDetails) {
        sessionAndEvent.isSessionTerminated = false;
      }
    }
    if (!event.succeeded) {
      sessionAndEvent.hasErrors = true;
    }
    this.dispatchEventToListeners("EVENT_OCCURRED", { site: eventWithTimestamp.event.site, sessionId: eventWithTimestamp.event.sessionId });
  }
};

// gen/front_end/panels/application/DeviceBoundSessionsTreeElement.js
var DeviceBoundSessionsTreeElement_exports = {};
__export(DeviceBoundSessionsTreeElement_exports, {
  RootTreeElement: () => RootTreeElement
});
import * as i18n9 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon3 } from "./../../ui/kit/kit.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
var UIStrings5 = {
  /**
   *@description Text for section title Application panel sidebar. A website
   * may decide to create a session for a user, for example when the user logs
   * in. They can use a protocol to make it a "device bound session". That
   * means that when the session expires, it is only possible for it to be
   * extended on the device it was created on. Thus the session is considered
   * to be bound to that device. For more details on the protocol, see
   * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
   * https://w3c.github.io/webappsec-dbsc/.
   */
  deviceBoundSessions: "Device bound sessions",
  /**
   *@description Empty state description for root tree element and site tree
   * elements. A website may decide to create a session for a user, for example
   * when the user logs in. They can use a protocol to make it a "device bound
   * session". That means that when the session expires, it is only possible
   * for it to be extended on the device it was created on. Thus the session
   * is considered to be bound to that device. A session can have various events,
   * such as when it's first created, when it's extended, or when it's
   * terminated. For more details on the protocol, see
   * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
   * https://w3c.github.io/webappsec-dbsc/.
   */
  deviceBoundSessionsCategoryDescription: "On this page you can view device bound sessions and associated events",
  /**
   *@description Events are sometimes linked to sessions. These are grouped
   * visually either by session name or by 'No session' if any events are not
   * linked to a session.
   */
  noSession: "No session",
  /**
   *@description Tooltip text for a terminated session.
   *@example {session_1} sessionName
   */
  terminatedSession: "{sessionName}, Session terminated",
  /**
   *@description Tooltip text for a session with errors.
   *@example {session_1} sessionName
   */
  sessionWithErrors: "{sessionName}, Session has errors",
  /**
   *@description Context menu item for clearing a session.
   */
  clear: "Clear"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/application/DeviceBoundSessionsTreeElement.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var RootTreeElement = class extends ApplicationPanelTreeElement {
  #model;
  #sites = /* @__PURE__ */ new Map();
  constructor(storagePanel, model) {
    super(
      storagePanel,
      i18nString5(UIStrings5.deviceBoundSessions),
      /* expandable=*/
      true,
      "device-bound-sessions-root"
    );
    this.setLeadingIcons([createIcon3("lock-person")]);
    this.#model = model;
  }
  get itemURL() {
    return "device-bound-sessions://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showDeviceBoundSessionDefault(this.#model, i18nString5(UIStrings5.deviceBoundSessions), i18nString5(UIStrings5.deviceBoundSessionsCategoryDescription));
    return false;
  }
  onbind() {
    super.onbind();
    this.#model.addEventListener("INITIALIZE_SESSIONS", this.#onNewSessions, this);
    this.#model.addEventListener("ADD_VISIBLE_SITE", this.#onVisibleSiteAdded, this);
    this.#model.addEventListener("CLEAR_VISIBLE_SITES", this.#onVisibleSitesCleared, this);
    this.#model.addEventListener("EVENT_OCCURRED", this.#onEventOccurred, this);
    this.#model.addEventListener("CLEAR_EVENTS", this.#onClearEvents, this);
  }
  onunbind() {
    super.onunbind();
    this.#model.removeEventListener("INITIALIZE_SESSIONS", this.#onNewSessions, this);
    this.#model.removeEventListener("ADD_VISIBLE_SITE", this.#onVisibleSiteAdded, this);
    this.#model.removeEventListener("CLEAR_VISIBLE_SITES", this.#onVisibleSitesCleared, this);
    this.#model.removeEventListener("EVENT_OCCURRED", this.#onEventOccurred, this);
    this.#model.removeEventListener("CLEAR_EVENTS", this.#onClearEvents, this);
  }
  #updateSiteTreeElementVisibility(site) {
    const siteMapEntry = this.#sites.get(site);
    if (!siteMapEntry) {
      return;
    }
    const siteTreeElement = siteMapEntry.siteTreeElement;
    const isElementPresent = this.indexOfChild(siteTreeElement) >= 0;
    const isSiteAllowed = this.#model.isSiteVisible(site);
    if (isSiteAllowed && !isElementPresent) {
      this.appendChild(siteTreeElement);
      const children = [...siteTreeElement.children()];
      siteTreeElement.removeChildren();
      for (const child of children) {
        siteTreeElement.appendChild(child);
      }
    } else if (!isSiteAllowed && isElementPresent) {
      this.removeChild(siteTreeElement);
    }
  }
  #updateElementIconAndStyling(sessionElement, isSessionTerminated, sessionHasErrors) {
    const title = sessionElement.title;
    if (isSessionTerminated) {
      sessionElement.listItemElement.classList.add("device-bound-session-terminated");
      sessionElement.setLeadingIcons([createIcon3("database-off")]);
      const terminatedTitle = i18nString5(UIStrings5.terminatedSession, { sessionName: title });
      UI6.ARIAUtils.setLabel(sessionElement.listItemElement, terminatedTitle);
      return;
    }
    sessionElement.listItemElement.classList.remove("device-bound-session-terminated");
    if (sessionHasErrors) {
      sessionElement.setLeadingIcons([createIcon3("warning")]);
      const errorTitle = i18nString5(UIStrings5.sessionWithErrors, { sessionName: title });
      UI6.ARIAUtils.setLabel(sessionElement.listItemElement, errorTitle);
    } else {
      sessionElement.setLeadingIcons([createIcon3("database")]);
      UI6.ARIAUtils.setLabel(sessionElement.listItemElement, title);
    }
  }
  #updateIconAndStyling(site, sessionId) {
    const isSessionTerminated = this.#model.isSessionTerminated(site, sessionId);
    const sessionHasErrors = this.#model.sessionHasErrors(site, sessionId);
    const siteMapEntry = this.#sites.get(site);
    if (!siteMapEntry) {
      return;
    }
    const sessionElement = siteMapEntry.sessions.get(sessionId);
    if (!sessionElement) {
      return;
    }
    this.#updateElementIconAndStyling(sessionElement, isSessionTerminated, sessionHasErrors);
  }
  #removeWarningIcons(noLongerFailedSessions) {
    for (const [site, noLongerFailedSessionIds] of noLongerFailedSessions) {
      const siteData = this.#sites.get(site);
      if (siteData) {
        for (const noLongerFailedSessionId of noLongerFailedSessionIds) {
          const sessionElement = siteData.sessions.get(noLongerFailedSessionId);
          if (sessionElement) {
            const isSessionTerminated = this.#model.isSessionTerminated(site, noLongerFailedSessionId);
            this.#updateElementIconAndStyling(
              sessionElement,
              isSessionTerminated,
              /* sessionHasErrors=*/
              false
            );
          }
        }
      }
    }
  }
  #addSiteSessionIfMissing(site, sessionId) {
    let siteMapEntry = this.#sites.get(site);
    if (!siteMapEntry) {
      const siteElement = new ApplicationPanelTreeElement(
        this.resourcesPanel,
        site,
        /* expandable=*/
        true,
        "device-bound-sessions-site"
      );
      siteElement.setLeadingIcons([createIcon3("cloud")]);
      siteElement.itemURL = `device-bound-sessions://${site}`;
      const defaultOnSelect = siteElement.onselect.bind(siteElement);
      siteElement.onselect = (selectedByUser) => {
        defaultOnSelect(selectedByUser);
        this.resourcesPanel.showDeviceBoundSessionDefault(this.#model, i18nString5(UIStrings5.deviceBoundSessions), i18nString5(UIStrings5.deviceBoundSessionsCategoryDescription));
        return false;
      };
      siteMapEntry = { siteTreeElement: siteElement, sessions: /* @__PURE__ */ new Map() };
      this.#sites.set(site, siteMapEntry);
    }
    if (!siteMapEntry.sessions.has(sessionId)) {
      const sessionElement = new ApplicationPanelTreeElement(this.resourcesPanel, sessionId ?? i18nString5(UIStrings5.noSession), false, "device-bound-sessions-session");
      if (sessionId === void 0) {
        sessionElement.listItemElement.classList.add("no-device-bound-session");
      }
      sessionElement.setLeadingIcons([createIcon3("database")]);
      sessionElement.itemURL = `device-bound-sessions://${site}/${sessionId || ""}`;
      const defaultOnSelect = sessionElement.onselect.bind(sessionElement);
      sessionElement.onselect = (selectedByUser) => {
        defaultOnSelect(selectedByUser);
        this.resourcesPanel.showDeviceBoundSession(this.#model, site, sessionId);
        return false;
      };
      sessionElement.listItemElement.addEventListener("keydown", (event) => {
        const keyboardEvent = event;
        if ((keyboardEvent.key === "Delete" || keyboardEvent.key === "Backspace") && sessionId !== void 0) {
          this.#model.deleteSession(site, sessionId);
          event.consume(true);
        }
      });
      sessionElement.listItemElement.addEventListener("contextmenu", (event) => {
        if (sessionId !== void 0) {
          const contextMenu = new UI6.ContextMenu.ContextMenu(event);
          contextMenu.defaultSection().appendItem(i18nString5(UIStrings5.clear), () => this.#model.deleteSession(site, sessionId), { jslogContext: "clear" });
          void contextMenu.show();
        }
      });
      if (sessionId === void 0) {
        siteMapEntry.siteTreeElement.insertChild(sessionElement, 0);
      } else {
        siteMapEntry.siteTreeElement.appendChild(sessionElement);
      }
      siteMapEntry.sessions.set(sessionId, sessionElement);
    }
    this.#updateSiteTreeElementVisibility(site);
  }
  #removeEmptyElements(emptySessions, emptySites) {
    for (const emptySite of emptySites) {
      const siteData = this.#sites.get(emptySite);
      if (siteData) {
        this.removeChild(siteData.siteTreeElement);
        this.#sites.delete(emptySite);
      }
    }
    for (const [site, emptySessionIds] of emptySessions) {
      const siteData = this.#sites.get(site);
      if (siteData) {
        for (const emptySessionId of emptySessionIds) {
          const sessionElement = siteData.sessions.get(emptySessionId);
          if (sessionElement) {
            siteData.siteTreeElement.removeChild(sessionElement);
            siteData.sessions.delete(emptySessionId);
          }
        }
      }
    }
  }
  #onNewSessions({ data: { sessions } }) {
    for (const session of sessions) {
      this.#addSiteSessionIfMissing(session.key.site, session.key.id);
    }
  }
  #onVisibleSiteAdded({ data: { site } }) {
    this.#updateSiteTreeElementVisibility(site);
  }
  #onVisibleSitesCleared() {
    this.removeChildren();
  }
  #onEventOccurred({ data: { site, sessionId } }) {
    this.#addSiteSessionIfMissing(site, sessionId);
    this.#updateIconAndStyling(site, sessionId);
  }
  #onClearEvents({ data: { emptySessions, emptySites, noLongerFailedSessions } }) {
    this.#removeEmptyElements(emptySessions, emptySites);
    this.#removeWarningIcons(noLongerFailedSessions);
  }
};

// gen/front_end/panels/application/ExtensionStorageModel.js
var ExtensionStorageModel_exports = {};
__export(ExtensionStorageModel_exports, {
  ExtensionStorage: () => ExtensionStorage,
  ExtensionStorageModel: () => ExtensionStorageModel
});
import * as Common4 from "./../../core/common/common.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
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
var ExtensionStorageModel = class extends SDK6.SDKModel.SDKModel {
  #runtimeModel;
  #storages;
  agent;
  #enabled;
  constructor(target) {
    super(target);
    this.#runtimeModel = target.model(SDK6.RuntimeModel.RuntimeModel);
    this.#storages = /* @__PURE__ */ new Map();
    this.agent = target.extensionsAgent();
  }
  enable() {
    if (this.#enabled) {
      return;
    }
    if (this.#runtimeModel) {
      this.#runtimeModel.addEventListener(SDK6.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated, this);
      this.#runtimeModel.addEventListener(SDK6.RuntimeModel.Events.ExecutionContextDestroyed, this.#onExecutionContextDestroyed, this);
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
SDK6.SDKModel.SDKModel.register(ExtensionStorageModel, { capabilities: 4, autostart: false });

// gen/front_end/panels/application/FrameDetailsView.js
var FrameDetailsView_exports = {};
__export(FrameDetailsView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  FrameDetailsReportView: () => FrameDetailsReportView
});
import "./../../ui/kit/kit.js";
import "./../../ui/components/expandable_list/expandable_list.js";
import "./../../ui/components/report_view/report_view.js";
import * as Common5 from "./../../core/common/common.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as Workspace2 from "./../../models/workspace/workspace.js";
import * as PanelCommon from "./../common/common.js";
import * as NetworkForward from "./../network/forward/forward.js";
import * as CspEvaluator from "./../../third_party/csp_evaluator/csp_evaluator.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as UIHelpers from "./../../ui/helpers/helpers.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
import { html as html5, nothing as nothing3, render as render5 } from "./../../ui/lit/lit.js";
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

.inline-items devtools-button {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
}

.inline-items .text-ellipsis {
  flex: 0 1 auto;
  min-width: 0;
  padding-left: 2px;
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
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html4, nothing as nothing2, render as render4 } from "./../../ui/lit/lit.js";

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
var { classMap: classMap2 } = Directives2;
var { widget: widget2 } = UI7.Widget;
var UIStrings6 = {
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
var str_6 = i18n11.i18n.registerUIStrings("panels/application/OriginTrialTreeView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
function renderOriginTrialTree(originTrial) {
  const success = originTrial.status === "Enabled";
  return html4`
    <li role="treeitem">
      ${originTrial.trialName}
      <devtools-adorner class="badge-${success ? "success" : "error"}">
        ${originTrial.status}
      </devtools-adorner>
      ${originTrial.tokensWithStatus.length > 1 ? html4`
        <devtools-adorner class="badge-secondary">
          ${i18nString6(UIStrings6.tokens, { PH1: originTrial.tokensWithStatus.length })}
        </devtools-adorner>` : nothing2}
      <ul role="group">
        ${originTrial.tokensWithStatus.length > 1 ? originTrial.tokensWithStatus.map(renderTokenNode) : renderTokenDetailsNodes(originTrial.tokensWithStatus[0])}
      </ul>
    </li>`;
}
function renderTokenNode(token) {
  const success = token.status === "Success";
  return html4`
    <li role="treeitem">
      ${i18nString6(UIStrings6.token)}
      <devtools-adorner class="token-status-badge badge-${success ? "success" : "error"}">
        ${token.status}
      </devtools-adorner>
      <ul role="group">
        ${renderTokenDetailsNodes(token)}
      </ul>
    </li>`;
}
function renderTokenDetails(token) {
  return html4`
    <li role="treeitem">
      ${widget2(OriginTrialTokenRows, { data: token })}
    </li>`;
}
function renderTokenDetailsNodes(token) {
  return html4`
    ${renderTokenDetails(token)}
    ${renderRawTokenTextNode(token.rawTokenText)}
  `;
}
function renderRawTokenTextNode(tokenText) {
  return html4`
    <li role="treeitem">
      ${i18nString6(UIStrings6.rawTokenText)}
      <ul role="group">
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
  render4(html4`
    <style>
      ${originTrialTokenRows_css_default}
      ${originTrialTreeView_css_default}
    </style>
    <div class="content">
      <div class="key">${i18nString6(UIStrings6.status)}</div>
      <div class="value">
        <devtools-adorner class="badge-${success ? "success" : "error"}">
          ${input.tokenWithStatus.status}
        </devtools-adorner>
      </div>
      ${input.parsedTokenDetails.map((field) => html4`
        <div class="key">${field.name}</div>
        <div class="value">
          <div class=${classMap2({ "error-text": Boolean(field.value.hasError) })}>
            ${field.value.text}
          </div>
        </div>
      `)}
    </div>`, target);
};
var OriginTrialTokenRows = class extends UI7.Widget.Widget {
  #view;
  #tokenWithStatus = null;
  #parsedTokenDetails = [];
  #dateFormatter = new Intl.DateTimeFormat(i18n11.DevToolsLocale.DevToolsLocale.instance().locale, { dateStyle: "long", timeStyle: "long" });
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
        name: i18nString6(UIStrings6.origin),
        value: {
          text: this.#tokenWithStatus.parsedToken.origin,
          hasError: this.#tokenWithStatus.status === "WrongOrigin"
        }
      },
      {
        name: i18nString6(UIStrings6.expiryTime),
        value: {
          text: this.#dateFormatter.format(this.#tokenWithStatus.parsedToken.expiryTime * 1e3),
          hasError: this.#tokenWithStatus.status === "Expired"
        }
      },
      {
        name: i18nString6(UIStrings6.usageRestriction),
        value: { text: this.#tokenWithStatus.parsedToken.usageRestriction }
      },
      {
        name: i18nString6(UIStrings6.isThirdParty),
        value: { text: this.#tokenWithStatus.parsedToken.isThirdParty.toString() }
      },
      {
        name: i18nString6(UIStrings6.matchSubDomains),
        value: { text: this.#tokenWithStatus.parsedToken.matchSubDomains.toString() }
      }
    ];
    if (this.#tokenWithStatus.status === "UnknownTrial") {
      this.#parsedTokenDetails = [
        {
          name: i18nString6(UIStrings6.trialName),
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
    render4(html4`
      <span class="status-badge">
        <devtools-icon class="medium" name="clear"></devtools-icon>
        <span>${i18nString6(UIStrings6.noTrialTokens)}</span>
      </span>`, target);
    return;
  }
  render4(html4`
    <style>${originTrialTreeView_css_default}</style>
    <devtools-tree .template=${html4`
      <style>${originTrialTreeView_css_default}</style>
      <ul role="tree">
        ${input.trials.map(renderOriginTrialTree)}
      </ul>
    `}>
    </devtools-tree>
  `, target);
};
var OriginTrialTreeView = class extends UI7.Widget.Widget {
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
var { widget: widget3 } = UI8.Widget;
var UIStrings7 = {
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
  theFramesSchemeIsInsecure: "The frame\u2019s scheme is insecure",
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
var str_7 = i18n13.i18n.registerUIStrings("panels/application/FrameDetailsView.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var DEFAULT_VIEW3 = (input, _output, target) => {
  if (!input.frame) {
    return;
  }
  render5(html5`
    <style>${frameDetailsReportView_css_default}</style>
    <devtools-report .data=${{ reportTitle: input.frame.displayName() }}
    jslog=${VisualLogging3.pane("frames")}>
      ${renderDocumentSection(input)}
      ${renderIsolationSection(input)}
      ${renderApiAvailabilitySection(input.frame)}
      ${renderOriginTrial(input.trials)}
      ${input.permissionsPolicies ? widget3(ApplicationComponents4.PermissionsPolicySection.PermissionsPolicySection, {
    policies: input.permissionsPolicies,
    showDetails: false
  }) : nothing3}
      ${input.protocolMonitorExperimentEnabled ? renderAdditionalInfoSection(input.frame) : nothing3}
    </devtools-report>
  `, target);
};
function renderOriginTrial(trials) {
  if (!trials) {
    return nothing3;
  }
  const data = { trials };
  return html5`
    <devtools-report-section-header>
      ${i18n13.i18n.lockedString("Origin trials")}
    </devtools-report-section-header>
    <devtools-report-section>
      <span class="report-section">
        ${i18nString7(UIStrings7.originTrialsExplanation)}
        <devtools-link href="https://developer.chrome.com/docs/web-platform/origin-trials/" class="link"
                jslogcontext="learn-more.origin-trials">
          ${i18nString7(UIStrings7.learnMore)}
        </devtools-link>
      </span>
    </devtools-report-section>
    <devtools-widget class="span-cols" ${widget3(OriginTrialTreeView, { data })}>
    </devtools-widget>
    <devtools-report-divider></devtools-report-divider>`;
}
function renderDocumentSection(input) {
  if (!input.frame) {
    return nothing3;
  }
  return html5`
      <devtools-report-section-header>${i18nString7(UIStrings7.document)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings7.url)}</devtools-report-key>
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
      ${maybeRenderCreationStacktrace(input.creationStackTrace)}
      ${maybeRenderAdStatus(input.frame?.adFrameType(), input.frame?.adFrameStatus())}
      ${maybeRenderCreatorAdScriptAncestry(input.frame?.adFrameType(), input.target, input.adScriptAncestry)}
      <devtools-report-divider></devtools-report-divider>`;
}
function renderSourcesLinkForURL(onRevealInSources) {
  return ApplicationComponents4.PermissionsPolicySection.renderIconLink("label", i18nString7(UIStrings7.clickToOpenInSourcesPanel), onRevealInSources, "reveal-in-sources");
}
function renderNetworkLinkForURL(onRevealInNetwork) {
  return ApplicationComponents4.PermissionsPolicySection.renderIconLink("arrow-up-down-circle", i18nString7(UIStrings7.clickToOpenInNetworkPanel), onRevealInNetwork, "reveal-in-network");
}
function maybeRenderUnreachableURL(unreachableUrl) {
  if (!unreachableUrl) {
    return nothing3;
  }
  return html5`
      <devtools-report-key>${i18nString7(UIStrings7.unreachableUrl)}</devtools-report-key>
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
    return ApplicationComponents4.PermissionsPolicySection.renderIconLink("arrow-up-down-circle", i18nString7(UIStrings7.clickToOpenInNetworkPanelMight), () => {
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
    return html5`
        <devtools-report-key>${i18nString7(UIStrings7.origin)}</devtools-report-key>
        <devtools-report-value>
          <div class="text-ellipsis" title=${securityOrigin}>${securityOrigin}</div>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function renderOwnerElement(linkTargetDOMNode) {
  if (linkTargetDOMNode) {
    return html5`
        <devtools-report-key>${i18nString7(UIStrings7.ownerElement)}</devtools-report-key>
        <devtools-report-value class="without-min-width">
          <div class="inline-items">
            ${widget3(PanelCommon.DOMLinkifier.DOMNodeLink, { node: linkTargetDOMNode })}
          </div>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function maybeRenderCreationStacktrace(stackTrace) {
  if (stackTrace) {
    return html5`
        <devtools-report-key title=${i18nString7(UIStrings7.creationStackTraceExplanation)}>${i18nString7(UIStrings7.creationStackTrace)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging3.section("frame-creation-stack-trace")}>
          ${widget3(Components2.JSPresentationUtils.StackTracePreviewContent, { stackTrace, options: { expandable: true } })}
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function getAdFrameTypeStrings(type) {
  switch (type) {
    case "child":
      return { value: i18nString7(UIStrings7.child), description: i18nString7(UIStrings7.childDescription) };
    case "root":
      return { value: i18nString7(UIStrings7.root), description: i18nString7(UIStrings7.rootDescription) };
  }
}
function getAdFrameExplanationString(explanation) {
  switch (explanation) {
    case "CreatedByAdScript":
      return i18nString7(UIStrings7.createdByAdScriptExplanation);
    case "MatchedBlockingRule":
      return i18nString7(UIStrings7.matchedBlockingRuleExplanation);
    case "ParentIsAd":
      return i18nString7(UIStrings7.parentIsAdExplanation);
  }
}
function maybeRenderAdStatus(adFrameType, adFrameStatus) {
  if (adFrameType === void 0 || adFrameType === "none") {
    return nothing3;
  }
  const typeStrings = getAdFrameTypeStrings(adFrameType);
  const rows = [html5`<div title=${typeStrings.description}>${typeStrings.value}</div>`];
  for (const explanation of adFrameStatus?.explanations || []) {
    rows.push(html5`<div>${getAdFrameExplanationString(explanation)}</div>`);
  }
  return html5`
      <devtools-report-key>${i18nString7(UIStrings7.adStatus)}</devtools-report-key>
      <devtools-report-value class="ad-status-list" jslog=${VisualLogging3.section("ad-status")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString7(UIStrings7.adStatus) }}>
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
    return html5`<div>
      ${widget3(Components2.Linkifier.ScriptLocationLink, { target, scriptId: adScriptId.scriptId, options: { jslogContext: "ad-script" } })}
    </div>`;
  });
  const shouldRenderFilterlistRule = adScriptAncestry.rootScriptFilterlistRule !== void 0;
  return html5`
      <devtools-report-key>${i18nString7(UIStrings7.creatorAdScriptAncestry)}</devtools-report-key>
      <devtools-report-value class="creator-ad-script-ancestry-list" jslog=${VisualLogging3.section("creator-ad-script-ancestry")}>
        <devtools-expandable-list .data=${{ rows, title: i18nString7(UIStrings7.creatorAdScriptAncestry) }}>
        </devtools-expandable-list>
      </devtools-report-value>
      ${shouldRenderFilterlistRule ? html5`
        <devtools-report-key>${i18nString7(UIStrings7.rootScriptFilterlistRule)}</devtools-report-key>
        <devtools-report-value jslog=${VisualLogging3.section("root-script-filterlist-rule")}>${adScriptAncestry.rootScriptFilterlistRule}</devtools-report-value>
      ` : nothing3}
    `;
}
function renderIsolationSection(input) {
  if (!input.frame) {
    return nothing3;
  }
  return html5`
      <devtools-report-section-header>${i18nString7(UIStrings7.securityIsolation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings7.secureContext)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isSecureContext() ? i18nString7(UIStrings7.yes) : i18nString7(UIStrings7.no)}\xA0${maybeRenderSecureContextExplanation(input.frame)}
      </devtools-report-value>
      <devtools-report-key>${i18nString7(UIStrings7.crossoriginIsolated)}</devtools-report-key>
      <devtools-report-value>
        ${input.frame.isCrossOriginIsolated() ? i18nString7(UIStrings7.yes) : i18nString7(UIStrings7.no)}
      </devtools-report-value>
      ${maybeRenderCoopCoepCSPStatus(input.securityIsolationInfo)}
      <devtools-report-divider></devtools-report-divider>
    `;
}
function maybeRenderSecureContextExplanation(frame) {
  const explanation = getSecureContextExplanation(frame);
  if (explanation) {
    return html5`<span class="inline-comment">${explanation}</span>`;
  }
  return nothing3;
}
function getSecureContextExplanation(frame) {
  switch (frame?.getSecureContextType()) {
    case "Secure":
      return null;
    case "SecureLocalhost":
      return i18nString7(UIStrings7.localhostIsAlwaysASecureContext);
    case "InsecureAncestor":
      return i18nString7(UIStrings7.aFrameAncestorIsAnInsecure);
    case "InsecureScheme":
      return i18nString7(UIStrings7.theFramesSchemeIsInsecure);
  }
  return null;
}
function maybeRenderCoopCoepCSPStatus(info) {
  if (info) {
    return html5`
          ${maybeRenderCrossOriginStatus(
      info.coep,
      i18n13.i18n.lockedString("Cross-Origin Embedder Policy (COEP)"),
      "None"
      /* Protocol.Network.CrossOriginEmbedderPolicyValue.None */
    )}
          ${maybeRenderCrossOriginStatus(
      info.coop,
      i18n13.i18n.lockedString("Cross-Origin Opener Policy (COOP)"),
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
  return html5`
      <devtools-report-key>${policyName}</devtools-report-key>
      <devtools-report-value>
        ${crossOriginValueToString(isEnabled ? info.value : info.reportOnlyValue)}
        ${isReportOnly ? html5`<span class="inline-comment">report-only</span>` : nothing3}
        ${endpoint ? html5`<span class="inline-name">${i18nString7(UIStrings7.reportingTo)}</span>${endpoint}` : nothing3}
      </devtools-report-value>
    `;
}
function renderEffectiveDirectives(directives) {
  const parsedDirectives = new CspEvaluator.CspParser.CspParser(directives).csp.directives;
  const result = [];
  for (const directive in parsedDirectives) {
    result.push(html5`
          <div>
            <span class="bold">${directive}</span>
            ${": " + parsedDirectives[directive]?.join(", ")}
          </div>`);
  }
  return result;
}
function renderSingleCSP(cspInfo, divider) {
  return html5`
      <devtools-report-key>
        ${cspInfo.isEnforced ? i18n13.i18n.lockedString("Content-Security-Policy") : html5`
          ${i18n13.i18n.lockedString("Content-Security-Policy-Report-Only")}
          <devtools-button
            .iconName=${"help"}
            class='help-button'
            .accessibleLabel=${i18nString7(UIStrings7.learnMore)}
            .variant=${"icon"}
            .size=${"SMALL"}
            @click=${() => {
    UIHelpers.openInNewTab("https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only");
  }}
            jslog=${VisualLogging3.link("learn-more.csp-report-only").track({ click: true })}
            ></devtools-button>`}
      </devtools-report-key>
      <devtools-report-value>
        ${cspInfo.source === "HTTP" ? i18n13.i18n.lockedString("HTTP header") : i18n13.i18n.lockedString("Meta tag")}
        ${renderEffectiveDirectives(cspInfo.effectiveDirectives)}
      </devtools-report-value>
      ${divider ? html5`<devtools-report-divider class="subsection-divider"></devtools-report-divider>` : nothing3}
    `;
}
function renderCSPSection(cspInfos) {
  return html5`
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section-header>
        ${i18nString7(UIStrings7.contentSecurityPolicy)}
      </devtools-report-section-header>
      ${cspInfos?.length ? cspInfos.map((cspInfo, index) => renderSingleCSP(cspInfo, index < cspInfos?.length - 1)) : html5`
        <devtools-report-key>
          ${i18n13.i18n.lockedString("Content-Security-Policy")}
        </devtools-report-key>
        <devtools-report-value>
          ${i18nString7(UIStrings7.none)}
        </devtools-report-value>
      `}
    `;
}
function renderApiAvailabilitySection(frame) {
  if (!frame) {
    return nothing3;
  }
  return html5`
      <devtools-report-section-header>
        ${i18nString7(UIStrings7.apiAvailability)}
      </devtools-report-section-header>
      <devtools-report-section>
        <span class="report-section">
          ${i18nString7(UIStrings7.availabilityOfCertainApisDepends)}
          <devtools-link
            href="https://web.dev/why-coop-coep/" class="link"
            jslogcontext="learn-more.coop-coep">
            ${i18nString7(UIStrings7.learnMore)}
          </devtools-link>
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
              return html5`
                  <span class="inline-comment">
                    ${i18nString7(UIStrings7.willRequireCrossoriginIsolated)}
                  </span>`;
            }
            return html5`<span class="inline-comment">${i18nString7(UIStrings7.requiresCrossoriginIsolated)}</span>`;
          case "NotIsolatedFeatureDisabled":
            if (!sabTransferAvailable) {
              return html5`
                  <span class="inline-comment">
                    ${i18nString7(UIStrings7.transferRequiresCrossoriginIsolatedPermission)}
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
      const availabilityText = sabTransferAvailable ? i18nString7(UIStrings7.availableTransferable) : sabAvailable ? i18nString7(UIStrings7.availableNotTransferable) : i18nString7(UIStrings7.unavailable);
      const tooltipText = sabTransferAvailable ? i18nString7(UIStrings7.sharedarraybufferConstructorIs) : sabAvailable ? i18nString7(UIStrings7.sharedarraybufferConstructorIsAvailable) : "";
      return html5`
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
    const availabilityText = measureMemoryAvailable ? i18nString7(UIStrings7.available) : i18nString7(UIStrings7.unavailable);
    const tooltipText = measureMemoryAvailable ? i18nString7(UIStrings7.thePerformanceAPI) : i18nString7(UIStrings7.thePerformancemeasureuseragentspecificmemory);
    return html5`
        <devtools-report-key>${i18nString7(UIStrings7.measureMemory)}</devtools-report-key>
        <devtools-report-value>
          <span title=${tooltipText}>${availabilityText}</span>\xA0<devtools-link class="link" href="https://web.dev/monitor-total-page-memory-usage/" jslogcontext="learn-more.monitor-memory-usage">${i18nString7(UIStrings7.learnMore)}</devtools-link>
        </devtools-report-value>
      `;
  }
  return nothing3;
}
function renderAdditionalInfoSection(frame) {
  if (!frame) {
    return nothing3;
  }
  return html5`
      <devtools-report-section-header
        title=${i18nString7(UIStrings7.thisAdditionalDebugging)}
      >${i18nString7(UIStrings7.additionalInformation)}</devtools-report-section-header>
      <devtools-report-key>${i18nString7(UIStrings7.frameId)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title=${frame.id}>${frame.id}</div>
      </devtools-report-value>
      <devtools-report-divider></devtools-report-divider>
    `;
}
var FrameDetailsReportView = class extends UI8.Widget.Widget {
  #frame;
  #target = null;
  #creationStackTrace = null;
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
    this.#protocolMonitorExperimentEnabled = Root.Runtime.experiments.isEnabled(Root.ExperimentNames.ExperimentName.PROTOCOL_MONITOR);
    this.#view = view;
  }
  set frame(frame) {
    this.#frame = frame;
    void this.#frame.getPermissionsPolicyState().then((permissionsPolicies) => {
      this.#permissionsPolicies = permissionsPolicies;
      this.requestUpdate();
    });
    const { creationStackTrace: rawCreationStackTrace, creationStackTraceTarget: creationTarget } = frame.getCreationStackTraceData();
    if (rawCreationStackTrace) {
      void Bindings2.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(rawCreationStackTrace, creationTarget).then((creationStackTrace) => {
        this.#creationStackTrace = creationStackTrace;
        this.requestUpdate();
      });
    }
    const networkManager = frame.resourceTreeModel().target().model(SDK7.NetworkManager.NetworkManager);
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
      this.#target = this.#frame?.resourceTreeModel().target() ?? null;
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
    for (const project of Workspace2.Workspace.WorkspaceImpl.instance().projects()) {
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
import * as SDK8 from "./../../core/sdk/sdk.js";
var DEFAULT_BUCKET = "";
var IndexedDBModel = class _IndexedDBModel extends SDK8.SDKModel.SDKModel {
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
    this.storageBucketModel = target.model(SDK8.StorageBucketsModel.StorageBucketsModel);
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
      const storageBucket = this.storageBucketModel?.getBucketByName(storageKey, storageBucketName)?.bucket;
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
        const storageBucket = this.storageBucketModel?.getBucketByName(storageKey, storageBucketName)?.bucket;
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
    const runtimeModel = this.target().model(SDK8.RuntimeModel.RuntimeModel);
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
};
SDK8.SDKModel.SDKModel.register(IndexedDBModel, { capabilities: 8192, autostart: false });
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
  IDBDataView: () => IDBDataView,
  IDBDatabaseView: () => IDBDatabaseView,
  IDB_DATA_VIEW_DEFAULT_VIEW: () => IDB_DATA_VIEW_DEFAULT_VIEW,
  ObjectPropertiesSectionWidget: () => ObjectPropertiesSectionWidget
});
import "./../../ui/components/report_view/report_view.js";
import "./../../ui/legacy/legacy.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as SDK9 from "./../../core/sdk/sdk.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as DataGrid3 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import { Directives as Directives3, html as html6, nothing as nothing4, render as render6 } from "./../../ui/lit/lit.js";
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

.indexed-db-data-view devtools-data-grid {
  border: 0;
  flex: auto;
}

:host-context(.indexed-db-data-view) .data-grid .data-container tr:nth-last-child(1) {
  background-color: var(--sys-color-cdt-base-container);
}

:host-context(.indexed-db-data-view) .data-grid .data-container tr:nth-last-child(1) td {
  border: 0;
}

:host-context(.indexed-db-data-view) .data-grid .data-container tr:nth-last-child(2) td {
  border-bottom: 1px solid var(--sys-color-divider);
}

:host-context(.indexed-db-data-view) .data-grid:focus .data-container tr.selected {
  background-color: var(--sys-color-tonal-container);
  color: inherit;
}

:host-context(.indexed-db-data-view) .section,
:host-context(.indexed-db-data-view) .section > .header,
:host-context(.indexed-db-data-view) .section > .header .title {
  margin: 0;
  min-height: inherit;
  line-height: inherit;
}

:host-context(.indexed-db-data-view) .data-grid .data-container td .section .header .title {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.indexed-db-key-path {
  color: var(--sys-color-error);
  white-space: pre-wrap;
  unicode-bidi: isolate;
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

.object-store-summary-bar .separator {
  padding: 0 0.5em;
}

.key-filter-input {
  flex-grow: 0.5;
}

.stale-data-warning {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
}

.stale-data-warning .warning-icon {
  --icon-color: var(--icon-warning);

  width: 20px;
  height: 20px;
}

.data-grid-container {
  flex: auto;
  display: flex;
  flex-direction: column;
}

/*# sourceURL=${import.meta.resolve("./indexedDBViews.css")} */`;

// gen/front_end/panels/application/IndexedDBViews.js
var UIStrings8 = {
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
var str_8 = i18n15.i18n.registerUIStrings("panels/application/IndexedDBViews.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var { repeat } = Directives3;
var { widget: widget4 } = UI9.Widget;
var IDBDatabaseView = class extends ApplicationComponents5.StorageMetadataView.StorageMetadataView {
  model;
  database;
  constructor(model, database) {
    super();
    this.model = model;
    this.setShowOnlyBucket(true);
    if (database) {
      this.update(database);
    }
  }
  getTitle() {
    return this.database?.databaseId.name;
  }
  async renderReportContent() {
    if (!this.database) {
      return nothing4;
    }
    return html6`
      ${await super.renderReportContent()}
      ${this.key(i18nString8(UIStrings8.version))}
      ${this.value(this.database.version.toString())}
      ${this.key(i18nString8(UIStrings8.objectStores))}
      ${this.value(this.database.objectStores.size.toString())}
      <devtools-report-divider></devtools-report-divider>
      <devtools-report-section>
      <devtools-button
          aria-label=${i18nString8(UIStrings8.deleteDatabase)}
          .variant=${"outlined"}
          @click=${this.deleteDatabase}
          jslog=${VisualLogging4.action("delete-database").track({
      click: true
    })}>
        ${i18nString8(UIStrings8.deleteDatabase)}
      </devtools-button>&nbsp;
      <devtools-button
          aria-label=${i18nString8(UIStrings8.refreshDatabase)}
          .variant=${"outlined"}
          @click=${this.refreshDatabaseButtonClicked}
          jslog=${VisualLogging4.action("refresh-database").track({
      click: true
    })}>
        ${i18nString8(UIStrings8.refreshDatabase)}
      </devtools-button>
      </devtools-report-section>
      `;
  }
  refreshDatabaseButtonClicked() {
    this.model.refreshDatabase(this.database.databaseId);
  }
  update(database) {
    this.database = database;
    const bucketInfo = this.model.target().model(SDK9.StorageBucketsModel.StorageBucketsModel)?.getBucketByName(database.databaseId.storageBucket.storageKey, database.databaseId.storageBucket.name);
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
    const ok = await UI9.UIUtils.ConfirmDialog.show(i18nString8(UIStrings8.databaseWillBeRemoved), i18nString8(UIStrings8.confirmDeleteDatabase, { PH1: this.database.databaseId.name }), this, { jslogContext: "delete-database-confirmation" });
    if (ok) {
      void this.model.deleteDatabase(this.database.databaseId);
    }
  }
  wasShown() {
    super.wasShown();
  }
};
customElements.define("devtools-idb-database-view", IDBDatabaseView);
var renderKeyPathString = (keyPathString) => {
  return html6`"<span class="source-code indexed-db-key-path">${keyPathString}</span>"`;
};
var renderKeyColumnHeader = (prefix, keyPath) => {
  if (keyPath === void 0 || keyPath === null || keyPath === "") {
    return html6`${prefix}`;
  }
  return html6`
    ${prefix} (${i18nString8(UIStrings8.keyPath)}${Array.isArray(keyPath) ? html6`[${keyPath.map((path, i) => html6`${i > 0 ? ", " : ""}${renderKeyPathString(path)}`)}]` : renderKeyPathString(keyPath)})`;
};
var populateContextMenu = (e) => {
  const row = e.currentTarget;
  const widgetElement = row.querySelector(".value-column devtools-widget");
  const widget12 = widgetElement ? UI9.Widget.Widget.get(widgetElement) : null;
  if (widget12?.objectTree) {
    const contextMenu = e.detail;
    contextMenu.revealSection().appendItem(i18nString8(UIStrings8.expandRecursively), () => {
      void widget12.expandRecursively();
    }, { jslogContext: "expand-recursively" });
    contextMenu.revealSection().appendItem(i18nString8(UIStrings8.collapse), () => {
      widget12.expanded = false;
    }, { jslogContext: "collapse" });
  }
};
var renderDataGrid = (input) => {
  const keyPath = input.isIndex && input.index ? input.index.keyPath : input.objectStore.keyPath;
  return html6`<devtools-data-grid striped style="flex: auto;" name=${i18nString8(UIStrings8.indexedDb)} .template=${html6`
    <style>${indexedDBViews_css_default}</style>
    <table>
      <tr>
        <th id="number" fixed width="50px">#</th>
        <th id="key">${renderKeyColumnHeader(i18nString8(UIStrings8.keyString), keyPath)}</th>
        ${input.isIndex ? html6`<th id="primary-key">${renderKeyColumnHeader(i18nString8(UIStrings8.primaryKey), input.objectStore.keyPath)}</th>` : nothing4}
        <th id="value">${i18nString8(UIStrings8.valueString)}</th>
      </tr>
      ${repeat(input.entries, (_entry, index) => index, (entry, index) => {
    return html6`
          <tr ?selected=${index + input.skipCount === input.selectedRowNumber}
              class="data-grid-data-row"
              @select=${() => input.onRowSelected(index + input.skipCount)}
              @delete=${() => input.deleteEntry(entry)}
              @contextmenu=${populateContextMenu}>
            <td>${index + input.skipCount}</td>
            <td>${widget4(ObjectPropertiesSectionWidget, { value: entry.key })}</td>
            ${input.isIndex ? html6`<td>${widget4(ObjectPropertiesSectionWidget, { value: entry.primaryKey })}</td>` : nothing4}
            <td class="value-column">${widget4(ObjectPropertiesSectionWidget, { value: entry.value })}</td>
          </tr>`;
  })}
    </table>`}>
  </devtools-data-grid>`;
};
var renderToolbar = (input) => {
  return html6`
    <devtools-toolbar class="data-view-toolbar" jslog=${VisualLogging4.toolbar()}>
      <devtools-button
        class="toolbar-button"
        .iconName=${"refresh"}
        .title=${i18nString8(UIStrings8.refresh)}
        jslog=${VisualLogging4.action("refresh").track({ click: true })}
        @click=${input.refreshButtonClicked}
        .variant=${"toolbar"}
      ></devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${"clear"}
        .title=${i18nString8(UIStrings8.clearObjectStore)}
        jslog=${VisualLogging4.action("clear-all").track({ click: true })}
        @click=${input.clearButtonClicked}
        .disabled=${input.isIndex || !input.clearButtonEnabled}
        .variant=${"toolbar"}>
      </devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${"bin"}
        .title=${i18nString8(UIStrings8.deleteSelected)}
        jslog=${VisualLogging4.action("delete-selected").track({ click: true })}
        @click=${input.deleteButtonClicked}
        .disabled=${input.selectedRowNumber < 0 || input.entries.length === 0}
        .variant=${"toolbar"}>
      </devtools-button>

      <div class="toolbar-divider"></div>

      <devtools-button
        class="toolbar-button"
        .iconName=${"triangle-left"}
        .title=${i18nString8(UIStrings8.showPreviousPage)}
        .disabled=${input.skipCount <= 0}
        @click=${input.pageBackButtonClicked}
        .variant=${"toolbar"}>
      </devtools-button>
      <devtools-button
        class="toolbar-button"
        .iconName=${"triangle-right"}
        .title=${i18nString8(UIStrings8.showNextPage)}
        .disabled=${!input.hasMore}
        @click=${input.pageForwardButtonClicked}
        .variant=${"toolbar"}>
      </devtools-button>

      <devtools-toolbar-input
        type="filter"
        placeholder=${i18nString8(UIStrings8.filterByKey)}
        class="key-filter-input"
        .value=${input.keyFilter}
        @change=${(e) => {
    input.onKeyFilterChange(e.detail);
  }}>
      </devtools-toolbar-input>

      ${input.needsRefreshVisible ? html6`
        <div class="toolbar-divider"></div>
        <div class="toolbar-item stale-data-warning" title=${i18nString8(UIStrings8.someEntriesMayHaveBeenModified)}>
          <devtools-icon name="warning" class="warning-icon"></devtools-icon>
          <span>${i18nString8(UIStrings8.dataMayBeStale)}</span>
        </div>
      ` : nothing4}
    </devtools-toolbar>`;
};
var renderSummaryBar = (input) => {
  const metadata = input.metadata;
  if (!metadata) {
    return nothing4;
  }
  return html6`
    <div class="object-store-summary-bar">
      <span>${i18nString8(UIStrings8.totalEntriesS, { PH1: String(metadata.entriesCount) })}</span>
      ${input.objectStore.autoIncrement ? html6`
        <span class="separator">\u2758</span>
        <span>${i18nString8(UIStrings8.keyGeneratorValueS, { PH1: String(metadata.keyGeneratorValue) })}</span>` : nothing4}
    </div>`;
};
var IDB_DATA_VIEW_DEFAULT_VIEW = (input, _output, target) => {
  render6(html6`
    ${renderToolbar(input)}
    <div class="data-grid-container">
      ${renderDataGrid(input)}
    </div>
    ${renderSummaryBar(input)}
  `, target, { container: { classes: ["indexed-db-data-view", "storage-view"] } });
};
var IDBDataView = class extends UI9.View.SimpleView {
  model;
  databaseId;
  isIndex;
  refreshObjectStoreCallback;
  clearingObjectStore;
  pageSize;
  skipCount;
  // Used in Web Tests
  entries;
  #hasMore = false;
  #selectedRowNumber = -1;
  #needsRefreshVisible = false;
  #clearButtonEnabled = true;
  #metadata = null;
  #keyFilter = "";
  objectStore;
  index;
  lastPageSize;
  lastSkipCount;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastKey;
  #view;
  constructor(model, databaseId, objectStore, index, refreshObjectStoreCallback, view = IDB_DATA_VIEW_DEFAULT_VIEW) {
    super({
      title: i18nString8(UIStrings8.idb),
      viewId: "idb",
      jslog: `${VisualLogging4.pane("indexed-db-data-view")}`
    });
    this.#view = view;
    this.registerRequiredCSS(indexedDBViews_css_default);
    this.registerRequiredCSS(DataGrid3.dataGridStyles);
    this.model = model;
    this.databaseId = databaseId;
    this.isIndex = Boolean(index);
    this.refreshObjectStoreCallback = refreshObjectStoreCallback;
    this.clearingObjectStore = false;
    this.pageSize = 50;
    this.skipCount = 0;
    this.entries = [];
    this.update(objectStore, index);
  }
  pageBackButtonClicked() {
    this.skipCount = Math.max(0, this.skipCount - this.pageSize);
    this.updateData(false);
  }
  pageForwardButtonClicked() {
    this.skipCount = this.skipCount + this.pageSize;
    this.updateData(false);
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
    this.#selectedRowNumber = -1;
    this.skipCount = 0;
    this.updateData(true);
    this.performUpdate();
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
    const key = this.parseKey(this.#keyFilter);
    const pageSize = this.pageSize;
    let skipCount = this.skipCount;
    const selected = this.#selectedRowNumber !== -1 ? this.#selectedRowNumber : 0;
    this.#selectedRowNumber = Math.max(selected, this.skipCount);
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
      this.entries = entries;
      this.#hasMore = hasMore;
      this.#needsRefreshVisible = false;
      if (this.entries.length === 0) {
        this.#selectedRowNumber = -1;
      } else {
        this.#selectedRowNumber = Math.min(this.#selectedRowNumber, this.skipCount + this.entries.length - 1);
        if (this.#selectedRowNumber < this.skipCount) {
          this.#selectedRowNumber = -1;
        }
      }
      this.performUpdate();
      this.updatedDataForTests();
    }
    const idbKeyRange = key ? window.IDBKeyRange.lowerBound(key) : null;
    if (this.isIndex && this.index) {
      this.model.loadIndexData(this.databaseId, this.objectStore.name, this.index.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    } else {
      this.model.loadObjectStoreData(this.databaseId, this.objectStore.name, idbKeyRange, skipCount, pageSize, callback.bind(this));
    }
    void this.model.getMetadata(this.databaseId, this.objectStore).then((metadata) => {
      this.#metadata = metadata;
      this.performUpdate();
    });
  }
  updatedDataForTests() {
  }
  refreshButtonClicked() {
    this.updateData(true);
  }
  async clearButtonClicked() {
    const ok = await UI9.UIUtils.ConfirmDialog.show(
      i18nString8(UIStrings8.objectStoreWillBeCleared),
      i18nString8(UIStrings8.confirmClearObjectStore, { PH1: this.objectStore.name }),
      // TODO(b/407750537): Fix the linter false positive
      // eslint-disable-next-line @devtools/no-imperative-dom-api
      this.element,
      { jslogContext: "clear-object-store-confirmation" }
    );
    if (ok) {
      this.#clearButtonEnabled = false;
      this.performUpdate();
      this.clearingObjectStore = true;
      await this.model.clearObjectStore(this.databaseId, this.objectStore.name);
      this.clearingObjectStore = false;
      this.#clearButtonEnabled = true;
      this.performUpdate();
      this.updateData(true);
    }
  }
  markNeedsRefresh() {
    if (this.clearingObjectStore) {
      return;
    }
    this.#needsRefreshVisible = true;
    this.performUpdate();
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
  async deleteButtonClicked() {
    if (this.#selectedRowNumber < 0) {
      return;
    }
    const entry = this.entries[this.#selectedRowNumber - this.skipCount];
    if (entry) {
      await this.deleteEntry(entry);
    }
  }
  async deleteEntry(entry) {
    const key = this.isIndex ? entry.primaryKey : entry.key;
    const keyValue = key.subtype === "array" ? await this.resolveArrayKey(key) : key.value;
    await this.model.deleteEntries(this.databaseId, this.objectStore.name, window.IDBKeyRange.only(keyValue));
    this.refreshObjectStoreCallback();
  }
  clear() {
    this.entries = [];
    this.#selectedRowNumber = -1;
    this.performUpdate();
  }
  onRowSelected(rowNumber) {
    this.#selectedRowNumber = rowNumber;
    this.performUpdate();
  }
  performUpdate() {
    this.#view({
      isIndex: this.isIndex,
      index: this.index,
      objectStore: this.objectStore,
      entries: this.entries,
      skipCount: this.skipCount,
      selectedRowNumber: this.#selectedRowNumber,
      clearButtonEnabled: this.#clearButtonEnabled,
      hasMore: this.#hasMore,
      keyFilter: this.#keyFilter,
      needsRefreshVisible: this.#needsRefreshVisible,
      metadata: this.#metadata,
      refreshButtonClicked: this.refreshButtonClicked.bind(this),
      clearButtonClicked: this.clearButtonClicked.bind(this),
      deleteButtonClicked: this.deleteButtonClicked.bind(this),
      pageBackButtonClicked: this.pageBackButtonClicked.bind(this),
      pageForwardButtonClicked: this.pageForwardButtonClicked.bind(this),
      onKeyFilterChange: (value) => {
        this.#keyFilter = value;
        this.updateData(false);
      },
      onRowSelected: this.onRowSelected.bind(this),
      deleteEntry: this.deleteEntry.bind(this)
    }, void 0, this.element);
  }
};
var OBJECT_PROPERTIES_SECTION_WIDGET_DEFAULT_VIEW = (input, output, target) => {
  if (!input.objectTree) {
    render6(nothing4, target);
    return;
  }
  render6(ObjectUI.ObjectPropertiesSection.defaultObjectPresentation(
    input.objectTree,
    void 0,
    true,
    true
    /* readOnly */
  ), target);
};
var ObjectPropertiesSectionWidget = class extends UI9.Widget.Widget {
  #objectTree = null;
  #view;
  constructor(element, view = OBJECT_PROPERTIES_SECTION_WIDGET_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  set value(value) {
    if (value) {
      this.#objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(value, {
        readOnly: true,
        propertiesMode: 1
      });
    } else {
      this.#objectTree = null;
    }
    this.requestUpdate();
  }
  get objectTree() {
    return this.#objectTree;
  }
  get expanded() {
    return this.#objectTree?.expanded ?? false;
  }
  set expanded(expanded) {
    if (this.#objectTree) {
      this.#objectTree.expanded = expanded;
      this.requestUpdate();
    }
  }
  async expandRecursively() {
    if (this.#objectTree) {
      await this.#objectTree.expandRecursively(ObjectUI.ObjectPropertiesSection.EXPANDABLE_MAX_DEPTH);
      this.requestUpdate();
    }
  }
  performUpdate() {
    this.#view({ objectTree: this.#objectTree }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/OpenedWindowDetailsView.js
var OpenedWindowDetailsView_exports = {};
__export(OpenedWindowDetailsView_exports, {
  OpenedWindowDetailsView: () => OpenedWindowDetailsView,
  WorkerDetailsView: () => WorkerDetailsView
});
import * as Common7 from "./../../core/common/common.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as SDK10 from "./../../core/sdk/sdk.js";
import { createIcon as createIcon4 } from "./../../ui/kit/kit.js";
import * as UI10 from "./../../ui/legacy/legacy.js";

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
var UIStrings9 = {
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
var str_9 = i18n17.i18n.registerUIStrings("panels/application/OpenedWindowDetailsView.ts", UIStrings9);
var i18nString9 = i18n17.i18n.getLocalizedString.bind(void 0, str_9);
var booleanToYesNo = (b) => b ? i18nString9(UIStrings9.yes) : i18nString9(UIStrings9.no);
function linkifyIcon(iconType, title, eventHandler) {
  const icon = createIcon4(iconType, "icon-link devtools-link");
  const button = document.createElement("button");
  UI10.Tooltip.Tooltip.install(button, title);
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
  if (opener instanceof SDK10.ResourceTreeModel.ResourceTreeFrame) {
    openerFrame = opener;
  } else if (opener) {
    openerFrame = SDK10.FrameManager.FrameManager.instance().getFrame(opener);
  }
  if (!openerFrame) {
    return null;
  }
  const linkTargetDOMNode = await openerFrame.getOwnerDOMNodeOrDocument();
  if (!linkTargetDOMNode) {
    return null;
  }
  const linkElement = linkifyIcon("code-circle", i18nString9(UIStrings9.clickToOpenInElementsPanel), () => Common7.Revealer.reveal(linkTargetDOMNode));
  const label = document.createElement("span");
  label.textContent = `<${linkTargetDOMNode.nodeName().toLocaleLowerCase()}>`;
  linkElement.insertBefore(label, linkElement.firstChild);
  linkElement.addEventListener("mouseenter", () => {
    if (openerFrame) {
      void openerFrame.highlight();
    }
  });
  linkElement.addEventListener("mouseleave", () => {
    SDK10.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK10.TargetManager.TargetManager.instance());
  });
  return linkElement;
}
var OpenedWindowDetailsView = class extends UI10.Widget.VBox {
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
    this.reportView = new UI10.ReportView.ReportView(this.buildTitle());
    this.reportView.show(this.contentElement);
    this.reportView.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.reportView.element.classList.add("frame-details-report-container");
    this.documentSection = this.reportView.appendSection(i18nString9(UIStrings9.document));
    this.#urlFieldValue = this.documentSection.appendField(i18nString9(UIStrings9.url)).createChild("div", "text-ellipsis");
    this.securitySection = this.reportView.appendSection(i18nString9(UIStrings9.security));
    this.openerElementField = this.securitySection.appendField(i18nString9(UIStrings9.openerFrame));
    this.securitySection.setFieldVisible(i18nString9(UIStrings9.openerFrame), false);
    this.hasDOMAccessValue = this.securitySection.appendField(i18nString9(UIStrings9.accessToOpener));
    UI10.Tooltip.Tooltip.install(this.hasDOMAccessValue, i18nString9(UIStrings9.showsWhetherTheOpenedWindowIs));
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
      this.securitySection.setFieldVisible(i18nString9(UIStrings9.openerFrame), true);
      return;
    }
    this.securitySection.setFieldVisible(i18nString9(UIStrings9.openerFrame), false);
  }
  buildTitle() {
    let title = this.targetInfo.title || i18nString9(UIStrings9.windowWithoutTitle);
    if (this.isWindowClosed) {
      title += ` (${i18nString9(UIStrings9.closed)})`;
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
var WorkerDetailsView = class extends UI10.Widget.VBox {
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
    this.reportView = new UI10.ReportView.ReportView(this.targetInfo.title || this.targetInfo.url || i18nString9(UIStrings9.worker));
    this.reportView.show(this.contentElement);
    this.reportView.registerRequiredCSS(openedWindowDetailsView_css_default);
    this.reportView.element.classList.add("frame-details-report-container");
    this.documentSection = this.reportView.appendSection(i18nString9(UIStrings9.document));
    const URLFieldValue = this.documentSection.appendField(i18nString9(UIStrings9.url)).createChild("div", "text-ellipsis");
    URLFieldValue.textContent = this.targetInfo.url;
    URLFieldValue.title = this.targetInfo.url;
    const workerType = this.documentSection.appendField(i18nString9(UIStrings9.type));
    workerType.textContent = this.workerTypeToString(this.targetInfo.type);
    this.isolationSection = this.reportView.appendSection(i18nString9(UIStrings9.securityIsolation));
    this.coepPolicy = this.isolationSection.appendField(i18nString9(UIStrings9.crossoriginEmbedderPolicy));
    this.requestUpdate();
  }
  workerTypeToString(type) {
    if (type === "worker") {
      return i18nString9(UIStrings9.webWorker);
    }
    if (type === "service_worker") {
      return i18n17.i18n.lockedString("Service Worker");
    }
    return i18nString9(UIStrings9.unknown);
  }
  async updateCoopCoepStatus() {
    const target = SDK10.TargetManager.TargetManager.instance().targetById(this.targetInfo.targetId);
    if (!target) {
      return;
    }
    const model = target.model(SDK10.NetworkManager.NetworkManager);
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
      reportingEndpointPrefix.textContent = i18nString9(UIStrings9.reportingTo);
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
import * as i18n23 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon5 } from "./../../ui/kit/kit.js";
import * as PreloadingHelper2 from "./preloading/helper/helper.js";

// gen/front_end/panels/application/preloading/PreloadingView.js
var PreloadingView_exports = {};
__export(PreloadingView_exports, {
  PreloadingAttemptView: () => PreloadingAttemptView,
  PreloadingRuleSetView: () => PreloadingRuleSetView,
  PreloadingSummaryView: () => PreloadingSummaryView,
  applyFilterText: () => applyFilterText
});
import "./../../ui/kit/kit.js";
import "./../../ui/legacy/legacy.js";
import * as Common8 from "./../../core/common/common.js";
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined2 } from "./../../core/platform/platform.js";
import * as SDK12 from "./../../core/sdk/sdk.js";
import * as TextUtils from "./../../core/text_utils/text_utils.js";
import * as Buttons5 from "./../../ui/components/buttons/buttons.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import { Directives as Directives4, html as html7, render as render7 } from "./../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";
import * as PreloadingComponents from "./preloading/components/components.js";

// gen/front_end/panels/application/preloading/components/PreloadingString.js
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";
import * as SDK11 from "./../../core/sdk/sdk.js";
import * as Bindings3 from "./../../models/bindings/bindings.js";
var UIStrings10 = {
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
  PrefetchFailedMIMENotSupported: "The prefetch failed because the response\u2019s Content-Type header was not supported.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNetError.
   */
  PrefetchFailedNetError: "The prefetch failed because of a network error.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNon2XX.
   */
  PrefetchFailedNon2XX: "The prefetch failed because of a non-2xx HTTP response status code.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNon2XX when the HTTP status code is known.
   * @example {404} PH1
   */
  PrefetchFailedNon2XXWithStatusCode: "The prefetch failed because of a non-2xx HTTP response status code ({PH1}).",
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
   * @description Description text for PrerenderFinalStatus::kNavigationBadHttpStatus when the HTTP status code is known.
   * @example {404} PH1
   */
  prerenderFinalStatusNavigationBadHttpStatusWithStatusCode: "The prerendering navigation failed because of a non-2xx HTTP response status code ({PH1}).",
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
  prerenderFinalStatusActivatedDuringMainFrameNavigation: "Prerendered page activated during initiating page\u2019s main frame navigation.",
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
  prerenderFinalStatusSpeculationRuleRemoved: 'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from `<script type="speculationrules">`.',
  /**
   * Description text for PrerenderFinalStatus::kActivatedWithAuxiliaryBrowsingContexts.
   */
  prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts: "The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded: 'The prerender whose eagerness is "`eager`" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "`eager`" to enable further prerendering.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEmbedderPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded: "The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningNonEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded: 'The old non-eager prerender (with a "`moderate`" or "`conservative`" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',
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
var str_10 = i18n19.i18n.registerUIStrings("panels/application/preloading/components/PreloadingString.ts", UIStrings10);
var i18nLazyString = i18n19.i18n.getLazilyComputedLocalizedString.bind(void 0, str_10);
var i18nString10 = i18n19.i18n.getLocalizedString.bind(void 0, str_10);
var PrefetchReasonDescription = {
  PrefetchFailedIneligibleRedirect: { name: i18nLazyString(UIStrings10.PrefetchFailedIneligibleRedirect) },
  PrefetchFailedInvalidRedirect: { name: i18nLazyString(UIStrings10.PrefetchFailedInvalidRedirect) },
  PrefetchFailedMIMENotSupported: { name: i18nLazyString(UIStrings10.PrefetchFailedMIMENotSupported) },
  PrefetchFailedNetError: { name: i18nLazyString(UIStrings10.PrefetchFailedNetError) },
  PrefetchFailedNon2XX: { name: i18nLazyString(UIStrings10.PrefetchFailedNon2XX) },
  PrefetchIneligibleRetryAfter: { name: i18nLazyString(UIStrings10.PrefetchIneligibleRetryAfter) },
  PrefetchIsPrivacyDecoy: { name: i18nLazyString(UIStrings10.PrefetchIsPrivacyDecoy) },
  PrefetchIsStale: { name: i18nLazyString(UIStrings10.PrefetchIsStale) },
  PrefetchNotEligibleBrowserContextOffTheRecord: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleBrowserContextOffTheRecord) },
  PrefetchNotEligibleDataSaverEnabled: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleDataSaverEnabled) },
  PrefetchNotEligibleExistingProxy: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleExistingProxy) },
  PrefetchNotEligibleHostIsNonUnique: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleHostIsNonUnique) },
  PrefetchNotEligibleNonDefaultStoragePartition: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleNonDefaultStoragePartition) },
  PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy) },
  PrefetchNotEligibleSchemeIsNotHttps: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleSchemeIsNotHttps) },
  PrefetchNotEligibleUserHasCookies: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleUserHasCookies) },
  PrefetchNotEligibleUserHasServiceWorker: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleUserHasServiceWorker) },
  PrefetchNotUsedCookiesChanged: { name: i18nLazyString(UIStrings10.PrefetchNotUsedCookiesChanged) },
  PrefetchProxyNotAvailable: { name: i18nLazyString(UIStrings10.PrefetchProxyNotAvailable) },
  PrefetchNotUsedProbeFailed: { name: i18nLazyString(UIStrings10.PrefetchNotUsedProbeFailed) },
  PrefetchEvictedForNewerPrefetch: { name: i18nLazyString(UIStrings10.PrefetchEvictedForNewerPrefetch) },
  PrefetchEvictedAfterCandidateRemoved: { name: i18nLazyString(UIStrings10.PrefetchEvictedAfterCandidateRemoved) },
  PrefetchNotEligibleBatterySaverEnabled: { name: i18nLazyString(UIStrings10.PrefetchNotEligibleBatterySaverEnabled) },
  PrefetchNotEligiblePreloadingDisabled: { name: i18nLazyString(UIStrings10.PrefetchNotEligiblePreloadingDisabled) },
  PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler: { name: () => i18n19.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectFromServiceWorker: { name: () => i18n19.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectToServiceWorker: { name: () => i18n19.i18n.lockedString("Unknown") },
  PrefetchEvictedAfterBrowsingDataRemoved: { name: i18nLazyString(UIStrings10.PrefetchEvictedAfterBrowsingDataRemoved) },
  PrefetchNotEligibleBlockedByConnectionAllowlist: { name: () => i18n19.i18n.lockedString("Unknown") },
  PrefetchCancelledOnUserNavigation: { name: () => i18n19.i18n.lockedString("Unknown") },
  PrefetchNotEligibleCrossOrigin: { name: () => i18n19.i18n.lockedString("Unknown") }
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
function capitalizedAction(action6) {
  switch (action6) {
    case "Prefetch":
      return i18n19.i18n.lockedString("Prefetch");
    case "Prerender":
      return i18n19.i18n.lockedString("Prerender");
    case "PrerenderUntilScript":
      return i18n19.i18n.lockedString("Prerender until script");
  }
}

// gen/front_end/panels/application/preloading/PreloadingView.js
import * as PreloadingHelper from "./preloading/helper/helper.js";

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

  .toolbar-filter {
    max-width: var(--sys-size-29);
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
var { createRef, ref: ref2 } = Directives4;
var { widget: widget5 } = UI11.Widget;
var UIStrings11 = {
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
var str_11 = i18n21.i18n.registerUIStrings("panels/application/preloading/PreloadingView.ts", UIStrings11);
var i18nString11 = i18n21.i18n.getLocalizedString.bind(void 0, str_11);
var SPECULATION_EXPLANATION_URL = "https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules";
var AllRuleSetRootId = Symbol("AllRuleSetRootId");
var PreloadingUIUtils = class {
  static status(status) {
    switch (status) {
      case "NotTriggered":
        return i18nString11(UIStrings11.statusNotTriggered);
      case "Pending":
        return i18nString11(UIStrings11.statusPending);
      case "Running":
        return i18nString11(UIStrings11.statusRunning);
      case "Ready":
        return i18nString11(UIStrings11.statusReady);
      case "Success":
        return i18nString11(UIStrings11.statusSuccess);
      case "Failure":
        return i18nString11(UIStrings11.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case "NotSupported":
        return i18n21.i18n.lockedString("Internal error");
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
        return i18nString11(UIStrings11.validityValid);
      case "SourceIsNotJsonObject":
      case "InvalidRulesetLevelTag":
        return i18nString11(UIStrings11.validityInvalid);
      case "InvalidRulesSkipped":
        return i18nString11(UIStrings11.validitySomeRulesInvalid);
    }
  }
  // Where a rule set came from, shown in grid.
  static location(ruleSet) {
    if (ruleSet.backendNodeId !== void 0) {
      return i18n21.i18n.lockedString("<script>");
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
  return SDK12.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() || "";
}
var PreloadingRuleSetView = class extends UI11.Widget.VBox {
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
    SDK12.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
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
    render7(html7`
        <div class="empty-state">
          <span class="empty-state-header">${i18nString11(UIStrings11.noRulesDetected)}</span>
          <div class="empty-state-description">
            <span>${i18nString11(UIStrings11.rulesDescription)}</span>
            <devtools-link
              class="devtools-link"
              href=${SPECULATION_EXPLANATION_URL}
              jslogcontext="learn-more"
            >${i18nString11(UIStrings11.learnMore)}</devtools-link>
          </div>
        </div>
        <devtools-split-view sidebar-position="second">
          <div slot="main" ${ref2(this.ruleSetGridContainerRef)}>
          </div>
          <div slot="sidebar" jslog=${VisualLogging5.section("rule-set-details")}>
            <devtools-widget ${widget5(PreloadingComponents.RuleSetDetailsView.RuleSetDetailsView, {
      ruleSet: this.getRuleSet(),
      shouldPrettyPrint: this.shouldPrettyPrint
    })} ${ref2(this.ruleSetDetailsRef)}></devtools-widget>
          </div>
        </devtools-split-view>
        <div class="pretty-print-button" style="border-top: 1px solid var(--sys-color-divider)">
        <devtools-button
          .iconName=${"brackets"}
          .toggledIconName=${"brackets"}
          .toggled=${this.shouldPrettyPrint}
          .toggleType=${"primary-toggle"}
          .title=${i18nString11(UIStrings11.prettyPrint)}
          .variant=${"icon_toggle"}
          .size=${"REGULAR"}
          @click=${onPrettyPrintToggle}
          jslog=${VisualLogging5.action().track({ click: true }).context("preloading-status-panel-pretty-print")}></devtools-button>
        </div>`, this.contentElement, { host: this });
    this.hsplit = this.contentElement.querySelector("devtools-split-view");
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
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
    const widget12 = this.ruleSetDetailsRef.value?.getWidget();
    if (widget12) {
      widget12.shouldPrettyPrint = this.shouldPrettyPrint;
      widget12.ruleSet = ruleSet;
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
function applyFilterText(filterText, rows) {
  const trimmedFilter = filterText.trim();
  if (trimmedFilter === "") {
    return rows;
  }
  const FILTER_KEYS = ["url", "action", "status"];
  const parser = new TextUtils.TextUtils.FilterParser([...FILTER_KEYS]);
  const query = parser.parse(filterText.toLowerCase());
  const lastTerm = query.at(-1);
  if (!lastTerm) {
    return rows;
  }
  const isKeyWithNoValue = (lastTerm.key === void 0 || lastTerm.key === null) && FILTER_KEYS.some((key) => lastTerm.text === `${key}:`);
  if (isKeyWithNoValue) {
    query.pop();
  }
  if (query.length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    const attempt = row.pipeline.getOriginallyTriggered();
    const url = attempt.key.url.toLowerCase();
    const action6 = capitalizedAction(attempt.action).toLowerCase();
    const status = PreloadingUIUtils.status(attempt.status).toLowerCase();
    return query.every((term) => {
      if (term.text === void 0 || term.text === null || term.text === "") {
        return true;
      }
      const searchText = term.text.toLowerCase();
      const key = term.key;
      switch (key) {
        case "url":
          return url.includes(searchText);
        case "action":
          return action6.includes(searchText);
        case "status": {
          const statusValues = searchText.split(",");
          return statusValues.some((v) => status.includes(v));
        }
        case void 0:
          return url.includes(searchText) || action6.includes(searchText) || status.includes(searchText);
        default:
          return false;
      }
    });
  });
}
var PreloadingAttemptView = class extends UI11.Widget.VBox {
  model;
  // Note that we use id of (representative) preloading attempt while we show pipelines in grid.
  // This is because `NOT_TRIGGERED` preloading attempts don't have pipeline id and we can use it.
  focusedPreloadingAttemptId = null;
  warningsContainer;
  warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  preloadingGrid = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  preloadingGridContainer;
  renderContainer;
  ruleSetSelector;
  textFilterUI;
  hsplit;
  clearButton;
  constructor(model) {
    super({
      jslog: `${VisualLogging5.pane("preloading-speculations")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(emptyWidget_css_default, preloadingView_css_default);
    this.model = model;
    SDK12.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
      Object.assign(this.warningsView, e.data);
    }, this, { scoped: true });
    this.warningsContainer = document.createElement("div");
    this.warningsContainer.classList.add("flex-none");
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);
    const vbox = new UI11.Widget.VBox();
    const toolbar8 = vbox.contentElement.createChild("devtools-toolbar", "preloading-toolbar");
    toolbar8.setAttribute("jslog", `${VisualLogging5.toolbar()}`);
    this.ruleSetSelector = new PreloadingRuleSetSelector(() => this.render());
    toolbar8.appendToolbarItem(this.ruleSetSelector.item());
    this.textFilterUI = new UI11.Toolbar.ToolbarFilter(void 0, 1, 1);
    this.textFilterUI.addEventListener("TextChanged", this.onTextFilterChanged, this);
    toolbar8.appendToolbarItem(this.textFilterUI);
    toolbar8.appendToolbarItem(new UI11.Toolbar.ToolbarSeparator());
    this.clearButton = new UI11.Toolbar.ToolbarButton("Clear speculative loads", "clear", void 0, "clear-speculative-loads");
    this.clearButton.addEventListener("Click", () => {
      const model2 = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
      if (!model2) {
        return;
      }
      model2.reset();
      this.textFilterUI.setValue("");
      this.ruleSetSelector.select(null);
      this.render();
    });
    toolbar8.appendToolbarItem(this.clearButton);
    this.preloadingGrid.onSelect = this.onPreloadingGridCellFocused.bind(this);
    this.preloadingGridContainer = document.createElement("div");
    this.preloadingGridContainer.className = "preloading-grid-widget-container";
    this.preloadingGridContainer.style.height = "100%";
    this.preloadingGrid.show(this.preloadingGridContainer, null, true);
    this.renderContainer = vbox.contentElement;
    vbox.show(this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
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
    this.textFilterUI.setValue("");
    this.render();
  }
  onTextFilterChanged() {
    this.render();
  }
  getPreloadingDetailsData() {
    const id = this.focusedPreloadingAttemptId;
    const preloadingAttempt = id === null ? null : this.model.getPreloadingAttemptById(id);
    if (preloadingAttempt === null) {
      return null;
    }
    const pipeline = this.model.getPipeline(preloadingAttempt);
    const ruleSets = preloadingAttempt.ruleSetIds.map((id2) => this.model.getRuleSetById(id2)).filter((x) => x !== null);
    return {
      pipeline,
      ruleSets,
      pageURL: pageURL()
    };
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
      const statusCode = PreloadingHelper.PreloadingForward.preloadStatusCode(attempt);
      return {
        id,
        pipeline,
        ruleSets,
        statusCode
      };
    });
    const filteredRows = applyFilterText(this.textFilterUI.valueWithoutSuggestion(), rows);
    this.preloadingGrid.rows = filteredRows;
    this.preloadingGrid.pageURL = pageURL();
    const wasEmpty = this.contentElement.classList.contains("empty");
    const isEmpty = rows.length === 0;
    this.contentElement.classList.toggle("empty", isEmpty);
    if (wasEmpty && !isEmpty) {
      this.hsplit?.doLayout();
    }
    render7(html7`
      <div class="empty-state">
        <span class="empty-state-header">${i18nString11(UIStrings11.noPrefetchAttempts)}</span>
        <div class="empty-state-description">
          <span>${i18nString11(UIStrings11.prefetchDescription)}</span>
          <devtools-link
            class="devtools-link"
            href=${SPECULATION_EXPLANATION_URL}
            jslogcontext="learn-more"
          >${i18nString11(UIStrings11.learnMore)}</devtools-link>
        </div>
      </div>
      <devtools-split-view sidebar-position="second" ${UI11.Widget.widgetRef(UI11.SplitWidget.SplitWidget, (w) => {
      this.hsplit = w;
    })}>
        <div slot="main" class="overflow-auto" style="height: 100%">
          ${this.preloadingGridContainer}
        </div>
        <div slot="sidebar" class="overflow-auto" style="height: 100%">
          ${widget5(PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView, {
      data: this.getPreloadingDetailsData()
    })}
        </div>
      </devtools-split-view>
      `, this.renderContainer, { host: this });
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
    const widgetElement = this.renderContainer.querySelector('div[slot="sidebar"] devtools-widget');
    const widget12 = widgetElement?.getWidget();
    assertNotNullOrUndefined2(widget12);
    return widget12;
  }
  selectRuleSetOnFilterForTest(id) {
    this.ruleSetSelector.select(id);
  }
};
var PreloadingSummaryView = class extends UI11.Widget.VBox {
  model;
  warningsContainer;
  warningsView = new PreloadingComponents.PreloadingDisabledInfobar.PreloadingDisabledInfobar();
  usedPreloading = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  constructor(model) {
    super({
      jslog: `${VisualLogging5.pane("speculative-loads")}`,
      useShadowDom: true
    });
    this.registerRequiredCSS(emptyWidget_css_default, preloadingView_css_default);
    this.model = model;
    SDK12.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "ModelUpdated", this.render, this, { scoped: true });
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "WarningsUpdated", (e) => {
      Object.assign(this.warningsView, e.data);
    }, this, { scoped: true });
    this.warningsContainer = document.createElement("div");
    this.warningsContainer.classList.add("flex-none");
    this.contentElement.insertBefore(this.warningsContainer, this.contentElement.firstChild);
    this.warningsView.show(this.warningsContainer);
    this.usedPreloading.show(this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.warningsView.wasShown();
    this.render();
  }
  onScopeChange() {
    const model = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    this.render();
  }
  render() {
    this.usedPreloading.data = {
      pageURL: SDK12.TargetManager.TargetManager.instance().scopeTarget()?.inspectedURL() || "",
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
    const model = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined2(model);
    this.model = model;
    SDK12.TargetManager.TargetManager.instance().addScopeChangeListener(this.onScopeChange.bind(this));
    SDK12.TargetManager.TargetManager.instance().addModelListener(SDK12.PreloadingModel.PreloadingModel, "ModelUpdated", this.onModelUpdated, this, { scoped: true });
    this.listModel = new UI11.ListModel.ListModel();
    this.dropDown = new UI11.SoftDropDown.SoftDropDown(this.listModel, this);
    this.dropDown.setRowHeight(36);
    this.dropDown.setPlaceholderText(i18nString11(UIStrings11.filterAllPreloads));
    this.toolbarItem = new UI11.Toolbar.ToolbarItem(this.dropDown.element);
    this.toolbarItem.setTitle(i18nString11(UIStrings11.filterFilterByRuleSet));
    this.toolbarItem.element.classList.add("toolbar-has-dropdown");
    this.toolbarItem.element.setAttribute("jslog", `${VisualLogging5.action("filter-by-rule-set").track({ click: true })}`);
    this.onModelUpdated();
    this.onSelectionChanged = onSelectionChanged;
  }
  onScopeChange() {
    const model = SDK12.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK12.PreloadingModel.PreloadingModel);
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
      return i18nString11(UIStrings11.filterAllPreloads);
    }
    const ruleSet = this.model.getRuleSetById(convertedId);
    if (ruleSet === null) {
      return i18n21.i18n.lockedString("Internal error");
    }
    return ruleSetTagOrLocationShort(ruleSet, pageURL());
  }
  subtitleFor(id) {
    const convertedId = this.translateItemIdToRuleSetId(id);
    const countsByStatus = this.model.getPreloadCountsByRuleSetId().get(convertedId) || /* @__PURE__ */ new Map();
    return PreloadingUIUtils.preloadsStatusSummary(countsByStatus) || `(${i18nString11(UIStrings11.noRuleSets)})`;
  }
  // Method for UI.SoftDropDown.Delegate<Protocol.Preload.RuleSetId|typeof AllRuleSetRootId>
  createElementForItem(id) {
    const element = document.createElement("div");
    const shadowRoot = UI11.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: preloadingViewDropDown_css_default });
    const title = shadowRoot.createChild("div", "title");
    UI11.UIUtils.createTextChild(title, Platform4.StringUtilities.trimEndWithMaxLength(this.titleFor(id), 100));
    const subTitle = shadowRoot.createChild("div", "subtitle");
    UI11.UIUtils.createTextChild(subTitle, this.subtitleFor(id));
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
var UIStrings12 = {
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
var str_12 = i18n23.i18n.registerUIStrings("panels/application/PreloadingTreeElement.ts", UIStrings12);
var i18nString12 = i18n23.i18n.getLocalizedString.bind(void 0, str_12);
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
    super(panel, i18nString12(UIStrings12.speculativeLoads), "", "", "preloading");
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
      const filter = new PreloadingHelper2.PreloadingForward.AttemptViewWithFilter(null);
      this.expandAndRevealAttempts(filter);
    } else if (this.#ruleSet.selected) {
      const filter = new PreloadingHelper2.PreloadingForward.RuleSetView(null);
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
    super(panel, PreloadingRuleSetView, "preloading://rule-set", i18nString12(UIStrings12.rules));
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
    super(panel, PreloadingAttemptView, "preloading://attempt", i18nString12(UIStrings12.speculations));
  }
  revealAttempts(filter) {
    this.select();
    this.view?.setFilter(filter);
  }
};

// gen/front_end/panels/application/ReportingApiTreeElement.js
var ReportingApiTreeElement_exports = {};
__export(ReportingApiTreeElement_exports, {
  CrashReportContextTreeElement: () => CrashReportContextTreeElement,
  ReportingApiTreeElement: () => ReportingApiTreeElement,
  i18nString: () => i18nString15
});
import * as i18n29 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon6 } from "./../../ui/kit/kit.js";
import * as UI14 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/application/CrashReportContextView.js
var CrashReportContextView_exports = {};
__export(CrashReportContextView_exports, {
  CrashReportContextView: () => CrashReportContextView,
  DEFAULT_VIEW: () => DEFAULT_VIEW4
});
import "./../../ui/legacy/legacy.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as SDK13 from "./../../core/sdk/sdk.js";
import * as Buttons6 from "./../../ui/components/buttons/buttons.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
import { html as html8, render as render8 } from "./../../ui/lit/lit.js";
import * as VisualLogging6 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents6 from "./components/components.js";
var UIStrings13 = {
  /**
   * @description Placeholder text when no context is detected.
   */
  noContext: "No context entries detected across frames.",
  /**
   * @description Fallback label when a frame has no URL.
   */
  unknownFrame: "Unknown Frame",
  /**
   * @description Placeholder for a search field in a toolbar
   */
  filterByText: "Filter by key or value",
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh"
};
var str_13 = i18n25.i18n.registerUIStrings("panels/application/CrashReportContextView.ts", UIStrings13);
var i18nString13 = i18n25.i18n.getLocalizedString.bind(void 0, str_13);
var DEFAULT_VIEW4 = (input, _output, target) => {
  const { widget: widget12 } = UI12.Widget;
  render8(html8`
    <style>${UI12.inspectorCommonStyles}</style>
    <style>
      .crash-report-context-view {
        padding-top: 5px;
        overflow: auto;
      }

      .frame-section {
        margin-top: var(--sys-size-8);
      }

      .frame-section:first-child {
        margin-top: 0;
      }

      .frame-header {
        display: flex;
        align-items: center;
        padding: var(--sys-size-4) var(--sys-size-6);
        gap: var(--sys-size-6);
        background-color: var(--sys-color-surface2);
        border-bottom: 1px solid var(--sys-color-divider);
      }

      .frame-url {
        font-weight: var(--ref-typeface-weight-bold);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--default-font-family);
      }


      .toolbar-container {
        border-bottom: 1px solid var(--sys-color-divider);
        background-color: var(--sys-color-cdt-base-container);
      }
    </style>
    <div class="vbox flex-auto" jslog=${VisualLogging6.pane("crash-report-context")}>
      <devtools-toolbar class="crash-report-context-toolbar" role="toolbar" jslog=${VisualLogging6.toolbar()}>
        <devtools-button title=${i18nString13(UIStrings13.refresh)}
                         @click=${input.onRefresh}
                         .iconName=${"refresh"}
                         .variant=${"toolbar"}
                         jslog=${VisualLogging6.action("refresh").track({
    click: true
  })}>
        </devtools-button>
        <devtools-toolbar-input type="filter" placeholder=${i18nString13(UIStrings13.filterByText)}
            @change=${(e) => input.onFilterChanged(e)} class="flex-auto">
        </devtools-toolbar-input>
      </devtools-toolbar>
      ${input.frames.length > 0 ? html8`
        <div class="crash-report-context-view flex-auto">
          ${input.frames.map((frame) => html8`
            <div class="frame-section">
              <div class="frame-header">
                <span class="frame-url" title="URL: ${frame.url}\nFrame ID: ${frame.frameId}">${frame.displayName}</span>
              </div>
              <div class="grid-container">
                <devtools-widget
                  ${widget12(ApplicationComponents6.CrashReportContextGrid.CrashReportContextGrid, {
    data: {
      entries: frame.entries.map((e) => ({ key: e.key, value: e.value })),
      selectedKey: input.selectedKey || void 0,
      filters: input.filters
    }
  })}
                  @select=${(e) => input.onRowSelected(e.detail)}>
                </devtools-widget>
              </div>
            </div>
          `)}
        </div>
      ` : html8`
        ${widget12(UI12.EmptyWidget.EmptyWidget, {
    header: i18nString13(UIStrings13.noContext)
  })}
      `}
    </div>
  `, target);
};
var CrashReportContextView = class extends UI12.Widget.VBox {
  selectedKey = null;
  #view;
  #filters = [];
  constructor(view = DEFAULT_VIEW4) {
    super();
    this.#view = view;
    this.requestUpdate();
  }
  async performUpdate() {
    const models = SDK13.TargetManager.TargetManager.instance().models(SDK13.CrashReportContextModel.CrashReportContextModel);
    const allEntries = (await Promise.all(models.map((model) => model.getEntries()))).flat().filter((entry) => entry !== null);
    const frameData = this.#processFrameData(allEntries);
    this.#view({
      frames: frameData,
      selectedKey: this.selectedKey,
      filters: this.#filters,
      onRowSelected: (key) => {
        this.selectedKey = key;
        this.requestUpdate();
      },
      onRefresh: () => {
        this.requestUpdate();
      },
      onFilterChanged: (e) => {
        const text = e.detail;
        const textFilterRegExp = text ? Platform5.StringUtilities.createPlainTextSearchRegex(text, "i") : null;
        if (textFilterRegExp) {
          this.#filters = [
            { key: "key,value", regex: textFilterRegExp, negative: false }
          ];
        } else {
          this.#filters = [];
        }
        this.requestUpdate();
      }
    }, void 0, this.contentElement);
  }
  #processFrameData(allEntries) {
    if (allEntries.length === 0) {
      return [];
    }
    const entriesByFrame = Map.groupBy(allEntries, (entry) => entry.frameId);
    return [...entriesByFrame.entries()].map(([frameId, frameEntries]) => {
      const frame = SDK13.FrameManager.FrameManager.instance().getFrame(frameId);
      const url = frame?.url || i18nString13(UIStrings13.unknownFrame);
      const displayName = frame?.displayName() || url;
      return {
        url,
        frameId,
        displayName,
        isMain: frame?.isMainFrame() ?? false,
        origin: frame?.securityOrigin || "",
        entries: frameEntries
      };
    }).sort((a, b) => {
      if (a.isMain && !b.isMain) {
        return -1;
      }
      if (!a.isMain && b.isMain) {
        return 1;
      }
      return 0;
    }).map((data) => ({
      url: data.url,
      frameId: data.frameId,
      displayName: data.displayName,
      entries: data.entries
    }));
  }
};

// gen/front_end/panels/application/ReportingApiView.js
var ReportingApiView_exports = {};
__export(ReportingApiView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  ReportingApiView: () => ReportingApiView,
  i18nString: () => i18nString14
});
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as SDK14 from "./../../core/sdk/sdk.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
import { html as html9, render as render9 } from "./../../ui/lit/lit.js";
import * as VisualLogging7 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents7 from "./components/components.js";
var { widget: widget6 } = UI13.Widget;
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
var DEFAULT_VIEW5 = (input, output, target) => {
  if (input.hasReports || input.hasEndpoints) {
    render9(html9`
      <style>${UI13.inspectorCommonStyles}</style>
      <devtools-split-view sidebar-position="second" sidebar-initial-size="150" jslog=${VisualLogging7.pane("reporting-api")}>
        ${input.hasReports ? html9`
          <devtools-split-view slot="main" sidebar-position="second" sidebar-initial-size="150">
            <div slot="main">
              ${widget6(ApplicationComponents7.ReportsGrid.ReportsGrid, {
      reports: input.reports,
      onReportSelected: input.onReportSelected
    })}
            </div>
            <div slot="sidebar" class="vbox" jslog=${VisualLogging7.pane("preview").track({ resize: true })}>
              ${input.focusedReport ? widget6(SourceFrame.JSONView.SearchableJsonView, { jsonObject: input.focusedReport.body }) : widget6(UI13.EmptyWidget.EmptyWidget, {
      header: i18nString14(UIStrings14.noReportSelected),
      text: i18nString14(UIStrings14.clickToDisplayBody)
    })}
            </div>
          </devtools-split-view>
        ` : html9`
          <div slot="main">
            ${widget6(ApplicationComponents7.ReportsGrid.ReportsGrid, {
      reports: input.reports,
      onReportSelected: input.onReportSelected
    })}
          </div>
        `}
        <div slot="sidebar">
          ${widget6(ApplicationComponents7.EndpointsGrid.EndpointsGrid, {
      endpoints: input.endpoints
    })}
        </div>
      </devtools-split-view>
    `, target);
  } else {
    render9(html9`
      <devtools-widget ${widget6(UI13.EmptyWidget.EmptyWidget, {
      header: i18nString14(UIStrings14.noReportOrEndpoint),
      text: i18nString14(UIStrings14.reportingApiDescription),
      link: REPORTING_API_EXPLANATION_URL
    })} jslog=${VisualLogging7.pane("reporting-api-empty")}></devtools-widget>
    `, target);
  }
};
var ReportingApiView = class extends UI13.Widget.VBox {
  #endpoints;
  #view;
  #networkManager;
  #reports = [];
  #focusedReport;
  constructor(view = DEFAULT_VIEW5) {
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
  reportingApi: "Reporting API",
  /**
   * @description Label for the Crash Report Context child item in the Reporting API section.
   */
  crashReportContext: "Crash Report Context"
};
var str_15 = i18n29.i18n.registerUIStrings("panels/application/ReportingApiTreeElement.ts", UIStrings15);
var i18nString15 = i18n29.i18n.getLocalizedString.bind(void 0, str_15);
var ReportingApiTreeElement = class extends ApplicationPanelTreeElement {
  view;
  #childrenInitialized = false;
  constructor(storagePanel) {
    super(storagePanel, i18nString15(UIStrings15.reportingApi), true, "reporting-api");
    const icon = createIcon6("document");
    this.setLeadingIcons([icon]);
  }
  onattach() {
    super.onattach();
    if (!this.#childrenInitialized) {
      this.#childrenInitialized = true;
      this.appendChild(new CrashReportContextTreeElement(this.resourcesPanel));
    }
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
    UI14.UIUserMetrics.UIUserMetrics.instance().panelShown("reporting-api");
    return false;
  }
};
var CrashReportContextTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString15(UIStrings15.crashReportContext), false, "crash-report-context");
    const icon = createIcon6("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "reportingApi://crash-report-context";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new CrashReportContextView();
    }
    this.view.requestUpdate();
    this.showView(this.view);
    UI14.UIUserMetrics.UIUserMetrics.instance().panelShown("crash-report-context");
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

.device-bound-session-terminated {
  text-decoration: line-through;
}

.no-device-bound-session {
  font-style: italic;
}

.ai-button-container {
  display: none;
  position: absolute;
  z-index: 999;
  right: var(--sys-size-3);
}

.tree-outline li:hover .ai-button-container {
  display: inline-flex;
}

.tree-outline li.ads-tree-element .trailing-icons {
  margin-left: auto;
  margin-right: var(--sys-size-2);
}

/*# sourceURL=${import.meta.resolve("./resourcesSidebar.css")} */`;

// gen/front_end/panels/application/ServiceWorkerCacheTreeElement.js
var ServiceWorkerCacheTreeElement_exports = {};
__export(ServiceWorkerCacheTreeElement_exports, {
  SWCacheTreeElement: () => SWCacheTreeElement,
  ServiceWorkerCacheTreeElement: () => ServiceWorkerCacheTreeElement
});
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as SDK16 from "./../../core/sdk/sdk.js";
import { createIcon as createIcon7 } from "./../../ui/kit/kit.js";
import * as UI16 from "./../../ui/legacy/legacy.js";

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
import * as Platform6 from "./../../core/platform/platform.js";
import * as SDK15 from "./../../core/sdk/sdk.js";
import * as TextUtils3 from "./../../core/text_utils/text_utils.js";
import * as DataGrid4 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
import * as VisualLogging8 from "./../../ui/visual_logging/visual_logging.js";
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
var ServiceWorkerCacheView = class extends UI15.View.SimpleView {
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
    this.splitWidget = new UI15.SplitWidget.SplitWidget(false, false);
    this.splitWidget.show(this.element);
    this.previewPanel = new UI15.Widget.VBox();
    const resizer = this.previewPanel.element.createChild("div", "cache-preview-panel-resizer");
    this.splitWidget.setMainWidget(this.previewPanel);
    this.splitWidget.installResizer(resizer);
    this.preview = null;
    this.cache = cache;
    const bucketInfo = this.model.target().model(SDK15.StorageBucketsModel.StorageBucketsModel)?.getBucketByName(cache.storageBucket.storageKey, cache.storageBucket.name);
    this.metadataView.setShowOnlyBucket(true);
    if (bucketInfo) {
      this.metadataView.setStorageBucket(bucketInfo);
    } else if (cache.storageKey) {
      this.metadataView.setStorageKey(cache.storageKey);
    }
    this.dataGrid = null;
    this.refreshThrottler = new Common9.Throttler.Throttler(300);
    this.refreshButton = new UI15.Toolbar.ToolbarButton(i18nString16(UIStrings16.refresh), "refresh", void 0, "cache-storage.refresh");
    this.refreshButton.addEventListener("Click", this.refreshButtonClicked, this);
    editorToolbar.appendToolbarItem(this.refreshButton);
    this.deleteSelectedButton = new UI15.Toolbar.ToolbarButton(i18nString16(UIStrings16.deleteSelected), "cross", void 0, "cache-storage.delete-selected");
    this.deleteSelectedButton.addEventListener("Click", (_event) => {
      void this.deleteButtonClicked(null);
    });
    editorToolbar.appendToolbarItem(this.deleteSelectedButton);
    const entryPathFilterBox = new UI15.Toolbar.ToolbarFilter(i18nString16(UIStrings16.filterByPath), 1);
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
    dataGridWidget.setMinimumSize(0, 100);
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
      preview = new UI15.EmptyWidget.EmptyWidget(i18nString16(UIStrings16.noCacheEntrySelected), i18nString16(UIStrings16.selectACacheEntryAboveToPreview));
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
    const dataGrid = new DataGrid4.DataGrid.DataGridImpl({
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
    const request = SDK15.NetworkRequest.NetworkRequest.createWithoutBackendRequest("cache-storage-" + entry.requestURL, entry.requestURL, Platform6.DevToolsPath.EmptyUrlString, null);
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
      const result = Platform6.MimeType.parseContentType(header.value);
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
    return new TextUtils3.ContentData.ContentData(
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
var DataGridNode = class extends DataGrid4.DataGrid.DataGridNode {
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
      this.name = Platform6.StringUtilities.trimURL(request.url(), parsed.domain());
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
    DataGrid4.DataGrid.DataGridImpl.setElementText(
      cell,
      value || "",
      /* longText= */
      true,
      gridNode
    );
    UI15.Tooltip.Tooltip.install(cell, tooltip);
    return cell;
  }
};
var RequestView = class extends UI15.Widget.VBox {
  tabbedPane;
  resourceViewTabSetting;
  constructor(request) {
    super();
    this.tabbedPane = new UI15.TabbedPane.TabbedPane();
    this.tabbedPane.element.setAttribute("jslog", `${VisualLogging8.section("network-item-preview")}`);
    this.tabbedPane.addEventListener(UI15.TabbedPane.Events.TabSelected, this.tabSelected, this);
    this.resourceViewTabSetting = Common9.Settings.Settings.instance().createSetting("cache-storage-view-tab", "preview");
    const requestHeadersView = new Network.RequestHeadersView.RequestHeadersView();
    requestHeadersView.request = request;
    this.tabbedPane.appendTab("headers", i18nString16(UIStrings16.headers), requestHeadersView);
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
  swCacheModelObserver;
  storageBucket;
  constructor(resourcesPanel, storageBucket) {
    super(resourcesPanel, i18nString17(UIStrings17.cacheStorage), i18nString17(UIStrings17.noCacheStorage), i18nString17(UIStrings17.cacheStorageDescription), "cache-storage");
    const icon = createIcon7("database");
    this.setLink("https://developer.chrome.com/docs/devtools/storage/cache/");
    this.setLeadingIcons([icon]);
    this.swCacheModels = /* @__PURE__ */ new Set();
    this.swCacheTreeElements = /* @__PURE__ */ new Set();
    this.storageBucket = storageBucket;
    this.initialize();
  }
  initialize() {
    this.removeChildren();
    this.swCacheModels.clear();
    this.swCacheTreeElements.clear();
    if (this.swCacheModelObserver) {
      SDK16.TargetManager.TargetManager.instance().unobserveModels(SDK16.ServiceWorkerCacheModel.ServiceWorkerCacheModel, this.swCacheModelObserver);
    }
    this.swCacheModelObserver = {
      modelAdded: (model) => this.serviceWorkerCacheModelAdded(model),
      modelRemoved: (model) => this.serviceWorkerCacheModelRemoved(model)
    };
    SDK16.TargetManager.TargetManager.instance().observeModels(SDK16.ServiceWorkerCacheModel.ServiceWorkerCacheModel, this.swCacheModelObserver, { scoped: true });
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI16.ContextMenu.ContextMenu(event);
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
    const contextMenu = new UI16.ContextMenu.ContextMenu(event);
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
    UI16.UIUserMetrics.UIUserMetrics.instance().panelShown("service-worker-cache");
    return false;
  }
  hasModelAndCache(model, cache) {
    return this.cache.equals(cache) && this.model === model;
  }
};

// gen/front_end/panels/application/ServiceWorkersView.js
var ServiceWorkersView_exports = {};
__export(ServiceWorkersView_exports, {
  DEFAULT_SECTION_VIEW: () => DEFAULT_SECTION_VIEW,
  DEFAULT_VIEW: () => DEFAULT_VIEW7,
  Section: () => Section,
  ServiceWorkersView: () => ServiceWorkersView,
  setThrottleDisabledForDebugging: () => setThrottleDisabledForDebugging
});
import "./../../ui/components/report_view/report_view.js";
import "./../../ui/kit/kit.js";
import * as Common10 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n37 from "./../../core/i18n/i18n.js";
import * as SDK18 from "./../../core/sdk/sdk.js";
import * as NetworkForward2 from "./../network/forward/forward.js";
import * as Buttons7 from "./../../ui/components/buttons/buttons.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI18 from "./../../ui/legacy/legacy.js";
import { Directives as Directives5, html as html11, nothing as nothing6, render as render11 } from "./../../ui/lit/lit.js";
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

devtools-icon.error-icon {
  color: var(--sys-color-error-bright);
  height: var(--sys-size-7);
  margin-right: var(--sys-size-2);
  vertical-align: bottom;
  width: var(--sys-size-7);
}

.service-worker-toolbar {
  margin-left: var(--sys-size-4);
}

.report-field {
  display: flex;
  padding: var(--sys-size-3) 0;
}

.report-field-name {
  font: var(--sys-typescale-body5-medium);
  color: var(--sys-color-on-surface-subtle);
  flex: 0 0 128px;
  text-align: left;
  white-space: pre-wrap;
}

.report-field-value {
  font: var(--sys-typescale-body4-regular);
  flex: auto;
  padding: 0 var(--sys-size-6);
  white-space: normal;
  user-select: text;
}

.service-worker-section {
  border-bottom: 1px solid var(--sys-color-divider);
  grid-column: 1 / 3;
  padding: 0 var(--sys-size-9) 11px var(--sys-size-9);
}

.service-worker-section-container {
  display: contents;
}

devtools-widget {
  display: block;
}


/*# sourceURL=${import.meta.resolve("./serviceWorkersView.css")} */`;

// gen/front_end/panels/application/ServiceWorkerUpdateCycleView.js
var ServiceWorkerUpdateCycleView_exports = {};
__export(ServiceWorkerUpdateCycleView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW6,
  ServiceWorkerUpdateCycleView: () => ServiceWorkerUpdateCycleView
});
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as SDK17 from "./../../core/sdk/sdk.js";
import * as UI17 from "./../../ui/legacy/legacy.js";
import { html as html10, nothing as nothing5, render as render10 } from "./../../ui/lit/lit.js";
import * as VisualLogging9 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/serviceWorkerUpdateCycleView.css.js
var serviceWorkerUpdateCycleView_css_default = `/*
 * Copyright 2020 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
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

  .service-worker-update-timing-table > tbody > tr > td {
    padding: 4px 0;
    padding-right: 10px;
  }

  table.service-worker-update-timing-table > tbody > tr.service-worker-update-timing-table-header > td {
    border-top: 5px solid transparent;
    color: var(--sys-color-token-subtle);
  }

  table.service-worker-update-timing-table > tbody > tr.service-worker-update-timing-bar-details > td:first-child {
    padding-left: 12px;
  }

  table.service-worker-update-timing-table > tbody > tr.service-worker-update-timeline > td:first-child {
    padding-left: 12px;
  }
}

/*# sourceURL=${import.meta.resolve("./serviceWorkerUpdateCycleView.css")} */`;

// gen/front_end/panels/application/ServiceWorkerUpdateCycleView.js
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
var DEFAULT_VIEW6 = (input, _output, target) => {
  let tableRows = nothing5;
  if (input.timeRanges.length > 0) {
    const startTimes = input.timeRanges.map((r) => r.start);
    const endTimes = input.timeRanges.map((r) => r.end);
    const startTime = startTimes.reduce((a, b) => Math.min(a, b));
    const endTime = endTimes.reduce((a, b) => Math.max(a, b));
    const scale = 100 / (endTime - startTime);
    tableRows = html10`${input.timeRanges.map((range) => {
      const phaseName = range.phase;
      const left = scale * (range.start - startTime);
      const right = scale * (endTime - range.end);
      const key = `${range.id}-${range.phase}`;
      const expanded = input.expandedRows.has(key);
      return html10`
        <tr class="service-worker-update-timeline" jslog=${VisualLogging9.treeItem("update-timeline").track({
        click: true,
        resize: true,
        keydown: "ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Space"
      })}>
          <td class="service-worker-update-timing-bar-clickable" tabindex="0" role="switch"
              aria-checked=${expanded ? "true" : "false"}
              @focus=${input.onFocus}
              @keydown=${(e) => input.onKeydown(e, key)}
              @click=${(e) => input.onClick(e, key)}
              jslog=${VisualLogging9.expand("timing-info").track({ click: true })}>
            #${range.id}
          </td>
          <td>${phaseName}</td>
          <td>
            <div class="service-worker-update-timing-row">
              <span class="service-worker-update-timing-bar ${phaseName.toLowerCase()}"
                    style="left: ${left}%; right: ${right}%;">\u200B</span>
            </div>
          </td>
        </tr>
        <tr class="service-worker-update-timing-bar-details ${expanded ? "service-worker-update-timing-bar-details-expanded" : "service-worker-update-timing-bar-details-collapsed"}" tabindex="0">
          <td colspan="3"><span>${i18nString18(UIStrings18.startTimeS, { PH1: new Date(range.start).toISOString() })}</span></td>
        </tr>
        <tr class="service-worker-update-timing-bar-details ${expanded ? "service-worker-update-timing-bar-details-expanded" : "service-worker-update-timing-bar-details-collapsed"}" tabindex="0">
          <td colspan="3"><span>${i18nString18(UIStrings18.endTimeS, { PH1: new Date(range.end).toISOString() })}</span></td>
        </tr>
      `;
    })}`;
  }
  render10(html10`
    <style>${serviceWorkerUpdateCycleView_css_default}</style>
    <table class="service-worker-update-timing-table" jslog=${VisualLogging9.tree("update-timing-table")}>
      <tr class="service-worker-update-timing-table-header">
        <td>${i18nString18(UIStrings18.version)}</td>
        <td>${i18nString18(UIStrings18.updateActivity)}</td>
        <td>${i18nString18(UIStrings18.timeline)}</td>
      </tr>
      ${tableRows}
    </table>
  `, target);
};
var ServiceWorkerUpdateCycleView = class extends UI17.Widget.Widget {
  #registration;
  rows;
  selectedRowIndex;
  expandedRows = /* @__PURE__ */ new Set();
  #view;
  constructor(element, view = DEFAULT_VIEW6) {
    super(element);
    this.#view = view;
    this.rows = [];
    this.selectedRowIndex = -1;
  }
  set registration(registration) {
    this.#registration = registration;
    this.requestUpdate();
  }
  get registration() {
    return this.#registration;
  }
  set registrationFingerprint(_fingerprint) {
    this.requestUpdate();
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
    if (!this.#registration) {
      return [];
    }
    const versions = this.#registration.versionsByMode();
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
  performUpdate() {
    const timeRanges = this.calculateServiceWorkerUpdateRanges();
    const input = {
      timeRanges,
      expandedRows: this.expandedRows,
      onFocus: this.onFocus.bind(this),
      onKeydown: this.onKeydown.bind(this),
      onClick: this.onClick.bind(this)
    };
    this.#view(input, this, this.contentElement);
    this.rows = Array.from(this.contentElement.querySelectorAll(".service-worker-update-timeline"));
    if (this.selectedRowIndex >= this.rows.length) {
      this.selectedRowIndex = -1;
    }
  }
  toggle(key, expanded) {
    if (expanded) {
      this.expandedRows.delete(key);
    } else {
      this.expandedRows.add(key);
    }
    this.requestUpdate();
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
  onKeydown(event, key) {
    if (!event.target) {
      return;
    }
    const keyboardEvent = event;
    const expanded = this.expandedRows.has(key);
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      this.toggle(key, expanded);
      event.preventDefault();
      return;
    }
    if (!expanded && keyboardEvent.key === "ArrowRight" || expanded && keyboardEvent.key === "ArrowLeft") {
      this.toggle(key, expanded);
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
  onClick(event, key) {
    const expanded = this.expandedRows.has(key);
    this.toggle(key, expanded);
    event.preventDefault();
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
var { until } = Directives5;
var { widget: widget7 } = UI18.Widget;
var { bindToSetting } = UI18.UIUtils;
function renderToolbar2() {
  const updateOnReloadSetting = Common10.Settings.Settings.instance().createSetting("service-worker-update-on-reload", false);
  const bypassServiceWorkerSetting = Common10.Settings.Settings.instance().createSetting("bypass-service-worker", false);
  return html11`<devtools-toolbar class="service-worker-toolbar">
    ${MobileThrottling.ThrottlingManager.throttlingManager().createOfflineToolbarCheckbox().element}
    <devtools-checkbox title=${i18nString19(UIStrings19.onPageReloadForceTheService)}
                       ${bindToSetting(updateOnReloadSetting)}>
      ${i18nString19(UIStrings19.updateOnReload)}
    </devtools-checkbox>
    <devtools-checkbox title=${i18nString19(UIStrings19.bypassTheServiceWorkerAndLoad)}
                       ${bindToSetting(bypassServiceWorkerSetting)}>
      ${i18nString19(UIStrings19.bypassForNetwork)}
     </devtools-checkbox>
  </devtools-toolbar>`;
}
function renderOthersOriginView() {
  return html11`<div class="service-workers-other-origin"
                   jslog=${VisualLogging10.section("other-origin")}>
    <devtools-report>
      <devtools-report-section-header>
         ${i18nString19(UIStrings19.serviceWorkersFromOtherOrigins)}
      </devtools-report-section-header>
      <div class="service-worker-section">
         <devtools-link href="chrome://serviceworker-internals"
                        jslogcontext="view-all"
                        .allowPrivileged=${true}>
           ${i18nString19(UIStrings19.seeAllRegistrations)}
         </devtools-link>
      </div>
    </devtools-report>
  </div>`;
}
function getTimeStamp(registration) {
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
function renderOriginReport(input) {
  if (!input.canManageServiceWorkers) {
    return nothing6;
  }
  const sortedSections = [...input.sections];
  sortedSections.sort((a, b) => {
    const aTimestamp = getTimeStamp(a.registration);
    const bTimestamp = getTimeStamp(b.registration);
    return bTimestamp - aTimestamp;
  });
  return html11`<div class="service-workers-this-origin" jslog=${VisualLogging10.section("this-origin")}>
    <devtools-report .data=${{ reportTitle: i18n37.i18n.lockedString("Service workers") }}>
      <div class="service-worker-toolbar" slot="toolbar">${renderToolbar2()}</div>
      ${sortedSections.map((section8) => html11`<devtools-widget class="service-worker-section-container" ${widget7(Section, { section: section8 })}></devtools-widget>`)}
    </devtools-report>
  </div>`;
}
var DEFAULT_VIEW7 = (input, _output, target) => {
  render11(html11`
    <!-- This Origin Report -->
    ${renderOriginReport(input)}
    ${renderOthersOriginView()}`, target, {
    container: {
      classes: [
        "service-worker-list",
        input.sections.length > 0 ? "service-worker-has-current" : "service-worker-list-empty"
      ]
    }
  });
};
var throttleDisabledForDebugging = false;
var setThrottleDisabledForDebugging = (enable) => {
  throttleDisabledForDebugging = enable;
};
var ServiceWorkersView = class extends UI18.Widget.VBox {
  sections;
  manager;
  securityOriginManager;
  eventListeners;
  #output = void 0;
  #view;
  constructor(view = DEFAULT_VIEW7) {
    super({
      jslog: `${VisualLogging10.pane("service-workers")}`,
      useShadowDom: true
    });
    this.#view = view;
    this.registerRequiredCSS(serviceWorkersView_css_default);
    this.sections = /* @__PURE__ */ new Map();
    this.manager = null;
    this.securityOriginManager = null;
    this.eventListeners = /* @__PURE__ */ new Map();
    SDK18.TargetManager.TargetManager.instance().observeModels(SDK18.ServiceWorkerManager.ServiceWorkerManager, this);
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  async performUpdate() {
    if (this.manager) {
      for (const registration of this.manager.registrations().values()) {
        const isCurrent = this.isOriginCurrent(registration.securityOrigin);
        if (isCurrent && !this.sections.has(registration)) {
          this.sections.set(registration, { manager: this.manager, registration });
        } else if (!isCurrent && this.sections.has(registration)) {
          this.sections.delete(registration);
        }
      }
    }
    const input = {
      canManageServiceWorkers: this.manager !== null,
      sections: Array.from(this.sections.values()).map((data) => ({ ...data }))
    };
    this.#view(input, this.#output, this.contentElement);
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
      this.securityOriginManager.addEventListener(SDK18.SecurityOriginManager.Events.SecurityOriginAdded, this.requestUpdate, this),
      this.securityOriginManager.addEventListener(SDK18.SecurityOriginManager.Events.SecurityOriginRemoved, this.requestUpdate, this)
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
  isOriginCurrent(origin) {
    if (this.securityOriginManager && (this.securityOriginManager.securityOrigins().includes(origin) || this.securityOriginManager.unreachableMainSecurityOrigin() === origin)) {
      return true;
    }
    return false;
  }
  updateRegistration(registration, skipUpdate) {
    if (!this.manager) {
      return;
    }
    let sectionData = this.sections.get(registration);
    if (!sectionData) {
      if (!this.isOriginCurrent(registration.securityOrigin)) {
        return;
      }
      sectionData = { manager: this.manager, registration };
      this.sections.set(registration, sectionData);
    }
    if (skipUpdate) {
      return;
    }
    this.requestUpdate();
  }
  registrationDeleted(event) {
    this.removeRegistrationFromList(event.data);
  }
  removeRegistrationFromList(registration, skipVisibilityUpdate = false) {
    this.sections.delete(registration);
    if (!skipVisibilityUpdate) {
      this.requestUpdate();
    }
  }
  isRegistrationVisible(registration) {
    if (!registration.scopeURL) {
      return true;
    }
    return false;
  }
};
function renderHeaderButtons(input) {
  return html11`
    <devtools-button .data=${{
    variant: "text",
    title: i18nString19(UIStrings19.networkRequests),
    jslogContext: "show-network-requests"
  }}
        .disabled=${input.isDeleted}
        @click=${input.onNetworkRequests}>
      ${i18nString19(UIStrings19.networkRequests)}
    </devtools-button>
    <devtools-button .data=${{
    variant: "text",
    title: i18nString19(UIStrings19.update),
    jslogContext: "update"
  }}
        .disabled=${input.isDeleted}
        @click=${input.onUpdate}>
      ${i18nString19(UIStrings19.update)}
    </devtools-button>
    <devtools-button .data=${{
    variant: "text",
    title: i18nString19(UIStrings19.unregisterServiceWorker),
    jslogContext: "unregister"
  }}
        .disabled=${input.isDeleted}
        @click=${input.onUnregister}>
      ${i18nString19(UIStrings19.unregister)}
    </devtools-button>`;
}
function renderSyncNotificationField(label, initialValue, placeholder, callback, jslogContext) {
  return html11`
    <div class="report-field">
    <div class="report-field-name">${label}</div>
      <div class="report-field-value">
      <form class="service-worker-editor-with-button" @submit=${(e) => {
    const { editor } = e.target;
    callback(editor.value || "");
    e.consume(true);
  }}>
        <input name="editor" class="source-code service-worker-notification-editor harmony-input" type="text"
          .value=${initialValue}
          placeholder=${placeholder}
          aria-label=${label}
          .spellcheck=${false}
          jslog=${VisualLogging10.textField().track({ change: true }).context(jslogContext)}
        >
        <devtools-button .data=${{
    type: "submit",
    variant: "outlined",
    jslogContext
  }}>
          ${label}
        </devtools-button>
      </form>
      </div>
    </div>`;
}
function renderVersion(icon, label, content = nothing6) {
  return html11`
    <div class="service-worker-version">
      <div class=${icon}></div>
      <span class="service-worker-version-string" role="alert" aria-live="polite">
        ${label}
      </span>
      ${content}
    </div>`;
}
function renderClientsField(input, version) {
  if (!version?.controlledClients?.length) {
    return html11`<div class="report-field">
      <div class="report-field-name">${i18nString19(UIStrings19.clients)}</div>
      <div class="report-field-value"></div>
    </div>`;
  }
  return html11`<div class="report-field">
      <div class="report-field-name">${i18nString19(UIStrings19.clients)}</div>
      <div class="report-field-value">
      ${version.controlledClients.map((client) => html11`
        <div class="service-worker-client">
          ${until(input.renderClientInfo(client))}
       </div>`)}
    </div>
  </div>`;
}
function renderSourceField(input, version) {
  if (!version) {
    return html11`<div class="report-field">
      <div class="report-field-name">${i18nString19(UIStrings19.source)}</div>
      <div class="report-field-value"></div>
    </div>`;
  }
  const fileName = Common10.ParsedURL.ParsedURL.extractName(version.scriptURL);
  return html11`<div class="report-field">
    <div class="report-field-name">${i18nString19(UIStrings19.source)}</div>
    <div class="report-field-value">
      <div class="report-field-value-filename">
        ${Components3.Linkifier.Linkifier.renderLinkifiedUrl(version.scriptURL, {
    text: fileName,
    tabStop: true,
    jslogContext: "source-location"
  })}
        ${input.errorsLength ? html11`
          <button
              class="devtools-link link"
              tabindex="0"
              aria-label=${i18nString19(UIStrings19.sRegistrationErrors, { PH1: input.errorsLength })}
              @click=${() => Common10.Console.Console.instance().show()}>
            <devtools-icon name="cross-circle-filled" class="error-icon">
            </devtools-icon>
            ${input.errorsLength}
          </button>` : nothing6}
      </div>
      ${version.scriptResponseTime !== void 0 ? html11`
        <div class="report-field-value-subtitle">
          ${i18nString19(UIStrings19.receivedS, { PH1: new Date(version.scriptResponseTime * 1e3).toLocaleString() })}
        </div>
      ` : nothing6}
    </div>
  </div>`;
}
function renderStatusField(input, active, waiting, installing, redundant) {
  return html11`<div class="report-field">
    <div class="report-field-name">${i18nString19(UIStrings19.status)}</div>
    <div class="report-field-value">
      <div class="service-worker-version-stack">
        <div class="service-worker-version-stack-bar"></div>
        ${active ? renderVersion("service-worker-active-circle", i18nString19(UIStrings19.sActivatedAndIsS, {
    PH1: active.id,
    PH2: SDK18.ServiceWorkerManager.ServiceWorkerVersion.RunningStatus[active.currentState.runningStatus]()
  }), active.isRunning() || active.isStarting() ? html11`
              <devtools-button .data=${{
    jslogContext: "stop",
    variant: "outlined"
    /* Buttons.Button.Variant.OUTLINED */
  }}
                              @click=${() => input.onStop(active.id)}>
                  ${i18nString19(UIStrings19.stopString)}
              </devtools-button>` : active.isStartable() ? html11`
              <devtools-button .data=${{
    jslogContext: "start",
    variant: "outlined"
    /* Buttons.Button.Variant.OUTLINED */
  }}
                              @click=${input.onStart}>
                  ${i18nString19(UIStrings19.startString)}
              </devtools-button>` : nothing6) : redundant ? renderVersion("service-worker-redundant-circle", i18nString19(UIStrings19.sIsRedundant, { PH1: redundant.id })) : nothing6}
        ${waiting ? renderVersion("service-worker-waiting-circle", i18nString19(UIStrings19.sWaitingToActivate, { PH1: waiting.id }), html11`
              <devtools-button .data=${{
    jslogContext: "skip-waiting",
    title: i18n37.i18n.lockedString("skipWaiting"),
    variant: "outlined"
    /* Buttons.Button.Variant.OUTLINED */
  }}
                  @click=${input.onSkipWaiting}>
                ${i18n37.i18n.lockedString("skipWaiting")}
              </devtools-button>
              ${waiting.scriptResponseTime !== void 0 ? html11`
                <div class="service-worker-subtitle">
                  ${i18nString19(UIStrings19.receivedS, { PH1: new Date(waiting.scriptResponseTime * 1e3).toLocaleString() })}
                </div>
              ` : nothing6}
          `) : nothing6}
        ${installing ? renderVersion("service-worker-installing-circle", i18nString19(UIStrings19.sTryingToInstall, { PH1: installing.id }), installing.scriptResponseTime !== void 0 ? html11`
            <div class="service-worker-subtitle">
              ${i18nString19(UIStrings19.receivedS, { PH1: new Date(installing.scriptResponseTime * 1e3).toLocaleString() })}
            </div>` : nothing6) : nothing6}
      </div>
    </div>
  </div>`;
}
function renderUpdateCycleField(input) {
  return html11`
    <div class="report-field">
      <div class="report-field-name">${i18nString19(UIStrings19.updateCycle)}</div>
      <div class="report-field-value">
        ${widget7(ServiceWorkerUpdateCycleView, {
    registration: input.registration,
    registrationFingerprint: input.registration.fingerprint()
  })}
      </div>
    </div>`;
}
function renderRouterField(input) {
  const active = input.activeVersion;
  const title = i18nString19(UIStrings19.routers);
  if (active?.routerRules && active.routerRules.length > 0) {
    return html11`
      <div class="report-field">
        <div class="report-field-name">${title}</div>
        <div class="report-field-value">
          ${widget7(ApplicationComponents9.ServiceWorkerRouterView.ServiceWorkerRouterView, { rules: active.routerRules })}
        </div>
      </div>`;
  }
  return nothing6;
}
var DEFAULT_SECTION_VIEW = (input, _output, target) => {
  render11(html11`
      <style>${serviceWorkersView_css_default}</style>
      <devtools-report-section-header role="heading" aria-level="2"
              aria-label=${i18nString19(UIStrings19.serviceWorkerForS, { PH1: input.title })}>
        <span style="flex: 1 1 auto">${input.title}</span>
        ${renderHeaderButtons(input)}
      </devtools-report-section-header>
      <div class="service-worker-section">
         ${renderSourceField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderStatusField(input, input.activeVersion, input.waitingVersion, input.installingVersion, input.redundantVersion)}
         ${renderClientsField(input, input.activeVersion ?? input.redundantVersion)}
         ${renderSyncNotificationField(i18nString19(UIStrings19.pushString), input.pushData, i18nString19(UIStrings19.pushData), input.onPush, "push-message")}
         ${renderSyncNotificationField(i18nString19(UIStrings19.syncString), input.syncTag, i18nString19(UIStrings19.syncTag), input.onSync, "sync-tag")}
         ${renderSyncNotificationField(i18nString19(UIStrings19.periodicSync), input.periodicSyncTag, i18nString19(UIStrings19.periodicSyncTag), input.onPeriodicSync, "periodic-sync-tag")}
         ${renderUpdateCycleField(input)}
         ${renderRouterField(input)}
      </div>
  `, target);
};
var Section = class extends UI18.Widget.VBox {
  manager;
  registration;
  sectionInternal;
  fingerprint;
  pushNotificationDataSetting;
  syncTagNameSetting;
  periodicSyncTagNameSetting;
  clientInfoCache;
  throttler;
  #view;
  constructor(element, view = DEFAULT_SECTION_VIEW) {
    super(element);
    this.fingerprint = null;
    this.clientInfoCache = /* @__PURE__ */ new Map();
    this.throttler = new Common10.Throttler.Throttler(500);
    this.#view = view;
  }
  set section(data) {
    const registrationChanged = !this.registration || this.registration !== data.registration;
    this.sectionInternal = data;
    this.manager = data.manager;
    this.registration = data.registration;
    if (!this.pushNotificationDataSetting) {
      this.pushNotificationDataSetting = Common10.Settings.Settings.instance().createLocalSetting("push-data", i18nString19(UIStrings19.testPushMessageFromDevtools));
      this.syncTagNameSetting = Common10.Settings.Settings.instance().createLocalSetting("sync-tag-name", "test-tag-from-devtools");
      this.periodicSyncTagNameSetting = Common10.Settings.Settings.instance().createLocalSetting("periodic-sync-tag-name", "test-tag-from-devtools");
    }
    if (registrationChanged) {
      this.clientInfoCache.clear();
    }
  }
  get section() {
    return this.sectionInternal;
  }
  getTitle() {
    const scopeURL = this.registration.scopeURL;
    return this.registration.isDeleted ? i18nString19(UIStrings19.sDeleted, { PH1: scopeURL }) : scopeURL;
  }
  requestUpdate() {
    if (throttleDisabledForDebugging) {
      super.requestUpdate();
      return;
    }
    void this.throttler.schedule(() => {
      super.requestUpdate();
      return Promise.resolve();
    });
  }
  performUpdate() {
    const fingerprint = this.registration.fingerprint();
    if (fingerprint === this.fingerprint) {
      return Promise.resolve();
    }
    this.fingerprint = fingerprint;
    const versions = this.registration.versionsByMode();
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
    const title = this.getTitle();
    const input = {
      title,
      isDeleted: this.registration.isDeleted,
      errorsLength: this.registration.errors?.length ?? 0,
      pushData: this.pushNotificationDataSetting.get(),
      syncTag: this.syncTagNameSetting.get(),
      periodicSyncTag: this.periodicSyncTagNameSetting.get(),
      registration: this.registration,
      activeVersion: active,
      waitingVersion: waiting,
      installingVersion: installing,
      redundantVersion: redundant,
      renderClientInfo: this.renderClientInfo.bind(this),
      onNetworkRequests: this.networkRequestsClicked.bind(this),
      onUpdate: this.updateButtonClicked.bind(this),
      onUnregister: this.unregisterButtonClicked.bind(this),
      onPush: this.push.bind(this),
      onSync: this.sync.bind(this),
      onPeriodicSync: this.periodicSync.bind(this),
      onStop: this.stopButtonClicked.bind(this),
      onStart: this.startButtonClicked.bind(this),
      onSkipWaiting: this.skipButtonClicked.bind(this)
    };
    this.#view(input, void 0, this.contentElement);
    return Promise.resolve();
  }
  unregisterButtonClicked() {
    this.manager.deleteRegistration(this.registration.id);
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
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.ServiceWorkerNetworkRequestClicked);
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
  async renderClientInfo(clientId) {
    let targetInfo = this.clientInfoCache.get(clientId);
    if (!targetInfo) {
      const response = await this.manager.target().targetAgent().invoke_getTargetInfo({ targetId: clientId });
      if (!response.targetInfo) {
        return nothing6;
      }
      targetInfo = response.targetInfo;
      this.clientInfoCache.set(clientId, targetInfo);
    }
    if (targetInfo.type !== "page" && targetInfo.type !== "iframe") {
      return html11`<span class="service-worker-client-string">
        ${i18nString19(UIStrings19.workerS, { PH1: targetInfo.url })}
      </span>`;
    }
    return html11`
      <span class="service-worker-client-string">${targetInfo.url}</span>
      <devtools-button
        .data=${{
      iconName: "select-element",
      variant: "icon",
      size: "SMALL",
      title: i18nString19(UIStrings19.focus),
      jslogContext: "client-focus"
    }}
        class="service-worker-client-focus-link"
        @click=${this.activateTarget.bind(this, targetInfo.targetId)}
      ></devtools-button>`;
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
};

// gen/front_end/panels/application/StorageBucketsTreeElement.js
var StorageBucketsTreeElement_exports = {};
__export(StorageBucketsTreeElement_exports, {
  StorageBucketsTreeElement: () => StorageBucketsTreeElement,
  StorageBucketsTreeParentElement: () => StorageBucketsTreeParentElement,
  i18nString: () => i18nString20
});
import * as i18n39 from "./../../core/i18n/i18n.js";
import * as SDK19 from "./../../core/sdk/sdk.js";
import * as LegacyWrapper from "./../../ui/components/legacy_wrapper/legacy_wrapper.js";
import { createIcon as createIcon8 } from "./../../ui/kit/kit.js";
import * as UI19 from "./../../ui/legacy/legacy.js";
import { StorageMetadataView as StorageMetadataView3 } from "./components/components.js";
var UIStrings20 = {
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
var str_20 = i18n39.i18n.registerUIStrings("panels/application/StorageBucketsTreeElement.ts", UIStrings20);
var i18nString20 = i18n39.i18n.getLocalizedString.bind(void 0, str_20);
var StorageBucketsTreeParentElement = class extends ExpandableApplicationPanelTreeElement {
  bucketTreeElements = /* @__PURE__ */ new Set();
  constructor(storagePanel) {
    super(storagePanel, i18nString20(UIStrings20.storageBuckets), i18nString20(UIStrings20.noStorageBuckets), i18nString20(UIStrings20.storageBucketsDescription), "storage-buckets");
    const icon = createIcon8("bucket");
    this.setLeadingIcons([icon]);
    this.setLink("https://github.com/WICG/storage-buckets/blob/gh-pages/explainer.md");
  }
  initialize() {
    SDK19.TargetManager.TargetManager.instance().addModelListener(SDK19.StorageBucketsModel.StorageBucketsModel, "BucketAdded", this.bucketAdded, this);
    SDK19.TargetManager.TargetManager.instance().addModelListener(SDK19.StorageBucketsModel.StorageBucketsModel, "BucketRemoved", this.bucketRemoved, this);
    SDK19.TargetManager.TargetManager.instance().addModelListener(SDK19.StorageBucketsModel.StorageBucketsModel, "BucketChanged", this.bucketChanged, this);
    for (const bucketsModel of SDK19.TargetManager.TargetManager.instance().models(SDK19.StorageBucketsModel.StorageBucketsModel)) {
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
    const { origin } = SDK19.StorageKeyManager.parseStorageKey(bucketInfo.bucket.storageKey);
    super(resourcesPanel, `${bucket.name} - ${origin}`, "", "", "storage-bucket");
    this.bucketModel = model;
    this.storageBucketInfo = bucketInfo;
    const icon = createIcon8("database");
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
      this.view = LegacyWrapper.LegacyWrapper.legacyWrapper(UI19.Widget.Widget, new StorageMetadataView3.StorageMetadataView());
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
  StorageRevealable: () => StorageRevealable,
  StorageRevealer: () => StorageRevealer,
  StorageView: () => StorageView,
  storagePieColors: () => storagePieColors
});
import * as Common16 from "./../../core/common/common.js";
import * as i18n53 from "./../../core/i18n/i18n.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as SDK23 from "./../../core/sdk/sdk.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import { Icon, Link } from "./../../ui/kit/kit.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as UI27 from "./../../ui/legacy/legacy.js";
import * as VisualLogging18 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/ResourcesPanel.js
var ResourcesPanel_exports = {};
__export(ResourcesPanel_exports, {
  AttemptViewWithFilterRevealer: () => AttemptViewWithFilterRevealer,
  FrameDetailsRevealer: () => FrameDetailsRevealer,
  ResourceRevealer: () => ResourceRevealer,
  ResourcesPanel: () => ResourcesPanel,
  RuleSetViewRevealer: () => RuleSetViewRevealer,
  StorageBucketRevealer: () => StorageBucketRevealer
});
import "./../../ui/legacy/legacy.js";
import * as Common15 from "./../../core/common/common.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as SDK22 from "./../../core/sdk/sdk.js";
import * as SourceFrame5 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI26 from "./../../ui/legacy/legacy.js";
import { render as render16 } from "./../../ui/lit/lit.js";
import * as VisualLogging17 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/CookieItemsView.js
var CookieItemsView_exports = {};
__export(CookieItemsView_exports, {
  CookieItemsView: () => CookieItemsView,
  DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW: () => DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW,
  DEFAULT_VIEW: () => DEFAULT_VIEW9
});
import * as Common12 from "./../../core/common/common.js";
import * as i18n43 from "./../../core/i18n/i18n.js";
import * as SDK20 from "./../../core/sdk/sdk.js";
import * as AiAssistanceModel from "./../../models/ai_assistance/ai_assistance.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as IssuesManager from "./../../models/issues_manager/issues_manager.js";
import * as CookieTable from "./../../ui/legacy/components/cookie_table/cookie_table.js";
import * as UI21 from "./../../ui/legacy/legacy.js";
import { html as html13, render as render13 } from "./../../ui/lit/lit.js";
import * as VisualLogging12 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/cookieItemsView.css.js
var cookieItemsView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
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
}

/*# sourceURL=${import.meta.resolve("./cookieItemsView.css")} */`;

// gen/front_end/panels/application/StorageItemsToolbar.js
var StorageItemsToolbar_exports = {};
__export(StorageItemsToolbar_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW8,
  StorageItemsToolbar: () => StorageItemsToolbar
});
import "./../../ui/legacy/legacy.js";
import * as Common11 from "./../../core/common/common.js";
import * as i18n41 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as Buttons8 from "./../../ui/components/buttons/buttons.js";
import * as UI20 from "./../../ui/legacy/legacy.js";
import * as Lit2 from "./../../ui/lit/lit.js";
import * as VisualLogging11 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents10 from "./components/components.js";
var UIStrings21 = {
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
var str_21 = i18n41.i18n.registerUIStrings("panels/application/StorageItemsToolbar.ts", UIStrings21);
var i18nString21 = i18n41.i18n.getLocalizedString.bind(void 0, str_21);
var { html: html12, render: render12 } = Lit2;
var DEFAULT_VIEW8 = (input, _output, target) => {
  render12(
    // clang-format off
    html12`
      <devtools-toolbar class="top-resources-toolbar"
                        jslog=${VisualLogging11.toolbar()}>
        <devtools-button title=${i18nString21(UIStrings21.refresh)}
                         jslog=${VisualLogging11.action("storage-items-view.refresh").track({
      click: true
    })}
                         @click=${input.onRefresh}
                         .iconName=${"refresh"}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-toolbar-input type="filter"
                                ?disabled=${!input.filterItemEnabled}
                                @change=${input.onFilterChanged}
                                style="flex-grow:0.4"></devtools-toolbar-input>
        ${new UI20.Toolbar.ToolbarSeparator().element}
        <devtools-button title=${input.deleteAllButtonTitle}
                         @click=${input.onDeleteAll}
                         id=storage-items-delete-all
                         ?disabled=${!input.deleteAllButtonEnabled}
                         jslog=${VisualLogging11.action("storage-items-view.clear-all").track({
      click: true
    })}
                         .iconName=${input.deleteAllButtonIconName}
                         .variant=${"toolbar"}></devtools-button>
        <devtools-button title=${i18nString21(UIStrings21.deleteSelected)}
                         @click=${input.onDeleteSelected}
                         ?disabled=${!input.deleteSelectedButtonDisabled}
                         jslog=${VisualLogging11.action("storage-items-view.delete-selected").track({
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
var StorageItemsToolbar = class extends Common11.ObjectWrapper.eventMixin(UI20.Widget.VBox) {
  filterRegex;
  #metadataView;
  #view;
  #deleteAllButtonEnabled = true;
  #deleteSelectedButtonDisabled = true;
  #filterItemEnabled = true;
  #deleteAllButtonIconName = "clear";
  #deleteAllButtonTitle = i18nString21(UIStrings21.clearAll);
  #mainToolbarItems = [];
  constructor(element, view = DEFAULT_VIEW8) {
    super(element);
    this.#view = view;
    this.filterRegex = null;
  }
  set metadataView(view) {
    this.#metadataView = view;
  }
  get metadataView() {
    if (!this.#metadataView) {
      this.#metadataView = new ApplicationComponents10.StorageMetadataView.StorageMetadataView();
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
        UI20.ARIAUtils.LiveAnnouncer.alert(i18nString21(UIStrings21.refreshedStatus));
      },
      onDeleteAll: () => {
        this.dispatchEventToListeners(
          "DeleteAll"
          /* StorageItemsToolbar.Events.DELETE_ALL */
        );
      },
      onDeleteSelected: () => {
        this.dispatchEventToListeners(
          "DeleteSelected"
          /* StorageItemsToolbar.Events.DELETE_SELECTED */
        );
      }
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
    this.filterRegex = text ? new RegExp(Platform7.StringUtilities.escapeForRegExp(text), "i") : null;
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

// gen/front_end/panels/application/CookieItemsView.js
var UIStrings22 = {
  /**
   * @description Label for checkbox to show URL-decoded cookie values
   */
  showUrlDecoded: "Show URL-decoded",
  /**
   * @description Text of a context menu item to start a chat with AI
   */
  startAChat: "Start a chat",
  /**
   * @description Text of a context menu item to explain a web cookie with AI
   */
  explainCookie: "Explain this cookie",
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
var str_22 = i18n43.i18n.registerUIStrings("panels/application/CookieItemsView.ts", UIStrings22);
var i18nString22 = i18n43.i18n.getLocalizedString.bind(void 0, str_22);
var { Size } = Geometry;
var { widget: widget8 } = UI21.Widget;
var DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW = (input, output, target) => {
  const cookieValue = input.cookie ? input.showDecoded ? decodeURIComponent(input.cookie.value()) : input.cookie.value() : "";
  function handleDblClickOnCookieValue(event) {
    event.preventDefault();
    const range = document.createRange();
    range.selectNode(event.currentTarget);
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
  render13(
    html13`<style>${cookieItemsView_css_default}</style>
    <div class="cookie-preview-widget">
      <div class="cookie-preview-widget-header">
        <span class="cookie-preview-widget-header-label">Cookie Value</span>
        <devtools-checkbox
          .checked=${input.showDecoded}
          @change=${(e) => input.onShowDecodedChanged(e.target.checked)}
          title=${i18nString22(UIStrings22.showUrlDecoded)}
          jslog=${VisualLogging12.toggle("show-url-decoded").track({ click: true })}>
          ${i18nString22(UIStrings22.showUrlDecoded)}
        </devtools-checkbox>
      </div>
      <div class="cookie-preview-widget-cookie-value"
          @dblclick=${handleDblClickOnCookieValue}>
        ${cookieValue}
      </div>
    </div>
  `,
    // clang-format on
    target,
    { container: { attributes: { jslog: `${VisualLogging12.pane("cookie-preview")}` } } }
  );
};
var CookiePreviewWidget = class extends UI21.Widget.VBox {
  view;
  #cookie;
  showDecodedSetting;
  constructor(element, view = DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW) {
    super(element);
    this.view = view;
    this.setMinimumSize(230, 45);
    this.#cookie = null;
    this.showDecodedSetting = Common12.Settings.Settings.instance().createSetting("cookie-view-show-decoded", false);
    this.requestUpdate();
  }
  set cookie(cookie) {
    this.#cookie = cookie;
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      cookie: this.#cookie,
      showDecoded: this.showDecodedSetting.get(),
      onShowDecodedChanged: (showDecoded) => {
        this.showDecodedSetting.set(showDecoded);
        this.requestUpdate();
      }
    };
    this.view(input, void 0, this.contentElement);
  }
};
var DEFAULT_VIEW9 = (input, output, target) => {
  render13(
    html13`<style>${cookieItemsView_css_default}</style>
    <devtools-widget class="storage-view" ${widget8(UI21.Widget.VBox, { minimumSize: new Size(0, 50) })}>
      <devtools-widget ${widget8(StorageItemsToolbar, { filterRegex: null })}
        class=flex-none
        @Refresh=${input.onRefreshItems}
        @DeleteAll=${input.onDeleteAllItems}
        @DeleteSelected=${input.onDeleteSelectedItems}
        ${UI21.Widget.widgetRef(StorageItemsToolbar, (toolbar8) => {
      output.toolbar = toolbar8;
    })}
      ></devtools-widget>
      <devtools-split-view sidebar-position="second" name="cookie-items-split-view-state">
        <devtools-widget slot="main" ${widget8(UI21.Widget.VBox, { minimumSize: new Size(0, 50) })}>
          <devtools-widget slot="main" ${widget8(CookieTable.CookiesTable.CookiesTable, {
      cookieDomain: input.cookieDomain,
      cookiesData: input.cookiesData,
      saveCallback: input.onSaveCookie,
      refreshCallback: input.onRefresh,
      selectedCallback: input.onSelect,
      deleteCallback: input.onDelete,
      aiButtonIsEnabled: input.aiButtonIsEnabled,
      onAiButtonClick: input.onAiButtonClick,
      onPopulateAiContextMenu: input.onPopulateAiContextMenu,
      aiButtonTitle: input.aiButtonTitle,
      editable: true
    })}
          ></devtools-widget>
        </devtools-widget>
        <devtools-widget slot="sidebar" ${widget8(UI21.Widget.VBox, { minimumSize: new Size(0, 50) })}
          jslog=${VisualLogging12.pane("preview").track({ resize: true })}>
          ${input.selectedCookie ? html13`<devtools-widget ${widget8(CookiePreviewWidget, { cookie: input.selectedCookie })}>
                 </devtools-widget>` : html13`<devtools-widget ${widget8(UI21.EmptyWidget.EmptyWidget, {
      header: i18nString22(UIStrings22.noCookieSelected),
      text: i18nString22(UIStrings22.selectACookieToPreviewItsValue)
    })}></devtools-widget>`}
        </devtools-widget>
      </devtools-split-view>
    </devtools-widget>
  `,
    // clang-format on
    target,
    { container: { attributes: { jslog: `${VisualLogging12.pane("cookies-data")}` } } }
  );
};
var CookieItemsView = class extends UI21.Widget.VBox {
  view;
  model;
  cookieDomain;
  onlyIssuesFilterUI;
  allCookies;
  shownCookies;
  selectedCookie;
  #toolbar;
  constructor(model, cookieDomain, view = DEFAULT_VIEW9) {
    super();
    this.view = view;
    this.model = model;
    this.cookieDomain = cookieDomain;
    this.onlyIssuesFilterUI = new UI21.Toolbar.ToolbarCheckbox(i18nString22(UIStrings22.onlyShowCookiesWithAnIssue), i18nString22(UIStrings22.onlyShowCookiesWhichHaveAn), () => {
      this.updateWithCookies(this.allCookies);
    }, "only-show-cookies-with-issues");
    this.allCookies = [];
    this.shownCookies = [];
    this.selectedCookie = null;
    this.setCookiesDomain(model, cookieDomain);
    this.requestUpdate();
  }
  setCookiesDomain(model, domain) {
    this.model.removeEventListener("CookieListUpdated", this.onCookieListUpdate, this);
    this.model = model;
    this.cookieDomain = domain;
    this.refreshItems();
    this.model.addEventListener("CookieListUpdated", this.onCookieListUpdate, this);
  }
  performUpdate() {
    const that = this;
    const output = {
      set toolbar(toolbar8) {
        if (that.#toolbar === toolbar8) {
          return;
        }
        that.#toolbar = toolbar8;
        that.#toolbar.appendToolbarItem(that.onlyIssuesFilterUI);
        that.updateWithCookies(that.allCookies);
      }
    };
    const cookiesData = {
      cookies: this.shownCookies,
      cookieToBlockedReasons: this.model.getCookieToBlockedReasonsMap()
    };
    const parsedURL = Common12.ParsedURL.ParsedURL.fromString(this.cookieDomain);
    const host = parsedURL ? parsedURL.host : "";
    const input = {
      cookieDomain: host,
      cookiesData,
      onSaveCookie: this.saveCookie.bind(this),
      onRefresh: this.refreshItems.bind(this),
      onSelect: this.handleCookieSelected.bind(this),
      onDelete: this.deleteCookie.bind(this),
      onDeleteSelectedItems: this.deleteSelectedItem.bind(this),
      onDeleteAllItems: this.deleteAllItems.bind(this),
      onRefreshItems: this.refreshItems.bind(this),
      selectedCookie: this.selectedCookie,
      aiButtonIsEnabled: this.isAiButtonEnabled(),
      onPopulateAiContextMenu: this.#onPopulateAiContextMenu.bind(this),
      onAiButtonClick: this.#onAiButtonClick.bind(this),
      aiButtonTitle: this.isAiButtonEnabled() ? UI21.ActionRegistry.ActionRegistry.instance().getAction("ai-assistance.storage-floating-button").title() : void 0
    };
    this.view(input, output, this.contentElement);
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
    this.requestUpdate();
  }
  #updateAiAssistanceContext(cookie) {
    if (cookie && cookie.httpOnly()) {
      UI21.Context.Context.instance().setFlavor(AiAssistanceModel.StorageItem.StorageItem, null);
      return;
    }
    const target = SDK20.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainPageOrigin = target?.inspectedURL() ? Common12.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL()) : "";
    if (!mainPageOrigin) {
      UI21.Context.Context.instance().setFlavor(AiAssistanceModel.StorageItem.StorageItem, null);
      return;
    }
    const storageItem = new AiAssistanceModel.StorageItem.CookieItem(mainPageOrigin, this.cookieDomain, cookie?.name());
    UI21.Context.Context.instance().setFlavor(AiAssistanceModel.StorageItem.StorageItem, storageItem);
  }
  handleCookieSelected(selectedCookie) {
    if (!this.#toolbar) {
      return;
    }
    this.#toolbar.setCanDeleteSelected(Boolean(selectedCookie));
    this.showPreview(selectedCookie);
    this.#updateAiAssistanceContext(selectedCookie);
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
    if (!this.#toolbar) {
      return;
    }
    this.allCookies = allCookies;
    this.shownCookies = this.filter(allCookies, (cookie) => `${cookie.name()} ${cookie.value()} ${cookie.domain()}`);
    if (this.#toolbar.hasFilter()) {
      this.#toolbar.setDeleteAllTitle(i18nString22(UIStrings22.clearFilteredCookies));
      this.#toolbar.setDeleteAllGlyph("filter-clear");
    } else {
      this.#toolbar.setDeleteAllTitle(i18nString22(UIStrings22.clearAllCookies));
      this.#toolbar.setDeleteAllGlyph("clear-list");
    }
    UI21.ARIAUtils.LiveAnnouncer.alert(i18nString22(UIStrings22.numberOfCookiesShownInTableS, { PH1: this.shownCookies.length }));
    this.#toolbar.setCanFilter(true);
    this.#toolbar.setCanDeleteAll(this.shownCookies.length > 0);
    this.#toolbar.setCanDeleteSelected(Boolean(this.selectedCookie));
    this.requestUpdate();
  }
  filter(items, keyFunction) {
    const predicate = (object) => {
      if (!this.onlyIssuesFilterUI.checked()) {
        return true;
      }
      if (object instanceof SDK20.Cookie.Cookie) {
        return IssuesManager.RelatedIssue.hasIssues(object, IssuesManager.IssuesManager.IssuesManager.instance());
      }
      return false;
    };
    return items.filter((item2) => this.#toolbar?.filterRegex?.test(keyFunction(item2)) ?? true).filter(predicate);
  }
  /**
   * This will only delete the currently visible cookies.
   */
  deleteAllItems() {
    UI21.Context.Context.instance().setFlavor(AiAssistanceModel.StorageItem.StorageItem, null);
    this.showPreview(null);
    void this.model.deleteCookies(this.shownCookies);
  }
  deleteSelectedItem() {
    const cookie = this.selectedCookie;
    if (cookie) {
      this.showPreview(null);
      void this.model.deleteCookie(cookie);
    }
  }
  onCookieListUpdate() {
    void this.model.getCookiesForDomain(this.cookieDomain).then(this.updateWithCookies.bind(this));
  }
  refreshItems() {
    void this.model.getCookiesForDomain(this.cookieDomain, true).then(this.updateWithCookies.bind(this));
  }
  isAiButtonEnabled() {
    return UI21.ActionRegistry.ActionRegistry.instance().hasAction("ai-assistance.storage-floating-button");
  }
  #onPopulateAiContextMenu(cookie, contextMenu) {
    const openAiAssistanceId = "ai-assistance.application-panel-context";
    if (this.isAiButtonEnabled() && UI21.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
      this.#updateAiAssistanceContext(cookie);
      if (UI21.Context.Context.instance().flavor(AiAssistanceModel.StorageItem.StorageItem)) {
        const action6 = UI21.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
        const submenu = contextMenu.footerSection().appendSubMenuItem(action6.title(), false, openAiAssistanceId);
        submenu.defaultSection().appendAction(openAiAssistanceId, i18nString22(UIStrings22.startAChat));
        submenu.defaultSection().appendItem(i18nString22(UIStrings22.explainCookie), () => action6.execute({ prompt: "What is the purpose of this cookie?" }), { disabled: !action6.enabled(), jslogContext: openAiAssistanceId + ".cookies" });
      }
    }
  }
  #onAiButtonClick(cookie, _event) {
    this.#updateAiAssistanceContext(cookie);
    const actionRegistry = UI21.ActionRegistry.ActionRegistry.instance();
    const storageFloatingButtonId = "ai-assistance.storage-floating-button";
    if (actionRegistry.hasAction(storageFloatingButtonId)) {
      void actionRegistry.getAction(storageFloatingButtonId).execute();
    }
  }
};

// gen/front_end/panels/application/DeviceBoundSessionsView.js
var DeviceBoundSessionsView_exports = {};
__export(DeviceBoundSessionsView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW10,
  DeviceBoundSessionsView: () => DeviceBoundSessionsView
});
import "./../../ui/components/report_view/report_view.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n45 from "./../../core/i18n/i18n.js";
import * as SourceFrame2 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
import { Directives as Directives6, html as html14, nothing as nothing7, render as render14 } from "./../../ui/lit/lit.js";
import * as VisualLogging13 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/deviceBoundSessionsView.css.js
var deviceBoundSessionsView_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.device-bound-session-grid-wrapper {
  margin: 0 20px 5px;
}

.device-bound-session-grid-wrapper devtools-data-grid {
  display: block;
}

.device-bound-session-view-wrapper, .device-bound-session-sidebar {
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-bottom: 20px;
}

.device-bound-session-no-events-wrapper, .device-bound-session-no-event-details {
  padding: 0 20px;
}

.device-bound-sessions-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./deviceBoundSessionsView.css")} */`;

// gen/front_end/panels/application/DeviceBoundSessionsView.js
var { widget: widget9 } = UI22.Widget;
var UIStrings23 = {
  /**
   *@description Label for a site, e.g. https://example.com/.
   */
  keySite: "Site",
  /**
   *@description Label for the ID of a session.
   */
  keyId: "ID",
  /**
   *@description Label that shows the URL that can be used to refresh a session.
   */
  refreshUrl: "Refresh URL",
  /**
   *@description Section header for how a session's scope is defined.
   */
  scope: "Scope",
  /**
   *@description Section header for HTTP cookies.
   */
  cookieCravings: "Cookies",
  /**
   *@description Label for the name of an HTTP cookie.
   */
  name: "Name",
  /**
   *@description Label for an expiration date.
   */
  expiryDate: "Expiry date",
  /**
   *@description Label for a cryptographic string challenge that has been cached for a session.
   */
  cachedChallenge: "Cached challenge",
  /**
   *@description Label for the HTTP initiator that is allowed to trigger a refresh of a session.
   */
  allowedRefreshInitiators: "Allowed refresh initiators",
  /**
   *@description Section header for a session's basic configuration.
   */
  sessionConfig: "Session config",
  /**
   *@description Label for an HTTP origin.
   */
  origin: "Origin",
  /**
   *@description Text for whether a site is included.
   */
  includeSite: "Include site",
  /**
   *@description Value for a label that indicates that a site is included.
   */
  yes: "Yes",
  /**
   *@description Value for a label that indicates that a site is not included.
   */
  no: "No",
  /**
   *@description Label the host pattern of a URL, e.g. *.example.com
   */
  ruleHostPattern: "Host pattern",
  /**
   *@description Label for the path prefix of a URL, e.g. /path/1/2/3
   */
  rulePathPrefix: "Path prefix",
  /**
   *@description The type of a rule. The possible types are "exclude" or "include".
   */
  ruleType: "Rule type",
  /**
   *@description Text describing that a rule excludes something.
   */
  ruleTypeExclude: "Exclude",
  /**
   *@description Text describing that a rule includes something.
   */
  ruleTypeInclude: "Include",
  /**
   *@description Label for an event that has created something.
   */
  creation: "Creation",
  /**
   *@description Label for an event that has refreshed something.
   */
  refresh: "Refresh",
  /**
   *@description Label for an event that has set a cryptographic string challenge.
   */
  challenge: "Challenge",
  /**
   *@description Label for an event that has terminated something.
   */
  termination: "Termination",
  /**
   *@description Label for an event whose type is not known.
   */
  unknown: "Unknown",
  /**
   *@description Heading for a section that will display events that have occurred.
   */
  events: "Events",
  /**
   *@description Section header for details about an event.
   */
  eventDetails: "Event details",
  /**
   *@description Accessible label for the main area containing session details.
   */
  sessionDetails: "Session details",
  /**
   *@description Placeholder text when no row is selected in a table of events.
   */
  selectEventToViewDetails: "Select an event row to view more details.",
  /**
   *@description Column heading for the type of event that has occurred.
   */
  type: "Type",
  /**
   *@description Column heading for the date + time that an event occurred.
   */
  timestamp: "Date",
  /**
   *@description Column heading for the result of an event (whether it succeeded or had an error).
   */
  result: "Result",
  /**
   *@description Notes the result status of an event was that it succeeded.
   */
  success: "Success",
  /**
   *@description Notes the result status of an event was that it had an error.
   */
  error: "Error",
  /**
   *@description Default message when no events have appeared yet.
   */
  noEvents: "No events have been logged yet.",
  /**
   *@description Text to keep the log of events after refreshing.
   */
  preserveLog: "Keep log",
  /**
   *@description Tooltip text that appears on the keep log setting when hovering over it.
   */
  doNotClearLogOnPageReload: "Don\u2019t clear log on page reload/navigation",
  /**
   *@description Label for the ID of a session.
   */
  sessionId: "Session ID",
  /**
   *@description Label for the result of an event (whether it succeeded or had an error).
   */
  eventResult: "Event result",
  /**
   *@description Label for the result of fetching new session information.
   */
  fetchResult: "Fetch result",
  /**
   *@description Label for whether a session's basic configuration was updated. The corresponding value is yes or no.
   */
  updatedSessionConfig: "Updated session config",
  /**
   *@description Label for the result of an attempted refresh.
   */
  refreshResult: "Refresh result",
  /**
   *@description Label for whether a particular event caused any HTTP request to be deferred (i.e. paused and
   * later unpaused). The corresponding value is yes or no.
   */
  causedAnyRequestDeferrals: "Caused any request deferrals",
  /**
   *@description Label for the result of attempting to set a cryptographic string challenge.
   */
  challengeResult: "Challenge result",
  /**
   *@description Label for the reason why a session was deleted.
   */
  deletionReason: "Deletion reason",
  /**
   *@description Label for the URL of a failed network request.
   */
  failedRequestUrl: "Failed request URL",
  /**
   *@description Label for the network error of a failed network request.
   */
  failedRequestNetError: "Net error",
  /**
   *@description Label for the HTTP response error code of a failed network request.
   */
  failedRequestResponseCode: "Response error code",
  /**
   *@description Label for the response body of a failed network request.
   */
  failedRequestResponseBody: "Response body",
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key.
   */
  signingKeyGenerationError: "Signing key generation error",
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key.
   */
  attestationKeyGenerationError: "Attestation key generation error",
  /**
   *@description Explanation for an event outcome. Signing refers to cryptographic signing.
   */
  signingError: "Signing error",
  /**
   *@description Explanation for an event outcome. Signing refers to cryptographic signing.
   */
  transientSigningError: "Transient signing error",
  /**
   *@description Explanation for an event outcome.
   */
  serverRequestedTermination: "Server requested termination",
  /**
   *@description Explanation for an event outcome.
   */
  invalidSessionId: "Invalid session ID",
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  invalidChallenge: "Invalid challenge",
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  tooManyChallenges: "Too many challenges",
  /**
   *@description Explanation for an event outcome.
   */
  invalidFetcherUrl: "Invalid fetcher URL",
  /**
   *@description Explanation for an event outcome.
   */
  invalidRefreshUrl: "Invalid refresh URL",
  /**
   *@description Explanation for an event outcome.
   */
  transientHttpError: "Transient HTTP error",
  /**
   *@description Explanation for an event outcome. This means there is a URL origin written into a session configuration's scope that is causing failures because it's for a different site.
   */
  scopeOriginSameSiteMismatch: "Same-site mismatch scope origin",
  /**
   *@description Explanation for an event outcome. This means the session configuration's URL for refreshing is causing failures because it's for a different site.
   */
  refreshUrlSameSiteMismatch: "Same-site mismatch refresh URL",
  /**
   *@description Explanation for an event outcome. This means the session configuration's session ID does not match the relevant session ID.
   */
  mismatchedSessionId: "Mismatched session ID",
  /**
   *@description Explanation for an event outcome.
   */
  missingScope: "Missing scope",
  /**
   *@description Explanation for an event outcome. This means the credentials field in the session configuration is missing.
   */
  noCredentials: "No credentials",
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationWellKnownUnavailable: "Subdomain registration .well-known unavailable",
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationUnauthorized: ".well-known did not authorize registration by subdomain",
  /**
   *@description Explanation for an event outcome.
   */
  subdomainRegistrationWellKnownMalformed: "Subdomain registration .well-known content malformed",
  /**
   *@description Explanation for an event outcome.
   */
  sessionProviderWellKnownUnavailable: "Session provider .well-known unavailable",
  /**
   *@description Explanation for an event outcome.
   */
  relyingPartyWellKnownUnavailable: "Relying party .well-known unavailable",
  /**
   *@description Explanation for an event outcome. This refers to a JSON Web Key thumbprint (https://www.rfc-editor.org/rfc/rfc7638). Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedKeyThumbprintMismatch: "Federated key had incorrect thumbprint",
  /**
   *@description Explanation for an event outcome. Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionUrl: "Federated provider URL not valid",
  /**
   *@description Explanation for an event outcome. Federated sessions are described in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedKey: "Federated key invalid",
  /**
   *@description Explanation for an event outcome. Origin labels are described in https://w3c.github.io/webappsec-dbsc/.
   */
  tooManyRelyingOriginLabels: "Too many relying origin labels in .well-known",
  /**
   *@description Explanation for an event outcome.
   */
  boundCookieSetForbidden: "Registration in a context that cannot set bound cookies",
  /**
   *@description Explanation for an event outcome.
   */
  netError: "Network error",
  /**
   *@description Explanation for an event outcome.
   */
  proxyError: "Proxy error",
  /**
   *@description Explanation for an event outcome.
   */
  emptySessionConfig: "Empty session configuration for registration",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsConfig: "Invalid credentials configuration",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsType: "Invalid credentials - empty or non-cookie type",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsEmptyName: "Invalid credentials - empty name",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookie: "Invalid credentials - cookie invalid",
  /**
   *@description Explanation for an event outcome.
   */
  persistentHttpError: "Persistent HTTP error",
  /**
   *@description Explanation for an event outcome. Challenge refers to a cryptographic string challenge.
   */
  registrationAttemptedChallenge: "Registration returned challenge error response code",
  /**
   *@description Explanation for an event outcome. This refers to a URL's origin.
   */
  invalidScopeOrigin: "Invalid scope origin",
  /**
   *@description Explanation for an event outcome. This refers to an URL's path / origin.
   */
  scopeOriginContainsPath: "Scope origin contains a path",
  /**
   *@description Explanation for an event outcome. This refers to an HTTP request's initiator.
   */
  refreshInitiatorNotString: "Allowed refresh initiator is not a string",
  /**
   *@description Explanation for an event outcome. This refers to an HTTP request's initiator and a URL's host.
   */
  refreshInitiatorInvalidHostPattern: "Allowed refresh initiator has invalid host pattern",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeSpecification: "Invalid scope specification",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  missingScopeSpecificationType: "Missing scope specification type",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  emptyScopeSpecificationDomain: "Empty scope specification domain",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  emptyScopeSpecificationPath: "Empty scope specification path",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeSpecificationType: "Scope specification type is neiher include or exclude",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeIncludeSite: "Invalid include_site in scope",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  missingScopeIncludeSite: "Missing include_site in scope",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedNotAuthorizedByProvider: "Federated session not authorized by provider .well-known",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  federatedNotAuthorizedByRelyingParty: "Federated session not authorized by relying party .well-known",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  sessionProviderWellKnownMalformed: "Session provider .well-known content malformed",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  sessionProviderWellKnownHasProviderOrigin: "Session provider .well-known content has provider_origin",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  relyingPartyWellKnownMalformed: "Relying party .well-known content malformed",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  relyingPartyWellKnownHasRelyingOrigins: "Relying party .well-known content has relying_origins",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionProviderSessionMissing: "Federated session invalid due to provider session not found",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidFederatedSessionWrongProviderOrigin: "Federated session invalid due to provider origin mismatch",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieCreationTime: "Invalid credentials - cookie creation time invalid",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieName: "Invalid credentials - cookie name invalid",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieParsing: "Invalid credentials - cookie parsing failed",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieUnpermittedAttribute: "Invalid credentials - cookie attribute not permitted",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookieInvalidDomain: "Invalid credentials - cookie invalid domain",
  /**
   *@description Explanation for an event outcome.
   */
  invalidCredentialsCookiePrefix: "Invalid credentials - cookie invalid prefix",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeRulePath: "Invalid scope rule path",
  /**
   *@description Explanation for an event outcome. Scope specification is defined in https://w3c.github.io/webappsec-dbsc/.
   */
  invalidScopeRuleHostPattern: "Invalid scope rule host pattern",
  /**
   *@description Explanation for an event outcome. A session can be scoped to just a specific URL origin. This error means that the session's origin does not match the provided URL host pattern.
   */
  scopeRuleOriginScopedHostPatternMismatch: "Origin-scoped session has mismatch between host pattern and origin",
  /**
   *@description Explanation for an event outcome. A session can be scoped to an entire site. This error means that the session's site does not match the provided URL host pattern.
   */
  scopeRuleSiteScopedHostPatternMismatch: "Site-scoped session has mismatch between host pattern and site",
  /**
   *@description Explanation for an event outcome. This refers to cryptographic signing.
   */
  signingQuotaExceeded: "Signing quota exceeded",
  /**
   *@description Explanation for an event outcome.
   */
  invalidConfigJson: "Invalid session configuration JSON",
  /**
   *@description Explanation for an event outcome. Federated sessions are defined in https://w3c.github.io/webappsec-dbsc/. Key refers to a cryptographic key.
   */
  invalidFederatedSessionProviderFailedToRestoreKey: "Federated session invalid due to failure to restore session provider key",
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key.
   */
  failedToUnwrapKey: "Failed to unwrap key",
  /**
   *@description Explanation for an event outcome.
   */
  sessionDeletedDuringRefresh: "Session deleted during refresh",
  /**
   *@description Explanation for an event outcome.
   */
  refreshed: "Refreshed",
  /**
   *@description Explanation for an event outcome.
   */
  initializedService: "Service initialized",
  /**
   *@description Explanation for an event outcome.
   */
  unreachable: "Endpoint unreachable",
  /**
   *@description Explanation for an event outcome.
   */
  serverError: "Endpoint transient error",
  /**
   *@description Explanation for an event outcome.
   */
  fatalError: "Fatal error",
  /**
   *@description Explanation for an event outcome.
   */
  noSessionId: "No session ID",
  /**
   *@description Explanation for an event outcome.
   */
  noSessionMatch: "No matching session ID",
  /**
   *@description Explanation for an event outcome.
   */
  cantSetBoundCookie: "Not allowed to set bound cookie",
  /**
   *@description Explanation for an event outcome.
   */
  expired: "Expired",
  /**
   *@description Explanation for an event outcome. Key refers to a cryptographic key. This means there was an attempt to read a key from disk but it failed.
   */
  failedToRestoreKey: "Failed to restore key from disk",
  /**
   *@description Explanation for an event outcome.
   */
  storagePartitionCleared: "Removed from storage partition",
  /**
   *@description Explanation for an event outcome.
   */
  clearBrowsingData: "User-initiated browser data removal",
  /**
   *@description Explanation for an event outcome.
   */
  invalidSessionParams: "Invalid session parameters",
  /**
   *@description Explanation for an event outcome.
   */
  refreshFatalError: "Fatal error during refresh"
};
var str_23 = i18n45.i18n.registerUIStrings("panels/application/DeviceBoundSessionsView.ts", UIStrings23);
var i18nString23 = i18n45.i18n.getLocalizedString.bind(void 0, str_23);
var DEFAULT_VIEW10 = (input, _output, target) => {
  const { sessionAndEvents, preserveLogSetting, defaultTitle, defaultDescription, selectedEvent, onEventRowSelected } = input;
  const toolbarHtml = preserveLogSetting ? html14`
        <devtools-toolbar class="device-bound-sessions-toolbar">
        <devtools-checkbox title=${i18nString23(UIStrings23.doNotClearLogOnPageReload)} ${UI22.UIUtils.bindToSetting(preserveLogSetting)}>${i18nString23(UIStrings23.preserveLog)}</devtools-checkbox>
        </devtools-toolbar>
  ` : nothing7;
  if (!sessionAndEvents) {
    if (!defaultTitle || !defaultDescription) {
      render14(nothing7, target);
      return;
    }
    render14(html14`
      <style>${UI22.inspectorCommonStyles}</style>
      <style>${deviceBoundSessionsView_css_default}</style>
      ${toolbarHtml}
      <devtools-widget ${widget9(UI22.EmptyWidget.EmptyWidget, { header: defaultTitle, text: defaultDescription })} jslog=${VisualLogging13.pane("device-bound-sessions-empty")}></devtools-widget>
    `, target, { container: { attributes: { jslog: `${VisualLogging13.pane("device-bound-sessions")}` } } });
    return;
  }
  let sessionDetailsHtml;
  if (sessionAndEvents.session) {
    const { key, inclusionRules, cookieCravings } = sessionAndEvents.session;
    sessionDetailsHtml = html14`
        <devtools-report>
          <devtools-report-section-header role="heading" aria-level="2">${i18nString23(UIStrings23.sessionConfig)}</devtools-report-section-header>
          <devtools-report-key>${i18nString23(UIStrings23.keySite)}</devtools-report-key>
          <devtools-report-value>${key.site}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.keyId)}</devtools-report-key>
          <devtools-report-value>${key.id}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.refreshUrl)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.refreshUrl}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.expiryDate)}</devtools-report-key>
          <devtools-report-value>${new Date(sessionAndEvents.session.expiryDate * 1e3).toLocaleString()}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.cachedChallenge)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.cachedChallenge || ""}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.allowedRefreshInitiators)}</devtools-report-key>
          <devtools-report-value>${sessionAndEvents.session.allowedRefreshInitiators.join(", ")}</devtools-report-value>
          <devtools-report-section-header role="heading" aria-level="2">${i18nString23(UIStrings23.scope)}</devtools-report-section-header>
          <devtools-report-key>${i18nString23(UIStrings23.origin)}</devtools-report-key>
          <devtools-report-value>${inclusionRules.origin}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.includeSite)}</devtools-report-key>
          <devtools-report-value>${boolToString(inclusionRules.includeSite)}</devtools-report-value>
        </devtools-report>
        ${inclusionRules.urlRules.length > 0 ? html14`
          <div class="device-bound-session-grid-wrapper">
            <devtools-data-grid class="device-bound-session-url-rules-grid" striped inline name=${i18nString23(UIStrings23.scope)}>
              <table>
                <thead>
                  <tr>
                    <th id="should-include" sortable>${i18nString23(UIStrings23.ruleType)}</th>
                    <th id="host-pattern" sortable>${i18nString23(UIStrings23.ruleHostPattern)}</th>
                    <th id="path-prefix" sortable>${i18nString23(UIStrings23.rulePathPrefix)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${inclusionRules.urlRules.map((rule) => html14`
                    <tr>
                      <td>${ruleTypeToString(rule.ruleType)}</td>
                      <td>${rule.hostPattern}</td>
                      <td>${rule.pathPrefix}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </devtools-data-grid>
          </div>
        ` : nothing7}
        <devtools-report-section-header role="heading" aria-level="2">${i18nString23(UIStrings23.cookieCravings)}</devtools-report-section-header>
        ${cookieCravings.length > 0 ? html14`
          <div class="device-bound-session-grid-wrapper">
            <devtools-data-grid class="device-bound-session-cookie-cravings-grid" striped inline name=${i18nString23(UIStrings23.cookieCravings)}>
              <table>
                <thead>
                  <tr>
                    <th id="name" sortable>${i18nString23(UIStrings23.name)}</th>
                    <th id="domain" sortable>${i18n45.i18n.lockedString("Domain")}</th>
                    <th id="path" sortable>${i18n45.i18n.lockedString("Path")}</th>
                    <th id="secure" type="boolean" align="center" sortable>${i18n45.i18n.lockedString("Secure")}</th>
                    <th id="http-only" type="boolean" align="center" sortable>${i18n45.i18n.lockedString("HttpOnly")}</th>
                    <th id="same-site" sortable>${i18n45.i18n.lockedString("SameSite")}</th>
                  </tr>
                </thead>
                <tbody>
                  ${cookieCravings.map((craving) => html14`
                    <tr>
                      <td>${craving.name}</td>
                      <td>${craving.domain}</td>
                      <td>${craving.path}</td>
                      <td>${craving.secure}</td>
                      <td>${craving.httpOnly}</td>
                      <td>${craving.sameSite}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </devtools-data-grid>
          </div>
        ` : nothing7}`;
  }
  const events = [...sessionAndEvents.eventsById.values()];
  const eventsHtml = html14`
      <devtools-report-section-header role="heading" aria-level="2">${i18nString23(UIStrings23.events)}</devtools-report-section-header>
          ${events.length > 0 && onEventRowSelected ? html14`
            <div class="device-bound-session-grid-wrapper">
                <devtools-data-grid class="device-bound-session-events-grid" striped inline name=${i18nString23(UIStrings23.events)} ${Directives6.ref((el) => {
    if (!el || !(el instanceof HTMLElement)) {
      return;
    }
    const grid = el;
    if (!selectedEvent) {
      grid.deselectRow();
    }
  })}>
                <table>
                  <thead>
                    <tr>
                      <th id="type" sortable>${i18nString23(UIStrings23.type)}</th>
                      <th id="timestamp" sortable>${i18nString23(UIStrings23.timestamp)}</th>
                      <th id="details" sortable>${i18nString23(UIStrings23.result)}</th>
                    </tr>
                  </thead>
                  <tbody>${events.map(({ event, timestamp }) => html14`
                      <tr @select=${() => onEventRowSelected(event)}>
                        <td>${getEventTypeString(event)}</td>
                        <td>${timestamp.toLocaleString()}</td>
                        <td>${succeededToString(event.succeeded)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </devtools-data-grid>
            </div>
          ` : html14`<div class="device-bound-session-no-events-wrapper">${i18nString23(UIStrings23.noEvents)}</div>`}`;
  const failedRequestDetailsGetter = (failedRequest) => {
    if (!failedRequest) {
      return nothing7;
    }
    return html14`${failedRequest.requestUrl && html14`
          <devtools-report-key>${i18nString23(UIStrings23.failedRequestUrl)}</devtools-report-key>
          <devtools-report-value>${failedRequest.requestUrl}</devtools-report-value>`}
        ${failedRequest.netError && html14`
          <devtools-report-key>${i18nString23(UIStrings23.failedRequestNetError)}</devtools-report-key>
          <devtools-report-value>${failedRequest.netError}</devtools-report-value>`}
        ${failedRequest.responseError !== void 0 ? html14`
          <devtools-report-key>${i18nString23(UIStrings23.failedRequestResponseCode)}</devtools-report-key>
          <devtools-report-value>${failedRequest.responseError}</devtools-report-value>` : nothing7}
        ${failedRequest.responseErrorBody && html14`
          <devtools-report-key>${i18nString23(UIStrings23.failedRequestResponseBody)}</devtools-report-key>
          <devtools-report-value>
            ${widget9(SourceFrame2.JSONView.SearchableJsonView, {
      jsonObject: tryParseJson(failedRequest.responseErrorBody)
    })}
          </devtools-report-value>`}`;
  };
  const creationEventDetails = selectedEvent?.creationEventDetails && html14`
          <devtools-report-key>${i18nString23(UIStrings23.fetchResult)}</devtools-report-key>
          <devtools-report-value>${fetchResultToString(selectedEvent.creationEventDetails.fetchResult)}</devtools-report-value>
            ${selectedEvent.creationEventDetails.newSession && html14`
              <devtools-report-key>${i18nString23(UIStrings23.updatedSessionConfig)}</devtools-report-key>
              <devtools-report-value>${i18nString23(UIStrings23.yes)}</devtools-report-value>
            `}
          ${failedRequestDetailsGetter(selectedEvent.creationEventDetails.failedRequest)}
      `;
  const refreshEventDetails = selectedEvent?.refreshEventDetails && html14`
          <devtools-report-key>${i18nString23(UIStrings23.refreshResult)}</devtools-report-key>
          <devtools-report-value>${refreshResultToString(selectedEvent.refreshEventDetails.refreshResult)}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.causedAnyRequestDeferrals)}</devtools-report-key>
          <devtools-report-value>${boolToString(!selectedEvent.refreshEventDetails.wasFullyProactiveRefresh)}</devtools-report-value>
            ${selectedEvent.refreshEventDetails.fetchResult && html14`
              <devtools-report-key>${i18nString23(UIStrings23.fetchResult)}</devtools-report-key>
              <devtools-report-value>${fetchResultToString(selectedEvent.refreshEventDetails.fetchResult)}</devtools-report-value>
            `}
            ${selectedEvent.refreshEventDetails.newSession && html14`
              <devtools-report-key>${i18nString23(UIStrings23.updatedSessionConfig)}</devtools-report-key>
              <devtools-report-value>${i18nString23(UIStrings23.yes)}</devtools-report-value>
            `}
          ${failedRequestDetailsGetter(selectedEvent.refreshEventDetails.failedRequest)}
      `;
  const challengeEventDetails = selectedEvent?.challengeEventDetails && html14`
          <devtools-report-key>${i18nString23(UIStrings23.challengeResult)}</devtools-report-key>
          <devtools-report-value>${challengeResultToString(selectedEvent.challengeEventDetails.challengeResult)}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.challenge)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.challengeEventDetails.challenge}</devtools-report-value>
          `;
  const terminationEventDetails = selectedEvent?.terminationEventDetails && html14`
          <devtools-report-key>${i18nString23(UIStrings23.deletionReason)}</devtools-report-key>
          <devtools-report-value>${deletionReasonToString(selectedEvent.terminationEventDetails.deletionReason)}</devtools-report-value>
          `;
  const eventDetailsContentHtml = selectedEvent ? html14`
        <devtools-report>
          <devtools-report-key>${i18nString23(UIStrings23.keySite)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.site}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.sessionId)}</devtools-report-key>
          <devtools-report-value>${selectedEvent.sessionId}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.type)}</devtools-report-key>
          <devtools-report-value>${getEventTypeString(selectedEvent)}</devtools-report-value>
          <devtools-report-key>${i18nString23(UIStrings23.eventResult)}</devtools-report-key>
          <devtools-report-value>${succeededToString(selectedEvent.succeeded)}</devtools-report-value>
          ${creationEventDetails}
          ${refreshEventDetails}
          ${challengeEventDetails}
          ${terminationEventDetails}
        </devtools-report>
    ` : html14`<div class="device-bound-session-no-event-details">${i18nString23(UIStrings23.selectEventToViewDetails)}</div>`;
  const eventDetailsHtml = html14`
      <devtools-report-section-header role="heading" aria-level="2">${i18nString23(UIStrings23.eventDetails)}</devtools-report-section-header>
      ${eventDetailsContentHtml}
  `;
  render14(html14`
        <style>${UI22.inspectorCommonStyles}</style>
        <style>${deviceBoundSessionsView_css_default}</style>
        ${toolbarHtml}
        <devtools-split-view sidebar-position="second">
          <div slot="main" class="device-bound-session-view-wrapper" role="region" aria-label=${i18nString23(UIStrings23.sessionDetails)}>
            ${sessionDetailsHtml || nothing7}
            ${eventsHtml}
          </div>
          <div slot="sidebar" class="device-bound-session-sidebar" role="region" aria-label=${i18nString23(UIStrings23.eventDetails)}>
            ${eventDetailsHtml}
          </div>
        </devtools-split-view>`, target);
};
var DeviceBoundSessionsView = class extends UI22.Widget.VBox {
  #site;
  #sessionId;
  #model;
  #view;
  #defaultTitle;
  #defaultDescription;
  #selectedEvent;
  constructor(view = DEFAULT_VIEW10) {
    super();
    this.#view = view;
  }
  showSession(model, site, sessionId) {
    this.#defaultTitle = void 0;
    this.#defaultDescription = void 0;
    this.#site = site;
    this.#sessionId = sessionId;
    this.#attachModel(model);
    this.performUpdate();
  }
  showDefault(model, defaultTitle, defaultDescription) {
    this.#defaultTitle = defaultTitle;
    this.#defaultDescription = defaultDescription;
    this.#site = void 0;
    this.#sessionId = void 0;
    this.#attachModel(model);
    this.performUpdate();
  }
  #attachModel(model) {
    if (this.#model) {
      this.#model.removeEventListener("EVENT_OCCURRED", this.performUpdate, this);
      this.#model.removeEventListener("CLEAR_EVENTS", this.performUpdate, this);
    }
    this.#model = model;
    this.#model.addEventListener("EVENT_OCCURRED", this.performUpdate, this);
    this.#model.addEventListener("CLEAR_EVENTS", this.performUpdate, this);
    if (this.#selectedEvent) {
      this.#selectedEvent = void 0;
    }
  }
  performUpdate() {
    let sessionAndEvents;
    let preserveLogSetting;
    if (this.#model) {
      preserveLogSetting = this.#model.getPreserveLogSetting();
      if (this.#site) {
        sessionAndEvents = this.#model.getSession(this.#site, this.#sessionId);
      }
    }
    this.#view({
      sessionAndEvents,
      preserveLogSetting,
      defaultTitle: this.#defaultTitle,
      defaultDescription: this.#defaultDescription,
      selectedEvent: this.#selectedEvent,
      onEventRowSelected: this.#onEventRowSelected.bind(this)
    }, {}, this.contentElement);
  }
  #onEventRowSelected(selectedEvent) {
    this.#selectedEvent = selectedEvent;
    this.performUpdate();
  }
};
function ruleTypeToString(ruleType) {
  switch (ruleType) {
    case "Exclude":
      return i18nString23(UIStrings23.ruleTypeExclude);
    case "Include":
      return i18nString23(UIStrings23.ruleTypeInclude);
    default:
      return ruleType;
  }
}
function getEventTypeString(event) {
  if (event.creationEventDetails) {
    return i18nString23(UIStrings23.creation);
  }
  if (event.refreshEventDetails) {
    return i18nString23(UIStrings23.refresh);
  }
  if (event.challengeEventDetails) {
    return i18nString23(UIStrings23.challenge);
  }
  if (event.terminationEventDetails) {
    return i18nString23(UIStrings23.termination);
  }
  return i18nString23(UIStrings23.unknown);
}
function fetchResultToString(fetchResult) {
  switch (fetchResult) {
    case "Success":
      return i18nString23(UIStrings23.success);
    case "SigningKeyGenerationError":
      return i18nString23(UIStrings23.signingKeyGenerationError);
    case "AttestationKeyGenerationError":
      return i18nString23(UIStrings23.attestationKeyGenerationError);
    case "SigningError":
      return i18nString23(UIStrings23.signingError);
    case "TransientSigningError":
      return i18nString23(UIStrings23.transientSigningError);
    case "ServerRequestedTermination":
      return i18nString23(UIStrings23.serverRequestedTermination);
    case "InvalidSessionId":
      return i18nString23(UIStrings23.invalidSessionId);
    case "InvalidChallenge":
      return i18nString23(UIStrings23.invalidChallenge);
    case "TooManyChallenges":
      return i18nString23(UIStrings23.tooManyChallenges);
    case "InvalidFetcherUrl":
      return i18nString23(UIStrings23.invalidFetcherUrl);
    case "InvalidRefreshUrl":
      return i18nString23(UIStrings23.invalidRefreshUrl);
    case "TransientHttpError":
      return i18nString23(UIStrings23.transientHttpError);
    case "ScopeOriginSameSiteMismatch":
      return i18nString23(UIStrings23.scopeOriginSameSiteMismatch);
    case "RefreshUrlSameSiteMismatch":
      return i18nString23(UIStrings23.refreshUrlSameSiteMismatch);
    case "MismatchedSessionId":
      return i18nString23(UIStrings23.mismatchedSessionId);
    case "MissingScope":
      return i18nString23(UIStrings23.missingScope);
    case "NoCredentials":
      return i18nString23(UIStrings23.noCredentials);
    case "SubdomainRegistrationWellKnownUnavailable":
      return i18nString23(UIStrings23.subdomainRegistrationWellKnownUnavailable);
    case "SubdomainRegistrationUnauthorized":
      return i18nString23(UIStrings23.subdomainRegistrationUnauthorized);
    case "SubdomainRegistrationWellKnownMalformed":
      return i18nString23(UIStrings23.subdomainRegistrationWellKnownMalformed);
    case "SessionProviderWellKnownUnavailable":
      return i18nString23(UIStrings23.sessionProviderWellKnownUnavailable);
    case "RelyingPartyWellKnownUnavailable":
      return i18nString23(UIStrings23.relyingPartyWellKnownUnavailable);
    case "FederatedKeyThumbprintMismatch":
      return i18nString23(UIStrings23.federatedKeyThumbprintMismatch);
    case "InvalidFederatedSessionUrl":
      return i18nString23(UIStrings23.invalidFederatedSessionUrl);
    case "InvalidFederatedKey":
      return i18nString23(UIStrings23.invalidFederatedKey);
    case "TooManyRelyingOriginLabels":
      return i18nString23(UIStrings23.tooManyRelyingOriginLabels);
    case "BoundCookieSetForbidden":
      return i18nString23(UIStrings23.boundCookieSetForbidden);
    case "NetError":
      return i18nString23(UIStrings23.netError);
    case "ProxyError":
      return i18nString23(UIStrings23.proxyError);
    case "EmptySessionConfig":
      return i18nString23(UIStrings23.emptySessionConfig);
    case "InvalidCredentialsConfig":
      return i18nString23(UIStrings23.invalidCredentialsConfig);
    case "InvalidCredentialsType":
      return i18nString23(UIStrings23.invalidCredentialsType);
    case "InvalidCredentialsEmptyName":
      return i18nString23(UIStrings23.invalidCredentialsEmptyName);
    case "InvalidCredentialsCookie":
      return i18nString23(UIStrings23.invalidCredentialsCookie);
    case "PersistentHttpError":
      return i18nString23(UIStrings23.persistentHttpError);
    case "RegistrationAttemptedChallenge":
      return i18nString23(UIStrings23.registrationAttemptedChallenge);
    case "InvalidScopeOrigin":
      return i18nString23(UIStrings23.invalidScopeOrigin);
    case "ScopeOriginContainsPath":
      return i18nString23(UIStrings23.scopeOriginContainsPath);
    case "RefreshInitiatorNotString":
      return i18nString23(UIStrings23.refreshInitiatorNotString);
    case "RefreshInitiatorInvalidHostPattern":
      return i18nString23(UIStrings23.refreshInitiatorInvalidHostPattern);
    case "InvalidScopeSpecification":
      return i18nString23(UIStrings23.invalidScopeSpecification);
    case "MissingScopeSpecificationType":
      return i18nString23(UIStrings23.missingScopeSpecificationType);
    case "EmptyScopeSpecificationDomain":
      return i18nString23(UIStrings23.emptyScopeSpecificationDomain);
    case "EmptyScopeSpecificationPath":
      return i18nString23(UIStrings23.emptyScopeSpecificationPath);
    case "InvalidScopeSpecificationType":
      return i18nString23(UIStrings23.invalidScopeSpecificationType);
    case "InvalidScopeIncludeSite":
      return i18nString23(UIStrings23.invalidScopeIncludeSite);
    case "MissingScopeIncludeSite":
      return i18nString23(UIStrings23.missingScopeIncludeSite);
    case "FederatedNotAuthorizedByProvider":
      return i18nString23(UIStrings23.federatedNotAuthorizedByProvider);
    case "FederatedNotAuthorizedByRelyingParty":
      return i18nString23(UIStrings23.federatedNotAuthorizedByRelyingParty);
    case "SessionProviderWellKnownMalformed":
      return i18nString23(UIStrings23.sessionProviderWellKnownMalformed);
    case "SessionProviderWellKnownHasProviderOrigin":
      return i18nString23(UIStrings23.sessionProviderWellKnownHasProviderOrigin);
    case "RelyingPartyWellKnownMalformed":
      return i18nString23(UIStrings23.relyingPartyWellKnownMalformed);
    case "RelyingPartyWellKnownHasRelyingOrigins":
      return i18nString23(UIStrings23.relyingPartyWellKnownHasRelyingOrigins);
    case "InvalidFederatedSessionProviderSessionMissing":
      return i18nString23(UIStrings23.invalidFederatedSessionProviderSessionMissing);
    case "InvalidFederatedSessionWrongProviderOrigin":
      return i18nString23(UIStrings23.invalidFederatedSessionWrongProviderOrigin);
    case "InvalidCredentialsCookieCreationTime":
      return i18nString23(UIStrings23.invalidCredentialsCookieCreationTime);
    case "InvalidCredentialsCookieName":
      return i18nString23(UIStrings23.invalidCredentialsCookieName);
    case "InvalidCredentialsCookieParsing":
      return i18nString23(UIStrings23.invalidCredentialsCookieParsing);
    case "InvalidCredentialsCookieUnpermittedAttribute":
      return i18nString23(UIStrings23.invalidCredentialsCookieUnpermittedAttribute);
    case "InvalidCredentialsCookieInvalidDomain":
      return i18nString23(UIStrings23.invalidCredentialsCookieInvalidDomain);
    case "InvalidCredentialsCookiePrefix":
      return i18nString23(UIStrings23.invalidCredentialsCookiePrefix);
    case "InvalidScopeRulePath":
      return i18nString23(UIStrings23.invalidScopeRulePath);
    case "InvalidScopeRuleHostPattern":
      return i18nString23(UIStrings23.invalidScopeRuleHostPattern);
    case "ScopeRuleOriginScopedHostPatternMismatch":
      return i18nString23(UIStrings23.scopeRuleOriginScopedHostPatternMismatch);
    case "ScopeRuleSiteScopedHostPatternMismatch":
      return i18nString23(UIStrings23.scopeRuleSiteScopedHostPatternMismatch);
    case "SigningQuotaExceeded":
      return i18nString23(UIStrings23.signingQuotaExceeded);
    case "InvalidConfigJson":
      return i18nString23(UIStrings23.invalidConfigJson);
    case "InvalidFederatedSessionProviderFailedToRestoreKey":
      return i18nString23(UIStrings23.invalidFederatedSessionProviderFailedToRestoreKey);
    case "FailedToUnwrapKey":
      return i18nString23(UIStrings23.failedToUnwrapKey);
    case "SessionDeletedDuringRefresh":
      return i18nString23(UIStrings23.sessionDeletedDuringRefresh);
    default:
      return fetchResult;
  }
}
function refreshResultToString(refreshResult) {
  switch (refreshResult) {
    case "Refreshed":
      return i18nString23(UIStrings23.refreshed);
    case "InitializedService":
      return i18nString23(UIStrings23.initializedService);
    case "Unreachable":
      return i18nString23(UIStrings23.unreachable);
    case "ServerError":
      return i18nString23(UIStrings23.serverError);
    case "FatalError":
      return i18nString23(UIStrings23.fatalError);
    case "SigningQuotaExceeded":
      return i18nString23(UIStrings23.signingQuotaExceeded);
    default:
      return refreshResult;
  }
}
function challengeResultToString(challengeResult) {
  switch (challengeResult) {
    case "Success":
      return i18nString23(UIStrings23.success);
    case "NoSessionId":
      return i18nString23(UIStrings23.noSessionId);
    case "NoSessionMatch":
      return i18nString23(UIStrings23.noSessionMatch);
    case "CantSetBoundCookie":
      return i18nString23(UIStrings23.cantSetBoundCookie);
    default:
      return challengeResult;
  }
}
function deletionReasonToString(deletionReason) {
  switch (deletionReason) {
    case "Expired":
      return i18nString23(UIStrings23.expired);
    case "FailedToRestoreKey":
      return i18nString23(UIStrings23.failedToRestoreKey);
    case "FailedToUnwrapKey":
      return i18nString23(UIStrings23.failedToUnwrapKey);
    case "StoragePartitionCleared":
      return i18nString23(UIStrings23.storagePartitionCleared);
    case "ClearBrowsingData":
      return i18nString23(UIStrings23.clearBrowsingData);
    case "ServerRequested":
      return i18nString23(UIStrings23.serverRequestedTermination);
    case "InvalidSessionParams":
      return i18nString23(UIStrings23.invalidSessionParams);
    case "RefreshFatalError":
      return i18nString23(UIStrings23.refreshFatalError);
    default:
      return deletionReason;
  }
}
function boolToString(bool) {
  return bool ? i18nString23(UIStrings23.yes) : i18nString23(UIStrings23.no);
}
function succeededToString(succeeded) {
  return succeeded ? i18nString23(UIStrings23.success) : i18nString23(UIStrings23.error);
}
function tryParseJson(body) {
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return { body };
  }
  if (typeof parsedBody === "object" && parsedBody !== null) {
    return parsedBody;
  }
  return { body: parsedBody };
}

// gen/front_end/panels/application/DOMStorageItemsView.js
var DOMStorageItemsView_exports = {};
__export(DOMStorageItemsView_exports, {
  DOMStorageItemsView: () => DOMStorageItemsView
});
import * as Common13 from "./../../core/common/common.js";
import * as i18n49 from "./../../core/i18n/i18n.js";
import * as SDK21 from "./../../core/sdk/sdk.js";
import * as TextUtils4 from "./../../core/text_utils/text_utils.js";
import * as AiAssistanceModel2 from "./../../models/ai_assistance/ai_assistance.js";
import * as SourceFrame3 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI24 from "./../../ui/legacy/legacy.js";
import * as VisualLogging15 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/KeyValueStorageItemsView.js
var KeyValueStorageItemsView_exports = {};
__export(KeyValueStorageItemsView_exports, {
  KeyValueStorageItemsView: () => KeyValueStorageItemsView
});
import "./../../ui/components/buttons/buttons.js";
import * as i18n47 from "./../../core/i18n/i18n.js";
import * as AIAssistance from "./../../models/ai_assistance/ai_assistance.js";
import * as Geometry2 from "./../../models/geometry/geometry.js";

// gen/front_end/ui/legacy/components/data_grid/dataGridAiButton.css.js
var dataGridAiButton_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.data-grid-data-grid-node .ai-button-container {
  display: none;
  float: right;

  devtools-floating-button {
    position: absolute;
    z-index: 999;
    margin-left: -17px;
  }
}

.data-grid-data-grid-node:hover .ai-button-container {
  display: inline-flex;
}

/*# sourceURL=${import.meta.resolve("./dataGridAiButton.css")} */`;

// gen/front_end/panels/application/KeyValueStorageItemsView.js
import * as UI23 from "./../../ui/legacy/legacy.js";
import { Directives as LitDirectives, html as html15, nothing as nothing8, render as render15 } from "./../../ui/lit/lit.js";
import * as VisualLogging14 from "./../../ui/visual_logging/visual_logging.js";
import * as ApplicationComponents11 from "./components/components.js";
var STORAGE_FLOATING_BUTTON_ACTION_ID = "ai-assistance.storage-floating-button";
var { ARIAUtils: ARIAUtils7 } = UI23;
var { EmptyWidget: EmptyWidget9 } = UI23.EmptyWidget;
var { VBox, widget: widget10 } = UI23.Widget;
var { Size: Size2 } = Geometry2;
var { repeat: repeat2, ifDefined } = LitDirectives;
var UIStrings24 = {
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
var str_24 = i18n47.i18n.registerUIStrings("panels/application/KeyValueStorageItemsView.ts", UIStrings24);
var i18nString24 = i18n47.i18n.getLocalizedString.bind(void 0, str_24);
var MAX_VALUE_LENGTH = 4096;
var KeyValueStorageItemsView = class extends UI23.Widget.VBox {
  #preview;
  #previewValue;
  #items = [];
  #selectedKey = null;
  #view;
  #isSortOrderAscending = true;
  #editable;
  #toolbar;
  metadataView;
  #jslog;
  #classes;
  constructor(title, id, editable, view, metadataView, jslog, classes) {
    metadataView ??= new ApplicationComponents11.StorageMetadataView.StorageMetadataView();
    if (!view) {
      view = (input, output, target) => {
        render15(
          html15`
            <devtools-widget
              ${widget10(StorageItemsToolbar, { metadataView })}
              class=flex-none
              @Refresh=${input.onRefresh}
              @DeleteAll=${input.onDeleteAll}
              @DeleteSelected=${input.onDeleteSelected}
              ${UI23.Widget.widgetRef(StorageItemsToolbar, (view2) => {
            output.toolbar = view2;
          })}
            ></devtools-widget>
            <devtools-split-view sidebar-position="second" name="${id}-split-view-state">
               <devtools-widget
                  slot="main"
                  ${widget10(VBox, { minimumSize: new Size2(0, 50) })}>
                <devtools-data-grid
                  .name=${`${id}-datagrid-with-preview`}
                  striped
                  style="flex: auto"
                  @sort=${(e) => input.onSort(e.detail.ascending)}
                  @refresh=${input.onRefresh}
                  @create=${(e) => input.onCreate(e.detail.key, e.detail.value)}
                  @deselect=${() => input.onSelect(null)}
                >
                  <table>
                    ${input.showAiButton ? html15`<style>${dataGridAiButton_css_default}</style>` : nothing8}
                    <tr>
                      <th id="key" sortable ?editable=${input.editable}>
                        ${i18nString24(UIStrings24.key)}
                      </th>
                      <th id="value" ?editable=${input.editable}>
                        ${i18nString24(UIStrings24.value)}
                      </th>
                    </tr>
                    ${repeat2(input.items, (item2) => item2.key, (item2) => html15`
                      <tr data-key=${item2.key} data-value=${item2.value}
                          @select=${() => input.onSelect(item2)}
                          @edit=${(e) => input.onEdit(item2.key, item2.value, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                          @delete=${() => input.onDelete(item2.key)}
                          @contextmenu=${(e) => input.onContextMenu?.(item2, e.detail)}
                          selected=${input.selectedKey === item2.key || nothing8}>
                        <td>${input.showAiButton ? html15`
                            <span class="ai-button-container">
                              <devtools-floating-button
                                icon-name=${AIAssistance.AiUtils.getIconName()}
                                title=${ifDefined(input.aiButtonTitle)}
                                @click=${(e) => input.onAiButtonClick?.(item2, e)}
                              ></devtools-floating-button>
                            </span>
                          ` : nothing8}${item2.key}</td>
                        <td>${item2.value.substr(0, MAX_VALUE_LENGTH)}</td>
                      </tr>`)}
                      <tr placeholder></tr>
                  </table>
                </devtools-data-grid>
              </devtools-widget>
              <devtools-widget
                  slot="sidebar"
                  ${widget10(VBox, { minimumSize: new Size2(0, 50) })}
                  jslog=${VisualLogging14.pane("preview").track({ resize: true })}>
               ${input.preview?.element}
              </devtools-widget>
            </devtools-split-view>`,
          // clang-format on
          target,
          { container: { attributes: { jslog: input.jslog }, classes: input.classes } }
        );
      };
    }
    super();
    this.metadataView = metadataView;
    this.#editable = editable;
    this.#jslog = jslog;
    this.#classes = classes;
    this.#view = view;
    this.performUpdate();
    this.#preview = new EmptyWidget9(i18nString24(UIStrings24.noPreviewSelected), i18nString24(UIStrings24.selectAValueToPreview));
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
      set toolbar(toolbar8) {
        that.#toolbar = toolbar8;
      }
    };
    const viewInput = {
      items: this.#items,
      selectedKey: this.#selectedKey,
      editable: this.#editable,
      preview: this.#preview,
      jslog: this.#jslog,
      classes: this.#classes,
      showAiButton: this.isAiButtonEnabled(),
      aiButtonTitle: this.isAiButtonEnabled() && UI23.ActionRegistry.ActionRegistry.instance().hasAction(STORAGE_FLOATING_BUTTON_ACTION_ID) ? UI23.ActionRegistry.ActionRegistry.instance().getAction(STORAGE_FLOATING_BUTTON_ACTION_ID).title() : void 0,
      onSelect: (item2) => {
        this.#toolbar?.setCanDeleteSelected(Boolean(item2));
        void this.#previewEntry(item2);
        this.selectedItemChanged(item2);
      },
      onAiButtonClick: this.isAiButtonEnabled() ? (item2, event) => {
        this.onAiButtonClick(item2, event);
      } : void 0,
      onContextMenu: (item2, contextMenu) => {
        this.populateContextMenu(item2, contextMenu);
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
      onDeleteSelected: () => {
        this.deleteSelectedItem();
      },
      onDeleteAll: () => {
        this.deleteAllItems();
      },
      onRefresh: () => {
        this.refreshItems();
      }
    };
    this.#view(viewInput, viewOutput, this.contentElement);
    this.doResize();
  }
  isAiButtonEnabled() {
    return false;
  }
  populateContextMenu(_item, _contextMenu) {
  }
  onAiButtonClick(_item, _event) {
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
    ARIAUtils7.LiveAnnouncer.alert(i18nString24(UIStrings24.numberEntries, { PH1: this.#items.length }));
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
      preview = new EmptyWidget9(i18nString24(UIStrings24.noPreviewSelected), i18nString24(UIStrings24.selectAValueToPreview));
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
  set jslog(jslog) {
    if (this.#jslog === jslog) {
      return;
    }
    this.#jslog = jslog;
    this.performUpdate();
  }
  get jslog() {
    return this.#jslog;
  }
  set editable(editable) {
    this.#editable = editable;
    this.performUpdate();
  }
  keys() {
    return this.#items.map((item2) => item2.key);
  }
  selectedItemChanged(_item) {
  }
};

// gen/front_end/panels/application/DOMStorageItemsView.js
var UIStrings25 = {
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
  domStorageItemDeleted: "The storage item was deleted.",
  /**
   * @description Text of a context menu item to start a chat with AI
   */
  startAChat: "Start a chat",
  /**
   * @description Text of a context menu item to explain a storage item of a storage bucket with AI
   */
  explainItem: "Explain this item"
};
var str_25 = i18n49.i18n.registerUIStrings("panels/application/DOMStorageItemsView.ts", UIStrings25);
var i18nString25 = i18n49.i18n.getLocalizedString.bind(void 0, str_25);
var DOMStorageItemsView = class extends KeyValueStorageItemsView {
  domStorage;
  eventListeners;
  constructor(domStorage) {
    super(
      i18nString25(UIStrings25.domStorageItems),
      "dom-storage",
      true,
      /* view=*/
      void 0,
      /* metadataView=*/
      void 0,
      /* jslog=*/
      void 0,
      ["storage-view", "table"]
    );
    this.domStorage = domStorage;
    if (domStorage.storageKey) {
      this.toolbar?.setStorageKey(domStorage.storageKey);
    }
    this.showPreview(null, null);
    this.eventListeners = [];
    this.setStorage(domStorage);
  }
  createPreview(key, value) {
    const protocol = this.domStorage.isLocalStorage ? "localstorage" : "sessionstorage";
    const url = `${protocol}://${key}`;
    const provider = TextUtils4.StaticContentProvider.StaticContentProvider.fromString(url, Common13.ResourceType.resourceTypes.XHR, value);
    return SourceFrame3.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
  }
  setStorage(domStorage) {
    Common13.EventTarget.removeEventListeners(this.eventListeners);
    this.domStorage = domStorage;
    const storageKind = domStorage.isLocalStorage ? "local-storage-data" : "session-storage-data";
    this.jslog = `${VisualLogging15.pane().context(storageKind)}`;
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
    UI24.ARIAUtils.LiveAnnouncer.alert(i18nString25(UIStrings25.domStorageItemsCleared));
  }
  domStorageItemRemoved(event) {
    if (!this.isShowing()) {
      return;
    }
    this.itemRemoved(event.data.key);
  }
  itemRemoved(key) {
    super.itemRemoved(key);
    UI24.ARIAUtils.LiveAnnouncer.alert(i18nString25(UIStrings25.domStorageItemDeleted));
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
  #setAiStorageContext(item2) {
    const storageKey = this.domStorage.storageKey;
    if (!storageKey) {
      return;
    }
    const parsedKey = SDK21.StorageKeyManager.parseStorageKey(storageKey);
    const origin = parsedKey.origin;
    const storageType = this.domStorage.isLocalStorage ? "localStorage" : "sessionStorage";
    const target = SDK21.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainPageOrigin = target?.inspectedURL() ? Common13.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL()) : "";
    if (!mainPageOrigin) {
      UI24.Context.Context.instance().setFlavor(AiAssistanceModel2.StorageItem.StorageItem, null);
      return;
    }
    const storageItem = new AiAssistanceModel2.StorageItem.DOMStorageItem(mainPageOrigin, origin, storageKey, storageType, item2 ? item2.key : void 0);
    UI24.Context.Context.instance().setFlavor(AiAssistanceModel2.StorageItem.StorageItem, storageItem);
  }
  deleteAllItems() {
    this.domStorage.clear();
    this.domStorageItemsCleared();
  }
  selectedItemChanged(item2) {
    this.#setAiStorageContext(item2);
  }
  isAiButtonEnabled() {
    return UI24.ActionRegistry.ActionRegistry.instance().hasAction("ai-assistance.storage-floating-button");
  }
  populateContextMenu(item2, contextMenu) {
    const openAiAssistanceId = "ai-assistance.application-panel-context";
    const actionRegistry = UI24.ActionRegistry.ActionRegistry.instance();
    if (actionRegistry.hasAction(openAiAssistanceId)) {
      this.#setAiStorageContext(item2);
      const action6 = actionRegistry.getAction(openAiAssistanceId);
      const submenu = contextMenu.footerSection().appendSubMenuItem(action6.title(), false, openAiAssistanceId);
      submenu.defaultSection().appendAction(openAiAssistanceId, i18nString25(UIStrings25.startAChat));
      submenu.defaultSection().appendItem(i18nString25(UIStrings25.explainItem), () => action6.execute({ prompt: "Explain this storage item." }), { disabled: !action6.enabled(), jslogContext: openAiAssistanceId + ".storage" });
    }
  }
  onAiButtonClick(item2, _event) {
    this.#setAiStorageContext(item2);
    const aiFloatingActionId = "ai-assistance.storage-floating-button";
    const actionRegistry = UI24.ActionRegistry.ActionRegistry.instance();
    if (actionRegistry.hasAction(aiFloatingActionId)) {
      void actionRegistry.getAction(aiFloatingActionId).execute();
    }
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
import * as Common14 from "./../../core/common/common.js";
import * as i18n51 from "./../../core/i18n/i18n.js";
import * as TextUtils5 from "./../../core/text_utils/text_utils.js";
import * as JSON5 from "./../../third_party/json5/json5.js";
import * as SourceFrame4 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI25 from "./../../ui/legacy/legacy.js";
import * as VisualLogging16 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings26 = {
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
var str_26 = i18n51.i18n.registerUIStrings("panels/application/ExtensionStorageItemsView.ts", UIStrings26);
var i18nString26 = i18n51.i18n.getLocalizedString.bind(void 0, str_26);
var ExtensionStorageItemsView = class extends KeyValueStorageItemsView {
  #extensionStorage;
  extensionStorageItemsDispatcher;
  constructor(extensionStorage, view) {
    super(i18nString26(UIStrings26.extensionStorageItems), "extension-storage", true, view, void 0, `${VisualLogging16.pane().context("extension-storage-data")}`, ["storage-view", "table"]);
    this.extensionStorageItemsDispatcher = new Common14.ObjectWrapper.ObjectWrapper();
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
    const provider = TextUtils5.StaticContentProvider.StaticContentProvider.fromString(url, Common14.ResourceType.resourceTypes.XHR, value);
    return SourceFrame4.PreviewFactory.PreviewFactory.createPreview(provider, "text/plain");
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
    UI25.ARIAUtils.LiveAnnouncer.alert(i18nString26(UIStrings26.extensionStorageItemsCleared));
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
var ResourcesPanel = class _ResourcesPanel extends UI26.Panel.PanelWithSidebar {
  resourcesLastSelectedItemSetting;
  visibleView;
  pendingViewPromise;
  categoryView;
  storageViews;
  storageViewToolbar;
  domStorageView;
  extensionStorageView;
  cookieView;
  deviceBoundSessionsView;
  sidebar;
  mode = "default";
  constructor(mode = "default") {
    super("resources");
    this.mode = mode;
    this.registerRequiredCSS(resourcesPanel_css_default);
    this.resourcesLastSelectedItemSetting = Common15.Settings.Settings.instance().createSetting("resources-last-selected-element-path", []);
    this.visibleView = null;
    this.pendingViewPromise = null;
    this.categoryView = null;
    const mainContainer = new UI26.Widget.VBox();
    mainContainer.setMinimumSize(100, 0);
    this.storageViews = mainContainer.element.createChild("div", "vbox flex-auto");
    this.storageViewToolbar = mainContainer.element.createChild("devtools-toolbar", "resources-toolbar");
    this.splitWidget().setMainWidget(mainContainer);
    this.domStorageView = null;
    this.extensionStorageView = null;
    this.cookieView = null;
    this.deviceBoundSessionsView = null;
    this.sidebar = new ApplicationPanelSidebar(this);
    this.sidebar.show(this.panelSidebarElement());
  }
  static instance(opts = { forceNew: null, mode: "default" }) {
    const { forceNew, mode } = opts;
    if (!resourcesPanelInstance || forceNew) {
      resourcesPanelInstance = new _ResourcesPanel(mode);
    }
    return resourcesPanelInstance;
  }
  static shouldCloseOnReset(view) {
    const viewClassesToClose = [
      SourceFrame5.ResourceSourceFrame.ResourceSourceFrame,
      SourceFrame5.ImageView.ImageView,
      SourceFrame5.FontView.FontView,
      StorageItemsToolbar
    ];
    return viewClassesToClose.some((type) => view instanceof type);
  }
  static async showAndGetSidebar() {
    await UI26.ViewManager.ViewManager.instance().showView("resources");
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
    if (view instanceof UI26.View.SimpleView) {
      void view.toolbarItems().then((items) => {
        if (Array.isArray(items)) {
          items.map((item2) => this.storageViewToolbar.appendToolbarItem(item2));
          this.storageViewToolbar.classList.toggle("hidden", !items.length);
        } else {
          render16(items, this.storageViewToolbar);
          this.storageViewToolbar.classList.toggle("hidden", false);
        }
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
    this.categoryView.element.setAttribute("jslog", `${VisualLogging17.pane().context(Platform8.StringUtilities.toKebabCase(categoryName))}`);
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
    const model = cookieFrameTarget.model(SDK22.CookieModel.CookieModel);
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
    const model = target.model(SDK22.CookieModel.CookieModel);
    if (!model) {
      return;
    }
    void model.clear(cookieDomain).then(() => {
      if (this.cookieView) {
        this.cookieView.refreshItems();
      }
    });
  }
  showDeviceBoundSession(model, site, sessionId) {
    if (!this.deviceBoundSessionsView) {
      this.deviceBoundSessionsView = new DeviceBoundSessionsView();
    }
    this.deviceBoundSessionsView.showSession(model, site, sessionId);
    this.showView(this.deviceBoundSessionsView);
  }
  showDeviceBoundSessionDefault(model, title, description) {
    if (!this.deviceBoundSessionsView) {
      this.deviceBoundSessionsView = new DeviceBoundSessionsView();
    }
    this.deviceBoundSessionsView.showDefault(model, title, description);
    this.showView(this.deviceBoundSessionsView);
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
var StorageBucketRevealer = class {
  async reveal(revealInfo) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showStorageBucket(revealInfo.bucketInfo);
  }
};

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

.clear-site-data-checkboxes-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-size-5) var(--sys-size-10);
  align-items: start;
}

.clear-site-data-checkbox-column {
  display: grid;
  row-gap: var(--sys-size-5);

  > devtools-checkbox {
    margin-left: 0;
  }
}

.clear-selected-button-row {
  margin-top: var(--sys-size-7);
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
  /* Keep in sync with ui/legacy/checkboxTextLabel.css (12px input, 6px margins). */
  --nested-checkbox-indent: 24px;
}

.report-content-box {
  overflow: initial;
}

.include-third-party-cookies-row {
  margin-left: var(--nested-checkbox-indent);

  > devtools-checkbox {
    margin-left: 0;
  }
}

/*# sourceURL=${import.meta.resolve("./storageView.css")} */`;

// gen/front_end/panels/application/StorageView.js
var UIStrings27 = {
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
   * @description Button text in the Storage View of the Application panel for clearing selected site-specific storage
   */
  clearSelected: "Clear selected",
  /**
   * @description Announce message when the "clear site data" task is complete
   */
  SiteDataCleared: "Site data cleared",
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
  thirdPartyCookies: "Third-party cookies",
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
  simulateCustomStorage: "Simulate custom storage quota",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  localStorage: "Local storage",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  sessionStorage: "Session storage"
};
var storagePieColors = /* @__PURE__ */ new Map([
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
var str_27 = i18n53.i18n.registerUIStrings("panels/application/StorageView.ts", UIStrings27);
var i18nString27 = i18n53.i18n.getLocalizedString.bind(void 0, str_27);
var StorageView = class _StorageView extends UI27.Widget.VBox {
  pieColors;
  reportView;
  target;
  securityOrigin;
  storageKey;
  settings;
  includeThirdPartyCookiesSetting;
  includeThirdPartyCookiesCheckbox;
  quotaRow;
  quotaUsage;
  quotaQuota;
  quotaOverrideActive;
  pieChart;
  previousOverrideFieldValue;
  quotaOverrideCheckbox;
  quotaOverrideControlRow;
  quotaOverrideEditor;
  quotaOverrideErrorMessage;
  clearButton;
  throttler = new Common16.Throttler.Throttler(1e3);
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(storageView_css_default);
    this.contentElement.classList.add("clear-storage-container");
    this.contentElement.setAttribute("jslog", `${VisualLogging18.pane("clear-storage")}`);
    this.pieColors = storagePieColors;
    this.reportView = new UI27.ReportView.ReportView(i18nString27(UIStrings27.storageTitle));
    this.reportView.registerRequiredCSS(storageView_css_default);
    this.reportView.element.classList.add("clear-storage-header");
    this.reportView.show(this.contentElement);
    this.target = null;
    this.securityOrigin = null;
    this.storageKey = null;
    this.settings = /* @__PURE__ */ new Map();
    for (const type of AllStorageTypes) {
      this.settings.set(type, Common16.Settings.Settings.instance().createSetting("clear-storage-" + Platform9.StringUtilities.toKebabCase(type), true));
    }
    this.includeThirdPartyCookiesSetting = Common16.Settings.Settings.instance().createSetting("clear-storage-include-third-party-cookies", false);
    const clearSiteData = this.reportView.appendSection(i18nString27(UIStrings27.clearSiteData));
    clearSiteData.element.setAttribute("jslog", `${VisualLogging18.section("clear-storage")}`);
    const clearSiteDataCheckboxesRow = clearSiteData.appendRow();
    clearSiteDataCheckboxesRow.classList.add("clear-site-data-checkboxes-row");
    const leftColumn = clearSiteDataCheckboxesRow.createChild("div", "clear-site-data-checkbox-column");
    this.appendSettingCheckbox(leftColumn, i18nString27(UIStrings27.cacheStorage), "cache_storage", "cache-storage-checkbox");
    this.appendSettingCheckbox(leftColumn, i18nString27(UIStrings27.indexDB), "indexeddb", "indexeddb-checkbox");
    this.appendSettingCheckbox(leftColumn, i18nString27(UIStrings27.localAndSessionStorage), "local_storage", "local-and-session-storage-checkbox");
    const rightColumn = clearSiteDataCheckboxesRow.createChild("div", "clear-site-data-checkbox-column");
    this.appendSettingCheckbox(rightColumn, i18nString27(UIStrings27.unregisterServiceWorker), "service_workers", "unregister-service-worker-checkbox");
    const cookiesCheckbox = this.appendSettingCheckbox(rightColumn, i18nString27(UIStrings27.cookies), "cookies", "cookies-checkbox");
    cookiesCheckbox.classList.add("cookies-row");
    const includeThirdPartyCookiesRow = rightColumn.createChild("div", "include-third-party-cookies-row");
    this.includeThirdPartyCookiesCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString27(UIStrings27.thirdPartyCookies), this.includeThirdPartyCookiesSetting);
    this.includeThirdPartyCookiesCheckbox.classList.add("third-party-cookies-checkbox");
    includeThirdPartyCookiesRow.appendChild(this.includeThirdPartyCookiesCheckbox);
    const clearButtonRow = clearSiteData.appendRow();
    clearButtonRow.classList.add("clear-selected-button-row");
    this.clearButton = UI27.UIUtils.createTextButton(i18nString27(UIStrings27.clearSelected), this.clear.bind(this), { jslogContext: "storage.clear-site-data" });
    this.clearButton.id = "storage-view-clear-button";
    clearButtonRow.appendChild(this.clearButton);
    clearSiteData.markFieldListAsGroup();
    const cookiesSetting = this.settings.get(
      "cookies"
      /* Protocol.Storage.StorageType.Cookies */
    );
    if (cookiesSetting) {
      cookiesSetting.addChangeListener((event) => this.onCookiesSettingChanged(event.data));
    }
    this.includeThirdPartyCookiesSetting.addChangeListener((event) => this.onIncludeThirdPartyCookiesSettingChanged(event.data));
    cookiesCheckbox.addEventListener("change", () => {
      this.syncCheckboxAttributeState(cookiesCheckbox);
      if (!cookiesCheckbox.checked && this.includeThirdPartyCookiesCheckbox.checked) {
        this.includeThirdPartyCookiesCheckbox.click();
      }
      this.onCookiesSettingChanged(cookiesCheckbox.checked);
    });
    this.includeThirdPartyCookiesCheckbox.addEventListener("change", () => {
      this.syncCheckboxAttributeState(this.includeThirdPartyCookiesCheckbox);
      this.onIncludeThirdPartyCookiesSettingChanged(this.includeThirdPartyCookiesCheckbox.checked);
    });
    this.onCookiesSettingChanged(Boolean(cookiesSetting?.get()));
    const quota = this.reportView.appendSection(i18nString27(UIStrings27.usage));
    quota.element.setAttribute("jslog", `${VisualLogging18.section("usage")}`);
    this.quotaRow = quota.appendSelectableRow();
    this.quotaRow.classList.add("quota-usage-row");
    const learnMoreRow = quota.appendRow();
    const learnMore = Link.create("https://developer.chrome.com/docs/devtools/progressive-web-apps#opaque-responses", i18nString27(UIStrings27.learnMore), void 0, "learn-more");
    learnMoreRow.appendChild(learnMore);
    this.quotaUsage = null;
    this.quotaQuota = null;
    this.quotaOverrideActive = null;
    this.pieChart = new PerfUI.PieChart.PieChart();
    this.populatePieChart(0, []);
    const usageBreakdownRow = quota.appendRow();
    usageBreakdownRow.classList.add("usage-breakdown-row");
    usageBreakdownRow.appendChild(this.pieChart);
    this.previousOverrideFieldValue = "";
    const quotaOverrideCheckboxRow = quota.appendRow();
    quotaOverrideCheckboxRow.classList.add("quota-override-row");
    this.quotaOverrideCheckbox = UI27.UIUtils.CheckboxLabel.create(i18nString27(UIStrings27.simulateCustomStorage), false);
    this.quotaOverrideCheckbox.setAttribute("jslog", `${VisualLogging18.toggle("simulate-custom-quota").track({ change: true })}`);
    quotaOverrideCheckboxRow.appendChild(this.quotaOverrideCheckbox);
    this.quotaOverrideCheckbox.addEventListener("click", this.onClickCheckbox.bind(this), false);
    this.quotaOverrideControlRow = quota.appendRow();
    this.quotaOverrideEditor = this.quotaOverrideControlRow.createChild("input", "quota-override-notification-editor");
    this.quotaOverrideEditor.setAttribute("placeholder", i18nString27(UIStrings27.pleaseEnterANumber));
    this.quotaOverrideEditor.setAttribute("jslog", `${VisualLogging18.textField("quota-override").track({ change: true })}`);
    this.quotaOverrideControlRow.appendChild(UI27.UIUtils.createLabel(i18nString27(UIStrings27.mb)));
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
    SDK23.TargetManager.TargetManager.instance().observeTargets(this);
  }
  appendSettingCheckbox(container, title, settingName, className) {
    const setting = this.settings.get(settingName);
    if (!setting) {
      throw new Error(`Missing setting for storage type: ${settingName}`);
    }
    const checkbox = SettingsUI.SettingsUI.createSettingCheckbox(title, setting);
    if (className) {
      checkbox.classList.add(className);
    }
    container.appendChild(checkbox);
    return checkbox;
  }
  onCookiesSettingChanged(cookiesEnabled) {
    if (!cookiesEnabled) {
      this.includeThirdPartyCookiesCheckbox.toggleAttribute("checked", true);
      this.includeThirdPartyCookiesCheckbox.toggleAttribute("checked", false);
      if (this.includeThirdPartyCookiesSetting.get()) {
        this.includeThirdPartyCookiesSetting.set(false);
      }
    }
    this.updateThirdPartyCookiesCheckboxState();
  }
  onIncludeThirdPartyCookiesSettingChanged(includeThirdPartyCookiesEnabled) {
    const cookiesSetting = this.settings.get(
      "cookies"
      /* Protocol.Storage.StorageType.Cookies */
    );
    if (includeThirdPartyCookiesEnabled && cookiesSetting && !cookiesSetting.get()) {
      cookiesSetting.set(true);
      return;
    }
    this.updateThirdPartyCookiesCheckboxState();
  }
  syncCheckboxAttributeState(checkbox) {
    checkbox.toggleAttribute("checked", checkbox.checked);
  }
  updateThirdPartyCookiesCheckboxState() {
    const cookiesSetting = this.settings.get(
      "cookies"
      /* Protocol.Storage.StorageType.Cookies */
    );
    this.includeThirdPartyCookiesCheckbox.disabled = !cookiesSetting?.get();
  }
  targetAdded(target) {
    if (target !== SDK23.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.target = target;
    const securityOriginManager = target.model(SDK23.SecurityOriginManager.SecurityOriginManager);
    this.updateOrigin(securityOriginManager.mainSecurityOrigin(), securityOriginManager.unreachableMainSecurityOrigin());
    securityOriginManager.addEventListener(SDK23.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager = target.model(SDK23.StorageKeyManager.StorageKeyManager);
    this.updateStorageKey(storageKeyManager.mainStorageKey());
    storageKeyManager.addEventListener("MainStorageKeyChanged", this.storageKeyChanged, this);
  }
  targetRemoved(target) {
    if (this.target !== target) {
      return;
    }
    const securityOriginManager = target.model(SDK23.SecurityOriginManager.SecurityOriginManager);
    securityOriginManager.removeEventListener(SDK23.SecurityOriginManager.Events.MainSecurityOriginChanged, this.originChanged, this);
    const storageKeyManager = target.model(SDK23.StorageKeyManager.StorageKeyManager);
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
      this.reportView.setSubtitle(i18nString27(UIStrings27.sFailedToLoad, { PH1: unreachableMainOrigin }));
    } else {
      this.securityOrigin = mainOrigin;
      this.reportView.setSubtitle(mainOrigin);
    }
    if (oldOrigin !== this.securityOrigin) {
      this.quotaOverrideControlRow.classList.add("hidden");
      this.quotaOverrideCheckbox.checked = false;
      this.quotaOverrideErrorMessage.textContent = "";
      this.quotaUsage = null;
      this.quotaQuota = null;
      this.quotaOverrideActive = null;
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
      this.quotaOverrideErrorMessage.textContent = i18nString27(UIStrings27.internalError);
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
      this.quotaOverrideErrorMessage.textContent = i18nString27(UIStrings27.pleaseEnterANumber);
      return;
    }
    if (quota < 0) {
      this.quotaOverrideErrorMessage.textContent = i18nString27(UIStrings27.numberMustBeNonNegative);
      return;
    }
    const cutoff = 9e12;
    if (quota >= cutoff) {
      this.quotaOverrideErrorMessage.textContent = i18nString27(UIStrings27.numberMustBeSmaller, { PH1: cutoff.toLocaleString() });
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
    this.clearButton.textContent = i18nString27(UIStrings27.clearing);
    window.setTimeout(() => {
      this.clearButton.disabled = false;
      this.clearButton.textContent = label;
      this.clearButton.focus();
    }, 500);
    UI27.ARIAUtils.LiveAnnouncer.alert(i18nString27(UIStrings27.SiteDataCleared));
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
      const storageModel = target.model(SDK23.DOMStorageModel.DOMStorageModel);
      if (storageModel) {
        storageModel.clearForStorageKey(storageKey);
      }
    }
    if (set.has(
      "indexeddb"
      /* Protocol.Storage.StorageType.Indexeddb */
    ) || hasAll) {
      for (const target2 of SDK23.TargetManager.TargetManager.instance().targets()) {
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
      const cookieModel = target.model(SDK23.CookieModel.CookieModel);
      if (cookieModel) {
        void cookieModel.clear(void 0, includeThirdPartyCookies ? void 0 : originForCookies);
      }
    }
    if (set.has(
      "cache_storage"
      /* Protocol.Storage.StorageType.Cache_storage */
    ) || hasAll) {
      const target2 = SDK23.TargetManager.TargetManager.instance().primaryPageTarget();
      const model = target2?.model(SDK23.ServiceWorkerCacheModel.ServiceWorkerCacheModel);
      if (model) {
        model.clearForStorageKey(storageKey);
      }
    }
  }
  async performUpdate() {
    if (!this.securityOrigin || !this.target) {
      this.quotaRow.textContent = "";
      this.quotaUsage = null;
      this.quotaQuota = null;
      this.quotaOverrideActive = null;
      this.populatePieChart(0, []);
      return;
    }
    const securityOrigin = this.securityOrigin;
    const response = await this.target.storageAgent().invoke_getUsageAndQuota({ origin: securityOrigin });
    if (response.getError()) {
      this.quotaRow.textContent = "";
      this.quotaUsage = null;
      this.quotaQuota = null;
      this.quotaOverrideActive = null;
      this.populatePieChart(0, []);
      return;
    }
    const usageChanged = this.quotaUsage !== response.usage;
    const quotaChanged = this.quotaQuota !== response.quota;
    const overrideChanged = this.quotaOverrideActive !== response.overrideActive;
    if (usageChanged || quotaChanged || overrideChanged) {
      this.quotaUsage = response.usage;
      this.quotaQuota = response.quota;
      this.quotaOverrideActive = response.overrideActive;
      this.quotaRow.textContent = "";
      const quotaAsString = i18n53.ByteUtilities.bytesToString(response.quota);
      const usageAsString = i18n53.ByteUtilities.bytesToString(response.usage);
      const formattedQuotaAsString = i18nString27(UIStrings27.storageWithCustomMarker, { PH1: quotaAsString });
      let quota = quotaAsString;
      if (response.overrideActive) {
        const element2 = document.createElement("b");
        element2.textContent = formattedQuotaAsString;
        quota = element2;
      }
      const element = uiI18n.getFormatLocalizedString(str_27, UIStrings27.storageQuotaUsed, { PH1: usageAsString, PH2: quota });
      this.quotaRow.appendChild(element);
      UI27.Tooltip.Tooltip.install(this.quotaRow, i18nString27(UIStrings27.storageQuotaUsedWithBytes, { PH1: response.usage.toLocaleString(), PH2: response.quota.toLocaleString() }));
      if (!response.overrideActive && response.quota < 125829120) {
        const icon = new Icon();
        icon.name = "info";
        icon.style.color = "var(--icon-info)";
        icon.classList.add("small");
        UI27.Tooltip.Tooltip.install(icon, i18nString27(UIStrings27.storageQuotaIsLimitedIn));
        this.quotaRow.appendChild(icon);
      }
      if (usageChanged) {
        const slices = [];
        for (const usageForType of response.usageBreakdown.sort((a, b) => b.usage - a.usage)) {
          const value = usageForType.usage;
          if (!value) {
            continue;
          }
          const title = _StorageView.getStorageTypeName(usageForType.storageType);
          const color = this.pieColors.get(usageForType.storageType) || "#ccc";
          slices.push({ value, color, title });
        }
        this.populatePieChart(response.usage, slices);
      }
    }
    void this.throttler.schedule(this.requestUpdate.bind(this));
  }
  populatePieChart(total, slices) {
    this.pieChart.data = {
      chartName: i18nString27(UIStrings27.storageUsage),
      size: 110,
      formatter: i18n53.ByteUtilities.bytesToString,
      showLegend: true,
      total,
      slices
    };
  }
  static getStorageTypeName(type) {
    switch (type) {
      case "file_systems":
        return i18nString27(UIStrings27.fileSystem);
      case "indexeddb":
        return i18nString27(UIStrings27.indexDB);
      case "cache_storage":
        return i18nString27(UIStrings27.cacheStorage);
      case "service_workers":
        return i18nString27(UIStrings27.serviceWorkers);
      default:
        return i18nString27(UIStrings27.other);
    }
  }
  /**
   * Returns the user-facing title of a storage type for the storage breakdown widget in AI assistance.
   * This method accepts arbitrary strings to accommodate custom storage types (like session_storage)
   * that do not exist in the Protocol.Storage.StorageType enum.
   */
  static getStorageTypeNameForWidget(type) {
    switch (type) {
      case "session_storage":
        return i18nString27(UIStrings27.sessionStorage);
      case "local_storage":
        return i18nString27(UIStrings27.localStorage);
      case "cookies":
        return i18nString27(UIStrings27.cookies);
      case "indexeddb":
        return i18nString27(UIStrings27.indexDB);
      case "cache_storage":
        return i18nString27(UIStrings27.cacheStorage);
      case "service_workers":
        return i18nString27(UIStrings27.serviceWorkers);
      default:
        return _StorageView.getStorageTypeName(type);
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
    const target = SDK23.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return false;
    }
    const resourceTreeModel = target.model(SDK23.ResourceTreeModel.ResourceTreeModel);
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
var StorageRevealable = class {
  target;
  constructor(target) {
    this.target = target;
  }
};
var StorageRevealer = class {
  async reveal(_revealable) {
    const sidebar = await ResourcesPanel.showAndGetSidebar();
    sidebar.showStorage();
  }
};

// gen/front_end/panels/application/TrustTokensTreeElement.js
var TrustTokensTreeElement_exports = {};
__export(TrustTokensTreeElement_exports, {
  TrustTokensTreeElement: () => TrustTokensTreeElement,
  i18nString: () => i18nString28
});
import * as i18n55 from "./../../core/i18n/i18n.js";
import { createIcon as createIcon9 } from "./../../ui/kit/kit.js";
import * as UI28 from "./../../ui/legacy/legacy.js";
import * as ApplicationComponents12 from "./components/components.js";
var UIStrings28 = {
  /**
   * @description Hover text for an info icon in the Private State Token panel.
   * Previously known as 'Trust Tokens'.
   */
  trustTokens: "Private state tokens"
};
var str_28 = i18n55.i18n.registerUIStrings("panels/application/TrustTokensTreeElement.ts", UIStrings28);
var i18nString28 = i18n55.i18n.getLocalizedString.bind(void 0, str_28);
var TrustTokensTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString28(UIStrings28.trustTokens), false, "private-state-tokens");
    const icon = createIcon9("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "trustTokens://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new ApplicationComponents12.TrustTokensView.TrustTokensView();
    }
    this.showView(this.view);
    UI28.UIUserMetrics.UIUserMetrics.instance().panelShown("trust-tokens");
    return false;
  }
};

// gen/front_end/panels/application/WebMCPTreeElement.js
var WebMCPTreeElement_exports = {};
__export(WebMCPTreeElement_exports, {
  WebMCPTreeElement: () => WebMCPTreeElement
});
import { createIcon as createIcon10 } from "./../../ui/kit/kit.js";
import * as UI30 from "./../../ui/legacy/legacy.js";
import { html as html17, render as render18 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/application/WebMCPView.js
var WebMCPView_exports = {};
__export(WebMCPView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW11,
  PAYLOAD_DEFAULT_VIEW: () => PAYLOAD_DEFAULT_VIEW,
  PayloadWidget: () => PayloadWidget,
  ToolDetailsWidget: () => ToolDetailsWidget,
  WebMCPView: () => WebMCPView,
  filterToolCalls: () => filterToolCalls,
  getJSONEditorParameters: () => getJSONEditorParameters,
  parsePayload: () => parsePayload,
  parseToolSchema: () => parseToolSchema
});
import "./../../ui/components/icon_button/icon_button.js";
import "./../../ui/components/lists/lists.js";
import "./../../ui/components/node_text/node_text.js";
import "./../../ui/legacy/components/data_grid/data_grid.js";
import "./../../ui/legacy/legacy.js";
import * as Common17 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n57 from "./../../core/i18n/i18n.js";
import * as Platform10 from "./../../core/platform/platform.js";
import * as SDK24 from "./../../core/sdk/sdk.js";
import * as WebMCP from "./../../models/web_mcp/web_mcp.js";
import * as Adorners from "./../../ui/components/adorners/adorners.js";
import * as Buttons9 from "./../../ui/components/buttons/buttons.js";
import * as ObjectUI2 from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as Components4 from "./../../ui/legacy/components/utils/utils.js";
import * as UI29 from "./../../ui/legacy/legacy.js";
import { Directives as Directives7, html as html16, nothing as nothing9, render as render17 } from "./../../ui/lit/lit.js";
import * as VisualLogging19 from "./../../ui/visual_logging/visual_logging.js";
import * as Console2 from "./../console/console.js";

// gen/front_end/panels/console/symbolizedErrorWidget.css.js
var symbolizedErrorWidget_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.symbolized-error-widget {
  white-space: pre-wrap;
  word-break: break-all;

  --display-formatted-stack-frame-default: block;
  --display-ignored-formatted-stack-frame-local: var(--display-ignored-formatted-stack-frame, none);

  &.show-hidden-rows {
    --display-ignored-formatted-stack-frame-local: var(--display-formatted-stack-frame-default);
  }
}

.symbolized-error-widget .formatted-stack-frame {
  display: var(--display-formatted-stack-frame-default);

  &:has(.ignore-list-link) {
    display: var(--display-ignored-formatted-stack-frame-local);
    opacity: 60%;

    /* Subsequent builtin stack frames are also treated as ignored */
    & + .formatted-builtin-stack-frame {
      display: var(--display-ignored-formatted-stack-frame-local);
      opacity: 60%;
    }
  }
}

.symbolized-error-widget .formatted-builtin-stack-frame {
  display: var(--display-formatted-stack-frame-default);
}

.symbolized-error-widget-host {
  display: inline;
}

.symbolized-error-header {
  display: block;
}

.error-message-text {
  display: inline;
}

/*# sourceURL=${import.meta.resolve("./symbolizedErrorWidget.css")} */`;

// gen/front_end/panels/application/WebMCPView.js
import * as ProtocolMonitor from "./../protocol_monitor/protocol_monitor.js";

// gen/front_end/panels/application/webMCPView.css.js
var webMCPView_css_default = `/*
 * Copyright 2026 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .webmcp-view {
    height: 100%;
    width: 100%;
  }

  .call-log,
  .tool-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: auto;
    padding: 0;
  }

  .empty-view-scroller {
    flex: auto;
  }

  devtools-data-grid {
    flex: auto;
  }

  .data-grid {
    th {
      height: 26px;
    }

    td {
      vertical-align: middle;
    }

    tr.status-cancelled {
      color: var(--sys-color-on-surface-light);
    }

    tr.status-error {
      color: var(--sys-color-error);
    }

    tr.selected {
      background-color: var(--sys-color-tonal-container);
    }

    tbody tr.selected.status-error,
    tbody tr.selected.status-error.revealed {
      background-color: var(--sys-color-error-container);
      color: var(--sys-color-error);
    }

    tbody tr:hover .run-tool-action-button,
    tbody tr:focus-within .run-tool-action-button,
    &:focus-within tbody tr.selected .run-tool-action-button {
      display: flex;
    }
  }

  .section-title {
    display: flex;
    gap: var(--sys-size-2);
    background-color: var(--sys-color-surface1);
    padding: 0 var(--sys-size-3);
    line-height: var(--sys-size-10);
    overflow: hidden;
    align-items: center;
    flex: none;
    color: var(--sys-color-on-surface);
    border-bottom: 1px solid var(--sys-color-divider);

    devtools-button {
      margin: calc(-1 * var(--sys-size-1)) 0;
    }
  }

  .status-cell {
    display: flex;
    align-items: center;
    gap: var(--sys-size-3);
  }

  .name-cell {
    display: flex;
    gap: var(--sys-size-5);
    align-items: center;
    min-width: 0;
  }

  .name-cell > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .run-tool-action-button {
    display: none;
    width: var(--sys-size-8);
    height: var(--sys-size-8);
    padding: 0;
    border: none;
    background-color: transparent;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    devtools-icon {
      width: var(--sys-size-7);
      height: var(--sys-size-7);
      color: var(--sys-color-primary);
    }
  }

  .tool-details {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tool-details-grid {
    display: grid;
    grid-template-columns: min-content 1fr;
    gap: var(--sys-size-6);
    padding: calc(0.5*var(--sys-size-6)) var(--sys-size-8);
    align-items: flex-start;
    overflow-y: auto;

    .label {
      color: var(--sys-color-on-surface-subtle);
      white-space: nowrap;
      padding: var(--sys-size-3) 0;
    }

    .value {
      user-select: text;

      &.source-code {
        color: var(--sys-color-token-property-special);
      }

      padding: var(--sys-size-3) 0;
      color: var(--sys-color-on-surface);
      overflow-wrap: anywhere;

      &.stack-trace {
        display: flex;
        padding: 0;
        margin-top: calc(-1 * (var(--sys-size-1) + var(--sys-size-2)));
        margin-left: calc(-1 * var(--sys-size-3));
      }

      &.tool-origin-container {
        display: flex;
        align-items: center;
        gap: var(--sys-size-4);
      }

      .tool-origin-node {
        display: flex;
        align-items: center;
        cursor: default;
      }
    }

    .show-element {
      height: 1lh;
    }
  }

  devtools-list {
    flex: 1 1 auto;
    margin: 0;
    padding: var(--sys-size-4) 0;
    box-sizing: border-box;
  }

  .tool-item {
    display: flex;
    flex-direction: column;
    padding: var(--sys-size-5) var(--sys-size-4);
    gap: var(--sys-size-3);
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid var(--sys-color-divider);

    &:hover {
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    &.selected {
      background-color: var(--sys-color-tonal-container);
    }
  }

  .tool-name-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--sys-size-5);

    .tool-icons {
      display: flex;
      gap: var(--sys-size-2);
      align-items: center;
    }
    /* stylelint-disable-next-line selector-type-no-unknown */
    icon-button {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
  }

  .tool-name.source-code {
    color: var(--sys-color-token-property-special);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .tool-description {
    color: var(--sys-color-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  devtools-toolbar-input {
    flex-grow: 1;
    flex-shrink: 1;
  }

  .toolbar-text.status-error-text {
    color: var(--sys-color-error);
  }

  .toolbar-text.status-cancelled-text {
    color: var(--sys-color-on-surface-light);
  }

  .call-details-tabbed-pane {
    flex: auto;
    border-bottom: 1px solid var(--sys-color-divider);
  }

  .call-payload-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .call-payload-content {
    padding: var(--sys-size-5);
    flex: auto;
    overflow: auto;
  }

  .payload-value.error-text {
    color: var(--sys-color-error);
    white-space: pre-wrap;
  }

  .sidebar-tool-details {
    flex: none;
    border-bottom: 1px solid var(--sys-color-divider);
  }

  .call-to-action {
    background-color: var(--sys-color-neutral-container);
    padding: 8px;
    border-radius: 5px;
    margin: 4px;
  }

  .call-to-action-body {
    padding: 6px 0;
    margin-left: 9.5px;
    border-left: 2px solid var(--issue-color-yellow);
    padding-left: 18px;
    line-height: 20px;
  }

  .call-to-action .explanation {
    font-weight: bold;
  }

  .inline-icon {
    vertical-align: middle;
  }

  .json-editor-widget {
    flex: auto;
    /* extend the JSON editor padding to match the details grid */
    padding-left: calc(var(--sys-size-8) - 1em);
    min-height: 0;
  }

  .webmcp-run-tool-button {
    align-self: flex-end;
    margin: var(--sys-size-6) var(--sys-size-8);
  }
}

/*# sourceURL=${import.meta.resolve("./webMCPView.css")} */`;

// gen/front_end/panels/application/WebMCPView.js
var UIStrings29 = {
  /**
   * @description Text for the header of the tool registry section
   */
  toolRegistry: "Available Tools",
  /**
   * @description Title of text to display when no tools are registered
   */
  noToolsPlaceholderTitle: "Available `WebMCP` Tools",
  /**
   * @description Text to display when no tools are registered
   */
  noToolsPlaceholder: "Registered `WebMCP` tools for this page will appear here. No tools have been registered or detected yet.",
  /**
   * @description Title of text to display when no calls have been made
   */
  noCallsPlaceholderTitle: "Tool Activity",
  /**
   * @description Text to display when no calls have been made
   */
  noCallsPlaceholder: "Start interacting with your `WebMCP` agent to see real-time tool calls and executions here.",
  /**
   * @description Text for the header of the tool details section
   */
  toolDetails: "Details",
  /**
   * @description Text for the link to reveal the tool's DOM node in the Elements panel
   */
  viewInElementsPanel: "View in Elements panel",
  /**
   * @description Text for the frame of a tool
   */
  frame: "Frame",
  /**
   * @description Text for the name of a tool call
   */
  name: "Name",
  /**
   * @description Text for the status of a tool call
   */
  status: "Status",
  /**
   * @description Text for the input of a tool call
   */
  input: "Input",
  /**
   * @description Text for the output of a tool call
   */
  output: "Output",
  /**
   * @description Text for the status of a tool call that is in progress
   */
  inProgress: "In Progress",
  /**
   * @description Tooltip for the clear log button
   */
  clearLog: "Clear log",
  /**
   * @description Text to close something
   */
  close: "Close",
  /**
   * @description Placeholder for the filter input
   */
  filter: "Filter",
  /**
   * @description Tooltip for the tool types dropdown
   */
  toolTypes: "Tool types",
  /**
   * @description Tooltip for the status types dropdown
   */
  statusTypes: "Status types",
  /**
   * @description Tooltip for the clear filters button
   */
  clearFilters: "Clear filters",
  /**
   * @description Filter option for imperative tools
   */
  imperative: "Imperative",
  /**
   * @description Filter option for declarative tools
   */
  declarative: "Declarative",
  /**
   * @description Text for the status of a tool call that has failed
   */
  error: "Error",
  /**
   * @description Text for the status of a tool call that was canceled
   */
  canceled: "Canceled",
  /**
   * @description Text for the status of a tool call that succeeded
   */
  completed: "Completed",
  /**
   * @description Text for the status of a tool call that has failed
   */
  pending: "In Progress",
  /**
   * @description Text for the total number of tool calls
   * @example {2} PH1
   */
  totalCalls: "{PH1} Total calls",
  /**
   * @description Text for the number of failed tool calls
   * @example {1} PH1
   */
  failed: "{PH1} Failed",
  /**
   * @description Text for the number of canceled tool calls
   * @example {1} PH1
   */
  canceledCount: "{PH1} Canceled",
  /**
   * @description Text for the number of in progress tool calls
   * @example {1} PH1
   */
  inProgressCount: "{PH1} In Progress",
  /**
   * @description Context menu action to copy the name of a tool
   */
  copyName: "Copy name",
  /**
   * @description Context menu action to copy the description of a tool
   */
  copyDescription: "Copy description",
  /**
   * @description Context menu action to cancel an in-progress tool call
   */
  cancelCall: "Cancel",
  /**
   * @description Text for the header of the tool run section
   */
  runTool: "Run Tool",
  /**
   * @description Context menu action to reveal the tool in the tool list
   */
  revealTool: "Reveal tool",
  /**
   * @description Context menu action to edit and run the tool
   */
  editAndRun: "Edit and run",
  /**
   * @description Tooltip for the paste button
   */
  paste: "Paste",
  /**
   * @description Notice to display when a tool has been unregistered
   */
  toolUnregisteredNotice: "This tool has been unregistered",
  /**
   * @description Label for a list of tool flags or attributes
   */
  flags: "Flags",
  /**
   * @description Text for the label of the tool description
   */
  description: "Description",
  /**
   * @description Text for the label of the tool origin
   */
  origin: "Origin"
};
var str_29 = i18n57.i18n.registerUIStrings("panels/application/WebMCPView.ts", UIStrings29);
var i18nString29 = i18n57.i18n.getLocalizedString.bind(void 0, str_29);
var { widget: widget11 } = UI29.Widget;
function filterToolCalls(toolCalls, filterState) {
  let filtered = [...toolCalls];
  const statusTypes = filterState.statusTypes;
  if (statusTypes) {
    filtered = filtered.filter((call) => {
      const { completed, error, pending, canceled } = statusTypes;
      if (completed && call.result?.status === "Completed") {
        return true;
      }
      if (error && call.result?.status === "Error") {
        return true;
      }
      if (canceled && call.result?.status === "Canceled") {
        return true;
      }
      if (pending && call.result === void 0) {
        return true;
      }
      return false;
    });
  }
  const toolTypes = filterState.toolTypes;
  if (toolTypes) {
    filtered = filtered.filter((call) => {
      const { imperative, declarative } = toolTypes;
      if (imperative && !call.tool.isDeclarative) {
        return true;
      }
      if (declarative && call.tool.isDeclarative) {
        return true;
      }
      return false;
    });
  }
  if (filterState.text) {
    const regex = Platform10.StringUtilities.createPlainTextSearchRegex(filterState.text, "i");
    filtered = filtered.filter((call) => {
      return regex.test(call.tool.name) || regex.test(call.input) || call.result?.output !== void 0 && regex.test(JSON.stringify(call.result.output)) || call.result?.errorText && regex.test(call.result.errorText);
    });
  }
  return filtered;
}
function calculateToolStats(calls) {
  const stats = /* @__PURE__ */ new Map();
  const totals = /* @__PURE__ */ new Map();
  for (const call of calls) {
    let toolStats = stats.get(call.tool);
    if (!toolStats) {
      toolStats = /* @__PURE__ */ new Map();
      stats.set(call.tool, toolStats);
    }
    toolStats.set(call.result?.status, (toolStats.get(call.result?.status) ?? 0) + 1);
    totals.set(call.result?.status, (totals.get(call.result?.status) ?? 0) + 1);
  }
  return { totals, stats };
}
function toolStatsIcon(status) {
  switch (status) {
    case "Completed":
      return { iconName: "check-circle", iconColor: "var(--sys-color-green)" };
    case "Error":
      return { iconName: "cross-circle-filled", iconColor: "var(--sys-color-error)" };
    case "Canceled":
      return { iconName: "record-stop", iconColor: "var(--sys-color-on-surface-light)" };
    case void 0:
      return { iconName: "watch" };
  }
}
function getIconGroupsFromStats(toolStats) {
  const status = [
    "Completed",
    "Error",
    "Canceled",
    void 0
  ];
  return status.map((status2) => ({
    ...toolStatsIcon(status2),
    iconWidth: "var(--sys-size-8)",
    iconHeight: "var(--sys-size-8)",
    text: String(toolStats?.get(status2) ?? 0),
    status: status2
  })).filter(({ text }) => text !== "0");
}
function parsePayload(payload) {
  if (payload === void 0) {
    return { valueObject: void 0, valueString: void 0 };
  }
  if (typeof payload === "string") {
    try {
      return { valueObject: JSON.parse(payload), valueString: void 0 };
    } catch {
      return { valueObject: void 0, valueString: payload };
    }
  }
  return { valueObject: payload, valueString: void 0 };
}
function getJSONEditorParameters(tool) {
  const parsedSchema = parseToolSchema(tool.inputSchema);
  const metadataByCommand = /* @__PURE__ */ new Map();
  metadataByCommand.set(tool.name, {
    parameters: parsedSchema.parameters,
    description: tool.description,
    replyArgs: []
  });
  return {
    metadataByCommand,
    typesByName: parsedSchema.typesByName,
    enumsByName: parsedSchema.enumsByName
  };
}
var DEFAULT_VIEW11 = (input, output, target) => {
  const tools = input.tools;
  let editorWidget = null;
  const toolStats = calculateToolStats(input.toolCalls);
  const isFilterActive = Boolean(input.filters.text) || Boolean(input.filters.toolTypes) || Boolean(input.filters.statusTypes);
  const iconName = (call) => {
    switch (call.result?.status) {
      case "Error":
        return "cross-circle-filled";
      case "Canceled":
        return "record-stop";
      case void 0:
        return "watch";
      default:
        return "";
    }
  };
  const statusString = (call) => {
    switch (call.result?.status) {
      case "Error":
        return i18nString29(UIStrings29.error);
      case "Canceled":
        return i18nString29(UIStrings29.canceled);
      case "Completed":
        return i18nString29(UIStrings29.completed);
      default:
        return i18nString29(UIStrings29.inProgress);
    }
  };
  const onIconClick = (toolName, status) => {
    let statusTypes = void 0;
    if (status === "Completed") {
      statusTypes = { completed: true };
    } else if (status === "Error") {
      statusTypes = { error: true };
    } else if (status === "Canceled") {
      statusTypes = { canceled: true };
    } else if (status === void 0) {
      statusTypes = { pending: true };
    }
    input.onFilterChange({
      ...input.filters,
      text: toolName,
      statusTypes
    });
  };
  const onToolContextMenu = (event, tool) => {
    const contextMenu = new UI29.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString29(UIStrings29.copyName), () => {
      Host3.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(tool.name);
    }, { jslogContext: "webmcp.copy-tool-name" });
    contextMenu.defaultSection().appendItem(i18nString29(UIStrings29.copyDescription), () => {
      Host3.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(tool.description);
    }, { jslogContext: "webmcp.copy-tool-description" });
    void contextMenu.show();
  };
  render17(html16`
    <style>${webMCPView_css_default}</style>
    <style>${UI29.FilterBar.filterStyles}</style>
    <devtools-split-view class="webmcp-view" direction="row" sidebar-position="second" name="webmcp-split-view">
      <div slot="main" class="call-log">
        <div class="webmcp-toolbar-container" role="toolbar" jslog=${VisualLogging19.toolbar()}>
          <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
            <devtools-button title=${i18nString29(UIStrings29.clearLog)}
                             .iconName=${"clear"}
                             .variant=${"toolbar"}
                             @click=${input.onClearLogClick}></devtools-button>
            <div class="toolbar-divider"></div>
            <devtools-toolbar-input type="filter"
                                    placeholder=${i18nString29(UIStrings29.filter)}
                                    @change=${(e) => input.onFilterChange({ ...input.filters, text: e.detail })}
                                    .value=${input.filters.text}>
            </devtools-toolbar-input>
            <div class="toolbar-divider"></div>
            ${input.filterButtons.toolTypes.button.element}
            <div class="toolbar-divider"></div>
            ${input.filterButtons.statusTypes.button.element}
            <div class="toolbar-spacer"></div>
            <devtools-button title=${i18nString29(UIStrings29.clearFilters)}
                             .iconName=${"filter-clear"}
                             .variant=${"toolbar"}
                             @click=${() => input.onFilterChange({ text: "" })}
                             ?hidden=${!isFilterActive}></devtools-button>
          </devtools-toolbar>
        </div>
        ${input.toolCalls.length > 0 ? html16`
          <devtools-split-view name="webmcp-call-split-view"
                               direction="column"
                               sidebar-position="second"
                               sidebar-visibility=${input.selectedCall ? "show" : "hidden"}>
            <div slot="main" style="display: flex; flex-direction: column; overflow: hidden; height: 100%;">
              <devtools-data-grid striped .template=${html16`
                <table>
                  <style>${webMCPView_css_default}</style>
                  <tr>
                    <th id="name" weight="20">
                      ${i18nString29(UIStrings29.name)}
                    </th>
                    <th id="status" weight="20">${i18nString29(UIStrings29.status)}</th>
                            ${!input.selectedCall ? html16`
                    <th id="input" weight="30">${i18nString29(UIStrings29.input)}</th>
                    <th id="output" weight="30">${i18nString29(UIStrings29.output)}</th>
                            ` : nothing9}
                  </tr>
                      ${Directives7.repeat(input.toolCalls, (call) => call.invocationId + "-" + (call.result?.status ?? ""), (call) => html16`
                    <tr class=${Directives7.classMap({
    "status-error": call.result?.status === "Error",
    "status-cancelled": call.result?.status === "Canceled",
    selected: call === input.selectedCall
  })} @click=${() => input.onCallSelect(call)}
                        @contextmenu=${(e) => {
    const contextMenu = e.detail;
    const isUnregistered = !input.tools.includes(call.tool);
    contextMenu.defaultSection().appendItem(i18nString29(UIStrings29.revealTool), () => {
      input.onRevealTool(call.tool);
    }, { jslogContext: "webmcp.reveal-tool", disabled: isUnregistered });
    contextMenu.defaultSection().appendItem(i18nString29(UIStrings29.editAndRun), () => {
      const payload = parsePayload(call.input);
      input.onRevealTool(call.tool, payload.valueObject);
    }, { jslogContext: "webmcp.edit-and-run", disabled: isUnregistered });
    if (call.result === void 0) {
      contextMenu.defaultSection().appendItem(i18nString29(UIStrings29.cancelCall), () => {
        call.cancel();
      }, { jslogContext: "webmcp.cancel-call" });
    }
  }}>
                      <td @click=${(e) => {
    e.stopPropagation();
    input.onCallSelect(
      call,
      "webmcp.tool-details"
      /* TabId.DETAILS */
    );
  }}>
                        <div class="name-cell">
                          <span>${call.tool.name}</span>
                          <button class="run-tool-action-button"
                                  title=${i18nString29(UIStrings29.editAndRun)}
                                  aria-label=${i18nString29(UIStrings29.editAndRun)}
                                  @click=${(e) => {
    e.stopPropagation();
    const payload = parsePayload(call.input);
    input.onRevealTool(call.tool, payload.valueObject);
  }}>
                            <devtools-icon name="goto-filled"></devtools-icon>
                          </button>
                        </div>
                      </td>
                      <td @click=${(e) => {
    e.stopPropagation();
    input.onCallSelect(
      call,
      "webmcp.call-outputs"
      /* TabId.OUTPUT */
    );
  }}>
                        <div class="status-cell">
                          ${iconName(call) ? html16`<devtools-icon class="small" name=${iconName(call)}></devtools-icon>` : ""}
                          <span>${statusString(call)}</span>
                        </div>
                      </td>
                      ${!input.selectedCall ? html16`
                        <td @click=${(e) => {
    e.stopPropagation();
    input.onCallSelect(
      call,
      "webmcp.call-inputs"
      /* TabId.INPUT */
    );
  }}>${call.input}</td>
                        <td @click=${(e) => {
    e.stopPropagation();
    input.onCallSelect(
      call,
      "webmcp.call-outputs"
      /* TabId.OUTPUT */
    );
  }}>${call.result?.output !== void 0 ? JSON.stringify(call.result.output) : call.result?.errorText ?? ""}</td>
                        ` : nothing9}
                    </tr>
                  `)}
                  </table>`}>
              </devtools-data-grid>
            </div>
            <div slot="sidebar" style="height: 100%; display: flex; flex-direction: column; overflow: hidden;">
              <devtools-tabbed-pane
                class="call-details-tabbed-pane"
                @select=${(e) => input.onTabSelect(e.detail.tabId)}>
                <devtools-button
                  slot="left"
                  .iconName=${"cross"}
                  .size=${"SMALL"}
                  .variant=${"icon"}
                  title=${i18nString29(UIStrings29.close)}
                  @click=${() => input.onCallSelect(null)}
                ></devtools-button>
                <devtools-widget
                  id=${"webmcp.tool-details"}
                  ?selected=${Directives7.live(
    input.selectedTab === "webmcp.tool-details"
    /* TabId.DETAILS */
  )}
                  title=${i18nString29(UIStrings29.toolDetails)}
                  ${widget11(ToolDetailsWidget, { tool: input.selectedCall?.tool, isUnregistered: input.selectedCall ? !input.tools.includes(input.selectedCall.tool) : false })}>
                </devtools-widget>
                <devtools-widget
                  id=${"webmcp.call-inputs"}
                  ?selected=${Directives7.live(
    input.selectedTab === "webmcp.call-inputs"
    /* TabId.INPUT */
  )}
                  title=${i18nString29(UIStrings29.input)}
                  ${widget11(PayloadWidget, parsePayload(input.selectedCall?.input))}>
                </devtools-widget>
                <devtools-widget
                  id=${"webmcp.call-outputs"}
                  ?selected=${Directives7.live(
    input.selectedTab === "webmcp.call-outputs"
    /* TabId.OUTPUT */
  )}
                  title=${i18nString29(UIStrings29.output)}
                  ${widget11(PayloadWidget, {
    valueObject: input.selectedCall?.result?.output,
    errorText: input.selectedCall?.result?.errorText,
    symbolizedError: input.selectedCall?.result?.symbolizedError
  })}>
                </devtools-widget>
              </devtools-tabbed-pane>
            </div>
          </devtools-split-view>
          <div class="webmcp-toolbar-container" role="toolbar">
            <devtools-toolbar class="webmcp-toolbar" role="presentation" wrappable>
              <span class="toolbar-text">${i18nString29(UIStrings29.totalCalls, { PH1: input.toolCalls.length })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-error-text">${i18nString29(UIStrings29.failed, { PH1: toolStats.totals.get(
    "Error"
    /* Protocol.WebMCP.InvocationStatus.Error */
  ) ?? 0 })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text status-cancelled-text">${i18nString29(UIStrings29.canceledCount, { PH1: toolStats.totals.get(
    "Canceled"
    /* Protocol.WebMCP.InvocationStatus.Canceled */
  ) ?? 0 })}</span>
              <div class="toolbar-divider"></div>
              <span class="toolbar-text">${i18nString29(UIStrings29.inProgressCount, { PH1: toolStats.totals.get(void 0) ?? 0 })}</span>
            </devtools-toolbar>
          </div>
        ` : html16`
        ${UI29.Widget.widget(UI29.EmptyWidget.EmptyWidget, {
    header: i18nString29(UIStrings29.noCallsPlaceholderTitle),
    text: i18nString29(UIStrings29.noCallsPlaceholder)
  })}
        `}
      </div>
      <devtools-split-view slot="sidebar"
                           direction="column"
                           sidebar-position="second"
                           name="webmcp-details-split-view"
                           sidebar-visibility=${input.selectedTool ? "show" : "hidden"}>
        <div slot="main" class="tool-list">
          <div class="section-title">${i18nString29(UIStrings29.toolRegistry)}</div>
          ${tools.length === 0 ? html16`
          ${UI29.Widget.widget(UI29.EmptyWidget.EmptyWidget, {
    header: i18nString29(UIStrings29.noToolsPlaceholderTitle),
    text: i18nString29(UIStrings29.noToolsPlaceholder)
  })}
          ` : html16`
            <devtools-list class="square-corners">
              ${tools.map((tool) => html16`
                    <div class=${Directives7.classMap({ "tool-item": true, selected: tool === input.selectedTool?.tool })}
                         @click=${() => input.onToolSelect(tool)}
                         @contextmenu=${(e) => onToolContextMenu(e, tool)}>
                    <div class="tool-name-container">
                      <div class="tool-name source-code">${tool.name}</div>
                    <div class="tool-icons">
                      ${getIconGroupsFromStats(toolStats.stats.get(tool)).map((group) => html16`
                        <icon-button
                          .data=${{
    groups: [group],
    compact: false,
    clickHandler: () => onIconClick(tool.name, group.status)
  }}
                          @click=${(e) => e.stopPropagation()}></icon-button>`)}
                    </div>
                    </div>
                    <div class="tool-description">${tool.description}</div>
                </div>`)}
            </devtools-list>
          `}
        </div>
        <div slot="sidebar" class="tool-details">
          <div class="section-title">
            <devtools-button
              .iconName=${"cross"}
              .size=${"SMALL"}
              .variant=${"icon"}
              title=${i18nString29(UIStrings29.close)}
              @click=${() => input.onToolSelect(null)}
            ></devtools-button>
            <span>${i18nString29(UIStrings29.toolDetails)}</span>
          </div>
          ${input.selectedTool ? html16`
            <div class="sidebar-tool-details">
              ${widget11(ToolDetailsWidget, { tool: input.selectedTool.tool })}
            </div>
            <div class="section-title">
              <span>${i18nString29(UIStrings29.runTool)}</span>
              <div style="flex: auto;"></div>
              <devtools-button
                .iconName=${"import"}
                .size=${"SMALL"}
                .variant=${"text"}
                title=${i18nString29(UIStrings29.paste)}
                @click=${input.onPaste}
              >${i18nString29(UIStrings29.paste)}</devtools-button>
            </div>
            <devtools-widget
              class="json-editor-widget"
              ${widget11(ProtocolMonitor.JSONEditor.JSONEditor, {
    displayTargetSelector: false,
    displayCommandInput: false,
    displayToolbar: false,
    ...getJSONEditorParameters(input.selectedTool.tool),
    commandToDisplay: {
      command: input.selectedTool.tool.name,
      parameters: input.selectedTool.parameters || {}
    }
  })}
              ${UI29.Widget.widgetRef(ProtocolMonitor.JSONEditor.JSONEditor, (e) => {
    editorWidget = e;
  })}
              @submiteditor=${(e) => input.onRunTool({ data: e.detail })}
            ></devtools-widget>
            <devtools-button
              class="webmcp-run-tool-button"
              .variant=${"outlined"}
              .size=${"SMALL"}
              jslogContext="webmcp.run-tool"
              @click=${() => {
    if (editorWidget && input.selectedTool) {
      const params = editorWidget.getParameters();
      input.onRunTool({
        data: {
          command: input.selectedTool.tool.name,
          parameters: params
        }
      });
    }
  }}>${i18nString29(UIStrings29.runTool)}</devtools-button>
          ` : nothing9}
        </div>
      </devtools-split-view>
    </devtools-split-view>
  `, target);
};
var WebMCPView = class _WebMCPView extends UI29.Widget.VBox {
  #view;
  #selectedTool = null;
  #selectedCall = null;
  #selectedTab = void 0;
  #lastDevToolsInvocationId = null;
  #filterState = {
    text: ""
  };
  #filterButtons;
  static createFilterButtons(onToolTypesClick, onStatusTypesClick) {
    const createButton = (label, onContextMenu, jsLogContext) => {
      const button = new UI29.Toolbar.ToolbarMenuButton(
        onContextMenu,
        /* isIconDropdown=*/
        false,
        /* useSoftMenu=*/
        true,
        jsLogContext,
        /* iconName=*/
        void 0,
        /* keepOpen=*/
        true
      );
      button.setText(label);
      const adorner = new Adorners.Adorner.Adorner();
      adorner.name = "countWrapper";
      const countElement = document.createElement("span");
      adorner.append(countElement);
      adorner.classList.add("active-filters-count");
      adorner.classList.add("hidden");
      button.setAdorner(adorner);
      const setCount = (count) => {
        countElement.textContent = `${count}`;
        count === 0 ? adorner.hide() : adorner.show();
      };
      return { button, setCount };
    };
    return {
      toolTypes: createButton(i18nString29(UIStrings29.toolTypes), onToolTypesClick, "webmcp.tool-types"),
      statusTypes: createButton(i18nString29(UIStrings29.statusTypes), onStatusTypesClick, "webmcp.status-types")
    };
  }
  constructor(target, view = DEFAULT_VIEW11) {
    super(target);
    this.#view = view;
    this.#filterButtons = _WebMCPView.createFilterButtons(this.#showToolTypesContextMenu.bind(this), this.#showStatusTypesContextMenu.bind(this));
    SDK24.TargetManager.TargetManager.instance().observeModels(WebMCP.WebMCPModel.WebMCPModel, {
      modelAdded: (model) => this.#webMCPModelAdded(model),
      modelRemoved: (model) => this.#webMCPModelRemoved(model)
    });
    this.requestUpdate();
  }
  #showToolTypesContextMenu(contextMenu) {
    const toggle4 = (key) => {
      const current = this.#filterState.toolTypes ?? {};
      const next = { ...current, [key]: !current[key] };
      let toolTypesToPass = next;
      if (!next.imperative && !next.declarative) {
        toolTypesToPass = void 0;
      }
      this.#handleFilterChange({ ...this.#filterState, toolTypes: toolTypesToPass });
    };
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.imperative), () => toggle4("imperative"), { checked: this.#filterState.toolTypes?.imperative ?? false, jslogContext: "webmcp.imperative" });
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.declarative), () => toggle4("declarative"), { checked: this.#filterState.toolTypes?.declarative ?? false, jslogContext: "webmcp.declarative" });
  }
  #showStatusTypesContextMenu(contextMenu) {
    const toggle4 = (key) => {
      const current = this.#filterState.statusTypes ?? {};
      const next = { ...current, [key]: !current[key] };
      let statusTypesToPass = next;
      if (!next.completed && !next.error && !next.pending && !next.canceled) {
        statusTypesToPass = void 0;
      }
      this.#handleFilterChange({ ...this.#filterState, statusTypes: statusTypesToPass });
    };
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.completed), () => toggle4("completed"), { checked: this.#filterState.statusTypes?.["completed"] ?? false, jslogContext: "webmcp.completed" });
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.error), () => toggle4("error"), { checked: this.#filterState.statusTypes?.["error"] ?? false, jslogContext: "webmcp.error" });
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.canceled), () => toggle4("canceled"), { checked: this.#filterState.statusTypes?.["canceled"] ?? false, jslogContext: "webmcp.canceled" });
    contextMenu.defaultSection().appendCheckboxItem(i18nString29(UIStrings29.pending), () => toggle4("pending"), { checked: this.#filterState.statusTypes?.["pending"] ?? false, jslogContext: "webmcp.pending" });
  }
  #webMCPModelAdded(model) {
    model.addEventListener("ToolsAdded", this.requestUpdate, this);
    model.addEventListener("ToolsRemoved", this.#toolsRemoved, this);
    model.addEventListener("ToolInvoked", this.#toolInvoked, this);
    model.addEventListener("ToolResponded", this.requestUpdate, this);
  }
  #webMCPModelRemoved(model) {
    model.removeEventListener("ToolsAdded", this.requestUpdate, this);
    model.removeEventListener("ToolsRemoved", this.#toolsRemoved, this);
    model.removeEventListener("ToolInvoked", this.#toolInvoked, this);
    model.removeEventListener("ToolResponded", this.requestUpdate, this);
  }
  #toolInvoked(event) {
    const call = event.data;
    if (call.invocationId === this.#lastDevToolsInvocationId) {
      this.#selectedCall = call;
      this.#lastDevToolsInvocationId = null;
    }
    this.requestUpdate();
  }
  #toolsRemoved(event) {
    if (this.#selectedTool && event.data.includes(this.#selectedTool.tool)) {
      this.#selectedTool = null;
    }
    this.requestUpdate();
  }
  #handleClearLogClick = () => {
    const models = SDK24.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    for (const model of models) {
      model.clearCalls();
    }
    this.requestUpdate();
  };
  #handleFilterChange = (filters) => {
    this.#filterState = filters;
    const toolTypesCount = this.#filterState.toolTypes ? Object.values(this.#filterState.toolTypes).filter(Boolean).length : 0;
    this.#filterButtons.toolTypes.setCount(toolTypesCount);
    const statusTypesCount = this.#filterState.statusTypes ? Object.values(this.#filterState.statusTypes).filter(Boolean).length : 0;
    this.#filterButtons.statusTypes.setCount(statusTypesCount);
    this.requestUpdate();
  };
  #getTools() {
    const models = SDK24.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    const tools = models.flatMap((model) => model.tools.toArray());
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }
  performUpdate() {
    const models = SDK24.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
    const toolCalls = models.flatMap((model) => model.toolCalls);
    const filteredCalls = filterToolCalls(toolCalls, this.#filterState);
    const tools = this.#getTools();
    const input = {
      tools,
      selectedTool: this.#selectedTool,
      onToolSelect: (tool) => {
        this.#selectedTool = tool ? { tool } : null;
        this.requestUpdate();
      },
      onRevealTool: (tool, parameters) => {
        this.#selectedTool = { tool, parameters };
        this.requestUpdate();
      },
      selectedCall: this.#selectedCall,
      selectedTab: this.#selectedTab,
      onCallSelect: (call, tabId) => {
        if (call === null) {
          this.#selectedCall = null;
        } else if (this.#selectedCall === null) {
          this.#selectedCall = call;
          this.#selectedTab = tabId;
        } else {
          this.#selectedCall = call;
          this.#selectedTab = void 0;
        }
        this.requestUpdate();
      },
      onTabSelect: (tabId) => {
        this.#selectedTab = tabId;
      },
      toolCalls: filteredCalls,
      filters: this.#filterState,
      filterButtons: this.#filterButtons,
      onClearLogClick: this.#handleClearLogClick,
      onFilterChange: this.#handleFilterChange,
      onRunTool: async (event) => {
        if (this.#selectedTool) {
          this.#selectedTool.parameters = event.data.parameters || {};
          this.#lastDevToolsInvocationId = await this.#selectedTool.tool.invoke(this.#selectedTool.parameters) ?? null;
          if (this.#lastDevToolsInvocationId) {
            const models2 = SDK24.TargetManager.TargetManager.instance().models(WebMCP.WebMCPModel.WebMCPModel);
            const call = models2.flatMap((model) => model.toolCalls).find((c) => c.invocationId === this.#lastDevToolsInvocationId);
            if (call) {
              this.#selectedCall = call;
              this.#lastDevToolsInvocationId = null;
            }
          }
          this.requestUpdate();
        }
      },
      onPaste: async () => {
        try {
          const text = await navigator.clipboard.readText();
          const json = JSON.parse(text);
          if (typeof json !== "object" || json === null || Array.isArray(json)) {
            throw new Error("Pasted JSON must be an object");
          }
          if (this.#selectedTool) {
            this.#selectedTool.parameters = json;
            this.requestUpdate();
          }
        } catch {
        }
      }
    };
    this.#view(input, {}, this.contentElement);
    this.#selectedTab = void 0;
  }
};
var PAYLOAD_DEFAULT_VIEW = (input, output, target) => {
  if (input.valueObject === void 0 && input.valueString === void 0 && !input.errorText && !input.symbolizedError) {
    render17(nothing9, target);
    return;
  }
  const isParsable = input.valueObject !== void 0;
  const createPayload = (parsedInput) => {
    const object = new SDK24.RemoteObject.LocalJSONObject(parsedInput);
    const objectTree = new ObjectUI2.ObjectPropertiesSection.ObjectTree(object, {
      readOnly: true,
      propertiesMode: 1
    });
    objectTree.expanded = true;
    return html16`<devtools-tree .template=${html16`
          <style>${ObjectUI2.ObjectPropertiesSection.objectValueStyles}</style>
          <style>${ObjectUI2.ObjectPropertiesSection.objectPropertiesSectionStyles}</style>
          <ul role="tree">
            <li role=treeitem class="object-properties-section-root-element object-properties-section source-code" open>
              ${object.description}
              ${object.hasChildren ? ObjectUI2.ObjectPropertiesSection.renderObjectTree(objectTree) : nothing9}
            </li>
          </ul>
        `}></devtools-tree>`;
  };
  const createSourceText = (text) => html16`<div class="payload-value source-code">${text}</div>`;
  const createErrorText = (text) => html16`<div class="payload-value source-code error-text">${text}</div>`;
  const createException = (error) => {
    if (!error) {
      return nothing9;
    }
    return html16`
      <div class="payload-value source-code error-text">
        <devtools-widget
          ${UI29.Widget.widget(Console2.SymbolizedErrorWidget.SymbolizedErrorWidget, { error })}
        ></devtools-widget>
      </div>
    `;
  };
  render17(html16`
    <style>${webMCPView_css_default}</style>
    <style>${symbolizedErrorWidget_css_default}</style>
    <div class="call-payload-view">
      <div class="call-payload-content">
            ${isParsable ? createPayload(input.valueObject) : input.valueString !== void 0 ? createSourceText(input.valueString) : input.symbolizedError ? createException(input.symbolizedError) : input.errorText ? createErrorText(input.errorText) : nothing9}
      </div>
    </div>
  `, target);
};
var PayloadWidget = class extends UI29.Widget.Widget {
  #valueObject;
  #valueString;
  #errorText;
  #symbolizedErrorPromise;
  #symbolizedError;
  #view;
  constructor(element, view = PAYLOAD_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }
  set valueObject(valueObject) {
    this.#valueObject = valueObject;
    this.requestUpdate();
  }
  get valueObject() {
    return this.#valueObject;
  }
  set valueString(valueString) {
    this.#valueString = valueString;
    this.requestUpdate();
  }
  get valueString() {
    return this.#valueString;
  }
  set errorText(errorText) {
    this.#errorText = errorText;
    this.requestUpdate();
  }
  get errorText() {
    return this.#errorText;
  }
  async #updateSymbolizedError(symbolizedErrorPromise) {
    if (this.#symbolizedErrorPromise === symbolizedErrorPromise) {
      return;
    }
    this.#symbolizedErrorPromise = symbolizedErrorPromise;
    this.#symbolizedError = void 0;
    this.requestUpdate();
    const symbolizedError = await symbolizedErrorPromise;
    if (this.#symbolizedErrorPromise === symbolizedErrorPromise) {
      this.#symbolizedError = symbolizedError || null;
      this.requestUpdate();
    }
  }
  set symbolizedError(symbolizedErrorPromise) {
    void this.#updateSymbolizedError(symbolizedErrorPromise);
  }
  get symbolizedError() {
    return this.#symbolizedErrorPromise;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      valueObject: this.#valueObject,
      valueString: this.#valueString,
      errorText: this.#errorText,
      symbolizedError: this.#symbolizedError
    };
    this.#view(input, {}, this.contentElement);
  }
};
var TOOL_DETAILS_VIEW = (input, output, target) => {
  if (!input.tool) {
    render17(nothing9, target);
    return;
  }
  const tool = input.tool;
  const origin = input.origin;
  const flags = tool.flags;
  const formatter = new Intl.ListFormat(i18n57.DevToolsLocale.DevToolsLocale.instance().locale, {
    style: "short",
    type: "unit"
  });
  const formattedFlags = formatter.format(flags);
  render17(html16`
    <style>${webMCPView_css_default}</style>
    <div class="tool-details-grid">
      <div class="label">${i18nString29(UIStrings29.name)}</div>
      <div class="value source-code">${tool.name}</div>
      <div class="label">${i18nString29(UIStrings29.description)}</div>
      <div class="value">${tool.description}</div>
      ${flags.length > 0 ? html16`
      <div class="label">${i18nString29(UIStrings29.flags)}</div>
      <div class="value">${formattedFlags}</div>
      ` : nothing9}
      ${tool.frame ? html16`
      <div class="label">${i18nString29(UIStrings29.frame)}</div>
      <div class="value">${Components4.Linkifier.Linkifier.linkifyRevealable(tool.frame, tool.frame.displayName())}</div>
      ` : nothing9}
      ${origin instanceof SDK24.DOMModel.DOMNode ? html16`
      <div class="label">${i18nString29(UIStrings29.origin)}</div>
      <div class="value tool-origin-container">
        <span
            class="node-text-container source-code tool-origin-node"
            data-label="true"
            @mouseenter=${() => input.highlightNode(origin)}
            @mouseleave=${input.clearHighlight}>
          <devtools-node-text .data=${{
    nodeId: origin.getAttribute("id") || void 0,
    nodeTitle: origin.nodeNameInCorrectCase(),
    nodeClasses: origin.getAttribute("class")?.split(/\s+/).filter((s) => Boolean(s))
  }}>
          </devtools-node-text>
        </span>
        <devtools-button class="show-element"
           .title=${i18nString29(UIStrings29.viewInElementsPanel)}
           aria-label=${i18nString29(UIStrings29.viewInElementsPanel)}
           .iconName=${"select-element"}
           .jslogContext=${"elements.select-element"}
           .size=${"SMALL"}
           .variant=${"icon"}
           @click=${() => input.revealNode(origin)}
           ></devtools-button>
      </div>` : origin ? html16`
      <div class="label">${i18nString29(UIStrings29.origin)}</div>
      <div class="value stack-trace">
        ${widget11(Components4.JSPresentationUtils.StackTracePreviewContent, { stackTrace: origin, options: { expandable: true } })}
      </div>` : nothing9}
    </div>
    ${input.isUnregistered ? html16`
      <div class="call-to-action">
        <div class="call-to-action-body">
          <div class="explanation">
            <devtools-icon class="inline-icon medium" name="warning-filled"></devtools-icon>
            ${i18nString29(UIStrings29.toolUnregisteredNotice)}
          </div>
        </div>
      </div>
    ` : nothing9}
  `, target);
};
var ToolDetailsWidget = class extends UI29.Widget.Widget {
  #tool = null;
  #origin;
  #isUnregistered = false;
  #view;
  constructor(element, view = TOOL_DETAILS_VIEW) {
    super(element);
    this.#view = view;
  }
  set isUnregistered(isUnregistered) {
    if (this.#isUnregistered === isUnregistered) {
      return;
    }
    this.#isUnregistered = isUnregistered;
    this.requestUpdate();
  }
  get isUnregistered() {
    return this.#isUnregistered;
  }
  set tool(tool) {
    if (this.#tool === tool) {
      return;
    }
    this.#tool = tool;
    this.#origin = void 0;
    if (this.#tool) {
      void this.#setToolOrigin(this.#tool);
    }
    this.requestUpdate();
  }
  async #setToolOrigin(tool) {
    const origin = await (tool.node ? tool.node.resolvePromise() : tool.stackTrace);
    if (this.#tool === tool && origin) {
      this.#origin = origin;
      this.requestUpdate();
    }
  }
  get tool() {
    return this.#tool;
  }
  #highlightNode = (node) => {
    node.highlight();
  };
  #clearHighlight = () => {
    SDK24.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK24.TargetManager.TargetManager.instance());
  };
  #revealNode = (node) => {
    void Common17.Revealer.reveal(node);
    void node.scrollIntoView();
  };
  performUpdate() {
    const viewInput = {
      tool: this.#tool,
      isUnregistered: this.#isUnregistered,
      origin: this.#origin,
      highlightNode: this.#highlightNode,
      clearHighlight: this.#clearHighlight,
      revealNode: this.#revealNode
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
};
var parsedSchemaCache = /* @__PURE__ */ new WeakMap();
function parseToolSchema(schema) {
  if (typeof schema === "object" && schema !== null) {
    const cached = parsedSchemaCache.get(schema);
    if (cached) {
      return cached;
    }
  }
  const typesByName = /* @__PURE__ */ new Map();
  const enumsByName = /* @__PURE__ */ new Map();
  const simpleTypesByName = /* @__PURE__ */ new Map();
  let typeCount = 0;
  function createEnumRecord(values) {
    const enumRecord = {};
    for (const val of values) {
      enumRecord[String(val)] = String(val);
    }
    return enumRecord;
  }
  function preScanDefinition(name, def) {
    if (typeof def === "boolean") {
      return;
    }
    if (def.type === "string" && def.enum) {
      enumsByName.set(name, createEnumRecord(def.enum));
    } else if (def.type && typeof def.type === "string" && def.type !== "object" && def.type !== "array") {
      let paramType = "string";
      switch (def.type) {
        case "number":
        case "integer":
          paramType = "number";
          break;
        case "boolean":
          paramType = "boolean";
          break;
      }
      simpleTypesByName.set(name, paramType);
    }
  }
  function parseDefinition(name, def) {
    if (typeof def === "boolean") {
      return;
    }
    if (def.type === "object" && def.properties) {
      const nestedParams = [];
      for (const [key, value] of Object.entries(def.properties)) {
        const isOpt = !(def.required || []).includes(key);
        nestedParams.push(parseProperty(key, value, isOpt));
      }
      typesByName.set(name, nestedParams);
    }
  }
  if (schema.definitions) {
    for (const [name, def] of Object.entries(schema.definitions)) {
      preScanDefinition(name, def);
    }
  }
  if (schema.$defs) {
    for (const [name, def] of Object.entries(schema.$defs)) {
      preScanDefinition(name, def);
    }
  }
  if (schema.definitions) {
    for (const [name, def] of Object.entries(schema.definitions)) {
      parseDefinition(name, def);
    }
  }
  if (schema.$defs) {
    for (const [name, def] of Object.entries(schema.$defs)) {
      parseDefinition(name, def);
    }
  }
  function parseProperty(name, propDef, optional) {
    if (typeof propDef === "boolean") {
      return {
        name,
        optional,
        description: "",
        type: "string",
        isCorrectType: true
      };
    }
    const prop = propDef;
    if (prop.$ref) {
      const typeRef = prop.$ref.split("/").pop() || "";
      let paramType2 = "object";
      if (enumsByName.has(typeRef)) {
        paramType2 = "string";
      } else {
        const simpleType = simpleTypesByName.get(typeRef);
        if (simpleType !== void 0) {
          paramType2 = simpleType;
        }
      }
      return {
        name,
        optional,
        description: prop.description || "",
        type: paramType2,
        typeRef,
        isCorrectType: true
      };
    }
    const typeStr = Array.isArray(prop.type) ? prop.type[0] : prop.type;
    let type = typeStr === "integer" ? "number" : typeStr;
    if (!typeStr) {
      if (prop.properties) {
        type = "object";
      } else if (prop.items) {
        type = "array";
      } else {
        type = "unknown";
      }
    }
    const description = prop.description || "";
    let paramType = "unknown";
    switch (type) {
      case "string":
        paramType = "string";
        break;
      case "number":
        paramType = "number";
        break;
      case "boolean":
        paramType = "boolean";
        break;
      case "object":
        paramType = "object";
        break;
      case "array":
        paramType = "array";
        break;
    }
    const base = {
      name,
      optional,
      description,
      type: paramType,
      isCorrectType: true
    };
    if (type === "object") {
      if (prop.properties) {
        const typeRef = `Object_${++typeCount}`;
        const nestedParams = [];
        for (const [key, value] of Object.entries(prop.properties)) {
          const isOpt = !(prop.required || []).includes(key);
          nestedParams.push(parseProperty(key, value, isOpt));
        }
        typesByName.set(typeRef, nestedParams);
        base.typeRef = typeRef;
      } else {
        base.isKeyEditable = true;
      }
    } else if (type === "array") {
      const items = prop.items && !Array.isArray(prop.items) && typeof prop.items !== "boolean" ? prop.items : void 0;
      if (items) {
        const itemTypeStr = Array.isArray(items.type) ? items.type[0] : items.type;
        if (items.$ref) {
          base.typeRef = items.$ref.split("/").pop() || "";
        } else if (itemTypeStr === "object" && items.properties) {
          const typeRef = `Object_${++typeCount}`;
          const nestedParams = [];
          for (const [key, value] of Object.entries(items.properties)) {
            const isOpt = !(items.required || []).includes(key);
            nestedParams.push(parseProperty(key, value, isOpt));
          }
          typesByName.set(typeRef, nestedParams);
          base.typeRef = typeRef;
        } else if (itemTypeStr) {
          const itemType = itemTypeStr === "integer" ? "number" : itemTypeStr;
          if (itemType === "string" && items.enum) {
            const typeRef = `Enum_${++typeCount}`;
            enumsByName.set(typeRef, createEnumRecord(items.enum));
            base.typeRef = typeRef;
          } else {
            base.typeRef = itemType;
          }
        } else {
          base.typeRef = "string";
        }
      } else {
        base.typeRef = "string";
      }
    } else if (type === "string" && prop.enum) {
      const typeRef = `Enum_${++typeCount}`;
      enumsByName.set(typeRef, createEnumRecord(prop.enum));
      base.typeRef = typeRef;
    }
    return base;
  }
  const parameters = [];
  if ((schema.type === "object" || !schema.type) && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const isOpt = !(schema.required || []).includes(key);
      parameters.push(parseProperty(key, value, isOpt));
    }
  }
  const result = { parameters, typesByName, enumsByName };
  if (typeof schema === "object" && schema !== null) {
    parsedSchemaCache.set(schema, result);
  }
  return result;
}

// gen/front_end/panels/application/WebMCPTreeElement.js
var WebMCPTreeElement = class extends ApplicationPanelTreeElement {
  #view;
  constructor(storagePanel) {
    super(storagePanel, "WebMCP", false, "web-mcp");
    const icon = createIcon10("document");
    this.setLeadingIcons([icon]);
    const newBadge = UI30.UIUtils.maybeCreateNewBadge("web-mcp");
    if (newBadge) {
      const fragment = document.createDocumentFragment();
      render18(html17`<div class="trailing-icons icons-container">${newBadge}</div>`, fragment);
      this.listItemElement.appendChild(fragment);
    }
  }
  get itemURL() {
    return "webMcp://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.#view) {
      this.#view = new WebMCPView();
    }
    this.showView(this.#view);
    UI30.UIUserMetrics.UIUserMetrics.instance().panelShown("web-mcp");
    return false;
  }
};

// gen/front_end/panels/application/ApplicationPanelSidebar.js
var UIStrings30 = {
  /**
   * @description Text of a context menu item to start a chat with AI
   */
  startAChat: "Start a chat",
  /**
   * @description Text of a context menu item to explain contents of a local/session storage bucket with AI
   */
  explainStorage: "Explain storage",
  /**
   * @description Text of a context menu item to explain web cookies with AI
   */
  explainCookies: "Explain cookies",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  application: "Application",
  /**
   * @description Text in Application Panel Sidebar of the Application panel
   */
  ads: "Ads",
  /**
   * @description Tooltip for the experimental icon in the Ads panel
   */
  experimental: "Experimental",
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
   * @description Description text in the Application Panel describing a frame's resources
   */
  resourceDescription: "On this page you can view the frame\u2019s resources."
};
var str_30 = i18n59.i18n.registerUIStrings("panels/application/ApplicationPanelSidebar.ts", UIStrings30);
var i18nString30 = i18n59.i18n.getLocalizedString.bind(void 0, str_30);
function assertNotMainTarget(targetId) {
  if (targetId === "main") {
    throw new Error("Unexpected main target id");
  }
}
function nameForExtensionStorageArea(storageArea) {
  switch (storageArea) {
    case "session":
      return i18nString30(UIStrings30.extensionSessionStorage);
    case "local":
      return i18nString30(UIStrings30.extensionLocalStorage);
    case "sync":
      return i18nString30(UIStrings30.extensionSyncStorage);
    case "managed":
      return i18nString30(UIStrings30.extensionManagedStorage);
    default:
      throw new Error(`Unrecognized storage type: ${storageArea}`);
  }
}
var ApplicationPanelSidebar = class extends UI31.Widget.VBox {
  panel;
  sidebarTree;
  applicationTreeElement;
  serviceWorkersTreeElement;
  localStorageListTreeElement;
  sessionStorageListTreeElement;
  extensionStorageListTreeElement;
  indexedDBListTreeElement;
  cookieListTreeElement;
  trustTokensTreeElement;
  cacheStorageListTreeElement;
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
  webMcpTreeElement;
  adsTreeElement;
  storageTreeElement;
  deviceBoundSessionsRootTreeElement;
  deviceBoundSessionsModel;
  preloadingSummaryTreeElement;
  resourcesSection;
  domStorageTreeElements;
  extensionIdToStorageTreeParentElement;
  extensionStorageModels;
  extensionStorageTreeElements;
  domains;
  // Holds main frame target.
  target;
  previousHoveredElement;
  constructor(panel) {
    super();
    this.panel = panel;
    this.sidebarTree = new UI31.TreeOutline.TreeOutlineInShadow(
      "NavigationTree"
      /* UI.TreeOutline.TreeVariant.NAVIGATION_TREE */
    );
    this.sidebarTree.registerRequiredCSS(resourcesSidebar_css_default);
    this.sidebarTree.element.classList.add("resources-sidebar");
    this.sidebarTree.setHideOverflow(true);
    this.sidebarTree.element.classList.add("filter-all");
    this.sidebarTree.addEventListener(UI31.TreeOutline.Events.ElementAttached, this.treeElementAdded, this);
    this.contentElement.appendChild(this.sidebarTree.element);
    const applicationSectionTitle = i18nString30(UIStrings30.application);
    this.applicationTreeElement = this.addSidebarSection(applicationSectionTitle, "application");
    const applicationPanelSidebar = this.applicationTreeElement.treeOutline?.contentElement;
    if (applicationPanelSidebar) {
      applicationPanelSidebar.ariaLabel = i18nString30(UIStrings30.applicationSidebarPanel);
    }
    const manifestTreeElement = new AppManifestTreeElement(panel);
    this.applicationTreeElement.appendChild(manifestTreeElement);
    manifestTreeElement.generateChildren();
    this.serviceWorkersTreeElement = new ServiceWorkersTreeElement(panel);
    this.applicationTreeElement.appendChild(this.serviceWorkersTreeElement);
    this.storageTreeElement = new StorageTreeElement(panel);
    this.applicationTreeElement.appendChild(this.storageTreeElement);
    if (Root2.Runtime.hostConfig.devToolsWebMCPSupport?.enabled) {
      this.webMcpTreeElement = new WebMCPTreeElement(panel);
      this.applicationTreeElement.appendChild(this.webMcpTreeElement);
    }
    if (Root2.Runtime.hostConfig.devToolsAdsPanel?.enabled) {
      const adsTreeElement = new ApplicationPanelTreeElement(panel, i18nString30(UIStrings30.ads), false, "ads");
      adsTreeElement.listItemElement.classList.add("ads-tree-element");
      const icon = createIcon11("ads");
      adsTreeElement.setLeadingIcons([icon]);
      const experimentIcon = createIcon11("experiment", "medium");
      UI31.Tooltip.Tooltip.install(experimentIcon, i18nString30(UIStrings30.experimental));
      adsTreeElement.setTrailingIcons([experimentIcon]);
      adsTreeElement.itemURL = "ads://";
      let adsView;
      adsTreeElement.onselect = (selectedByUser) => {
        ApplicationPanelTreeElement.prototype.onselect.call(adsTreeElement, selectedByUser);
        if (!adsView) {
          adsView = new ApplicationComponents13.AdsView.AdsView();
        }
        adsTreeElement.showView(adsView);
        UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("ads");
        return false;
      };
      this.adsTreeElement = adsTreeElement;
      this.applicationTreeElement.appendChild(this.adsTreeElement);
    }
    const storageSectionTitle = i18nString30(UIStrings30.storage);
    const storageTreeElement = this.addSidebarSection(storageSectionTitle, "storage");
    this.localStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString30(UIStrings30.localStorage), i18nString30(UIStrings30.noLocalStorage), i18nString30(UIStrings30.localStorageDescription), "local-storage");
    this.localStorageListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/localstorage/");
    const localStorageIcon = createIcon11("table");
    this.localStorageListTreeElement.setLeadingIcons([localStorageIcon]);
    storageTreeElement.appendChild(this.localStorageListTreeElement);
    this.sessionStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString30(UIStrings30.sessionStorage), i18nString30(UIStrings30.noSessionStorage), i18nString30(UIStrings30.sessionStorageDescription), "session-storage");
    this.sessionStorageListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/sessionstorage/");
    const sessionStorageIcon = createIcon11("table");
    this.sessionStorageListTreeElement.setLeadingIcons([sessionStorageIcon]);
    storageTreeElement.appendChild(this.sessionStorageListTreeElement);
    this.extensionStorageListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString30(UIStrings30.extensionStorage), i18nString30(UIStrings30.noExtensionStorage), i18nString30(UIStrings30.extensionStorageDescription), "extension-storage");
    this.extensionStorageListTreeElement.setLink("https://developer.chrome.com/docs/extensions/reference/api/storage/");
    const extensionStorageIcon = createIcon11("table");
    this.extensionStorageListTreeElement.setLeadingIcons([extensionStorageIcon]);
    storageTreeElement.appendChild(this.extensionStorageListTreeElement);
    this.indexedDBListTreeElement = new IndexedDBTreeElement(panel);
    this.indexedDBListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/indexeddb/");
    storageTreeElement.appendChild(this.indexedDBListTreeElement);
    this.cookieListTreeElement = new ExpandableApplicationPanelTreeElement(panel, i18nString30(UIStrings30.cookies), i18nString30(UIStrings30.noCookies), i18nString30(UIStrings30.cookiesDescription), "cookies");
    this.cookieListTreeElement.setLink("https://developer.chrome.com/docs/devtools/storage/cookies/");
    const cookieIcon = createIcon11("cookie");
    this.cookieListTreeElement.setLeadingIcons([cookieIcon]);
    storageTreeElement.appendChild(this.cookieListTreeElement);
    this.trustTokensTreeElement = new TrustTokensTreeElement(panel);
    storageTreeElement.appendChild(this.trustTokensTreeElement);
    this.cacheStorageListTreeElement = new ServiceWorkerCacheTreeElement(panel);
    storageTreeElement.appendChild(this.cacheStorageListTreeElement);
    this.storageBucketsTreeElement = new StorageBucketsTreeParentElement(panel);
    storageTreeElement.appendChild(this.storageBucketsTreeElement);
    const backgroundServiceSectionTitle = i18nString30(UIStrings30.backgroundServices);
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
    if (Root2.Runtime.hostConfig.deviceBoundSessionsDebugging?.enabled) {
      this.deviceBoundSessionsModel = new DeviceBoundSessionsModel();
      this.deviceBoundSessionsRootTreeElement = new RootTreeElement(panel, this.deviceBoundSessionsModel);
      backgroundServiceTreeElement.appendChild(this.deviceBoundSessionsRootTreeElement);
    }
    const resourcesSectionTitle = i18nString30(UIStrings30.frames);
    const resourcesTreeElement = this.addSidebarSection(resourcesSectionTitle, "frames");
    this.resourcesSection = new ResourcesSection(panel, resourcesTreeElement);
    this.domStorageTreeElements = /* @__PURE__ */ new Map();
    this.extensionIdToStorageTreeParentElement = /* @__PURE__ */ new Map();
    this.extensionStorageTreeElements = /* @__PURE__ */ new Map();
    this.extensionStorageModels = [];
    this.domains = {};
    this.sidebarTree.contentElement.addEventListener("mousemove", this.onmousemove.bind(this), false);
    this.sidebarTree.contentElement.addEventListener("mouseleave", this.onmouseleave.bind(this), false);
    SDK25.TargetManager.TargetManager.instance().observeTargets(this, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().addModelListener(SDK25.ResourceTreeModel.ResourceTreeModel, SDK25.ResourceTreeModel.Events.FrameNavigated, this.frameNavigated, this, { scoped: true });
    const selection = this.panel.lastSelectedItemPath();
    if (!selection.length) {
      manifestTreeElement.select();
    }
    SDK25.TargetManager.TargetManager.instance().observeModels(SDK25.DOMStorageModel.DOMStorageModel, {
      modelAdded: (model) => this.domStorageModelAdded(model),
      modelRemoved: (model) => this.domStorageModelRemoved(model)
    }, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().observeModels(ExtensionStorageModel, {
      modelAdded: (model) => this.extensionStorageModelAdded(model),
      modelRemoved: (model) => this.extensionStorageModelRemoved(model)
    }, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().observeModels(IndexedDBModel, {
      modelAdded: (model) => this.indexedDBModelAdded(model),
      modelRemoved: (model) => this.indexedDBModelRemoved(model)
    }, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().observeModels(SDK25.StorageBucketsModel.StorageBucketsModel, {
      modelAdded: (model) => this.storageBucketsModelAdded(model),
      modelRemoved: (model) => this.storageBucketsModelRemoved(model)
    }, { scoped: true });
    this.contentElement.style.contain = "layout style";
  }
  addSidebarSection(title, jslogContext) {
    const treeElement = new UI31.TreeOutline.TreeElement(title, true, jslogContext);
    treeElement.listItemElement.classList.add("storage-group-list-item");
    treeElement.setCollapsible(false);
    treeElement.selectable = false;
    this.sidebarTree.appendChild(treeElement);
    UI31.ARIAUtils.markAsHeading(treeElement.listItemElement, 3);
    UI31.ARIAUtils.setLabel(treeElement.childrenListElement, title);
    return treeElement;
  }
  targetAdded(target) {
    if (target !== target.outermostTarget()) {
      return;
    }
    this.target = target;
    const resourceTreeModel = target.model(SDK25.ResourceTreeModel.ResourceTreeModel);
    if (!resourceTreeModel) {
      return;
    }
    if (resourceTreeModel.cachedResourcesLoaded()) {
      this.initialize();
    }
    resourceTreeModel.addEventListener(SDK25.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
    resourceTreeModel.addEventListener(SDK25.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
  }
  targetRemoved(target) {
    if (target !== this.target) {
      return;
    }
    delete this.target;
    const resourceTreeModel = target.model(SDK25.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.removeEventListener(SDK25.ResourceTreeModel.Events.CachedResourcesLoaded, this.initialize, this);
      resourceTreeModel.removeEventListener(SDK25.ResourceTreeModel.Events.WillLoadCachedResources, this.resetWithFrames, this);
    }
    this.resetWithFrames();
  }
  focus() {
    this.sidebarTree.focus();
  }
  initialize() {
    for (const frame of SDK25.ResourceTreeModel.ResourceTreeModel.frames(this.target?.targetManager() ?? SDK25.TargetManager.TargetManager.instance())) {
      this.addCookieDocument(frame);
    }
    const backgroundServiceModel = this.target?.model(BackgroundServiceModel) || null;
    this.backgroundFetchTreeElement.initialize(backgroundServiceModel);
    this.backgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.notificationsTreeElement.initialize(backgroundServiceModel);
    this.paymentHandlerTreeElement.initialize(backgroundServiceModel);
    this.periodicBackgroundSyncTreeElement.initialize(backgroundServiceModel);
    this.pushMessagingTreeElement.initialize(backgroundServiceModel);
    this.storageBucketsTreeElement?.initialize();
    const preloadingModel = this.target?.model(SDK25.PreloadingModel.PreloadingModel);
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
    this.deviceBoundSessionsModel?.clearVisibleSites();
    this.deviceBoundSessionsModel?.clearEvents();
  }
  frameNavigated(event) {
    const frame = event.data;
    if (frame.isOutermostFrame()) {
      this.reset();
      const selectedElement = this.sidebarTree.selectedTreeElement;
      if (selectedElement instanceof ExpandableApplicationPanelTreeElement) {
        const item2 = selectedElement.createGenericStorageAiContext();
        if (item2) {
          UI31.Context.Context.instance().setFlavor(AiAssistance2.StorageItem.StorageItem, item2);
        }
      }
    }
    this.addCookieDocument(frame);
  }
  addCookieDocument(frame) {
    const urlToParse = frame.unreachableUrl() || frame.url;
    const parsedURL = Common18.ParsedURL.ParsedURL.fromString(urlToParse);
    if (!parsedURL || parsedURL.scheme !== "http" && parsedURL.scheme !== "https" && parsedURL.scheme !== "file") {
      return;
    }
    const domain = parsedURL.securityOrigin();
    if (!this.domains[domain]) {
      this.domains[domain] = true;
      const cookieDomainTreeElement = new CookieTreeElement(this.panel, frame, parsedURL);
      this.cookieListTreeElement.appendChild(cookieDomainTreeElement);
      if (this.deviceBoundSessionsModel) {
        const target = frame.resourceTreeModel().target();
        const networkAgent = target.networkAgent();
        void networkAgent.invoke_fetchSchemefulSite({ origin: domain }).then((response) => {
          if (response.getError() || !this.deviceBoundSessionsModel) {
            return;
          }
          if (this.domains[domain]) {
            this.deviceBoundSessionsModel.addVisibleSite(response.schemefulSite);
          }
        });
      }
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
  showStorageBucket(bucketInfo) {
    const bucketsModel = SDK25.TargetManager.TargetManager.instance().primaryPageTarget()?.model(SDK25.StorageBucketsModel.StorageBucketsModel);
    if (bucketsModel) {
      this.storageBucketsTreeElement?.getBucketTreeElement(bucketsModel, bucketInfo)?.revealAndSelect(true);
    }
  }
  // Selects the Storage tree element in the sidebar (which opens the StorageView component for the main Storage tab).
  showStorage() {
    this.storageTreeElement?.select();
  }
  onmousemove(event) {
    const nodeUnderMouse = event.target;
    if (!nodeUnderMouse) {
      return;
    }
    const listNode = UI31.UIUtils.enclosingNodeOrSelfWithNodeName(nodeUnderMouse, "li");
    if (!listNode) {
      return;
    }
    const element = UI31.TreeOutline.TreeElement.getTreeElementBylistItemNode(listNode);
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
    super(storagePanel, BackgroundServiceView.getUIString(serviceName), false, Platform11.StringUtilities.toKebabCase(serviceName));
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
    UI31.Context.Context.instance().setFlavor(BackgroundServiceView, this.view);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("background_service_" + this.serviceName);
    return false;
  }
};
var ServiceWorkersTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18n59.i18n.lockedString("Service workers"), false, "service-workers");
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("service-workers");
    return false;
  }
};
var AppManifestTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString30(UIStrings30.manifest), true, "manifest");
    const icon = createIcon11("document");
    this.setLeadingIcons([icon]);
    self.onInvokeElement(this.listItemElement, this.onInvoke.bind(this));
    this.view = new AppManifestView();
    UI31.ARIAUtils.setLabel(this.listItemElement, i18nString30(UIStrings30.onInvokeManifestAlert));
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("app-manifest");
    return false;
  }
  generateChildren() {
    const staticSections = this.view.getStaticSections();
    for (const section8 of staticSections) {
      const childTitle = section8.title;
      const child = new ApplicationPanelTreeElement(this.resourcesPanel, childTitle, false, section8.jslogContext || "");
      child.onselect = (selectedByUser) => {
        if (selectedByUser) {
          this.showView(this.view);
          this.view.scrollToSection(childTitle);
        }
        return true;
      };
      const icon = createIcon11("document");
      child.setLeadingIcons([icon]);
      child.listItemElement.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.shiftKey) {
          return;
        }
        if (this.view.focusOnSection(childTitle)) {
          event.consume(true);
        }
      });
      UI31.ARIAUtils.setLabel(child.listItemElement, i18nString30(UIStrings30.beforeInvokeAlert, { PH1: child.listItemElement.title }));
      this.appendChild(child);
    }
  }
  onInvoke() {
    this.view.getManifestElement().scrollIntoView();
    UI31.ARIAUtils.LiveAnnouncer.alert(i18nString30(UIStrings30.onInvokeAlert, { PH1: this.listItemElement.title }));
  }
};
var StorageTreeElement = class extends ApplicationPanelTreeElement {
  view;
  constructor(storagePanel) {
    super(storagePanel, i18nString30(UIStrings30.storage), false, "storage");
    const icon = createIcon11("database");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "storage://";
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new StorageView();
    }
    this.showView(this.view);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown(Host4.UserMetrics.PanelCodes[Host4.UserMetrics.PanelCodes.storage]);
    return false;
  }
};
var IndexedDBTreeElement = class extends ExpandableApplicationPanelTreeElement {
  idbDatabaseTreeElements;
  storageBucket;
  constructor(storagePanel, storageBucket) {
    super(storagePanel, i18nString30(UIStrings30.indexeddb), i18nString30(UIStrings30.noIndexeddb), i18nString30(UIStrings30.indexeddbDescription), "indexed-db");
    const icon = createIcon11("database");
    this.setLeadingIcons([icon]);
    this.idbDatabaseTreeElements = [];
    this.storageBucket = storageBucket;
    this.initialize();
  }
  initialize() {
    SDK25.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseAdded, this.indexedDBAdded, this, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseRemoved, this.indexedDBRemoved, this, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.DatabaseLoaded, this.indexedDBLoaded, this, { scoped: true });
    SDK25.TargetManager.TargetManager.instance().addModelListener(IndexedDBModel, Events2.IndexedDBContentUpdated, this.indexedDBContentUpdated, this, { scoped: true });
    this.idbDatabaseTreeElements = [];
    for (const indexedDBModel of SDK25.TargetManager.TargetManager.instance().models(IndexedDBModel, { scoped: true })) {
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
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.refreshIndexeddb), this.refreshIndexedDB.bind(this), { jslogContext: "refresh-indexeddb" });
    void contextMenu.show();
  }
  refreshIndexedDB() {
    for (const indexedDBModel of SDK25.TargetManager.TargetManager.instance().models(IndexedDBModel, { scoped: true })) {
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
    Platform11.ArrayUtilities.removeElement(this.idbDatabaseTreeElements, idbDatabaseTreeElement);
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
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.refreshIndexeddb), this.refreshIndexedDB.bind(this), { jslogContext: "refresh-indexeddb" });
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
      this.tooltip = i18nString30(UIStrings30.versionSEmpty, { PH1: version });
    } else {
      this.tooltip = i18nString30(UIStrings30.versionS, { PH1: version });
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
      this.view = LegacyWrapper3.LegacyWrapper.legacyWrapper(UI31.Widget.VBox, new IDBDatabaseView(this.model, this.database), "indexeddb-data");
    }
    this.showView(this.view);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("indexed-db");
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
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.clear), this.clearObjectStore.bind(this), { jslogContext: "clear" });
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
    let tooltipString = keyPathString !== null ? i18nString30(UIStrings30.keyPathS, { PH1: keyPathString }) : "";
    if (this.objectStore.autoIncrement) {
      tooltipString += "\n" + i18n59.i18n.lockedString("autoIncrement");
    }
    this.tooltip = tooltipString;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new IDBDataView(this.model, this.databaseId, this.objectStore, null, this.refreshObjectStore.bind(this));
    }
    this.showView(this.view);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("indexed-db");
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
    tooltipLines.push(i18nString30(UIStrings30.keyPathS, { PH1: keyPathString }));
    if (this.index.unique) {
      tooltipLines.push(i18n59.i18n.lockedString("unique"));
    }
    if (this.index.multiEntry) {
      tooltipLines.push(i18n59.i18n.lockedString("multiEntry"));
    }
    this.tooltip = tooltipLines.join("\n");
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (!this.view) {
      this.view = new IDBDataView(this.model, this.databaseId, this.objectStore, this.index, this.refreshObjectStore);
    }
    this.showView(this.view);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("indexed-db");
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
    super(storagePanel, domStorage.storageKey ? SDK25.StorageKeyManager.parseStorageKey(domStorage.storageKey).origin : i18nString30(UIStrings30.localFiles), false, domStorage.isLocalStorage ? "local-storage-for-domain" : "session-storage-for-domain");
    this.domStorage = domStorage;
    const icon = createIcon11("table");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "storage://" + this.domStorage.storageKey + "/" + (this.domStorage.isLocalStorage ? "local" : "session");
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("dom-storage");
    this.resourcesPanel.showDOMStorage(this.domStorage);
    const storageItem = this.#getStorageItem();
    UI31.Context.Context.instance().setFlavor(AiAssistance2.StorageItem.StorageItem, storageItem);
    return false;
  }
  /**
   * Resolves the DOM storage partition context (`localStorage` or `sessionStorage`)
   * associated with this tree element for AI assistance.
   */
  #getStorageItem() {
    const target = SDK25.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainPageOrigin = target?.inspectedURL() ? Common18.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL()) : "";
    if (!mainPageOrigin || !this.domStorage.storageKey) {
      return null;
    }
    const origin = SDK25.StorageKeyManager.parseStorageKey(this.domStorage.storageKey).origin;
    const storageType = this.domStorage.isLocalStorage ? "localStorage" : "sessionStorage";
    return new AiAssistance2.StorageItem.DOMStorageItem(mainPageOrigin, origin, this.domStorage.storageKey, storageType);
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
    const storageItem = this.#getStorageItem();
    if (storageItem) {
      this.createAiButton(() => this.#getStorageItem());
    }
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.clear), () => this.domStorage.clear(), { jslogContext: "clear" });
    const storageItem = this.#getStorageItem();
    if (storageItem) {
      const openAiAssistanceId = "ai-assistance.application-panel-context";
      if (UI31.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
        UI31.Context.Context.instance().setFlavor(AiAssistance2.StorageItem.StorageItem, storageItem);
        const action6 = UI31.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
        const submenu = contextMenu.footerSection().appendSubMenuItem(action6.title(), false, openAiAssistanceId);
        submenu.defaultSection().appendAction(openAiAssistanceId, i18nString30(UIStrings30.startAChat));
        submenu.defaultSection().appendItem(i18nString30(UIStrings30.explainStorage), () => action6.execute({ prompt: "What is the purpose of this storage bucket?" }), { disabled: !action6.enabled(), jslogContext: openAiAssistanceId + ".storage" });
      }
    }
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("extension-storage");
    return false;
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.clear), () => this.extensionStorage.clear(), { jslogContext: "clear" });
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
    super(storagePanel, cookieUrl.securityOrigin() || i18nString30(UIStrings30.localFiles), false, "cookies-for-frame");
    this.target = frame.resourceTreeModel().target();
    this.#cookieDomain = cookieUrl.securityOrigin();
    this.tooltip = i18nString30(UIStrings30.cookiesUsedByFramesFromS, { PH1: this.#cookieDomain });
    const icon = createIcon11("cookie");
    this.setLeadingIcons([icon]);
  }
  get itemURL() {
    return "cookies://" + this.#cookieDomain;
  }
  cookieDomain() {
    return this.#cookieDomain;
  }
  /**
   * Resolves the cookie domain security context associated with this tree element
   * for AI assistance.
   */
  #getStorageItem() {
    const primaryTarget = SDK25.TargetManager.TargetManager.instance().primaryPageTarget();
    const mainPageOrigin = primaryTarget?.inspectedURL() ? Common18.ParsedURL.ParsedURL.extractOrigin(primaryTarget.inspectedURL()) : "";
    if (!mainPageOrigin || !this.#cookieDomain) {
      return null;
    }
    return new AiAssistance2.StorageItem.CookieItem(mainPageOrigin, this.#cookieDomain);
  }
  onattach() {
    super.onattach();
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
    const storageItem = this.#getStorageItem();
    if (storageItem) {
      this.createAiButton(() => this.#getStorageItem());
    }
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(i18nString30(UIStrings30.clear), () => this.resourcesPanel.clearCookies(this.target, this.#cookieDomain), { jslogContext: "clear" });
    const storageItem = this.#getStorageItem();
    if (storageItem) {
      const openAiAssistanceId = "ai-assistance.application-panel-context";
      if (UI31.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
        UI31.Context.Context.instance().setFlavor(AiAssistance2.StorageItem.StorageItem, storageItem);
        const action6 = UI31.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
        const submenu = contextMenu.footerSection().appendSubMenuItem(action6.title(), false, openAiAssistanceId);
        submenu.defaultSection().appendAction(openAiAssistanceId, i18nString30(UIStrings30.startAChat));
        submenu.defaultSection().appendItem(i18nString30(UIStrings30.explainCookies), () => action6.execute({ prompt: "What is the purpose of these cookies?" }), { disabled: !action6.enabled(), jslogContext: openAiAssistanceId + ".cookies" });
      }
    }
    void contextMenu.show();
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCookies(this.target, this.#cookieDomain);
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown(Host4.UserMetrics.PanelCodes[Host4.UserMetrics.PanelCodes.cookies]);
    const storageItem = this.#getStorageItem();
    UI31.Context.Context.instance().setFlavor(AiAssistance2.StorageItem.StorageItem, storageItem);
    return false;
  }
};
var StorageCategoryView = class extends UI31.Widget.VBox {
  emptyWidget;
  constructor() {
    super();
    this.element.classList.add("storage-view");
    this.emptyWidget = new UI31.EmptyWidget.EmptyWidget("", "");
    this.emptyWidget.show(this.element);
  }
  setText(text) {
    this.emptyWidget.text = text;
  }
  setHeadline(header) {
    this.emptyWidget.header = header;
  }
  setLink(link2) {
    this.emptyWidget.link = link2;
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
    UI31.ARIAUtils.setLabel(this.treeElement.listItemNode, "Resources Section");
    this.treeElementForFrameId = /* @__PURE__ */ new Map();
    this.treeElementForTargetId = /* @__PURE__ */ new Map();
    const frameManager = SDK25.FrameManager.FrameManager.instance();
    frameManager.addEventListener("FrameAddedToTarget", (event) => this.frameAdded(event.data.frame), this);
    frameManager.addEventListener("FrameRemoved", (event) => this.frameDetached(event.data.frameId), this);
    frameManager.addEventListener("FrameNavigated", (event) => this.frameNavigated(event.data.frame), this);
    frameManager.addEventListener("ResourceAdded", (event) => this.resourceAdded(event.data.resource), this);
    if (this.panel.mode !== "node") {
      SDK25.TargetManager.TargetManager.instance().addModelListener(SDK25.ChildTargetManager.ChildTargetManager, "TargetCreated", this.windowOpened, this, { scoped: true });
      SDK25.TargetManager.TargetManager.instance().addModelListener(SDK25.ChildTargetManager.ChildTargetManager, "TargetInfoChanged", this.windowChanged, this, { scoped: true });
      SDK25.TargetManager.TargetManager.instance().addModelListener(SDK25.ChildTargetManager.ChildTargetManager, "TargetDestroyed", this.windowDestroyed, this, { scoped: true });
      SDK25.TargetManager.TargetManager.instance().observeTargets(this, { scoped: true });
    }
  }
  initialize() {
    const frameManager = SDK25.FrameManager.FrameManager.instance();
    for (const frame of frameManager.getAllFrames()) {
      if (!this.treeElementForFrameId.get(frame.id)) {
        this.addFrameAndParents(frame);
      }
      const childTargetManager = frame.resourceTreeModel().target().model(SDK25.ChildTargetManager.ChildTargetManager);
      if (childTargetManager) {
        for (const targetInfo of childTargetManager.targetInfos()) {
          this.windowOpened({ data: targetInfo });
        }
      }
    }
  }
  targetAdded(target) {
    if (target.type() === SDK25.Target.Type.Worker || target.type() === SDK25.Target.Type.ServiceWorker) {
      void this.workerAdded(target);
    }
    if (target.type() === SDK25.Target.Type.FRAME && target === target.outermostTarget()) {
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
    if (!SDK25.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
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
    if (!SDK25.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
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
    if (!SDK25.TargetManager.TargetManager.instance().isInScope(frame.resourceTreeModel())) {
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
  constructor(section8, frame) {
    super(section8.panel, "", false, "frame");
    this.section = section8;
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
      UI31.ARIAUtils.setLabel(this.listItemElement, this.title);
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
      const targets = SDK25.TargetManager.TargetManager.instance().targets();
      for (const target of targets) {
        if (target.type() === SDK25.Target.Type.ServiceWorker && SDK25.TargetManager.TargetManager.instance().isInScope(target)) {
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("frame-details");
    this.showView(this.view);
    this.listItemElement.classList.remove("hovered");
    SDK25.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK25.TargetManager.TargetManager.instance());
    return false;
  }
  set hovered(hovered) {
    if (hovered) {
      this.listItemElement.classList.add("hovered");
      void this.frame.highlight();
    } else {
      this.listItemElement.classList.remove("hovered");
      SDK25.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK25.TargetManager.TargetManager.instance());
    }
  }
  appendResource(resource) {
    const statusCode = resource.statusCode();
    if (statusCode >= 301 && statusCode <= 303) {
      return;
    }
    const resourceType = resource.resourceType();
    const categoryName = resourceType.name();
    let categoryElement = resourceType === Common18.ResourceType.resourceTypes.Document ? this : this.categoryElements.get(categoryName);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, resource.resourceType().category().title(), "", i18nString30(UIStrings30.resourceDescription), categoryName, categoryName === "Frames");
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
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, i18nString30(UIStrings30.openedWindows), "", i18nString30(UIStrings30.openedWindowsDescription), categoryKey);
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
    const categoryName = targetInfo.type === "service_worker" ? i18n59.i18n.lockedString("Service workers") : i18nString30(UIStrings30.webWorkers);
    let categoryElement = this.categoryElements.get(categoryKey);
    if (!categoryElement) {
      categoryElement = new ExpandableApplicationPanelTreeElement(this.section.panel, categoryName, "", i18nString30(UIStrings30.workerDescription), categoryKey);
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
    super(storagePanel, resource.isGenerated ? i18nString30(UIStrings30.documentNotAvailable) : resource.displayName, false, "frame-resource");
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
    const viewPromise = SourceFrame6.PreviewFactory.PreviewFactory.createPreview(this.resource, this.resource.mimeType);
    this.previewPromise = viewPromise.then((view) => {
      if (view) {
        return view;
      }
      return new UI31.EmptyWidget.EmptyWidget("", this.resource.url);
    });
    return this.previewPromise;
  }
  onselect(selectedByUser) {
    super.onselect(selectedByUser);
    if (this.resource.isGenerated) {
      this.panel.showCategoryView("", i18nString30(UIStrings30.documentNotAvailable), i18nString30(UIStrings30.theContentOfThisDocumentHasBeen), null);
    } else {
      void this.panel.scheduleShowView(this.preparePreview());
    }
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("frame-resource");
    return false;
  }
  ondblclick(_event) {
    Host4.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.resource.url);
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
    const contextMenu = new UI31.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(this.resource);
    void contextMenu.show();
  }
  async revealResource(lineNumber, columnNumber) {
    this.revealAndSelect(true);
    const view = await this.panel.scheduleShowView(this.preparePreview());
    if (!(view instanceof SourceFrame6.ResourceSourceFrame.ResourceSourceFrame) || typeof lineNumber !== "number") {
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
    super(storagePanel, targetInfo.title || i18nString30(UIStrings30.windowWithoutTitle), false, "window");
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("frame-window");
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
    super(storagePanel, targetInfo.title || targetInfo.url || i18nString30(UIStrings30.worker), false, "worker");
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
    UI31.UIUserMetrics.UIUserMetrics.instance().panelShown("frame-worker");
    return false;
  }
  get itemURL() {
    return this.targetInfo.url;
  }
};

// gen/front_end/panels/application/application.prebundle.js
import * as Components5 from "./components/components.js";
export {
  AppManifestView_exports as AppManifestView,
  ApplicationPanelSidebar_exports as ApplicationPanelSidebar,
  ApplicationPanelTreeElement_exports as ApplicationPanelTreeElement,
  BackgroundServiceModel_exports as BackgroundServiceModel,
  BackgroundServiceView_exports as BackgroundServiceView,
  BounceTrackingMitigationsTreeElement_exports as BounceTrackingMitigationsTreeElement,
  Components5 as Components,
  CookieItemsView_exports as CookieItemsView,
  CrashReportContextView_exports as CrashReportContextView,
  DOMStorageItemsView_exports as DOMStorageItemsView,
  DeviceBoundSessionsModel_exports as DeviceBoundSessionsModel,
  DeviceBoundSessionsTreeElement_exports as DeviceBoundSessionsTreeElement,
  DeviceBoundSessionsView_exports as DeviceBoundSessionsView,
  ExtensionStorageItemsView_exports as ExtensionStorageItemsView,
  ExtensionStorageModel_exports as ExtensionStorageModel,
  FrameDetailsView_exports as FrameDetailsView,
  IndexedDBModel_exports as IndexedDBModel,
  IndexedDBViews_exports as IndexedDBViews,
  KeyValueStorageItemsView_exports as KeyValueStorageItemsView,
  OpenedWindowDetailsView_exports as OpenedWindowDetailsView,
  OriginTrialTreeView_exports as OriginTrialTreeView,
  PreloadingTreeElement_exports as PreloadingTreeElement,
  PreloadingView_exports as PreloadingView,
  ReportingApiTreeElement_exports as ReportingApiTreeElement,
  ReportingApiView_exports as ReportingApiView,
  ResourcesPanel_exports as ResourcesPanel,
  ServiceWorkerCacheTreeElement_exports as ServiceWorkerCacheTreeElement,
  ServiceWorkerCacheViews_exports as ServiceWorkerCacheViews,
  ServiceWorkerUpdateCycleView_exports as ServiceWorkerUpdateCycleView,
  ServiceWorkersView_exports as ServiceWorkersView,
  StorageBucketsTreeElement_exports as StorageBucketsTreeElement,
  StorageItemsToolbar_exports as StorageItemsToolbar,
  StorageView_exports as StorageView,
  TrustTokensTreeElement_exports as TrustTokensTreeElement,
  WebMCPTreeElement_exports as WebMCPTreeElement,
  WebMCPView_exports as WebMCPView
};
//# sourceMappingURL=application.js.map
