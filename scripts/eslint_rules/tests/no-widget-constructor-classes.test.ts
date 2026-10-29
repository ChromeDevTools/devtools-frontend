// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-widget-constructor-classes.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-widget-constructor-classes', rule, {
  valid: [
    {
      name:
          'allows classes and jslog passed via render container options with super(element, {useShadowDom: \'pure\'})',
      code:
          `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  render(html\`<div></div>\`, target, {container: {classes: ['my-widget'], attributes: {jslog: 'Pane'}}});
};
export class MyWidget extends UI.Widget.Widget<ShadowRoot> {
  constructor(element?: HTMLElement) {
    super(element, {useShadowDom: 'pure'});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
    },
    {
      name: 'allows super() with no options',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class MyWidget extends UI.Widget.VBox {
  constructor() {
    super();
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
    },
    {
      name: 'ignores unmigrated widget without view even when DOM is built outside constructor ' +
          'and file has a render helper',
      code: `function renderHelper(target: HTMLElement): void {
  render(html\`<div></div>\`, target);
}
export class LegacyWidget extends UI.Widget.VBox {
  constructor() {
    super({classes: ['legacy-widget']});
  }
  override wasShown(): void {
    super.wasShown();
    renderHelper(this.element);
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
    },
    {
      name: 'ignores unmigrated second class without view when another class in the file uses a view',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class MigratedWidget extends UI.Widget.VBox {
  #view = DEFAULT_VIEW;
}
export class LegacySiblingWidget extends UI.Widget.VBox {
  constructor() {
    super({classes: ['legacy-sibling']});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
    },
  ],
  invalid: [
    {
      name:
          'moves classes and jslog to render container options and converts useShadowDom: true to useShadowDom: \'pure\' on Widget<ShadowRoot>',
      code:
          `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  const editorRef = (el?: Element): void => {};
  render(html\`<div></div>\`, target, {container: {attributes: {tabindex: -1}}});
};
export class BreakpointEditDialog extends UI.Widget.Widget<ShadowRoot> {
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {
      useShadowDom: true,
      delegatesFocus: true,
      classes: ['sources-edit-breakpoint-dialog'],
      jslog: \`\${VisualLogging.dialog('edit-breakpoint')}\`,
    });
  }
}`,
      filename: 'front_end/panels/sources/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
        {messageId: 'noWidgetConstructorJslog'},
      ],
      output:
          `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  const editorRef = (el?: Element): void => {};
  render(html\`<div></div>\`, target, {container: {attributes: {tabindex: -1, jslog: \`\${VisualLogging.dialog('edit-breakpoint')}\`}, classes: ['sources-edit-breakpoint-dialog']}});
};
export class BreakpointEditDialog extends UI.Widget.Widget<ShadowRoot> {
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {useShadowDom: 'pure', delegatesFocus: true});
  }
}`,
    },
    {
      name:
          'moves classes to render container options and converts useShadowDom: true to useShadowDom: \'pure\' when class extends Widget<ShadowRoot>',
      code:
          `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  render(html\`<div></div>\`, target);
};
export class StorageMetadataView extends UI.Widget.Widget<ShadowRoot> {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true, classes: ['storage-metadata-view']});
  }
}`,
      filename: 'front_end/panels/application/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
      output:
          `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement|DocumentFragment): void => {
  render(html\`<div></div>\`, target, {container: {classes: ['storage-metadata-view']}});
};
export class StorageMetadataView extends UI.Widget.Widget<ShadowRoot> {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: 'pure'});
  }
}`,
    },
    {
      name:
          'reports classes without autofix when useShadowDom: true is set on a class that does not extend Widget<ShadowRoot>',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class StorageMetadataView extends UI.Widget.Widget {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true, classes: ['storage-metadata-view']});
  }
}`,
      filename: 'front_end/panels/application/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
    },
    {
      name: 'autofixes jslog while keeping useShadowDom: true when class does not extend Widget<ShadowRoot>',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class AppManifestView extends UI.Widget.VBox {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true, jslog: \`\${VisualLogging.pane('manifest')}\`});
  }
}`,
      filename: 'front_end/panels/application/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorJslog'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {jslog: \`\${VisualLogging.pane('manifest')}\`}}});
};
export class AppManifestView extends UI.Widget.VBox {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
  }
}`,
    },
    {
      name: 'replaces super(undefined, {classes: [...]}) with super() and adds container.classes to render',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class CssVariableValueView extends UI.Widget.Widget {
  constructor(view = DEFAULT_VIEW) {
    super(undefined, {classes: ['css-variable-value-view']});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {classes: ['css-variable-value-view']}});
};
export class CssVariableValueView extends UI.Widget.Widget {
  constructor(view = DEFAULT_VIEW) {
    super();
  }
}`,
    },
    {
      name: 'replaces super({classes: [...]}) with super() and merges into existing render options {host: input}',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {host: input});
};
export class ProfileLauncherView extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super({classes: ['profile-launcher-view']});
  }
}`,
      filename: 'front_end/panels/profiler/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {host: input, container: {classes: ['profile-launcher-view']}});
};
export class ProfileLauncherView extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super();
  }
}`,
    },
    {
      name: 'merges classes into existing render {container: {attributes: ...}} options when useShadowDom is not set',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {tabindex: -1}}});
};
export class CustomDialog extends UI.Widget.Widget {
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {delegatesFocus: true, classes: ['custom-dialog']});
  }
}`,
      filename: 'front_end/panels/sources/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {tabindex: -1}, classes: ['custom-dialog']}});
};
export class CustomDialog extends UI.Widget.Widget {
  constructor(target?: HTMLElement, view = DEFAULT_VIEW) {
    super(target, {delegatesFocus: true});
  }
}`,
    },
    {
      name: 'merges classes into existing render {container: {classes: [...]}} array',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {classes: ['existing-class']}});
};
export class MyWidget extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super({classes: ['vbox', 'new-class']});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {classes: ['vbox', 'new-class', 'existing-class']}});
};
export class MyWidget extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super();
  }
}`,
    },
    {
      name: 'reports and autofixes both classes and jslog together on a non-shadow-DOM widget',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class MyWidget extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super({classes: ['my-widget'], jslog: \`\${VisualLogging.pane('my-pane')}\`});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
        {messageId: 'noWidgetConstructorJslog'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {jslog: \`\${VisualLogging.pane('my-pane')}\`}, classes: ['my-widget']}});
};
export class MyWidget extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super();
  }
}`,
    },
    {
      name: 'reports without autofix when a view has both render(nothing, target) and render(html`...`, target) calls',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  if (!input.visible) {
    render(nothing, target);
    return;
  }
  render(html\`<div></div>\`, target);
};
export class MyWidget extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super({classes: ['my-widget']});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorClasses'},
      ],
    },
    {
      name:
          'reports without autofix when DEFAULT_VIEW has multiple non-nothing render() calls (even after nested helper arrow functions)',
      code: `export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  if (!input.hasData) {
    render(html\`<div class="empty"></div>\`, target);
    return;
  }
  const renderSection = (): Lit.TemplateResult => html\`<span></span>\`;
  render(html\`<div>\${renderSection()}</div>\`, target);
};
export class RequestInitiatorView extends UI.Widget.VBox {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {jslog: \`\${VisualLogging.pane('initiator')}\`});
  }
}`,
      filename: 'front_end/panels/network/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorJslog'},
      ],
    },
    {
      name: 'reports without autofix when classes or jslog references a constructor parameter',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class MyWidget extends UI.Widget.VBox {
  constructor(paneName: string, view = DEFAULT_VIEW) {
    super({jslog: \`\${VisualLogging.pane(paneName)}\`});
  }
}`,
      filename: 'front_end/panels/elements/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorJslog'},
      ],
    },
    {
      name: 'removes jslog from super({jslog: ...}) and adds container.attributes.jslog to render',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target);
};
export class PlayerEventsView extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super({jslog: \`\${VisualLogging.pane('events')}\`});
  }
}`,
      filename: 'front_end/panels/media/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorJslog'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {jslog: \`\${VisualLogging.pane('events')}\`}}});
};
export class PlayerEventsView extends UI.Widget.VBox {
  constructor(view = DEFAULT_VIEW) {
    super();
  }
}`,
    },
    {
      name: 'merges jslog into existing render {container: {attributes: {id: ...}}} options',
      code: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {id: 'sources-panel-sources-view'}}});
};
export class SourcesView extends UI.Widget.VBox {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {jslog: \`\${VisualLogging.pane('editor')}\`});
  }
}`,
      filename: 'front_end/panels/sources/test.ts',
      errors: [
        {messageId: 'noWidgetConstructorJslog'},
      ],
      output: `const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  render(html\`<div></div>\`, target, {container: {attributes: {id: 'sources-panel-sources-view', jslog: \`\${VisualLogging.pane('editor')}\`}}});
};
export class SourcesView extends UI.Widget.VBox {
  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
  }
}`,
    },
  ],
});
