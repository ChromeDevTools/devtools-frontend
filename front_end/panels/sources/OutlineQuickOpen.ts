// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../ui/legacy/legacy.js';
import {type UISourceCodeFrame} from './UISourceCodeFrame.js';

import {SourcesView} from './SourcesView.js';

const UIStrings = {
  /**
   *@description Text in Go To Line Quick Open of the Sources panel
   */
  noFileSelected: 'No file selected.',
  /**
   *@description Text in Outline Quick Open of the Sources panel
   */
  openAJavascriptOrCssFileToSee: 'Open a JavaScript or CSS file to see symbols',
  /**
   *@description Text to show no results have been found
   */
  noResultsFound: 'No results found',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/OutlineQuickOpen.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type OutlineItem = {
  title: string,
  subtitle?: string, lineNumber: number, columnNumber: number,
};

export function outline(state: CodeMirror.EditorState): OutlineItem[] {
  function toLineColumn(offset: number): {lineNumber: number, columnNumber: number} {
    offset = Math.max(0, Math.min(offset, state.doc.length));
    const line = state.doc.lineAt(offset);
    return {lineNumber: line.number - 1, columnNumber: offset - line.from};
  }

  function subtitleFromParamList(): string {
    while (cursor.name !== 'ParamList' && cursor.nextSibling()) {
    }
    let parameters = '';
    if (cursor.name === 'ParamList' && cursor.firstChild()) {
      do {
        switch (cursor.name as string) {
          case 'ArrayPattern':
            parameters += '[‥]';
            break;
          case 'ObjectPattern':
            parameters += '{‥}';
            break;
          case 'VariableDefinition':
            parameters += state.sliceDoc(cursor.from, cursor.to);
            break;
          case 'Spread':
            parameters += '...';
            break;
          case ',':
            parameters += ', ';
            break;
        }
      } while (cursor.nextSibling());
    }
    return `(${parameters})`;
  }

  const tree = CodeMirror.syntaxTree(state);
  const items: OutlineItem[] = [];
  const cursor = tree.cursor();
  do {
    switch (cursor.name) {
      // css.grammar
      case 'RuleSet': {
        for (cursor.firstChild();; cursor.nextSibling()) {
          const title = state.sliceDoc(cursor.from, cursor.to);
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          items.push({title, lineNumber, columnNumber});
          cursor.nextSibling();
          if (cursor.name as string !== ',') {
            break;
          }
        }
        break;
      }
      // javascript.grammar
      case 'FunctionDeclaration':
      case 'MethodDeclaration': {
        let prefix = '';
        cursor.firstChild();
        do {
          switch (cursor.name as string) {
            case 'abstract':
            case 'async':
            case 'get':
            case 'set':
            case 'static':
              prefix = `${prefix}${cursor.name} `;
              break;
            case 'Star':
              prefix += '*';
              break;
            case 'PropertyDefinition':
            case 'VariableDefinition': {
              const title = prefix + state.sliceDoc(cursor.from, cursor.to);
              const {lineNumber, columnNumber} = toLineColumn(cursor.from);
              const subtitle = subtitleFromParamList();
              items.push({title, subtitle, lineNumber, columnNumber});
              break;
            }
          }
        } while (cursor.nextSibling());
        break;
      }
      case 'Property': {
        let prefix = '';
        cursor.firstChild();
        do {
          if (cursor.name as string === 'async' || cursor.name as string === 'get' || cursor.name as string === 'set') {
            prefix = `${prefix}${cursor.name} `;
          } else if (cursor.name as string === 'Star') {
            prefix += '*';
          } else if (cursor.name as string === 'PropertyDefinition') {
            let title = state.sliceDoc(cursor.from, cursor.to);
            const {lineNumber, columnNumber} = toLineColumn(cursor.from);
            while (cursor.nextSibling()) {
              if (cursor.name as string === 'ClassExpression') {
                title = `class ${title}`;
                items.push({title, lineNumber, columnNumber});
                break;
              }
              if (cursor.name as string === 'ArrowFunction' || cursor.name as string === 'FunctionExpression') {
                cursor.firstChild();
              }
              if (cursor.name as string === 'async') {
                prefix = `async ${prefix}`;
              } else if (cursor.name as string === 'Star') {
                prefix += '*';
              } else if (cursor.name as string === 'ParamList') {
                title = prefix + title;
                const subtitle = subtitleFromParamList();
                items.push({title, subtitle, lineNumber, columnNumber});
                break;
              }
            }
            break;
          } else {
            // We don't support any other Property syntax.
            break;
          }
        } while (cursor.nextSibling());
        break;
      }
      case 'PropertyName':
      case 'VariableDefinition': {
        if (cursor.matchContext(['ClassDeclaration'])) {
          const title = 'class ' + state.sliceDoc(cursor.from, cursor.to);
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          items.push({title, lineNumber, columnNumber});
        } else if (
            cursor.matchContext([
              'AssignmentExpression',
              'MemberExpression',
            ]) ||
            cursor.matchContext([
              'VariableDeclaration',
            ])) {
          let title = state.sliceDoc(cursor.from, cursor.to);
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          while (cursor.name as string !== 'Equals' && cursor.next()) {
          }
          if (!cursor.nextSibling()) {
            break;
          }
          if (cursor.name as string === 'ArrowFunction' || cursor.name as string === 'FunctionExpression') {
            cursor.firstChild();
            let prefix = '';
            while (cursor.name as string !== 'ParamList') {
              if (cursor.name as string === 'async') {
                prefix = `async ${prefix}`;
              } else if (cursor.name as string === 'Star') {
                prefix += '*';
              }
              if (!cursor.nextSibling()) {
                break;
              }
            }
            title = prefix + title;
            const subtitle = subtitleFromParamList();
            items.push({title, subtitle, lineNumber, columnNumber});
          } else if (cursor.name as string === 'ClassExpression') {
            title = `class ${title}`;
            items.push({title, lineNumber, columnNumber});
          }
        }
        break;
      }
      // wast.grammar
      case 'App': {
        if (cursor.firstChild() && cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === 'module') {
          if (cursor.nextSibling() && cursor.name as string === 'Identifier') {
            const title = state.sliceDoc(cursor.from, cursor.to);
            const {lineNumber, columnNumber} = toLineColumn(cursor.from);
            items.push({title, lineNumber, columnNumber});
          }
          do {
            if (cursor.name as string === 'App' && cursor.firstChild()) {
              if (cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === 'func' && cursor.nextSibling() &&
                  cursor.name as string === 'Identifier') {
                const title = state.sliceDoc(cursor.from, cursor.to);
                const {lineNumber, columnNumber} = toLineColumn(cursor.from);
                const params = [];
                while (cursor.nextSibling()) {
                  if (cursor.name as string === 'App' && cursor.firstChild()) {
                    if (cursor.nextSibling() && state.sliceDoc(cursor.from, cursor.to) === 'param') {
                      if (cursor.nextSibling() && cursor.name as string === 'Identifier') {
                        params.push(state.sliceDoc(cursor.from, cursor.to));
                      } else {
                        params.push(`$${params.length}`);
                      }
                    }
                    cursor.parent();
                  }
                }
                const subtitle = `(${params.join(', ')})`;
                items.push({title, subtitle, lineNumber, columnNumber});
              }
              cursor.parent();
            }
          } while (cursor.nextSibling());
        }
        break;
      }
      // cpp.grammar
      case 'FieldIdentifier':
      case 'Identifier': {
        if (cursor.matchContext(['FunctionDeclarator'])) {
          const title = state.sliceDoc(cursor.from, cursor.to);
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          items.push({title, lineNumber, columnNumber});
        }
        break;
      }
      case 'TypeIdentifier': {
        if (cursor.matchContext(['ClassSpecifier'])) {
          const title = `class ${state.sliceDoc(cursor.from, cursor.to)}`;
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          items.push({title, lineNumber, columnNumber});
        } else if (cursor.matchContext(['StructSpecifier'])) {
          const title = `struct ${state.sliceDoc(cursor.from, cursor.to)}`;
          const {lineNumber, columnNumber} = toLineColumn(cursor.from);
          items.push({title, lineNumber, columnNumber});
        }
        break;
      }
      default:
        break;
    }
  } while (cursor.next());
  return items;
}

export class OutlineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  private items: OutlineItem[] = [];
  private active: boolean = false;

  attach(): void {
    const sourceFrame = this.currentSourceFrame();
    if (sourceFrame) {
      this.active = true;
      this.items = outline(sourceFrame.textEditor.state).map(({title, subtitle, lineNumber, columnNumber}) => {
        ({lineNumber, columnNumber} = sourceFrame.editorLocationToUILocation(lineNumber, columnNumber));
        return {title, subtitle, lineNumber, columnNumber};
      });
    } else {
      this.active = false;
      this.items = [];
    }
  }

  detach(): void {
    this.active = false;
    this.items = [];
  }

  itemCount(): number {
    return this.items.length;
  }

  itemKeyAt(itemIndex: number): string {
    const item = this.items[itemIndex];
    return item.title + (item.subtitle ? item.subtitle : '');
  }

  itemScoreAt(itemIndex: number, query: string): number {
    const item = this.items[itemIndex];
    const methodName = query.split('(')[0];
    if (methodName.toLowerCase() === item.title.toLowerCase()) {
      return 1 / (1 + item.lineNumber);
    }
    return -item.lineNumber - 1;
  }

  renderItem(itemIndex: number, query: string, titleElement: Element, _subtitleElement: Element): void {
    const item = this.items[itemIndex];
    titleElement.textContent = item.title + (item.subtitle ? item.subtitle : '');
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query);

    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }

    const tagElement = (titleElement.parentElement?.parentElement?.createChild('span', 'tag') as HTMLElement);
    if (!tagElement) {
      return;
    }

    const disassembly = sourceFrame.wasmDisassembly;
    if (disassembly) {
      const lastBytecodeOffset = disassembly.lineNumberToBytecodeOffset(disassembly.lineNumbers - 1);
      const bytecodeOffsetDigits = lastBytecodeOffset.toString(16).length;
      tagElement.textContent = `:0x${item.columnNumber.toString(16).padStart(bytecodeOffsetDigits, '0')}`;
    } else {
      tagElement.textContent = `:${item.lineNumber + 1}`;
    }
  }

  selectItem(itemIndex: number|null, _promptValue: string): void {
    if (itemIndex === null) {
      return;
    }
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    const item = this.items[itemIndex];
    sourceFrame.revealPosition({lineNumber: item.lineNumber, columnNumber: item.columnNumber}, true);
  }

  private currentSourceFrame(): UISourceCodeFrame|null {
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    return sourcesView && sourcesView.currentSourceFrame();
  }

  notFoundText(): string {
    if (!this.currentSourceFrame()) {
      return i18nString(UIStrings.noFileSelected);
    }
    if (!this.active) {
      return i18nString(UIStrings.openAJavascriptOrCssFileToSee);
    }
    return i18nString(UIStrings.noResultsFound);
  }
}
