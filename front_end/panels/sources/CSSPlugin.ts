// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../ui/legacy/legacy.js';

import {Plugin} from './Plugin.js';

// Plugin to add CSS completion, shortcuts, and color/curve swatches
// to editors with CSS content.

const UIStrings = {
  /**
  *@description Swatch icon element title in CSSPlugin of the Sources panel
  */
  openColorPicker: 'Open color picker.',
  /**
  *@description Text to open the cubic bezier editor
  */
  openCubicBezierEditor: 'Open cubic bezier editor.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CSSPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function completion(): CodeMirror.Extension {
  const {cssCompletionSource} = CodeMirror.css;
  return CodeMirror.autocompletion({
    override:
        [async(cx: CodeMirror.CompletionContext):
             Promise<CodeMirror.CompletionResult|null> => {
               return (await specificCssCompletion(cx)) || cssCompletionSource(cx);
             }],
  });
}

const dontCompleteIn = new Set(['ColorLiteral', 'NumberLiteral', 'StringLiteral', 'Comment', 'Important']);

function findPropertyAt(node: CodeMirror.SyntaxNode, pos: number): CodeMirror.SyntaxNode|null {
  if (dontCompleteIn.has(node.name)) {
    return null;
  }
  for (let cur: CodeMirror.SyntaxNode|null = node; cur; cur = cur.parent) {
    if (cur.name === 'StyleSheet') {
      break;
    } else if (cur.name === 'Declaration') {
      const name = cur.getChild('PropertyName'), colon = cur.getChild(':');
      return name && colon && colon.to <= pos ? name : null;
    }
  }
  return null;
}

function specificCssCompletion(cx: CodeMirror.CompletionContext): CodeMirror.CompletionResult|null {
  const node = CodeMirror.syntaxTree(cx.state).resolveInner(cx.pos, -1);
  const property = findPropertyAt(node, cx.pos);
  if (!property) {
    return null;
  }
  const propertyValues = SDK.CSSMetadata.cssMetadata().getPropertyValues(cx.state.sliceDoc(property.from, property.to));
  return {
    from: node.name === 'ValueName' ? node.from : cx.pos,
    options: propertyValues.map(value => ({type: 'constant', label: value})),
    span: /^[\w\P{ASCII}\-]+$/u,
  };
}

function findColorsAndCurves(
    state: CodeMirror.EditorState,
    from: number,
    to: number,
    onColor: (pos: number, color: Common.Color.Color, text: string) => void,
    onCurve: (pos: number, curve: UI.Geometry.CubicBezier, text: string) => void,
    ): void {
  let line = state.doc.lineAt(from);
  function getToken(from: number, to: number): string {
    if (from >= line.to) {
      line = state.doc.lineAt(from);
    }
    return line.text.slice(from - line.from, to - line.from);
  }

  const tree = CodeMirror.ensureSyntaxTree(state, to, 100);
  if (!tree) {
    return;
  }
  tree.iterate({
    from,
    to,
    enter: (type, from, to, node) => {
      let content;
      if (type.name === 'ValueName' || type.name === 'ColorLiteral') {
        content = getToken(from, to);
      } else if (type.name === 'Callee' && /^(?:(?:rgb|hsl)a?|cubic-bezier)$/.test(getToken(from, to))) {
        content = state.sliceDoc(from, (node().parent as CodeMirror.SyntaxNode).to);
      }
      if (content) {
        const parsedColor = Common.Color.Color.parse(content);
        if (parsedColor) {
          onColor(from, parsedColor, content);
        } else {
          const parsedCurve = UI.Geometry.CubicBezier.parse(content);
          if (parsedCurve) {
            onCurve(from, parsedCurve, content);
          }
        }
      }
    },
  });
}

class ColorSwatchWidget extends CodeMirror.WidgetType {
  constructor(readonly color: Common.Color.Color, readonly text: string) {
    super();
  }

  eq(other: ColorSwatchWidget): boolean {
    return this.color.equal(other.color) && this.text === other.text;
  }

  toDOM(view: CodeMirror.EditorView): HTMLElement {
    const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
    swatch.renderColor(this.color, false, i18nString(UIStrings.openColorPicker));
    const value = swatch.createChild('span');
    value.textContent = this.text;
    value.setAttribute('hidden', 'true');
    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, event => {
      event.consume(true);
      view.dispatch({
        effects: setTooltip.of({
          type: TooltipType.Color,
          pos: view.posAtDOM(swatch),
          text: this.text,
          swatch,
          color: this.color,
        }),
      });
    });
    return swatch;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class CurveSwatchWidget extends CodeMirror.WidgetType {
  constructor(readonly curve: UI.Geometry.CubicBezier, readonly text: string) {
    super();
  }

  eq(other: CurveSwatchWidget): boolean {
    return this.curve.asCSSText() === other.curve.asCSSText() && this.text === other.text;
  }

  toDOM(view: CodeMirror.EditorView): HTMLElement {
    const swatch = InlineEditor.Swatches.BezierSwatch.create();
    swatch.setBezierText(this.text);
    UI.Tooltip.Tooltip.install(swatch.iconElement(), i18nString(UIStrings.openCubicBezierEditor));
    swatch.iconElement().addEventListener('click', (event: MouseEvent) => {
      event.consume(true);
      view.dispatch({
        effects: setTooltip.of({
          type: TooltipType.Curve,
          pos: view.posAtDOM(swatch),
          text: this.text,
          swatch,
          curve: this.curve,
        }),
      });
    }, false);
    swatch.hideText(true);
    return swatch;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

const enum TooltipType {
  Color = 0,
  Curve = 1,
}

type ActiveTooltip = {
  type: TooltipType.Color,
  pos: number,
  text: string,
  color: Common.Color.Color,
  swatch: InlineEditor.ColorSwatch.ColorSwatch,
}|{
  type: TooltipType.Curve,
  pos: number,
  text: string,
  curve: UI.Geometry.CubicBezier,
  swatch: InlineEditor.Swatches.BezierSwatch,
};

function createCSSTooltip(active: ActiveTooltip): CodeMirror.Tooltip {
  return {
    pos: active.pos,
    arrow: true,
    create(view): CodeMirror.TooltipView {
      let text = active.text;
      let widget: UI.Widget.VBox, addListener: (handler: (event: {data: string}) => void) => void;
      if (active.type === TooltipType.Color) {
        const spectrum = new ColorPicker.Spectrum.Spectrum();
        addListener = (handler): void => {
          spectrum.addEventListener(ColorPicker.Spectrum.Events.ColorChanged, handler);
        };
        spectrum.addEventListener(ColorPicker.Spectrum.Events.SizeChanged, () => view.requestMeasure());
        spectrum.setColor(active.color, active.color.format());
        widget = spectrum;
      } else {
        const spectrum = new InlineEditor.BezierEditor.BezierEditor(active.curve);
        widget = spectrum;
        addListener = (handler): void => {
          spectrum.addEventListener(InlineEditor.BezierEditor.Events.BezierChanged, handler);
        };
      }
      const dom = document.createElement('div');
      dom.className = 'cm-tooltip-swatchEdit';
      widget.markAsRoot();
      widget.show(dom);
      widget.showWidget();
      widget.element.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.consume();
          view.dispatch({
            effects: setTooltip.of(null),
            changes: text === active.text ? undefined :
                                            {from: active.pos, to: active.pos + text.length, insert: active.text},
          });
          widget.hideWidget();
          view.focus();
        }
      });
      widget.element.addEventListener('focusout', event => {
        if (event.relatedTarget && !widget.element.contains(event.relatedTarget as Node)) {
          view.dispatch({effects: setTooltip.of(null)});
          widget.hideWidget();
        }
      }, false);
      widget.element.addEventListener('mousedown', event => event.consume());
      return {
        dom,
        offset: {x: -8, y: 0},
        mount: (): void => {
          widget.focus();
          widget.wasShown();
          addListener((event: {data: string}): void => {
            view.dispatch({
              changes: {from: active.pos, to: active.pos + text.length, insert: event.data},
              annotations: isSwatchEdit.of(true),
            });
            text = event.data;
          });
        },
      };
    },
  };
}

const setTooltip = CodeMirror.StateEffect.define<ActiveTooltip|null>();

const isSwatchEdit = CodeMirror.Annotation.define<boolean>();

const cssTooltipState = CodeMirror.StateField.define<ActiveTooltip|null>({
  create() {
    return null;
  },

  update(value: ActiveTooltip|null, tr: CodeMirror.Transaction): ActiveTooltip |
      null {
        if ((tr.docChanged || tr.selection) && !tr.annotation(isSwatchEdit)) {
          value = null;
        }
        for (const effect of tr.effects) {
          if (effect.is(setTooltip)) {
            value = effect.value;
          }
        }
        return value;
      },

  provide: field => CodeMirror.showTooltip.from(field, active => active && createCSSTooltip(active)),
});

function computeSwatchDeco(state: CodeMirror.EditorState, from: number, to: number): CodeMirror.DecorationSet {
  const builder = new CodeMirror.RangeSetBuilder<CodeMirror.Decoration>();
  findColorsAndCurves(
      state, from, to,
      (pos, color, text) => {
        builder.add(pos, pos, CodeMirror.Decoration.widget({widget: new ColorSwatchWidget(color, text)}));
      },
      (pos, curve, text) => {
        builder.add(pos, pos, CodeMirror.Decoration.widget({widget: new CurveSwatchWidget(curve, text)}));
      });
  return builder.finish();
}

const cssSwatchPlugin = CodeMirror.ViewPlugin.fromClass(class {
  decorations: CodeMirror.DecorationSet;

  constructor(view: CodeMirror.EditorView) {
    this.decorations = computeSwatchDeco(view.state, view.viewport.from, view.viewport.to);
  }

  update(update: CodeMirror.ViewUpdate): void {
    if (update.viewportChanged || update.docChanged) {
      this.decorations = computeSwatchDeco(update.state, update.view.viewport.from, update.view.viewport.to);
    }
  }
}, {
  decorations: v => v.decorations,
});

function cssSwatches(): CodeMirror.Extension {
  return [cssSwatchPlugin, cssTooltipState];
}

function getNumberAt(node: CodeMirror.SyntaxNode): {from: number, to: number}|null {
  if (node.name === 'Unit') {
    node = node.parent as CodeMirror.SyntaxNode;
  }
  if (node.name === 'NumberLiteral') {
    const lastChild = node.lastChild;
    return {from: node.from, to: lastChild && lastChild.name === 'Unit' ? lastChild.from : node.to};
  }
  return null;
}

function modifyUnit(view: CodeMirror.EditorView, by: number): boolean {
  const {head} = view.state.selection.main;
  const context = CodeMirror.syntaxTree(view.state).resolveInner(head, -1);
  const numberRange = getNumberAt(context) || getNumberAt(context.resolve(head, 1));
  if (!numberRange) {
    return false;
  }

  const currentNumber = Number(view.state.sliceDoc(numberRange.from, numberRange.to));
  if (isNaN(currentNumber)) {
    return false;
  }

  view.dispatch({
    changes: {from: numberRange.from, to: numberRange.to, insert: String(currentNumber + by)},
    scrollIntoView: true,
    userEvent: 'insert.modifyUnit',
  });
  return true;
}

export function cssBindings(): CodeMirror.Extension {
  // This is an awkward way to pass the argument given to the editor
  // event handler through the ShortcutRegistry calling convention.
  let currentView: CodeMirror.EditorView = null as unknown as CodeMirror.EditorView;
  const listener = UI.ShortcutRegistry.ShortcutRegistry.instance().getShortcutListener({
    'sources.increment-css': () => Promise.resolve(modifyUnit(currentView, 1)),
    'sources.increment-css-by-ten': () => Promise.resolve(modifyUnit(currentView, 10)),
    'sources.decrement-css': () => Promise.resolve(modifyUnit(currentView, -1)),
    'sources.decrement-css-by-ten': () => Promise.resolve(modifyUnit(currentView, -10)),
  });

  return CodeMirror.EditorView.domEventHandlers({
    keydown: (event, view): boolean => {
      const prevView = currentView;
      currentView = view;
      listener(event);
      currentView = prevView;
      return event.defaultPrevented;
    },
  });
}

export class CSSPlugin extends Plugin {
  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().isStyleSheet();
  }

  editorExtension(): CodeMirror.Extension {
    return [cssBindings(), completion(), cssSwatches()];
  }
}
