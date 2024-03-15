// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

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

export class RenderingContext {
  constructor(
      readonly ast: SyntaxTree, readonly matchedResult: BottomUpTreeMatching, readonly cssControls?: CSSControlMap,
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

export interface Match {
  readonly text: string;
  readonly type: string;
  render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
  computedText?(): string|null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = (abstract new (...args: any[]) => any)|(new (...args: any[]) => any);
export type MatchFactory<MatchT extends Constructor> = (...args: ConstructorParameters<MatchT>) => InstanceType<MatchT>;

export interface Matcher {
  accepts(propertyName: string): boolean;
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null;
}

export abstract class MatcherBase<MatchT extends Constructor> implements Matcher {
  constructor(readonly createMatch: MatchFactory<MatchT>) {
  }

  accepts(_propertyName: string): boolean {
    return true;
  }

  abstract matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null;
}

type MatchKey = Platform.Brand.Brand<string, 'MatchKey'>;
export class BottomUpTreeMatching extends TreeWalker {
  #matchers: Matcher[] = [];
  #matchedNodes = new Map<MatchKey, Match>();
  readonly computedText: ComputedText;

  #key(node: CodeMirror.SyntaxNode): MatchKey {
    return `${node.from}:${node.to}` as MatchKey;
  }

  constructor(ast: SyntaxTree, matchers: Matcher[]) {
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

  getComputedText(node: CodeMirror.SyntaxNode): string {
    return this.getComputedTextRange(node, node);
  }

  getComputedTextRange(from: CodeMirror.SyntaxNode, to: CodeMirror.SyntaxNode): string {
    return this.computedText.get(from.from - this.ast.tree.from, to.to - this.ast.tree.from);
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

  // Get a slice of the computed text corresponding to the property text in the range [begin, end). The slice may not
  // start within a substitution chunk, e.g., it's invalid to request the computed text for the property value text
  // slice "1px var(--".
  get(begin: number, end: number): string {
    const pieces: string[] = [];
    const push = (text: string): void => {
      if (text.length === 0) {
        return;
      }
      if (pieces.length > 0 && requiresSpace(pieces[pieces.length - 1], text)) {
        pieces.push(' ');
      }
      pieces.push(text);
    };

    for (const chunk of this.#range(begin, end)) {
      const piece = this.text.substring(begin, Math.min(chunk.offset, end));

      push(piece);
      if (end >= chunk.end) {
        push(chunk.computedText ?? chunk.match.text);
      }

      begin = chunk.end;
    }
    if (begin < end) {
      const piece = this.text.substring(begin, end);
      push(piece);
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
  readonly #context: RenderingContext;

  constructor(ast: SyntaxTree, matchedResult: BottomUpTreeMatching, cssControls: CSSControlMap, options: {
    readonly: boolean,
  }) {
    super(ast);
    this.#matchedResult = matchedResult;
    this.#context = new RenderingContext(this.ast, this.#matchedResult, cssControls, options);
  }

  static render(nodeOrNodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext):
      {nodes: Node[], cssControls: CSSControlMap} {
    if (!Array.isArray(nodeOrNodes)) {
      return this.render([nodeOrNodes], context);
    }
    const cssControls = new CSSControlMap();
    const renderers = nodeOrNodes.map(
        node => this.walkExcludingSuccessors(
            context.ast.subtree(node), context.matchedResult, cssControls, context.options));
    const nodes = renderers.map(node => node.#output).reduce(mergeWithSpacing);
    return {nodes, cssControls};
  }

  static renderInto(
      nodeOrNodes: CodeMirror.SyntaxNode|CodeMirror.SyntaxNode[], context: RenderingContext,
      parent: Node): {nodes: Node[], cssControls: CSSControlMap} {
    const {nodes, cssControls} = this.render(nodeOrNodes, context);
    if (parent.lastChild && requiresSpace([parent.lastChild], nodes)) {
      parent.appendChild(document.createTextNode(' '));
    }
    nodes.map(n => parent.appendChild(n));
    return {nodes, cssControls};
  }

  renderedMatchForTest(_nodes: Node[], _match: Match): void {
  }

  protected override enter({node}: SyntaxNodeRef): boolean {
    const match = this.#matchedResult.getMatch(node);
    if (match) {
      const output = match.render(node, this.#context);
      this.renderedMatchForTest(output, match);
      this.#output = mergeWithSpacing(this.#output, output);
      return false;
    }

    return true;
  }
}

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
}

export abstract class AngleMatch implements Match {
  readonly type: string = 'angle';
  constructor(readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class AngleMatcher extends MatcherBase<typeof AngleMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isAngleAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'NumberLiteral') {
      return null;
    }
    const unit = node.getChild('Unit');
    // TODO(crbug/1138628) handle unitless 0
    if (!unit || !['deg', 'grad', 'rad', 'turn'].includes(matching.ast.text(unit))) {
      return null;
    }

    return this.createMatch(matching.ast.text(node));
  }
}

function literalToNumber(node: CodeMirror.SyntaxNode, ast: SyntaxTree): number|null {
  if (node.type.name !== 'NumberLiteral') {
    return null;
  }
  const text = ast.text(node);

  return Number(text.substring(0, text.length - ast.text(node.getChild('Unit')).length));
}

export abstract class ColorMixMatch implements Match {
  readonly type = 'color-mix';
  constructor(
      readonly text: string, readonly space: CodeMirror.SyntaxNode[], readonly color1: CodeMirror.SyntaxNode[],
      readonly color2: CodeMirror.SyntaxNode[]) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class ColorMixMatcher extends MatcherBase<typeof ColorMixMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isColorAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'CallExpression' || matching.ast.text(node.getChild('Callee')) !== 'color-mix') {
      return null;
    }

    const computedValueTree = tokenizeDeclaration('--property', matching.getComputedText(node));
    if (!computedValueTree) {
      return null;
    }

    const value = ASTUtils.declValue(computedValueTree.tree);
    if (!value) {
      return null;
    }
    const computedValueArgs = ASTUtils.callArgs(value);
    if (computedValueArgs.length !== 3) {
      return null;
    }

    const [space, color1, color2] = computedValueArgs;
    // Verify that all arguments are there, and that the space starts with a literal `in`.
    if (space.length < 2 || computedValueTree.text(ASTUtils.stripComments(space).next().value) !== 'in' ||
        color1.length < 1 || color2.length < 1) {
      return null;
    }

    // Verify there's at most one percentage value for each color.
    const p1 =
        color1.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
    const p2 =
        color2.filter(n => n.type.name === 'NumberLiteral' && computedValueTree.text(n.getChild('Unit')) === '%');
    if (p1.length > 1 || p2.length > 1) {
      return null;
    }

    // Verify that if both colors carry percentages, they aren't both zero (which is an invalid property value).
    if (p1[0] && p2[0] && (literalToNumber(p1[0], computedValueTree) ?? 0) === 0 &&
        (literalToNumber(p2[0], computedValueTree) ?? 0) === 0) {
      return null;
    }

    const args = ASTUtils.callArgs(node);
    if (args.length !== 3) {
      return null;
    }
    return this.createMatch(matching.ast.text(node), args[0], args[1], args[2]);
  }
}

export abstract class VariableMatch implements Match {
  readonly type: string = 'var';
  constructor(
      readonly text: string, readonly name: string, readonly fallback: CodeMirror.SyntaxNode[],
      protected readonly matching: BottomUpTreeMatching) {
  }

  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class VariableMatcher extends MatcherBase<typeof VariableMatch> {
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
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

    return this.createMatch(matching.ast.text(node), varName, fallback, matching);
  }
}

export abstract class URLMatch implements Match {
  readonly type = 'url';
  constructor(readonly url: Platform.DevToolsPath.UrlString, readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class URLMatcher extends MatcherBase<typeof URLMatch> {
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'CallLiteral') {
      return null;
    }
    const callee = node.getChild('CallTag');
    if (!callee || matching.ast.text(callee) !== 'url') {
      return null;
    }
    const [, lparenNode, urlNode, rparenNode] = ASTUtils.siblings(callee);
    if (matching.ast.text(lparenNode) !== '(' ||
        (urlNode.name !== 'ParenthesizedContent' && urlNode.name !== 'StringLiteral') ||
        matching.ast.text(rparenNode) !== ')') {
      return null;
    }

    const text = matching.ast.text(urlNode);
    const url = (urlNode.name === 'StringLiteral' ? text.substr(1, text.length - 2) : text.trim()) as
        Platform.DevToolsPath.UrlString;
    return this.createMatch(url, matching.ast.text(node));
  }
}

export abstract class ColorMatch implements Match {
  readonly type = 'color';
  constructor(readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class ColorMatcher extends MatcherBase<typeof ColorMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isColorAwareProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const text = matching.ast.text(node);
    if (node.name === 'ColorLiteral') {
      return this.createMatch(text);
    }
    if (node.name === 'ValueName' && Common.Color.Nicknames.has(text)) {
      return this.createMatch(text);
    }
    if (node.name === 'CallExpression') {
      const callee = node.getChild('Callee');
      if (callee && matching.ast.text(callee).match(/^(rgba?|hsla?|hwba?|lab|lch|oklab|oklch|color)$/)) {
        return this.createMatch(text);
      }
    }
    return null;
  }
}

export const enum LinkableNameProperties {
  Animation = 'animation',
  AnimationName = 'animation-name',
  FontPalette = 'font-palette',
  PositionFallback = 'position-fallback',
}

const enum AnimationLonghandPart {
  Direction = 'direction',
  FillMode = 'fill-mode',
  PlayState = 'play-state',
  IterationCount = 'iteration-count',
  EasingFunction = 'easing-function',
}

export abstract class LinkableNameMatch implements Match {
  readonly type = 'linkable-name';
  constructor(readonly text: string, readonly properyName: LinkableNameProperties) {
  }

  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class LinkableNameMatcher extends MatcherBase<typeof LinkableNameMatch> {
  private static isLinkableNameProperty(propertyName: string): propertyName is LinkableNameProperties {
    const names: string[] = [
      LinkableNameProperties.Animation,
      LinkableNameProperties.AnimationName,
      LinkableNameProperties.FontPalette,
      LinkableNameProperties.PositionFallback,
    ];
    return names.includes(propertyName);
  }

  static readonly identifierAnimationLonghandMap: Map<string, AnimationLonghandPart> = new Map(
      Object.entries({
        'normal': AnimationLonghandPart.Direction,
        'alternate': AnimationLonghandPart.Direction,
        'reverse': AnimationLonghandPart.Direction,
        'alternate-reverse': AnimationLonghandPart.Direction,
        'none': AnimationLonghandPart.FillMode,
        'forwards': AnimationLonghandPart.FillMode,
        'backwards': AnimationLonghandPart.FillMode,
        'both': AnimationLonghandPart.FillMode,
        'running': AnimationLonghandPart.PlayState,
        'paused': AnimationLonghandPart.PlayState,
        'infinite': AnimationLonghandPart.IterationCount,
        'linear': AnimationLonghandPart.EasingFunction,
        'ease': AnimationLonghandPart.EasingFunction,
        'ease-in': AnimationLonghandPart.EasingFunction,
        'ease-out': AnimationLonghandPart.EasingFunction,
        'ease-in-out': AnimationLonghandPart.EasingFunction,
      }),
  );

  private matchAnimationNameInShorthand(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    // Order is important within each animation definition for distinguishing <keyframes-name> values from other keywords.
    // When parsing, keywords that are valid for properties other than animation-name
    // whose values were not found earlier in the shorthand must be accepted for those properties rather than for animation-name.
    // See the details in: https://w3c.github.io/csswg-drafts/css-animations/#animation.
    const text = matching.ast.text(node);
    // This is not a known identifier, so return it as `animation-name`.
    if (!LinkableNameMatcher.identifierAnimationLonghandMap.has(text)) {
      return this.createMatch(text, LinkableNameProperties.Animation);
    }
    // There can be multiple `animation` declarations splitted by a comma.
    // So, we find the declaration nodes that are related to the node argument.
    const declarations = ASTUtils.split(ASTUtils.siblings(ASTUtils.declValue(matching.ast.tree)));
    const currentDeclarationNodes = declarations.find(
        declaration => declaration[0].from <= node.from && declaration[declaration.length - 1].to >= node.to);
    if (!currentDeclarationNodes) {
      return null;
    }

    // We reparse here until the node argument since a variable might be
    // providing a meaningful value such as a timing keyword,
    // that might change the meaning of the node.
    const computedText = matching.getComputedTextRange(currentDeclarationNodes[0], node);
    const tokenized = tokenizeDeclaration('--p', computedText);
    if (!tokenized) {
      return null;
    }

    const identifierCategory =
        LinkableNameMatcher.identifierAnimationLonghandMap.get(text);  // The category of the node argument
    for (let itNode: typeof tokenized.tree|null = ASTUtils.declValue(tokenized.tree); itNode?.nextSibling;
         itNode = itNode.nextSibling) {
      // Run through all the nodes that come before node argument
      // and check whether a value in the same category is found.
      // if so, it means our identifier is an `animation-name` keyword.
      if (itNode.name === 'ValueName') {
        const categoryValue = LinkableNameMatcher.identifierAnimationLonghandMap.get(tokenized.text(itNode));
        if (categoryValue && categoryValue === identifierCategory) {
          return this.createMatch(text, LinkableNameProperties.Animation);
        }
      }
    }

    return null;
  }

  override accepts(propertyName: string): boolean {
    return LinkableNameMatcher.isLinkableNameProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const {propertyName} = matching.ast;
    const text = matching.ast.text(node);
    const parentNode = node.parent;
    if (!parentNode) {
      return null;
    }

    const isParentADeclaration = parentNode.name === 'Declaration';
    const isInsideVarCall = parentNode.name === 'ArgList' && parentNode.prevSibling?.name === 'Callee' &&
        matching.ast.text(parentNode.prevSibling) === 'var';
    const isAParentDeclarationOrVarCall = isParentADeclaration || isInsideVarCall;
    // We only mark top level nodes or nodes that are inside `var()` expressions as linkable names.
    if (!propertyName || (node.name !== 'ValueName' && node.name !== 'VariableName') ||
        !isAParentDeclarationOrVarCall) {
      return null;
    }

    if (propertyName === 'animation') {
      return this.matchAnimationNameInShorthand(node, matching);
    }

    // The assertion here is safe since this matcher only runs for
    // properties with names inside `LinkableNameProperties` (See the `accepts` function.)
    return this.createMatch(text, propertyName as LinkableNameProperties);
  }
}

export abstract class BezierMatch implements Match {
  readonly type: string = 'bezier';
  constructor(readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class BezierMatcher extends MatcherBase<typeof BezierMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isBezierAwareProperty(propertyName);
  }

  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    const text = matching.ast.text(node);

    const isCubicBezierKeyword = node.name === 'ValueName' && UI.Geometry.CubicBezier.KeywordValues.has(text);
    const isCubicBezierOrLinearFunction = node.name === 'CallExpression' &&
        ['cubic-bezier', 'linear'].includes(matching.ast.text(node.getChild('Callee')));

    if (!isCubicBezierKeyword && !isCubicBezierOrLinearFunction) {
      return null;
    }

    if (!InlineEditor.AnimationTimingModel.AnimationTimingModel.parse(text)) {
      return null;
    }
    return this.createMatch(text);
  }
}

export abstract class StringMatch implements Match {
  readonly type: string = 'string';
  constructor(readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class StringMatcher extends MatcherBase<typeof StringMatch> {
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    return node.name === 'StringLiteral' ? this.createMatch(matching.ast.text(node)) : null;
  }
}

export const enum ShadowType {
  BoxShadow = 'boxShadow',
  TextShadow = 'textShadow',
}
export abstract class ShadowMatch implements Match {
  readonly type: string = 'shadow';
  constructor(readonly text: string, readonly shadowType: ShadowType) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class ShadowMatcher extends MatcherBase<typeof ShadowMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isShadowProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'Declaration') {
      return null;
    }
    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return this.createMatch(
        valueText, matching.ast.propertyName === 'text-shadow' ? ShadowType.TextShadow : ShadowType.BoxShadow);
  }
}
export abstract class FontMatch implements Match {
  type: string = 'font';
  constructor(readonly text: string) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class FontMatcher extends MatcherBase<typeof FontMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isFontAwareProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name === 'Declaration') {
      return null;
    }
    const regex = matching.ast.propertyName === 'font-family' ? InlineEditor.FontEditorUtils.FontFamilyRegex :
                                                                InlineEditor.FontEditorUtils.FontPropertiesRegex;
    const text = matching.ast.text(node);
    return regex.test(text) ? this.createMatch(text) : null;
  }
}

type LegacyRegexHandler = (text: string, readonly: boolean) => Node|null;

class LegacyRegexMatch implements Match {
  readonly processor: LegacyRegexHandler;
  readonly #matchedText: string;
  readonly #suffix: string;
  get text(): string {
    return this.#matchedText + this.#suffix;
  }
  get type(): string {
    return `${this.processor}`;
  }
  constructor(matchedText: string, suffix: string, processor: LegacyRegexHandler) {
    this.#matchedText = matchedText;
    this.#suffix = suffix;
    this.processor = processor;
  }
  render(_node: CodeMirror.SyntaxNode, context: RenderingContext): Node[] {
    const rendered = this.processor(this.#matchedText, context.options.readonly);
    return rendered ? [rendered, document.createTextNode(this.#suffix)] : [];
  }
}

export class LegacyRegexMatcher implements Matcher {
  readonly regexp: RegExp;
  readonly processor: LegacyRegexHandler;
  constructor(regexp: RegExp, processor: LegacyRegexHandler) {
    this.regexp = new RegExp(regexp);
    this.processor = processor;
  }
  accepts(): boolean {
    return true;
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
  computedText?: () => string;
  constructor(readonly text: string, readonly isComment: boolean) {
    if (isComment) {
      this.computedText = () => '';
    }
  }
  render(): Node[] {
    return [document.createTextNode(this.text)];
  }
}

class TextMatcher implements Matcher {
  accepts(): boolean {
    return true;
  }
  matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (!node.firstChild || node.name === 'NumberLiteral' /* may have a Unit child */) {
      // Leaf node, just emit text
      const text = matching.ast.text(node);
      if (text.length) {
        return new TextMatch(text, node.name === 'Comment');
      }
    }
    return null;
  }
}

export abstract class GridTemplateMatch implements Match {
  readonly type: string = 'grid-template';
  constructor(readonly text: string, readonly lines: CodeMirror.SyntaxNode[][]) {
  }
  abstract render(node: CodeMirror.SyntaxNode, context: RenderingContext): Node[];
}

export class GridTemplateMatcher extends MatcherBase<typeof GridTemplateMatch> {
  override accepts(propertyName: string): boolean {
    return SDK.CSSMetadata.cssMetadata().isGridAreaDefiningProperty(propertyName);
  }
  override matches(node: CodeMirror.SyntaxNode, matching: BottomUpTreeMatching): Match|null {
    if (node.name !== 'Declaration' || matching.hasUnresolvedVars(node)) {
      return null;
    }

    const lines: CodeMirror.SyntaxNode[][] = [];
    let curLine: CodeMirror.SyntaxNode[] = [];
    // The following two states are designed to consume different cases of LineNames:
    // 1. no LineNames in between StringLiterals;
    // 2. one LineNames in between, which means the LineNames belongs to the current line;
    // 3. two LineNames in between, which means the second LineNames starts a new line.
    // `hasLeadingLineNames` tracks if the current row already starts with a LineNames and
    // with no following StringLiteral yet, which means that the next StringLiteral should
    // be appended to the same `curLine`, instead of creating a new line.
    let hasLeadingLineNames = false;
    // `needClosingLineNames` tracks if the current row can still consume an optional LineNames,
    // which will decide if we should start a new line or not when a LineNames is encountered.
    let needClosingLineNames = false;
    // Gather row definitions of [<line-names>? <string> <track-size>? <line-names>?], which
    // be rendered into separate lines.
    function parseNodes(nodes: CodeMirror.SyntaxNode[], varParsingMode = false): void {
      for (const curNode of nodes) {
        if (matching.getMatch(curNode)?.type === 'var') {
          const computedValueTree = tokenizeDeclaration('--property', matching.getComputedText(curNode));
          if (!computedValueTree) {
            continue;
          }
          const varNodes = ASTUtils.siblings(ASTUtils.declValue(computedValueTree.tree));
          if (varNodes.length === 0) {
            continue;
          }
          if ((varNodes[0].name === 'StringLiteral' && !hasLeadingLineNames) ||
              (varNodes[0].name === 'LineNames' && !needClosingLineNames)) {
            // The variable value either starts with a string, or with a line name that belongs to a new row;
            // therefore we start a new line with the variable.
            lines.push(curLine);
            curLine = [curNode];
          } else {
            curLine.push(curNode);
          }
          // We parse computed nodes of this variable to correctly advance local states, but
          // these computed nodes won't be added to the lines.
          parseNodes(varNodes, true);
        } else if (curNode.name === 'BinaryExpression') {
          parseNodes(ASTUtils.siblings(curNode.firstChild));
        } else if (curNode.name === 'StringLiteral') {
          if (!varParsingMode) {
            if (hasLeadingLineNames) {
              curLine.push(curNode);
            } else {
              lines.push(curLine);
              curLine = [curNode];
            }
          }
          needClosingLineNames = true;
          hasLeadingLineNames = false;
        } else if (curNode.name === 'LineNames') {
          if (!varParsingMode) {
            if (needClosingLineNames) {
              curLine.push(curNode);
            } else {
              lines.push(curLine);
              curLine = [curNode];
            }
          }
          hasLeadingLineNames = !needClosingLineNames;
          needClosingLineNames = !needClosingLineNames;
        } else if (!varParsingMode) {
          curLine.push(curNode);
        }
      }
    }

    const valueNodes = ASTUtils.siblings(ASTUtils.declValue(node));
    parseNodes(valueNodes);
    lines.push(curLine);
    const valueText = matching.ast.textRange(valueNodes[0], valueNodes[valueNodes.length - 1]);
    return this.createMatch(valueText, lines.filter(line => line.length > 0));
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

// This function renders a property value as HTML, customizing the presentation with a set of given AST matchers. This
// comprises the following steps:
// 1. Build an AST of the property.
// 2. Apply tree matchers during bottom up traversal.
// 3. Render the value from left to right into HTML, deferring rendering of matched subtrees to the matchers
//
// More general, longer matches take precedence over shorter, more specific matches. Whitespaces are normalized, for
// unmatched text and around rendered matching results.
export function renderPropertyValue(propertyName: string, propertyValue: string, matchers: Matcher[]): Node[] {
  const ast = tokenizeDeclaration(propertyName, propertyValue);
  if (!ast) {
    return [document.createTextNode(propertyValue)];
  }
  const matchedResult = BottomUpTreeMatching.walk(ast, matchers);
  ast.trailingNodes.forEach(n => matchedResult.matchText(n));
  const context = new RenderingContext(ast, matchedResult);
  return Renderer.render([ast.tree, ...ast.trailingNodes], context).nodes;
}
