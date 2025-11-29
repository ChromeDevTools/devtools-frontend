var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/visual_logging/Debugging.js
var Debugging_exports = {};
__export(Debugging_exports, {
  debugString: () => debugString,
  expectVeEvents: () => expectVeEvents,
  processEventForAdHocAnalysisDebugging: () => processEventForAdHocAnalysisDebugging,
  processEventForDebugging: () => processEventForDebugging,
  processEventForIntuitiveDebugging: () => processEventForIntuitiveDebugging,
  processEventForTestDebugging: () => processEventForTestDebugging,
  processForDebugging: () => processForDebugging,
  processImpressionsForDebugging: () => processImpressionsForDebugging,
  processStartLoggingForDebugging: () => processStartLoggingForDebugging,
  setHighlightedVe: () => setHighlightedVe,
  setVeDebugLoggingEnabled: () => setVeDebugLoggingEnabled,
  setVeDebuggingEnabled: () => setVeDebuggingEnabled
});
import { assertNotNullOrUndefined } from "./../../core/platform/platform.js";

// gen/front_end/ui/visual_logging/LoggingConfig.js
var LoggingConfig_exports = {};
__export(LoggingConfig_exports, {
  VisualElements: () => VisualElements,
  getLoggingConfig: () => getLoggingConfig,
  makeConfigStringBuilder: () => makeConfigStringBuilder,
  needsLogging: () => needsLogging,
  parseJsLog: () => parseJsLog
});
import * as Host from "./../../core/host/host.js";
import * as Root from "./../../core/root/root.js";

// gen/front_end/ui/visual_logging/KnownContextValues.js
var knownContextValues = /* @__PURE__ */ new Set([
  "%",
  "*",
  "-alternative-animation-with-timeline",
  "-alternative-position-try",
  "-alternative-webkit-line-clamp",
  "-epub-caption-side",
  "-epub-text-combine",
  "-epub-text-emphasis",
  "-epub-text-emphasis-color",
  "-epub-text-emphasis-style",
  "-epub-text-orientation",
  "-epub-text-transform",
  "-epub-word-break",
  "-epub-writing-mode",
  "-moz-box-direction",
  "-moz-box-orient",
  "-moz-box-sizing",
  "-moz-osx-font-smoothing",
  "-moz-text-decoration",
  "-moz-text-size-adjust",
  "-ms-flex-direction",
  "-ms-text-size-adjust",
  "-ms-touch-action",
  "-webkit-FONT-smoothing",
  "-webkit-align-content",
  "-webkit-align-items",
  "-webkit-align-self",
  "-webkit-alternative-animation-with-timeline",
  "-webkit-animation",
  "-webkit-animation-delay",
  "-webkit-animation-direction",
  "-webkit-animation-duration",
  "-webkit-animation-fill-mode",
  "-webkit-animation-iteration-count",
  "-webkit-animation-name",
  "-webkit-animation-play-state",
  "-webkit-animation-timing-function",
  "-webkit-app-region",
  "-webkit-appearance",
  "-webkit-backface-visibility",
  "-webkit-background-clip",
  "-webkit-background-origin",
  "-webkit-background-size",
  "-webkit-border-after",
  "-webkit-border-after-color",
  "-webkit-border-after-style",
  "-webkit-border-after-width",
  "-webkit-border-before",
  "-webkit-border-before-color",
  "-webkit-border-before-style",
  "-webkit-border-before-width",
  "-webkit-border-bottom-left-radius",
  "-webkit-border-bottom-right-radius",
  "-webkit-border-end",
  "-webkit-border-end-color",
  "-webkit-border-end-style",
  "-webkit-border-end-width",
  "-webkit-border-horizontal-spacing",
  "-webkit-border-image",
  "-webkit-border-radius",
  "-webkit-border-start",
  "-webkit-border-start-color",
  "-webkit-border-start-style",
  "-webkit-border-start-width",
  "-webkit-border-top-left-radius",
  "-webkit-border-top-right-radius",
  "-webkit-border-vertical-spacing",
  "-webkit-box-align",
  "-webkit-box-decoration-break",
  "-webkit-box-direction",
  "-webkit-box-flex",
  "-webkit-box-ordinal-group",
  "-webkit-box-orient",
  "-webkit-box-pack",
  "-webkit-box-reflect",
  "-webkit-box-shadow",
  "-webkit-box-sizing",
  "-webkit-clip-path",
  "-webkit-column-break-after",
  "-webkit-column-break-before",
  "-webkit-column-break-inside",
  "-webkit-column-count",
  "-webkit-column-gap",
  "-webkit-column-rule",
  "-webkit-column-rule-color",
  "-webkit-column-rule-style",
  "-webkit-column-rule-width",
  "-webkit-column-span",
  "-webkit-column-width",
  "-webkit-columns",
  "-webkit-filter",
  "-webkit-flex",
  "-webkit-flex-basis",
  "-webkit-flex-direction",
  "-webkit-flex-flow",
  "-webkit-flex-grow",
  "-webkit-flex-shrink",
  "-webkit-flex-wrap",
  "-webkit-flow-into",
  "-webkit-font-feature-settings",
  "-webkit-font-smoothing",
  "-webkit-hyphenate-character",
  "-webkit-justify-content",
  "-webkit-line-break",
  "-webkit-line-clamp",
  "-webkit-locale",
  "-webkit-logical-height",
  "-webkit-logical-width",
  "-webkit-margin-after",
  "-webkit-margin-before",
  "-webkit-margin-end",
  "-webkit-margin-start",
  "-webkit-mask",
  "-webkit-mask-box-image",
  "-webkit-mask-box-image-outset",
  "-webkit-mask-box-image-repeat",
  "-webkit-mask-box-image-slice",
  "-webkit-mask-box-image-source",
  "-webkit-mask-box-image-width",
  "-webkit-mask-clip",
  "-webkit-mask-composite",
  "-webkit-mask-image",
  "-webkit-mask-origin",
  "-webkit-mask-position",
  "-webkit-mask-position-x",
  "-webkit-mask-position-y",
  "-webkit-mask-repeat",
  "-webkit-mask-size",
  "-webkit-max-logical-height",
  "-webkit-max-logical-width",
  "-webkit-min-logical-height",
  "-webkit-min-logical-width",
  "-webkit-opacity",
  "-webkit-order",
  "-webkit-padding-after",
  "-webkit-padding-before",
  "-webkit-padding-end",
  "-webkit-padding-start",
  "-webkit-perspective",
  "-webkit-perspective-origin",
  "-webkit-perspective-origin-x",
  "-webkit-perspective-origin-y",
  "-webkit-print-color-adjust",
  "-webkit-rtl-ordering",
  "-webkit-ruby-position",
  "-webkit-shape-image-threshold",
  "-webkit-shape-margin",
  "-webkit-shape-outside",
  "-webkit-tap-highlight-color",
  "-webkit-text-combine",
  "-webkit-text-decoration",
  "-webkit-text-decorations-in-effect",
  "-webkit-text-emphasis",
  "-webkit-text-emphasis-color",
  "-webkit-text-emphasis-position",
  "-webkit-text-emphasis-style",
  "-webkit-text-fill-color",
  "-webkit-text-orientation",
  "-webkit-text-security",
  "-webkit-text-size-adjust",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
  "-webkit-transform",
  "-webkit-transform-origin",
  "-webkit-transform-origin-x",
  "-webkit-transform-origin-y",
  "-webkit-transform-origin-z",
  "-webkit-transform-style",
  "-webkit-transition",
  "-webkit-transition-delay",
  "-webkit-transition-duration",
  "-webkit-transition-property",
  "-webkit-transition-timing-function",
  "-webkit-user-drag",
  "-webkit-user-modify",
  "-webkit-user-select",
  "-webkit-writing-mode",
  "-x",
  "0",
  "0.85",
  "1",
  "1.15",
  "1.3",
  "1.5",
  "1.8",
  "10",
  "100%",
  "11",
  "12",
  "125%",
  "13",
  "14",
  "15",
  "150%",
  "16",
  "17",
  "18",
  "19",
  "2",
  "20",
  "200%",
  "3",
  "3g",
  "4",
  "42",
  "44",
  "5",
  "50%",
  "6",
  "7",
  "75%",
  "8",
  "9",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Backspace",
  "CSS",
  "CoLoR",
  "Delete",
  "Document",
  "Documents",
  "Enter",
  "Escape",
  "Fetch and XHR",
  "FetchandXHR",
  "Font",
  "Frames",
  "ID",
  "Id",
  "Image",
  "InspectorView.panelOrder",
  "JSEventListeners",
  "JSHeapTotalSize",
  "JavaScript",
  "LayoutCount",
  "Manifest",
  "Media",
  "NAME",
  "Nodes",
  "Other",
  "PROPERTY",
  "PageDown",
  "PageUp",
  "PrefixedStorageInfo",
  "RecalcStyleCount",
  "Space",
  "Tab",
  "TaskDuration",
  "WebAssembly",
  "WebSocket",
  "a",
  "aa",
  "aaa",
  "abort",
  "abort-replay",
  "aborted",
  "about-gpu",
  "accent-color",
  "accept",
  "accept-execute-code",
  "access-control-allow-origin",
  "accessibility-tree",
  "accessibility.view",
  "accuracy",
  "achromatopsia",
  "action",
  "action-button",
  "actions",
  "activation-value",
  "active",
  "active-keybind-set",
  "active-network-condition-key",
  "activity",
  "ad",
  "ad-script",
  "ad-status",
  "add",
  "add-3p-scripts-to-ignorelist",
  "add-anonymous-scripts-to-ignorelist",
  "add-asserted-events",
  "add-assertion",
  "add-attribute",
  "add-attribute-assertion",
  "add-attributes",
  "add-breakpoint",
  "add-button",
  "add-cnd-breakpoint",
  "add-color",
  "add-content-scripts-to-ignorelist",
  "add-count",
  "add-custom-device",
  "add-debug-info-url",
  "add-device-type",
  "add-directory-to-ignore-list",
  "add-duration",
  "add-folder",
  "add-frame",
  "add-header",
  "add-logpoint",
  "add-new",
  "add-operator",
  "add-origin-mapping",
  "add-properties",
  "add-property-path-to-watch",
  "add-script-to-ignorelist",
  "add-selector",
  "add-selector-part",
  "add-shortcut",
  "add-source-map",
  "add-source-map-url",
  "add-step-after",
  "add-step-before",
  "add-target",
  "add-timeout",
  "add-to-ignore-list",
  "add-visible",
  "add-wasm-debug-info",
  "add-watch-expression",
  "add-x",
  "add-y",
  "added-count",
  "added-size",
  "addedSize",
  "additive-symbols",
  "adorner-settings",
  "af",
  "affected-cookies",
  "affected-documents",
  "affected-elements",
  "affected-raw-cookies",
  "affected-requests",
  "affected-sources",
  "ai-annotations-enabled",
  "ai-assistance-enabled",
  "ai-assistance-history-entries",
  "ai-assistance-history-images",
  "ai-assistance-patching-fre-completed",
  "ai-assistance-patching-selected-project-id",
  "ai-code-completion-citations",
  "ai-code-completion-citations.citation-link",
  "ai-code-completion-disclaimer",
  "ai-code-completion-enabled",
  "ai-code-completion-spinner-tooltip",
  "ai-code-completion-teaser-dismissed",
  "ai-code-completion-teaser.dismiss",
  "ai-code-completion-teaser.fre",
  "ai-explorer",
  "ai_assistance",
  "align-content",
  "align-content-center",
  "align-content-end",
  "align-content-flex-end",
  "align-content-flex-start",
  "align-content-space-around",
  "align-content-space-between",
  "align-content-space-evenly",
  "align-content-start",
  "align-content-stretch",
  "align-items",
  "align-items-baseline",
  "align-items-center",
  "align-items-end",
  "align-items-flex-end",
  "align-items-flex-start",
  "align-items-start",
  "align-items-stretch",
  "align-self",
  "alignment-baseline",
  "all",
  "allocation-stack",
  "allow-pasting",
  "allow-scroll-past-eof",
  "allow-scroll-past-eof-false",
  "allowed",
  "allowed-by-exception",
  "alpha",
  "alt-!",
  "alt-:",
  "alt->",
  "alt-?",
  "alt-@",
  "alt-arrowdown",
  "alt-arrowleft",
  "alt-arrowright",
  "alt-arrowup",
  "alt-backspace",
  "alt-delete",
  "alt-end",
  "alt-enter",
  "alt-escape",
  "alt-home",
  "alt-meta-!",
  "alt-meta-:",
  "alt-meta->",
  "alt-meta-?",
  "alt-meta-@",
  "alt-meta-arrowdown",
  "alt-meta-arrowleft",
  "alt-meta-arrowright",
  "alt-meta-arrowup",
  "alt-meta-backspace",
  "alt-meta-delete",
  "alt-meta-end",
  "alt-meta-enter",
  "alt-meta-escape",
  "alt-meta-home",
  "alt-meta-pagedown",
  "alt-meta-pageup",
  "alt-meta-tab",
  "alt-pagedown",
  "alt-pageup",
  "alt-tab",
  "am",
  "anchor-link",
  "anchor-name",
  "anchor-scope",
  "android-2.3-browser-nexus-s",
  "android-4.0.2-browser-galaxy-nexus",
  "animation",
  "animation-composition",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-range",
  "animation-range-end",
  "animation-range-start",
  "animation-timeline",
  "animation-timing-function",
  "animation-trigger",
  "animation-trigger-behavior",
  "animation-trigger-exit-range",
  "animation-trigger-exit-range-end",
  "animation-trigger-exit-range-start",
  "animation-trigger-range",
  "animation-trigger-range-end",
  "animation-trigger-range-start",
  "animation-trigger-timeline",
  "animation-trigger-type",
  "animations",
  "animations.buffer-preview",
  "animations.buffer-preview-sda",
  "animations.clear",
  "animations.grid-header",
  "animations.keyframe",
  "animations.pause-resume-all",
  "animations.play-replay-pause-animation-group",
  "animations.playback-rate-10",
  "animations.playback-rate-100",
  "animations.playback-rate-25",
  "animations.remove-preview",
  "annotation",
  "annotations-hidden",
  "another_id",
  "answer",
  "apca",
  "apca-documentation",
  "app-region",
  "appearance",
  "application",
  "apply-to-page-tree",
  "ar",
  "architecture",
  "aria-attributes",
  "arial",
  "as",
  "ascent-override",
  "ask-ai",
  "aspect-ratio",
  "asserted-events",
  "asus-zenbook-fold",
  "attribute",
  "attribute-modified",
  "attributes",
  "attribution-reporting-details",
  "auction-worklet",
  "audio-context",
  "audio-context-closed",
  "audio-context-created",
  "audio-context-resumed",
  "audio-context-suspended",
  "authenticator",
  "authored",
  "authored-deployed-grouping",
  "authored-deployed-grouping-documentation",
  "authored-deployed-grouping-feedback",
  "auto",
  "auto-adjust-zoom",
  "auto-annotations.accordion",
  "auto-attach-to-created-pages",
  "auto-attach-to-created-pages-true",
  "auto-focus-on-debugger-paused-enabled",
  "auto-focus-on-debugger-paused-enabled-false",
  "auto-open-autofill-view-on-event",
  "auto-pretty-print-minified",
  "auto-pretty-print-minified-false",
  "auto-reveal-in-navigator",
  "auto-reveal-in-navigator-false",
  "autofill",
  "autofill-empty",
  "autofill-type",
  "autofill-view",
  "autofill-view-documentation",
  "autofill-view-feedback",
  "automatic-workspace-folders",
  "automatic-workspace-folders.connect",
  "automatically-ignore-list-known-third-party-scripts",
  "automotive",
  "auxclick",
  "avif-format-disabled",
  "avif-format-disabled-true",
  "az",
  "back",
  "back-forward-cache",
  "back-forward-cache.run-test",
  "backdrop-filter",
  "backface-visibility",
  "background /* color: red */",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-fetch",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-service.clear",
  "background-service.save-events",
  "background-service.toggle-recording",
  "background-services",
  "background-size",
  "background-sync",
  "badge-notification",
  "badge-notification.dismiss",
  "badproperty",
  "bars",
  "base-64",
  "base-palette",
  "baseline-shift",
  "baseline-source",
  "be",
  "before-bidder-worklet-bidding-start",
  "before-bidder-worklet-reporting-start",
  "before-seller-worklet-reporting-start",
  "before-seller-worklet-scoring-start",
  "beforecopy",
  "beforecut",
  "beforepaste",
  "beforeunload",
  "beta",
  "bezier",
  "bezier.control-circle",
  "bezier.linear-control-circle",
  "bezier.next-preset",
  "bezier.prev-preset",
  "bezierEditor",
  "bfcache",
  "bg",
  "big-endian",
  "binary-view-type",
  "black-berry-9900",
  "black-berry-bb-10",
  "black-berry-play-book-2.1",
  "blackbox",
  "ble",
  "block",
  "block-ellipsis",
  "block-request-domain",
  "block-request-url",
  "block-size",
  "blocked",
  "blocked-by-response-details",
  "blocking",
  "blur",
  "blurred-vision",
  "bn",
  "body",
  "bold",
  "bolder",
  "bookman",
  "border",
  "border-block",
  "border-block-color",
  "border-block-end",
  "border-block-end-color",
  "border-block-end-style",
  "border-block-end-width",
  "border-block-start",
  "border-block-start-color",
  "border-block-start-style",
  "border-block-start-width",
  "border-block-style",
  "border-block-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end-end-radius",
  "border-end-start-radius",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-inline",
  "border-inline-color",
  "border-inline-end",
  "border-inline-end-color",
  "border-inline-end-style",
  "border-inline-end-width",
  "border-inline-start",
  "border-inline-start-color",
  "border-inline-start-style",
  "border-inline-start-width",
  "border-inline-style",
  "border-inline-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-shape",
  "border-spacing",
  "border-start-end-radius",
  "border-start-start-radius",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "bottom-up",
  "bounce-tracking-mitigations",
  "box-decoration-break",
  "box-shadow",
  "box-sizing",
  "br",
  "brand-name",
  "brand-version",
  "breadcrumbs",
  "break-after",
  "break-before",
  "break-inside",
  "break-on",
  "breakpoint",
  "breakpoint-group",
  "breakpoint-tooltip",
  "breakpoints-active",
  "browser-debugger.refresh-global-event-listeners",
  "browser-language",
  "bs",
  "buffered-rendering",
  "button",
  "bypass-service-worker",
  "ca",
  "cache-control",
  "cache-disabled",
  "cache-disabled-documentation",
  "cache-disabled-true",
  "cache-storage",
  "cache-storage-data",
  "cache-storage-instance",
  "cache-storage-view-tab",
  "cache-storage.delete-selected",
  "cache-storage.refresh",
  "calibrated-cpu-throttling",
  "call-tree",
  "cancel",
  "cancel-animation-frame",
  "cancel-cross-origin-context-chat",
  "candara",
  "canplay",
  "canplaythrough",
  "canvas",
  "canvas-context-created",
  "caption-side",
  "capture-node-creation-stacks",
  "caret-animation",
  "caret-color",
  "caret-shape",
  "category",
  "change",
  "change-workspace",
  "change-workspace-dialog",
  "changes",
  "changes.changes",
  "changes.reveal-source",
  "checkbox-item",
  "checked",
  "chevron-left",
  "chevron-right",
  "chrome-ai",
  "chrome-android-mobile",
  "chrome-android-mobile-high-end",
  "chrome-android-tablet",
  "chrome-chrome-os",
  "chrome-devtools-user",
  "chrome-extension://fmkadmapgofadopljbjfkapdkoienihi\u269B\uFE0FComponents",
  "chrome-extension://fmkadmapgofadopljbjfkapdkoienihi\u269B\uFE0FProfiler",
  "chrome-extension://ienfalfjdbdpebioblfackkekamfmbnhAngular",
  "chrome-extensions",
  "chrome-flags-bounce-tracking-mitigations",
  "chrome-flags-tpcd-heuristics-grants",
  "chrome-flags-tpcd-metadata-grants",
  "chrome-i-pad",
  "chrome-i-phone",
  "chrome-mac",
  "chrome-recorder",
  "chrome-recorder.create-recording",
  "chrome-recorder.replay-recording",
  "chrome-recorder.start-recording",
  "chrome-recorder.toggle-code-view",
  "chrome-settings",
  "chrome-settings-performance",
  "chrome-settings-sync-setup",
  "chrome-settings-sync-setup-advanced",
  "chrome-theme-colors",
  "chrome-theme-colors-documentation",
  "chrome-theme-colors-false",
  "chrome-windows",
  "city",
  "classic",
  "clear",
  "clear-all",
  "clear-browser-cache",
  "clear-browser-cookies",
  "clear-filter",
  "clear-input",
  "clear-interval",
  "clear-object-store-confirmation",
  "clear-palette",
  "clear-replace-input",
  "clear-search-input",
  "clear-storage",
  "clear-storage-cache-storage",
  "clear-storage-cookies",
  "clear-storage-include-third-party-cookies",
  "clear-storage-indexeddb",
  "clear-storage-local-storage",
  "clear-storage-service-workers",
  "clear-timeout",
  "click",
  "client-focus",
  "clip",
  "clip-path",
  "clip-rule",
  "clipboard",
  "clipped-color",
  "close",
  "close-all",
  "close-dev-tools",
  "close-others",
  "close-search",
  "close-tabs-to-the-right",
  "closeable-tabs",
  "closeableTabs",
  "code",
  "code-completion.accordion",
  "code-disclaimer",
  "code-format",
  "code-snippets-explainer.ai-code-completion-teaser",
  "code-snippets-explainer.console-insights",
  "code-snippets-explainer.freestyler",
  "code-snippets-explainer.patch-widget",
  "code-whisperer",
  "collapse",
  "collapse-children",
  "collapsed-files",
  "color",
  "color-eye-dropper",
  "color-format",
  "color-interpolation",
  "color-interpolation-filters",
  "color-rendering",
  "color-scheme",
  "color/* color: red */",
  "colorPicker",
  "colorz",
  "column-count",
  "column-fill",
  "column-gap",
  "column-height",
  "column-rule",
  "column-rule-break",
  "column-rule-color",
  "column-rule-edge-end-inset",
  "column-rule-edge-end-outset",
  "column-rule-edge-start-inset",
  "column-rule-edge-start-outset",
  "column-rule-inset",
  "column-rule-interior-end-inset",
  "column-rule-interior-end-outset",
  "column-rule-interior-start-inset",
  "column-rule-interior-start-outset",
  "column-rule-outset",
  "column-rule-style",
  "column-rule-visibility-items",
  "column-rule-width",
  "column-span",
  "column-width",
  "column-wrap",
  "columns",
  "combined-diff-view.copy",
  "comic-sans-ms",
  "command-editor",
  "command-input",
  "commit",
  "compatibility-lookup-link",
  "components.collect-garbage",
  "components.request-app-banner",
  "computed",
  "computed-properties",
  "computed-styles",
  "condition",
  "conditional-breakpoint",
  "configure",
  "confirm",
  "confirm-import-recording-dialog",
  "confirm-import-recording-input",
  "connect-workspace",
  "connection",
  "connection-id",
  "connection-info",
  "consent-onboarding",
  "consent-reminder",
  "console",
  "console-autocomplete-on-enter",
  "console-autocomplete-on-enter-true",
  "console-eager-eval",
  "console-eager-eval-false",
  "console-eager-eval-true",
  "console-group-similar",
  "console-group-similar-false",
  "console-history-autocomplete",
  "console-history-autocomplete-false",
  "console-insight-teaser",
  "console-insight-teasers-enabled",
  "console-insights",
  "console-insights-enabled",
  "console-insights-setting",
  "console-insights-skip-reminder",
  "console-insights.accordion",
  "console-message",
  "console-pins",
  "console-prompt",
  "console-settings",
  "console-show-settings-toolbar",
  "console-shows-cors-errors",
  "console-shows-cors-errors-false",
  "console-sidebar",
  "console-timestamps-enabled",
  "console-timestamps-enabled-true",
  "console-trace-expand",
  "console-trace-expand-false",
  "console-user-activation-eval",
  "console-user-activation-eval-false",
  "console-view",
  "console.clear",
  "console.clear.history",
  "console.create-pin",
  "console.sidebar-selected-filter",
  "console.text-filter",
  "console.textFilter",
  "console.toggle",
  "contain",
  "contain-intrinsic-block-size",
  "contain-intrinsic-height",
  "contain-intrinsic-inline-size",
  "contain-intrinsic-size",
  "contain-intrinsic-width",
  "container",
  "container-context",
  "container-how",
  "container-name",
  "container-query",
  "container-type",
  "container-what",
  "contains-ai-content-warning",
  "content",
  "content-encoding",
  "content-length",
  "content-policy",
  "content-type",
  "content-visibility",
  "context",
  "context3",
  "contextmenu",
  "continue",
  "continue-replay",
  "continue-to-here",
  "continuous",
  "contrast",
  "contrast-issues",
  "contrast-issues-documentation",
  "contrast-ratio",
  "control",
  "converter-@puppeteer/replay",
  "converter-JSON",
  "converter-Puppeteer (for Firefox)",
  "converter-Puppeteer (including Lighthouse analysis)",
  "converter-Puppeteer",
  "converter-Puppeteer(includingLighthouseanalysis)",
  "converter-TestExtension",
  "converter-extension",
  "converter-json",
  "converter-lighthouse",
  "converter-puppeteer",
  "converter-puppeteer-firefox",
  "converter-puppeteer-replay",
  "cookie-control-override-enabled",
  "cookie-flag-controls",
  "cookie-preview",
  "cookie-report",
  "cookie-report-search-query",
  "cookie-view-show-decoded",
  "cookies",
  "cookies-data",
  "cookies-for-frame",
  "copy",
  "copy-ai-response",
  "copy-all-as-curl",
  "copy-all-as-curl-bash",
  "copy-all-as-curl-cmd",
  "copy-all-as-fetch",
  "copy-all-as-har",
  "copy-all-as-har-with-sensitive-data",
  "copy-all-as-nodejs-fetch",
  "copy-all-as-powershell",
  "copy-all-css-changes",
  "copy-all-css-declarations-as-js",
  "copy-all-declarations",
  "copy-all-urls",
  "copy-as-base",
  "copy-as-curl",
  "copy-as-curl-bash",
  "copy-as-curl-cmd",
  "copy-as-fetch",
  "copy-as-hex",
  "copy-as-nodejs-fetch",
  "copy-as-powershell",
  "copy-as-utf",
  "copy-color",
  "copy-console",
  "copy-css-declaration-as-js",
  "copy-declaration",
  "copy-element",
  "copy-file-name",
  "copy-full-xpath",
  "copy-initiator-url",
  "copy-js-path",
  "copy-link-address",
  "copy-object",
  "copy-outer-html",
  "copy-payload",
  "copy-primitive",
  "copy-property",
  "copy-property-path",
  "copy-request-headers",
  "copy-response",
  "copy-response-headers",
  "copy-rule",
  "copy-selector",
  "copy-stack-trace",
  "copy-stacktrace",
  "copy-step-as-extension-0",
  "copy-step-as-extension-1",
  "copy-step-as-extension-2",
  "copy-step-as-extension-3",
  "copy-step-as-extension-4",
  "copy-step-as-json",
  "copy-step-as-lighthouse",
  "copy-step-as-puppeteer",
  "copy-step-as-puppeteer-firefox",
  "copy-step-as-puppeteer-replay",
  "copy-string-as-js-literal",
  "copy-string-as-json-literal",
  "copy-string-contents",
  "copy-url",
  "copy-value",
  "copy-visible-styled-selection",
  "copy-watch-expression-value",
  "copy-xpath",
  "corner-block-end-shape",
  "corner-block-start-shape",
  "corner-bottom-left-shape",
  "corner-bottom-right-shape",
  "corner-bottom-shape",
  "corner-end-end-shape",
  "corner-end-start-shape",
  "corner-inline-end-shape",
  "corner-inline-start-shape",
  "corner-left-shape",
  "corner-right-shape",
  "corner-shape",
  "corner-start-end-shape",
  "corner-start-start-shape",
  "corner-top-left-shape",
  "corner-top-right-shape",
  "corner-top-shape",
  "corners",
  "cors-details",
  "count",
  "count-delta",
  "counter-increment",
  "counter-reset",
  "counter-set",
  "country",
  "courier-new",
  "coverage",
  "coverage-by-type",
  "coverage-type",
  "coverage-view-coverage-type",
  "coverage.clear",
  "coverage.export",
  "coverage.start-with-reload",
  "coverage.toggle-recording",
  "cpu-no-throttling",
  "cpu-throttled-20",
  "cpu-throttled-4",
  "cpu-throttled-6",
  "cpu-throttled-calibrated-low-tier-mobile",
  "cpu-throttled-calibrated-mid-tier-mobile",
  "cpu-throttling",
  "cpu-throttling-selector",
  "cpu-throttling-selector-calibrate",
  "create-new-snippet",
  "create-profile",
  "create-recording",
  "create-recording-view",
  "creator-ad-script-ancestry",
  "credential-id",
  "credentialId",
  "critical",
  "cs",
  "css",
  "css-angle",
  "css-animation-name",
  "css-font-palette",
  "css-function",
  "css-layers",
  "css-location",
  "css-overview",
  "css-overview.cancel-processing",
  "css-overview.capture-overview",
  "css-overview.clear-overview",
  "css-overview.color",
  "css-overview.colors",
  "css-overview.contrast",
  "css-overview.font-info",
  "css-overview.media-queries",
  "css-overview.quick-start",
  "css-overview.summary",
  "css-overview.unused-declarations",
  "css-position-try",
  "css-property-doc",
  "css-shadow",
  "css-source-maps-enabled",
  "css-source-maps-enabled-false",
  "css-text-node",
  "css-variable",
  "css-wide-keyword-link",
  "cssAngleEditor",
  "cssShadowEditor",
  "cssoverview",
  "ctap2",
  "ctrl-!",
  "ctrl-:",
  "ctrl->",
  "ctrl-?",
  "ctrl-@",
  "ctrl-alt-!",
  "ctrl-alt-:",
  "ctrl-alt->",
  "ctrl-alt-?",
  "ctrl-alt-@",
  "ctrl-alt-arrowdown",
  "ctrl-alt-arrowleft",
  "ctrl-alt-arrowright",
  "ctrl-alt-arrowup",
  "ctrl-alt-backspace",
  "ctrl-alt-delete",
  "ctrl-alt-end",
  "ctrl-alt-enter",
  "ctrl-alt-escape",
  "ctrl-alt-home",
  "ctrl-alt-meta-:",
  "ctrl-alt-meta->",
  "ctrl-alt-meta-?",
  "ctrl-alt-meta-@",
  "ctrl-alt-meta-arrowdown",
  "ctrl-alt-meta-arrowleft",
  "ctrl-alt-meta-arrowright",
  "ctrl-alt-meta-arrowup",
  "ctrl-alt-meta-backspace",
  "ctrl-alt-meta-delete",
  "ctrl-alt-meta-end",
  "ctrl-alt-meta-enter",
  "ctrl-alt-meta-escape",
  "ctrl-alt-meta-home",
  "ctrl-alt-meta-pagedown",
  "ctrl-alt-meta-pageup",
  "ctrl-alt-meta-tab",
  "ctrl-alt-pagedown",
  "ctrl-alt-pageup",
  "ctrl-alt-tab",
  "ctrl-arrowdown",
  "ctrl-arrowleft",
  "ctrl-arrowright",
  "ctrl-arrowup",
  "ctrl-backspace",
  "ctrl-delete",
  "ctrl-end",
  "ctrl-enter",
  "ctrl-escape",
  "ctrl-home",
  "ctrl-pagedown",
  "ctrl-pageup",
  "ctrl-tab",
  "cumulative-layout-shifts",
  "current-dock-state-bottom",
  "current-dock-state-left",
  "current-dock-state-right",
  "current-dock-state-undock",
  "current-dock-state-undocked",
  "current-url",
  "currentDockState",
  "currentchange",
  "cursive",
  "cursor",
  "custom",
  "custom-accepted-encodings",
  "custom-color-palette",
  "custom-emulated-device-list",
  "custom-formatters",
  "custom-header-for-test",
  "custom-item",
  "custom-network-conditions",
  "custom-network-throttling-item",
  "custom-property",
  "custom-user-agent",
  "custom-user-agent-metadata",
  "customize-pwa-tittle-bar",
  "cut",
  "cx",
  "cy",
  "d",
  "da",
  "dark",
  "data",
  "data-grid-foo-column-weights",
  "dblclick",
  "de",
  "debug",
  "debugger",
  "debugger-paused",
  "debugger.breakpoint-input-window",
  "debugger.evaluate-selection",
  "debugger.next-call-frame",
  "debugger.previous-call-frame",
  "debugger.run-snippet",
  "debugger.show-coverage",
  "debugger.step",
  "debugger.step-into",
  "debugger.step-out",
  "debugger.step-over",
  "debugger.toggle-breakpoint",
  "debugger.toggle-breakpoint-enabled",
  "debugger.toggle-breakpoints-active",
  "debugger.toggle-pause",
  "dec",
  "declaration",
  "decline-execute-code",
  "decode-encode",
  "decoder-properties",
  "decrease-priority",
  "default",
  "deflate",
  "delete",
  "delete-all",
  "delete-all-watch-expressions",
  "delete-bucket-confirmation",
  "delete-button",
  "delete-database",
  "delete-database-confirmation",
  "delete-element",
  "delete-event-listener",
  "delete-file-confirmation",
  "delete-folder-confirmation",
  "delete-origin-mapping",
  "delete-recording",
  "delete-selected",
  "delete-watch-expression",
  "deleteByCut",
  "deleteByDrag",
  "deleteContent",
  "deleteContentBackward",
  "deleteContentForward",
  "deleteEntireSoftLine",
  "deleteHardLineBackward",
  "deleteHardLineForward",
  "deleteSoftLineBackward",
  "deleteSoftLineForward",
  "deleteWordBackward",
  "deleteWordForward",
  "deployed",
  "descent-override",
  "description",
  "desktop",
  "desktop-touch",
  "destination",
  "detached-node",
  "detached-node-count",
  "details",
  "details-general",
  "details-response-headers",
  "deuteranopia",
  "dev-tools-default",
  "developer-resources",
  "development-origin",
  "device",
  "device-fold",
  "device-frame-enable",
  "device-mode",
  "device-mode-preset-1024px",
  "device-mode-preset-1440px",
  "device-mode-preset-2560px",
  "device-mode-preset-320px",
  "device-mode-preset-375px",
  "device-mode-preset-425px",
  "device-mode-preset-768px",
  "device-mode-resizer",
  "device-orientation",
  "device-pixel-ratio",
  "device-pixel-ratio-enable",
  "device-posture",
  "device-scale-factor",
  "device-type",
  "device-type-enable",
  "devicemotion",
  "deviceorientation",
  "devices",
  "devtools",
  "devtools-override",
  "direct-socket-chunks",
  "direct-socket-messages",
  "direction",
  "directives-details",
  "disable",
  "disable-all-breakpoints",
  "disable-async-stack-traces",
  "disable-async-stack-traces-true",
  "disable-breakpoint",
  "disable-file-breakpoints",
  "disable-locale-info-bar",
  "disable-paused-state-overlay",
  "disable-recorder-import-warning",
  "disable-self-xss-warning",
  "disabled",
  "disabled-item",
  "disallowed-select-descendants-details",
  "disconnect-from-network",
  "display",
  "display-override",
  "display-timestamp",
  "display-up",
  "displayUp-down",
  "dispose",
  "distance",
  "dock-side",
  "document",
  "document.write",
  "documentation",
  "documents",
  "dom-activate",
  "dom-attr-modified",
  "dom-character-data-modified",
  "dom-content-loaded",
  "dom-detective",
  "dom-focus-in",
  "dom-focus-out",
  "dom-mutation",
  "dom-node-inserted",
  "dom-node-inserted-into-document",
  "dom-node-removed",
  "dom-node-removed-from-document",
  "dom-subtree-modified",
  "dom-window.close",
  "dom-word-wrap",
  "dom-word-wrap-false",
  "domain",
  "dominant-baseline",
  "dont-show-again",
  "download",
  "drag",
  "drag-drop",
  "dragend",
  "dragenter",
  "dragleave",
  "dragover",
  "dragstart",
  "drawer",
  "drawer-view-closeableTabs",
  "drjones.network-floating-button",
  "drjones.network-panel-context",
  "drjones.network-panel-context.failures",
  "drjones.network-panel-context.purpose",
  "drjones.network-panel-context.security",
  "drjones.network-panel-context.slowness",
  "drjones.performance-panel-context",
  "drjones.performance-panel-context.improvements",
  "drjones.performance-panel-context.purpose",
  "drjones.performance-panel-context.time-spent",
  "drjones.sources-floating-button",
  "drjones.sources-panel-context",
  "drjones.sources-panel-context.input",
  "drjones.sources-panel-context.performance",
  "drjones.sources-panel-context.script",
  "drop",
  "duration",
  "durationchange",
  "dynamic-local-setting",
  "dynamic-range-limit",
  "dynamic-synced-setting",
  "e-ink",
  "early-hints-headers",
  "edit",
  "edit-and-resend",
  "edit-attribute",
  "edit-breakpoint",
  "edit-item",
  "edit-name",
  "edit-text",
  "edit-title",
  "editor",
  "el",
  "elapsed-time",
  "elapsed-us",
  "element-class",
  "element-properties",
  "element-states",
  "element.set-inner-html",
  "elements",
  "elements-classes",
  "elements-panel",
  "elements.capture-area-screenshot",
  "elements.color-mix-popover",
  "elements.copy-styles",
  "elements.css-color-mix",
  "elements.css-hint",
  "elements.css-property-doc",
  "elements.css-selector-specificity",
  "elements.css-value-trace",
  "elements.css-var",
  "elements.dom-breakpoints",
  "elements.dom-creation",
  "elements.dom-properties",
  "elements.duplicate-element",
  "elements.edit-as-html",
  "elements.event-listeners",
  "elements.generic-sidebar-popover",
  "elements.hide-element",
  "elements.image-preview",
  "elements.invalid-property-decl-popover",
  "elements.issue",
  "elements.jump-to-style",
  "elements.layout",
  "elements.length-popover",
  "elements.new-style-rule",
  "elements.property-documentation-popover",
  "elements.redo",
  "elements.refresh-event-listeners",
  "elements.relative-color-channel",
  "elements.reveal-node",
  "elements.select-element",
  "elements.show-all-style-properties",
  "elements.show-computed",
  "elements.show-styles",
  "elements.toggle-a11y-tree",
  "elements.toggle-element-search",
  "elements.toggle-eye-dropper",
  "elements.toggle-word-wrap",
  "elements.undo",
  "elementsTreeOutline",
  "em",
  "emoji",
  "emptied",
  "empty-cells",
  "empty-view",
  "emulate-auto-dark-mode",
  "emulate-page-focus",
  "emulate-page-focus-false",
  "emulate-page-focus-true",
  "emulated-css-media",
  "emulated-css-media-feature-color-gamut",
  "emulated-css-media-feature-forced-colors",
  "emulated-css-media-feature-forced-colors-active",
  "emulated-css-media-feature-forced-colors-none",
  "emulated-css-media-feature-prefers-color-scheme",
  "emulated-css-media-feature-prefers-color-scheme-dark",
  "emulated-css-media-feature-prefers-color-scheme-light",
  "emulated-css-media-feature-prefers-contrast",
  "emulated-css-media-feature-prefers-reduced-data",
  "emulated-css-media-feature-prefers-reduced-motion",
  "emulated-css-media-feature-prefers-reduced-motion-reduce",
  "emulated-css-media-feature-prefers-reduced-transparency",
  "emulated-css-media-print",
  "emulated-css-media-screen",
  "emulated-os-text-scale",
  "emulated-vision-deficiency",
  "emulated-vision-deficiency-achromatopsia",
  "emulated-vision-deficiency-blurred-vision",
  "emulated-vision-deficiency-deuteranopia",
  "emulated-vision-deficiency-protanopia",
  "emulated-vision-deficiency-reduced-contrast",
  "emulated-vision-deficiency-tritanopia",
  "emulation-locations",
  "emulation.add-location",
  "emulation.auto-adjust-scale",
  "emulation.capture-full-height-screenshot",
  "emulation.capture-node-screenshot",
  "emulation.capture-screenshot",
  "emulation.cpu-pressure",
  "emulation.device-height",
  "emulation.device-mode-value",
  "emulation.device-orientation-override",
  "emulation.device-scale",
  "emulation.device-scale-factor",
  "emulation.device-ua",
  "emulation.device-width",
  "emulation.idle-detection",
  "emulation.location-override",
  "emulation.locations",
  "emulation.show-device-mode",
  "emulation.show-device-outline",
  "emulation.show-device-outline-true",
  "emulation.show-device-scale-factor",
  "emulation.show-rulers",
  "emulation.show-rulers-true",
  "emulation.show-user-agent-type",
  "emulation.toggle-device-mode",
  "emulation.toolbar-controls-enabled",
  "emulation.touch",
  "en-gb",
  "en-us",
  "en-xl",
  "enable-all-breakpoints",
  "enable-breakpoint",
  "enable-file-breakpoints",
  "enable-header-overrides",
  "enable-ignore-listing",
  "enabled",
  "end-time",
  "ended",
  "endpoints",
  "enter",
  "enterpictureinpicture",
  "enterprise-enabled",
  "error",
  "error-message",
  "errors-and-warnings",
  "es",
  "es-419",
  "et",
  "etag",
  "eu",
  "event",
  "event-group-name",
  "event-group-owner",
  "event-listener-dispatch-filter-type",
  "event-log",
  "event-main-frame-id",
  "event-method",
  "event-name",
  "event-owner-origin",
  "event-owner-site",
  "event-params",
  "event-scope",
  "event-stream",
  "event-time",
  "event-title",
  "event-type",
  "event-url",
  "eventSource",
  "events",
  "events-table",
  "evolved-cls",
  "exclude-folder",
  "exclude-folder-confirmation",
  "expand",
  "expand-recursively",
  "experimental-cookie-features",
  "experimental-item",
  "experiments",
  "experiments-filter",
  "expires",
  "explain.console-message.context.error",
  "explain.console-message.context.other",
  "explain.console-message.context.warning",
  "explain.console-message.hover",
  "explain.console-message.teaser",
  "explain.teaser.code-snippets-explainer",
  "explain.teaser.dont-show",
  "explain.teaser.learn-more",
  "explanation",
  "export-ai-conversation",
  "export-har",
  "export-har-menu",
  "export-har-with-sensitive-data",
  "export-recording",
  "expose-internals",
  "expression",
  "extend-grid-lines",
  "extend-grid-lines-false",
  "extend-grid-lines-true",
  "extension-0",
  "extension-1",
  "extension-2",
  "extension-3",
  "extension-4",
  "extension-storage",
  "extension-storage-data",
  "extension-storage-for-domain",
  "extension-storage-viewer",
  "extension-view",
  "external",
  "extremely-slow",
  "fa",
  "fair",
  "fallback",
  "fallback-font-family",
  "fangsong",
  "fantasy",
  "fast-4g",
  "feedback",
  "fetch",
  "fetch-and-xhr",
  "fi",
  "field-data",
  "field-sizing",
  "field-url-override-enabled",
  "fil",
  "file-default",
  "fileMappingEntries",
  "fileSystemMapping",
  "files-used-in-patching",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filled-field-index",
  "film-strip",
  "filter",
  "filter-bar",
  "filter-bitset",
  "filter-by-rule-set",
  "finish",
  "firefox-android-mobile",
  "firefox-android-tablet",
  "firefox-i-pad",
  "firefox-i-phone",
  "firefox-mac",
  "firefox-windows",
  "first",
  "fit-to-window",
  "fix-this-issue",
  "flame",
  "flamechart-selected-navigation",
  "flamechart-selected-navigation-modern",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-direction-column",
  "flex-direction-column-reverse",
  "flex-direction-row",
  "flex-direction-row-reverse",
  "flex-distribute",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-what",
  "flex-wrap",
  "flex-wrap-nowrap",
  "flex-wrap-wrap",
  "flexbox-overlays",
  "float",
  "float-32-bit",
  "float-64-bit",
  "flood-color",
  "flood-opacity",
  "focus",
  "focus-visible",
  "focus-within",
  "fold",
  "folded",
  "folder",
  "font",
  "font-display",
  "font-editor",
  "font-editor-documentation",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-optical-sizing",
  "font-palette",
  "font-size",
  "font-size-adjust",
  "font-size-unit",
  "font-size-value-type",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-synthesis-small-caps",
  "font-synthesis-style",
  "font-synthesis-weight",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-emoji",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-variation-settings",
  "font-view",
  "font-weight",
  "font-weight-unit",
  "font-weight-value-type",
  "foo",
  "foobar",
  "footer",
  "force",
  "force-run",
  "force-state",
  "forced-color-adjust",
  "forced-reflow",
  "form-data",
  "form-factors",
  "fourth",
  "fr",
  "fr-ca",
  "frame",
  "frame-creation-stack-trace",
  "frame-resource",
  "frame-viewer-hide-chrome-window",
  "frame-viewer-show-paints",
  "frame-viewer-show-slow-scroll-rects",
  "frames",
  "frames-per-issue",
  "fre-disclaimer",
  "fre-disclaimer.cancel",
  "fre-disclaimer.continue",
  "fre-disclaimer.learn-more",
  "freestyler",
  "freestyler.accordion",
  "freestyler.delete",
  "freestyler.dogfood-info",
  "freestyler.element-panel-context",
  "freestyler.element-panel-context.center",
  "freestyler.element-panel-context.container-context",
  "freestyler.element-panel-context.container-how",
  "freestyler.element-panel-context.container-what",
  "freestyler.element-panel-context.flex-distribute",
  "freestyler.element-panel-context.flex-what",
  "freestyler.element-panel-context.flex-wrap",
  "freestyler.element-panel-context.grid-align",
  "freestyler.element-panel-context.grid-gap",
  "freestyler.element-panel-context.grid-how",
  "freestyler.element-panel-context.scroll-remove",
  "freestyler.element-panel-context.scroll-style",
  "freestyler.element-panel-context.scroll-why",
  "freestyler.element-panel-context.subgrid-how",
  "freestyler.element-panel-context.subgrid-override",
  "freestyler.element-panel-context.subgrid-where",
  "freestyler.element-panel-context.visibility",
  "freestyler.elements-floating-button",
  "freestyler.feedback",
  "freestyler.help",
  "freestyler.history",
  "freestyler.history-item",
  "freestyler.main-menu",
  "freestyler.new-chat",
  "freestyler.send-feedback",
  "freestyler.settings",
  "freestyler.style-tab-context",
  "full-accessibility",
  "full-accessibility-tree",
  "full-accessibility-tree-documentation",
  "full-accessibility-tree-feedback",
  "full-version",
  "function",
  "galaxy-z-fold-5",
  "gamma",
  "gap",
  "gap-rule-overlap",
  "gap-rule-paint-order",
  "garamond",
  "gdp-client-initialize",
  "gdp-profile",
  "gdp-sign-up-dialog",
  "gdp.ai-conversation-count",
  "gen-ai-settings-panel",
  "general",
  "generative-ai-terms-of-service",
  "generic-details",
  "geolocation",
  "geolocation.get-current-position",
  "geolocation.watch-position",
  "georgia",
  "gl",
  "global-ai-button",
  "global-ai-button-click-count",
  "googlebot",
  "googlebot-desktop",
  "googlebot-smartphone",
  "gotpointercapture",
  "grace-period-link",
  "grace-period-mitigation-disabled",
  "grid",
  "grid-align",
  "grid-area",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-column",
  "grid-column-end",
  "grid-column-gap",
  "grid-column-start",
  "grid-gap",
  "grid-how",
  "grid-lanes",
  "grid-lanes-direction",
  "grid-lanes-fill",
  "grid-lanes-flow",
  "grid-overlays",
  "grid-row",
  "grid-row-end",
  "grid-row-gap",
  "grid-row-start",
  "grid-settings",
  "grid-template",
  "grid-template-areas",
  "grid-template-columns",
  "grid-template-rows",
  "group-computed-styles",
  "group-issues-by-category",
  "group-issues-by-kind",
  "gu",
  "gutter",
  "gzip",
  "hardware-concurrency",
  "hardware-concurrency-reset",
  "hardware-concurrency-selector",
  "hardware-concurrency-toggle",
  "has-cross-site-ancestor",
  "has-overrides",
  "has-profile",
  "has-touch",
  "hashchange",
  "he",
  "header-editor",
  "header-name",
  "header-name-1",
  "header-options",
  "headers",
  "headers-component",
  "headers-editor-row-parent",
  "headers-view",
  "headers-view.add-header",
  "headers-view.add-override-rule",
  "headers-view.remove-apply-to-section",
  "headers-view.remove-header",
  "heap-profiler",
  "heap-snapshot.constructors-view",
  "heap-snapshot.retaining-paths-view",
  "heap-tracking-overview",
  "heavy",
  "heavy-ad-details",
  "height",
  "help",
  "help.release-notes",
  "help.report-issue",
  "help.show-release-note",
  "help.show-release-note-false",
  "helvetica",
  "heuristic-link",
  "heuristic-mitigation-disabled",
  "hex",
  "hi",
  "hide-all-others",
  "hide-children",
  "hide-data-urls",
  "hide-disabled-features-details",
  "hide-extension-urls",
  "hide-function",
  "hide-issue-by-code-setting-experiment-2021",
  "hide-issues",
  "hide-messages-from",
  "hide-network-messages",
  "hide-network-messages-true",
  "hide-player",
  "hide-repeating-children",
  "highlight-node-on-hover-in-overlay",
  "history",
  "historyRedo",
  "historyUndo",
  "hover",
  "hr",
  "http-only",
  "http://devtools-extensions.oopif.testTestPanel",
  "http://localhostTest",
  "https",
  "https://i0.devtools-frontend.test:38881TestPanel",
  "https://i0.devtools-frontend.test:38881extension-tab-title",
  "https://i0.devtools-frontend.testTestPanel",
  "https://i0.devtools-frontend.testextension-tab-title",
  "hu",
  "hue",
  "hy",
  "hyphenate-character",
  "hyphenate-limit-chars",
  "hyphens",
  "i-pad-air",
  "i-pad-mini",
  "i-pad-pro",
  "i-phone-12-pro",
  "i-phone-14-pro-max",
  "i-phone-se",
  "i-phone-xr",
  "icons",
  "id",
  "identity",
  "ignore-this-retainer",
  "image",
  "image-orientation",
  "image-rendering",
  "image-url",
  "image-view",
  "image-view.copy-image-as-data-url",
  "image-view.copy-image-url",
  "image-view.open-in-new-tab",
  "image-view.save-image",
  "impact",
  "import-har",
  "import-recording",
  "important",
  "in-range",
  "increase-priority",
  "indeterminate",
  "indexed-db",
  "indexed-db-data-view",
  "indexed-db-database",
  "indexed-db-object-store",
  "indexeddb-data",
  "info",
  "inherit",
  "inherited",
  "inherited-pseudotype",
  "inherits",
  "initator-request",
  "initial",
  "initial-letter",
  "initial-value",
  "initiator",
  "initiator-address-space",
  "initiator-tree",
  "inline",
  "inline-citation",
  "inline-size",
  "inline-variable-values",
  "inline-variable-values-false",
  "input",
  "insertCompositionText",
  "insertFromDrop",
  "insertFromPaste",
  "insertFromPasteAsQuotation",
  "insertFromYank",
  "insertHorizontalRule",
  "insertLineBreak",
  "insertLink",
  "insertOrderedList",
  "insertParagraph",
  "insertReplacementText",
  "insertText",
  "insertTranspose",
  "insertUnorderedList",
  "inset",
  "inset-area",
  "inset-block",
  "inset-block-end",
  "inset-block-start",
  "inset-inline",
  "inset-inline-end",
  "inset-inline-start",
  "insight",
  "insights-deprecation-learn-more",
  "insights-deprecation-open-performance-panel",
  "insights-deprecation-send-feedback",
  "insights-teaser-tell-me-more",
  "inspect",
  "inspect-prerendered-page",
  "inspector-main.focus-debuggee",
  "inspector-main.hard-reload",
  "inspector-main.reload",
  "inspector-stylesheet",
  "inspector.drawer-orientation",
  "inspector.drawer-orientation-by-dock-mode",
  "installability",
  "installing-entry-inspect",
  "instance-id",
  "instrumentation-breakpoints",
  "integer-16-bit",
  "integer-32-bit",
  "integer-64-bit",
  "integer-8-bit",
  "interactions",
  "interactivity",
  "interest-delay",
  "interest-delay-end",
  "interest-delay-start",
  "interest-groups",
  "interest-hide-delay",
  "interest-show-delay",
  "interest-target-delay",
  "interest-target-hide-delay",
  "interest-target-show-delay",
  "internal",
  "internet-explorer-10",
  "internet-explorer-11",
  "internet-explorer-7",
  "internet-explorer-8",
  "internet-explorer-9",
  "interpolate-size",
  "invalid",
  "invalidation-count",
  "invert-filter",
  "ip-protection",
  "is",
  "is-ad-related",
  "is-landscape",
  "is-mobile",
  "is-resident-credential",
  "is-u",
  "is-user-active-false-is-screen-unlocked-false",
  "is-user-active-false-is-screen-unlocked-true",
  "is-user-active-true-is-screen-unlocked-false",
  "is-user-active-true-is-screen-unlocked-true",
  "isResidentCredential",
  "isUnderTest",
  "isolates",
  "isolation",
  "issue",
  "issuer",
  "issues",
  "issues-pane",
  "issues.filter-network-requests-by-cookie",
  "issues.filter-network-requests-by-raw-cookie",
  "issues.unhide-all-hiddes",
  "it",
  "item",
  "item-1",
  "item-2",
  "item-tolerance",
  "ja",
  "java-script",
  "java-script-disabled",
  "java-script-disabled-true",
  "javascript",
  "javascript-context",
  "jpg-header",
  "js-event-listeners",
  "js-heap-total-size",
  "js-profiler",
  "js-source-maps-enabled",
  "js-source-maps-enabled-false",
  "json-view",
  "jump-to-anchor-node",
  "jump-to-breakpoint",
  "jump-to-file",
  "just-my-code",
  "justify-content",
  "justify-content-center",
  "justify-content-end",
  "justify-content-flex-end",
  "justify-content-flex-start",
  "justify-content-space-around",
  "justify-content-space-between",
  "justify-content-space-evenly",
  "justify-content-start",
  "justify-content-stretch",
  "justify-items",
  "justify-items-center",
  "justify-items-end",
  "justify-items-start",
  "justify-items-stretch",
  "justify-self",
  "ka",
  "keep-alive",
  "keep-me-updated",
  "key",
  "keybinds",
  "keyboard",
  "keydown",
  "keyframes",
  "keypress",
  "keyup",
  "kk",
  "km",
  "kn",
  "ko",
  "ky",
  "landscape-left",
  "landscape-right",
  "language",
  "language-af",
  "language-am",
  "language-ar",
  "language-as",
  "language-az",
  "language-be",
  "language-bg",
  "language-bn",
  "language-browser-language",
  "language-bs",
  "language-ca",
  "language-cs",
  "language-cy",
  "language-da",
  "language-de",
  "language-el",
  "language-en-gb",
  "language-en-us",
  "language-en-xl",
  "language-es",
  "language-es-419",
  "language-et",
  "language-eu",
  "language-fa",
  "language-fi",
  "language-fil",
  "language-fr",
  "language-fr-ca",
  "language-gl",
  "language-gu",
  "language-he",
  "language-hi",
  "language-hr",
  "language-hu",
  "language-hy",
  "language-id",
  "language-is",
  "language-it",
  "language-ja",
  "language-ka",
  "language-kk",
  "language-km",
  "language-kn",
  "language-ko",
  "language-ky",
  "language-lo",
  "language-lt",
  "language-lv",
  "language-mismatch",
  "language-mk",
  "language-ml",
  "language-mn",
  "language-mr",
  "language-ms",
  "language-my",
  "language-ne",
  "language-nl",
  "language-no",
  "language-or",
  "language-pa",
  "language-pl",
  "language-pt",
  "language-pt-pt",
  "language-ro",
  "language-ru",
  "language-si",
  "language-sk",
  "language-sl",
  "language-sq",
  "language-sr",
  "language-sr-latn",
  "language-sv",
  "language-sw",
  "language-ta",
  "language-te",
  "language-th",
  "language-tr",
  "language-uk",
  "language-ur",
  "language-uz",
  "language-vi",
  "language-zh",
  "language-zh-hk",
  "language-zh-tw",
  "language-zu",
  "large",
  "large-blob",
  "larger",
  "last-dock-state",
  "last-modified",
  "lat",
  "latency",
  "latitude",
  "layer",
  "layers",
  "layers-3d-view",
  "layers-details",
  "layers-show-internal-layers",
  "layers.3d-center",
  "layers.3d-pan",
  "layers.3d-rotate",
  "layers.down",
  "layers.left",
  "layers.paint-profiler",
  "layers.pan-mode",
  "layers.reset-view",
  "layers.right",
  "layers.rotate-mode",
  "layers.select-object",
  "layers.up",
  "layers.zoom-in",
  "layers.zoom-out",
  "layout",
  "layout-count",
  "layout-shifts",
  "learn-more",
  "learn-more.ai-annotations",
  "learn-more.ai-assistance",
  "learn-more.auto-annotations",
  "learn-more.code-completion",
  "learn-more.console-insights",
  "learn-more.coop-coep",
  "learn-more.csp-report-only",
  "learn-more.eligibility",
  "learn-more.monitor-memory-usage",
  "learn-more.never-use-unload",
  "learn-more.origin-trials",
  "leavepictureinpicture",
  "left",
  "legend",
  "length",
  "length-popover",
  "less",
  "letter-spacing",
  "letter-spacing-unit",
  "letter-spacing-value-type",
  "light",
  "lighter",
  "lighthouse",
  "lighthouse-show-settings-toolbar",
  "lighthouse.audit-summary.average",
  "lighthouse.audit-summary.fail",
  "lighthouse.audit-summary.informative",
  "lighthouse.audit-summary.pass",
  "lighthouse.audit.accesskeys",
  "lighthouse.audit.aria-allowed-attr",
  "lighthouse.audit.aria-allowed-role",
  "lighthouse.audit.aria-command-name",
  "lighthouse.audit.aria-conditional-attr",
  "lighthouse.audit.aria-deprecated-role",
  "lighthouse.audit.aria-dialog-name",
  "lighthouse.audit.aria-hidden-body",
  "lighthouse.audit.aria-hidden-focus",
  "lighthouse.audit.aria-input-field-name",
  "lighthouse.audit.aria-meter-name",
  "lighthouse.audit.aria-progressbar-name",
  "lighthouse.audit.aria-prohibited-attr",
  "lighthouse.audit.aria-required-attr",
  "lighthouse.audit.aria-required-children",
  "lighthouse.audit.aria-required-parent",
  "lighthouse.audit.aria-roles",
  "lighthouse.audit.aria-text",
  "lighthouse.audit.aria-toggle-field-name",
  "lighthouse.audit.aria-tooltip-name",
  "lighthouse.audit.aria-treeitem-name",
  "lighthouse.audit.aria-valid-attr",
  "lighthouse.audit.aria-valid-attr-value",
  "lighthouse.audit.bf-cache",
  "lighthouse.audit.bootup-time",
  "lighthouse.audit.button-name",
  "lighthouse.audit.bypass",
  "lighthouse.audit.cache-insight",
  "lighthouse.audit.canonical",
  "lighthouse.audit.charset",
  "lighthouse.audit.clickjacking-mitigation",
  "lighthouse.audit.cls-culprits-insight",
  "lighthouse.audit.color-contrast",
  "lighthouse.audit.crawlable-anchors",
  "lighthouse.audit.critical-request-chains",
  "lighthouse.audit.csp-xss",
  "lighthouse.audit.cumulative-layout-shift",
  "lighthouse.audit.custom-controls-labels",
  "lighthouse.audit.custom-controls-roles",
  "lighthouse.audit.definition-list",
  "lighthouse.audit.deprecations",
  "lighthouse.audit.diagnostics",
  "lighthouse.audit.dlitem",
  "lighthouse.audit.doctype",
  "lighthouse.audit.document-latency-insight",
  "lighthouse.audit.document-title",
  "lighthouse.audit.dom-size",
  "lighthouse.audit.dom-size-insight",
  "lighthouse.audit.duplicate-id-aria",
  "lighthouse.audit.duplicated-javascript",
  "lighthouse.audit.duplicated-javascript-insight",
  "lighthouse.audit.efficient-animated-content",
  "lighthouse.audit.empty-heading",
  "lighthouse.audit.errors-in-console",
  "lighthouse.audit.final-screenshot",
  "lighthouse.audit.first-contentful-paint",
  "lighthouse.audit.first-meaningful-paint",
  "lighthouse.audit.focus-traps",
  "lighthouse.audit.focusable-controls",
  "lighthouse.audit.font-display",
  "lighthouse.audit.font-display-insight",
  "lighthouse.audit.font-size",
  "lighthouse.audit.forced-reflow-insight",
  "lighthouse.audit.form-field-multiple-labels",
  "lighthouse.audit.frame-title",
  "lighthouse.audit.geolocation-on-start",
  "lighthouse.audit.has-hsts",
  "lighthouse.audit.heading-order",
  "lighthouse.audit.hreflang",
  "lighthouse.audit.html-has-lang",
  "lighthouse.audit.html-lang-valid",
  "lighthouse.audit.html-xml-lang-mismatch",
  "lighthouse.audit.http-status-code",
  "lighthouse.audit.identical-links-same-purpose",
  "lighthouse.audit.image-alt",
  "lighthouse.audit.image-aspect-ratio",
  "lighthouse.audit.image-delivery-insight",
  "lighthouse.audit.image-redundant-alt",
  "lighthouse.audit.image-size-responsive",
  "lighthouse.audit.inp-breakdown-insight",
  "lighthouse.audit.input-button-name",
  "lighthouse.audit.input-image-alt",
  "lighthouse.audit.inspector-issues",
  "lighthouse.audit.interaction-to-next-paint",
  "lighthouse.audit.interactive",
  "lighthouse.audit.interactive-element-affordance",
  "lighthouse.audit.is-crawlable",
  "lighthouse.audit.is-on-https",
  "lighthouse.audit.js-libraries",
  "lighthouse.audit.label",
  "lighthouse.audit.label-content-name-mismatch",
  "lighthouse.audit.landmark-one-main",
  "lighthouse.audit.largest-contentful-paint",
  "lighthouse.audit.largest-contentful-paint-element",
  "lighthouse.audit.layout-shifts",
  "lighthouse.audit.lcp-breakdown-insight",
  "lighthouse.audit.lcp-discovery-insight",
  "lighthouse.audit.lcp-lazy-loaded",
  "lighthouse.audit.legacy-javascript",
  "lighthouse.audit.legacy-javascript-insight",
  "lighthouse.audit.link-in-text-block",
  "lighthouse.audit.link-name",
  "lighthouse.audit.link-text",
  "lighthouse.audit.list",
  "lighthouse.audit.listitem",
  "lighthouse.audit.logical-tab-order",
  "lighthouse.audit.long-tasks",
  "lighthouse.audit.main-thread-tasks",
  "lighthouse.audit.mainthread-work-breakdown",
  "lighthouse.audit.managed-focus",
  "lighthouse.audit.max-potential-fid",
  "lighthouse.audit.meta-description",
  "lighthouse.audit.meta-refresh",
  "lighthouse.audit.meta-viewport",
  "lighthouse.audit.metrics",
  "lighthouse.audit.modern-http-insight",
  "lighthouse.audit.modern-image-formats",
  "lighthouse.audit.network-dependency-tree-insight",
  "lighthouse.audit.network-requests",
  "lighthouse.audit.network-rtt",
  "lighthouse.audit.network-server-latency",
  "lighthouse.audit.no-document-write",
  "lighthouse.audit.non-composited-animations",
  "lighthouse.audit.notification-on-start",
  "lighthouse.audit.object-alt",
  "lighthouse.audit.offscreen-content-hidden",
  "lighthouse.audit.offscreen-images",
  "lighthouse.audit.origin-isolation",
  "lighthouse.audit.paste-preventing-inputs",
  "lighthouse.audit.prioritize-lcp-image",
  "lighthouse.audit.redirects",
  "lighthouse.audit.redirects-http",
  "lighthouse.audit.render-blocking-insight",
  "lighthouse.audit.render-blocking-resources",
  "lighthouse.audit.resource-summary",
  "lighthouse.audit.robots-txt",
  "lighthouse.audit.screenshot-thumbnails",
  "lighthouse.audit.script-treemap-data",
  "lighthouse.audit.select-name",
  "lighthouse.audit.server-response-time",
  "lighthouse.audit.skip-link",
  "lighthouse.audit.speed-index",
  "lighthouse.audit.structured-data",
  "lighthouse.audit.tabindex",
  "lighthouse.audit.table-duplicate-name",
  "lighthouse.audit.table-fake-caption",
  "lighthouse.audit.target-size",
  "lighthouse.audit.td-has-header",
  "lighthouse.audit.td-headers-attr",
  "lighthouse.audit.th-has-data-cells",
  "lighthouse.audit.third-parties-insight",
  "lighthouse.audit.third-party-cookies",
  "lighthouse.audit.third-party-facades",
  "lighthouse.audit.third-party-summary",
  "lighthouse.audit.total-blocking-time",
  "lighthouse.audit.total-byte-weight",
  "lighthouse.audit.trusted-types-xss",
  "lighthouse.audit.unminified-css",
  "lighthouse.audit.unminified-javascript",
  "lighthouse.audit.unsized-images",
  "lighthouse.audit.unused-css-rules",
  "lighthouse.audit.unused-javascript",
  "lighthouse.audit.use-landmarks",
  "lighthouse.audit.user-timings",
  "lighthouse.audit.uses-http2",
  "lighthouse.audit.uses-long-cache-ttl",
  "lighthouse.audit.uses-optimized-images",
  "lighthouse.audit.uses-passive-event-listeners",
  "lighthouse.audit.uses-rel-preconnect",
  "lighthouse.audit.uses-responsive-images",
  "lighthouse.audit.uses-responsive-images-snapshot",
  "lighthouse.audit.uses-text-compression",
  "lighthouse.audit.valid-lang",
  "lighthouse.audit.valid-source-maps",
  "lighthouse.audit.video-caption",
  "lighthouse.audit.viewport",
  "lighthouse.audit.viewport-insight",
  "lighthouse.audit.visual-order-follows-dom",
  "lighthouse.audit.work-during-interaction",
  "lighthouse.cancel",
  "lighthouse.cat-a11y",
  "lighthouse.cat-best-practices",
  "lighthouse.cat-perf",
  "lighthouse.cat-seo",
  "lighthouse.clear-storage",
  "lighthouse.device-type",
  "lighthouse.enable-sampling",
  "lighthouse.end-time-span",
  "lighthouse.mode",
  "lighthouse.start",
  "lighthouse.throttling",
  "lighting-color",
  "line-break",
  "line-clamp",
  "line-gap-override",
  "line-height",
  "line-height-unit",
  "line-height-value-type",
  "line-names",
  "line-numbers",
  "linear-memory-inspector",
  "linear-memory-inspector.address",
  "linear-memory-inspector.byte-cell",
  "linear-memory-inspector.delete-highlight",
  "linear-memory-inspector.endianess",
  "linear-memory-inspector.history-back",
  "linear-memory-inspector.history-forward",
  "linear-memory-inspector.jump-to-address",
  "linear-memory-inspector.jump-to-highlight",
  "linear-memory-inspector.next-page",
  "linear-memory-inspector.previous-page",
  "linear-memory-inspector.refresh",
  "linear-memory-inspector.text-cell",
  "linear-memory-inspector.toggle-value-settings",
  "linear-memory-inspector.value-type-mode",
  "linear-memory-inspector.viewer",
  "link",
  "link-in-explanation",
  "linux",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "little-endian",
  "live-count",
  "live-heap-profile",
  "live-heap-profile.start-with-reload",
  "live-heap-profile.toggle-recording",
  "live-size",
  "lmi-interpreter-settings",
  "lo",
  "load",
  "load-through-target",
  "loadeddata",
  "loadedmetadata",
  "loadend",
  "loading",
  "loadstart",
  "local-fonts-disabled",
  "local-fonts-disabled-true",
  "local-storage",
  "local-storage-data",
  "local-storage-for-domain",
  "locale",
  "location",
  "log-level",
  "logpoint",
  "long",
  "long-interaction",
  "long-tasks",
  "longitude",
  "lostpointercapture",
  "low-contrast-details",
  "low-end-mobile",
  "lt",
  "lv",
  "macos",
  "main",
  "main-menu",
  "main-selected-tab",
  "main-tab-order",
  "main.debug-reload",
  "main.next-tab",
  "main.previous-tab",
  "main.search-in-panel.cancel",
  "main.search-in-panel.find",
  "main.search-in-panel.find-next",
  "main.search-in-panel.find-previous",
  "main.toggle-dock",
  "main.toggle-drawer",
  "main.toggle-drawer-orientation",
  "main.zoom-in",
  "main.zoom-out",
  "main.zoom-reset",
  "make-a-copy",
  "manage-header-columns",
  "manage-settings",
  "manager-custom-headers",
  "manifest",
  "manifest.copy-id",
  "margin",
  "margin-block",
  "margin-block-end",
  "margin-block-start",
  "margin-bottom",
  "margin-inline",
  "margin-inline-end",
  "margin-inline-start",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-mode",
  "mask-origin",
  "mask-position",
  "mask-repeat",
  "mask-size",
  "mask-type",
  "masonry",
  "masonry-auto-tracks",
  "masonry-direction",
  "masonry-fill",
  "masonry-flow",
  "masonry-slack",
  "masonry-template-tracks",
  "masonry-track",
  "masonry-track-end",
  "masonry-track-start",
  "match-attempts",
  "match-case",
  "match-count",
  "match-whole-word",
  "matched-address-item",
  "math",
  "math-depth",
  "math-shift",
  "math-style",
  "max-block-size",
  "max-height",
  "max-inline-size",
  "max-lines",
  "max-width",
  "measure-performance",
  "media",
  "media-flame-chart-group-expansion",
  "media-queries-enable",
  "media-query",
  "medias",
  "medium",
  "memory-live-heap-profile",
  "message",
  "message-level-filters",
  "messageURLFilters",
  "messageerror",
  "messages",
  "messaging",
  "meta-!",
  "meta-:",
  "meta->",
  "meta-?",
  "meta-@",
  "meta-arrowdown",
  "meta-arrowleft",
  "meta-arrowright",
  "meta-arrowup",
  "meta-backspace",
  "meta-delete",
  "meta-end",
  "meta-enter",
  "meta-escape",
  "meta-home",
  "meta-pagedown",
  "meta-pageup",
  "meta-tab",
  "metadata",
  "metadata-allowed-sites-details",
  "method",
  "microsoft-edge-android-mobile",
  "microsoft-edge-android-tablet",
  "microsoft-edge-chromium-mac",
  "microsoft-edge-chromium-windows",
  "microsoft-edge-edge-html-windows",
  "microsoft-edge-edge-html-x-box",
  "microsoft-edge-i-pad",
  "microsoft-edge-i-phone",
  "mid-tier-mobile",
  "min-block-size",
  "min-height",
  "min-inline-size",
  "min-width",
  "missing-debug-info",
  "mix-blend-mode",
  "mixed-content-details",
  "mk",
  "ml",
  "mn",
  "mobile",
  "mobile-no-touch",
  "mobile-throttling",
  "model",
  "modern",
  "monitoring-xhr-enabled",
  "monspace",
  "more",
  "more-filters",
  "more-options",
  "more-tabs",
  "more-tools",
  "mouse",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "mousewheel",
  "move-tab-backward",
  "move-tab-forward",
  "move-to-bottom",
  "move-to-top",
  "mr",
  "ms",
  "my",
  "my-inner-item-1",
  "my-inner-item-2",
  "my-inner-item-3",
  "name",
  "navigate",
  "navigate-to-selector-source",
  "navigate-to-style",
  "navigateerror",
  "navigatefrom",
  "navigatesuccess",
  "navigateto",
  "navigation",
  "navigator",
  "navigator-content-scripts",
  "navigator-files",
  "navigator-group-by-authored",
  "navigator-group-by-folder",
  "navigator-network",
  "navigator-overrides",
  "navigator-snippets",
  "ne",
  "negative",
  "nest-hub",
  "nest-hub-max",
  "network",
  "network-blocked-patterns",
  "network-color-code-resource-types",
  "network-color-code-resource-types-true",
  "network-conditions",
  "network-conditions.network-low-end-mobile",
  "network-conditions.network-mid-tier-mobile",
  "network-conditions.network-offline",
  "network-conditions.network-online",
  "network-default",
  "network-direct-socket-message-filter",
  "network-event-source-message-filter",
  "network-film-strip",
  "network-hide-chrome-extensions",
  "network-hide-data-url",
  "network-invert-filter",
  "network-item-preview",
  "network-log-columns",
  "network-log-large-rows",
  "network-log-show-overview",
  "network-log.preserve-log",
  "network-log.preserve-log-true",
  "network-log.record-log",
  "network-main",
  "network-only-blocked-requests",
  "network-only-ip-protected-requests",
  "network-only-third-party-setting",
  "network-overview",
  "network-record-film-strip-setting",
  "network-request",
  "network-resource-type-filters",
  "network-settings",
  "network-show-blocked-cookies-only-setting",
  "network-show-settings-toolbar",
  "network-text-filter",
  "network-web-socket-message-filter",
  "network.ad-blocking-enabled",
  "network.ad-blocking-enabled-true",
  "network.add-conditions",
  "network.add-custom-header",
  "network.add-network-request-blocking-pattern",
  "network.blocked-urls",
  "network.clear",
  "network.config",
  "network.enable-remote-file-loading",
  "network.enable-remote-file-loading-documentation",
  "network.enable-request-blocking",
  "network.group-by-frame",
  "network.group-by-frame-false",
  "network.group-by-frame-true",
  "network.hide-request-details",
  "network.initiator-stacktrace",
  "network.remove-all-network-request-blocking-patterns",
  "network.search",
  "network.search-network-tab",
  "network.show-options-to-generate-har-with-sensitive-data",
  "network.show-options-to-generate-har-with-sensitive-data-documentation",
  "network.show-options-to-generate-har-with-sensitive-data-false",
  "network.show-options-to-generate-har-with-sensitive-data-true",
  "network.toggle-recording",
  "networkConditions",
  "networkConditionsCustomProfiles",
  "networkLogColumns",
  "networkLogColumnsVisibility",
  "never-pause-here",
  "new-attribute",
  "new-authenticator",
  "new-badge",
  "new-file",
  "next",
  "next-page",
  "nfc",
  "nl",
  "no",
  "no-agent-entrypoint",
  "no-override",
  "no-profile-and-eligible",
  "no-profile-and-not-eligible",
  "no-throttling",
  "node",
  "node-connection",
  "node-id",
  "node-js-debugging",
  "node-removed",
  "nodes",
  "nominal",
  "none",
  "normal",
  "not-logged-in",
  "notification",
  "notification.request-permission",
  "notifications",
  "number",
  "numeric-column",
  "object",
  "object-column",
  "object-fit",
  "object-position",
  "object-view-box",
  "oct",
  "off",
  "offline",
  "offset",
  "offset-anchor",
  "offset-distance",
  "offset-path",
  "offset-position",
  "offset-rotate",
  "offset-x",
  "offset-y",
  "on",
  "on-shown-without-set-expression",
  "only-3rd-party-requests",
  "only-blocked-requests",
  "only-blocked-response-cookies",
  "only-ip-protected-requests",
  "only-show-blocked-cookies",
  "only-show-blocked-requests",
  "only-show-cookies-with-issues",
  "only-show-third-party",
  "opacity",
  "open",
  "open-ai-settings",
  "open-elements-panel",
  "open-folder",
  "open-in-animations-panel",
  "open-in-containing-folder",
  "open-in-new-tab",
  "open-info",
  "open-link-handler",
  "open-memory-inspector",
  "open-network-panel",
  "open-performance-panel",
  "open-sign-up-dialog",
  "open-sources-panel",
  "open-using",
  "opened-windows",
  "opera-mac",
  "opera-mini-i-os",
  "opera-mobile-android-mobile",
  "opera-presto-mac",
  "opera-presto-windows",
  "opera-windows",
  "operator",
  "option-1",
  "option-2",
  "option-3",
  "optional",
  "options",
  "or",
  "order",
  "origin",
  "origin-trial-test-property",
  "origin-trial-test-shorthand",
  "original-script-location",
  "orphans",
  "other",
  "other-origin",
  "out-of-range",
  "outermost-target-selector",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-anchor",
  "overflow-block",
  "overflow-clip-margin",
  "overflow-inline",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "overlay",
  "override-colors",
  "override-content",
  "override-headers",
  "override-source-mapped-file-warning",
  "overscroll-anchor-name",
  "overscroll-area",
  "overscroll-behavior",
  "overscroll-behavior-block",
  "overscroll-behavior-inline",
  "overscroll-behavior-x",
  "overscroll-behavior-y",
  "overscroll-position",
  "p3",
  "pa",
  "packetLoss",
  "packetQueueLength",
  "packetReordering",
  "pad",
  "padding",
  "padding-block",
  "padding-block-end",
  "padding-block-start",
  "padding-bottom",
  "padding-inline",
  "padding-inline-end",
  "padding-inline-start",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "page-orientation",
  "paint-order",
  "painting",
  "palatino",
  "palette-panel",
  "palette-switcher",
  "panel-closeableTabs",
  "panel-deprecated",
  "panel-tabOrder",
  "parameters",
  "parentTreeItem",
  "parse",
  "partition-key-site",
  "partitioning-blob-url-details",
  "passive",
  "paste",
  "patch-widget",
  "patch-widget.apply-to-workspace",
  "patch-widget.apply-to-workspace-loading",
  "patch-widget.discard",
  "patch-widget.info-tooltip",
  "patch-widget.info-tooltip-trigger",
  "patch-widget.save-all",
  "patch-widget.workspace",
  "path",
  "pattern",
  "pause",
  "pause-on-caught-exception",
  "pause-on-exception-enabled",
  "pause-on-exception-enabled-true",
  "pause-on-uncaught-exception",
  "pause-uncaught",
  "payload",
  "payment-handler",
  "perf-panel-annotations",
  "perfmon-active-indicators2",
  "performance-default",
  "performance-full-default",
  "performance-insights",
  "performance-insights-default",
  "performance.history-item",
  "performance.monitor",
  "performance.sidebar-insights-category-select",
  "performance.sidebar-toggle",
  "periodic-background-sync",
  "periodic-sync-tag",
  "persist-flame-config",
  "persistence-automatic-workspace-folders",
  "persistence-network-overrides-enabled",
  "persistence-network-overrides-enabled-true",
  "perspective",
  "perspective-origin",
  "picture-in-picture",
  "ping",
  "pixel-7",
  "pl",
  "place-content",
  "place-items",
  "place-self",
  "placeholder-shown",
  "platform",
  "platform-version",
  "play",
  "play-recording",
  "player",
  "playing",
  "pointer",
  "pointer-32-bit",
  "pointer-64-bit",
  "pointer-events",
  "pointercancel",
  "pointerdown",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "pointerout",
  "pointerover",
  "pointerrawupdate",
  "pointerup",
  "popover",
  "popover-hide-delay",
  "popover-show-delay",
  "popstate",
  "population",
  "portrait",
  "portrait-upside-down",
  "position",
  "position-anchor",
  "position-area",
  "position-fallback",
  "position-try",
  "position-try-fallbacks",
  "position-try-options",
  "position-try-order",
  "position-visibility",
  "prefer-dark-color-scheme",
  "prefer-light-color-scheme",
  "preferences",
  "preferred-network-condition",
  "prefix",
  "preflight-request",
  "preloaded-urls",
  "preloading",
  "preloading-details",
  "preloading-disabled",
  "preloading-rules",
  "preloading-speculations",
  "preloading-status-panel",
  "preloading-status-panel-pretty-print",
  "presentation",
  "preserve-console-log",
  "preserve-console-log-true",
  "pretty-print",
  "prev-page",
  "preview",
  "previouslyViewedFiles",
  "primary-font-family",
  "primary-key",
  "prime-numbers",
  "print",
  "print-color-adjust",
  "priority",
  "privacy",
  "privacy-notice",
  "privacy-policy",
  "privacy-policy.console-insights",
  "private-state-tokens",
  "production-origin",
  "profile-loading-failed",
  "profile-options",
  "profile-view",
  "profile-view.exclude-selected-function",
  "profile-view.focus-selected-function",
  "profile-view.restore-all-functions",
  "profile-view.selected-view",
  "profiler.clear-all",
  "profiler.delete-profile",
  "profiler.heap-snapshot-base",
  "profiler.heap-snapshot-filter",
  "profiler.heap-snapshot-object",
  "profiler.heap-snapshot-perspective",
  "profiler.heap-snapshot-statistics-view",
  "profiler.heap-toggle-recording",
  "profiler.js-toggle-recording",
  "profiler.load-from-file",
  "profiler.profile-type",
  "profiler.save-to-file",
  "profiles-sidebar",
  "program-link",
  "progress",
  "prop",
  "prop1",
  "prop2",
  "properties",
  "property",
  "protanopia",
  "protocol",
  "protocol-handlers",
  "protocol-monitor",
  "protocol-monitor-documentation",
  "protocol-monitor.add-custom-property",
  "protocol-monitor.add-parameter",
  "protocol-monitor.clear-all",
  "protocol-monitor.copy-command",
  "protocol-monitor.delete-parameter",
  "protocol-monitor.hint",
  "protocol-monitor.reset-to-default-value",
  "protocol-monitor.save",
  "protocol-monitor.send-command",
  "protocol-monitor.toggle-command-editor",
  "protocol-monitor.toggle-recording",
  "pseudo-property",
  "pseudotype",
  "pt",
  "pt-pt",
  "push-message",
  "push-messaging",
  "px",
  "query",
  "query-string",
  "question",
  "quick-open",
  "quick-open.show",
  "quick-open.show-command-menu",
  "quickOpen.show",
  "quota-override",
  "quotes",
  "r",
  "range",
  "ratechange",
  "raw-headers",
  "raw-headers-show-more",
  "read-only",
  "read-write",
  "readiness-list-link",
  "reading-flow",
  "reading-order",
  "readystatechange",
  "rec-2020",
  "recalc-style-count",
  "receive",
  "receive-badges",
  "receive-gdp-badges",
  "recommendation",
  "reconnect",
  "record-allocation-stacks",
  "recorder-panel-replay-extension",
  "recorder-panel-replay-speed",
  "recorder-preferred-copy-format",
  "recorder-recordings-ng",
  "recorder-screenshots",
  "recorder-selector-attribute",
  "recorder-selector-help",
  "recorder_recordings",
  "recording",
  "recordings",
  "redirect-source-request",
  "redirect-source-request-url",
  "reduce",
  "reduced-contrast",
  "references",
  "references.console-insights",
  "refresh",
  "refresh-caches",
  "refresh-database",
  "refresh-indexeddb",
  "refresh-watch-expressions",
  "regular-breakpoint",
  "regular-expression",
  "regular-item",
  "reject-percentage",
  "release-note",
  "release-notes",
  "reload-required",
  "rem",
  "remind-me-later",
  "remote-address",
  "remote-address-space",
  "remote-debnugging-terminated",
  "remote-devices",
  "remove",
  "remove-all-breakpoints",
  "remove-all-dom-breakpoints",
  "remove-all-expressions",
  "remove-all-to-the-right",
  "remove-attribute-assertion",
  "remove-breakpoint",
  "remove-color",
  "remove-expression",
  "remove-file-breakpoints",
  "remove-folder-from-workspace",
  "remove-folder-from-workspace-confirmation",
  "remove-frame",
  "remove-from-ignore-list",
  "remove-header-override",
  "remove-item",
  "remove-other-breakpoints",
  "remove-script-from-ignorelist",
  "remove-selector",
  "remove-selector-part",
  "remove-step",
  "removed-count",
  "removed-size",
  "rename",
  "rendering",
  "rendering-emulations",
  "rendering.toggle-prefers-color-scheme",
  "replace",
  "replace-all",
  "replay-settings",
  "replay-xhr",
  "report",
  "report-status",
  "reporting-api",
  "reporting-api-empty",
  "reports",
  "request",
  "request-animation-frame",
  "request-animation-frame.callback",
  "request-blocking-enabled",
  "request-blocking-enabled-true",
  "request-conditions",
  "request-details",
  "request-header",
  "request-header-accept",
  "request-header-accept-encoding",
  "request-header-accept-language",
  "request-header-content-type",
  "request-header-origin",
  "request-header-referer",
  "request-header-sec-fetch-dest",
  "request-header-sec-fetch-mode",
  "request-header-user-agent",
  "request-headers",
  "request-payload",
  "request-types",
  "required",
  "reset",
  "reset-children",
  "reset-columns",
  "reset-entropy-budget",
  "reset-to-defaults",
  "reset-trace",
  "resident-key",
  "resize",
  "resource-view-tab",
  "resources",
  "resources-last-selected-element-path",
  "resources-shared-storage-expanded",
  "resources.clear",
  "resources.clear-incl-third-party-cookies",
  "response",
  "response-header",
  "response-header-cache-control",
  "response-header-connection",
  "response-header-content-encoding",
  "response-header-content-length",
  "response-header-etag",
  "response-header-has-overrides",
  "response-header-keep-alive",
  "response-header-last-modified",
  "response-header-server",
  "response-header-vary",
  "response-headers",
  "response-time",
  "response-type",
  "responsive",
  "restart-frame",
  "restore-default-shortcuts",
  "result",
  "retained-size",
  "retainedSize",
  "retainers",
  "reveal",
  "reveal-header-overrides",
  "reveal-in-elements",
  "reveal-in-memory-inspector",
  "reveal-in-network",
  "reveal-in-source",
  "reveal-in-sources",
  "reveal-in-sources-panel",
  "reveal-in-summary",
  "reveal-preloads",
  "reveal-rule-set",
  "right",
  "ro",
  "roboto",
  "root-script-filterlist-rule",
  "rotate",
  "row-gap",
  "row-rule",
  "row-rule-break",
  "row-rule-color",
  "row-rule-edge-end-inset",
  "row-rule-edge-end-outset",
  "row-rule-edge-start-inset",
  "row-rule-edge-start-outset",
  "row-rule-inset",
  "row-rule-interior-end-inset",
  "row-rule-interior-end-outset",
  "row-rule-interior-start-inset",
  "row-rule-interior-start-outset",
  "row-rule-outset",
  "row-rule-style",
  "row-rule-visibility-items",
  "row-rule-width",
  "rp-id",
  "rpId",
  "ru",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "rule",
  "rule-break",
  "rule-color",
  "rule-inset",
  "rule-outset",
  "rule-set",
  "rule-set-details",
  "rule-style",
  "rule-width",
  "rulers-enable",
  "run",
  "rx",
  "ry",
  "sab-details",
  "safari-i-pad-i-os-13.2",
  "safari-i-phone-i-os-13.2",
  "safari-mac",
  "same-site",
  "sampling-heap-profiler-timeline",
  "samsung-galaxy-a51-71",
  "samsung-galaxy-s20-ultra",
  "samsung-galaxy-s8",
  "sans-serif",
  "save-as",
  "save-image",
  "save-name",
  "save-player-info",
  "save-trace-explanation",
  "scale",
  "scheme",
  "sci",
  "scope",
  "screen",
  "screen-rotation",
  "screencast-enabled",
  "script",
  "script-blocked-by-csp",
  "script-first-statement",
  "script-id",
  "script-location",
  "script-on-ignore-list",
  "script-snippets",
  "script-snippets-last-identifier",
  "script-source-url",
  "script-text-node",
  "scripting",
  "scroll",
  "scroll-behavior",
  "scroll-initial-target",
  "scroll-into-view",
  "scroll-margin",
  "scroll-margin-block",
  "scroll-margin-block-end",
  "scroll-margin-block-start",
  "scroll-margin-bottom",
  "scroll-margin-inline",
  "scroll-margin-inline-end",
  "scroll-margin-inline-start",
  "scroll-margin-left",
  "scroll-margin-right",
  "scroll-margin-top",
  "scroll-marker-contain",
  "scroll-marker-group",
  "scroll-padding",
  "scroll-padding-block",
  "scroll-padding-block-end",
  "scroll-padding-block-start",
  "scroll-padding-bottom",
  "scroll-padding-inline",
  "scroll-padding-inline-end",
  "scroll-padding-inline-start",
  "scroll-padding-left",
  "scroll-padding-right",
  "scroll-padding-top",
  "scroll-remove",
  "scroll-snap",
  "scroll-snap-align",
  "scroll-snap-stop",
  "scroll-snap-type",
  "scroll-start",
  "scroll-start-block",
  "scroll-start-inline",
  "scroll-start-target",
  "scroll-start-target-block",
  "scroll-start-target-inline",
  "scroll-start-target-x",
  "scroll-start-target-y",
  "scroll-start-x",
  "scroll-start-y",
  "scroll-style",
  "scroll-target-group",
  "scroll-timeline",
  "scroll-timeline-axis",
  "scroll-timeline-name",
  "scroll-why",
  "scrollbar-color",
  "scrollbar-gutter",
  "scrollbar-width",
  "scrollend",
  "scrollsnapchange",
  "scrollsnapchanging",
  "search",
  "search-as-you-type",
  "search-as-you-type-false",
  "search-in-all-files",
  "search-in-anonymous-and-content-scripts",
  "search-in-anonymous-and-content-scripts-true",
  "search-in-folder",
  "search-match",
  "search.clear",
  "search.refresh",
  "searchInAnonymousAndContentScripts",
  "searchInContentScripts",
  "second",
  "second-col",
  "secure",
  "security",
  "security-last-selected-element-path",
  "security.main-view",
  "security.origin-view",
  "security.toggle-san-truncation",
  "security.toggle-scts-details",
  "security.view-certificate",
  "security.view-certificate-for-origin",
  "seeked",
  "seeking",
  "select",
  "select-element",
  "select-folder",
  "select-next",
  "select-override-folder",
  "select-previous",
  "select-total",
  "select-workspace",
  "selected-color-palette",
  "selected-context-filter-enabled",
  "selected-context-filter-enabled-true",
  "selected-profile-type",
  "selector",
  "selector-aria",
  "selector-attribute",
  "selector-css",
  "selector-picker",
  "selector-pierce",
  "selector-stats",
  "selector-text",
  "selector-xpath",
  "selectors",
  "self",
  "self-xss-warning",
  "send",
  "sensors",
  "sensors.manage-locations",
  "sensors.reset-device-orientiation",
  "serif",
  "serious",
  "server",
  "server-timing-api",
  "service-worker-update-on-reload",
  "service-workers",
  "session",
  "session-storage",
  "session-storage-data",
  "session-storage-for-domain",
  "set-cookies",
  "set-interval",
  "set-interval.callback",
  "set-timeout",
  "set-timeout.callback",
  "set-to-browser-language",
  "set-to-specific-language",
  "setting",
  "setting-is-not-true",
  "setting1",
  "setting2",
  "settings",
  "settings.add-excluded-folder",
  "settings.add-ignore-list-pattern",
  "settings.documentation",
  "settings.ignore-list-pattern",
  "settings.remove-file-system",
  "settings.restore-defaults-and-reload",
  "settings.shortcuts",
  "settings.show",
  "shallow-size",
  "shallowSize",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "shared-storage",
  "shared-storage-data",
  "shared-storage-events",
  "shared-storage-instance",
  "shared-storage-worklet",
  "shared-storage-worklet-script-first-statement",
  "shift-!",
  "shift-?",
  "shift-arrowdown",
  "shift-arrowleft",
  "shift-arrowright",
  "shift-arrowup",
  "shift-backspace",
  "shift-ctrl-alt-arrowdown",
  "shift-ctrl-alt-arrowleft",
  "shift-ctrl-alt-arrowright",
  "shift-ctrl-alt-arrowup",
  "shift-ctrl-alt-backspace",
  "shift-ctrl-alt-delete",
  "shift-ctrl-alt-end",
  "shift-ctrl-alt-enter",
  "shift-ctrl-alt-escape",
  "shift-ctrl-alt-home",
  "shift-ctrl-alt-meta-arrowdown",
  "shift-ctrl-alt-meta-arrowleft",
  "shift-ctrl-alt-meta-arrowright",
  "shift-ctrl-alt-meta-arrowup",
  "shift-ctrl-alt-meta-backspace",
  "shift-ctrl-alt-meta-delete",
  "shift-ctrl-alt-meta-end",
  "shift-ctrl-alt-meta-enter",
  "shift-ctrl-alt-meta-escape",
  "shift-ctrl-alt-meta-home",
  "shift-ctrl-alt-meta-pagedown",
  "shift-ctrl-alt-meta-pageup",
  "shift-ctrl-alt-meta-tab",
  "shift-ctrl-alt-pagedown",
  "shift-ctrl-alt-pageup",
  "shift-ctrl-alt-tab",
  "shift-ctrl-arrowdown",
  "shift-ctrl-arrowleft",
  "shift-ctrl-arrowright",
  "shift-ctrl-arrowup",
  "shift-ctrl-backspace",
  "shift-ctrl-delete",
  "shift-ctrl-end",
  "shift-ctrl-enter",
  "shift-ctrl-escape",
  "shift-ctrl-home",
  "shift-ctrl-pagedown",
  "shift-ctrl-pageup",
  "shift-ctrl-tab",
  "shift-delete",
  "shift-end",
  "shift-enter",
  "shift-escape",
  "shift-home",
  "shift-pagedown",
  "shift-pageup",
  "shift-tab",
  "shortcut",
  "shortcut-panel-switch",
  "shortcuts",
  "show-ad-highlights",
  "show-ad-highlights-true",
  "show-adorner-settings",
  "show-all-properties",
  "show-as-javascript-object",
  "show-console-insight-teasers",
  "show-content-scripts",
  "show-css-property-documentation-on-hover",
  "show-debug-borders",
  "show-debug-borders-true",
  "show-detailed-inspect-tooltip",
  "show-disabled-features-details",
  "show-event-listeners-for-ancestors",
  "show-events-from-other-domains",
  "show-events-from-other-partitions",
  "show-filtered-out-request-cookies",
  "show-fps-counter",
  "show-fps-counter-true",
  "show-frame-details",
  "show-frameowkr-listeners",
  "show-function-definition",
  "show-grid-areas",
  "show-grid-areas-true",
  "show-grid-line-labels",
  "show-grid-line-labels-line-names",
  "show-grid-line-labels-none",
  "show-grid-track-sizes",
  "show-grid-track-sizes-true",
  "show-html-comments",
  "show-html-comments-false",
  "show-inherited-computed-style-properties",
  "show-issue-associated-with-this",
  "show-layout-shift-regions",
  "show-layout-shift-regions-true",
  "show-media-query-inspector",
  "show-media-query-inspector-true",
  "show-metrics-rulers",
  "show-metrics-rulers-true",
  "show-minimal-safe-area-for-maskable-icons",
  "show-more",
  "show-network-requests",
  "show-option-tp-expose-internals-in-heap-snapshot",
  "show-overrides",
  "show-paint-rects",
  "show-paint-rects-true",
  "show-request",
  "show-requests-with-this-cookie",
  "show-scroll-bottleneck-rects",
  "show-scroll-bottleneck-rects-true",
  "show-shortcuts",
  "show-test-addresses-in-autofill-menu-on-event",
  "show-third-party-issues",
  "show-ua-shadow-dom",
  "show-url-decoded",
  "show-whitespaces-in-editor",
  "show-whitespaces-in-editor-all",
  "show-whitespaces-in-editor-none",
  "show-whitespaces-in-editor-trailing",
  "showHeaSnapshotObjectsHiddenProperties",
  "showThirdPartyIssues",
  "si",
  "side-effect-confirmation",
  "sidebar",
  "sidebar-position",
  "sidebar-position-bottom",
  "sidebar-position-right",
  "sidebar-test-replace-page-with-object",
  "sign-count",
  "sign-up",
  "signCount",
  "simulate",
  "simulate-custom-quota",
  "site",
  "sites",
  "size",
  "size-adjust",
  "size-delta",
  "sk",
  "skip-anonymous-scripts",
  "skip-content-scripts",
  "skip-stack-frames-pattern",
  "skip-waiting",
  "sl",
  "slot",
  "slow",
  "slow-4g",
  "sm-script",
  "sm-stylesheet",
  "small",
  "smaller",
  "snackbar.action",
  "snackbar.dismiss",
  "snippet",
  "socket",
  "some_id",
  "sort-by",
  "source-code",
  "source-file",
  "source-line",
  "source-location",
  "source-map-failed",
  "source-map-infobar-disabled",
  "source-map-loaded",
  "source-map-skipped",
  "source-map-skipped-infobar-disabled",
  "source-message",
  "source-networkRequest",
  "source-order-viewer",
  "source-parse",
  "source-relatedCode",
  "source-stacktrace",
  "source-symbol",
  "source-url",
  "source.xhr-breakpoints",
  "sources",
  "sources.add-folder-to-workspace",
  "sources.add-to-watch",
  "sources.add-xhr-fetch-breakpoint",
  "sources.callstack",
  "sources.close-all",
  "sources.close-editor-tab",
  "sources.create-snippet",
  "sources.csp-violation-breakpoints",
  "sources.decrement-css",
  "sources.decrement-css-by-ten",
  "sources.dom-breakpoints",
  "sources.error",
  "sources.event-listener-breakpoints",
  "sources.global-listeners",
  "sources.go-to-line",
  "sources.go-to-member",
  "sources.increment-css",
  "sources.increment-css-by-ten",
  "sources.js-breakpoints",
  "sources.jump-to-breakpoint",
  "sources.jump-to-next-location",
  "sources.jump-to-previous-location",
  "sources.new-snippet",
  "sources.next-editor-tab",
  "sources.object-properties",
  "sources.previous-editor-tab",
  "sources.quick",
  "sources.remove-all-xhr-fetch-breakpoints",
  "sources.remove-xhr-fetch-breakpoint",
  "sources.rename",
  "sources.reveal-in-navigator-sidebar",
  "sources.save",
  "sources.save-all",
  "sources.scope-chain",
  "sources.search",
  "sources.search-sources-tab",
  "sources.switch-file",
  "sources.threads",
  "sources.toggle-debugger-sidebar",
  "sources.toggle-navigator-sidebar",
  "sources.toggle-word-wrap",
  "sources.watch",
  "sources.word-wrap",
  "sources.xhr-breakpoints",
  "speak",
  "speak-as",
  "speculative-loads",
  "speedster",
  "spread",
  "sq",
  "sr",
  "sr-latn",
  "src",
  "srgb",
  "stack-trace",
  "stalled",
  "standard-emulated-device-list",
  "start",
  "start-conversation-drjones-file",
  "start-conversation-drjones-network-request",
  "start-conversation-drjones-performance",
  "start-conversation-freestyler",
  "start-conversation-performance-insight",
  "start-new-chat",
  "start-recording",
  "start-time",
  "start-url",
  "start-view",
  "starter-badge-dismissed",
  "starter-badge-last-snoozed-timestamp",
  "starter-badge-snooze-count",
  "starting-style",
  "static-global-setting",
  "static-synced-setting",
  "status",
  "step",
  "step-actions",
  "step-editor",
  "step-over",
  "step-view",
  "stop",
  "stop-color",
  "stop-ignoring-this-retainer",
  "stop-opacity",
  "storage",
  "storage-bucket",
  "storage-buckets",
  "storage-items-view.clear-all",
  "storage-items-view.delete-selected",
  "storage-items-view.refresh",
  "storage-key",
  "storage.clear-site-data",
  "store-as-global-variable",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-attribute",
  "style-properties",
  "style-sheet-header",
  "style-sheet-id",
  "styles",
  "styles-metrics",
  "stylesheet",
  "styling-default",
  "subdomain",
  "subgrid",
  "subgrid-how",
  "subgrid-override",
  "subgrid-where",
  "submit",
  "subtree-modified",
  "suffix",
  "suggestion",
  "supports",
  "surface-duo",
  "surface-pro-7",
  "suspend",
  "sv",
  "sw",
  "sw-scope",
  "symbols",
  "sync-preferences",
  "sync-tag",
  "syntax",
  "system",
  "system-preferred",
  "system-ui",
  "ta",
  "tab-0",
  "tab-1",
  "tab-2",
  "tab-3",
  "tab-4",
  "tab-5",
  "tab-size",
  "table-layout",
  "tablet",
  "tag-name",
  "take-screenshot",
  "target",
  "target-crashed",
  "target-current",
  "target-selector",
  "targets",
  "task-duration",
  "te",
  "teaser-info-tooltip",
  "terms-of-service",
  "terms-of-service-accepted",
  "terms-of-service.console-insights",
  "test",
  "test-action",
  "test-combo-box-setting",
  "test-device",
  "test-font",
  "test-setting",
  "test-setting-true",
  "test-sidebar",
  "testing-flamechart",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-box",
  "text-box-edge",
  "text-box-trim",
  "text-combine-upright",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-skip-ink",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-editor-auto-detect-indent",
  "text-editor-auto-detect-indent-false",
  "text-editor-autocompletion",
  "text-editor-bracket-closing",
  "text-editor-bracket-closing-false",
  "text-editor-bracket-matching",
  "text-editor-bracket-matching-false",
  "text-editor-code-folding",
  "text-editor-code-folding-false",
  "text-editor-indent",
  "text-editor-tab-moves-focus",
  "text-editor-tab-moves-focus-true",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-grow",
  "text-indent",
  "text-justify",
  "text-node",
  "text-orientation",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-shrink",
  "text-size-adjust",
  "text-spacing",
  "text-spacing-trim",
  "text-transform",
  "text-underline-offset",
  "text-underline-position",
  "text-wrap",
  "text-wrap-mode",
  "text-wrap-style",
  "texttrack",
  "th",
  "third",
  "third-parties",
  "third-party-tree",
  "third-property",
  "this-origin",
  "throttle-request-domain",
  "throttle-request-url",
  "throttling-conditions",
  "throttling.calibrate",
  "throttling.calibrate-cancel",
  "thumbs-down",
  "thumbs-up",
  "time",
  "timeline",
  "timeline-alternative-navigation",
  "timeline-capture-layers-and-pictures",
  "timeline-capture-selector-stats",
  "timeline-compiled-sources",
  "timeline-counters-graph-documents",
  "timeline-counters-graph-gpu-memory-used-kb",
  "timeline-counters-graph-js-event-listeners",
  "timeline-counters-graph-js-heap-size-used",
  "timeline-counters-graph-nodes",
  "timeline-debug-mode",
  "timeline-dim-third-parties",
  "timeline-dim-unrelated-events",
  "timeline-disable-js-sampling",
  "timeline-enhanced-traces",
  "timeline-experimental-insights",
  "timeline-flamechart-main-view-group-expansion",
  "timeline-flamechart-network-view-group-expansion",
  "timeline-invalidation-tracking",
  "timeline-layout-shift-details",
  "timeline-main-flame-group-config",
  "timeline-main-flamechart-group-config",
  "timeline-network-flame-group-config",
  "timeline-overview",
  "timeline-persisted-main-flamechart-track-config",
  "timeline-persisted-network-flamechart-track-config",
  "timeline-save-as-gz",
  "timeline-scope",
  "timeline-settings-pane",
  "timeline-settings-toggle",
  "timeline-show-all-events",
  "timeline-show-extension-data",
  "timeline-show-memory",
  "timeline-show-postmessage-events",
  "timeline-show-screenshots",
  "timeline-show-settings-toolbar",
  "timeline-status",
  "timeline-tree-current-thread",
  "timeline-tree-group-by",
  "timeline-trigger",
  "timeline-trigger-behavior",
  "timeline-trigger-exit-range-end",
  "timeline-trigger-exit-range-start",
  "timeline-trigger-name",
  "timeline-trigger-range-end",
  "timeline-trigger-range-start",
  "timeline-trigger-source",
  "timeline-trigger-timeline",
  "timeline-user-has-opened-sidebar-once",
  "timeline-v8-runtime-call-stats",
  "timeline.animations",
  "timeline.annotation-sidebar.annotation-entries-link",
  "timeline.annotation-sidebar.annotation-entry-label",
  "timeline.annotation-sidebar.annotation-time-range",
  "timeline.annotation-sidebar.delete",
  "timeline.annotations-tab",
  "timeline.annotations.",
  "timeline.annotations.ai-generate-label",
  "timeline.annotations.create-entries-link",
  "timeline.annotations.create-entry-label",
  "timeline.annotations.create-entry-link",
  "timeline.annotations.delete-entry-annotations",
  "timeline.annotations.delete-entry-label",
  "timeline.annotations.entry-annotation-create",
  "timeline.annotations.entry-label-input",
  "timeline.annotations.time-range-label-input",
  "timeline.back-to-live-metrics",
  "timeline.breadcrumb-select",
  "timeline.clear",
  "timeline.configure",
  "timeline.create-breadcrumb",
  "timeline.disable",
  "timeline.download-after-error",
  "timeline.enable",
  "timeline.export-trace-options",
  "timeline.export-trace-options.annotations-checkbox",
  "timeline.export-trace-options.resource-content-checkbox",
  "timeline.export-trace-options.should-compress-checkbox",
  "timeline.export-trace-options.source-maps-checkbox",
  "timeline.extension",
  "timeline.field-data.configure",
  "timeline.field-data.disable",
  "timeline.field-data.enable",
  "timeline.field-data.settings",
  "timeline.field-data.setup",
  "timeline.field-metric-value",
  "timeline.flame-chart-view",
  "timeline.flamechart.main",
  "timeline.flamechart.network",
  "timeline.gpu",
  "timeline.history-item",
  "timeline.ignore-list",
  "timeline.ignore-list-new-regex.checkbox",
  "timeline.ignore-list-new-regex.text",
  "timeline.ignore-list-pattern",
  "timeline.ignore-list-pattern.remove",
  "timeline.insight-ask-ai.cache",
  "timeline.insight-ask-ai.cls-culprits",
  "timeline.insight-ask-ai.dismiss-field-mismatch",
  "timeline.insight-ask-ai.document-latency",
  "timeline.insight-ask-ai.dom-size",
  "timeline.insight-ask-ai.duplicated-javascript",
  "timeline.insight-ask-ai.field-mismatch",
  "timeline.insight-ask-ai.font-display",
  "timeline.insight-ask-ai.forced-reflow",
  "timeline.insight-ask-ai.image-delivery",
  "timeline.insight-ask-ai.inp",
  "timeline.insight-ask-ai.lcp-by-phase",
  "timeline.insight-ask-ai.lcp-discovery",
  "timeline.insight-ask-ai.legacy-javascript",
  "timeline.insight-ask-ai.long-critical-network-tree",
  "timeline.insight-ask-ai.modern-http",
  "timeline.insight-ask-ai.render-blocking-requests",
  "timeline.insight-ask-ai.slow-css-selector",
  "timeline.insight-ask-ai.third-parties",
  "timeline.insight-ask-ai.viewport",
  "timeline.insights-tab",
  "timeline.insights.cache",
  "timeline.insights.cls-culprits",
  "timeline.insights.dismiss-field-mismatch",
  "timeline.insights.document-latency",
  "timeline.insights.dom-size",
  "timeline.insights.duplicated-javascript",
  "timeline.insights.field-mismatch",
  "timeline.insights.font-display",
  "timeline.insights.forced-reflow",
  "timeline.insights.image-delivery",
  "timeline.insights.inp",
  "timeline.insights.lcp-by-phase",
  "timeline.insights.lcp-discovery",
  "timeline.insights.legacy-javascript",
  "timeline.insights.long-critical-network-tree",
  "timeline.insights.modern-http",
  "timeline.insights.render-blocking-requests",
  "timeline.insights.slow-css-selector",
  "timeline.insights.third-parties",
  "timeline.insights.viewport",
  "timeline.interactions",
  "timeline.jump-to-next-frame",
  "timeline.jump-to-previous-frame",
  "timeline.landing.clear-log",
  "timeline.landing.field-cls",
  "timeline.landing.field-inp",
  "timeline.landing.field-lcp",
  "timeline.landing.interaction-event-timing",
  "timeline.landing.interactions-log",
  "timeline.landing.layout-shift-event-score",
  "timeline.landing.layout-shifts-log",
  "timeline.landing.local-cls",
  "timeline.landing.local-inp",
  "timeline.landing.local-lcp",
  "timeline.landing.show-cls-cluster",
  "timeline.landing.show-inp-interaction",
  "timeline.layout-shifts",
  "timeline.load-from-file",
  "timeline.network",
  "timeline.next-recording",
  "timeline.overlays.candy-striped-time-range",
  "timeline.overlays.cursor-timestamp-marker",
  "timeline.overlays.entries-link",
  "timeline.overlays.entry-label",
  "timeline.overlays.entry-outline-error",
  "timeline.overlays.entry-outline-info",
  "timeline.overlays.time-range",
  "timeline.overlays.timespan-breakdown",
  "timeline.overlays.timings-marker",
  "timeline.previous-recording",
  "timeline.record-reload",
  "timeline.reveal-in-network",
  "timeline.save-to-file",
  "timeline.save-to-file-with-annotations",
  "timeline.save-to-file-without-annotations",
  "timeline.select-classic-navigation",
  "timeline.select-modern-navigation",
  "timeline.settings",
  "timeline.setup",
  "timeline.shortcuts-dialog-toggle",
  "timeline.show-history",
  "timeline.sidebar",
  "timeline.sidebar-insights-category-select",
  "timeline.sidebar-open",
  "timeline.stop-recording",
  "timeline.thread.auction-worklet",
  "timeline.thread.cpu-profile",
  "timeline.thread.frame",
  "timeline.thread.main",
  "timeline.thread.other",
  "timeline.thread.pool",
  "timeline.thread.rasterizer",
  "timeline.thread.worker",
  "timeline.timings",
  "timeline.toggle-insight.cache",
  "timeline.toggle-insight.cls-culprits",
  "timeline.toggle-insight.document-latency",
  "timeline.toggle-insight.dom-size",
  "timeline.toggle-insight.duplicated-javascript",
  "timeline.toggle-insight.font-display",
  "timeline.toggle-insight.forced-reflow",
  "timeline.toggle-insight.image-delivery",
  "timeline.toggle-insight.inp",
  "timeline.toggle-insight.lcp-by-phase",
  "timeline.toggle-insight.lcp-discovery",
  "timeline.toggle-insight.legacy-javascript",
  "timeline.toggle-insight.long-critical-network-tree",
  "timeline.toggle-insight.modern-http",
  "timeline.toggle-insight.render-blocking-requests",
  "timeline.toggle-insight.slow-css-selector",
  "timeline.toggle-insight.third-parties",
  "timeline.toggle-insight.viewport",
  "timeline.toggle-recording",
  "timeline.treemap.duplicated-javascript-insight",
  "timeline.user-had-shortcuts-dialog-opened-once",
  "timelineOverviewMode",
  "timeout",
  "timer",
  "times",
  "times-new-roman",
  "timestamp",
  "timeupdate",
  "timezone",
  "timezone-id",
  "timing",
  "timing-info",
  "title",
  "toggle-accessibility-tree",
  "toggle-drawer-orientation",
  "toggle-property-and-continue-editing",
  "toggle-recording",
  "toggle-similar-issues",
  "toggle-url-decoding",
  "top",
  "top-layer",
  "total",
  "total-duration",
  "touch",
  "touch-action",
  "touchcancel",
  "touchend",
  "touchmove",
  "touchstart",
  "tr",
  "track-configuration-enter",
  "track-configuration-exit",
  "tracking-sites-details",
  "trailing",
  "transfer-size",
  "transform",
  "transform-box",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-behavior",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "translate",
  "transport",
  "tree",
  "tritanopia",
  "trust-tokens",
  "trusted-type-violation",
  "trustedtype-policy-violation",
  "trustedtype-sink-violation",
  "type",
  "types",
  "u2f",
  "ua-type",
  "uc-browser-android-mobile",
  "uc-browser-i-os",
  "uc-browser-windows-phone",
  "ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
  "ui-theme",
  "ui-theme-dark",
  "ui-theme-default",
  "ui-theme-system-preferred",
  "uiTheme",
  "uk",
  "unavailable",
  "unblock",
  "undefined",
  "undo",
  "unicode-bidi",
  "unicode-range",
  "unit",
  "unload",
  "unregister",
  "unset",
  "unused-size",
  "update",
  "update-settings",
  "update-timeline",
  "update-timing-table",
  "upload",
  "upload-image",
  "ur",
  "url",
  "url-pattern",
  "usage",
  "usb",
  "use-code-with-caution",
  "use-custom-accepted-encodings",
  "use-source-map-scopes",
  "user-agent",
  "user-defined-network-conditions",
  "user-flow-name",
  "user-handle",
  "user-invalid",
  "user-select",
  "user-selected-network-condition-key",
  "user-shortcuts",
  "user-valid",
  "user-verification",
  "userHandle",
  "utf-8",
  "uz",
  "valid",
  "value",
  "value-1",
  "value-2",
  "value-3",
  "vary",
  "vary-header",
  "ve",
  "veLogsTestMode",
  "vector-effect",
  "verbose",
  "verdana",
  "vertical-align",
  "vertical-drawer",
  "very-slow",
  "vh",
  "vi",
  "view-all",
  "view-all-rules",
  "view-all-speculations",
  "view-computed-value",
  "view-details",
  "view-parsed",
  "view-profile",
  "view-source",
  "view-timeline",
  "view-timeline-axis",
  "view-timeline-inset",
  "view-timeline-name",
  "view-transition-capture-mode",
  "view-transition-class",
  "view-transition-group",
  "view-transition-name",
  "views-location-override",
  "virtual-authenticators",
  "visibility",
  "visited",
  "volumechange",
  "vs-code",
  "vw",
  "waiting",
  "waiting-entry-inspect",
  "warning",
  "wasm",
  "wasm-auto-stepping",
  "wasm-auto-stepping-documentation",
  "wasm-auto-stepping-false",
  "watch",
  "watch-test-expression",
  "watch-test-object",
  "waterfall",
  "web+coffee",
  "web+pwinter",
  "web-audio",
  "web-socket-frames",
  "web-socket-messages",
  "web-workers",
  "webassembly",
  "webauthn",
  "webauthn-authenticators",
  "webauthn-pane",
  "webauthn.active-authenticator",
  "webauthn.add-authenticator",
  "webauthn.export-credential",
  "webauthn.remove-authenticator",
  "webauthn.remove-credential",
  "webgl-error-fired",
  "webgl-warning-fired",
  "webp-format-disabled",
  "webp-format-disabled-true",
  "websocket",
  "whats-new",
  "wheel",
  "white-space",
  "white-space-collapse",
  "widows",
  "width",
  "will-change",
  "window",
  "window-controls-overlay",
  "windows",
  "word-break",
  "word-spacing",
  "word-wrap",
  "worker",
  "workspace",
  "workspace-folder-exclude-pattern",
  "writing-mode",
  "x",
  "x-large",
  "x-offset",
  "x-small",
  "xhr",
  "xml-view",
  "xr",
  "xx-large",
  "xx-small",
  "xy",
  "y",
  "y-offset",
  "z-index",
  "zh",
  "zh-hk",
  "zh-tw",
  "zoo",
  "zoom",
  "zstd",
  "zu"
]);

// gen/front_end/ui/visual_logging/LoggingConfig.js
var LOGGING_ATTRIBUTE = "jslog";
function needsLogging(element) {
  return element.hasAttribute(LOGGING_ATTRIBUTE);
}
function getLoggingConfig(element) {
  return parseJsLog(element.getAttribute(LOGGING_ATTRIBUTE) || "");
}
var VisualElements;
(function(VisualElements2) {
  VisualElements2[VisualElements2["TreeItem"] = 1] = "TreeItem";
  VisualElements2[VisualElements2["Close"] = 2] = "Close";
  VisualElements2[VisualElements2["Counter"] = 3] = "Counter";
  VisualElements2[VisualElements2["Drawer"] = 4] = "Drawer";
  VisualElements2[VisualElements2["Resizer"] = 5] = "Resizer";
  VisualElements2[VisualElements2["Toggle"] = 6] = "Toggle";
  VisualElements2[VisualElements2["Tree"] = 7] = "Tree";
  VisualElements2[VisualElements2["TextField"] = 8] = "TextField";
  VisualElements2[VisualElements2["AnimationClip"] = 9] = "AnimationClip";
  VisualElements2[VisualElements2["Section"] = 10] = "Section";
  VisualElements2[VisualElements2["SectionHeader"] = 11] = "SectionHeader";
  VisualElements2[VisualElements2["Timeline"] = 12] = "Timeline";
  VisualElements2[VisualElements2["CSSRuleHeader"] = 13] = "CSSRuleHeader";
  VisualElements2[VisualElements2["Expand"] = 14] = "Expand";
  VisualElements2[VisualElements2["ToggleSubpane"] = 15] = "ToggleSubpane";
  VisualElements2[VisualElements2["ControlPoint"] = 16] = "ControlPoint";
  VisualElements2[VisualElements2["Toolbar"] = 17] = "Toolbar";
  VisualElements2[VisualElements2["Popover"] = 18] = "Popover";
  VisualElements2[VisualElements2["BreakpointMarker"] = 19] = "BreakpointMarker";
  VisualElements2[VisualElements2["DropDown"] = 20] = "DropDown";
  VisualElements2[VisualElements2["Adorner"] = 21] = "Adorner";
  VisualElements2[VisualElements2["Gutter"] = 22] = "Gutter";
  VisualElements2[VisualElements2["MetricsBox"] = 23] = "MetricsBox";
  VisualElements2[VisualElements2["MetricsBoxPart"] = 24] = "MetricsBoxPart";
  VisualElements2[VisualElements2["Badge"] = 25] = "Badge";
  VisualElements2[VisualElements2["DOMBreakpoint"] = 26] = "DOMBreakpoint";
  VisualElements2[VisualElements2["Action"] = 29] = "Action";
  VisualElements2[VisualElements2["FilterDropdown"] = 30] = "FilterDropdown";
  VisualElements2[VisualElements2["Dialog"] = 31] = "Dialog";
  VisualElements2[VisualElements2["BezierCurveEditor"] = 32] = "BezierCurveEditor";
  VisualElements2[VisualElements2["BezierPresetCategory"] = 34] = "BezierPresetCategory";
  VisualElements2[VisualElements2["Preview"] = 35] = "Preview";
  VisualElements2[VisualElements2["Canvas"] = 36] = "Canvas";
  VisualElements2[VisualElements2["ColorEyeDropper"] = 37] = "ColorEyeDropper";
  VisualElements2[VisualElements2["Link"] = 44] = "Link";
  VisualElements2[VisualElements2["Item"] = 46] = "Item";
  VisualElements2[VisualElements2["PaletteColorShades"] = 47] = "PaletteColorShades";
  VisualElements2[VisualElements2["Panel"] = 48] = "Panel";
  VisualElements2[VisualElements2["ShowStyleEditor"] = 50] = "ShowStyleEditor";
  VisualElements2[VisualElements2["Slider"] = 51] = "Slider";
  VisualElements2[VisualElements2["CssColorMix"] = 52] = "CssColorMix";
  VisualElements2[VisualElements2["Value"] = 53] = "Value";
  VisualElements2[VisualElements2["Key"] = 54] = "Key";
  VisualElements2[VisualElements2["PieChart"] = 59] = "PieChart";
  VisualElements2[VisualElements2["PieChartSlice"] = 60] = "PieChartSlice";
  VisualElements2[VisualElements2["PieChartTotal"] = 61] = "PieChartTotal";
  VisualElements2[VisualElements2["ElementsBreadcrumbs"] = 62] = "ElementsBreadcrumbs";
  VisualElements2[VisualElements2["PanelTabHeader"] = 66] = "PanelTabHeader";
  VisualElements2[VisualElements2["Menu"] = 67] = "Menu";
  VisualElements2[VisualElements2["TableRow"] = 68] = "TableRow";
  VisualElements2[VisualElements2["TableHeader"] = 69] = "TableHeader";
  VisualElements2[VisualElements2["TableCell"] = 70] = "TableCell";
  VisualElements2[VisualElements2["Pane"] = 72] = "Pane";
  VisualElements2[VisualElements2["ResponsivePresets"] = 73] = "ResponsivePresets";
  VisualElements2[VisualElements2["DeviceModeRuler"] = 74] = "DeviceModeRuler";
  VisualElements2[VisualElements2["MediaInspectorView"] = 75] = "MediaInspectorView";
})(VisualElements || (VisualElements = {}));
function resolveVe(ve) {
  return VisualElements[ve] ?? 0;
}
var reportedUnknownVeContext = /* @__PURE__ */ new Set();
function checkContextValue(context) {
  if (typeof context !== "string" || !context.length || knownContextValues.has(context) || reportedUnknownVeContext.has(context)) {
    return;
  }
  if (Root.Runtime.Runtime.queryParam("debugFrontend") || Host.InspectorFrontendHost.isUnderTest() || localStorage.getItem("veDebugLoggingEnabled") === "Test") {
    const stack = (new Error().stack || "").split("\n").slice(3).join("\n");
    console.error(`Unknown VE context: '${context}'
${stack}
Please add it to front_end/ui/visual_logging/KnownContextValues.ts if you think that's a valid context value.`);
  }
  reportedUnknownVeContext.add(context);
}
function parseJsLog(jslog) {
  const components = jslog.replace(/ /g, "").split(";");
  const getComponent = (name) => components.find((c) => c.startsWith(name))?.substr(name.length);
  const ve = resolveVe(components[0]);
  if (ve === 0) {
    throw new Error("Unkown VE: " + jslog);
  }
  const config = { ve };
  const context = getComponent("context:");
  if (context?.trim().length) {
    checkContextValue(context);
    config.context = context;
  }
  const parent2 = getComponent("parent:");
  if (parent2) {
    config.parent = parent2;
  }
  const trackString = getComponent("track:");
  if (trackString) {
    config.track = {};
    for (const track of trackString.split(",")) {
      if (track.startsWith("keydown:")) {
        config.track.keydown = track.substr("keydown:".length);
      } else {
        config.track[track] = true;
      }
    }
  }
  return config;
}
function makeConfigStringBuilder(veName, context) {
  const components = [veName];
  if (typeof context === "string" && context.trim().length) {
    components.push(`context: ${context}`);
    checkContextValue(context);
  }
  return {
    context: function(value) {
      if (typeof value === "number" || typeof value === "string" && value.length) {
        components.push(`context: ${value}`);
      }
      checkContextValue(context);
      return this;
    },
    parent: function(value) {
      components.push(`parent: ${value}`);
      return this;
    },
    track: function(options) {
      components.push(`track: ${Object.entries(options).map(([key, value]) => value !== true ? `${key}: ${value}` : key).join(", ")}`);
      return this;
    },
    toString: function() {
      return components.join("; ");
    }
  };
}

// gen/front_end/ui/visual_logging/LoggingState.js
var LoggingState_exports = {};
__export(LoggingState_exports, {
  getLoggingState: () => getLoggingState,
  getOrCreateLoggingState: () => getOrCreateLoggingState,
  registerParentProvider: () => registerParentProvider,
  setMappedParent: () => setMappedParent
});
var state = /* @__PURE__ */ new WeakMap();
function nextVeId() {
  const result = new BigInt64Array(1);
  crypto.getRandomValues(result);
  return Number(result[0] >> 64n - 53n);
}
function getOrCreateLoggingState(loggable, config, parent2) {
  if (config.parent && parentProviders.has(config.parent) && loggable instanceof Element) {
    parent2 = parentProviders.get(config.parent)?.(loggable);
    while (parent2 instanceof Element && !needsLogging(parent2)) {
      parent2 = parent2.parentElementOrShadowHost() ?? void 0;
    }
  }
  if (state.has(loggable)) {
    const currentState = state.get(loggable);
    if (parent2 && currentState.parent !== getLoggingState(parent2)) {
      currentState.parent = getLoggingState(parent2);
    }
    return currentState;
  }
  const loggableState = {
    impressionLogged: false,
    processed: false,
    config,
    veid: nextVeId(),
    parent: parent2 ? getLoggingState(parent2) : null,
    size: new DOMRect(0, 0, 0, 0)
  };
  state.set(loggable, loggableState);
  return loggableState;
}
function getLoggingState(loggable) {
  return state.get(loggable) || null;
}
var parentProviders = /* @__PURE__ */ new Map();
function registerParentProvider(name, provider) {
  if (parentProviders.has(name)) {
    throw new Error(`Parent provider with the name '${name} is already registered'`);
  }
  parentProviders.set(name, provider);
}
var PARENT = Symbol("veParent");
registerParentProvider("mapped", (e) => e[PARENT]);
function setMappedParent(element, parent2) {
  element[PARENT] = parent2;
}

// gen/front_end/ui/visual_logging/Debugging.js
var veDebuggingEnabled = false;
var debugOverlay = null;
var debugPopover = null;
var highlightedElements = [];
var nonDomDebugElements = /* @__PURE__ */ new WeakMap();
var onInspect = void 0;
function ensureDebugOverlay() {
  if (!debugOverlay) {
    debugOverlay = document.createElement("div");
    debugOverlay.style.position = "fixed";
    debugOverlay.style.top = "0";
    debugOverlay.style.left = "0";
    debugOverlay.style.width = "100vw";
    debugOverlay.style.height = "100vh";
    debugOverlay.style.zIndex = "100000";
    debugOverlay.style.pointerEvents = "none";
    document.body.appendChild(debugOverlay);
    debugPopover = document.createElement("div");
    debugPopover.classList.add("ve-debug");
    debugPopover.style.position = "absolute";
    debugPopover.style.background = "var(--sys-color-cdt-base-container)";
    debugPopover.style.borderRadius = "2px";
    debugPopover.style.padding = "8px";
    debugPopover.style.boxShadow = "var(--drop-shadow)";
    debugOverlay.appendChild(debugPopover);
  }
}
function setVeDebuggingEnabled(enabled, inspect) {
  veDebuggingEnabled = enabled;
  if (enabled) {
    ensureDebugOverlay();
  }
  onInspect = inspect;
  if (!enabled) {
    highlightElement(null);
  }
}
globalThis.setVeDebuggingEnabled = setVeDebuggingEnabled;
var highlightedVeKey = null;
function setHighlightedVe(veKey) {
  ensureDebugOverlay();
  highlightedVeKey = veKey;
  highlightElement(null);
}
function maybeHighlightElement(element, highlightedKey) {
  highlightedKey = highlightedKey.trim();
  let state2 = getLoggingState(element);
  let trailingVe = state2?.config?.ve ? VisualElements[state2?.config?.ve] : null;
  while (state2 && highlightedKey) {
    const currentKey = elementKey(state2.config);
    if (highlightedKey.endsWith(currentKey)) {
      highlightedKey = highlightedKey.slice(0, -currentKey.length).trim();
    } else if (trailingVe && highlightedKey.endsWith(trailingVe)) {
      highlightedKey = highlightedKey.slice(0, -trailingVe.length).trim();
      trailingVe = null;
    } else {
      break;
    }
    state2 = state2.parent;
    if (state2 && !highlightedKey.endsWith(">")) {
      break;
    }
    highlightedKey = highlightedKey.slice(0, -1).trim();
  }
  if (!highlightedKey && !state2) {
    highlightElement(element, true);
  }
}
function processForDebugging(loggable) {
  if (highlightedVeKey && loggable instanceof HTMLElement) {
    maybeHighlightElement(loggable, highlightedVeKey);
  }
  const loggingState = getLoggingState(loggable);
  if (!veDebuggingEnabled || !loggingState || loggingState.processedForDebugging) {
    return;
  }
  if (loggable instanceof HTMLElement) {
    processElementForDebugging(loggable, loggingState);
  } else {
    processNonDomLoggableForDebugging(loggable, loggingState);
  }
}
function showDebugPopover(content, rect) {
  if (!debugPopover) {
    return;
  }
  debugPopover.style.display = "block";
  debugPopover.textContent = content;
  if (rect) {
    const debugPopoverReact = debugPopover.getBoundingClientRect();
    if (window.innerHeight < rect.bottom + debugPopoverReact.height + 8) {
      debugPopover.style.top = `${rect.top - debugPopoverReact.height - 8}px`;
    } else {
      debugPopover.style.top = `${rect.bottom + 8}px`;
    }
    if (window.innerWidth < rect.left + debugPopoverReact.width) {
      debugPopover.style.right = "0px";
      debugPopover.style.left = "";
    } else {
      debugPopover.style.right = "";
      debugPopover.style.left = `${rect.left}px`;
    }
  }
}
function highlightElement(element, allowMultiple = false) {
  if (highlightedElements.length > 0 && !allowMultiple && debugOverlay) {
    [...debugOverlay.children].forEach((e) => {
      if (e !== debugPopover) {
        e.remove();
      }
    });
    highlightedElements.length = 0;
  }
  if (element && !highlightedElements.includes(element)) {
    assertNotNullOrUndefined(debugOverlay);
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.style.position = "absolute";
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    highlight.style.background = "rgb(71 140 222 / 50%)";
    highlight.style.border = "dashed 1px #7327C6";
    highlight.style.pointerEvents = "none";
    debugOverlay.appendChild(highlight);
    highlightedElements.push(element);
  }
}
function processElementForDebugging(element, loggingState) {
  if (element.tagName === "OPTION") {
    if (loggingState.parent?.selectOpen && debugPopover) {
      debugPopover.innerHTML += "<br>" + debugString(loggingState.config);
      loggingState.processedForDebugging = true;
    }
  } else {
    element.addEventListener("mousedown", (event) => {
      if (highlightedElements.length && debugPopover && veDebuggingEnabled) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }, { capture: true });
    element.addEventListener("click", (event) => {
      if (highlightedElements.includes(event.currentTarget) && debugPopover && veDebuggingEnabled) {
        onInspect?.(debugPopover.textContent || "");
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }, { capture: true });
    element.addEventListener("mouseenter", () => {
      if (!veDebuggingEnabled) {
        return;
      }
      highlightElement(element);
      assertNotNullOrUndefined(debugPopover);
      const pathToRoot = [loggingState];
      let ancestor = loggingState.parent;
      while (ancestor) {
        pathToRoot.unshift(ancestor);
        ancestor = ancestor.parent;
      }
      showDebugPopover(pathToRoot.map((s) => elementKey(s.config)).join(" > "), element.getBoundingClientRect());
    }, { capture: true });
    element.addEventListener("mouseleave", () => {
      element.style.backgroundColor = "";
      element.style.outline = "";
      assertNotNullOrUndefined(debugPopover);
      debugPopover.style.display = "none";
    }, { capture: true });
    loggingState.processedForDebugging = true;
  }
}
function processEventForDebugging(event, state2, extraInfo) {
  const format = localStorage.getItem("veDebugLoggingEnabled");
  if (!format) {
    return;
  }
  switch (format) {
    case "Intuitive":
      processEventForIntuitiveDebugging(event, state2, extraInfo);
      break;
    case "Test":
      processEventForTestDebugging(event, state2, extraInfo);
      break;
    case "AdHocAnalysis":
      processEventForAdHocAnalysisDebugging(event, state2, extraInfo);
      break;
  }
}
function processEventForIntuitiveDebugging(event, state2, extraInfo) {
  const entry = {
    event,
    ve: state2 ? VisualElements[state2?.config.ve] : void 0,
    veid: state2?.veid,
    context: state2?.config.context,
    time: Date.now() - sessionStartTime,
    ...extraInfo
  };
  deleteUndefinedFields(entry);
  maybeLogDebugEvent(entry);
}
function processEventForTestDebugging(event, state2, _extraInfo) {
  if (event !== "SettingAccess" && event !== "FunctionCall") {
    lastImpressionLogEntry = null;
  }
  maybeLogDebugEvent({ interaction: event, veid: state2?.veid || 0 });
  checkPendingEventExpectation();
}
function processEventForAdHocAnalysisDebugging(event, state2, extraInfo) {
  const ve = state2 ? adHocAnalysisEntries.get(state2.veid) : null;
  if (ve) {
    const interaction = { time: Date.now() - sessionStartTime, type: event, ...extraInfo };
    deleteUndefinedFields(interaction);
    ve.interactions.push(interaction);
  }
}
function deleteUndefinedFields(entry) {
  for (const stringKey in entry) {
    const key = stringKey;
    if (typeof entry[key] === "undefined") {
      delete entry[key];
    }
  }
}
function processImpressionsForDebugging(states) {
  const format = localStorage.getItem("veDebugLoggingEnabled");
  switch (format) {
    case "Intuitive":
      processImpressionsForIntuitiveDebugLog(states);
      break;
    case "Test":
      processImpressionsForTestDebugLog(states);
      break;
    case "AdHocAnalysis":
      processImpressionsForAdHocAnalysisDebugLog(states);
      break;
    default:
  }
}
function processImpressionsForIntuitiveDebugLog(states) {
  const impressions = /* @__PURE__ */ new Map();
  for (const state2 of states) {
    const entry = {
      event: "Impression",
      ve: VisualElements[state2.config.ve],
      context: state2?.config.context,
      width: state2.size.width,
      height: state2.size.height,
      veid: state2.veid
    };
    deleteUndefinedFields(entry);
    impressions.set(state2.veid, entry);
    if (!state2.parent || !impressions.has(state2.parent?.veid)) {
      entry.parent = state2.parent?.veid;
    } else {
      const parent2 = impressions.get(state2.parent?.veid);
      parent2.children = parent2.children || [];
      parent2.children.push(entry);
    }
  }
  const entries = [...impressions.values()].filter((i) => "parent" in i);
  if (entries.length === 1) {
    entries[0].time = Date.now() - sessionStartTime;
    maybeLogDebugEvent(entries[0]);
  } else {
    maybeLogDebugEvent({ event: "Impression", children: entries, time: Date.now() - sessionStartTime });
  }
}
var veTestKeys = /* @__PURE__ */ new Map();
var lastImpressionLogEntry = null;
function processImpressionsForTestDebugLog(states) {
  if (!lastImpressionLogEntry) {
    lastImpressionLogEntry = { impressions: [] };
    veDebugEventsLog.push(lastImpressionLogEntry);
  }
  for (const state2 of states) {
    let key = "";
    if (state2.parent) {
      key = (veTestKeys.get(state2.parent.veid) || "<UNKNOWN>") + " > ";
    }
    key += VisualElements[state2.config.ve];
    if (state2.config.context) {
      key += ": " + state2.config.context;
    }
    veTestKeys.set(state2.veid, key);
    lastImpressionLogEntry.impressions.push(key);
  }
  checkPendingEventExpectation();
}
var adHocAnalysisEntries = /* @__PURE__ */ new Map();
function processImpressionsForAdHocAnalysisDebugLog(states) {
  for (const state2 of states) {
    const buildVe = (state3) => {
      const ve = {
        ve: VisualElements[state3.config.ve],
        veid: state3.veid,
        width: state3.size?.width,
        height: state3.size?.height,
        context: state3.config.context
      };
      deleteUndefinedFields(ve);
      if (state3.parent) {
        ve.parent = buildVe(state3.parent);
      }
      return ve;
    };
    const entry = { ...buildVe(state2), interactions: [], time: Date.now() - sessionStartTime };
    adHocAnalysisEntries.set(state2.veid, entry);
    maybeLogDebugEvent(entry);
  }
}
function processNonDomLoggableForDebugging(loggable, loggingState) {
  let debugElement = nonDomDebugElements.get(loggable);
  if (!debugElement) {
    debugElement = document.createElement("div");
    debugElement.classList.add("ve-debug");
    debugElement.style.background = "black";
    debugElement.style.color = "white";
    debugElement.style.zIndex = "100000";
    debugElement.textContent = debugString(loggingState.config);
    nonDomDebugElements.set(loggable, debugElement);
    setTimeout(() => {
      if (!loggingState.size?.width || !loggingState.size?.height) {
        debugElement?.parentElement?.removeChild(debugElement);
        nonDomDebugElements.delete(loggable);
      }
    }, 1e4);
  }
  const parentDebugElement = parent instanceof HTMLElement ? parent : nonDomDebugElements.get(parent) || debugPopover;
  assertNotNullOrUndefined(parentDebugElement);
  if (!parentDebugElement.classList.contains("ve-debug")) {
    debugElement.style.position = "absolute";
    parentDebugElement.insertBefore(debugElement, parentDebugElement.firstChild);
  } else {
    debugElement.style.marginLeft = "10px";
    parentDebugElement.appendChild(debugElement);
  }
}
function elementKey(config) {
  return `${VisualElements[config.ve]}${config.context ? `: ${config.context}` : ""}`;
}
function debugString(config) {
  const components = [VisualElements[config.ve]];
  if (config.context) {
    components.push(`context: ${config.context}`);
  }
  if (config.parent) {
    components.push(`parent: ${config.parent}`);
  }
  if (config.track) {
    components.push(`track: ${Object.entries(config.track).map(([key, value]) => `${key}${typeof value === "string" ? `: ${value}` : ""}`).join(", ")}`);
  }
  return components.join("; ");
}
var veDebugEventsLog = [];
function maybeLogDebugEvent(entry) {
  const format = localStorage.getItem("veDebugLoggingEnabled");
  if (!format) {
    return;
  }
  veDebugEventsLog.push(entry);
  if (format === "Intuitive") {
    console.info("VE Debug:", entry);
  }
}
function setVeDebugLoggingEnabled(enabled, format = "Intuitive") {
  if (enabled) {
    localStorage.setItem("veDebugLoggingEnabled", format);
  } else {
    localStorage.removeItem("veDebugLoggingEnabled");
  }
}
function findVeDebugImpression(veid, includeAncestorChain) {
  const findImpression = (entry) => {
    if (entry.event === "Impression" && entry.veid === veid) {
      return entry;
    }
    let i = 0;
    for (const childEntry of entry.children || []) {
      const matchingEntry = findImpression(childEntry);
      if (matchingEntry) {
        if (includeAncestorChain) {
          const children = [];
          children[i] = matchingEntry;
          return { ...entry, children };
        }
        return matchingEntry;
      }
      ++i;
    }
    return void 0;
  };
  return findImpression({ children: veDebugEventsLog });
}
function fieldValuesForSql(obj, fields) {
  return [
    ...fields.strings.map((f) => obj[f] ? `"${obj[f]}"` : "$NullString"),
    ...fields.numerics.map((f) => obj[f] ?? "null"),
    ...fields.booleans.map((f) => obj[f] ?? "$NullBool")
  ].join(", ");
}
function exportAdHocAnalysisLogForSql() {
  const VE_FIELDS = {
    strings: ["ve", "context"],
    numerics: ["veid", "width", "height"],
    booleans: []
  };
  const INTERACTION_FIELDS = {
    strings: ["type", "context"],
    numerics: ["width", "height", "mouseButton", "time"],
    booleans: ["width", "height", "mouseButton", "time"]
  };
  const fieldsDefsForSql = (fields) => fields.map((f, i) => `$${i + 1} as ${f}`).join(", ");
  const veForSql = (e) => `$VeFields(${fieldValuesForSql(e, VE_FIELDS)}, ${e.parent ? `STRUCT(${veForSql(e.parent)})` : null})`;
  const interactionForSql = (i) => `$Interaction(${fieldValuesForSql(i, INTERACTION_FIELDS)})`;
  const entryForSql = (e) => `$Entry(${veForSql(e)}, ([${e.interactions.map(interactionForSql).join(", ")}]), ${e.time})`;
  const entries = veDebugEventsLog;
  console.log(`
DEFINE MACRO NullString CAST(null AS STRING);
DEFINE MACRO NullBool CAST(null AS BOOL);
DEFINE MACRO VeFields ${fieldsDefsForSql([
    ...VE_FIELDS.strings,
    ...VE_FIELDS.numerics,
    "parent"
  ])};
DEFINE MACRO Interaction STRUCT(${fieldsDefsForSql([
    ...INTERACTION_FIELDS.strings,
    ...INTERACTION_FIELDS.numerics,
    ...INTERACTION_FIELDS.booleans
  ])});
DEFINE MACRO Entry STRUCT($1, $2 AS interactions, $3 AS time);

// This fake entry put first fixes nested struct fields names being lost
DEFINE MACRO FakeVeFields $VeFields("", $NullString, 0, 0, 0, $1);
DEFINE MACRO FakeVe STRUCT($FakeVeFields($1));
DEFINE MACRO FakeEntry $Entry($FakeVeFields($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe($FakeVe(null)))))))), ([]), 0);

WITH
  processed_logs AS (
      SELECT * FROM UNNEST([
        $FakeEntry,
        ${entries.map(entryForSql).join(", \n")}
      ])
    )



SELECT * FROM processed_logs;`);
}
function getStateFlowMutations() {
  const mutations = [];
  for (const entry of veDebugEventsLog) {
    mutations.push(entry);
    const veid = entry.veid;
    for (const interaction of entry.interactions) {
      mutations.push({ ...interaction, veid });
    }
  }
  mutations.sort((e1, e2) => e1.time - e2.time);
  return mutations;
}
var StateFlowElementsByArea = class {
  #data = /* @__PURE__ */ new Map();
  add(e) {
    this.#data.set(e.veid, e);
  }
  get(veid) {
    return this.#data.get(veid);
  }
  getArea(e) {
    let area = (e.width || 0) * (e.height || 0);
    const parent2 = e.parent ? this.#data.get(e.parent?.veid) : null;
    if (!parent2) {
      return area;
    }
    const parentArea = this.getArea(parent2);
    if (area > parentArea) {
      area = parentArea;
    }
    return area;
  }
  get data() {
    return [...this.#data.values()].filter((e) => this.getArea(e)).sort((e1, e2) => this.getArea(e2) - this.getArea(e1));
  }
};
function updateStateFlowTree(rootNode, elements, time, interactions) {
  let node = rootNode;
  for (const element of elements.data) {
    if (!("children" in node)) {
      return;
    }
    let nextNode = node.children[node.children.length - 1];
    const nextNodeId = nextNode?.type === "Impression" ? nextNode.veid : null;
    if (nextNodeId !== element.veid) {
      node.children.push(...interactions);
      interactions.length = 0;
      nextNode = { type: "Impression", ve: element.ve, veid: element.veid, context: element.context, time, children: [] };
      node.children.push(nextNode);
    }
    node = nextNode;
  }
}
function normalizeNode(node) {
  if (node.type !== "Impression") {
    return;
  }
  while (node.children.length === 1) {
    if (node.children[0].type === "Impression") {
      node.children = node.children[0].children;
    }
  }
  for (const child of node.children) {
    normalizeNode(child);
  }
}
function buildStateFlow() {
  const mutations = getStateFlowMutations();
  const elements = new StateFlowElementsByArea();
  const rootNode = { type: "Session", children: [] };
  let time = mutations[0].time;
  const interactions = [];
  for (const mutation of mutations) {
    if (mutation.time > time + 1e3) {
      updateStateFlowTree(rootNode, elements, time, interactions);
      interactions.length = 0;
    }
    if (!("type" in mutation)) {
      elements.add(mutation);
    } else if (mutation.type === "Resize") {
      const element = elements.get(mutation.veid);
      if (!element) {
        continue;
      }
      const oldArea = elements.getArea(element);
      element.width = mutation.width;
      element.height = mutation.height;
      if (elements.getArea(element) !== 0 && oldArea !== 0) {
        interactions.push(mutation);
      }
    } else {
      interactions.push(mutation);
    }
    time = mutation.time;
  }
  updateStateFlowTree(rootNode, elements, time, interactions);
  normalizeNode(rootNode);
  return rootNode;
}
var sessionStartTime = Date.now();
function processStartLoggingForDebugging() {
  sessionStartTime = Date.now();
  if (localStorage.getItem("veDebugLoggingEnabled") === "Intuitive") {
    maybeLogDebugEvent({ event: "SessionStart" });
  }
}
function compareVeEvents(actual, expected) {
  if ("interaction" in expected && "interaction" in actual) {
    const actualString = formatInteraction(actual);
    return expected.interaction === actualString;
  }
  if ("impressions" in expected && "impressions" in actual) {
    const actualSet = new Set(actual.impressions);
    const expectedSet = new Set(expected.impressions);
    const missing = [...expectedSet].filter((k) => !actualSet.has(k));
    return !Boolean(missing.length);
  }
  return false;
}
var pendingEventExpectation = null;
function formatImpressions(impressions) {
  const result = [];
  let lastImpression = "";
  for (const impression of impressions.sort()) {
    if (impression === lastImpression) {
      continue;
    }
    while (!impression.startsWith(lastImpression)) {
      lastImpression = lastImpression.substr(0, lastImpression.lastIndexOf(" > "));
    }
    result.push(" ".repeat(lastImpression.length) + impression.substr(lastImpression.length));
    lastImpression = impression;
  }
  return result.join("\n");
}
var EVENT_EXPECTATION_TIMEOUT = 5e3;
function formatInteraction(e) {
  if ("interaction" in e) {
    if (e.veid !== void 0) {
      const key = veTestKeys.get(e.veid) || (e.veid ? "<UNKNOWN>" : "");
      return `${e.interaction}: ${key}`;
    }
    return e.interaction;
  }
  return "";
}
function formatVeEvents(events) {
  return events.map((e) => {
    if ("interaction" in e) {
      return formatInteraction(e);
    }
    return formatImpressions(e.impressions);
  }).join("\n");
}
async function expectVeEvents(expectedEvents) {
  if (pendingEventExpectation) {
    throw new Error("VE events expectation already set. Cannot set another one until the previous is resolved");
  }
  const { promise, resolve: success, reject: fail } = Promise.withResolvers();
  pendingEventExpectation = { expectedEvents, success, fail, unmatchedEvents: [] };
  checkPendingEventExpectation();
  const timeout = setTimeout(() => {
    if (pendingEventExpectation?.missingEvents) {
      const allLogs = veDebugEventsLog.filter((ve) => {
        if ("interaction" in ve) {
          return ve.interaction !== "SettingAccess";
        }
        return true;
      });
      pendingEventExpectation.fail(new Error(`
Missing VE Events:
${formatVeEvents(pendingEventExpectation.missingEvents)}
Unmatched VE Events:
${formatVeEvents(pendingEventExpectation.unmatchedEvents)}
All events:
${JSON.stringify(allLogs, null, 2)}
`));
    }
  }, EVENT_EXPECTATION_TIMEOUT);
  return await promise.finally(() => {
    clearTimeout(timeout);
    pendingEventExpectation = null;
  });
}
var numMatchedEvents = 0;
function checkPendingEventExpectation() {
  if (!pendingEventExpectation) {
    return;
  }
  const actualEvents = [...veDebugEventsLog];
  let partialMatch = false;
  const matchedImpressions = /* @__PURE__ */ new Set();
  pendingEventExpectation.unmatchedEvents = [];
  for (let i = 0; i < pendingEventExpectation.expectedEvents.length; ++i) {
    const expectedEvent = pendingEventExpectation.expectedEvents[i];
    while (true) {
      if (actualEvents.length <= i) {
        pendingEventExpectation.missingEvents = pendingEventExpectation.expectedEvents.slice(i);
        for (const event of pendingEventExpectation.missingEvents) {
          if ("impressions" in event) {
            event.impressions = event.impressions.filter((impression) => !matchedImpressions.has(impression));
          }
        }
        return;
      }
      if (!compareVeEvents(actualEvents[i], expectedEvent)) {
        if (partialMatch) {
          const unmatched = { ...actualEvents[i] };
          if ("impressions" in unmatched && "impressions" in expectedEvent) {
            unmatched.impressions = unmatched.impressions.filter((impression) => {
              const matched = expectedEvent.impressions.includes(impression);
              if (matched) {
                matchedImpressions.add(impression);
              }
              return !matched;
            });
          }
          pendingEventExpectation.unmatchedEvents.push(unmatched);
        }
        actualEvents.splice(i, 1);
      } else {
        partialMatch = true;
        break;
      }
    }
  }
  numMatchedEvents = veDebugEventsLog.length - actualEvents.length + pendingEventExpectation.expectedEvents.length;
  pendingEventExpectation.success();
}
function getUnmatchedVeEvents() {
  console.error(numMatchedEvents);
  return formatVeEvents(veDebugEventsLog.slice(numMatchedEvents));
}
globalThis.setVeDebugLoggingEnabled = setVeDebugLoggingEnabled;
globalThis.getUnmatchedVeEvents = getUnmatchedVeEvents;
globalThis.veDebugEventsLog = veDebugEventsLog;
globalThis.findVeDebugImpression = findVeDebugImpression;
globalThis.exportAdHocAnalysisLogForSql = exportAdHocAnalysisLogForSql;
globalThis.buildStateFlow = buildStateFlow;
globalThis.expectVeEvents = expectVeEvents;

// gen/front_end/ui/visual_logging/DomState.js
var DomState_exports = {};
__export(DomState_exports, {
  getDomState: () => getDomState,
  visibleOverlap: () => visibleOverlap
});
function getDomState(documents2) {
  const loggables = [];
  const shadowRoots = [];
  const queue = [];
  const enqueue = (children, parent2) => {
    for (const child of children) {
      queue.push({ element: child, parent: parent2 });
    }
  };
  for (const document2 of documents2) {
    enqueue(document2.body.children);
  }
  let head = 0;
  const dequeue = () => queue[head++];
  while (true) {
    const top = dequeue();
    if (!top) {
      break;
    }
    const { element } = top;
    if (element.localName === "template") {
      continue;
    }
    let { parent: parent2 } = top;
    if (needsLogging(element)) {
      loggables.push({ element, parent: parent2 });
      parent2 = element;
    }
    if (element.localName === "slot" && element.assignedElements().length) {
      enqueue(element.assignedElements(), parent2);
    } else if (element.shadowRoot) {
      shadowRoots.push(element.shadowRoot);
      enqueue(element.shadowRoot.children, parent2);
    } else {
      enqueue(element.children, parent2);
    }
  }
  return { loggables, shadowRoots };
}
var MIN_ELEMENT_SIZE_FOR_IMPRESSIONS = 10;
function visibleOverlap(element, viewportRect) {
  const elementRect = element.getBoundingClientRect();
  const overlap = intersection(viewportRect, elementRect);
  const sizeThreshold = Math.max(Math.min(MIN_ELEMENT_SIZE_FOR_IMPRESSIONS, elementRect.width, elementRect.height), 1);
  if (!overlap || overlap.width < sizeThreshold || overlap.height < sizeThreshold) {
    return null;
  }
  return overlap;
}
function intersection(a, b) {
  const x0 = Math.max(a.left, b.left);
  const x1 = Math.min(a.left + a.width, b.left + b.width);
  if (x0 <= x1) {
    const y0 = Math.max(a.top, b.top);
    const y1 = Math.min(a.top + a.height, b.top + b.height);
    if (y0 <= y1) {
      return new DOMRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  return null;
}

// gen/front_end/ui/visual_logging/LoggingDriver.js
var LoggingDriver_exports = {};
__export(LoggingDriver_exports, {
  addDocument: () => addDocument,
  clickLogThrottler: () => clickLogThrottler,
  isLogging: () => isLogging,
  keyboardLogThrottler: () => keyboardLogThrottler,
  process: () => process,
  resizeLogThrottler: () => resizeLogThrottler,
  scheduleProcessing: () => scheduleProcessing,
  startLogging: () => startLogging,
  stopLogging: () => stopLogging
});
import * as Common2 from "./../../core/common/common.js";
import * as Host3 from "./../../core/host/host.js";
import * as RenderCoordinator from "./../components/render_coordinator/render_coordinator.js";

// gen/front_end/ui/visual_logging/LoggingEvents.js
var LoggingEvents_exports = {};
__export(LoggingEvents_exports, {
  contextAsNumber: () => contextAsNumber,
  logChange: () => logChange,
  logClick: () => logClick,
  logDrag: () => logDrag,
  logFunctionCall: () => logFunctionCall,
  logHover: () => logHover,
  logImpressions: () => logImpressions,
  logKeyDown: () => logKeyDown,
  logResize: () => logResize,
  logSettingAccess: () => logSettingAccess
});
import * as Common from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined2 } from "./../../core/platform/platform.js";
async function logImpressions(loggables) {
  const impressions = await Promise.all(loggables.map(async (loggable) => {
    const loggingState = getLoggingState(loggable);
    assertNotNullOrUndefined2(loggingState);
    const impression = { id: loggingState.veid, type: loggingState.config.ve };
    if (typeof loggingState.config.context !== "undefined") {
      impression.context = await contextAsNumber(loggingState.config.context);
    }
    if (loggingState.parent) {
      impression.parent = loggingState.parent.veid;
    }
    if (loggingState.size) {
      impression.width = Math.round(loggingState.size.width);
      impression.height = Math.round(loggingState.size.height);
    }
    return impression;
  }));
  if (impressions.length) {
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordImpression({ impressions });
    processImpressionsForDebugging(loggables.map((l) => getLoggingState(l)));
  }
}
var logResize = (loggable, size) => {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  loggingState.size = size;
  const resizeEvent = { veid: loggingState.veid, width: loggingState.size.width, height: loggingState.size.height };
  Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordResize(resizeEvent);
  processEventForDebugging("Resize", loggingState, { width: Math.round(size.width), height: Math.round(size.height) });
};
var logClick = (throttler) => (loggable, event, options) => {
  const loggingState = getLoggingState(loggable);
  if (!loggingState) {
    return;
  }
  const clickEvent = { veid: loggingState.veid, doubleClick: Boolean(options?.doubleClick) };
  if (event instanceof MouseEvent && "sourceCapabilities" in event && event.sourceCapabilities) {
    clickEvent.mouseButton = event.button;
  }
  void throttler.schedule(
    async () => {
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordClick(clickEvent);
      processEventForDebugging("Click", loggingState, { mouseButton: clickEvent.mouseButton, doubleClick: clickEvent.doubleClick });
    },
    "Delayed"
    /* Common.Throttler.Scheduling.DELAYED */
  );
};
var logHover = (throttler) => async (event) => {
  const loggingState = getLoggingState(event.currentTarget);
  assertNotNullOrUndefined2(loggingState);
  const hoverEvent = { veid: loggingState.veid };
  void throttler.schedule(
    async () => {
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordHover(hoverEvent);
      processEventForDebugging("Hover", loggingState);
    },
    "Delayed"
    /* Common.Throttler.Scheduling.DELAYED */
  );
};
var logDrag = (throttler) => async (event) => {
  const loggingState = getLoggingState(event.currentTarget);
  assertNotNullOrUndefined2(loggingState);
  const dragEvent = { veid: loggingState.veid };
  void throttler.schedule(
    async () => {
      Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordDrag(dragEvent);
      processEventForDebugging("Drag", loggingState);
    },
    "Delayed"
    /* Common.Throttler.Scheduling.DELAYED */
  );
};
async function logChange(loggable) {
  const loggingState = getLoggingState(loggable);
  assertNotNullOrUndefined2(loggingState);
  const changeEvent = { veid: loggingState.veid };
  const context = loggingState.pendingChangeContext;
  if (context) {
    changeEvent.context = await contextAsNumber(context);
  }
  Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordChange(changeEvent);
  processEventForDebugging("Change", loggingState, { context });
}
var pendingKeyDownContext = null;
var logKeyDown = (throttler) => async (loggable, event, context) => {
  if (!(event instanceof KeyboardEvent)) {
    return;
  }
  const loggingState = loggable ? getLoggingState(loggable) : null;
  const codes = typeof loggingState?.config.track?.keydown === "string" ? loggingState.config.track.keydown : "";
  if (codes.length && !codes.split("|").includes(event.code) && !codes.split("|").includes(event.key)) {
    return;
  }
  const keyDownEvent = { veid: loggingState?.veid };
  if (!context && codes?.length) {
    context = contextFromKeyCodes(event);
  }
  if (pendingKeyDownContext && context && pendingKeyDownContext !== context) {
    void throttler.process?.();
  }
  pendingKeyDownContext = context || null;
  void throttler.schedule(async () => {
    if (context) {
      keyDownEvent.context = await contextAsNumber(context);
    }
    Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordKeyDown(keyDownEvent);
    processEventForDebugging("KeyDown", loggingState, { context });
    pendingKeyDownContext = null;
  });
};
function contextFromKeyCodes(event) {
  if (!(event instanceof KeyboardEvent)) {
    return void 0;
  }
  const key = event.key;
  const lowerCaseKey = key.toLowerCase();
  const components = [];
  if (event.shiftKey && key !== lowerCaseKey) {
    components.push("shift");
  }
  if (event.ctrlKey) {
    components.push("ctrl");
  }
  if (event.altKey) {
    components.push("alt");
  }
  if (event.metaKey) {
    components.push("meta");
  }
  components.push(lowerCaseKey);
  return components.join("-");
}
async function contextAsNumber(context) {
  if (typeof context === "undefined") {
    return void 0;
  }
  const number = parseInt(context, 10);
  if (!isNaN(number)) {
    return number;
  }
  if (!crypto.subtle) {
    return 3735928559;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(context);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return new DataView(digest).getInt32(0, true);
}
async function logSettingAccess(name, value) {
  let numericValue = void 0;
  let stringValue = void 0;
  if (typeof value === "string") {
    stringValue = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    numericValue = Number(value);
  }
  const nameHash = await contextAsNumber(name);
  if (!nameHash) {
    return;
  }
  const settingAccessEvent = {
    name: nameHash,
    numeric_value: numericValue,
    string_value: await contextAsNumber(stringValue)
  };
  Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordSettingAccess(settingAccessEvent);
  processEventForDebugging("SettingAccess", null, { name, numericValue, stringValue });
}
async function logFunctionCall(name, context) {
  const nameHash = await contextAsNumber(name);
  if (typeof nameHash === "undefined") {
    return;
  }
  const functionCallEvent = { name: nameHash, context: await contextAsNumber(context) };
  Host2.InspectorFrontendHost.InspectorFrontendHostInstance.recordFunctionCall(functionCallEvent);
  processEventForDebugging("FunctionCall", null, { name, context });
}

// gen/front_end/ui/visual_logging/NonDomState.js
var NonDomState_exports = {};
__export(NonDomState_exports, {
  getNonDomLoggables: () => getNonDomLoggables,
  hasNonDomLoggables: () => hasNonDomLoggables,
  registerLoggable: () => registerLoggable,
  unregisterAllLoggables: () => unregisterAllLoggables,
  unregisterLoggables: () => unregisterLoggables
});
var registry = /* @__PURE__ */ new WeakMap();
function getLoggables(parent2) {
  return registry.get(parent2 || nullParent) || [];
}
function registerLoggable(loggable, config, parent2, size) {
  const values = getLoggables(parent2);
  values.push({ loggable, config, parent: parent2, size });
  registry.set(parent2 || nullParent, values);
}
function hasNonDomLoggables(parent2) {
  return registry.has(parent2 || nullParent);
}
function getNonDomLoggables(parent2) {
  return [...getLoggables(parent2)];
}
function unregisterLoggables(parent2) {
  registry.delete(parent2 || nullParent);
}
function unregisterAllLoggables() {
  registry = /* @__PURE__ */ new WeakMap();
}
var nullParent = {};

// gen/front_end/ui/visual_logging/LoggingDriver.js
var PROCESS_DOM_INTERVAL = 500;
var KEYBOARD_LOG_INTERVAL = 3e3;
var HOVER_LOG_INTERVAL = 1e3;
var DRAG_LOG_INTERVAL = 1250;
var DRAG_REPORT_THRESHOLD = 50;
var CLICK_LOG_INTERVAL = 500;
var RESIZE_LOG_INTERVAL = 200;
var RESIZE_REPORT_THRESHOLD = 50;
var noOpThrottler = {
  schedule: async () => {
  }
};
var processingThrottler = noOpThrottler;
var keyboardLogThrottler = noOpThrottler;
var hoverLogThrottler = noOpThrottler;
var dragLogThrottler = noOpThrottler;
var clickLogThrottler = noOpThrottler;
var resizeLogThrottler = noOpThrottler;
var mutationObserver = new MutationObserver(scheduleProcessing);
var resizeObserver = new ResizeObserver(onResizeOrIntersection);
var intersectionObserver = new IntersectionObserver(onResizeOrIntersection);
var documents = [];
var pendingResize = /* @__PURE__ */ new Map();
var pendingChange = /* @__PURE__ */ new Set();
function observeMutations(roots) {
  for (const root of roots) {
    mutationObserver.observe(root, { attributes: true, childList: true, subtree: true });
    root.querySelectorAll("[popover]")?.forEach((e) => e.addEventListener("toggle", scheduleProcessing));
  }
}
var logging = false;
function isLogging() {
  return logging;
}
async function startLogging(options) {
  logging = true;
  processingThrottler = options?.processingThrottler || new Common2.Throttler.Throttler(PROCESS_DOM_INTERVAL);
  keyboardLogThrottler = options?.keyboardLogThrottler || new Common2.Throttler.Throttler(KEYBOARD_LOG_INTERVAL);
  hoverLogThrottler = options?.hoverLogThrottler || new Common2.Throttler.Throttler(HOVER_LOG_INTERVAL);
  dragLogThrottler = options?.dragLogThrottler || new Common2.Throttler.Throttler(DRAG_LOG_INTERVAL);
  clickLogThrottler = options?.clickLogThrottler || new Common2.Throttler.Throttler(CLICK_LOG_INTERVAL);
  resizeLogThrottler = options?.resizeLogThrottler || new Common2.Throttler.Throttler(RESIZE_LOG_INTERVAL);
  processStartLoggingForDebugging();
  await addDocument(document);
}
async function addDocument(document2) {
  documents.push(document2);
  if (["interactive", "complete"].includes(document2.readyState)) {
    await process();
  }
  document2.addEventListener("visibilitychange", scheduleProcessing);
  document2.addEventListener("scroll", scheduleProcessing);
  observeMutations([document2.body]);
}
async function stopLogging() {
  await keyboardLogThrottler.schedule(
    async () => {
    },
    "AsSoonAsPossible"
    /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */
  );
  logging = false;
  unregisterAllLoggables();
  for (const document2 of documents) {
    document2.removeEventListener("visibilitychange", scheduleProcessing);
    document2.removeEventListener("scroll", scheduleProcessing);
  }
  mutationObserver.disconnect();
  resizeObserver.disconnect();
  intersectionObserver.disconnect();
  documents.length = 0;
  viewportRects.clear();
  processingThrottler = noOpThrottler;
  pendingResize.clear();
  pendingChange.clear();
}
async function yieldToResize() {
  while (resizeLogThrottler.process) {
    await resizeLogThrottler.processCompleted;
  }
}
async function yieldToInteractions() {
  while (clickLogThrottler.process) {
    await clickLogThrottler.processCompleted;
  }
  while (keyboardLogThrottler.process) {
    await keyboardLogThrottler.processCompleted;
  }
}
function flushPendingChangeEvents() {
  for (const element of pendingChange) {
    logPendingChange(element);
  }
}
function scheduleProcessing() {
  if (!processingThrottler) {
    return;
  }
  void processingThrottler.schedule(() => RenderCoordinator.read("processForLogging", process));
}
var viewportRects = /* @__PURE__ */ new Map();
var viewportRectFor = (element) => {
  const ownerDocument = element.ownerDocument;
  const viewportRect = viewportRects.get(ownerDocument) || new DOMRect(0, 0, ownerDocument.defaultView?.innerWidth || 0, ownerDocument.defaultView?.innerHeight || 0);
  viewportRects.set(ownerDocument, viewportRect);
  return viewportRect;
};
async function process() {
  if (document.hidden) {
    return;
  }
  const startTime = performance.now();
  const { loggables, shadowRoots } = getDomState(documents);
  const visibleLoggables = [];
  observeMutations(shadowRoots);
  const nonDomRoots = [void 0];
  for (const { element, parent: parent2 } of loggables) {
    const loggingState = getOrCreateLoggingState(element, getLoggingConfig(element), parent2);
    if (!loggingState.impressionLogged) {
      const overlap = visibleOverlap(element, viewportRectFor(element));
      const visibleSelectOption = element.tagName === "OPTION" && loggingState.parent?.selectOpen;
      const visible = overlap && element.checkVisibility({ checkVisibilityCSS: true }) && (!parent2 || loggingState.parent?.impressionLogged);
      if (visible || visibleSelectOption) {
        if (overlap) {
          loggingState.size = overlap;
        }
        visibleLoggables.push(element);
        loggingState.impressionLogged = true;
      }
    }
    if (loggingState.impressionLogged && hasNonDomLoggables(element)) {
      nonDomRoots.push(element);
    }
    if (!loggingState.processed) {
      const clickLikeHandler = (doubleClick) => (e) => {
        const loggable = e.currentTarget;
        maybeCancelDrag(e);
        logClick(clickLogThrottler)(loggable, e, { doubleClick });
      };
      if (loggingState.config.track?.click) {
        element.addEventListener("click", clickLikeHandler(false), { capture: true });
        element.addEventListener("auxclick", clickLikeHandler(false), { capture: true });
        element.addEventListener("contextmenu", clickLikeHandler(false), { capture: true });
      }
      if (loggingState.config.track?.dblclick) {
        element.addEventListener("dblclick", clickLikeHandler(true), { capture: true });
      }
      const trackHover = loggingState.config.track?.hover;
      if (trackHover) {
        element.addEventListener("mouseover", logHover(hoverLogThrottler), { capture: true });
        element.addEventListener("mouseout", () => hoverLogThrottler.schedule(
          cancelLogging,
          "AsSoonAsPossible"
          /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */
        ), { capture: true });
      }
      const trackDrag = loggingState.config.track?.drag;
      if (trackDrag) {
        element.addEventListener("pointerdown", onDragStart, { capture: true });
        document.addEventListener("pointerup", maybeCancelDrag, { capture: true });
        document.addEventListener("dragend", maybeCancelDrag, { capture: true });
      }
      if (loggingState.config.track?.change) {
        element.addEventListener("input", (event) => {
          if (!(event instanceof InputEvent)) {
            return;
          }
          if (loggingState.pendingChangeContext && loggingState.pendingChangeContext !== event.inputType) {
            void logPendingChange(element);
          }
          loggingState.pendingChangeContext = event.inputType;
          pendingChange.add(element);
        }, { capture: true });
        element.addEventListener("change", (event) => {
          const target = event?.target ?? element;
          if (["checkbox", "radio"].includes(target.type)) {
            loggingState.pendingChangeContext = target.checked ? "on" : "off";
          }
          logPendingChange(element);
        }, { capture: true });
        element.addEventListener("focusout", () => {
          if (loggingState.pendingChangeContext) {
            void logPendingChange(element);
          }
        }, { capture: true });
      }
      const trackKeyDown = loggingState.config.track?.keydown;
      if (trackKeyDown) {
        element.addEventListener("keydown", (e) => logKeyDown(keyboardLogThrottler)(e.currentTarget, e), { capture: true });
      }
      if (loggingState.config.track?.resize) {
        resizeObserver.observe(element);
        intersectionObserver.observe(element);
      }
      if (element.tagName === "SELECT") {
        const onSelectOpen = (e) => {
          void logClick(clickLogThrottler)(element, e);
          if (loggingState.selectOpen) {
            return;
          }
          loggingState.selectOpen = true;
          void scheduleProcessing();
        };
        element.addEventListener("click", onSelectOpen, { capture: true });
        element.addEventListener("keydown", (event) => {
          const e = event;
          if ((Host3.Platform.isMac() || e.altKey) && (e.code === "ArrowDown" || e.code === "ArrowUp") || !e.altKey && !e.ctrlKey && e.code === "F4") {
            onSelectOpen(event);
          }
        }, { capture: true });
        element.addEventListener("keypress", (event) => {
          const e = event;
          if (e.key === " " || !Host3.Platform.isMac() && e.key === "\r") {
            onSelectOpen(event);
          }
        }, { capture: true });
        element.addEventListener("change", (e) => {
          for (const option of element.selectedOptions) {
            if (getLoggingState(option)?.config.track?.click) {
              void logClick(clickLogThrottler)(option, e);
            }
          }
        }, { capture: true });
      }
      loggingState.processed = true;
    }
    processForDebugging(element);
  }
  for (let i = 0; i < nonDomRoots.length; ++i) {
    const root = nonDomRoots[i];
    for (const { loggable, config, parent: parent2, size } of getNonDomLoggables(root)) {
      const loggingState = getOrCreateLoggingState(loggable, config, parent2);
      if (size) {
        loggingState.size = size;
      }
      processForDebugging(loggable);
      visibleLoggables.push(loggable);
      loggingState.impressionLogged = true;
      if (hasNonDomLoggables(loggable)) {
        nonDomRoots.push(loggable);
      }
    }
    unregisterLoggables(root);
  }
  if (visibleLoggables.length) {
    await yieldToInteractions();
    await yieldToResize();
    flushPendingChangeEvents();
    await logImpressions(visibleLoggables);
  }
  Host3.userMetrics.visualLoggingProcessingDone(performance.now() - startTime);
}
function logPendingChange(element) {
  const loggingState = getLoggingState(element);
  if (!loggingState) {
    return;
  }
  void logChange(element);
  delete loggingState.pendingChangeContext;
  pendingChange.delete(element);
}
async function cancelLogging() {
}
var dragStartX = 0;
var dragStartY = 0;
function onDragStart(event) {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  dragStartX = event.screenX;
  dragStartY = event.screenY;
  void logDrag(dragLogThrottler)(event);
}
function maybeCancelDrag(event) {
  if (!(event instanceof MouseEvent)) {
    return;
  }
  if (Math.abs(event.screenX - dragStartX) >= DRAG_REPORT_THRESHOLD || Math.abs(event.screenY - dragStartY) >= DRAG_REPORT_THRESHOLD) {
    return;
  }
  void dragLogThrottler.schedule(
    cancelLogging,
    "AsSoonAsPossible"
    /* Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE */
  );
}
function isAncestorOf(state1, state2) {
  while (state2) {
    if (state2 === state1) {
      return true;
    }
    state2 = state2.parent;
  }
  return false;
}
async function onResizeOrIntersection(entries) {
  for (const entry of entries) {
    const element = entry.target;
    const loggingState = getLoggingState(element);
    const overlap = visibleOverlap(element, viewportRectFor(element)) || new DOMRect(0, 0, 0, 0);
    if (!loggingState?.size) {
      continue;
    }
    let hasPendingParent = false;
    for (const pendingElement of pendingResize.keys()) {
      if (pendingElement === element) {
        continue;
      }
      const pendingState = getLoggingState(pendingElement);
      if (isAncestorOf(pendingState, loggingState)) {
        hasPendingParent = true;
        break;
      }
      if (isAncestorOf(loggingState, pendingState)) {
        pendingResize.delete(pendingElement);
      }
    }
    if (hasPendingParent) {
      continue;
    }
    pendingResize.set(element, overlap);
    void resizeLogThrottler.schedule(
      async () => {
        if (pendingResize.size) {
          await yieldToInteractions();
          flushPendingChangeEvents();
        }
        for (const [element2, overlap2] of pendingResize.entries()) {
          const loggingState2 = getLoggingState(element2);
          if (!loggingState2) {
            continue;
          }
          if (Math.abs(overlap2.width - loggingState2.size.width) >= RESIZE_REPORT_THRESHOLD || Math.abs(overlap2.height - loggingState2.size.height) >= RESIZE_REPORT_THRESHOLD) {
            logResize(element2, overlap2);
          }
        }
        pendingResize.clear();
      },
      "Delayed"
      /* Common.Throttler.Scheduling.DELAYED */
    );
  }
}
export {
  Debugging_exports as Debugging,
  DomState_exports as DomState,
  LoggingConfig_exports as LoggingConfig,
  LoggingDriver_exports as LoggingDriver,
  LoggingEvents_exports as LoggingEvents,
  LoggingState_exports as LoggingState,
  NonDomState_exports as NonDomState
};
//# sourceMappingURL=visual_logging-testing.js.map
