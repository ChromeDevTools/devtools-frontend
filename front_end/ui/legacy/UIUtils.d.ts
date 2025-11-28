import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../components/buttons/buttons.js';
import { type IconData } from '../kit/kit.js';
import * as Lit from '../lit/lit.js';
declare global {
    interface HTMLElementTagNameMap {
        'devtools-checkbox': CheckboxLabel;
        'dt-close-button': DevToolsCloseButton;
        'dt-icon-label': DevToolsIconLabel;
        'dt-small-bubble': DevToolsSmallBubble;
    }
}
declare const Directives: typeof Lit.Directives;
export declare function installDragHandle(element: Element, elementDragStart: ((arg0: MouseEvent) => boolean) | null, elementDrag: (arg0: MouseEvent) => void, elementDragEnd: ((arg0: MouseEvent) => void) | null, cursor: string | null, hoverCursor?: string | null, startDelay?: number, mouseDownPreventDefault?: boolean): void;
export declare function elementDragStart(targetElement: Element, elementDragStart: ((arg0: MouseEvent) => boolean) | null, elementDrag: (arg0: MouseEvent) => void, elementDragEnd: ((arg0: MouseEvent) => void) | null, cursor: string | null, event: Event): void;
export declare function isBeingEdited(node?: Node | null): boolean;
export declare function isEditing(): boolean;
export declare function markBeingEdited(element: Element, value: boolean): boolean;
export declare const StyleValueDelimiters = " \u00A0\t\n\"':;,/()";
export declare function getValueModificationDirection(event: Event): string | null;
export declare function modifiedFloatNumber(number: number, event: Event, modifierMultiplier?: number, range?: {
    min?: number;
    max?: number;
}): number | null;
export declare function createReplacementString(wordString: string, event: Event, customNumberHandler?: ((prefix: string, number: number, suffix: string) => string), stepping?: {
    step?: number;
    range?: {
        min?: number;
        max?: number;
    };
}): string | null;
export declare function isElementValueModification(event: Event): boolean;
export declare function handleElementValueModifications(event: Event, element: Element, finishHandler?: ((arg0: string, arg1: string) => void), suggestionHandler?: ((arg0: string) => boolean), customNumberHandler?: ((arg0: string, arg1: number, arg2: string) => string)): boolean;
export declare function openLinkExternallyLabel(): string;
export declare function copyLinkAddressLabel(): string;
export declare function copyFileNameLabel(): string;
export declare function anotherProfilerActiveLabel(): string;
export declare function asyncStackTraceLabel(description: string | undefined, previousCallFrames: Array<{
    functionName: string;
}>): string;
export declare function addPlatformClass(element: HTMLElement): void;
export declare function installComponentRootStyles(element: HTMLElement): void;
export declare class ElementFocusRestorer {
    private element;
    private previous;
    constructor(element: Element);
    restore(): void;
}
export declare function runCSSAnimationOnce(element: Element, className: string): void;
export declare function measurePreferredSize(element: Element, containerElement?: Element | null): Geometry.Size;
export declare function startBatchUpdate(): void;
export declare function endBatchUpdate(): void;
export declare function animateFunction(window: Window, func: (...args: any[]) => void, params: Array<{
    from: number;
    to: number;
}>, duration: number, animationComplete?: (() => void)): () => void;
export declare class LongClickController {
    private readonly element;
    private readonly callback;
    private readonly editKey;
    private longClickData;
    private longClickInterval;
    constructor(element: Element, callback: (arg0: Event) => void, isEditKeyFunc?: (arg0: KeyboardEvent) => boolean);
    reset(): void;
    private enable;
    dispose(): void;
    static readonly TIME_MS = 200;
}
export declare function initializeUIUtils(document: Document): void;
export declare function beautifyFunctionName(name: string): string;
export declare const createTextChild: (element: Element | DocumentFragment, text: string) => Text;
export declare const createTextChildren: (element: Element | DocumentFragment, ...childrenText: string[]) => void;
export declare function createTextButton(text: string, clickHandler?: ((arg0: Event) => void), opts?: {
    className?: string;
    jslogContext?: string;
    variant?: Buttons.Button.Variant;
    title?: string;
    icon?: string;
}): Buttons.Button.Button;
export declare function createInput(className?: string, type?: string, jslogContext?: string): HTMLInputElement;
export declare function createHistoryInput(type?: string, className?: string): HTMLInputElement;
export declare function createSelect(name: string, options: string[] | Array<Map<string, string[]>> | Set<string>): HTMLSelectElement;
export declare function createOption(title: string, value?: string, jslogContext?: string): HTMLOptionElement;
export declare function createLabel(title: string, className?: string, associatedControl?: Element): Element;
export declare function createIconLabel(options: {
    iconName: string;
    title?: string;
    color?: string;
    width?: '14px' | '20px';
    height?: '14px' | '20px';
}): DevToolsIconLabel;
/**
 * Creates a radio button, which is comprised of a `<label>` and an `<input type="radio">` element.
 *
 * The returned pair contains the `label` element and and the `radio` input element. The latter is
 * a child of the `label`, and therefore no association via `for` attribute is necessary to make
 * the radio button accessible.
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * const jslog = VisualLogging.toggle().track({change: true}).context(jslogContext);
 * html`<label><input type="radio" name=${name} jslog=${jslog}>${title}</label>`
 * ```
 *
 * @param name the name of the radio group.
 * @param title the label text for the radio button.
 * @param jslogContext the context string for the `jslog` attribute.
 * @returns the pair of `HTMLLabelElement` and `HTMLInputElement`.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/radio
 */
export declare function createRadioButton(name: string, title: string, jslogContext: string): {
    label: HTMLLabelElement;
    radio: HTMLInputElement;
};
/**
 * Creates an `<input type="range">` element with the specified parameters (a slider)
 * and a `step` of 1 (the default for the element).
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * html`<input type="range" min=${min} max=${max} tabindex=${tabIndex}>`
 * ```
 *
 * @param min the minimum allowed value.
 * @param max the maximum allowed value.
 * @param tabIndex the value for the `tabindex` attribute.
 * @returns the newly created `HTMLInputElement` for the slider.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range
 */
export declare function createSlider(min: number, max: number, tabIndex: number): HTMLInputElement;
export declare function setTitle(element: HTMLElement, title: string): void;
export declare class CheckboxLabel extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    static create(title?: Platform.UIString.LocalizedString, checked?: boolean, subtitle?: Platform.UIString.LocalizedString, jslogContext?: string, small?: boolean): CheckboxLabel;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    getLabelText(): string | null;
    setLabelText(content: string): void;
    get ariaLabel(): string | null;
    set ariaLabel(ariaLabel: string);
    get checked(): boolean;
    set checked(checked: boolean);
    set disabled(disabled: boolean);
    get disabled(): boolean;
    set indeterminate(indeterminate: boolean);
    get indeterminate(): boolean;
    set title(title: string);
    get title(): string;
    set name(name: string);
    get name(): string;
    click(): void;
    /** Only to be used when the checkbox label is 'generated' (a regex, a className, etc). Most checkboxes should be create()'d with UIStrings */
    static createWithStringLiteral(title?: string, checked?: boolean, jslogContext?: string, small?: boolean): CheckboxLabel;
    private static lastId;
}
export declare class DevToolsIconLabel extends HTMLElement {
    #private;
    constructor();
    set data(data: IconData);
}
export declare class DevToolsSmallBubble extends HTMLElement {
    private textElement;
    constructor();
    set type(type: string);
}
export declare class DevToolsCloseButton extends HTMLElement {
    #private;
    constructor();
    setAccessibleName(name: string): void;
    setSize(size: Buttons.Button.Size): void;
    setTabbable(tabbable: boolean): void;
    focus(): void;
}
export declare function bindInput(input: HTMLInputElement, apply: (arg0: string) => void, validate: (arg0: string) => boolean, numeric: boolean, modifierMultiplier?: number): (arg0: string) => void;
export declare function trimText(context: CanvasRenderingContext2D, text: string, maxWidth: number, trimFunction: (arg0: string, arg1: number) => string): string;
export declare function trimTextMiddle(context: CanvasRenderingContext2D, text: string, maxWidth: number): string;
export declare function trimTextEnd(context: CanvasRenderingContext2D, text: string, maxWidth: number): string;
export declare function measureTextWidth(context: CanvasRenderingContext2D, text: string): number;
export declare function loadImage(url: string): Promise<HTMLImageElement | null>;
/**
 * Creates a file selector element.
 * @param callback the function that will be called with the file the user selected
 * @param accept optionally used to set the [`accept`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept) parameter to limit file-types the user can pick.
 */
export declare function createFileSelectorElement(callback: (arg0: File) => void, accept?: string): HTMLInputElement;
export declare const MaxLengthForDisplayedURLs = 150;
export declare class MessageDialog {
    static show(header: string, message: string, where?: Element | Document, jslogContext?: string): Promise<void>;
}
export declare class ConfirmDialog {
    static show(message: string, header?: string, where?: Element | Document, options?: ConfirmDialogOptions): Promise<boolean>;
}
export interface RenderedObject {
    element: HTMLElement;
    forceSelect(): void;
}
export declare abstract class Renderer {
    abstract render(object: Object, options?: Options): Promise<RenderedObject | null>;
    static render(object: Object, options?: Options): Promise<RenderedObject | null>;
}
export declare function formatTimestamp(timestamp: number, full: boolean): string;
export interface Options {
    title?: string | Element;
    editable?: boolean;
    /**
     * Should the resulting object be expanded.
     */
    expand?: boolean;
}
export declare const isScrolledToBottom: (element: Element) => boolean;
export declare function createSVGChild<K extends keyof SVGElementTagNameMap>(element: Element, childType: K, className?: string): SVGElementTagNameMap[K];
export declare const enclosingNodeOrSelfWithNodeNameInArray: (initialNode: Node, nameArray: string[]) => Node | null;
export declare const enclosingNodeOrSelfWithNodeName: (node: Node, nodeName: string) => Node | null;
export declare const deepElementFromPoint: (document: Document | ShadowRoot | null | undefined, x: number, y: number) => Node | null;
export declare const deepElementFromEvent: (ev: Event) => Node | null;
export declare function registerRenderer(registration: RendererRegistration): void;
export declare function getApplicableRegisteredRenderers(object: Object): RendererRegistration[];
export interface RendererRegistration {
    loadRenderer: () => Promise<Renderer>;
    contextTypes: () => Array<Platform.Constructor.ConstructorOrAbstract<unknown>>;
}
export interface ConfirmDialogOptions {
    okButtonLabel?: string;
    cancelButtonLabel?: string;
    jslogContext?: string;
}
/**
 * Creates a new shadow DOM tree with the core styles and an optional list of
 * additional styles, and attaches it to the specified `element`.
 *
 * @param element the `Element` to attach the shadow DOM tree to.
 * @param options optional additional style sheets and options for `Element#attachShadow()`.
 * @returns the newly created `ShadowRoot`.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
 */
export declare function createShadowRootWithCoreStyles(element: Element, options?: {
    cssFile?: CSSInJS[] | CSSInJS;
    delegatesFocus?: boolean;
}): ShadowRoot;
export declare function resetMeasuredScrollbarWidthForTest(): void;
export declare function measuredScrollbarWidth(document?: Document | null): number;
export interface PromotionDisplayState {
    displayCount: number;
    firstRegistered: number;
    featureInteractionCount: number;
}
export declare class PromotionManager {
    #private;
    static instance(): PromotionManager;
    private getPromotionDisplayState;
    private setPromotionDisplayState;
    private registerPromotion;
    private recordPromotionShown;
    canShowPromotion(id: string): boolean;
    recordFeatureInteraction(id: string): void;
    maybeShowPromotion(id: string): boolean;
}
/**
 * Creates a `<div>` element with the localized text NEW.
 *
 * The element is automatically styled correctly, as long as the core styles (in particular
 * `inspectorCommon.css` is injected into the current document / shadow root). The lit
 * equivalent of calling this method is:
 *
 * ```js
 * const jslog = VisualLogging.badge('new-badge');
 * html`<div class='new-badge' jsog=${jslog}>i18nString(UIStrings.new)</div>`
 *
 * @returns the newly created `HTMLDivElement` for the new badge.
 */
export declare function maybeCreateNewBadge(promotionId: string): HTMLDivElement | undefined;
export declare function bindToAction(actionName: string): ReturnType<typeof Directives.ref>;
type BindingEventListener = (arg: any) => any;
export declare class InterceptBindingDirective extends Lit.Directive.Directive {
    #private;
    update(part: Lit.Directive.Part, [listener]: [BindingEventListener]): unknown;
    render(_listener: Function): undefined;
    static attachEventListeners(templateElement: Element, renderedElement: Element): void;
}
export declare const cloneCustomElement: <T extends HTMLElement>(element: T, deep?: boolean) => T;
export declare class HTMLElementWithLightDOMTemplate extends HTMLElement {
    #private;
    constructor();
    static cloneNode(node: Node): Node;
    private static patchLitTemplate;
    get templateRoot(): DocumentFragment | HTMLElement;
    set template(template: Lit.LitTemplate);
    protected onChange(_mutationList: MutationRecord[]): void;
    protected updateNode(_node: Node, _attributeName: string | null): void;
    protected addNodes(_nodes: NodeList | Node[], _nextSibling?: Node | null): void;
    protected removeNodes(_nodes: NodeList): void;
    static findCorrespondingElement(sourceElement: HTMLElement, sourceRootElement: HTMLElement, targetRootElement: Element): Element | null;
}
/**
 * @param text Text to copy to clipboard
 * @param alert Message to send for a11y only required if there
 * were other UI changes that visually indicated this copy happened.
 */
export declare function copyTextToClipboard(text: string, alert?: string): void;
export declare function getDevToolsBoundingElement(): HTMLElement;
/**
 * @deprecated Prefer {@link bindToSetting} as this function leaks the checkbox via the setting listener.
 */
export declare const bindCheckbox: (input: CheckboxLabel, setting: Common.Settings.Setting<boolean>, metric?: UserMetricOptions) => void;
export declare const bindCheckboxImpl: (input: CheckboxLabel, apply: (value: boolean) => void, metric?: UserMetricOptions) => (value: boolean) => void;
export declare const bindToSetting: (settingOrName: string | Common.Settings.Setting<boolean | string> | Common.Settings.RegExpSetting, stringValidator?: (newSettingValue: string) => boolean) => ReturnType<typeof Directives.ref>;
/**
 * Track toggle action as a whole or
 * track on and off action separately.
 */
export interface UserMetricOptions {
    toggle?: Host.UserMetrics.Action;
    enable?: Host.UserMetrics.Action;
    disable?: Host.UserMetrics.Action;
}
export {};
