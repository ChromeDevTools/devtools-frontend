// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../../lit/lit.js';
import * as UI from '../../legacy.js';

import {sanitizeStyle} from './CSSStyleSanitizer.js';
import customPreviewComponentStyles from './customPreviewComponent.css.js';
import {
  defaultObjectPresentation,
  ObjectPropertiesMode,
  ObjectPropertiesSectionWidget,
  ObjectTree,
} from './ObjectPropertiesSection.js';

const {widget} = UI.Widget;
const UIStrings = {
  /**
   * @description Context menu item to show a custom formatted object as a standard JavaScript object.
   */
  showAsJavascriptObject: 'Show as JavaScript object',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/object_ui/CustomPreviewComponent.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CustomPreviewSection extends UI.Widget.Widget {
  #object?: SDK.RemoteObject.RemoteObject;
  private expanded = false;
  private cachedContent?: unknown|ObjectTree;
  private headerJsonML?: unknown;

  get object(): SDK.RemoteObject.RemoteObject|undefined {
    return this.#object;
  }

  set object(object: SDK.RemoteObject.RemoteObject|undefined) {
    if (this.#object === object) {
      return;
    }
    this.#object = object;
    this.headerJsonML = undefined;
    this.cachedContent = undefined;
    this.expanded = false;
    this.parseHeader();
    this.performUpdate();
  }

  private parseHeader(): void {
    const customPreview = this.#object?.customPreview();
    if (!customPreview) {
      return;
    }

    try {
      this.headerJsonML = JSON.parse(customPreview.header);
    } catch (e) {
      Common.Console.Console.instance().error('Broken formatter: header is invalid json ' + e);
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#object) {
      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(nothing, this.contentElement);
      return;
    }
    this.render(this.#object);
  }

  private render(object: SDK.RemoteObject.RemoteObject): void {
    const customPreview = object.customPreview();
    if (!customPreview || !this.headerJsonML) {
      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(nothing, this.contentElement);
      return;
    }

    const headerTemplate = this.renderJSONMLTag(object, this.headerJsonML);
    if (customPreview.bodyGetterId) {
      let bodyContent: LitTemplate|Node|undefined;
      if (this.cachedContent instanceof ObjectTree) {
        bodyContent = html`<devtools-widget class="custom-expandable-section-default-body" ${
            widget(ObjectPropertiesSectionWidget, {
              objectTree: this.cachedContent,
              showOverflow: false,
            })}></devtools-widget>`;
      } else if (this.cachedContent !== undefined) {
        bodyContent = this.renderJSONMLTag(object, this.cachedContent);
      }

      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(
          html`
        <span class=${
              Directives.classMap({'custom-expandable-section-header': true,
                                   expanded: this.expanded})} @click=${(event: Event) => this.onClick(event)}>
          <devtools-icon name=${
              this.expanded ? 'triangle-down' : 'triangle-right'} class="custom-expand-icon"></devtools-icon>
          ${headerTemplate}
        </span>
        ${
              bodyContent ?
                  html`<span class="custom-expandable-section-body" ?hidden=${!this.expanded}>${bodyContent}</span>` :
                  nothing}
      `,
          this.contentElement, {container: {classes: ['custom-expandable-section']}});
    } else {
      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(html`${headerTemplate}`, this.contentElement, {container: {classes: ['custom-expandable-section']}});
    }
  }

  private renderJSONMLTag(object: SDK.RemoteObject.RemoteObject, jsonML: unknown): LitTemplate {
    if (!Array.isArray(jsonML)) {
      return html`${String(jsonML)}`;
    }

    if (jsonML[0] !== 'object') {
      return this.renderElement(object, jsonML);
    }
    if (jsonML.length !== 2) {
      Common.Console.Console.instance().error('Broken formatter: object reference must contain exactly two elements');
      return html`<span></span>`;
    }
    return this.layoutObjectTag(object, jsonML);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderElement(object: SDK.RemoteObject.RemoteObject, jsonML: any[]): LitTemplate {
    const it = jsonML[Symbol.iterator]();
    const tagName = it.next().value as string;
    if (!ALLOWED_TAGS.includes(tagName)) {
      Common.Console.Console.instance().error('Broken formatter: element ' + tagName + ' is not allowed!');
      return html`<span></span>`;
    }

    let next = it.next();
    const stylePropertyMap: Record<string, string> = {};
    if (typeof next.value === 'object' && !Array.isArray(next.value) && next.value !== null) {
      const attributes = next.value as Record<string, string>;
      for (const key in attributes) {
        const value = attributes[key];
        if ((key !== 'style') || (typeof value !== 'string')) {
          continue;
        }

        const sanitizedStyle = new Map<string, {value: string, priority: string}>();
        sanitizeStyle(sanitizedStyle, value);
        for (const [property, {value: propertyValue, priority}] of sanitizedStyle) {
          stylePropertyMap[property] = priority ? `${propertyValue} !${priority}` : propertyValue;
        }
      }
      next = it.next();
    }

    const children: LitTemplate[] = [];
    while (!next.done) {
      children.push(this.renderJSONMLTag(object, next.value));
      next = it.next();
    }
    const style = Directives.styleMap(stylePropertyMap);

    switch (tagName) {
      case 'span':
        return html`<span style=${style}>${children}</span>`;
      case 'div':
        return html`<div style=${style}>${children}</div>`;
      case 'ol':
        return html`<ol style=${style}>${children}</ol>`;
      case 'li':
        return html`<li style=${style}>${children}</li>`;
      case 'table':
        return html`<table style=${style}>${children}</table>`;
      case 'tr':
        return html`<tr style=${style}>${children}</tr>`;
      case 'td':
        return html`<td style=${style}>${children}</td>`;
      default:
        return html`<span>${children}</span>`;
    }
  }

  private layoutObjectTag(object: SDK.RemoteObject.RemoteObject, objectTag: unknown[]): LitTemplate {
    const it = objectTag[Symbol.iterator]();
    it.next();  // skip 'object'
    const attributes = it.next().value;
    const remoteObject = object.runtimeModel().createRemoteObject((attributes as Protocol.Runtime.RemoteObject));
    if (remoteObject.customPreview()) {
      return html`${UI.Widget.widget(CustomPreviewSection, {object: remoteObject})}`;
    }

    return defaultObjectPresentation(remoteObject, undefined, undefined, undefined,
                                     {'custom-expandable-section-standard-section': remoteObject.hasChildren});
  }

  private onClick = (event: Event): void => {
    event.consume(true);
    if (this.cachedContent !== undefined) {
      this.toggleExpand();
    } else {
      void this.loadBody();
    }
  };

  private toggleExpand(): void {
    this.expanded = !this.expanded;
    this.performUpdate();
  }

  async loadBody(): Promise<void> {
    const customPreview = this.#object?.customPreview();
    if (!this.#object || !customPreview?.bodyGetterId) {
      return;
    }

    const bodyJsonML =
        await this.#object.callFunctionJSON(bodyGetter => bodyGetter(), [{objectId: customPreview.bodyGetterId}]);
    if (bodyJsonML === null) {
      // Per https://firefox-source-docs.mozilla.org/devtools-user/custom_formatters/index.html#custom-formatter-structure
      // we are supposed to fall back to the default format when the `body()` callback returns `null`.
      const objectTree = new ObjectTree(this.#object, {
        readOnly: true,
        propertiesMode: ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
      });
      objectTree.expanded = true;
      this.cachedContent = objectTree;
    } else {
      this.cachedContent = bodyJsonML;
    }

    this.expanded = true;
    this.performUpdate();
  }
}

const ALLOWED_TAGS = ['span', 'div', 'ol', 'li', 'table', 'tr', 'td'];

export class CustomPreviewComponent {
  private readonly object: SDK.RemoteObject.RemoteObject;
  private customPreviewSection: CustomPreviewSection|null;
  element: HTMLSpanElement;
  constructor(object: SDK.RemoteObject.RemoteObject) {
    this.object = object;
    this.customPreviewSection = new CustomPreviewSection();
    this.customPreviewSection.object = object;
    this.element = document.createElement('span');
    this.element.classList.add('source-code');
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(this.element, {cssFile: customPreviewComponentStyles});
    this.element.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
    this.customPreviewSection.show(shadowRoot, undefined, /* suppressOrphanWidgetError= */ true);
  }

  async expandIfPossible(): Promise<void> {
    const customPreview = this.object.customPreview();
    if (customPreview && customPreview.bodyGetterId && this.customPreviewSection) {
      await this.customPreviewSection.loadBody();
    }
  }

  private contextMenuEventFired(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (this.customPreviewSection) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showAsJavascriptObject), this.disassemble.bind(this),
                                             {jslogContext: 'show-as-javascript-object'});
    }
    contextMenu.appendApplicableItems(this.object);
    void contextMenu.show();
  }

  private disassemble(): void {
    if (this.element.shadowRoot) {
      if (this.customPreviewSection) {
        this.customPreviewSection.detach();
        this.customPreviewSection = null;
      }
      this.element.shadowRoot.textContent = '';
      // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
      render(defaultObjectPresentation(this.object), this.element.shadowRoot);
    }
  }
}
