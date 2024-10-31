// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';

const globalValues = new Set<string>(['inherit', 'initial', 'unset']);

const tagRegexp = /[\x20-\x7E]{4}/;
const numRegexp = /[+-]?(?:\d*\.)?\d+(?:[eE]\d+)?/;
const fontVariationSettingsRegexp =
    new RegExp(`(?:'(${tagRegexp.source})')|(?:"(${tagRegexp.source})")\\s+(${numRegexp.source})`);

/**
 * Extracts information about font variation settings assuming
 * value is valid according to the spec: https://drafts.csswg.org/css-fonts-4/#font-variation-settings-def
 */
export function parseFontVariationSettings(value: string): {
  tag: string,
  value: number,
}[] {
  if (globalValues.has(value.trim()) || value.trim() === 'normal') {
    return [];
  }
  const results = [];
  for (const setting of splitByComma(stripComments(value))) {
    const match = setting.match(fontVariationSettingsRegexp);
    if (match) {
      results.push({
        tag: match[1] || match[2],
        value: parseFloat(match[3]),
      });
    }
  }
  return results;
}

// "str" or 'str'
const fontFamilyRegexp = /^"(.+)"|'(.+)'$/;

/**
 * Extracts font families assuming the value is valid according to
 * the spec: https://drafts.csswg.org/css-fonts-4/#font-family-prop
 */
export function parseFontFamily(value: string): string[] {
  if (globalValues.has(value.trim())) {
    return [];
  }
  const results = [];
  for (const family of splitByComma(stripComments(value))) {
    const match = family.match(fontFamilyRegexp);
    if (match) {
      // Either the 1st or 2nd group matches if the value is in quotes
      results.push(match[1] || match[2]);
    } else {
      // Value without without quotes.
      results.push(family);
    }
  }
  return results;
}

/**
 * Splits a list of values by comma and trims parts
 */
export function splitByComma(value: string): string[] {
  return value.split(',').map(part => part.trim());
}

export function stripComments(value: string): string {
  return value.replaceAll(/(\/\*(?:.|\s)*?\*\/)/g, '');
}

const cssParser = CodeMirror.css.cssLanguage.parser;

function nodeText(node: CodeMirror.SyntaxNode, text: string): string {
  return nodeTextRange(node, node, text);
}
function nodeTextRange(from: CodeMirror.SyntaxNode, to: CodeMirror.SyntaxNode, text: string): string {
  return text.substring(from.from, to.to);
}

export class SyntaxTree {
  readonly propertyValue: string;
  readonly rule: string;
  readonly tree: CodeMirror.SyntaxNode;
  readonly trailingNodes: CodeMirror.SyntaxNode[];
  readonly propertyName: string|undefined;
  constructor(
      propertyValue: string, rule: string, tree: CodeMirror.SyntaxNode, propertyName?: string,
      trailingNodes: CodeMirror.SyntaxNode[] = []) {
    this.propertyName = propertyName;
    this.propertyValue = propertyValue;
    this.rule = rule;
    this.tree = tree;
    this.trailingNodes = trailingNodes;
  }

  text(node?: CodeMirror.SyntaxNode|null): string {
    if (node === null) {
      return '';
    }
    return nodeText(node ?? this.tree, this.rule);
  }

  textRange(from: CodeMirror.SyntaxNode, to: CodeMirror.SyntaxNode): string {
    return nodeTextRange(from, to, this.rule);
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
    if (propertyValue.tree.name === 'Declaration') {
      instance.iterateDeclaration(propertyValue.tree);
    } else {
      instance.iterateExcludingSuccessors(propertyValue.tree);
    }
    return instance;
  }
  static walk<T extends TreeWalker, ArgTs extends unknown[]>(
      this: {new(ast: SyntaxTree, ...args: ArgTs): T}, propertyValue: SyntaxTree, ...args: ArgTs): T {
    const instance = new this(propertyValue, ...args);
    if (propertyValue.tree.name === 'Declaration') {
      instance.iterateDeclaration(propertyValue.tree);
    } else {
      instance.iterate(propertyValue.tree);
    }
    return instance;
  }

  iterateDeclaration(tree: CodeMirror.SyntaxNode): void {
    if (tree.name !== 'Declaration') {
      return;
    }
    if (this.enter(tree)) {
      ASTUtils.declValue(tree)?.cursor().iterate(this.enter.bind(this), this.leave.bind(this));
    }
    this.leave(tree);
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

export interface Match {
  readonly text: string;
  readonly node: CodeMirror.SyntaxNode;
  computedText?(): string|null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any> = (abstract new (...args: any[]) => T)|(new (...args: any[]) => T);

export interface Matcher<MatchT extends Match> {
  readonly matchType: Constructor<MatchT>;
  accepts(propertyName: string): boolean;
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function matcherBase<MatchT extends Match>(matchT: Constructor<MatchT>) {
  class MatcherBase implements Matcher<MatchT> {
    matchType = matchT;
    accepts(_propertyName: string): boolean {
      return true;
    }

    matches(_node: CodeMirror.SyntaxNode, _matching: BottomUpTreeMatching): Match|null {
      return null;
    }
  }
  return MatcherBase;
}

type MatchKey = Platform.Brand.Brand<string, 'MatchKey'>;
export class BottomUpTreeMatching extends TreeWalker {
  #matchers: Matcher<Match>[] = [];
  #matchedNodes = new Map<MatchKey, Match>();
  readonly computedText: ComputedText;

  #key(node: CodeMirror.SyntaxNode): MatchKey {
    return `${node.from}:${node.to}` as MatchKey;
  }

  constructor(ast: SyntaxTree, matchers: Matcher<Match>[]) {
    super(ast);
    this.computedText = new ComputedText(ast.rule.substring(ast.tree.from));
    this.#matchers.push(...matchers.filter(m => !ast.propertyName || m.accepts(ast.propertyName)));
    this.#matchers.push(new TextMatcher());
  }

  protected override leave({node}: SyntaxNodeRef): void {
    for (const matcher of this.#matchers) {
      const match = matcher.matches(node, this);
      if (match) {
        this.computedText.push(match, node.from - this.ast.tree.from);
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

  hasUnresolvedVars(node: CodeMirror.SyntaxNode): boolean {
    return this.hasUnresolvedVarsRange(node, node);
  }

  hasUnresolvedVarsRange(from: CodeMirror.SyntaxNode, to: CodeMirror.SyntaxNode): boolean {
    return this.computedText.hasUnresolvedVars(from.from - this.ast.tree.from, to.to - this.ast.tree.from);
  }

  getComputedText(node: CodeMirror.SyntaxNode, substitutions?: Map<Match, string>): string {
    return this.getComputedTextRange(node, node, substitutions);
  }

  getComputedTextRange(from: CodeMirror.SyntaxNode, to: CodeMirror.SyntaxNode, substitutions?: Map<Match, string>):
      string {
    return this.computedText.get(from.from - this.ast.tree.from, to.to - this.ast.tree.from, substitutions);
  }
}

type MatchWithComputedText = Match&{computedText: NonNullable<Match['computedText']>};
class ComputedTextChunk {
  #cachedComputedText: string|null = null;
  constructor(readonly match: MatchWithComputedText, readonly offset: number) {
  }

  get end(): number {
    return this.offset + this.length;
  }

  get length(): number {
    return this.match.text.length;
  }

  get computedText(): string|null {
    if (this.#cachedComputedText === null) {
      this.#cachedComputedText = this.match.computedText();
    }
    return this.#cachedComputedText;
  }
}

// This class constructs the "computed" text from the input property text, i.e., it will strip comments and substitute
// var() functions if possible. It's intended for use during the bottom-up tree matching process. The original text is
// not modified. Instead, computed text slices are produced on the fly. During bottom-up matching, the sequence of
// top-level comments and var() matches will be recorded. This produces an ordered sequence of text pieces that need to
// be substituted into the original text. When a computed text slice is requested, it is generated by piecing together
// original and computed slices as required.
export class ComputedText {
  readonly #chunks: ComputedTextChunk[] = [];
  readonly text: string;
  #sorted: boolean = true;
  constructor(text: string) {
    this.text = text;
  }

  clear(): void {
    this.#chunks.splice(0);
  }

  get chunkCount(): number {
    return this.#chunks.length;
  }

  #sortIfNecessary(): void {
    if (this.#sorted) {
      return;
    }
    // Sort intervals by offset, with longer intervals first if the offset is identical.
    this.#chunks.sort((a, b) => {
      if (a.offset < b.offset) {
        return -1;
      }
      if (b.offset < a.offset) {
        return 1;
      }
      if (a.end > b.end) {
        return -1;
      }
      if (a.end < b.end) {
        return 1;
      }
      return 0;
    });
    this.#sorted = true;
  }

  // Add another substitutable match. The match will either be appended to the list of existing matches or it will
  // be substituted for the last match(es) if it encompasses them.
  push(match: Match, offset: number): void {
    function hasComputedText(match: Match): match is MatchWithComputedText {
      return Boolean(match.computedText);
    }
    if (!hasComputedText(match) || offset < 0 || offset >= this.text.length) {
      return;
    }
    const chunk = new ComputedTextChunk(match, offset);
    if (chunk.end > this.text.length) {
      return;
    }
    this.#sorted = false;
    this.#chunks.push(chunk);
  }

  * #range(begin: number, end: number): Generator<ComputedTextChunk> {
    this.#sortIfNecessary();
    let i = this.#chunks.findIndex(c => c.offset >= begin);
    while (i >= 0 && i < this.#chunks.length && this.#chunks[i].end > begin && begin < end) {
      if (this.#chunks[i].end > end) {
        i++;
        continue;
      }
      yield this.#chunks[i];
      begin = this.#chunks[i].end;
      while (begin < end && i < this.#chunks.length && this.#chunks[i].offset < begin) {
        i++;
      }
    }
  }

  hasUnresolvedVars(begin: number, end: number): boolean {
    for (const chunk of this.#range(begin, end)) {
      if (chunk.computedText === null) {
        return true;
      }
    }
    return false;
  }

  * #getPieces(begin: number, end: number): Generator<string|ComputedTextChunk> {
    for (const chunk of this.#range(begin, end)) {
      const piece = this.text.substring(begin, Math.min(chunk.offset, end));
      yield piece;
      if (end >= chunk.end) {
        yield chunk;
      }
      begin = chunk.end;
    }
    if (begin < end) {
      const piece = this.text.substring(begin, end);
      yield piece;
    }
  }

  // Get a slice of the computed text corresponding to the property text in the range [begin, end). The slice may not
  // start within a substitution chunk, e.g., it's invalid to request the computed text for the property value text
  // slice "1px var(--".
  get(begin: number, end: number, substitutions?: Map<Match, string>): string {
    const pieces: string[] = [];
    const getText = (piece: string|ComputedTextChunk): string => {
      if (typeof piece === 'string') {
        return piece;
      }
      const substitution = substitutions?.get(piece.match);
      if (substitution) {
        return getText(substitution);
      }
      return piece.computedText ?? piece.match.text;
    };

    for (const piece of this.#getPieces(begin, end)) {
      const text = getText(piece);
      if (text.length === 0) {
        continue;
      }
      if (pieces.length > 0 && requiresSpace(pieces[pieces.length - 1], text)) {
        pieces.push(' ');
      }
      pieces.push(text);
    }
    return pieces.join('');
  }
}

// This function determines whether concatenating two pieces of text requires any spacing inbetween. For example, there
// shouldn't be any space between 'var' and '(', but there should be a space between '1px' and 'solid'. The node
// sequences that make up the pieces of text may contain non-text nodes/trees. Any such element inbetween the texts is
// ignored for the spacing requirement.
export function requiresSpace(a: string, b: string): boolean;
export function requiresSpace(a: Node[], b: Node[]): boolean;
export function requiresSpace(a: Node[]|string|undefined, b: Node[]|string|undefined): boolean {
  const tail = Array.isArray(a) ? a.findLast(node => node.textContent)?.textContent : a;
  const head = Array.isArray(b) ? b.find(node => node.textContent)?.textContent : b;
  const trailingChar = tail ? tail[tail.length - 1] : '';
  const leadingChar = head ? head[0] : '';

  const noSpaceAfter = ['', '(', '{', '}', ';', '['];
  const noSpaceBefore = ['', '(', ')', ',', ':', '*', '{', ';', ']'];
  return !/\s/.test(trailingChar) && !/\s/.test(leadingChar) && !noSpaceAfter.includes(trailingChar) &&
      !noSpaceBefore.includes(leadingChar);
}

export const CSSControlMap = Map<string, HTMLElement[]>;
export type CSSControlMap = Map<string, HTMLElement[]>;
export namespace ASTUtils {
  export function siblings(node: CodeMirror.SyntaxNode|null): CodeMirror.SyntaxNode[] {
    const result = [];
    while (node) {
      result.push(node);
      node = node.nextSibling;
    }
    return result;
  }

  export function children(node: CodeMirror.SyntaxNode|null): CodeMirror.SyntaxNode[] {
    return siblings(node?.firstChild ?? null);
  }

  export function declValue(node: CodeMirror.SyntaxNode): CodeMirror.SyntaxNode|null {
    if (node.name !== 'Declaration') {
      return null;
    }
    return children(node).find(node => node.name === ':')?.nextSibling ?? null;
  }

  export function* stripComments(nodes: CodeMirror.SyntaxNode[]): Generator<CodeMirror.SyntaxNode> {
    for (const node of nodes) {
      if (node.type.name !== 'Comment') {
        yield node;
      }
    }
  }

  export function split(nodes: CodeMirror.SyntaxNode[]): CodeMirror.SyntaxNode[][] {
    const result = [];
    let current = [];
    for (const node of nodes) {
      if (node.name === ',') {
        result.push(current);
        current = [];
      } else {
        current.push(node);
      }
    }
    result.push(current);
    return result;
  }

  export function callArgs(node: CodeMirror.SyntaxNode): CodeMirror.SyntaxNode[][] {
    const args = children(node.getChild('ArgList'));
    const openParen = args.splice(0, 1)[0];
    const closingParen = args.pop();

    if (openParen?.name !== '(' || closingParen?.name !== ')') {
      return [];
    }

    return split(args);
  }

  export function equals(a: CodeMirror.SyntaxNode, b: CodeMirror.SyntaxNode): boolean {
    return a.name === b.name && a.from === b.from && a.to === b.to;
  }
}

export class VariableMatch implements Match {
  constructor(
      readonly text: string,
      readonly node: CodeMirror.SyntaxNode,
      readonly name: string,
      readonly fallback: CodeMirror.SyntaxNode[],
      readonly matching: BottomUpTreeMatching,
      readonly computedTextCallback: (match: VariableMatch, matching: BottomUpTreeMatching) => string | null,
  ) {
  }

  computedText(): string|null {
    return this.computedTextCallback(this, this.matching);
  }
}

// clang-format off
export class VariableMatcher extends matcherBase(VariableMatch) {
  // clang-format on
  readonly #computedTextCallback: (match: VariableMatch, matching: BottomUpTreeMatching) => string | null;
  constructor(computedTextCallback: (match: VariableMatch, matching: BottomUpTreeMatching) => string | null) {
    super();
    this.#computedTextCallback = computedTextCallback;
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const callee = node.getChild('Callee');
    const args = node.getChild('ArgList');
    if (node.name !== 'CallExpression' || !callee || (matching.ast.text(callee) !== 'var') || !args) {
      return null;
    }

    const [lparenNode, nameNode, ...fallbackOrRParenNodes] = ASTUtils.children(args);

    if (lparenNode?.name !== '(' || nameNode?.name !== 'VariableName') {
      return null;
    }

    if (fallbackOrRParenNodes.length <= 1 && fallbackOrRParenNodes[0]?.name !== ')') {
      return null;
    }

    let fallback: CodeMirror.SyntaxNode[] = [];
    if (fallbackOrRParenNodes.length > 1) {
      if (fallbackOrRParenNodes.shift()?.name !== ',') {
        return null;
      }
      if (fallbackOrRParenNodes.pop()?.name !== ')') {
        return null;
      }
      fallback = fallbackOrRParenNodes;
      if (fallback.length === 0) {
        return null;
      }
      if (fallback.some(n => n.name === ',')) {
        return null;
      }
    }

    const varName = matching.ast.text(nameNode);
    if (!varName.startsWith('--')) {
      return null;
    }

    return new VariableMatch(matching.ast.text(node), node, varName, fallback, matching, this.#computedTextCallback);
  }
}

export class TextMatch implements Match {
  computedText?: () => string;
  constructor(readonly text: string, readonly node: CodeMirror.SyntaxNode) {
    if (node.name === 'Comment') {
      this.computedText = () => '';
    }
  }
  render(): Node[] {
    return [document.createTextNode(this.text)];
  }
}

// clang-format off
class TextMatcher extends matcherBase(TextMatch) {
  // clang-format on
  override accepts(): boolean {
    return true;
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (!node.firstChild || node.name === 'NumberLiteral' /* may have a Unit child */) {
      // Leaf node, just emit text
      const text = matching.ast.text(node);
      if (text.length) {
        return new TextMatch(text, node);
      }
    }
    return null;
  }
}

function declaration(rule: string): CodeMirror.SyntaxNode|null {
  return cssParser.parse(rule).topNode.getChild('RuleSet')?.getChild('Block')?.getChild('Declaration') ?? null;
}

export function tokenizeDeclaration(propertyName: string, propertyValue: string): SyntaxTree|null {
  const name = tokenizePropertyName(propertyName);
  if (!name) {
    return null;
  }
  const rule = `*{${name}: ${propertyValue};}`;
  const decl = declaration(rule);
  if (!decl || decl.type.isError) {
    return null;
  }

  const childNodes = ASTUtils.children(decl);
  if (childNodes.length < 2) {
    return null;
  }
  const [varName, colon, tree] = childNodes;
  if (!varName || varName.type.isError || !colon || colon.type.isError || tree?.type.isError) {
    return null;
  }

  // It's possible that there are nodes following the declaration when there are comments or syntax errors. We want to
  // render any comments, so pick up any trailing nodes following the declaration excluding the final semicolon and
  // brace.
  const trailingNodes = ASTUtils.siblings(decl).slice(1);
  const [semicolon, brace] = trailingNodes.splice(trailingNodes.length - 2, 2);
  if (semicolon?.name !== ';' && brace?.name !== '}') {
    return null;
  }

  const ast = new SyntaxTree(propertyValue, rule, decl, name, trailingNodes);
  if (ast.text(varName) !== name || colon.name !== ':') {
    return null;
  }
  return ast;
}

export function tokenizePropertyName(name: string): string|null {
  const rule = `*{${name}: inherit;}`;
  const decl = declaration(rule);
  if (!decl || decl.type.isError) {
    return null;
  }

  const propertyName = decl.getChild('PropertyName') ?? decl.getChild('VariableName');
  if (!propertyName) {
    return null;
  }

  return nodeText(propertyName, rule);
}

export class TreeSearch extends TreeWalker {
  #found: CodeMirror.SyntaxNode|null = null;
  #predicate: (node: CodeMirror.SyntaxNode) => boolean;

  constructor(ast: SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean) {
    super(ast);
    this.#predicate = predicate;
  }

  protected override enter({node}: SyntaxNodeRef): boolean {
    if (this.#found) {
      return false;
    }

    if (this.#predicate(node)) {
      this.#found = this.#found ?? node;
      return false;
    }
    return true;
  }

  static find(ast: SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean): CodeMirror.SyntaxNode|null {
    return TreeSearch.walk(ast, predicate).#found;
  }

  static findAll(ast: SyntaxTree, predicate: (node: CodeMirror.SyntaxNode) => boolean): CodeMirror.SyntaxNode[] {
    const foundNodes: CodeMirror.SyntaxNode[] = [];
    TreeSearch.walk(ast, (node: CodeMirror.SyntaxNode) => {
      if (predicate(node)) {
        foundNodes.push(node);
      }

      return false;
    });
    return foundNodes;
  }
}
