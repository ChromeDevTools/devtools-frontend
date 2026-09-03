// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  #expanded = false;
  private cachedContent?: unknown|ObjectTree;
  private headerJsonML?: unknown;
  private readonly view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.view = view;
  }

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
    this.#expanded = false;
    this.parseHeader();
    // CustomPreviewComponent is used synchronously by ConsoleViewMessage. We must render synchronously
    // so ConsoleViewport can measure the true row height upon insertion.
    this.performUpdate();
  }

  get expanded(): boolean {
    return this.#expanded;
  }

  set expanded(expanded: boolean) {
    if (this.#expanded === expanded) {
      return;
    }
    this.#expanded = expanded;
    if (this.#expanded && !this.cachedContent) {
      void this.loadBody();
    }
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

  override performUpdate(): void {
    this.view({
      object: this.#object,
      headerJsonML: this.headerJsonML,
      expanded: this.#expanded,
      cachedContent: this.cachedContent,
      toggleExpanded: this.toggleExpanded,
    },
              undefined, this.contentElement);
  }
  private toggleExpanded = (): void => {
    this.expanded = !this.expanded;
  };

  private async loadBody(): Promise<void> {
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

    this.performUpdate();
  }
}

const ALLOWED_TAGS = ['span', 'div', 'ol', 'li', 'table', 'tr', 'td'];

export interface ViewInput {
  object?: SDK.RemoteObject.RemoteObject;
  headerJsonML?: unknown;
  expanded: boolean;
  cachedContent?: unknown|ObjectTree|null;
  toggleExpanded: () => void;
}

const remoteObjectCache = new WeakMap<object, SDK.RemoteObject.RemoteObject>();

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  const renderJSONMLTag = (object: SDK.RemoteObject.RemoteObject, jsonML: unknown): LitTemplate => {
    if (!Array.isArray(jsonML)) {
      return html`${String(jsonML)}`;
    }

    if (jsonML[0] !== 'object') {
      return renderElement(object, jsonML);
    }
    if (jsonML.length !== 2) {
      Common.Console.Console.instance().error('Broken formatter: object reference must contain exactly two elements');
      return html`<span></span>`;
    }
    return layoutObjectTag(object, jsonML);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderElement = (object: SDK.RemoteObject.RemoteObject, jsonML: any[]): LitTemplate => {
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
      children.push(renderJSONMLTag(object, next.value));
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
  };

  const layoutObjectTag = (object: SDK.RemoteObject.RemoteObject, objectTag: unknown[]): LitTemplate => {
    const it = objectTag[Symbol.iterator]();
    it.next();  // skip 'object'
    const attributes = it.next().value as Protocol.Runtime.RemoteObject;
    let remoteObject =
        typeof attributes === 'object' && attributes !== null ? remoteObjectCache.get(attributes) : undefined;
    if (!remoteObject) {
      remoteObject = object.runtimeModel().createRemoteObject(attributes);
      if (typeof attributes === 'object' && attributes !== null) {
        remoteObjectCache.set(attributes, remoteObject);
      }
    }
    if (remoteObject.customPreview()) {
      return html`${UI.Widget.widget(CustomPreviewSection, {object: remoteObject})}`;
    }

    return defaultObjectPresentation(remoteObject, undefined, undefined, undefined,
                                     {'custom-expandable-section-standard-section': remoteObject.hasChildren});
  };

  const onClick = (event: Event): void => {
    event.consume(true);
    input.toggleExpanded();
  };

  const object = input.object;
  const customPreview = object?.customPreview();
  if (!object || !customPreview || !input.headerJsonML) {
    render(nothing, target);
    return;
  }

  const headerTemplate = renderJSONMLTag(object, input.headerJsonML);
  if (customPreview.bodyGetterId) {
    let bodyContent: LitTemplate|Node|undefined;
    if (input.cachedContent instanceof ObjectTree) {
      bodyContent = html`<devtools-widget class="custom-expandable-section-default-body" ${
          UI.Widget.widget(ObjectPropertiesSectionWidget, {
            objectTree: input.cachedContent,
            showOverflow: false,
          })}></devtools-widget>`;
    } else if (input.cachedContent) {
      bodyContent = renderJSONMLTag(object, input.cachedContent);
    }

    render(html`
      <span class=${Directives.classMap({'custom-expandable-section-header': true,
                                         expanded: input.expanded})} @click=${onClick}>
        <devtools-icon name=${
               input.expanded ? 'triangle-down' : 'triangle-right'} class="custom-expand-icon"></devtools-icon>
        ${headerTemplate}
      </span>
      ${
               bodyContent ?
                   html`<span class="custom-expandable-section-body" ?hidden=${!input.expanded}>${bodyContent}</span>` :
                   nothing}
    `,
           target, {container: {classes: ['custom-expandable-section']}});
  } else {
    render(html`${headerTemplate}`, target, {container: {classes: ['custom-expandable-section']}});
  }
};

export type View = typeof DEFAULT_VIEW;

export interface CustomPreviewComponentViewInput {
  object?: SDK.RemoteObject.RemoteObject;
  expanded: boolean;
  disassembled: boolean;
  onContextMenu: (event: Event) => void;
}

export const CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW =
    (input: CustomPreviewComponentViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
      if (!input.object) {
        render(nothing, target);
        return;
      }
      render(html`<style>${customPreviewComponentStyles}</style>${
                 input.disassembled ?
                     defaultObjectPresentation(input.object) :
                     UI.Widget.widget(CustomPreviewSection, {object: input.object, expanded: input.expanded})}`,
             target, {
               container: {
                 classes: ['source-code'],
                 listeners: {contextmenu: input.onContextMenu},
               },
             });
    };

export type CustomPreviewComponentView = typeof CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW;

export class CustomPreviewComponent extends UI.Widget.Widget<DocumentFragment> {
  #object?: SDK.RemoteObject.RemoteObject;
  #expanded = false;
  #disassembled = false;
  readonly #view: CustomPreviewComponentView;

  constructor(element?: HTMLElement, view: CustomPreviewComponentView = CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
    this.#view = view;
  }

  get object(): SDK.RemoteObject.RemoteObject|undefined {
    return this.#object;
  }

  set object(object: SDK.RemoteObject.RemoteObject|undefined) {
    if (this.#object === object) {
      return;
    }
    this.#object = object;
    this.#disassembled = false;
    this.performUpdate();
  }

  get expanded(): boolean {
    return this.#expanded;
  }

  set expanded(expanded: boolean) {
    if (this.#expanded === expanded) {
      return;
    }
    this.#expanded = expanded;
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({
      object: this.#object,
      expanded: this.#expanded,
      disassembled: this.#disassembled,
      onContextMenu: this.#onContextMenu,
    },
               undefined, this.contentElement);
  }

  #onContextMenu = (event: Event): void => {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (!this.#disassembled) {
      contextMenu.revealSection().appendItem(i18nString(UIStrings.showAsJavascriptObject), this.#disassemble.bind(this),
                                             {jslogContext: 'show-as-javascript-object'});
    }
    if (this.#object) {
      contextMenu.appendApplicableItems(this.#object);
    }
    void contextMenu.show();
  };

  #disassemble(): void {
    this.#disassembled = true;
    this.requestUpdate();
  }
}
