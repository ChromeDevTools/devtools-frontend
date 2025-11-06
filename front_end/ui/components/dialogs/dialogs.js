var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/dialogs/ButtonDialog.js
var ButtonDialog_exports = {};
__export(ButtonDialog_exports, {
  ButtonDialog: () => ButtonDialog
});
import * as ComponentHelpers from "./../helpers/helpers.js";
import { Directives, html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/dialogs/buttonDialog.css.js
var buttonDialog_css_default = `/*
 * Copyright 2024 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  white-space: normal;
}

/*# sourceURL=${import.meta.resolve("./buttonDialog.css")} */`;

// gen/front_end/ui/components/dialogs/ButtonDialog.js
var { ref } = Directives;
var ButtonDialog = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #dialog = null;
  #showButton = null;
  #data = null;
  set data(data) {
    this.#data = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  #showDialog() {
    if (!this.#dialog) {
      throw new Error("Dialog not found");
    }
    if (this.#data?.state === "disabled") {
      void this.#dialog.setDialogVisible(false);
    } else {
      void this.#dialog.setDialogVisible(true);
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  #closeDialog(evt) {
    if (!this.#dialog) {
      throw new Error("Dialog not found");
    }
    void this.#dialog.setDialogVisible(false);
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
  set state(state) {
    if (this.#data) {
      this.#data.state = state;
      void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
  }
  #render() {
    if (!this.#data) {
      throw new Error("ButtonDialog.data is not set");
    }
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Button dialog render was not scheduled");
    }
    render(html`
      <style>${buttonDialog_css_default}</style>
      <devtools-button
        @click=${this.#showDialog}
        ${ref((el) => {
      if (el instanceof HTMLElement) {
        this.#showButton = el;
      }
    })}
        .data=${{
      variant: this.#data.variant,
      iconName: this.#data.iconName,
      disabled: this.#data.disabled,
      title: this.#data.iconTitle,
      jslogContext: this.#data.jslogContext
    }}
      ></devtools-button>
      <devtools-dialog
        @clickoutsidedialog=${this.#closeDialog}
        .origin=${() => {
      if (!this.#showButton) {
        throw new Error("Button not found");
      }
      return this.#showButton;
    }}
        .position=${this.#data.position ?? "bottom"}
        .horizontalAlignment=${this.#data.horizontalAlignment ?? "right"}
        .closeOnESC=${this.#data.closeOnESC ?? false}
        .closeOnScroll=${this.#data.closeOnScroll ?? false}
        .closeButton=${this.#data.closeButton ?? false}
        .dialogTitle=${this.#data.dialogTitle}
        .jslogContext=${this.#data.jslogContext ?? ""}
        .state=${this.#data.state ?? "expanded"}
        ${ref((el) => {
      if (el instanceof HTMLElement) {
        this.#dialog = el;
      }
    })}
      >
        <slot></slot>
      </devtools-dialog>
      `, this.#shadow, { host: this });
    if (this.#data.openOnRender) {
      this.#showDialog();
      this.#data.openOnRender = false;
    }
  }
};
customElements.define("devtools-button-dialog", ButtonDialog);

// gen/front_end/ui/components/dialogs/Dialog.js
var Dialog_exports = {};
__export(Dialog_exports, {
  AnimationEndedEvent: () => AnimationEndedEvent,
  CONNECTOR_HEIGHT: () => CONNECTOR_HEIGHT,
  ClickOutsideDialogEvent: () => ClickOutsideDialogEvent,
  DIALOG_PADDING_FROM_WINDOW: () => DIALOG_PADDING_FROM_WINDOW,
  DIALOG_SIDE_PADDING: () => DIALOG_SIDE_PADDING,
  DIALOG_VERTICAL_PADDING: () => DIALOG_VERTICAL_PADDING,
  Dialog: () => Dialog,
  ForcedDialogClose: () => ForcedDialogClose,
  MODAL: () => MODAL,
  PointerLeftDialogEvent: () => PointerLeftDialogEvent
});
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as ComponentHelpers2 from "./../helpers/helpers.js";
import * as RenderCoordinator from "./../render_coordinator/render_coordinator.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy/legacy.js";
import * as Buttons from "./../buttons/buttons.js";

// gen/front_end/ui/components/dialogs/dialog.css.js
var dialog_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  --override-transparent: rgb(0 0 0 / 0%);

  display: var(--dialog-display);
}

dialog::backdrop {
  background: var(--override-transparent);
}

dialog {
  background: transparent;
  border: none;
  top: var(--dialog-top);
  padding: var(--dialog-padding);
  left: var(--dialog-left);
  right: var(--dialog-right);
  margin: var(--dialog-margin);
  margin-left: var(--dialog-margin-left, 0);
  margin-bottom: var(--dialog-margin-bottom);
  animation-name: slideIn;
  animation-duration: 100ms;
  animation-timing-function: cubic-bezier(0, 0, 0.3, 1);
  overflow: hidden;
  filter: drop-shadow(0 4px 8px rgb(0 0 0 / 15%)) drop-shadow(0 1px 3px rgb(0 0 0 / 30%));
}

dialog:focus,
dialog:focus-visible {
  outline: none;
}

#content {
  min-width: var(--content-min-width);
  background: var(--color-background-elevation-dark-only);
  border-radius: var(--sys-size-5);
  max-height: var(--dialog-max-height);
  max-width: var(--dialog-max-width);
  overflow: auto;
  outline: none;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-8);

  &:empty {
    padding: 0;
    height: var(--sys-size-7);
  }

  .dialog-header-text {
    font: var(--sys-typescale-body2-medium);
    padding-top: var(--sys-size-3);
  }

  devtools-button {
    margin: 3px;
  }
}

.dialog-content {
  padding: 0 var(--sys-size-8) var(--sys-size-7) var(--sys-size-8);
  overflow: hidden;
}

@keyframes slideIn {
  from {
    transform: translateY(var(--dialog-offset-y));
    opacity: 0%;
  }

  to {
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./dialog.css")} */`;

// gen/front_end/ui/components/dialogs/Dialog.js
var { html: html2 } = Lit;
var UIStrings = {
  /**
   * @description Title of close button for the shortcuts dialog.
   */
  close: "Close"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/dialogs/Dialog.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var IS_DIALOG_SUPPORTED = "HTMLDialogElement" in globalThis;
var CONNECTOR_HEIGHT = 10;
var CONNECTOR_WIDTH = 2 * CONNECTOR_HEIGHT;
var DIALOG_ANIMATION_OFFSET = 20;
var DIALOG_SIDE_PADDING = 5;
var DIALOG_VERTICAL_PADDING = 3;
var DIALOG_PADDING_FROM_WINDOW = 3 * CONNECTOR_HEIGHT;
var MODAL = "MODAL";
var Dialog = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #forceDialogCloseInDevToolsBound = this.#forceDialogCloseInDevToolsMutation.bind(this);
  #handleScrollAttemptBound = this.#handleScrollAttempt.bind(this);
  #props = {
    origin: MODAL,
    position: "bottom",
    horizontalAlignment: "center",
    getConnectorCustomXPosition: null,
    dialogShownCallback: null,
    closeOnESC: true,
    closeOnScroll: true,
    closeButton: false,
    dialogTitle: "",
    jslogContext: "",
    state: "expanded"
  };
  #dialog = null;
  #isPendingShowDialog = false;
  #isPendingCloseDialog = false;
  #hitArea = new DOMRect(0, 0, 0, 0);
  #dialogClientRect = new DOMRect(0, 0, 0, 0);
  #bestVerticalPosition = null;
  #bestHorizontalAlignment = null;
  #devtoolsMutationObserver = new MutationObserver((mutations) => {
    if (this.#props.expectedMutationsSelector) {
      const allExcluded = mutations.every((mutation) => {
        return mutation.target instanceof Element && mutation.target.matches(this.#props.expectedMutationsSelector ?? "");
      });
      if (allExcluded) {
        return;
      }
    }
    this.#forceDialogCloseInDevToolsBound();
  });
  #dialogResizeObserver = new ResizeObserver(this.#updateDialogBounds.bind(this));
  #devToolsBoundingElement = UI.UIUtils.getDevToolsBoundingElement();
  // We bind here because we have to listen to keydowns on the entire window,
  // not on the Dialog element itself. This is because if the user has the
  // dialog open, but their focus is elsewhere, and they hit ESC, we should
  // still close the dialog.
  #onKeyDownBound = this.#onKeyDown.bind(this);
  get origin() {
    return this.#props.origin;
  }
  set origin(origin) {
    this.#props.origin = origin;
    this.#onStateChange();
  }
  set expectedMutationsSelector(mutationSelector) {
    this.#props.expectedMutationsSelector = mutationSelector;
  }
  get expectedMutationsSelector() {
    return this.#props.expectedMutationsSelector;
  }
  get position() {
    return this.#props.position;
  }
  set position(position) {
    this.#props.position = position;
    this.#onStateChange();
  }
  get horizontalAlignment() {
    return this.#props.horizontalAlignment;
  }
  set horizontalAlignment(alignment) {
    this.#props.horizontalAlignment = alignment;
    this.#onStateChange();
  }
  get bestVerticalPosition() {
    return this.#bestVerticalPosition;
  }
  get bestHorizontalAlignment() {
    return this.#bestHorizontalAlignment;
  }
  get getConnectorCustomXPosition() {
    return this.#props.getConnectorCustomXPosition;
  }
  set getConnectorCustomXPosition(connectorXPosition) {
    this.#props.getConnectorCustomXPosition = connectorXPosition;
    this.#onStateChange();
  }
  get dialogShownCallback() {
    return this.#props.dialogShownCallback;
  }
  get jslogContext() {
    return this.#props.jslogContext;
  }
  set dialogShownCallback(dialogShownCallback) {
    this.#props.dialogShownCallback = dialogShownCallback;
    this.#onStateChange();
  }
  set closeOnESC(closeOnESC) {
    this.#props.closeOnESC = closeOnESC;
    this.#onStateChange();
  }
  set closeOnScroll(closeOnScroll) {
    this.#props.closeOnScroll = closeOnScroll;
    this.#onStateChange();
  }
  set closeButton(closeButton) {
    this.#props.closeButton = closeButton;
    this.#onStateChange();
  }
  set dialogTitle(dialogTitle) {
    this.#props.dialogTitle = dialogTitle;
    this.#onStateChange();
  }
  set jslogContext(jslogContext) {
    this.#props.jslogContext = jslogContext;
    this.#onStateChange();
  }
  set state(state) {
    this.#props.state = state;
    if (this.#props.state === "collapsed" || this.#props.state === "disabled") {
      this.#forceDialogCloseInDevToolsBound();
    }
    this.#onStateChange();
  }
  #updateDialogBounds() {
    this.#dialogClientRect = this.#getDialog().getBoundingClientRect();
  }
  #onStateChange() {
    void ComponentHelpers2.ScheduledRender.scheduleRender(this, this.#render);
  }
  connectedCallback() {
    window.addEventListener("resize", this.#forceDialogCloseInDevToolsBound);
    this.#devtoolsMutationObserver.observe(this.#devToolsBoundingElement, { childList: true, subtree: true });
    this.#devToolsBoundingElement.addEventListener("wheel", this.#handleScrollAttemptBound);
    this.style.setProperty("--dialog-padding", "0");
    this.style.setProperty("--dialog-display", IS_DIALOG_SUPPORTED ? "block" : "none");
    this.style.setProperty("--override-dialog-content-border", `${CONNECTOR_HEIGHT}px solid transparent`);
    this.style.setProperty("--dialog-padding", `${DIALOG_VERTICAL_PADDING}px ${DIALOG_SIDE_PADDING}px`);
  }
  disconnectedCallback() {
    window.removeEventListener("resize", this.#forceDialogCloseInDevToolsBound);
    this.#devToolsBoundingElement.removeEventListener("wheel", this.#handleScrollAttemptBound);
    this.#devtoolsMutationObserver.disconnect();
    this.#dialogResizeObserver.disconnect();
  }
  #getDialog() {
    if (!this.#dialog) {
      this.#dialog = this.#shadow.querySelector("dialog");
      if (!this.#dialog) {
        throw new Error("Dialog not found");
      }
      this.#dialogResizeObserver.observe(this.#dialog);
    }
    return this.#dialog;
  }
  getHitArea() {
    return this.#hitArea;
  }
  async setDialogVisible(show) {
    if (show) {
      await this.#showDialog();
      return;
    }
    this.#closeDialog();
  }
  async #handlePointerEvent(evt) {
    evt.stopPropagation();
    if (evt instanceof PointerEvent && evt.pointerType === "") {
      return;
    }
    const eventWasInDialogContent = this.#mouseEventWasInDialogContent(evt);
    const eventWasInHitArea = this.#mouseEventWasInHitArea(evt);
    if (eventWasInDialogContent) {
      return;
    }
    if (evt.type === "pointermove") {
      if (eventWasInHitArea) {
        return;
      }
      this.dispatchEvent(new PointerLeftDialogEvent());
      return;
    }
    this.dispatchEvent(new ClickOutsideDialogEvent());
  }
  #animationEndedEvent() {
    this.dispatchEvent(new AnimationEndedEvent());
  }
  #mouseEventWasInDialogContent(evt) {
    const dialogBounds = this.#dialogClientRect;
    let animationOffSetValue = this.bestVerticalPosition === "bottom" ? DIALOG_ANIMATION_OFFSET : -1 * DIALOG_ANIMATION_OFFSET;
    if (this.#props.origin === MODAL) {
      animationOffSetValue = 0;
    }
    const eventWasDialogContentX = evt.pageX >= dialogBounds.left && evt.pageX <= dialogBounds.left + dialogBounds.width;
    const eventWasDialogContentY = evt.pageY >= dialogBounds.top + animationOffSetValue && evt.pageY <= dialogBounds.top + dialogBounds.height + animationOffSetValue;
    return eventWasDialogContentX && eventWasDialogContentY;
  }
  #mouseEventWasInHitArea(evt) {
    const hitAreaBounds = this.#hitArea;
    const eventWasInHitAreaX = evt.pageX >= hitAreaBounds.left && evt.pageX <= hitAreaBounds.left + hitAreaBounds.width;
    const eventWasInHitAreaY = evt.pageY >= hitAreaBounds.top && evt.pageY <= hitAreaBounds.top + hitAreaBounds.height;
    return eventWasInHitAreaX && eventWasInHitAreaY;
  }
  #getCoordinatesFromDialogOrigin(origin) {
    if (!origin || origin === MODAL) {
      throw new Error("Dialog origin is null");
    }
    const anchor = origin instanceof Function ? origin() : origin;
    if (anchor instanceof DOMPoint) {
      return { top: anchor.y, bottom: anchor.y, left: anchor.x, right: anchor.x };
    }
    if (anchor instanceof HTMLElement) {
      return anchor.getBoundingClientRect();
    }
    return anchor;
  }
  #getBestHorizontalAlignment(anchorBounds, devtoolsBounds) {
    if (devtoolsBounds.right - anchorBounds.left > anchorBounds.right - devtoolsBounds.left) {
      return "left";
    }
    return "right";
  }
  #getBestVerticalPosition(originBounds, dialogHeight, devtoolsBounds) {
    if (originBounds.bottom + dialogHeight > devtoolsBounds.height && originBounds.top - dialogHeight > devtoolsBounds.top) {
      return "top";
    }
    return "bottom";
  }
  #positionDialog() {
    if (!this.#props.origin) {
      return;
    }
    this.#isPendingShowDialog = true;
    void RenderCoordinator.read(() => {
      const devtoolsBounds = this.#devToolsBoundingElement.getBoundingClientRect();
      const devToolsWidth = devtoolsBounds.width;
      const devToolsHeight = devtoolsBounds.height;
      const devToolsLeft = devtoolsBounds.left;
      const devToolsTop = devtoolsBounds.top;
      const devToolsRight = devtoolsBounds.right;
      if (this.#props.origin === MODAL) {
        void RenderCoordinator.write(() => {
          this.style.setProperty("--dialog-top", `${devToolsTop}px`);
          this.style.setProperty("--dialog-left", `${devToolsLeft}px`);
          this.style.setProperty("--dialog-margin", "auto");
          this.style.setProperty("--dialog-margin-left", "auto");
          this.style.setProperty("--dialog-margin-bottom", "auto");
          this.style.setProperty("--dialog-max-height", `${devToolsHeight - DIALOG_PADDING_FROM_WINDOW}px`);
          this.style.setProperty("--dialog-max-width", `${devToolsWidth - DIALOG_PADDING_FROM_WINDOW}px`);
          this.style.setProperty("--dialog-right", `${document.body.clientWidth - devToolsRight}px`);
        });
        return;
      }
      const anchor = this.#props.origin;
      const absoluteAnchorBounds = this.#getCoordinatesFromDialogOrigin(anchor);
      const { top: anchorTop, right: anchorRight, bottom: anchorBottom, left: anchorLeft } = absoluteAnchorBounds;
      const originCenterX = (anchorLeft + anchorRight) / 2;
      const hitAreaWidth = anchorRight - anchorLeft + CONNECTOR_HEIGHT;
      const windowWidth = document.body.clientWidth;
      const connectorFixedXValue = this.#props.getConnectorCustomXPosition ? this.#props.getConnectorCustomXPosition() : originCenterX;
      void RenderCoordinator.write(() => {
        this.style.setProperty("--dialog-top", "0");
        const dialog2 = this.#getDialog();
        dialog2.style.visibility = "hidden";
        if (this.#isPendingShowDialog && !dialog2.hasAttribute("open")) {
          if (!dialog2.isConnected) {
            return;
          }
          dialog2.showModal();
          this.setAttribute("open", "");
          this.#isPendingShowDialog = false;
        }
        const { width: dialogWidth, height: dialogHeight } = dialog2.getBoundingClientRect();
        this.#bestHorizontalAlignment = this.#props.horizontalAlignment === "auto" ? this.#getBestHorizontalAlignment(absoluteAnchorBounds, devtoolsBounds) : this.#props.horizontalAlignment;
        this.#bestVerticalPosition = this.#props.position === "auto" ? this.#getBestVerticalPosition(absoluteAnchorBounds, dialogHeight, devtoolsBounds) : this.#props.position;
        if (this.#bestHorizontalAlignment === "auto" || this.#bestVerticalPosition === "auto") {
          return;
        }
        this.#hitArea.height = anchorBottom - anchorTop + CONNECTOR_HEIGHT;
        this.#hitArea.width = hitAreaWidth;
        this.style.setProperty("--content-min-width", `${connectorFixedXValue - anchorLeft + CONNECTOR_WIDTH + DIALOG_SIDE_PADDING * 2}px`);
        this.style.setProperty("--dialog-left", "auto");
        this.style.setProperty("--dialog-right", "auto");
        this.style.setProperty("--dialog-margin", "0");
        switch (this.#bestHorizontalAlignment) {
          case "left": {
            const dialogLeft = Math.max(anchorLeft, devToolsLeft);
            const devtoolsRightBorderToDialogLeft = devToolsRight - dialogLeft;
            const dialogMaxWidth = devtoolsRightBorderToDialogLeft - DIALOG_PADDING_FROM_WINDOW;
            this.style.setProperty("--dialog-left", `${dialogLeft}px`);
            this.#hitArea.x = anchorLeft;
            this.style.setProperty("--dialog-max-width", `${dialogMaxWidth}px`);
            break;
          }
          case "right": {
            const windowRightBorderToAnchorRight = windowWidth - anchorRight;
            const windowRightBorderToDevToolsRight = windowWidth - devToolsRight;
            const windowRightBorderToDialogRight = Math.max(windowRightBorderToAnchorRight, windowRightBorderToDevToolsRight);
            const dialogRight = windowWidth - windowRightBorderToDialogRight;
            const devtoolsLeftBorderToDialogRight = dialogRight - devToolsLeft;
            const dialogMaxWidth = devtoolsLeftBorderToDialogRight - DIALOG_PADDING_FROM_WINDOW;
            this.#hitArea.x = windowWidth - windowRightBorderToDialogRight - hitAreaWidth;
            this.style.setProperty("--dialog-right", `${windowRightBorderToDialogRight}px`);
            this.style.setProperty("--dialog-max-width", `${dialogMaxWidth}px`);
            break;
          }
          case "center": {
            const dialogCappedWidth = Math.min(devToolsWidth - DIALOG_PADDING_FROM_WINDOW, dialogWidth);
            let dialogLeft = Math.max(originCenterX - dialogCappedWidth * 0.5, devToolsLeft);
            dialogLeft = Math.min(dialogLeft, devToolsRight - dialogCappedWidth);
            this.style.setProperty("--dialog-left", `${dialogLeft}px`);
            this.#hitArea.x = originCenterX - hitAreaWidth * 0.5;
            this.style.setProperty("--dialog-max-width", `${devToolsWidth - DIALOG_PADDING_FROM_WINDOW}px`);
            break;
          }
          default:
            Platform.assertNever(this.#bestHorizontalAlignment, `Unknown alignment type: ${this.#bestHorizontalAlignment}`);
        }
        switch (this.#bestVerticalPosition) {
          case "top": {
            this.style.setProperty("--dialog-top", "0");
            this.style.setProperty("--dialog-margin", "auto");
            this.style.setProperty("--dialog-margin-bottom", `${innerHeight - anchorTop}px`);
            this.#hitArea.y = anchorTop - CONNECTOR_HEIGHT;
            this.style.setProperty("--dialog-offset-y", `${DIALOG_ANIMATION_OFFSET}px`);
            this.style.setProperty("--dialog-max-height", `${devToolsHeight - (innerHeight - anchorTop) - DIALOG_PADDING_FROM_WINDOW}px`);
            break;
          }
          case "bottom": {
            this.style.setProperty("--dialog-top", `${anchorBottom}px`);
            this.#hitArea.y = anchorTop;
            this.style.setProperty("--dialog-offset-y", `-${DIALOG_ANIMATION_OFFSET}px`);
            this.style.setProperty("--dialog-max-height", `${devToolsHeight - (anchorBottom - devToolsTop) - DIALOG_PADDING_FROM_WINDOW}px`);
            break;
          }
          default:
            Platform.assertNever(this.#bestVerticalPosition, `Unknown position type: ${this.#bestVerticalPosition}`);
        }
        dialog2.close();
        dialog2.style.visibility = "";
      });
    });
  }
  async #showDialog() {
    if (!IS_DIALOG_SUPPORTED) {
      return;
    }
    if (this.#isPendingShowDialog || this.hasAttribute("open")) {
      return;
    }
    this.#isPendingShowDialog = true;
    this.#positionDialog();
    await RenderCoordinator.done();
    this.#isPendingShowDialog = false;
    const dialog2 = this.#getDialog();
    if (!dialog2.isConnected) {
      return;
    }
    if (!dialog2.hasAttribute("open")) {
      dialog2.showModal();
    }
    if (this.#props.dialogShownCallback) {
      await this.#props.dialogShownCallback();
    }
    this.#updateDialogBounds();
    document.body.addEventListener("keydown", this.#onKeyDownBound);
  }
  #handleScrollAttempt(event) {
    if (this.#mouseEventWasInDialogContent(event) || !this.#props.closeOnScroll || !this.#getDialog().hasAttribute("open")) {
      return;
    }
    this.#closeDialog();
    this.dispatchEvent(new ForcedDialogClose());
  }
  #onKeyDown(event) {
    if (!this.#getDialog().hasAttribute("open") || !this.#props.closeOnESC) {
      return;
    }
    if (event.key !== Platform.KeyboardUtilities.ESCAPE_KEY) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.#closeDialog();
    this.dispatchEvent(new ForcedDialogClose());
  }
  #onCancel(event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.#getDialog().hasAttribute("open") || !this.#props.closeOnESC) {
      return;
    }
    this.dispatchEvent(new ForcedDialogClose());
  }
  #forceDialogCloseInDevToolsMutation() {
    if (!this.#dialog?.hasAttribute("open")) {
      return;
    }
    if (this.#devToolsBoundingElement === document.body) {
      return;
    }
    this.#closeDialog();
    this.dispatchEvent(new ForcedDialogClose());
  }
  #closeDialog() {
    if (this.#isPendingCloseDialog || !this.#getDialog().hasAttribute("open")) {
      return;
    }
    this.#isPendingCloseDialog = true;
    void RenderCoordinator.write(() => {
      this.#hitArea.width = 0;
      this.removeAttribute("open");
      this.#getDialog().close();
      this.#isPendingCloseDialog = false;
      document.body.removeEventListener("keydown", this.#onKeyDownBound);
    });
  }
  getDialogBounds() {
    return this.#dialogClientRect;
  }
  #renderHeaderRow() {
    if (!this.#props.dialogTitle && !this.#props.closeButton) {
      return null;
    }
    return html2`
        <span class="dialog-header-text">${this.#props.dialogTitle}</span>
        ${this.#props.closeButton ? html2`
          <devtools-button
            @click=${this.#closeDialog}
            .data=${{
      variant: "toolbar",
      iconName: "cross",
      title: i18nString(UIStrings.close),
      size: "SMALL"
    }}
            jslog=${VisualLogging.close().track({ click: true })}
          ></devtools-button>
        ` : Lit.nothing}
    `;
  }
  #render() {
    if (!ComponentHelpers2.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Dialog render was not scheduled");
    }
    if (!IS_DIALOG_SUPPORTED) {
      Lit.render(
        // clang-format off
        html2`
        <slot></slot>
      `,
        this.#shadow,
        { host: this }
      );
      return;
    }
    let dialogContent = Lit.nothing;
    if (this.#props.state === "expanded") {
      dialogContent = html2`
    <div id="content">
          <div class="dialog-header">${this.#renderHeaderRow()}</div>
          <div class='dialog-content'>
            <slot></slot>
          </div>
    </div>
    `;
    }
    Lit.render(html2`
      <style>${dialog_css_default}</style>
      <dialog @click=${this.#handlePointerEvent} @pointermove=${this.#handlePointerEvent} @cancel=${this.#onCancel} @animationend=${this.#animationEndedEvent}
              jslog=${VisualLogging.dialog(this.#props.jslogContext).track({ resize: true, keydown: "Escape" }).parent("mapped")}>
        ${dialogContent}
      </dialog>
    `, this.#shadow, { host: this });
    VisualLogging.setMappedParent(this.#getDialog(), this.parentElementOrShadowHost());
  }
  setBoundingElementForTesting(element) {
    this.#devToolsBoundingElement = element;
    this.#onStateChange();
  }
};
customElements.define("devtools-dialog", Dialog);
var PointerLeftDialogEvent = class _PointerLeftDialogEvent extends Event {
  static eventName = "pointerleftdialog";
  constructor() {
    super(_PointerLeftDialogEvent.eventName, { bubbles: true, composed: true });
  }
};
var ClickOutsideDialogEvent = class _ClickOutsideDialogEvent extends Event {
  static eventName = "clickoutsidedialog";
  constructor() {
    super(_ClickOutsideDialogEvent.eventName, { bubbles: true, composed: true });
  }
};
var AnimationEndedEvent = class _AnimationEndedEvent extends Event {
  static eventName = "animationended";
  constructor() {
    super(_AnimationEndedEvent.eventName, { bubbles: true, composed: true });
  }
};
var ForcedDialogClose = class _ForcedDialogClose extends Event {
  static eventName = "forceddialogclose";
  constructor() {
    super(_ForcedDialogClose.eventName, { bubbles: true, composed: true });
  }
};

// gen/front_end/ui/components/dialogs/ShortcutDialog.js
var ShortcutDialog_exports = {};
__export(ShortcutDialog_exports, {
  ShortcutDialog: () => ShortcutDialog
});
import * as i18n3 from "./../../../core/i18n/i18n.js";
import * as Buttons2 from "./../buttons/buttons.js";
import * as ComponentHelpers3 from "./../helpers/helpers.js";
import { html as html3, nothing as nothing2, render as render3 } from "./../../lit/lit.js";

// gen/front_end/ui/components/dialogs/shortcutDialog.css.js
var shortcutDialog_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.keybinds-list {
  display: flex;
  flex-direction: column;
  /* overwrite default\\'margin\\' and \\'padding\\' for the <ul> element */
  margin: 0;
  padding: 0;
}

.keybinds-list-item {
  display: block;
  min-width: 315px;
  align-items: baseline;
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
  padding: var(--sys-size-4) 0;
  position: relative;


  &:last-of-type {
    border-bottom: unset;
  }

  .keybinds-list-title {
    /* Put the list title absolute so it is out the flow, this enables the
     * shortcuts to sit on the same row as the title */
    position: absolute;
    top: var(--sys-size-4);
    left: 0;
    /* Put the text vertically central so it aligns with the shortcuts shown  */
    display: flex;
    align-items: center;
    height: var(--sys-size-11); /* IMPORTANT: this has to be the same height as .keybinds-key to maintain text alignment */
  }
}

.row-container {
  display: flex;
  gap: var(--sys-size-5);
  align-items: center;

  .keybinds-join-text, .footnote {
    color: var(--sys-color-on-surface-subtle);
  }

  .footnote {
    display: block;
    height: 15px;
  }
}

.shortcuts-for-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sys-size-3);
}

.nav-radio-buttons {
  display: flex;
  flex-direction: column;
  border-bottom: var(--sys-size-1) solid var(--sys-color-divider);
  padding-bottom: var(--sys-size-5);

  & label {
    display: flex;
    font: var(--sys-typescale-body3-regular);
    gap: var(--sys-size-2);
  }

  input[type="radio"] {
    margin-left: 0;
  }
}

.keybinds-key {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: var(--sys-size-4);
  min-width: var(--sys-size-11);
  height: var(--sys-size-11);
  font: var(--sys-typescale-body5-medium);
  white-space: nowrap;
  border-radius: var(--sys-shape-corner-small);
  background: var(--sys-color-base-container);
}

/*# sourceURL=${import.meta.resolve("./shortcutDialog.css")} */`;

// gen/front_end/ui/components/dialogs/ShortcutDialog.js
var UIStrings2 = {
  /**
   * @description Title of question mark button for the shortcuts dialog.
   */
  showShortcutTitle: "Show shortcuts",
  /**
   * @description Title of the keyboard shortcuts help menu.
   */
  dialogTitle: "Keyboard shortcuts"
};
var str_2 = i18n3.i18n.registerUIStrings("ui/components/dialogs/ShortcutDialog.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var ShortcutDialog = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #shortcuts = [];
  #openOnRender = false;
  #customTitle;
  #prependedElement = null;
  get data() {
    return {
      shortcuts: this.#shortcuts,
      open: this.#openOnRender,
      customTitle: this.#customTitle
    };
  }
  set data(data) {
    this.#shortcuts = data.shortcuts;
    if (data.open) {
      this.#openOnRender = data.open;
    }
    if (data.customTitle) {
      this.#customTitle = data.customTitle;
    }
    void ComponentHelpers3.ScheduledRender.scheduleRender(this, this.#render);
  }
  prependElement(element) {
    this.#prependedElement = element;
  }
  #renderRow(row) {
    if (!Array.isArray(row)) {
      return html3`<span class="footnote">${row.footnote}</span>`;
    }
    return html3`${row.map((part) => {
      if ("key" in part) {
        return html3`<span class="keybinds-key">${part.key}</span>`;
      }
      return html3`<span class="keybinds-join-text">${part.joinText}</span>`;
    })}
    `;
  }
  #render() {
    if (!ComponentHelpers3.ScheduledRender.isScheduledRender(this)) {
      throw new Error("Shortcut dialog render was not scheduled");
    }
    render3(html3`
      <style>${shortcutDialog_css_default}</style>
      <devtools-button-dialog .data=${{
      openOnRender: this.#openOnRender,
      closeButton: true,
      dialogTitle: this.#customTitle ?? i18nString2(UIStrings2.dialogTitle),
      variant: "toolbar",
      iconName: "help",
      iconTitle: i18nString2(UIStrings2.showShortcutTitle)
    }}>
        <ul class="keybinds-list">
          ${this.#prependedElement ? html3`${this.#prependedElement}` : nothing2}
          ${this.#shortcuts.map((shortcut) => html3`
              <li class="keybinds-list-item">
                <div class="keybinds-list-title">${shortcut.title}</div>
                <div class="shortcuts-for-actions">
                  ${shortcut.rows.map((row) => {
      return html3`<div class="row-container">${this.#renderRow(row)}</div>
                  `;
    })}
                </div>
              </li>`)}
        </ul>
      </devtools-button-dialog>
      `, this.#shadow, { host: this });
  }
};
customElements.define("devtools-shortcut-dialog", ShortcutDialog);
export {
  ButtonDialog_exports as ButtonDialog,
  Dialog_exports as Dialog,
  ShortcutDialog_exports as ShortcutDialog
};
//# sourceMappingURL=dialogs.js.map
