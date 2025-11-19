// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import nodeStackTraceWidgetStyles from './nodeStackTraceWidget.css.js';

const UIStrings = {
  /**
   * @description Message displayed when no JavaScript stack trace is available for the DOM node in the Stack Trace widget of the Elements panel
   */
  noStackTraceAvailable: 'No stack trace available',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/NodeStackTraceWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  target?: SDK.Target.Target;
  linkifier: Components.Linkifier.Linkifier;
  stackTrace?: StackTrace.StackTrace.StackTrace;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const {target: sdkTarget, linkifier, stackTrace} = input;
  // clang-format off
  render(html`
    <style>${nodeStackTraceWidgetStyles}</style>
    ${target && stackTrace ?
         html`<devtools-widget
                class="stack-trace"
                .widgetConfig=${UI.Widget.widgetConfig(Components.JSPresentationUtils.StackTracePreviewContent, {target: sdkTarget, linkifier, stackTrace})}>
              </devtools-widget>` :
         html`<div class="gray-info-message">${i18nString(UIStrings.noStackTraceAvailable)}</div>`}`,
    target);
  // clang-format on
};

export class NodeStackTraceWidget extends UI.Widget.VBox {
  readonly #linkifier = new Components.Linkifier.Linkifier(MaxLengthForLinks);
  readonly #view: View;

  constructor(view = DEFAULT_VIEW) {
    super({useShadowDom: true});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.requestUpdate, this);
  }

  override async performUpdate(): Promise<void> {
    const node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    const target = node?.domModel().target();
    const runtimeStackTrace = await node?.creationStackTrace() ?? undefined;
    const stackTrace = runtimeStackTrace && target ?
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createStackTraceFromProtocolRuntime(
            runtimeStackTrace, target) :
        undefined;
    const input: ViewInput = {
      target,
      linkifier: this.#linkifier,
      stackTrace,
    };
    this.#view(input, {}, this.contentElement);
  }
}

export const MaxLengthForLinks = 40;
