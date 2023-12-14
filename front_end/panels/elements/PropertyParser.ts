// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

const cssParser = CodeMirror.css.cssLanguage.parser;

export class SyntaxTree {
  readonly propertyValue: string;
  readonly rule: string;
  readonly tree: CodeMirror.SyntaxNode;
  readonly trailingNodes: CodeMirror.SyntaxNode[];
  constructor(
      propertyValue: string, rule: string, tree: CodeMirror.SyntaxNode, trailingNodes: CodeMirror.SyntaxNode[] = []) {
    this.propertyValue = propertyValue;
    this.rule = rule;
    this.tree = tree;
    this.trailingNodes = trailingNodes;
  }

  text(node?: CodeMirror.SyntaxNode): string {
    if (!node) {
      node = this.tree;
    }
    return this.rule.substring(node.from, node.to);
  }

  subtree(node: CodeMirror.SyntaxNode): SyntaxTree {
    return new SyntaxTree(this.propertyValue, this.rule, node);
  }
}

export interface SyntaxNodeRef {
  node: CodeMirror.SyntaxNode;
}

export abstract class TreeWalker {
  readonly ast: SyntaxTree;
  constructor(ast: SyntaxTree) {
    this.ast = ast;
  }
  static walkExcludingSuccessors<T extends TreeWalker, ArgTs extends unknown[]>(
      this: {new(ast: SyntaxTree, ...args: ArgTs): T}, propertyValue: SyntaxTree, ...args: ArgTs): T {
    const instance = new this(propertyValue, ...args);
    instance.iterateExcludingSuccessors(propertyValue.tree);
    return instance;
  }
  static walk<T extends TreeWalker, ArgTs extends unknown[]>(
      this: {new(ast: SyntaxTree, ...args: ArgTs): T}, propertyValue: SyntaxTree, ...args: ArgTs): T {
    const instance = new this(propertyValue, ...args);
    instance.iterate(propertyValue.tree);
    return instance;
  }

  protected iterate(tree: CodeMirror.SyntaxNode): void {
    tree.cursor().iterate(this.enter.bind(this), this.leave.bind(this));
  }

  protected iterateExcludingSuccessors(tree: CodeMirror.SyntaxNode): void {
    // Customize the first step to avoid visiting siblings of `tree`
    if (this.enter(tree)) {
      tree.firstChild?.cursor().iterate(this.enter.bind(this), this.leave.bind(this));
    }
    this.leave(tree);
  }

  protected enter(_node: SyntaxNodeRef): boolean {
    return true;
  }

  protected leave(_node: SyntaxNodeRef): void {
  }
}

interface RenderingContext {
  ast: SyntaxTree;
  matchedResult: BottomUpTreeMatching;
}

export interface Match {
  readonly text: string;
  readonly type: string;
  render(context: RenderingContext): Node[];
}

interface Matcher {
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null;
}

type MatchKey = Platform.Brand.Brand<string, 'MatchKey'>;
export class BottomUpTreeMatching extends TreeWalker {
  #matchers: Matcher[] = [];
  #matchedNodes = new Map<MatchKey, Match>();

  #key(node: CodeMirror.SyntaxNode): MatchKey {
    return `${node.from}:${node.to}` as MatchKey;
  }

  constructor(ast: SyntaxTree, matchers: Matcher[]) {
    super(ast);
    this.#matchers.push(...matchers);
    this.#matchers.push(new TextMatcher());
  }

  protected override leave({node}: SyntaxNodeRef): void {
    for (const matcher of this.#matchers) {
      const match = matcher.matches(node, this);
      if (match) {
        this.#matchedNodes.set(this.#key(node), match);
        break;
      }
    }
  }

  matchText(node: CodeMirror.SyntaxNode): void {
    const matchers = this.#matchers.splice(0);
    this.#matchers.push(new TextMatcher());
    this.iterateExcludingSuccessors(node);
    this.#matchers.push(...matchers);
  }

  getMatch(node: CodeMirror.SyntaxNode): Match|undefined {
    return this.#matchedNodes.get(this.#key(node));
  }
}

// This function determines whether concatenating two pieces of text requires any spacing inbetween. For example, there
// shouldn't be any space between 'var' and '(', but there should be a space between '1px' and 'solid'. The node
// sequences that make up the pieces of text may contain non-text nodes/trees. Any such element inbetween the texts is
// ignored for the spacing requirement.
export function requiresSpace(a: Node[], b: Node[]): boolean {
  const tail = a.findLast(node => node.textContent)?.textContent;
  const trailingChar = tail ? tail[tail.length - 1] : '';
  const head = b.find(node => node.textContent)?.textContent;
  const leadingChar = head ? head[0] : '';

  const noSpaceAfter = ['', '(', ' ', '{', '}', ';'];
  const noSpaceBefore = ['', '(', ')', ',', ':', ' ', '*', '{', ';'];
  return !noSpaceAfter.includes(trailingChar) && !noSpaceBefore.includes(leadingChar);
}

function mergeWithSpacing(nodes: Node[], merge: Node[]): Node[] {
  const result = [...nodes];
  if (requiresSpace(nodes, merge)) {
    result.push(document.createTextNode(' '));
  }
  result.push(...merge);
  return result;
}

export class Renderer extends TreeWalker {
  readonly #matchedResult: BottomUpTreeMatching;
  #output: Node[] = [];

  constructor(ast: SyntaxTree, matchedResult: BottomUpTreeMatching) {
    super(ast);
    this.#matchedResult = matchedResult;
  }

  static render(nodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext): Node[] {
    if (!Array.isArray(nodes)) {
      return this.render([nodes], context);
    }
    return nodes.map(node => this.walkExcludingSuccessors(context.ast.subtree(node), context.matchedResult).#output)
        .reduce(mergeWithSpacing);
  }

  static renderInto(nodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext, parent: Node):
      Node[] {
    return this.render(nodes, context).map(n => parent.appendChild(n));
  }

  renderedMatchForTest(_nodes: Node[], _match: Match): void {
  }

  protected override enter({node}: SyntaxNodeRef): boolean {
    const match = this.#matchedResult.getMatch(node);
    if (match) {
      const output = match.render(this.#context());
      this.renderedMatchForTest(output, match);
      this.#output = mergeWithSpacing(this.#output, output);
      return false;
    }

    return true;
  }

  #context(): RenderingContext {
    return {ast: this.ast, matchedResult: this.#matchedResult};
  }
}

function siblings(node: CodeMirror.SyntaxNode|null): CodeMirror.SyntaxNode[] {
  const result = [];
  while (node) {
    result.push(node);
    node = node.nextSibling;
  }
  return result;
}

export function children(node: CodeMirror.SyntaxNode): CodeMirror.SyntaxNode[] {
  return siblings(node.firstChild);
}

class LegacyRegexMatch implements Match {
  readonly processor: (text: string) => Node | null;
  readonly #matchedText: string;
  readonly #suffix: string;
  get text(): string {
    return this.#matchedText + this.#suffix;
  }
  get type(): string {
    return `${this.processor}`;
  }
  constructor(matchedText: string, suffix: string, processor: (text: string) => Node | null) {
    this.#matchedText = matchedText;
    this.#suffix = suffix;
    this.processor = processor;
  }
  render(): Node[] {
    const rendered = this.processor(this.#matchedText);
    return rendered ? [rendered, document.createTextNode(this.#suffix)] : [];
  }
}

export class LegacyRegexMatcher implements Matcher {
  readonly regexp: RegExp;
  readonly processor: (text: string) => Node | null;
  constructor(regexp: RegExp, processor: (text: string) => Node | null) {
    this.regexp = new RegExp(regexp);
    this.processor = processor;
  }
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const text = matching.ast.text(node);
    this.regexp.lastIndex = 0;
    const match = this.regexp.exec(text);
    if (!match || match.index !== 0) {
      return null;
    }
    // Some of the legacy regex matching relies on matching prefixes of the text, e.g., for var()s. That particular
    // matcher can't be extended for a full-text match, because that runs into problems matching the correct closing
    // parenthesis (with fallbacks, specifically). At the same time we can't rely on prefix matching here because it
    // has false positives for some subexpressions, such as 'var() + var()'. We compromise by accepting prefix matches
    // where the remaining suffix is exclusively closing parentheses and whitespace, specifically to handle the existing
    // prefix matchers like that for var().
    const suffix = text.substring(match[0].length);
    if (!suffix.match(/^[\s)]*$/)) {
      return null;
    }
    return new LegacyRegexMatch(match[0], suffix, this.processor);
  }
}

export class TextMatch implements Match {
  readonly type = 'text';
  constructor(readonly text: string) {
  }
  render(): Node[] {
    return [document.createTextNode(this.text)];
  }
}

class TextMatcher implements Matcher {
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (!node.firstChild || node.name === 'NumberLiteral' /* may have a Unit child */) {
      // Leaf node, just emit text
      const text = matching.ast.text(node);
      if (text.length) {
        return new TextMatch(text);
      }
    }
    return null;
  }
}

export function tokenizePropertyValue(propertyValue: string): SyntaxTree|null {
  const fakePropertyName = '--property';
  const rule = `*{${fakePropertyName}: ${propertyValue};}`;
  const declaration = cssParser.parse(rule).topNode.getChild('RuleSet')?.getChild('Block')?.getChild('Declaration');
  if (!declaration || declaration.type.isError) {
    return null;
  }

  const childNodes = children(declaration);
  if (childNodes.length < 3) {
    return null;
  }
  const [varName, colon, tree] = childNodes;
  if (!varName || varName.type.isError || !colon || colon.type.isError || !tree || tree.type.isError) {
    return null;
  }

  // It's possible that there are nodes following the declaration when there are comments or syntax errors. We want to
  // render any comments, so pick up any trailing nodes following the declaration excluding the final semicolon and
  // brace.
  const trailingNodes = siblings(declaration).slice(1);
  const [semicolon, brace] = trailingNodes.splice(trailingNodes.length - 2, 2);
  if (semicolon?.name !== ';' && brace?.name !== '}') {
    return null;
  }

  const ast = new SyntaxTree(propertyValue, rule, tree, trailingNodes);
  if (ast.text(varName) !== fakePropertyName || colon.name !== ':') {
    return null;
  }
  return ast;
}

// This function renders a property value as HTML, customizing the presentation with a set of given AST matchers. This
// comprises the following steps:
// 1. Build an AST of the property.
// 2. Apply tree matchers during bottom up traversal.
// 3. Render the value from left to right into HTML, deferring rendering of matched subtrees to the matchers
//
// More general, longer matches take precedence over shorter, more specific matches. Whitespaces are normalized, for
// unmatched text and around rendered matching results.
export function renderPropertyValue(value: string, matchers: Matcher[]): Node[] {
  const ast = tokenizePropertyValue(value);
  if (!ast) {
    return [document.createTextNode(value)];
  }
  const matchedResult = BottomUpTreeMatching.walk(ast, matchers);
  ast.trailingNodes.forEach(n => matchedResult.matchText(n));
  const context = {ast, matchedResult};
  return Renderer.render([...siblings(ast.tree), ...ast.trailingNodes], context);
}
