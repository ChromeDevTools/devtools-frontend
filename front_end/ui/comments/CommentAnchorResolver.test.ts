// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../components/text_editor/text_editor.js';

import * as Comments from './comments.js';

function createTextEditor(doc: string, filePath?: string): TextEditor.TextEditor.TextEditor {
  const state = CodeMirror.EditorState.create({
    doc,
    extensions: [
      CodeMirror.lineNumbers(),
      TextEditor.Config.baseConfiguration(doc),
    ],
  });
  const textEditor = new TextEditor.TextEditor.TextEditor(state);
  textEditor.editor.dom.setAttribute('jslog', 'TextField; context: editor');
  if (filePath) {
    textEditor.editor.dom.setAttribute('data-file-path', filePath);
  }
  return textEditor;
}

describeWithEnvironment('CommentAnchorResolver', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('closestAcrossShadow', () => {
    it('returns the element itself if it matches the selector', () => {
      const el = document.createElement('div');
      el.classList.add('my-target');
      container.appendChild(el);

      const matched = Comments.CommentAnchorResolver.closestAcrossShadow(el, '.my-target');
      assert.strictEqual(matched, el);
    });

    it('finds matching ancestor across shadow DOM boundary', () => {
      const parent = document.createElement('div');
      parent.setAttribute('data-outer-id', 'outer-123');

      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const innerChild = document.createElement('span');
      shadow.appendChild(innerChild);

      parent.appendChild(host);
      container.appendChild(parent);

      const matched = Comments.CommentAnchorResolver.closestAcrossShadow(innerChild, '[data-outer-id]');
      assert.strictEqual(matched, parent);
    });

    it('returns null when no matching element is found', () => {
      const el = document.createElement('div');
      container.appendChild(el);

      const matched = Comments.CommentAnchorResolver.closestAcrossShadow(el, '.non-existent');
      assert.isNull(matched);
    });
  });

  describe('isNonEmptyItem', () => {
    it('returns true when element has non-empty text content', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello World';
      assert.isTrue(Comments.CommentAnchorResolver.isNonEmptyItem(el));
    });

    it('returns false when element is empty or only whitespace', () => {
      const el = document.createElement('div');
      el.textContent = '   \n\t  ';
      assert.isFalse(Comments.CommentAnchorResolver.isNonEmptyItem(el));
    });

    it('returns true when element contains non-empty text inside shadow root', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const span = document.createElement('span');
      span.textContent = 'Shadow Text';
      shadow.appendChild(span);

      assert.isTrue(Comments.CommentAnchorResolver.isNonEmptyItem(host));
    });
  });

  describe('isTabTitle', () => {
    it('identifies PanelTabHeader VE elements', () => {
      const tabHeader = document.createElement('div');
      tabHeader.setAttribute('jslog', 'PanelTabHeader; context: console');
      assert.isTrue(Comments.CommentAnchorResolver.isTabTitle(tabHeader));
    });

    it('identifies elements with role="tab"', () => {
      const tab = document.createElement('div');
      tab.setAttribute('role', 'tab');
      assert.isTrue(Comments.CommentAnchorResolver.isTabTitle(tab));
    });

    it('identifies elements with tab CSS classes', () => {
      const tab1 = document.createElement('div');
      tab1.classList.add('tab-element');
      assert.isTrue(Comments.CommentAnchorResolver.isTabTitle(tab1));

      const tab2 = document.createElement('div');
      tab2.classList.add('tab-header');
      assert.isTrue(Comments.CommentAnchorResolver.isTabTitle(tab2));
    });

    it('identifies child elements within tab headers across shadow boundaries', () => {
      const host = document.createElement('div');
      host.setAttribute('role', 'tab');
      const shadow = host.attachShadow({mode: 'open'});
      const child = document.createElement('span');
      shadow.appendChild(child);

      assert.isTrue(Comments.CommentAnchorResolver.isTabTitle(child));
    });

    it('returns false for non-tab elements', () => {
      const el = document.createElement('div');
      el.setAttribute('jslog', 'TreeItem; context: item');
      assert.isFalse(Comments.CommentAnchorResolver.isTabTitle(el));
    });
  });

  describe('extractVeName', () => {
    it('extracts trailing VE name from full visual logging path', () => {
      assert.strictEqual(
          Comments.CommentAnchorResolver.extractVeName('Panel: elements > Pane: styles > TreeItem: color'), 'TreeItem');
      assert.strictEqual(Comments.CommentAnchorResolver.extractVeName('Action: toggle'), 'Action');
      assert.strictEqual(Comments.CommentAnchorResolver.extractVeName('TableRow'), 'TableRow');
    });

    it('returns empty string for empty path', () => {
      assert.strictEqual(Comments.CommentAnchorResolver.extractVeName(''), '');
    });
  });

  describe('matchesVePath', () => {
    it('returns true when element matches full VE path', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');
      const item = document.createElement('div');
      item.setAttribute('jslog', 'TreeItem; context: rule');
      panel.appendChild(item);
      container.appendChild(panel);

      assert.isTrue(Comments.CommentAnchorResolver.matchesVePath(item, 'Panel: elements > TreeItem: rule'));
    });

    it('returns false when element does not match VE path or lacks jslog', () => {
      const el = document.createElement('div');
      container.appendChild(el);
      assert.isFalse(Comments.CommentAnchorResolver.matchesVePath(el, 'TreeItem: rule'));

      el.setAttribute('jslog', 'Action; context: btn');
      assert.isFalse(Comments.CommentAnchorResolver.matchesVePath(el, 'TreeItem: rule'));
    });

    it('falls back to getVePath when element lacks jslog DOM attribute or value', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');
      const item = document.createElement('div');
      item.setAttribute('jslog', '');
      panel.appendChild(item);
      container.appendChild(panel);

      assert.isTrue(Comments.CommentAnchorResolver.matchesVePath(item, 'Panel: elements', 'TreeItem'));
    });
  });

  describe('getSiblingIndex', () => {
    it('returns sequential 0-based indices for elements sharing the same VE path in document order', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      panel.appendChild(item1);

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      panel.appendChild(item2);

      const item3 = document.createElement('div');
      item3.setAttribute('jslog', 'TreeItem; context: rule');
      panel.appendChild(item3);

      container.appendChild(panel);

      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item1, 'Panel: elements > TreeItem: rule'), 0);
      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item2, 'Panel: elements > TreeItem: rule'), 1);
      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item3, 'Panel: elements > TreeItem: rule'), 2);
    });

    it('correctly calculates indices when elements are inside separate DOM container wrappers', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');

      // Each item is in its own container div (DOM parent only has 1 child)
      const wrap1 = document.createElement('div');
      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      wrap1.appendChild(item1);
      panel.appendChild(wrap1);

      const wrap2 = document.createElement('div');
      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      wrap2.appendChild(item2);
      panel.appendChild(wrap2);

      container.appendChild(panel);

      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item1, 'Panel: elements > TreeItem: rule'), 0);
      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item2, 'Panel: elements > TreeItem: rule'), 1);
    });

    it('correctly calculates indices across shadow DOM boundaries', () => {
      const host = document.createElement('div');
      host.setAttribute('jslog', 'Panel; context: shadow-panel');
      const shadow = host.attachShadow({mode: 'open'});

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: item');
      shadow.appendChild(item1);

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: item');
      shadow.appendChild(item2);

      container.appendChild(host);

      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item1, 'Panel: shadow-panel > TreeItem: item'),
                         0);
      assert.strictEqual(Comments.CommentAnchorResolver.getSiblingIndex(item2, 'Panel: shadow-panel > TreeItem: item'),
                         1);
    });
  });

  describe('resolveCommentAnchorElement', () => {
    it('escalates interactive controls to semantic containers', () => {
      const parent = document.createElement('div');
      parent.setAttribute('jslog', 'TreeItem; context: color-item');
      parent.textContent = 'color: red;';

      const button = document.createElement('button');
      button.setAttribute('jslog', 'Action; context: toggle');
      button.textContent = 'Toggle';
      parent.appendChild(button);
      container.appendChild(parent);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(button);
      assert.strictEqual(anchorEl, parent);
    });

    it('escalates across shadow DOM boundaries to semantic containers in outer document', () => {
      const parent = document.createElement('div');
      parent.setAttribute('jslog', 'TreeItem; context: shadow-tree-parent');
      parent.textContent = 'outer text';

      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const innerAction = document.createElement('button');
      innerAction.setAttribute('jslog', 'Action; context: inner-btn');
      innerAction.textContent = 'Click';
      shadow.appendChild(innerAction);

      parent.appendChild(host);
      container.appendChild(parent);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(innerAction);
      assert.strictEqual(anchorEl, parent);
    });

    it('stops escalation immediately when element has data-network-request-id', () => {
      const row = document.createElement('div');
      row.setAttribute('jslog', 'Action; context: request-row');
      row.setAttribute('data-network-request-id', 'req-999');
      row.textContent = 'GET /api/data';
      container.appendChild(row);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(row);
      assert.strictEqual(anchorEl, row);
    });

    it('returns the element that has data-network-request-id when resolving a descendant', () => {
      const row = document.createElement('div');
      row.setAttribute('data-network-request-id', 'req-999');
      const cell = document.createElement('div');
      cell.setAttribute('jslog', 'TableCell; context: cell');
      cell.textContent = 'GET /api/data';
      row.appendChild(cell);
      container.appendChild(row);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(cell);
      assert.strictEqual(anchorEl, row);
    });

    it('stops escalation immediately when element has data-backend-node-id', () => {
      const nodeEl = document.createElement('div');
      nodeEl.setAttribute('jslog', 'Action; context: dom-node');
      nodeEl.setAttribute('data-backend-node-id', '42');
      nodeEl.textContent = '<div>Hello</div>';
      container.appendChild(nodeEl);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(nodeEl);
      assert.strictEqual(anchorEl, nodeEl);
    });

    it('returns the element that has data-backend-node-id when resolving a descendant', () => {
      const nodeEl = document.createElement('div');
      nodeEl.setAttribute('data-backend-node-id', '42');
      const childSpan = document.createElement('span');
      childSpan.setAttribute('jslog', 'Action; context: tag-name');
      childSpan.textContent = 'div';
      nodeEl.appendChild(childSpan);
      container.appendChild(nodeEl);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(childSpan);
      assert.strictEqual(anchorEl, nodeEl);
    });

    it('escalates table cell to entire TableRow in grids/tables', () => {
      const row = document.createElement('div');
      row.setAttribute('jslog', 'TableRow; context: grid-row');
      const cell = document.createElement('div');
      cell.setAttribute('jslog', 'TableCell; context: cell');
      cell.textContent = 'Data value';
      row.appendChild(cell);
      container.appendChild(row);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(cell);
      assert.strictEqual(anchorEl, row);
    });

    it('escalates inner item to entire TreeItem in trees', () => {
      const treeItem = document.createElement('div');
      treeItem.setAttribute('jslog', 'TreeItem; context: tree-row');
      const valueSpan = document.createElement('span');
      valueSpan.setAttribute('jslog', 'Value; context: val');
      valueSpan.textContent = 'property value';
      treeItem.appendChild(valueSpan);
      container.appendChild(treeItem);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(valueSpan);
      assert.strictEqual(anchorEl, treeItem);
    });

    it('returns fallback candidate for standalone controls without semantic parent', () => {
      const preview = document.createElement('div');
      preview.setAttribute('jslog', 'Preview; context: live-preview');
      preview.textContent = 'Live Output';
      container.appendChild(preview);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(preview);
      assert.strictEqual(anchorEl, preview);
    });

    it('returns null and prevents leaving comments on empty items with no text content', () => {
      const emptyRow = document.createElement('div');
      emptyRow.setAttribute('jslog', 'TableRow; context: empty-grid-row');
      emptyRow.textContent = '   ';
      container.appendChild(emptyRow);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(emptyRow);
      assert.isNull(anchorEl);
    });

    it('excludes tab titles from commenting', () => {
      const tabHeader = document.createElement('div');
      tabHeader.setAttribute('jslog', 'PanelTabHeader; context: console');
      tabHeader.textContent = 'Console';
      container.appendChild(tabHeader);

      const anchorEl1 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(tabHeader);
      assert.isNull(anchorEl1);

      const ariaTab = document.createElement('div');
      ariaTab.setAttribute('role', 'tab');
      ariaTab.textContent = 'Network';
      container.appendChild(ariaTab);

      const anchorEl2 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(ariaTab);
      assert.isNull(anchorEl2);

      const classTab = document.createElement('div');
      classTab.classList.add('tab-header');
      classTab.textContent = 'Sources';
      container.appendChild(classTab);

      const anchorEl3 = Comments.CommentAnchorResolver.resolveCommentAnchorElement(classTab);
      assert.isNull(anchorEl3);
    });
  });

  describe('resolveCommentAnchor', () => {
    it('constructs vePath, captures textSignature, and calculates sibling index without redundant panelName', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      item1.textContent = 'margin: 0;';
      panel.appendChild(item1);

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      item2.textContent = 'margin: 0;';
      panel.appendChild(item2);

      container.appendChild(panel);

      const anchor1 = Comments.CommentAnchorResolver.resolveCommentAnchor(item1);
      const anchor2 = Comments.CommentAnchorResolver.resolveCommentAnchor(item2);

      assert.isNotNull(anchor1);
      assert.isNotNull(anchor2);
      assert.strictEqual(anchor1?.vePath, 'Panel: elements > TreeItem: rule');
      assert.strictEqual(anchor2?.vePath, 'Panel: elements > TreeItem: rule');
      assert.strictEqual(anchor1?.siblingIndex, 0);
      assert.strictEqual(anchor2?.siblingIndex, 1);
      assert.strictEqual(anchor1?.textSignature, 'margin: 0;');
    });

    it('captures networkRequestId from element or closest ancestor', () => {
      const row = document.createElement('div');
      row.setAttribute('jslog', 'TableRow; context: network-row');
      row.setAttribute('data-network-request-id', 'req-1234');
      const cell = document.createElement('div');
      cell.setAttribute('jslog', 'TableCell; context: cell');
      cell.textContent = 'GET /api/test';
      row.appendChild(cell);
      container.appendChild(row);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(cell);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.networkRequestId, 'req-1234');
    });

    it('calculates sibling index correctly for elements inside a shadow root', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      item1.textContent = 'display: flex;';
      shadow.appendChild(item1);

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      item2.textContent = 'display: flex;';
      shadow.appendChild(item2);

      container.appendChild(host);

      const anchor1 = Comments.CommentAnchorResolver.resolveCommentAnchor(item1);
      const anchor2 = Comments.CommentAnchorResolver.resolveCommentAnchor(item2);

      assert.isNotNull(anchor1);
      assert.isNotNull(anchor2);
      assert.strictEqual(anchor1?.siblingIndex, 0);
      assert.strictEqual(anchor2?.siblingIndex, 1);
    });

    it('calculates sibling index for direct children of shadow root with interspersed text/comment nodes', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      shadow.appendChild(document.createComment('leading comment'));
      shadow.appendChild(document.createTextNode('\n  '));

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      item1.textContent = 'color: red;';
      shadow.appendChild(item1);

      shadow.appendChild(document.createTextNode('\n  '));
      shadow.appendChild(document.createComment('middle comment'));

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      item2.textContent = 'color: red;';
      shadow.appendChild(item2);

      container.appendChild(host);

      const anchor1 = Comments.CommentAnchorResolver.resolveCommentAnchor(item1);
      const anchor2 = Comments.CommentAnchorResolver.resolveCommentAnchor(item2);

      assert.isNotNull(anchor1);
      assert.isNotNull(anchor2);
      assert.strictEqual(anchor1?.siblingIndex, 0);
      assert.strictEqual(anchor2?.siblingIndex, 1);
    });

    it('captures backendNodeId from element or closest ancestor', () => {
      const ancestor = document.createElement('div');
      ancestor.setAttribute('jslog', 'TreeItem; context: dom-node');
      ancestor.setAttribute('data-backend-node-id', '101');
      const node = document.createElement('div');
      node.setAttribute('jslog', 'TreeItem; context: child-node');
      node.textContent = '<div>Hello</div>';
      ancestor.appendChild(node);
      container.appendChild(ancestor);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(node);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.backendNodeId, 101);
    });

    it('returns null if element cannot be resolved to an anchor element', () => {
      const emptyEl = document.createElement('div');
      container.appendChild(emptyEl);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(emptyEl);
      assert.isNull(anchor);
    });

    it('returns null if resolved element has no visual logging path', () => {
      const el = document.createElement('div');
      el.textContent = 'Some content without jslog';
      container.appendChild(el);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(el);
      assert.isNull(anchor);
    });

    it('resolves CodeMirror line elements to .cm-editor with line number and file path', () => {
      const textEditor = createTextEditor('import * as Foo from "./foo.js";\nexport const bar = 123;', 'src/index.ts');
      container.appendChild(textEditor);

      const lines = textEditor.editor.dom.querySelectorAll('.cm-content > .cm-line');
      const line2 = lines[1];
      assert.isDefined(line2);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(line2);
      assert.strictEqual(anchorEl, textEditor.editor.dom);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(line2);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.editor?.lineNumber, 2);
      assert.strictEqual(anchor?.textSignature, 'export const bar = 123;');
      assert.strictEqual(anchor?.editor?.filePath, 'src/index.ts');
    });

    it('resolves CodeMirror gutter elements to corresponding line element', () => {
      const textEditor = createTextEditor('const a = 1;\nconst b = 2;');
      container.appendChild(textEditor);

      const gutters = textEditor.editor.dom.querySelectorAll('.cm-lineNumbers .cm-gutterElement');
      const g2 = Array.from(gutters).find(g => g.textContent?.trim() === '2');
      assert.isDefined(g2);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(g2!);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.editor?.lineNumber, 2);
      assert.strictEqual(anchor?.textSignature, 'const b = 2;');
    });

    it('resolves CodeMirror line elements when clicking nested token child elements inside a line', () => {
      const textEditor = createTextEditor('const x = 42;', 'src/tokens.ts');
      container.appendChild(textEditor);

      const line = textEditor.editor.dom.querySelector('.cm-content > .cm-line');
      assert.isNotNull(line);

      const tokenSpan = document.createElement('span');
      tokenSpan.textContent = 'x';
      line!.appendChild(tokenSpan);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(tokenSpan);
      assert.strictEqual(anchorEl, textEditor.editor.dom);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(tokenSpan);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.editor?.lineNumber, 1);
      assert.strictEqual(anchor?.textSignature, 'const x = 42;');
      assert.strictEqual(anchor?.editor?.filePath, 'src/tokens.ts');
    });

    it('resolves and rematches lines accurately in a large virtualized CodeMirror editor', () => {
      const linesArray: string[] = [];
      for (let i = 1; i <= 200; i++) {
        linesArray.push(`const variable_${i} = ${i};`);
      }
      const doc = linesArray.join('\n');
      const textEditor = createTextEditor(doc, 'src/large.ts');
      container.appendChild(textEditor);

      // Verify rematching line 150 (outside initial viewport) directly via document model
      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'virtualized-line-thread',
        anchor: {
          vePath: 'TextField: editor',
          textSignature: 'const variable_150 = 150;',
          editor: {
            filePath: 'src/large.ts',
            lineNumber: 150,
          },
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, textEditor.editor.dom);
    });

    it('returns null when CodeMirror editor is empty with only whitespace', () => {
      const textEditor = createTextEditor('   \n  ');
      container.appendChild(textEditor);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(textEditor.editor.dom);
      assert.isNull(anchorEl);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(textEditor.editor.dom);
      assert.isNull(anchor);
    });

    it('returns null when clicking on an empty/whitespace line in a non-empty CodeMirror editor', () => {
      const textEditor = createTextEditor('const a = 1;\n\nconst b = 2;');
      container.appendChild(textEditor);

      const lines = textEditor.editor.dom.querySelectorAll('.cm-content > .cm-line');
      const emptyLine = lines[1];
      assert.isDefined(emptyLine);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(emptyLine);
      assert.isNull(anchorEl);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(emptyLine);
      assert.isNull(anchor);
    });

    it('returns null when clicking on gutter element without a corresponding document line', () => {
      const textEditor = createTextEditor('single line');
      container.appendChild(textEditor);

      // Create a standalone detached gutter element to test the out-of-bounds / no-line fallback
      const gutter = textEditor.editor.dom.querySelector('.cm-lineNumbers');
      assert.isNotNull(gutter);
      const extraGutter = document.createElement('div');
      extraGutter.classList.add('cm-gutterElement');
      extraGutter.textContent = '99';
      gutter!.appendChild(extraGutter);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(extraGutter);
      assert.isNull(anchorEl);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(extraGutter);
      assert.isNull(anchor);
    });

    it('returns null when clicking on a non-numeric gutter marker', () => {
      const textEditor = createTextEditor('const a = 100;\nconst b = 200;', 'src/gutters.ts');
      container.appendChild(textEditor);

      const gutters = textEditor.editor.dom.querySelector('.cm-gutters');
      assert.isNotNull(gutters);

      // Create a breakpoint/icon gutter with no numeric text
      const iconGutter = document.createElement('div');
      iconGutter.classList.add('cm-gutterElement');
      const icon = document.createElement('span');
      icon.classList.add('cm-breakpoint-icon');
      iconGutter.appendChild(icon);
      gutters!.appendChild(iconGutter);

      const anchorEl = Comments.CommentAnchorResolver.resolveCommentAnchorElement(icon);
      assert.isNull(anchorEl);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(icon);
      assert.isNull(anchor);
    });

    it('throws an error in resolveCommentAnchor if CodeMirror EditorView cannot be found for .cm-editor element',
       () => {
         const detachedEditor = document.createElement('div');
         detachedEditor.classList.add('cm-editor');
         detachedEditor.setAttribute('jslog', 'TextField; context: editor');

         assert.throws(() => {
           Comments.CommentAnchorResolver.resolveCommentAnchor(detachedEditor);
         }, 'Could not find CodeMirror EditorView from .cm-editor element');
       });
  });

  describe('deepQuerySelectorAll', () => {
    it('returns all matching descendant elements across light and shadow DOM in document order, ignoring root element',
       () => {
         const parent = document.createElement('div');
         parent.setAttribute('data-test-item', 'item-1');

         const host = document.createElement('div');
         const shadow = host.attachShadow({mode: 'open'});
         const shadowChild = document.createElement('div');
         shadowChild.setAttribute('data-test-item', 'item-2');
         shadow.appendChild(shadowChild);
         parent.appendChild(host);

         const sibling = document.createElement('div');
         sibling.setAttribute('data-test-item', 'item-3');
         parent.appendChild(sibling);

         container.appendChild(parent);

         const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(parent, '[data-test-item]');
         assert.deepEqual(matched, [shadowChild, sibling]);
       });

    it('finds matching elements inside the root element\'s own shadowRoot', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const shadowChild1 = document.createElement('div');
      shadowChild1.setAttribute('data-test-item', 'shadow-1');
      shadow.appendChild(shadowChild1);

      const shadowChild2 = document.createElement('span');
      shadowChild2.setAttribute('data-test-item', 'shadow-2');
      shadow.appendChild(shadowChild2);

      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(host, '[data-test-item]');
      assert.deepEqual(matched, [shadowChild1, shadowChild2]);
    });

    it('finds matching elements inside nested shadow roots when root element itself has a shadowRoot', () => {
      const rootHost = document.createElement('div');
      const rootShadow = rootHost.attachShadow({mode: 'open'});

      const nestedHost = document.createElement('div');
      const nestedShadow = nestedHost.attachShadow({mode: 'open'});

      const nestedChild = document.createElement('div');
      nestedChild.setAttribute('data-test-item', 'nested-shadow-item');
      nestedShadow.appendChild(nestedChild);

      rootShadow.appendChild(nestedHost);
      container.appendChild(rootHost);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(rootHost, '[data-test-item]');
      assert.deepEqual(matched, [nestedChild]);
    });

    it('preserves document order across root\'s shadowRoot matches and light DOM matches (descendants only)', () => {
      const host = document.createElement('div');
      host.setAttribute('data-test-item', 'root-host');

      const shadow = host.attachShadow({mode: 'open'});
      const shadowChild = document.createElement('div');
      shadowChild.setAttribute('data-test-item', 'shadow-child');
      shadow.appendChild(shadowChild);

      const lightChild = document.createElement('div');
      lightChild.setAttribute('data-test-item', 'light-child');
      host.appendChild(lightChild);

      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(host, '[data-test-item]');
      assert.deepEqual(matched, [shadowChild, lightChild]);
    });

    it('returns an empty array when no elements match, including within shadow roots', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const shadowChild = document.createElement('div');
      shadow.appendChild(shadowChild);
      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(host, '[data-nonexistent]');
      assert.deepEqual(matched, []);
    });

    it('works when searching from Document root across elements containing shadow roots', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const shadowChild = document.createElement('div');
      shadowChild.setAttribute('data-doc-search', 'found');
      shadow.appendChild(shadowChild);
      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(document, '[data-doc-search="found"]');
      assert.include(matched, shadowChild);
    });

    it('stops early when limit is reached in deepQuerySelectorAll', () => {
      const parent = document.createElement('div');
      for (let i = 0; i < 5; i++) {
        const child = document.createElement('div');
        child.setAttribute('data-test-item', `item-${i}`);
        parent.appendChild(child);
      }
      container.appendChild(parent);

      const matched2 = Comments.CommentAnchorResolver.deepQuerySelectorAll(parent, '[data-test-item]', 2);
      assert.lengthOf(matched2, 2);
      assert.strictEqual(matched2[0].getAttribute('data-test-item'), 'item-0');
      assert.strictEqual(matched2[1].getAttribute('data-test-item'), 'item-1');

      const matched0 = Comments.CommentAnchorResolver.deepQuerySelectorAll(parent, '[data-test-item]', 0);
      assert.deepEqual(matched0, []);

      const matchedNaN = Comments.CommentAnchorResolver.deepQuerySelectorAll(parent, '[data-test-item]', NaN);
      assert.deepEqual(matchedNaN, []);
    });

    it('stops early across shadow roots when limit is reached', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const shadowChild1 = document.createElement('div');
      shadowChild1.setAttribute('data-test-item', 'shadow-1');
      shadow.appendChild(shadowChild1);

      const shadowChild2 = document.createElement('div');
      shadowChild2.setAttribute('data-test-item', 'shadow-2');
      shadow.appendChild(shadowChild2);

      const lightChild = document.createElement('div');
      lightChild.setAttribute('data-test-item', 'light-1');
      host.appendChild(lightChild);

      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelectorAll(host, '[data-test-item]', 1);
      assert.deepEqual(matched, [shadowChild1]);
    });
  });

  describe('deepQuerySelector', () => {
    it('ignores root element when root matches selector and returns first matching descendant', () => {
      const root = document.createElement('div');
      root.setAttribute('data-network-request-id', 'req-root');

      const child = document.createElement('div');
      child.setAttribute('data-network-request-id', 'req-child');
      root.appendChild(child);

      container.appendChild(root);

      const matched = Comments.CommentAnchorResolver.deepQuerySelector(root, '[data-network-request-id]');
      assert.strictEqual(matched, child);
    });

    it('finds element inside root element\'s own shadowRoot', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const target = document.createElement('div');
      target.setAttribute('data-network-request-id', 'req-in-shadow');
      shadow.appendChild(target);

      container.appendChild(host);

      const matched =
          Comments.CommentAnchorResolver.deepQuerySelector(host, '[data-network-request-id="req-in-shadow"]');
      assert.strictEqual(matched, target);
    });

    it('finds element inside nested shadow roots within root element\'s shadowRoot', () => {
      const rootHost = document.createElement('div');
      const rootShadow = rootHost.attachShadow({mode: 'open'});

      const nestedHost = document.createElement('div');
      const nestedShadow = nestedHost.attachShadow({mode: 'open'});

      const target = document.createElement('div');
      target.setAttribute('data-network-request-id', 'req-deep-nested');
      nestedShadow.appendChild(target);

      rootShadow.appendChild(nestedHost);
      container.appendChild(rootHost);

      const matched =
          Comments.CommentAnchorResolver.deepQuerySelector(rootHost, '[data-network-request-id="req-deep-nested"]');
      assert.strictEqual(matched, target);
    });

    it('returns first matching element in document order when root has shadow and light DOM matches', () => {
      const host = document.createElement('div');

      const shadow = host.attachShadow({mode: 'open'});
      const shadowTarget = document.createElement('div');
      shadowTarget.setAttribute('data-item', 'shadow-first');
      shadow.appendChild(shadowTarget);

      const lightTarget = document.createElement('div');
      lightTarget.setAttribute('data-item', 'light-second');
      host.appendChild(lightTarget);

      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelector(host, '[data-item]');
      assert.strictEqual(matched, shadowTarget);
    });

    it('returns null when no matching element exists in the tree', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      const child = document.createElement('div');
      shadow.appendChild(child);
      container.appendChild(host);

      const matched = Comments.CommentAnchorResolver.deepQuerySelector(host, '[data-missing]');
      assert.isNull(matched);
    });
  });

  describe('rematchCommentAnchor', () => {
    it('finds element using primary domain ID fast-path across shadow DOM', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const target = document.createElement('div');
      target.setAttribute('data-network-request-id', 'req-1234');
      target.textContent = 'Request 1234';
      shadow.appendChild(target);
      container.appendChild(host);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-1',
        anchor: {
          vePath: 'Panel: network > TreeItem: req',
          textSignature: 'Request 1234',
          networkRequestId: 'req-1234',
        },
        comments: [{
          author: 'DEVELOPER',
          text: 'Check this request',
          timestamp: Date.now(),
        }],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, target);
    });

    it('handles special characters in networkRequestId selector with CSS.escape', () => {
      const target = document.createElement('div');
      target.setAttribute('data-network-request-id', 'req"with"quotes.[1]');
      target.textContent = 'Special Request';
      container.appendChild(target);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-special-id',
        anchor: {
          vePath: 'Panel: network > TreeItem: req',
          textSignature: 'Special Request',
          networkRequestId: 'req"with"quotes.[1]',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, target);
    });

    it('returns null when element with networkRequestId is not found', () => {
      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-missing-id',
        anchor: {
          vePath: 'Panel: network > TreeItem: req',
          textSignature: 'Request',
          networkRequestId: 'non-existent-req',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.isNull(rematched);
    });

    it('finds element using backendNodeId domain ID', () => {
      const el = document.createElement('div');
      el.setAttribute('data-backend-node-id', '99');
      el.textContent = '<button>Submit</button>';
      container.appendChild(el);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-dom',
        anchor: {
          vePath: 'Panel: elements > TreeItem: node',
          textSignature: '<button>Submit</button>',
          backendNodeId: 99,
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, el);
    });

    it('finds element using VE path and textSignature fallback', () => {
      const item = document.createElement('div');
      item.setAttribute('jslog', 'TreeItem; context: my-rule');
      item.textContent = 'color: blue;';
      container.appendChild(item);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-2',
        anchor: {
          vePath: 'TreeItem: my-rule',
          textSignature: 'color: blue;',
        },
        comments: [{
          author: 'DEVELOPER',
          text: 'Why blue?',
          timestamp: Date.now(),
        }],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, item);
    });

    it('disambiguates identical text items using siblingIndex', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: prop');
      item1.textContent = 'color: red;';
      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: prop');
      item2.textContent = 'color: red;';

      panel.appendChild(item1);
      panel.appendChild(item2);
      container.appendChild(panel);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-sibling',
        anchor: {
          vePath: 'Panel: elements > TreeItem: prop',
          textSignature: 'color: red;',
          siblingIndex: 1,
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, item2);
    });

    it('disambiguates identical text items inside shadow root using siblingIndex with interspersed nodes', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      shadow.appendChild(document.createComment('comment-1'));
      shadow.appendChild(document.createTextNode('\n  '));

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: shadow-prop');
      item1.textContent = 'font-size: 14px;';
      shadow.appendChild(item1);

      shadow.appendChild(document.createTextNode('\n  '));
      shadow.appendChild(document.createComment('comment-2'));

      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: shadow-prop');
      item2.textContent = 'font-size: 14px;';
      shadow.appendChild(item2);

      container.appendChild(host);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-shadow-sibling',
        anchor: {
          vePath: 'TreeItem: shadow-prop',
          textSignature: 'font-size: 14px;',
          siblingIndex: 1,
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, item2);
    });

    it('scopes CodeMirror editor re-attachment to the panel encoded in vePath', () => {
      const sourcesPanel = document.createElement('div');
      sourcesPanel.setAttribute('jslog', 'Panel; context: sources');
      const sourcesEditor = createTextEditor('const x = 10;');
      sourcesPanel.appendChild(sourcesEditor);
      container.appendChild(sourcesPanel);

      const consolePanel = document.createElement('div');
      consolePanel.setAttribute('jslog', 'Panel; context: console');
      const consoleEditor = createTextEditor('const x = 10;');
      consolePanel.appendChild(consoleEditor);
      container.appendChild(consolePanel);

      const line = sourcesEditor.editor.dom.querySelector('.cm-content > .cm-line');
      assert.isNotNull(line);

      const anchor = Comments.CommentAnchorResolver.resolveCommentAnchor(line!);
      assert.isNotNull(anchor);
      assert.strictEqual(anchor?.vePath, 'Panel: sources > TextField: editor');

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'cm-thread',
        anchor: anchor!,
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, sourcesEditor.editor.dom);
    });

    it('rematches CodeMirror editor matching editorFilePath among multiple open editors', () => {
      const editor1 = createTextEditor('const a = 1;', 'src/fileA.ts');
      container.appendChild(editor1);

      const editor2 = createTextEditor('const a = 1;', 'src/fileB.ts');
      container.appendChild(editor2);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'file-b-thread',
        anchor: {
          vePath: 'TextField: editor',
          textSignature: 'const a = 1;',
          editor: {
            filePath: 'src/fileB.ts',
            lineNumber: 1,
          },
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, editor2.editor.dom);
    });

    it('returns null when no open editor matches editor.filePath', () => {
      const editor = createTextEditor('const a = 1;', 'src/foo.ts');
      container.appendChild(editor);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'missing-file-thread',
        anchor: {
          vePath: 'TextField: editor',
          textSignature: 'const a = 1;',
          editor: {
            filePath: 'src/nonexistent.ts',
            lineNumber: 1,
          },
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.isNull(rematched);
    });

    it('rematches CodeMirror editor by lineNumber even when line text content has changed', () => {
      const editor = createTextEditor('const modified = 999;', 'src/app.ts');
      container.appendChild(editor);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'modified-line-thread',
        anchor: {
          vePath: 'TextField: editor',
          textSignature: 'const original = 1;',
          editor: {
            filePath: 'src/app.ts',
            lineNumber: 1,
          },
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, editor.editor.dom);
    });

    it('rematches CodeMirror editor using cachedJslogElements when provided', () => {
      const editor = createTextEditor('const cached = 42;', 'src/cached.ts');
      container.appendChild(editor);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'cached-editor-thread',
        anchor: {
          vePath: 'TextField: editor',
          textSignature: 'const cached = 42;',
          editor: {
            filePath: 'src/cached.ts',
            lineNumber: 1,
          },
        },
        comments: [],
        status: 'ACTIVE',
      };

      const cachedElements = Comments.CommentAnchorResolver.deepQuerySelectorAll(container, '[jslog]');
      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container, cachedElements);
      assert.strictEqual(rematched, editor.editor.dom);
    });

    it('disambiguates identical items across multiple parent containers using parentTextSignature and siblingIndex',
       () => {
         const parentA = document.createElement('div');
         parentA.setAttribute('jslog', 'Pane; context: sectionA');
         const itemA1 = document.createElement('div');
         itemA1.setAttribute('jslog', 'TreeItem; context: item');
         itemA1.textContent = 'value';
         const itemA2 = document.createElement('div');
         itemA2.setAttribute('jslog', 'TreeItem; context: item');
         itemA2.textContent = 'value';
         parentA.appendChild(itemA1);
         parentA.appendChild(itemA2);

         const parentB = document.createElement('div');
         parentB.setAttribute('jslog', 'Pane; context: sectionB');
         const itemB1 = document.createElement('div');
         itemB1.setAttribute('jslog', 'TreeItem; context: item');
         itemB1.textContent = 'value';
         const itemB2 = document.createElement('div');
         itemB2.setAttribute('jslog', 'TreeItem; context: item');
         itemB2.textContent = 'value';
         parentB.appendChild(itemB1);
         parentB.appendChild(itemB2);

         container.appendChild(parentA);
         container.appendChild(parentB);

         const anchorB2 = Comments.CommentAnchorResolver.resolveCommentAnchor(itemB2);
         assert.isNotNull(anchorB2);

         const thread: Comments.CommentAnchorResolver.CommentThread = {
           id: 'comment-b2',
           anchor: anchorB2!,
           comments: [],
           status: 'ACTIVE',
         };

         const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
         assert.strictEqual(rematched, itemB2);
       });

    it('disambiguates identical items using siblingIndex even if text content has changed', () => {
      const panel = document.createElement('div');
      panel.setAttribute('jslog', 'Panel; context: elements');

      const item1 = document.createElement('div');
      item1.setAttribute('jslog', 'TreeItem; context: rule');
      item1.textContent = 'color: green;';  // Text modified from red
      const item2 = document.createElement('div');
      item2.setAttribute('jslog', 'TreeItem; context: rule');
      item2.textContent = 'color: yellow;';  // Text modified from red

      panel.appendChild(item1);
      panel.appendChild(item2);
      container.appendChild(panel);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-modified-text',
        anchor: {
          vePath: 'Panel: elements > TreeItem: rule',
          textSignature: 'color: red;',  // Old text
          siblingIndex: 1,
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, item2);
    });

    it('correctly rematches using siblingIndex when preceding siblings have different text and text has changed',
       () => {
         const panel = document.createElement('div');
         panel.setAttribute('jslog', 'Panel; context: elements');

         const item0 = document.createElement('div');
         item0.setAttribute('jslog', 'TreeItem; context: prop');
         item0.textContent = 'margin: 0;';

         const item1 = document.createElement('div');
         item1.setAttribute('jslog', 'TreeItem; context: prop');
         item1.textContent = 'padding: 0;';

         const item2 = document.createElement('div');
         item2.setAttribute('jslog', 'TreeItem; context: prop');
         item2.textContent = 'padding: 0;';

         panel.appendChild(item0);
         panel.appendChild(item1);
         panel.appendChild(item2);
         container.appendChild(panel);

         // Create anchor for item2 (which is at siblingIndex 2 among TreeItem siblings)
         const anchor2 = Comments.CommentAnchorResolver.resolveCommentAnchor(item2);
         assert.isNotNull(anchor2);
         assert.strictEqual(anchor2?.siblingIndex, 2);

         // Simulate text modification in DevTools
         item1.textContent = 'padding: 5px;';
         item2.textContent = 'padding: 10px;';

         const thread: Comments.CommentAnchorResolver.CommentThread = {
           id: 'comment-text-changed',
           anchor: anchor2!,
           comments: [],
           status: 'ACTIVE',
         };

         const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
         assert.strictEqual(rematched, item2);
       });

    it('avoids VE prefix collisions during fast filtering', () => {
      const tree = document.createElement('div');
      tree.setAttribute('jslog', 'Tree; context: tree-root');
      tree.textContent = 'Tree root';
      container.appendChild(tree);

      const treeItem = document.createElement('div');
      treeItem.setAttribute('jslog', 'TreeItem; context: tree-item');
      treeItem.textContent = 'Tree item';
      container.appendChild(treeItem);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-tree',
        anchor: {
          vePath: 'Tree: tree-root',
          textSignature: 'Tree root',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, tree);
    });

    it('matches elements with leading whitespace in jslog', () => {
      const el = document.createElement('div');
      el.setAttribute('jslog', '  TreeItem; context: spaced');
      el.textContent = 'Spaced item';
      container.appendChild(el);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-spaced',
        anchor: {
          vePath: 'TreeItem: spaced',
          textSignature: 'Spaced item',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.strictEqual(rematched, el);
    });

    it('finds element when root passed to rematchCommentAnchor has a shadowRoot (domain ID path)', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const target = document.createElement('div');
      target.setAttribute('data-network-request-id', 'req-root-shadow');
      target.textContent = 'Shadow Request';
      shadow.appendChild(target);
      container.appendChild(host);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-root-shadow-req',
        anchor: {
          vePath: 'Panel: network > TreeItem: req',
          textSignature: 'Shadow Request',
          networkRequestId: 'req-root-shadow',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, host);
      assert.strictEqual(rematched, target);
    });

    it('finds element when root passed to rematchCommentAnchor has a shadowRoot (VE fallback path)', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});

      const target = document.createElement('div');
      target.setAttribute('jslog', 'TreeItem; context: root-shadow-item');
      target.textContent = 'Shadow Item';
      shadow.appendChild(target);
      container.appendChild(host);

      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'comment-root-shadow-ve',
        anchor: {
          vePath: 'TreeItem: root-shadow-item',
          textSignature: 'Shadow Item',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, host);
      assert.strictEqual(rematched, target);
    });

    it('returns null when no matching candidate exists in the root', () => {
      const thread: Comments.CommentAnchorResolver.CommentThread = {
        id: 'missing',
        anchor: {
          vePath: 'Panel: elements > TreeItem: deleted-node',
          textSignature: 'non-existent',
        },
        comments: [],
        status: 'ACTIVE',
      };

      const rematched = Comments.CommentAnchorResolver.rematchCommentAnchor(thread, container);
      assert.isNull(rematched);
    });
  });

  describe('isElementVisible', () => {
    it('returns false for disconnected elements, zero-sized elements, hidden elements, and true for visible elements',
       () => {
         const disconnected = document.createElement('div');
         disconnected.textContent = 'Disconnected';
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(disconnected));

         const zeroSize = document.createElement('div');
         zeroSize.textContent = 'Zero';
         zeroSize.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
         container.appendChild(zeroSize);
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(zeroSize));

         const hiddenEl = document.createElement('div');
         hiddenEl.style.display = 'none';
         container.appendChild(hiddenEl);
         assert.isFalse(Comments.CommentAnchorResolver.isElementVisible(hiddenEl));

         const visibleEl = document.createElement('div');
         visibleEl.textContent = 'Visible';
         visibleEl.getBoundingClientRect = () => new DOMRect(10, 10, 100, 30);
         container.appendChild(visibleEl);
         assert.isTrue(Comments.CommentAnchorResolver.isElementVisible(visibleEl));
       });
  });

  describe('computeVisibleRect', () => {
    it('returns null for disconnected, hidden, or zero-sized elements', () => {
      const disconnected = document.createElement('div');
      assert.isNull(Comments.CommentAnchorResolver.computeVisibleRect(disconnected));

      const hiddenEl = document.createElement('div');
      hiddenEl.style.display = 'none';
      container.appendChild(hiddenEl);
      assert.isNull(Comments.CommentAnchorResolver.computeVisibleRect(hiddenEl));

      const zeroSize = document.createElement('div');
      zeroSize.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
      container.appendChild(zeroSize);
      assert.isNull(Comments.CommentAnchorResolver.computeVisibleRect(zeroSize));
    });

    it('returns unclipped rect when element is inside unconstrained container', () => {
      const el = document.createElement('div');
      el.textContent = 'Unclipped';
      el.getBoundingClientRect = () => new DOMRect(50, 100, 200, 60);
      container.appendChild(el);

      const rect = Comments.CommentAnchorResolver.computeVisibleRect(el);
      assert.isNotNull(rect);
      assert.strictEqual(rect?.left, 50);
      assert.strictEqual(rect?.top, 100);
      assert.strictEqual(rect?.width, 200);
      assert.strictEqual(rect?.height, 60);
      assert.strictEqual(rect?.right, 250);
      assert.strictEqual(rect?.bottom, 160);
    });

    it('clips element rect to ancestor overflow: hidden / scroll container bounds', () => {
      const scrollParent = document.createElement('div');
      scrollParent.style.overflow = 'hidden';
      scrollParent.style.position = 'relative';
      scrollParent.getBoundingClientRect = () => new DOMRect(0, 50, 300, 100);
      container.appendChild(scrollParent);

      const child = document.createElement('div');
      child.textContent = 'Partially visible child';
      // Element starts at top: 30 (above parent top: 50) and extends to top: 120 (bottom: 120, inside parent bottom: 150)
      child.getBoundingClientRect = () => new DOMRect(20, 30, 200, 90);
      scrollParent.appendChild(child);

      const rect = Comments.CommentAnchorResolver.computeVisibleRect(child);
      assert.isNotNull(rect);
      assert.strictEqual(rect?.top, 50);
      assert.strictEqual(rect?.bottom, 120);
      assert.strictEqual(rect?.height, 70);
      assert.strictEqual(rect?.left, 20);
      assert.strictEqual(rect?.right, 220);
      assert.strictEqual(rect?.width, 200);
    });

    it('clips element rect extending past bottom of overflow container', () => {
      const scrollParent = document.createElement('div');
      scrollParent.style.overflowY = 'auto';
      scrollParent.getBoundingClientRect = () => new DOMRect(0, 0, 400, 200);
      container.appendChild(scrollParent);

      const child = document.createElement('div');
      child.textContent = 'Bottom overflowing child';
      // Element starts at top: 150 and extends to bottom: 300 (past parent bottom: 200)
      child.getBoundingClientRect = () => new DOMRect(10, 150, 100, 150);
      scrollParent.appendChild(child);

      const rect = Comments.CommentAnchorResolver.computeVisibleRect(child);
      assert.isNotNull(rect);
      assert.strictEqual(rect?.top, 150);
      assert.strictEqual(rect?.bottom, 200);
      assert.strictEqual(rect?.height, 50);
      assert.strictEqual(rect?.left, 10);
      assert.strictEqual(rect?.width, 100);
    });

    it('returns null when element is completely scrolled out of overflow container', () => {
      const scrollParent = document.createElement('div');
      scrollParent.style.overflow = 'hidden';
      scrollParent.getBoundingClientRect = () => new DOMRect(0, 100, 400, 200);
      container.appendChild(scrollParent);

      const childScrolledAbove = document.createElement('div');
      childScrolledAbove.textContent = 'Scrolled above';
      childScrolledAbove.getBoundingClientRect = () => new DOMRect(0, 10, 100, 50);
      scrollParent.appendChild(childScrolledAbove);

      assert.isNull(Comments.CommentAnchorResolver.computeVisibleRect(childScrolledAbove));

      const childScrolledBelow = document.createElement('div');
      childScrolledBelow.textContent = 'Scrolled below';
      childScrolledBelow.getBoundingClientRect = () => new DOMRect(0, 350, 100, 50);
      scrollParent.appendChild(childScrolledBelow);

      assert.isNull(Comments.CommentAnchorResolver.computeVisibleRect(childScrolledBelow));
    });

    it('clips correctly across Shadow DOM boundaries', () => {
      const scrollParent = document.createElement('div');
      scrollParent.style.overflow = 'hidden';
      scrollParent.getBoundingClientRect = () => new DOMRect(0, 0, 300, 150);
      container.appendChild(scrollParent);

      const host = document.createElement('div');
      const shadow = host.attachShadow({mode: 'open'});
      scrollParent.appendChild(host);

      const innerChild = document.createElement('div');
      innerChild.textContent = 'Shadow child';
      innerChild.getBoundingClientRect = () => new DOMRect(0, 100, 400, 100);
      shadow.appendChild(innerChild);

      const rect = Comments.CommentAnchorResolver.computeVisibleRect(innerChild);
      assert.isNotNull(rect);
      assert.strictEqual(rect?.top, 100);
      assert.strictEqual(rect?.bottom, 150);
      assert.strictEqual(rect?.height, 50);
      assert.strictEqual(rect?.left, 0);
      assert.strictEqual(rect?.right, 300);
      assert.strictEqual(rect?.width, 300);
    });

    it('supports custom targetRect parameter', () => {
      const el = document.createElement('div');
      container.appendChild(el);

      const customRect = new DOMRect(15, 25, 80, 40);
      const rect = Comments.CommentAnchorResolver.computeVisibleRect(el, customRect);
      assert.isNotNull(rect);
      assert.strictEqual(rect?.top, 25);
      assert.strictEqual(rect?.left, 15);
      assert.strictEqual(rect?.width, 80);
      assert.strictEqual(rect?.height, 40);
    });
  });
});
