// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {
  type StringMatch,
  StringMatcher,
  type URLMatch,
  URLMatcher,
} from './PropertyMatchers.js';
import {unescapeCssString} from './StylesSidebarPane.js';

const UIStrings = {
  /**
   *@description Text that is announced by the screen reader when the user focuses on an input field for entering the name of a CSS property in the Styles panel
   *@example {margin} PH1
   */
  cssPropertyName: '`CSS` property name: {PH1}',
  /**
   *@description Text that is announced by the screen reader when the user focuses on an input field for entering the value of a CSS property in the Styles panel
   *@example {10px} PH1
   */
  cssPropertyValue: '`CSS` property value: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/PropertyRenderer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function mergeWithSpacing(nodes: Node[], merge: Node[]): Node[] {
  const result = [...nodes];
  if (SDK.CSSPropertyParser.requiresSpace(nodes, merge)) {
    result.push(document.createTextNode(' '));
  }
  result.push(...merge);
  return result;
}

export interface MatchRenderer<MatchT extends SDK.CSSPropertyParser.Match> {
  matcher(): SDK.CSSPropertyParser.Matcher<MatchT>;
  render(match: MatchT, context: RenderingContext): Node[];
}

export class RenderingContext {
  constructor(
      readonly ast: SDK.CSSPropertyParser.SyntaxTree,
      readonly renderers:
          Map<SDK.CSSPropertyParser.Constructor<SDK.CSSPropertyParser.Match>,
              MatchRenderer<SDK.CSSPropertyParser.Match>>,
      readonly matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching,
      readonly cssControls?: SDK.CSSPropertyParser.CSSControlMap,
      readonly options: {readonly: boolean} = {readonly: false}) {
  }
  addControl(cssType: string, control: HTMLElement): void {
    if (this.cssControls) {
      const controls = this.cssControls.get(cssType);
      if (!controls) {
        this.cssControls.set(cssType, [control]);
      } else {
        controls.push(control);
      }
    }
  }
}

export class Renderer extends SDK.CSSPropertyParser.TreeWalker {
  readonly #matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching;
  #output: Node[] = [];
  readonly #context: RenderingContext;

  constructor(
      ast: SDK.CSSPropertyParser.SyntaxTree,
      renderers:
          Map<SDK.CSSPropertyParser.Constructor<SDK.CSSPropertyParser.Match>,
              MatchRenderer<SDK.CSSPropertyParser.Match>>,
      matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching, cssControls: SDK.CSSPropertyParser.CSSControlMap,
      options: {
        readonly: boolean,
      }) {
    super(ast);
    this.#matchedResult = matchedResult;
    this.#context = new RenderingContext(this.ast, renderers, this.#matchedResult, cssControls, options);
  }

  static render(nodeOrNodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext):
      {nodes: Node[], cssControls: SDK.CSSPropertyParser.CSSControlMap} {
    if (!Array.isArray(nodeOrNodes)) {
      return this.render([nodeOrNodes], context);
    }
    const cssControls = new SDK.CSSPropertyParser.CSSControlMap();
    const renderers = nodeOrNodes.map(
        node => this.walkExcludingSuccessors(
            context.ast.subtree(node), context.renderers, context.matchedResult, cssControls, context.options));
    const nodes = renderers.map(node => node.#output).reduce(mergeWithSpacing);
    return {nodes, cssControls};
  }

  static renderInto(
      nodeOrNodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext,
      parent: Node): {nodes: Node[], cssControls: SDK.CSSPropertyParser.CSSControlMap} {
    const {nodes, cssControls} = this.render(nodeOrNodes, context);
    if (parent.lastChild && SDK.CSSPropertyParser.requiresSpace([parent.lastChild], nodes)) {
      parent.appendChild(document.createTextNode(' '));
    }
    nodes.map(n => parent.appendChild(n));
    return {nodes, cssControls};
  }

  renderedMatchForTest(_nodes: Node[], _match: SDK.CSSPropertyParser.Match): void {
  }

  protected override enter({node}: SDK.CSSPropertyParser.SyntaxNodeRef): boolean {
    const match = this.#matchedResult.getMatch(node);
    const renderer = match &&
        this.#context.renderers.get(
            match.constructor as SDK.CSSPropertyParser.Constructor<SDK.CSSPropertyParser.Match>);
    if (renderer || match instanceof SDK.CSSPropertyParser.TextMatch) {
      const output =
          renderer ? renderer.render(match, this.#context) : (match as SDK.CSSPropertyParser.TextMatch).render();
      this.renderedMatchForTest(output, match);
      this.#output = mergeWithSpacing(this.#output, output);
      return false;
    }

    return true;
  }

  static renderNameElement(name: string): HTMLElement {
    const nameElement = document.createElement('span');
    nameElement.setAttribute(
        'jslog', `${VisualLogging.key().track({
          change: true,
          keydown: 'ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape',
        })}`);
    UI.ARIAUtils.setLabel(nameElement, i18nString(UIStrings.cssPropertyName, {PH1: name}));
    nameElement.className = 'webkit-css-property';
    nameElement.textContent = name;
    nameElement.normalize();
    return nameElement;
  }

  // This function renders a property value as HTML, customizing the presentation with a set of given AST matchers. This
  // comprises the following steps:
  // 1. Build an AST of the property.
  // 2. Apply tree matchers during bottom up traversal.
  // 3. Render the value from left to right into HTML, deferring rendering of matched subtrees to the matchers
  //
  // More general, longer matches take precedence over shorter, more specific matches. Whitespaces are normalized, for
  // unmatched text and around rendered matching results.
  static renderValueElement(
      propertyName: string, propertyValue: string,
      renderers: MatchRenderer<SDK.CSSPropertyParser.Match>[]): HTMLElement {
    const valueElement = document.createElement('span');
    valueElement.setAttribute(
        'jslog', `${VisualLogging.value().track({
          change: true,
          keydown: 'ArrowLeft|ArrowUp|PageUp|Home|PageDown|ArrowRight|ArrowDown|End|Space|Tab|Enter|Escape',
        })}`);
    UI.ARIAUtils.setLabel(valueElement, i18nString(UIStrings.cssPropertyValue, {PH1: propertyValue}));
    valueElement.className = 'value';

    const ast = SDK.CSSPropertyParser.tokenizeDeclaration(propertyName, propertyValue);
    if (!ast) {
      valueElement.appendChild(document.createTextNode(propertyValue));
      return valueElement;
    }
    const matchers = [];
    const rendererMap = new Map<
        SDK.CSSPropertyParser.Constructor<SDK.CSSPropertyParser.Match>, MatchRenderer<SDK.CSSPropertyParser.Match>>();
    for (const renderer of renderers) {
      const matcher = renderer.matcher();
      matchers.push(matcher);
      rendererMap.set(matcher.matchType, renderer);
    }
    const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, matchers);
    ast.trailingNodes.forEach(n => matchedResult.matchText(n));
    const context = new RenderingContext(ast, rendererMap, matchedResult);
    Renderer.render([ast.tree, ...ast.trailingNodes], context).nodes.forEach(node => valueElement.appendChild(node));
    valueElement.normalize();
    return valueElement;
  }
}
export class URLRenderer implements MatchRenderer<URLMatch> {
  constructor(private readonly rule: SDK.CSSRule.CSSRule|null, private readonly node: SDK.DOMModel.DOMNode|null) {
  }
  render(match: URLMatch): Node[] {
    const url = unescapeCssString(match.url) as Platform.DevToolsPath.UrlString;
    const container = document.createDocumentFragment();
    UI.UIUtils.createTextChild(container, 'url(');
    let hrefUrl: Platform.DevToolsPath.UrlString|null = null;
    if (this.rule && this.rule.resourceURL()) {
      hrefUrl = Common.ParsedURL.ParsedURL.completeURL(this.rule.resourceURL(), url);
    } else if (this.node) {
      hrefUrl = this.node.resolveURL(url);
    }
    const link = ImagePreviewPopover.setImageUrl(
        Components.Linkifier.Linkifier.linkifyURL(hrefUrl || url, {
          text: url,
          preventClick: false,
          // crbug.com/1027168
          // We rely on CSS text-overflow: ellipsis to hide long URLs in the Style panel,
          // so that we don't have to keep two versions (original vs. trimmed) of URL
          // at the same time, which complicates both StylesSidebarPane and StylePropertyTreeElement.
          bypassURLTrimming: true,
          showColumnNumber: false,
          inlineFrameIndex: 0,
        }),
        hrefUrl || url);
    container.appendChild(link);
    UI.UIUtils.createTextChild(container, ')');
    return [container];
  }

  matcher(): URLMatcher {
    return new URLMatcher();
  }
}

export class StringRenderer implements MatchRenderer<StringMatch> {
  render(match: StringMatch): Node[] {
    const element = document.createElement('span');
    element.innerText = match.text;
    UI.Tooltip.Tooltip.install(element, unescapeCssString(match.text));
    return [element];
  }

  matcher(): StringMatcher {
    return new StringMatcher();
  }
}
