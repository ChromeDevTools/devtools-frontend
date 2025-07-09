// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import './CodeBlock.js';
import './MarkdownImage.js';
import './MarkdownLink.js';

import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import type * as Codeblock from './CodeBlock.js';
import markdownViewStyles from './markdownView.css.js';

const html = Lit.html;
const render = Lit.render;

export interface MarkdownViewData {
  tokens: Marked.Marked.Token[];
  renderer?: MarkdownLitRenderer;
  animationEnabled?: boolean;
  onOpenTableInViewer?: (markdownContent: string) => void;
}

export type CodeTokenWithCitation = Marked.Marked.Tokens.Generic&{
  citations: Codeblock.Citation[],
};

export class MarkdownView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #tokenData: readonly Marked.Marked.Token[] = [];
  #renderer = new MarkdownLitRenderer();
  #animationEnabled = false;
  #isAnimating = false;
  #onOpenTableInViewer?: (markdownContent: string) => void;

  connectedCallback(): void {
    // Listen for table sort events to trigger re-render
    this.addEventListener('table-sort-changed', this.#handleTableSortChanged.bind(this));
  }

  #handleTableSortChanged(): void {
    console.log('[Table Sort] Event received in MarkdownView, triggering re-render');
    // Re-render when table sort changes
    this.#update();
  }

  set data(data: MarkdownViewData) {
    this.#tokenData = data.tokens;
    if (data.renderer) {
      this.#renderer = data.renderer;
    }

    this.#onOpenTableInViewer = data.onOpenTableInViewer;
    
    // Pass the callback and instance to the renderer
    if (this.#renderer && 'setTableViewerCallback' in this.#renderer) {
      (this.#renderer as any).setTableViewerCallback(this.#onOpenTableInViewer);
    }
    if (this.#renderer && 'setMarkdownViewInstance' in this.#renderer) {
      (this.#renderer as any).setMarkdownViewInstance(this);
    }

    if (data.animationEnabled) {
      this.#animationEnabled = true;
      this.#renderer.addCustomClasses({
        paragraph: 'pending',
        heading: 'pending',
        list_item: 'pending',
        code: 'pending',
      });
    } else {
      this.#finishAnimations();
    }

    this.#update();
  }

  #finishAnimations(): void {
    const animatingElements = this.#shadow.querySelectorAll('.animating');
    for (const element of animatingElements) {
      element.classList.remove('animating');
    }

    const pendingElements = this.#shadow.querySelectorAll('.pending');
    for (const element of pendingElements) {
      element.classList.remove('pending');
    }
    this.#isAnimating = false;
    this.#animationEnabled = false;
    this.#renderer.removeCustomClasses({
      paragraph: 'pending',
      heading: 'pending',
      list_item: 'pending',
      code: 'pending',
    });
  }

  #animate(): void {
    if (this.#isAnimating) {
      return;
    }

    this.#isAnimating = true;
    const reveal = (): void => {
      const pendingElement = this.#shadow.querySelector('.pending');
      if (!pendingElement) {
        this.#isAnimating = false;
        return;
      }

      pendingElement.addEventListener('animationend', () => {
        pendingElement.classList.remove('animating');
        reveal();
      }, {once: true});

      pendingElement.classList.remove('pending');
      pendingElement.classList.add('animating');
    };

    reveal();
  }

  #update(): void {
    this.#render();

    if (this.#animationEnabled) {
      this.#animate();
    }
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${markdownViewStyles}</style>
      <div class='message'>
        ${this.#tokenData.map(token => this.#renderer.renderToken(token))}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-markdown-view', MarkdownView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-markdown-view': MarkdownView;
  }
}

/**
 * Default renderer is used for the IssuesPanel and allows only well-known images and links to be embedded.
 */
export class MarkdownLitRenderer {
  #customClasses: Record<string, Set<string>> = {};
  #tableViewerCallback?: (markdownContent: string) => void;
  #tableSortState: Map<string, {columnIndex: number, direction: 'asc' | 'desc'}> = new Map();
  #markdownViewInstance?: MarkdownView;

  addCustomClasses(customClasses: Record<Marked.Marked.Token['type'], string>): void {
    for (const [type, className] of Object.entries(customClasses)) {
      if (!this.#customClasses[type]) {
        this.#customClasses[type] = new Set();
      }
      this.#customClasses[type].add(className);
    }
  }
  
  setTableViewerCallback(callback?: (markdownContent: string) => void): void {
    this.#tableViewerCallback = callback;
  }
  
  setMarkdownViewInstance(instance: MarkdownView): void {
    this.#markdownViewInstance = instance;
  }

  removeCustomClasses(customClasses: Record<Marked.Marked.Token['type'], string>): void {
    for (const [type, className] of Object.entries(customClasses)) {
      if (this.#customClasses[type]) {
        this.#customClasses[type].delete(className);
      }
    }
  }

  protected customClassMapForToken(type: Marked.Marked.Token['type']): Lit.Directive.DirectiveResult {
    const classNames = this.#customClasses[type] || new Set();
    const classInfo = Object.fromEntries([...classNames].map(className => [className, true]));
    return Lit.Directives.classMap(classInfo);
  }

  renderChildTokens(token: Marked.Marked.Token): Lit.TemplateResult[] {
    if ('tokens' in token && token.tokens) {
      return token.tokens.map(token => this.renderToken(token));
    }
    throw new Error('Tokens not found');
  }

  /**
   * Unescape will get rid of the escaping done by Marked to avoid double escaping due to escaping it also with lit.
   * Table taken from: front_end/third_party/marked/package/src/helpers.js
   */
  unescape(text: string): string {
    const escapeReplacements = new Map<string, string>([
      ['&amp;', '&'],
      ['&lt;', '<'],
      ['&gt;', '>'],
      ['&quot;', '"'],
      ['&#39;', '\''],
    ]);
    return text.replace(/&(amp|lt|gt|quot|#39);/g, (matchedString: string) => {
      const replacement = escapeReplacements.get(matchedString);
      return replacement ? replacement : matchedString;
    });
  }

  renderText(token: Marked.Marked.Token): Lit.TemplateResult {
    if ('tokens' in token && token.tokens) {
      return html`${this.renderChildTokens(token)}`;
    }
    // Due to unescaping, unescaped html entities (see escapeReplacements' keys) will be rendered
    // as their corresponding symbol while the rest will be rendered as verbatim.
    // Marked's escape function can be found in front_end/third_party/marked/package/src/helpers.js
    return html`${this.unescape('text' in token ? token.text : '')}`;
  }

  renderHeading(heading: Marked.Marked.Tokens.Heading): Lit.TemplateResult {
    const customClass = this.customClassMapForToken('heading');
    switch (heading.depth) {
      case 1:
        return html`<h1 class=${customClass}>${this.renderText(heading)}</h1>`;
      case 2:
        return html`<h2 class=${customClass}>${this.renderText(heading)}</h2>`;
      case 3:
        return html`<h3 class=${customClass}>${this.renderText(heading)}</h3>`;
      case 4:
        return html`<h4 class=${customClass}>${this.renderText(heading)}</h4>`;
      case 5:
        return html`<h5 class=${customClass}>${this.renderText(heading)}</h5>`;
      default:
        return html`<h6 class=${customClass}>${this.renderText(heading)}</h6>`;
    }
  }

  renderCodeBlock(token: Marked.Marked.Tokens.Code): Lit.TemplateResult {
    // clang-format off
    return html`<devtools-code-block
      class=${this.customClassMapForToken('code')}
      .code=${this.unescape(token.text)}
      .codeLang=${token.lang || ''}>
    </devtools-code-block>`;
    // clang-format on
  }

  renderTable(token: Marked.Marked.Tokens.Table): Lit.TemplateResult {
    const customClass = this.customClassMapForToken('table');
    const isLargeTable = this.isLargeTable(token);
    const tableId = this.generateTableId(token);
    const sortState = this.#tableSortState.get(tableId);
    
    console.log('[Table Sort] Rendering table', { tableId, sortState, hasSortState: !!sortState });
    
    // Get sorted or original rows
    const rows = sortState ? this.sortTableData(token, sortState.columnIndex, sortState.direction) : token.rows;
    
    // Create a bound click handler
    const handleClick = (index: number) => {
      return (e: Event) => {
        e.preventDefault();
        this.handleColumnSort(tableId, index);
      };
    };
    
    const tableHtml = html`
      <table class=${customClass} data-table-id=${tableId}>
        <thead>
          <tr>
            ${token.header.map((cell, index) => html`
              <th 
                style=${this.getAlignmentStyle(token.align[index])}
                class="sortable-header"
                @click=${handleClick(index)}
                title="Click to sort by ${cell.text}">
                ${this.renderTableCellContent(cell)}
                <span class="sort-indicator ${sortState?.columnIndex === index ? 'active' : ''}">
                  ${sortState?.columnIndex === index ? 
                    (sortState.direction === 'asc' ? ' ↑' : ' ↓') : 
                    ' ↕'}
                </span>
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => html`
            <tr>
              ${row.map((cell, index) => html`
                <td style=${this.getAlignmentStyle(token.align[index])}>
                  ${this.renderTableCellContent(cell)}
                </td>
              `)}
            </tr>
          `)}
        </tbody>
      </table>
    `;

    return html`
      <div class="table-container">
        ${tableHtml}
      </div>
      ${isLargeTable ? html`
        <div class="table-actions">
          <span class="scroll-hint">← Scroll horizontally • Click headers to sort →</span>
          <button 
            class="view-document-btn"
            @click=${() => this.openTableInViewer(token)}
            title="Open table in full document viewer for better viewing">
            📊 View Full Table
          </button>
        </div>
      ` : ''}
    `;
  }

  isLargeTable(token: Marked.Marked.Tokens.Table): boolean {
    // Consider a table "large" if:
    // 1. More than 4 columns
    // 2. More than 10 rows
    // 3. Any cell content is particularly long
    const columnCount = token.header.length;
    const rowCount = token.rows.length;
    
    if (columnCount > 4 || rowCount > 10) {
      return true;
    }
    
    // Check for long cell content
    const allCells = [...token.header, ...token.rows.flat()];
    const hasLongContent = allCells.some(cell => cell.text.length > 50);
    
    return hasLongContent;
  }

  openTableInViewer = (token: Marked.Marked.Tokens.Table): void => {
    // Convert table back to markdown format for the document viewer
    const markdownTable = this.convertTableToMarkdown(token);
    
    // Use the callback if available
    if (this.#tableViewerCallback) {
      this.#tableViewerCallback(markdownTable);
    }
  }

  convertTableToMarkdown(token: Marked.Marked.Tokens.Table): string {
    // Convert the table token back to markdown format
    let markdown = '# Table Data\n\n';
    
    // Header row
    const headerRow = '| ' + token.header.map(cell => cell.text).join(' | ') + ' |';
    markdown += headerRow + '\n';
    
    // Separator row with alignment
    const separatorRow = '|' + token.align.map(align => {
      switch (align) {
        case 'center': return ':---:';
        case 'right': return '---:';
        case 'left': return ':---';
        default: return '---';
      }
    }).map(sep => ' ' + sep + ' ').join('|') + '|';
    markdown += separatorRow + '\n';
    
    // Data rows
    token.rows.forEach(row => {
      const dataRow = '| ' + row.map(cell => cell.text).join(' | ') + ' |';
      markdown += dataRow + '\n';
    });
    
    return markdown;
  }

  renderTableCellContent(cell: Marked.Marked.Tokens.TableCell): Lit.TemplateResult {
    // If the cell has tokens, render them; otherwise render the text directly
    if (cell.tokens && cell.tokens.length > 0) {
      return html`${cell.tokens.map(token => this.renderToken(token))}`;
    }
    return html`${this.unescape(cell.text)}`;
  }

  getAlignmentStyle(align: "center" | "left" | "right" | null): string {
    switch (align) {
      case 'center':
        return 'text-align: center;';
      case 'right':
        return 'text-align: right;';
      case 'left':
        return 'text-align: left;';
      default:
        return '';
    }
  }

  // Generate a unique ID for each table to track sorting state
  generateTableId(token: Marked.Marked.Tokens.Table): string {
    // Create a hash based on table structure for consistent ID
    const content = token.header.map(h => h.text).join('|') + token.rows.map(r => r.map(c => c.text).join('|')).join('||');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `table-${Math.abs(hash).toString(16)}`;
  }

  // Sort table rows by column
  sortTableData(token: Marked.Marked.Tokens.Table, columnIndex: number, direction: 'asc' | 'desc'): Marked.Marked.Tokens.TableCell[][] {
    const sortedRows = [...token.rows];
    
    sortedRows.sort((a, b) => {
      const aCell = a[columnIndex];
      const bCell = b[columnIndex];
      
      if (!aCell || !bCell) return 0;
      
      const aText = aCell.text.trim();
      const bText = bCell.text.trim();
      
      // Try to parse as numbers
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      
      let comparison = 0;
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        // Both are numbers
        comparison = aNum - bNum;
      } else {
        // String comparison
        comparison = aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    return sortedRows;
  }

  // Handle column header click for sorting
  handleColumnSort = (tableId: string, columnIndex: number): void => {
    console.log('[Table Sort] Click handler called', { tableId, columnIndex });
    
    const currentSort = this.#tableSortState.get(tableId);
    let newDirection: 'asc' | 'desc' = 'asc';
    
    if (currentSort && currentSort.columnIndex === columnIndex) {
      // Toggle direction if clicking same column
      newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    this.#tableSortState.set(tableId, { columnIndex, direction: newDirection });
    console.log('[Table Sort] State updated', { tableId, columnIndex, direction: newDirection });
    console.log('[Table Sort] Current state map:', this.#tableSortState);
    
    // Use the direct instance reference instead of DOM query
    if (this.#markdownViewInstance) {
      console.log('[Table Sort] Triggering re-render via direct instance');
      this.#markdownViewInstance.dispatchEvent(new CustomEvent('table-sort-changed'));
    } else {
      console.log('[Table Sort] No markdown view instance available');
    }
  }


  renderHorizontalRule(_token: Marked.Marked.Tokens.Hr): Lit.TemplateResult {
    return html`<hr class=${this.customClassMapForToken('hr')}>`;
  }

  renderBlockquote(token: Marked.Marked.Tokens.Blockquote): Lit.TemplateResult {
    return html`
      <blockquote class=${this.customClassMapForToken('blockquote')}>
        ${this.renderChildTokens(token)}
      </blockquote>
    `;
  }

  renderStrikethrough(token: Marked.Marked.Tokens.Del): Lit.TemplateResult {
    return html`<del class=${this.customClassMapForToken('del')}>${this.renderChildTokens(token)}</del>`;
  }

  renderLineBreak(_token: Marked.Marked.Tokens.Br): Lit.TemplateResult {
    return html`<br class=${this.customClassMapForToken('br')}>`;
  }

  templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    switch (token.type) {
      case 'paragraph':
        return html`<p class=${this.customClassMapForToken('paragraph')}>${this.renderChildTokens(token)}</p>`;
      case 'list':
        return html`<ul class=${this.customClassMapForToken('list')}>${token.items.map(token => {
          return this.renderToken(token);
        })}</ul>`;
      case 'list_item':
        return html`<li class=${this.customClassMapForToken('list_item')}>${this.renderChildTokens(token)}</li>`;
      case 'text':
        return this.renderText(token);
      case 'codespan':
        return html`<code class=${this.customClassMapForToken('codespan')}>${this.unescape(token.text)}</code>`;
      case 'code':
        return this.renderCodeBlock(token);
      case 'space':
        return html``;
      case 'link':
        return html`<devtools-markdown-link
        class=${this.customClassMapForToken('link')}
        .data=${{
        key:
          token.href, title: token.text,
        }
        }></devtools-markdown-link>`;
      case 'image':
        return html`<devtools-markdown-image
        class=${this.customClassMapForToken('image')}
        .data=${{
        key:
          token.href, title: token.text,
        }
        }></devtools-markdown-image>`;
      case 'heading':
        return this.renderHeading(token);
      case 'strong':
        return html`<strong class=${this.customClassMapForToken('strong')}>${this.renderText(token)}</strong>`;
      case 'em':
        return html`<em class=${this.customClassMapForToken('em')}>${this.renderText(token)}</em>`;
      case 'table':
        return this.renderTable(token);
      case 'hr':
        return this.renderHorizontalRule(token);
      case 'blockquote':
        return this.renderBlockquote(token);
      case 'del':
        return this.renderStrikethrough(token);
      case 'br':
        return this.renderLineBreak(token);
      default:
        return null;
    }
  }

  renderToken(token: Marked.Marked.Token): Lit.TemplateResult {
    const template = this.templateForToken(token as Marked.Marked.MarkedToken);
    if (template === null) {
      throw new Error(`Markdown token type '${token.type}' not supported.`);
    }
    return template;
  }
}

/**
 * Renderer used in Console Insights and AI assistance for the text generated by an LLM.
 */
export class MarkdownInsightRenderer extends MarkdownLitRenderer {
  #citationClickHandler: (index: number) => void;

  constructor(citationClickHandler?: (index: number) => void) {
    super();
    this.#citationClickHandler = citationClickHandler || (() => {});
    this.addCustomClasses({heading: 'insight'});
  }

  override renderToken(token: Marked.Marked.Token): Lit.TemplateResult {
    const template = this.templateForToken(token as Marked.Marked.MarkedToken);
    if (template === null) {
      return html`${token.raw}`;
    }
    return template;
  }

  sanitizeUrl(maybeUrl: string): string|null {
    try {
      const url = new URL(maybeUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  detectCodeLanguage(token: Marked.Marked.Tokens.Code): string {
    if (token.lang) {
      return token.lang;
    }

    if (/^(\.|#)?[\w:\[\]="'-\.]+ ?{/m.test(token.text) || /^@import/.test(token.text)) {
      return 'css';
    }
    if (/^(var|const|let|function|async|import)\s/.test(token.text)) {
      return 'js';
    }

    return '';
  }

  override templateForToken(token: Marked.Marked.Token): Lit.TemplateResult|null {
    switch (token.type) {
      case 'heading':
        return this.renderHeading(token as Marked.Marked.Tokens.Heading);
      case 'link':
      case 'image': {
        const sanitizedUrl = this.sanitizeUrl(token.href);
        if (!sanitizedUrl) {
          return null;
        }
        // Only links pointing to resources within DevTools can be rendered here.
        return html`${token.text ?? token.href}`;
      }
      case 'code':
        return html`<devtools-code-block
          class=${this.customClassMapForToken('code')}
          .code=${this.unescape(token.text)}
          .codeLang=${this.detectCodeLanguage(token as Marked.Marked.Tokens.Code)}
          .citations=${(token as CodeTokenWithCitation).citations || []}
          .displayNotice=${true}>
        </devtools-code-block>`;
      case 'citation':
        // clang-format off
        return html`<sup><button
            class="citation"
            jslog=${VisualLogging.link('inline-citation').track({click: true})}
            @click=${this.#citationClickHandler.bind(this, Number(token.linkText))}
          >[${token.linkText}]</button></sup>`;
        // clang-format on
    }
    return super.templateForToken(token as Marked.Marked.MarkedToken);
  }
}
