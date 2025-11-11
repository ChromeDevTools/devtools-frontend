var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/markdown_view/CodeBlock.js
var CodeBlock_exports = {};
__export(CodeBlock_exports, {
  CodeBlock: () => CodeBlock,
  languageFromToken: () => languageFromToken
});
import "./../../legacy/legacy.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as CodeMirror from "./../../../third_party/codemirror.next/codemirror.next.js";
import * as Buttons from "./../buttons/buttons.js";
import * as TextEditor from "./../text_editor/text_editor.js";
import * as UI from "./../../legacy/legacy.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/markdown_view/codeBlock.css.js
var codeBlock_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:host {
  display: block;
  /**
    Adjusts the max height of the code area.
    This can be changed from outside by targeting \\'devtools-code-block\\' element.
  */
  --code-block-max-code-height: none;
  /**
    Adjusts the background color of the code block element.
    This can be changed from outside by targeting \\'devtools-code-block\\' element.
  */
  --code-block-background-color: var(--sys-color-surface2);
}

.codeblock {
  box-sizing: border-box;
  color: var(--sys-color-on-surface);
}

.codeblock .editor-wrapper {
  color: var(--sys-color-on-surface);
  background: var(--code-block-background-color); /* stylelint-disable-line plugin/use_theme_colors */
  padding: 10px 5px 0;
  border-bottom-left-radius: var(--sys-shape-corner-extra-small);
  border-bottom-right-radius: var(--sys-shape-corner-extra-small);
}

.codeblock .editor-wrapper:has(.heading) {
  padding: var(--sys-size-3) var(--sys-size-4) 0 5px;
}

.codeblock:not(:has(.toolbar)) .editor-wrapper {
  border-radius: var(--sys-shape-corner-extra-small);
}

.codeblock .editor-wrapper .code {
  max-height: var(--code-block-max-code-height);
  overflow: auto;
  padding-bottom: 10px;
}

.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--sys-size-11);
}

.heading-text-wrapper {
  display: flex;

  .citation {
    text-decoration: underline;
    color: var(--sys-color-primary);
    background-color: transparent;
    cursor: pointer;
    outline-offset: var(--sys-size-2);
    border: none;
    padding-bottom: 2px;
    font-size: 11px;
    font-family: var(--default-font-family);
  }
}

.heading-text {
  font: var(--sys-typescale-body5-bold);
  padding-left: var(--sys-size-4);
  padding-right: var(--sys-size-2);
}

.codeblock .lang {
  padding: var(--sys-size-4) 0;
  flex: 1;
}

.codeblock .copy-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: var(--sys-typescale-body5-size);

  span {
    padding-right: var(--sys-size-4);
  }
}

.notice {
  margin-top: var(--sys-size-2);
  padding: var(--sys-size-4) var(--sys-size-5);
  background-color: var(--code-block-background-color); /* stylelint-disable-line plugin/use_theme_colors */
  border-radius: var(--sys-shape-corner-extra-small);

  .link {
    font: var(--sys-typescale-body4-regular);
    color: var(--sys-color-primary);
    text-decoration-line: underline;
  }
}

/*# sourceURL=${import.meta.resolve("./codeBlock.css")} */`;

// gen/front_end/ui/components/markdown_view/CodeBlock.js
var { html: html2 } = Lit;
var UIStrings = {
  /**
   * @description The header text if not present and language is not set.
   */
  code: "Code",
  /**
   * @description The title of the button to copy the codeblock from a Markdown view.
   */
  copy: "Copy code",
  /**
   * @description The title of the button after it was pressed and the text was copied to clipboard.
   */
  copied: "Copied to clipboard",
  /**
   * @description Disclaimer shown in the code blocks.
   */
  disclaimer: "Use code snippets with caution"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/markdown_view/CodeBlock.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
async function languageFromToken(lang) {
  switch (lang) {
    case "javascript":
    case "js":
    case "jsx":
      return CodeMirror.javascript.javascript({ jsx: true });
    case "typescript":
    case "ts":
      return CodeMirror.javascript.javascript({ typescript: true });
    case "tsx":
      return CodeMirror.javascript.javascript({ typescript: true, jsx: true });
    case "less":
    case "scss":
    case "sass":
    case "css":
      return CodeMirror.css.css();
    case "html":
      return CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true });
    case "xml":
      return (await CodeMirror.xml()).xml();
    case "cpp":
      return (await CodeMirror.cpp()).cpp();
    case "go":
      return new CodeMirror.LanguageSupport(await CodeMirror.go());
    case "java":
      return (await CodeMirror.java()).java();
    case "kotlin":
      return new CodeMirror.LanguageSupport(await CodeMirror.kotlin());
    case "json": {
      const jsonLanguage = CodeMirror.javascript.javascriptLanguage.configure({ top: "SingleExpression" });
      return new CodeMirror.LanguageSupport(jsonLanguage);
    }
    case "php":
      return (await CodeMirror.php()).php();
    case "python":
    case "py":
      return (await CodeMirror.python()).python();
    case "markdown":
    case "md":
      return (await CodeMirror.markdown()).markdown();
    case "sh":
    case "bash":
      return new CodeMirror.LanguageSupport(await CodeMirror.shell());
    case "dart":
      return new CodeMirror.LanguageSupport(await CodeMirror.dart());
    case "angular":
      return (await CodeMirror.angular()).angular();
    case "svelte":
      return (await CodeMirror.svelte()).svelte();
    case "vue":
      return (await CodeMirror.vue()).vue();
    default:
      return CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true });
  }
}
var CodeBlock = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #code = "";
  #codeLang = "";
  #copyTimeout = 1e3;
  #timer;
  #copied = false;
  #editorState;
  #languageConf = new CodeMirror.Compartment();
  /**
   * Whether to display a notice "​​Use code snippets with caution" in code
   * blocks.
   */
  #displayNotice = false;
  #header;
  #showCopyButton = true;
  #citations = [];
  connectedCallback() {
    void this.#render();
  }
  set code(value) {
    this.#code = value;
    this.#editorState = CodeMirror.EditorState.create({
      doc: this.#code,
      extensions: [
        TextEditor.Config.baseConfiguration(this.#code),
        CodeMirror.EditorState.readOnly.of(true),
        CodeMirror.EditorView.lineWrapping,
        this.#languageConf.of(CodeMirror.javascript.javascript())
      ]
    });
    void this.#render();
  }
  get code() {
    return this.#code;
  }
  set codeLang(value) {
    this.#codeLang = value;
    void this.#render();
  }
  set timeout(value) {
    this.#copyTimeout = value;
    void this.#render();
  }
  set displayNotice(value) {
    this.#displayNotice = value;
    void this.#render();
  }
  set header(header) {
    this.#header = header;
    void this.#render();
  }
  set showCopyButton(show) {
    this.#showCopyButton = show;
    void this.#render();
  }
  set citations(citations) {
    this.#citations = citations;
  }
  #onCopy() {
    UI.UIUtils.copyTextToClipboard(this.#code, i18nString(UIStrings.copied));
    this.#copied = true;
    void this.#render();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#copied = false;
      void this.#render();
    }, this.#copyTimeout);
  }
  #renderNotice() {
    return html2`<p class="notice">
      <x-link class="link" href="https://support.google.com/legal/answer/13505487" jslog=${VisualLogging.link("code-disclaimer").track({
      click: true
    })}>
        ${i18nString(UIStrings.disclaimer)}
      </x-link>
    </p>`;
  }
  #renderCopyButton() {
    return html2`
      <div class="copy-button-container">
        <devtools-button
          .data=${{
      variant: "icon",
      size: "SMALL",
      jslogContext: "copy",
      iconName: "copy",
      title: i18nString(UIStrings.copy)
    }}
          @click=${this.#onCopy}
        ></devtools-button>
        ${this.#copied ? html2`<span>${i18nString(UIStrings.copied)}</span>` : Lit.nothing}
      </div>`;
  }
  #maybeRenderCitations() {
    if (!this.#citations.length) {
      return Lit.nothing;
    }
    return html2`
      ${this.#citations.map((citation) => html2`
        <button
          class="citation"
          jslog=${VisualLogging.link("inline-citation").track({ click: true })}
          @click=${citation.clickHandler}
        >[${citation.index}]</button>
      `)}
    `;
  }
  async #render() {
    const header = (this.#header ?? this.#codeLang) || i18nString(UIStrings.code);
    if (!this.#editorState) {
      throw new Error("Unexpected: trying to render the text editor without editorState");
    }
    Lit.render(html2`<div class='codeblock' jslog=${VisualLogging.section("code")}>
      <style>${codeBlock_css_default}</style>
        <div class="editor-wrapper">
        <div class="heading">
          <div class="heading-text-wrapper">
            <h4 class="heading-text">${header}</h4>
            ${this.#maybeRenderCitations()}
          </div>
          ${this.#showCopyButton ? this.#renderCopyButton() : Lit.nothing}
        </div>
        <div class="code">
          <devtools-text-editor .state=${this.#editorState}></devtools-text-editor>
        </div>
      </div>
      ${this.#displayNotice ? this.#renderNotice() : Lit.nothing}
    </div>`, this.#shadow, {
      host: this
    });
    const editor = this.#shadow?.querySelector("devtools-text-editor")?.editor;
    if (!editor) {
      return;
    }
    const language = await languageFromToken(this.#codeLang);
    editor.dispatch({
      effects: this.#languageConf.reconfigure(language)
    });
  }
};
customElements.define("devtools-code-block", CodeBlock);

// gen/front_end/ui/components/markdown_view/MarkdownImage.js
var MarkdownImage_exports = {};
__export(MarkdownImage_exports, {
  MarkdownImage: () => MarkdownImage
});
import "./../icon_button/icon_button.js";
import * as Lit2 from "./../../lit/lit.js";

// gen/front_end/ui/components/markdown_view/markdownImage.css.js
var markdownImage_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.markdown-image {
  display: block;
}

/*# sourceURL=${import.meta.resolve("./markdownImage.css")} */`;

// gen/front_end/ui/components/markdown_view/MarkdownImagesMap.js
var MarkdownImagesMap_exports = {};
__export(MarkdownImagesMap_exports, {
  getMarkdownImage: () => getMarkdownImage,
  markdownImages: () => markdownImages
});
var markdownImages = /* @__PURE__ */ new Map([]);
var getMarkdownImage = (key) => {
  const image = markdownImages.get(key);
  if (!image) {
    throw new Error(`Markdown image with key '${key}' is not available, please check MarkdownImagesMap.ts`);
  }
  return image;
};

// gen/front_end/ui/components/markdown_view/MarkdownImage.js
var { html: html3, Directives: { ifDefined } } = Lit2;
var MarkdownImage = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #imageData;
  #imageTitle;
  set data(data) {
    const { key, title } = data;
    const markdownImage = getMarkdownImage(key);
    this.#imageData = markdownImage;
    this.#imageTitle = title;
    this.#render();
  }
  #getIconComponent() {
    if (!this.#imageData) {
      return Lit2.nothing;
    }
    const { src, color, width = "100%", height = "100%" } = this.#imageData;
    return html3`
      <devtools-icon .data=${{ iconPath: src, color, width, height }}></devtools-icon>
    `;
  }
  #getImageComponent() {
    if (!this.#imageData) {
      return Lit2.nothing;
    }
    const { src, width = "100%", height = "100%" } = this.#imageData;
    return html3`
      <img class="markdown-image" src=${src} alt=${ifDefined(this.#imageTitle)} width=${width} height=${height} />
    `;
  }
  #render() {
    if (!this.#imageData) {
      return;
    }
    const { isIcon } = this.#imageData;
    const imageComponent = isIcon ? this.#getIconComponent() : this.#getImageComponent();
    Lit2.render(html3`
      <style>${markdownImage_css_default}</style>
      ${imageComponent}
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-markdown-image", MarkdownImage);

// gen/front_end/ui/components/markdown_view/MarkdownLink.js
var MarkdownLink_exports = {};
__export(MarkdownLink_exports, {
  MarkdownLink: () => MarkdownLink
});
import "./../../legacy/legacy.js";
import { html as html4, render as render3 } from "./../../lit/lit.js";
import * as VisualLogging2 from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/markdown_view/markdownLink.css.js
var markdownLink_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.devtools-link {
  color: var(--sys-color-primary);
  outline-offset: 2px;
  text-decoration: underline;
}

/*# sourceURL=${import.meta.resolve("./markdownLink.css")} */`;

// gen/front_end/ui/components/markdown_view/MarkdownLinksMap.js
var MarkdownLinksMap_exports = {};
__export(MarkdownLinksMap_exports, {
  getMarkdownLink: () => getMarkdownLink,
  markdownLinks: () => markdownLinks
});
var markdownLinks = /* @__PURE__ */ new Map([
  ["issuesContrastWCAG21AA", "https://www.w3.org/TR/WCAG21/#contrast-minimum"],
  ["issuesContrastWCAG21AAA", "https://www.w3.org/TR/WCAG21/#contrast-enhanced"],
  ["issuesContrastSuggestColor", "https://developers.google.com/web/updates/2020/08/devtools#accessible-color"],
  ["issuesCSPSetStrict", "https://web.dev/strict-csp"],
  [
    "issuesCSPWhyStrictOverAllowlist",
    "https://web.dev/strict-csp/#why-a-strict-csp-is-recommended-over-allowlist-csps"
  ],
  [
    "issueCorsPreflightRequest",
    "https://web.dev/cross-origin-resource-sharing/#preflight-requests-for-complex-http-calls"
  ],
  ["issueQuirksModeDoctype", "https://web.dev/doctype/"],
  ["sameSiteAndSameOrigin", "https://web.dev/same-site-same-origin/"],
  ["punycodeReference", "https://wikipedia.org/wiki/Punycode"],
  // Link URLs for deprecation issues (see blink::Deprecation)
  ["https://xhr.spec.whatwg.org/", "https://xhr.spec.whatwg.org/"],
  ["https://goo.gle/chrome-insecure-origins", "https://goo.gle/chrome-insecure-origins"],
  ["https://webrtc.org/web-apis/chrome/unified-plan/", "https://webrtc.org/web-apis/chrome/unified-plan/"],
  [
    "https://developer.chrome.com/blog/enabling-shared-array-buffer/",
    "https://developer.chrome.com/blog/enabling-shared-array-buffer/"
  ],
  ["https://developer.chrome.com/docs/extensions/mv3/", "https://developer.chrome.com/docs/extensions/mv3/"],
  [
    "https://developer.chrome.com/blog/immutable-document-domain/",
    "https://developer.chrome.com/blog/immutable-document-domain/"
  ],
  [
    "https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md",
    "https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md"
  ],
  [
    "https://developer.chrome.com/docs/extensions/reference/privacy/#property-websites-privacySandboxEnabled",
    "https://developer.chrome.com/docs/extensions/reference/privacy/#property-websites-privacySandboxEnabled"
  ],
  ["PNASecureContextRestrictionFeatureStatus", "https://chromestatus.com/feature/5954091755241472"],
  ["https://w3c.github.io/uievents/#legacy-event-types", "https://w3c.github.io/uievents/#legacy-event-types"],
  ["manageCookiesHelpPage", "https://support.google.com/chrome/answer/95647"],
  ["gracePeriodStagedControlExplainer", "https://developers.google.com/privacy-sandbox/blog/grace-period-opt-out"],
  ["signatureHeader", "https://www.rfc-editor.org/rfc/rfc9421.html#name-the-signature-http-field"],
  ["signatureInputHeader", "https://www.rfc-editor.org/rfc/rfc9421.html#name-the-signature-input-http-fi"],
  ["signatureParameters", "https://www.rfc-editor.org/rfc/rfc9421.html#name-signature-parameters"],
  ["sfDictionary", "https://www.rfc-editor.org/rfc/rfc8941.html#name-dictionaries"],
  ["sfByteSequence", "https://www.rfc-editor.org/rfc/rfc8941.html#name-byte-sequences"],
  ["sfInnerList", "https://www.rfc-editor.org/rfc/rfc8941.html#name-inner-lists"],
  ["componentParameterSf", "https://www.rfc-editor.org/rfc/rfc9421.html#name-strict-serialization-of-htt"],
  ["componentParameterReq", "https://www.rfc-editor.org/rfc/rfc9421.html#content-request-response"],
  [
    "unencodedDigestHeader",
    "https://lpardue.github.io/draft-pardue-http-identity-digest/draft-pardue-httpbis-identity-digest.html"
  ],
  ["storagePartitioningExplainer", "https://developers.google.com/privacy-sandbox/cookies/storage-partitioning"],
  ["storageAccessAPI", "https://developer.mozilla.org/en-US/docs/Web/API/StorageAccessHandle/createObjectURL"]
]);
var getMarkdownLink = (key) => {
  if (/^https:\/\/www\.chromestatus\.com\//.test(key)) {
    return key;
  }
  if (/^https:\/\/developer\.chrome\.com\//.test(key)) {
    return key;
  }
  if (/^https:\/\/developers\.google\.com\//.test(key)) {
    return key;
  }
  if (/^https:\/\/web\.dev\//.test(key)) {
    return key;
  }
  if (/^https:\/\/developer\.mozilla\.org\//.test(key)) {
    return key;
  }
  if (key === "https://philipwalton.com/articles/the-state-of-es5-on-the-web/") {
    return key;
  }
  const link4 = markdownLinks.get(key);
  if (!link4) {
    throw new Error(`Markdown link with key '${key}' is not available, please check MarkdownLinksMap.ts`);
  }
  return link4;
};

// gen/front_end/ui/components/markdown_view/MarkdownLink.js
var MarkdownLink = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #linkText = "";
  #linkUrl = "";
  set data(data) {
    const { key, title } = data;
    const markdownLink = getMarkdownLink(key);
    this.#linkText = title;
    this.#linkUrl = markdownLink;
    this.#render();
  }
  #render() {
    const output = html4`
      <style>${markdownLink_css_default}</style>
      <x-link class="devtools-link" href=${this.#linkUrl} jslog=${VisualLogging2.link().track({ click: true })}
      >${this.#linkText}</x-link>`;
    render3(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-markdown-link", MarkdownLink);

// gen/front_end/ui/components/markdown_view/MarkdownView.js
var MarkdownView_exports = {};
__export(MarkdownView_exports, {
  MarkdownInsightRenderer: () => MarkdownInsightRenderer,
  MarkdownLitRenderer: () => MarkdownLitRenderer,
  MarkdownView: () => MarkdownView
});
import * as Lit3 from "./../../lit/lit.js";
import * as VisualLogging3 from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/markdown_view/markdownView.css.js
var markdownView_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  --code-background-color: var(--sys-color-surface4);
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes expand {
  from { height: 0; }
  to { height: auto; }
}

.animating {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 0.4s steps(40, end);
}

devtools-code-block.animating {
  animation: expand 0.1s linear;
}

.pending {
  display: none !important; /* stylelint-disable-line declaration-no-important */
}

.message {
  line-height: 18px;
  font-size: 12px;
  color: var(--sys-color-on-surface);
  user-select: text;
}

.message p {
  margin: 0;
}

.message p:not(:first-child) {
  margin-block-start: 2px;
}

.message p:not(:last-child) {
  margin-bottom: 10px;
}

.message ul {
  list-style-type: none;
  padding-inline-start: var(--sys-size-8);
}

.message ul ul {
  padding-inline-start: 19px;
}

.message li {
  margin-top: 8px;
  display: list-item;
  list-style-type: disc;
}

.message code {
  color: var(--sys-color-on-surface);
  font-family: var(--monospace-font-family);
  font-size: 11px;
  user-select: text;
  cursor: text;
  /* This is still using design tokens because \\'--code-background-color\\' is defined with them by default */
  /* stylelint-disable-next-line plugin/use_theme_colors */
  background-color: var(--code-background-color);
  border-radius: 2px;
  padding: 1px 3px;
}

devtools-code-block {
  margin-bottom: var(--sys-size-5);
}

.citation {
  text-decoration: underline;
  color: var(--sys-color-primary);
  background-color: transparent;
  cursor: pointer;
  outline-offset: var(--sys-size-2);
  border: none;
  padding: 0;
  font-size: 10px;
  font-family: var(--default-font-family);
}

h1.insight, h2.insight, h3.insight, h4.insight, h5.insight, h6.insight {
  font: var(--sys-typescale-body4-bold);
  margin: var(--sys-size-1) 0 10px;
}

/*# sourceURL=${import.meta.resolve("./markdownView.css")} */`;

// gen/front_end/ui/components/markdown_view/MarkdownView.js
var html6 = Lit3.html;
var render5 = Lit3.render;
var MarkdownView = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #tokenData = [];
  #renderer = new MarkdownLitRenderer();
  #animationEnabled = false;
  #isAnimating = false;
  set data(data) {
    this.#tokenData = data.tokens;
    if (data.renderer) {
      this.#renderer = data.renderer;
    }
    if (data.animationEnabled) {
      this.#animationEnabled = true;
      this.#renderer.addCustomClasses({
        paragraph: "pending",
        heading: "pending",
        list_item: "pending",
        code: "pending"
      });
    } else {
      this.#finishAnimations();
    }
    this.#update();
  }
  #finishAnimations() {
    const animatingElements = this.#shadow.querySelectorAll(".animating");
    for (const element of animatingElements) {
      element.classList.remove("animating");
    }
    const pendingElements = this.#shadow.querySelectorAll(".pending");
    for (const element of pendingElements) {
      element.classList.remove("pending");
    }
    this.#isAnimating = false;
    this.#animationEnabled = false;
    this.#renderer.removeCustomClasses({
      paragraph: "pending",
      heading: "pending",
      list_item: "pending",
      code: "pending"
    });
  }
  #animate() {
    if (this.#isAnimating) {
      return;
    }
    this.#isAnimating = true;
    const reveal = () => {
      const pendingElement = this.#shadow.querySelector(".pending");
      if (!pendingElement) {
        this.#isAnimating = false;
        return;
      }
      pendingElement.addEventListener("animationend", () => {
        pendingElement.classList.remove("animating");
        reveal();
      }, { once: true });
      pendingElement.classList.remove("pending");
      pendingElement.classList.add("animating");
    };
    reveal();
  }
  #update() {
    this.#render();
    if (this.#animationEnabled) {
      this.#animate();
    }
  }
  #render() {
    render5(html6`
      <style>${markdownView_css_default}</style>
      <div class='message'>
        ${this.#tokenData.map((token) => this.#renderer.renderToken(token))}
      </div>
    `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-markdown-view", MarkdownView);
var MarkdownLitRenderer = class {
  #customClasses = {};
  addCustomClasses(customClasses) {
    for (const [type, className] of Object.entries(customClasses)) {
      if (!this.#customClasses[type]) {
        this.#customClasses[type] = /* @__PURE__ */ new Set();
      }
      this.#customClasses[type].add(className);
    }
  }
  removeCustomClasses(customClasses) {
    for (const [type, className] of Object.entries(customClasses)) {
      if (this.#customClasses[type]) {
        this.#customClasses[type].delete(className);
      }
    }
  }
  customClassMapForToken(type) {
    const classNames = this.#customClasses[type] || /* @__PURE__ */ new Set();
    const classInfo = Object.fromEntries([...classNames].map((className) => [className, true]));
    return Lit3.Directives.classMap(classInfo);
  }
  renderChildTokens(token) {
    if ("tokens" in token && token.tokens) {
      return token.tokens.map((token2) => this.renderToken(token2));
    }
    throw new Error("Tokens not found");
  }
  /**
   * Unescape will get rid of the escaping done by Marked to avoid double escaping due to escaping it also with lit.
   * Table taken from: front_end/third_party/marked/package/src/helpers.js
   */
  unescape(text) {
    const escapeReplacements = /* @__PURE__ */ new Map([
      ["&amp;", "&"],
      ["&lt;", "<"],
      ["&gt;", ">"],
      ["&quot;", '"'],
      ["&#39;", "'"]
    ]);
    return text.replace(/&(amp|lt|gt|quot|#39);/g, (matchedString) => {
      const replacement = escapeReplacements.get(matchedString);
      return replacement ? replacement : matchedString;
    });
  }
  renderText(token) {
    if ("tokens" in token && token.tokens) {
      return html6`${this.renderChildTokens(token)}`;
    }
    return html6`${this.unescape("text" in token ? token.text : "")}`;
  }
  renderHeading(heading) {
    const customClass = this.customClassMapForToken("heading");
    switch (heading.depth) {
      case 1:
        return html6`<h1 class=${customClass}>${this.renderText(heading)}</h1>`;
      case 2:
        return html6`<h2 class=${customClass}>${this.renderText(heading)}</h2>`;
      case 3:
        return html6`<h3 class=${customClass}>${this.renderText(heading)}</h3>`;
      case 4:
        return html6`<h4 class=${customClass}>${this.renderText(heading)}</h4>`;
      case 5:
        return html6`<h5 class=${customClass}>${this.renderText(heading)}</h5>`;
      default:
        return html6`<h6 class=${customClass}>${this.renderText(heading)}</h6>`;
    }
  }
  renderCodeBlock(token) {
    return html6`<devtools-code-block
      class=${this.customClassMapForToken("code")}
      .code=${this.unescape(token.text)}
      .codeLang=${token.lang || ""}>
    </devtools-code-block>`;
  }
  templateForToken(token) {
    switch (token.type) {
      case "paragraph":
        return html6`<p class=${this.customClassMapForToken("paragraph")}>${this.renderChildTokens(token)}</p>`;
      case "list":
        return html6`<ul class=${this.customClassMapForToken("list")}>${token.items.map((token2) => {
          return this.renderToken(token2);
        })}</ul>`;
      case "list_item":
        return html6`<li class=${this.customClassMapForToken("list_item")}>${this.renderChildTokens(token)}</li>`;
      case "text":
        return this.renderText(token);
      case "codespan":
        return html6`<code class=${this.customClassMapForToken("codespan")}>${this.unescape(token.text)}</code>`;
      case "code":
        return this.renderCodeBlock(token);
      case "space":
        return Lit3.nothing;
      case "link":
        return html6`<devtools-markdown-link
        class=${this.customClassMapForToken("link")}
        .data=${{
          key: token.href,
          title: token.text
        }}></devtools-markdown-link>`;
      case "image":
        return html6`<devtools-markdown-image
        class=${this.customClassMapForToken("image")}
        .data=${{
          key: token.href,
          title: token.text
        }}></devtools-markdown-image>`;
      case "heading":
        return this.renderHeading(token);
      case "strong":
        return html6`<strong class=${this.customClassMapForToken("strong")}>${this.renderText(token)}</strong>`;
      case "em":
        return html6`<em class=${this.customClassMapForToken("em")}>${this.renderText(token)}</em>`;
      default:
        return null;
    }
  }
  renderToken(token) {
    const template = this.templateForToken(token);
    if (template === null) {
      throw new Error(`Markdown token type '${token.type}' not supported.`);
    }
    return template;
  }
};
var MarkdownInsightRenderer = class extends MarkdownLitRenderer {
  #citationClickHandler;
  constructor(citationClickHandler) {
    super();
    this.#citationClickHandler = citationClickHandler || (() => {
    });
    this.addCustomClasses({ heading: "insight" });
  }
  renderToken(token) {
    const template = this.templateForToken(token);
    if (template === null) {
      return html6`${token.raw}`;
    }
    return template;
  }
  sanitizeUrl(maybeUrl) {
    try {
      const url = new URL(maybeUrl);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.toString();
      }
      return null;
    } catch {
      return null;
    }
  }
  detectCodeLanguage(token) {
    if (token.lang) {
      return token.lang;
    }
    if (/^(\.|#)?[\w:\[\]="'-\.]+ ?{/m.test(token.text) || /^@import/.test(token.text)) {
      return "css";
    }
    if (/^(var|const|let|function|async|import)\s/.test(token.text)) {
      return "js";
    }
    return "";
  }
  templateForToken(token) {
    switch (token.type) {
      case "heading":
        return this.renderHeading(token);
      case "link":
      case "image": {
        const sanitizedUrl = this.sanitizeUrl(token.href);
        if (!sanitizedUrl) {
          return null;
        }
        return html6`${token.text ?? token.href}`;
      }
      case "code":
        return html6`<devtools-code-block
          class=${this.customClassMapForToken("code")}
          .code=${this.unescape(token.text)}
          .codeLang=${this.detectCodeLanguage(token)}
          .citations=${token.citations || []}
          .displayNotice=${true}>
        </devtools-code-block>`;
      case "citation":
        return html6`<sup><button
            class="citation"
            jslog=${VisualLogging3.link("inline-citation").track({ click: true })}
            @click=${this.#citationClickHandler.bind(this, Number(token.linkText))}
          >[${token.linkText}]</button></sup>`;
    }
    return super.templateForToken(token);
  }
};
export {
  CodeBlock_exports as CodeBlock,
  MarkdownImage_exports as MarkdownImage,
  MarkdownImagesMap_exports as MarkdownImagesMap,
  MarkdownLink_exports as MarkdownLink,
  MarkdownLinksMap_exports as MarkdownLinksMap,
  MarkdownView_exports as MarkdownView
};
//# sourceMappingURL=markdown_view.js.map
