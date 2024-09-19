// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as WindowBoundsService from '../../../services/window_bounds/window_bounds.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import dialogStyles from './dialog.css.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const IS_DIALOG_SUPPORTED = 'HTMLDialogElement' in globalThis;

// Height in pixels of the dialog's connector. The connector is represented as
// as a diamond and the height corresponds to half the height of the diamond.
// (the visible height is only half of the diamond).
export const CONNECTOR_HEIGHT = 10;
const CONNECTOR_WIDTH = 2 * CONNECTOR_HEIGHT;

// The offset used by the dialog's animation as it slides in when opened.
const DIALOG_ANIMATION_OFFSET = 20;

export const DIALOG_SIDE_PADDING = 5;
export const DIALOG_VERTICAL_PADDING = 3;

// If the content of the dialog cannot be completely shown because otherwise
// the dialog would overflow the window, the dialog's max width and height are
// set such that the dialog remains inside the visible bounds. In this cases
// some extra, determined by this constant, is added so that the dialog's borders
// remain clearly visible. This constant accounts for the padding of the dialog's
// content (20 px) and a 5px gap left on each extreme of the dialog from the viewport.
export const DIALOG_PADDING_FROM_WINDOW = 3 * CONNECTOR_HEIGHT;
interface DialogData {
  /**
   * Position or point the dialog is shown relative to.
   * If the dialog instance will be shown as a modal, set
   * this property to MODAL.
   */
  origin: DialogOrigin;
  position: DialogVerticalPosition;
  /**
   * Horizontal alignment of the dialg with respect to its origin.
   * Center by default.
   */
  horizontalAlignment: DialogHorizontalAlignment;
  /**
   * Whether the connector from the dialog to its origin is shown.
   */
  showConnector: boolean;

  /**
   * Optional function used to the determine the x coordinate of the connector's
   * end (tip of the triangle), relative to the viewport. If not defined, the x
   * coordinate of the origin's center is used instead.
   */
  getConnectorCustomXPosition: (() => number)|null;

  /**
   * Optional function called when the dialog is shown.
   */
  dialogShownCallback: (() => unknown)|null;

  /**
   * Optional. Service that provides the window dimensions used for positioning the Dialog.
   */
  windowBoundsService: WindowBoundsService.WindowBoundsService.WindowBoundsService;
  /**
   * Whether the dialog is closed when the 'Escape' key is pressed. When true, the event is
   * propagation is stopped.
   */
  closeOnESC: boolean;
  /**
   * Whether the dialog is closed when a scroll event is detected outside of the dialog's
   * content. Defaults to true.
   */
  closeOnScroll: boolean;
  /**
   * Specifies a context for the visual element.
   */
  jslogContext: string;
}

type DialogAnchor = HTMLElement|DOMRect|DOMPoint;

export const MODAL = 'MODAL';

export type DialogOrigin = DialogAnchor|null|(() => DialogAnchor)|typeof MODAL;
export class Dialog extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-dialog`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);
  readonly #forceDialogCloseInDevToolsBound = this.#forceDialogCloseInDevToolsMutation.bind(this);
  readonly #handleScrollAttemptBound = this.#handleScrollAttempt.bind(this);
  readonly #props: DialogData = {
    origin: MODAL,
    position: DialogVerticalPosition.BOTTOM,
    horizontalAlignment: DialogHorizontalAlignment.CENTER,
    showConnector: false,
    getConnectorCustomXPosition: null,
    dialogShownCallback: null,
    windowBoundsService: WindowBoundsService.WindowBoundsService.WindowBoundsServiceImpl.instance(),
    closeOnESC: true,
    closeOnScroll: true,
    jslogContext: '',
  };

  #dialog: HTMLDialogElement|null = null;
  #isPendingShowDialog = false;
  #isPendingCloseDialog = false;
  #hitArea = new DOMRect(0, 0, 0, 0);
  #dialogClientRect = new DOMRect(0, 0, 0, 0);
  #bestVerticalPositionInternal: DialogVerticalPosition|null = null;
  #bestHorizontalAlignment: DialogHorizontalAlignment|null = null;
  readonly #devtoolsMutationObserver = new MutationObserver(this.#forceDialogCloseInDevToolsBound);
  readonly #dialogResizeObserver = new ResizeObserver(this.#updateDialogBounds.bind(this));
  #devToolsBoundingElement = this.windowBoundsService.getDevToolsBoundingElement();

  // We bind here because we have to listen to keydowns on the entire window,
  // not on the Dialog element itself. This is because if the user has the
  // dialog open, but their focus is elsewhere, and they hit ESC, we should
  // still close the dialog.
  #onKeyDownBound = this.#onKeyDown.bind(this);

  get showConnector(): boolean {
    return this.#props.showConnector;
  }

  set showConnector(showConnector: boolean) {
    this.#props.showConnector = showConnector;
    this.#onStateChange();
  }

  get origin(): DialogOrigin {
    return this.#props.origin;
  }

  set origin(origin: DialogOrigin) {
    this.#props.origin = origin;
    this.#onStateChange();
  }

  get position(): DialogVerticalPosition {
    return this.#props.position;
  }

  set position(position: DialogVerticalPosition) {
    this.#props.position = position;
    this.#onStateChange();
  }

  get horizontalAlignment(): DialogHorizontalAlignment {
    return this.#props.horizontalAlignment;
  }

  set horizontalAlignment(alignment: DialogHorizontalAlignment) {
    this.#props.horizontalAlignment = alignment;
    this.#onStateChange();
  }

  get windowBoundsService(): WindowBoundsService.WindowBoundsService.WindowBoundsService {
    return this.#props.windowBoundsService;
  }

  set windowBoundsService(windowBoundsService: WindowBoundsService.WindowBoundsService.WindowBoundsService) {
    this.#props.windowBoundsService = windowBoundsService;
    this.#devToolsBoundingElement = this.windowBoundsService.getDevToolsBoundingElement();
    this.#onStateChange();
  }

  get bestVerticalPosition(): DialogVerticalPosition|null {
    return this.#bestVerticalPositionInternal;
  }

  get bestHorizontalAlignment(): DialogHorizontalAlignment|null {
    return this.#bestHorizontalAlignment;
  }
  get getConnectorCustomXPosition(): (() => number)|null {
    return this.#props.getConnectorCustomXPosition;
  }

  set getConnectorCustomXPosition(connectorXPosition: (() => number)|null) {
    this.#props.getConnectorCustomXPosition = connectorXPosition;
    this.#onStateChange();
  }

  get dialogShownCallback(): (() => unknown)|null {
    return this.#props.dialogShownCallback;
  }

  get jslogContext(): string {
    return this.#props.jslogContext;
  }

  set dialogShownCallback(dialogShownCallback: (() => unknown)|null) {
    this.#props.dialogShownCallback = dialogShownCallback;
    this.#onStateChange();
  }

  set closeOnESC(closeOnESC: boolean) {
    this.#props.closeOnESC = closeOnESC;
    this.#onStateChange();
  }

  set closeOnScroll(closeOnScroll: boolean) {
    this.#props.closeOnScroll = closeOnScroll;
    this.#onStateChange();
  }

  set jslogContext(jslogContext: string) {
    this.#props.jslogContext = jslogContext;
    this.#onStateChange();
  }

  #updateDialogBounds(): void {
    this.#dialogClientRect = this.#getDialog().getBoundingClientRect();
  }

  #onStateChange(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [dialogStyles];

    window.addEventListener('resize', this.#forceDialogCloseInDevToolsBound);
    this.#devtoolsMutationObserver.observe(this.#devToolsBoundingElement, {childList: true, subtree: true});
    this.#devToolsBoundingElement.addEventListener('wheel', this.#handleScrollAttemptBound);
    this.style.setProperty('--dialog-padding', '0');
    this.style.setProperty('--override-content-box-shadow', 'none');
    this.style.setProperty('--dialog-display', IS_DIALOG_SUPPORTED ? 'block' : 'none');
    this.style.setProperty('--override-dialog-content-border', `${CONNECTOR_HEIGHT}px solid transparent`);
    this.style.setProperty('--dialog-padding', `${DIALOG_VERTICAL_PADDING}px ${DIALOG_SIDE_PADDING}px`);
  }

  disconnectedCallback(): void {
    window.removeEventListener('resize', this.#forceDialogCloseInDevToolsBound);

    this.#devToolsBoundingElement.removeEventListener('wheel', this.#handleScrollAttemptBound);
    this.#devtoolsMutationObserver.disconnect();
    this.#dialogResizeObserver.disconnect();
  }

  #getDialog(): HTMLDialogElement {
    if (!this.#dialog) {
      this.#dialog = this.#shadow.querySelector('dialog');
      if (!this.#dialog) {
        throw new Error('Dialog not found');
      }
      this.#dialogResizeObserver.observe(this.#dialog);
    }
    return this.#dialog;
  }

  getHitArea(): DOMRect {
    return this.#hitArea;
  }

  async setDialogVisible(show: boolean): Promise<void> {
    if (show) {
      await this.#showDialog();
      return;
    }
    this.#closeDialog();
  }

  async #handlePointerEvent(evt: MouseEvent|PointerEvent): Promise<void> {
    evt.stopPropagation();
    // If the user uses the keyboard to interact with an element within the
    // dialog, it will trigger a pointer event (for example, the user might use
    // their spacebar to "click" on a form input element). In that case the
    // pointerType will be an empty string, rather than `mouse`, `pen` or
    // `touch`. In this instance, we early return, because we only need to
    // worry about clicks outside of the dialog. Once the dialog is open, the
    // user can only use the keyboard to navigate within the dialog; so we
    // don't have to concern ourselves with keyboard events that occur outside
    // the dialog's bounds.
    if (evt instanceof PointerEvent && evt.pointerType === '') {
      return;
    }

    const eventWasInDialogContent = this.#mouseEventWasInDialogContent(evt);
    const eventWasInHitArea = this.#mouseEventWasInHitArea(evt);
    if (eventWasInDialogContent) {
      return;
    }
    if (evt.type === 'pointermove') {
      if (eventWasInHitArea) {
        return;
      }
      this.dispatchEvent(new PointerLeftDialogEvent());
      return;
    }
    this.dispatchEvent(new ClickOutsideDialogEvent());
  }

  #mouseEventWasInDialogContent(evt: MouseEvent): boolean {
    const dialogBounds = this.#dialogClientRect;

    let animationOffSetValue = this.bestVerticalPosition === DialogVerticalPosition.BOTTOM ?
        DIALOG_ANIMATION_OFFSET :
        -1 * DIALOG_ANIMATION_OFFSET;
    if (this.#props.origin === MODAL) {
      // When shown as a modal, the dialog is not animated
      animationOffSetValue = 0;
    }
    const eventWasDialogContentX =
        evt.pageX >= dialogBounds.left && evt.pageX <= dialogBounds.left + dialogBounds.width;
    const eventWasDialogContentY = evt.pageY >= dialogBounds.top + animationOffSetValue &&
        evt.pageY <= dialogBounds.top + dialogBounds.height + animationOffSetValue;

    return eventWasDialogContentX && eventWasDialogContentY;
  }

  #mouseEventWasInHitArea(evt: MouseEvent): boolean {
    const hitAreaBounds = this.#hitArea;
    const eventWasInHitAreaX = evt.pageX >= hitAreaBounds.left && evt.pageX <= hitAreaBounds.left + hitAreaBounds.width;
    const eventWasInHitAreaY = evt.pageY >= hitAreaBounds.top && evt.pageY <= hitAreaBounds.top + hitAreaBounds.height;

    return eventWasInHitAreaX && eventWasInHitAreaY;
  }

  #getCoordinatesFromDialogOrigin(origin: DialogOrigin): AnchorBounds {
    if (!origin || origin === MODAL) {
      throw new Error('Dialog origin is null');
    }
    const anchor = origin instanceof Function ? origin() : origin;
    if (anchor instanceof DOMPoint) {
      return {top: anchor.y, bottom: anchor.y, left: anchor.x, right: anchor.x};
    }
    if (anchor instanceof HTMLElement) {
      return anchor.getBoundingClientRect();
    }
    return anchor;
  }

  #getBestHorizontalAlignment(anchorBounds: AnchorBounds, devtoolsBounds: DOMRect): DialogHorizontalAlignment {
    if (devtoolsBounds.right - anchorBounds.left > anchorBounds.right - devtoolsBounds.left) {
      return DialogHorizontalAlignment.LEFT;
    }
    return DialogHorizontalAlignment.RIGHT;
  }

  #getBestVerticalPosition(originBounds: AnchorBounds, dialogHeight: number, devtoolsBounds: DOMRect):
      DialogVerticalPosition {
    // If the dialog's full height doesn't fit at the bottom attempt to
    // position it at the top. If it doesn't fit at the top either
    // position it at the bottom and make the overflow scrollable.
    if (originBounds.bottom + dialogHeight > devtoolsBounds.height &&
        originBounds.top - dialogHeight > devtoolsBounds.top) {
      return DialogVerticalPosition.TOP;
    }
    return DialogVerticalPosition.BOTTOM;
  }

  #positionDialog(): void {
    if (!this.#props.origin) {
      return;
    }

    this.#isPendingShowDialog = true;
    void coordinator.read(() => {
      // Fixed elements are positioned relative to the window, regardless if
      // DevTools is docked. As such, if DevTools is docked we must account for
      // its offset relative to the window when positioning fixed elements.
      // DevTools' effective offset can be determined using
      // this.#devToolsBoundingElement.
      const devtoolsBounds = this.#devToolsBoundingElement.getBoundingClientRect();
      const devToolsWidth = devtoolsBounds.width;
      const devToolsHeight = devtoolsBounds.height;
      const devToolsLeft = devtoolsBounds.left;
      const devToolsTop = devtoolsBounds.top;
      const devToolsRight = devtoolsBounds.right;
      if (this.#props.origin === MODAL) {
        void coordinator.write(() => {
          this.style.setProperty('--dialog-top', `${devToolsTop}px`);
          this.style.setProperty('--dialog-left', `${devToolsLeft}px`);
          this.style.setProperty('--dialog-margin', 'auto');
          this.style.setProperty('--dialog-margin-left', 'auto');
          this.style.setProperty('--dialog-margin-bottom', 'auto');
          this.style.setProperty('--dialog-max-height', `${devToolsHeight - DIALOG_PADDING_FROM_WINDOW}px`);
          this.style.setProperty('--dialog-max-width', `${devToolsWidth - DIALOG_PADDING_FROM_WINDOW}px`);
          this.style.setProperty('--dialog-right', `${document.body.clientWidth - devToolsRight}px`);
        });
        return;
      }
      const anchor = this.#props.origin;
      const absoluteAnchorBounds = this.#getCoordinatesFromDialogOrigin(anchor);
      const {top: anchorTop, right: anchorRight, bottom: anchorBottom, left: anchorLeft} = absoluteAnchorBounds;
      const originCenterX = (anchorLeft + anchorRight) / 2;
      const hitAreaWidth = anchorRight - anchorLeft + CONNECTOR_HEIGHT;
      const windowWidth = document.body.clientWidth;
      const connectorFixedXValue =
          this.#props.getConnectorCustomXPosition ? this.#props.getConnectorCustomXPosition() : originCenterX;
      void coordinator.write(() => {
        this.style.setProperty('--dialog-top', '0');

        // Start by showing the dialog hidden to allow measuring its width.
        const dialog = this.#getDialog();
        dialog.style.visibility = 'hidden';
        if (this.#isPendingShowDialog && !dialog.hasAttribute('open')) {
          dialog.showModal();
          this.setAttribute('open', '');
          this.#isPendingShowDialog = false;
        }
        const {width: dialogWidth, height: dialogHeight} = dialog.getBoundingClientRect();
        this.#bestHorizontalAlignment = this.#props.horizontalAlignment === DialogHorizontalAlignment.AUTO ?
            this.#getBestHorizontalAlignment(absoluteAnchorBounds, devtoolsBounds) :
            this.#props.horizontalAlignment;

        this.#bestVerticalPositionInternal = this.#props.position === DialogVerticalPosition.AUTO ?
            this.#getBestVerticalPosition(absoluteAnchorBounds, dialogHeight, devtoolsBounds) :
            this.#props.position;
        if (this.#bestHorizontalAlignment === DialogHorizontalAlignment.AUTO ||
            this.#bestVerticalPositionInternal === DialogVerticalPosition.AUTO) {
          return;
        }
        this.#hitArea.height = anchorBottom - anchorTop + (CONNECTOR_HEIGHT * (this.showConnector ? 2 : 1));
        this.#hitArea.width = hitAreaWidth;
        let connectorRelativeXValue = 0;
        // If the connector is to be shown, the dialog needs a minimum width such that it covers
        // the connector's width.
        this.style.setProperty(
            '--content-min-width',
            `${connectorFixedXValue - anchorLeft + CONNECTOR_WIDTH + DIALOG_SIDE_PADDING * 2}px`);
        this.style.setProperty('--dialog-left', 'auto');
        this.style.setProperty('--dialog-right', 'auto');
        this.style.setProperty('--dialog-margin', '0');
        const offsetToCoverConnector = this.showConnector ? CONNECTOR_WIDTH * 3 / 4 : 0;
        switch (this.#bestHorizontalAlignment) {
          case DialogHorizontalAlignment.LEFT: {
            // Position the dialog such that its left border is in line with that of its anchor.
            // If this means the dialog's left border is out of DevTools bounds, move it to the right.
            // Cap its width as needed so that the right border doesn't overflow.
            const dialogLeft = Math.max(anchorLeft - offsetToCoverConnector, devToolsLeft);
            const devtoolsRightBorderToDialogLeft = devToolsRight - dialogLeft;
            const dialogMaxWidth = devtoolsRightBorderToDialogLeft - DIALOG_PADDING_FROM_WINDOW;
            connectorRelativeXValue = connectorFixedXValue - dialogLeft - DIALOG_SIDE_PADDING;
            this.style.setProperty('--dialog-left', `${dialogLeft}px`);
            this.#hitArea.x = anchorLeft;
            this.style.setProperty('--dialog-max-width', `${dialogMaxWidth}px`);
            break;
          }
          case DialogHorizontalAlignment.RIGHT: {
            // Position the dialog such that its right border is in line with that of its anchor.
            // If this means the dialog's right border is out of DevTools bounds, move it to the left.
            // Cap its width as needed so that the left border doesn't overflow.
            const windowRightBorderToAnchorRight = windowWidth - anchorRight;
            const windowRightBorderToDevToolsRight = windowWidth - devToolsRight;
            const windowRightBorderToDialogRight =
                Math.max(windowRightBorderToAnchorRight - offsetToCoverConnector, windowRightBorderToDevToolsRight);

            const dialogRight = windowWidth - windowRightBorderToDialogRight;
            const devtoolsLeftBorderToDialogRight = dialogRight - devToolsLeft;
            const dialogMaxWidth = devtoolsLeftBorderToDialogRight - DIALOG_PADDING_FROM_WINDOW;
            const dialogCappedWidth = Math.min(dialogMaxWidth, dialogWidth);

            const dialogLeft = dialogRight - dialogCappedWidth;
            connectorRelativeXValue = connectorFixedXValue - dialogLeft;

            this.#hitArea.x = windowWidth - windowRightBorderToDialogRight - hitAreaWidth;
            this.style.setProperty('--dialog-right', `${windowRightBorderToDialogRight}px`);
            this.style.setProperty('--dialog-max-width', `${dialogMaxWidth}px`);
            break;
          }
          case DialogHorizontalAlignment.CENTER: {
            // Position the dialog aligned with its anchor's center as long as its borders don't overlap
            // with those of DevTools. In case one border overlaps, move the dialog to the opposite side.
            // In case both borders overlap, reduce its width to that of DevTools.
            const dialogCappedWidth = Math.min(devToolsWidth - DIALOG_PADDING_FROM_WINDOW, dialogWidth);

            let dialogLeft = Math.max(originCenterX - dialogCappedWidth * 0.5, devToolsLeft);
            dialogLeft = Math.min(dialogLeft, devToolsRight - dialogCappedWidth);
            connectorRelativeXValue = connectorFixedXValue - dialogLeft - DIALOG_SIDE_PADDING;
            this.style.setProperty('--dialog-left', `${dialogLeft}px`);
            this.#hitArea.x = originCenterX - hitAreaWidth * 0.5;
            this.style.setProperty('--dialog-max-width', `${devToolsWidth - DIALOG_PADDING_FROM_WINDOW}px`);
            break;
          }
          default:
            Platform.assertNever(
                this.#bestHorizontalAlignment, `Unknown alignment type: ${this.#bestHorizontalAlignment}`);
        }
        const visibleConnectorHeight = this.showConnector ? CONNECTOR_HEIGHT : 0;
        const clipPathConnectorStartX = connectorRelativeXValue - CONNECTOR_WIDTH / 2;
        const clipPathConnectorEndX = connectorRelativeXValue + CONNECTOR_WIDTH / 2;
        let [p1, p2, p3, p4, p5, p6, p7, p8, p9] = ['', '', '', '', '', '', '', '', '', ''];

        const PSEUDO_BORDER_RADIUS = 2;
        switch (this.#bestVerticalPositionInternal) {
          case DialogVerticalPosition.TOP: {
            //  p1                              p2
            //   *-----------------------------*
            //   |                             |
            //   |                             |
            // p9|                             |
            //    \__________________p7  p5____/ p3 <-- A pseudo curve is added to the clip path to
            //  p8                     \/      p4        imitate a curved boder.
            //                         p6
            //   |-connectorRelativeX--|
            const clipPathBottom = `calc(100% - ${CONNECTOR_HEIGHT}px)`;
            if (this.#props.showConnector) {
              p1 = '0 0';
              p2 = '100% 0';
              p3 = `100% calc(${clipPathBottom} - ${PSEUDO_BORDER_RADIUS}px)`;
              p4 = `calc(100% - ${PSEUDO_BORDER_RADIUS}px) ${clipPathBottom}`;
              p5 = `${clipPathConnectorStartX}px ${clipPathBottom}`;
              p6 = `${connectorRelativeXValue}px 100%`;
              p7 = `${clipPathConnectorEndX}px ${clipPathBottom}`;
              p8 = `${PSEUDO_BORDER_RADIUS}px ${clipPathBottom}`;
              p9 = `0 calc(${clipPathBottom} - ${PSEUDO_BORDER_RADIUS}px)`;
            }

            this.style.setProperty(
                '--content-padding-bottom',
                `${CONNECTOR_HEIGHT + (this.#props.showConnector ? CONNECTOR_HEIGHT : 0)}px`);
            this.style.setProperty('--content-padding-top', `${CONNECTOR_HEIGHT}px`);
            this.style.setProperty('--dialog-top', '0');
            this.style.setProperty('--dialog-margin', 'auto');
            this.style.setProperty('--dialog-margin-bottom', `${innerHeight - anchorTop}px`);
            this.#hitArea.y = anchorTop - 2 * CONNECTOR_HEIGHT;
            this.style.setProperty('--dialog-offset-y', `${DIALOG_ANIMATION_OFFSET}px`);
            this.style.setProperty(
                '--dialog-max-height',
                `${
                    devToolsHeight - (innerHeight - anchorTop) - DIALOG_PADDING_FROM_WINDOW -
                    visibleConnectorHeight}px`);
            break;
          }
          case DialogVerticalPosition.BOTTOM: {
            //                p4
            //     p2_________/\_________p6
            //     /        p3  p5        \
            // p1 |                        | p7
            //    |                        |
            // p9 *________________________* p8

            if (this.#props.showConnector) {
              p1 = `0 ${CONNECTOR_HEIGHT + PSEUDO_BORDER_RADIUS}px`;
              p2 = `${PSEUDO_BORDER_RADIUS}px ${CONNECTOR_HEIGHT}px`;
              p3 = `${clipPathConnectorStartX}px ${CONNECTOR_HEIGHT}px`;
              p4 = `${connectorRelativeXValue}px 0`;
              p5 = `${clipPathConnectorEndX}px ${CONNECTOR_HEIGHT}px`;
              p6 = `calc(100% - ${PSEUDO_BORDER_RADIUS}px) ${CONNECTOR_HEIGHT}px`;
              p7 = `100% ${CONNECTOR_HEIGHT + PSEUDO_BORDER_RADIUS}px`;
              p8 = '100% 100%';
              p9 = '0 100%';
            }
            this.style.setProperty(
                '--content-padding-top', `${CONNECTOR_HEIGHT + (this.#props.showConnector ? CONNECTOR_HEIGHT : 0)}px`);
            this.style.setProperty('--content-padding-bottom', `${CONNECTOR_HEIGHT}px`);
            this.style.setProperty('--dialog-top', `${anchorBottom}px`);
            this.#hitArea.y = anchorTop;
            this.style.setProperty('--dialog-offset-y', `-${DIALOG_ANIMATION_OFFSET}px`);
            this.style.setProperty(
                '--dialog-max-height',
                `${
                    devToolsHeight - (anchorBottom - devToolsTop) - DIALOG_PADDING_FROM_WINDOW -
                    visibleConnectorHeight}px`);
            break;
          }
          default:
            Platform.assertNever(
                this.#bestVerticalPositionInternal, `Unknown position type: ${this.#bestVerticalPositionInternal}`);
        }

        const clipPath = [p1, p2, p3, p4, p5, p6, p7, p8, p9].join();

        this.style.setProperty('--content-clip-path', clipPath);
        dialog.close();
        dialog.style.visibility = '';
      });
    });
  }

  async #showDialog(): Promise<void> {
    if (!IS_DIALOG_SUPPORTED) {
      return;
    }

    if (this.#isPendingShowDialog || this.hasAttribute('open')) {
      return;
    }
    this.#isPendingShowDialog = true;
    this.#positionDialog();
    // Allow the CSS variables to be set before showing.
    await coordinator.done();
    this.#isPendingShowDialog = false;
    const dialog = this.#getDialog();
    // Make the dialog visible now.
    if (!dialog.hasAttribute('open')) {
      dialog.showModal();
    }
    if (this.#props.dialogShownCallback) {
      await this.#props.dialogShownCallback();
    }
    this.#updateDialogBounds();
    document.body.addEventListener('keydown', this.#onKeyDownBound);
  }

  #handleScrollAttempt(event: WheelEvent): void {
    if (this.#mouseEventWasInDialogContent(event) || !this.#props.closeOnScroll ||
        !this.#getDialog().hasAttribute('open')) {
      return;
    }
    this.#closeDialog();
    this.dispatchEvent(new ForcedDialogClose());
  }

  #onKeyDown(event: KeyboardEvent): void {
    if (!this.#getDialog().hasAttribute('open') || !this.#props.closeOnESC) {
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

  #onCancel(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.#getDialog().hasAttribute('open') || !this.#props.closeOnESC) {
      return;
    }
    this.dispatchEvent(new ForcedDialogClose());
  }

  #forceDialogCloseInDevToolsMutation(): void {
    if (!this.#dialog?.hasAttribute('open')) {
      return;
    }
    if (this.#devToolsBoundingElement === document.body) {
      // Do not close if running in test environment.
      return;
    }
    this.#closeDialog();
    this.dispatchEvent(new ForcedDialogClose());
  }

  #closeDialog(): void {
    if (this.#isPendingCloseDialog || !this.#getDialog().hasAttribute('open')) {
      return;
    }
    this.#isPendingCloseDialog = true;
    void coordinator.write(() => {
      this.#hitArea.width = 0;
      this.removeAttribute('open');
      this.#getDialog().close();
      this.#isPendingCloseDialog = false;
      document.body.removeEventListener('keydown', this.#onKeyDownBound);
    });
  }

  getDialogBounds(): DOMRect {
    return this.#dialogClientRect;
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Dialog render was not scheduled');
    }

    if (!IS_DIALOG_SUPPORTED) {
      // To make sure that light dom content passed into this component doesn't show up,
      // we have to explicitly render a slot and hide it with CSS.
      LitHtml.render(
          // clang-format off
      LitHtml.html`
        <slot></slot>
      `,  this.#shadow, {host: this});
      // clang-format on
      return;
    }

    // clang-format off
    LitHtml.render(LitHtml.html`
      <dialog @click=${this.#handlePointerEvent} @pointermove=${this.#handlePointerEvent} @cancel=${this.#onCancel}
              jslog=${VisualLogging.dialog(this.#props.jslogContext).track({resize: true, keydown: 'Escape'}).parent('mapped')}>
        <div id="content-wrap">
          <div id="content">
            <slot></slot>
          </div>
        </div>
      </dialog>
    `, this.#shadow, { host: this });
    VisualLogging.setMappedParent(this.#getDialog(), this.parentElementOrShadowHost() as HTMLElement);
    // clang-format on
  }
}

customElements.define('devtools-dialog', Dialog);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-dialog': Dialog;
  }
}

export class PointerLeftDialogEvent extends Event {
  static readonly eventName = 'pointerleftdialog';

  constructor() {
    super(PointerLeftDialogEvent.eventName, {bubbles: true, composed: true});
  }
}

export class ClickOutsideDialogEvent extends Event {
  static readonly eventName = 'clickoutsidedialog';

  constructor() {
    super(ClickOutsideDialogEvent.eventName, {bubbles: true, composed: true});
  }
}

export class ForcedDialogClose extends Event {
  static readonly eventName = 'forceddialogclose';
  constructor() {
    super(ForcedDialogClose.eventName, {bubbles: true, composed: true});
  }
}

export const enum DialogVerticalPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  AUTO = 'auto',
}

export const enum DialogHorizontalAlignment {
  // Dialog and anchor are aligned on their left borders.
  LEFT = 'left',
  // Dialog and anchor are aligned on their right borders.
  RIGHT = 'right',
  CENTER = 'center',
  // This option allows to set the alignment
  // automatically to LEFT or RIGHT depending
  // on whether the dialog overflows the
  // viewport if it's aligned to the left.
  AUTO = 'auto',
}

type AnchorBounds = {
  top: number,
  bottom: number,
  left: number,
  right: number,
};
