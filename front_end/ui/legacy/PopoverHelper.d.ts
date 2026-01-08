import { GlassPane } from './GlassPane.js';
export declare class PopoverHelper {
    #private;
    static createPopover: (jslogContext?: string) => GlassPane;
    private disableOnClick;
    private getRequest;
    private scheduledRequest;
    private hidePopoverCallback;
    readonly container: HTMLElement;
    private showTimeout;
    private hideTimeout;
    private hidePopoverTimer;
    private showPopoverTimer;
    private readonly boundMouseDown;
    private readonly boundMouseMove;
    private readonly boundMouseOut;
    private readonly boundScrollEnd;
    private readonly boundKeyUp;
    jslogContext?: string;
    constructor(container: HTMLElement, getRequest: (arg0: MouseEvent | KeyboardEvent) => PopoverRequest | null, jslogContext?: string);
    setTimeout(showTimeout: number, hideTimeout?: number): void;
    setDisableOnClick(disableOnClick: boolean): void;
    private eventInScheduledContent;
    private scrollEnd;
    private mouseDown;
    private keyUp;
    private mouseMove;
    private popoverMouseMove;
    private popoverMouseOut;
    private mouseOut;
    private startHidePopoverTimer;
    private startShowPopoverTimer;
    private stopShowPopoverTimer;
    isPopoverVisible(): boolean;
    hidePopover(): void;
    private showPopover;
    private stopHidePopoverTimer;
    dispose(): void;
}
export interface PopoverRequest {
    box: AnchorBox;
    show: (arg0: GlassPane) => Promise<boolean>;
    hide?: (() => void);
}
