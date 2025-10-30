export type RenderCallback = () => (void | Promise<void>);
export declare function scheduleRender(component: HTMLElement, callback: RenderCallback): Promise<void>;
export declare function isScheduledRender(component: HTMLElement): boolean;
