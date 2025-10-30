export type TooltipVariant = 'simple' | 'rich';
export type PaddingMode = 'small' | 'large';
export type TooltipTrigger = 'hover' | 'click' | 'both';
export interface TooltipProperties {
    id: string;
    variant?: TooltipVariant;
    padding?: PaddingMode;
    anchor?: HTMLElement;
    jslogContext?: string;
    trigger?: TooltipTrigger;
}
/**
 * @property useHotkey - reflects the `"use-hotkey"` attribute.
 * @property id - reflects the `"id"` attribute.
 * @property hoverDelay - reflects the `"hover-delay"` attribute.
 * @property variant - reflects the `"variant"` attribute.
 * @property padding - reflects the `"padding"` attribute.
 * @property trigger - reflects the `"trigger"` attribute.
 * @property verticalDistanceIncrease - reflects the `"vertical-distance-increase"` attribute.
 * @property preferSpanLeft - reflects the `"prefer-span-left"` attribute.
 * @attribute id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attribute hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attribute variant - Variant of the tooltip, `"simple"` for strings only, inverted background,
 *                 `"rich"` for interactive content, background according to theme's surface.
 * @attribute padding - Which padding to use, defaults to `"small"`. Use `"large"` for richer content.
 * @attribute trigger - Specifies which action triggers the tooltip. `"hover"` is the default. `"click"` means the
 *                 tooltip will be shown on click instead of hover. `"both"` means both hover and click trigger the
 *                 tooltip.
 * @attribute vertical-distance-increase - The tooltip is moved vertically this many pixels further away from its anchor.
 * @attribute prefer-span-left - If present, the tooltip's preferred position is `"span-left"` (The right
 *                 side of the tooltip and its anchor are aligned. The tooltip expands to the left from
 *                 there.). Applies to rich tooltips only.
 * @attribute use-hotkey - If present, the tooltip will be shown on hover but not when receiving focus.
 *                  Requires a hotkey to open when fosed (Alt-down). When `"trigger"` is present
 *                  as well, `"trigger"` takes precedence.
 */
export declare class Tooltip extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    static lastOpenedTooltipId: string | null;
    get openedViaHotkey(): boolean;
    get open(): boolean;
    get useHotkey(): boolean;
    set useHotkey(useHotkey: boolean);
    get trigger(): TooltipTrigger;
    set trigger(trigger: TooltipTrigger);
    get hoverDelay(): number;
    set hoverDelay(delay: number);
    get variant(): TooltipVariant;
    set variant(variant: TooltipVariant);
    get padding(): PaddingMode;
    set padding(padding: PaddingMode);
    get jslogContext(): string | null;
    set jslogContext(jslogContext: string);
    get verticalDistanceIncrease(): number;
    set verticalDistanceIncrease(increase: number);
    get preferSpanLeft(): boolean;
    set preferSpanLeft(value: boolean);
    get anchor(): HTMLElement | null;
    constructor(properties?: TooltipProperties);
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    showTooltip: (event?: MouseEvent | FocusEvent) => void;
    hideTooltip: (event?: MouseEvent | FocusEvent) => void;
    toggle: () => void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-tooltip': Tooltip;
    }
}
