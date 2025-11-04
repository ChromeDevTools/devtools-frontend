import type { AnimationTimingModel } from './AnimationTimingModel.js';
export declare class PresetUI {
    #private;
    constructor();
    draw(model: AnimationTimingModel, svg: Element): void;
}
interface AnimationTimingUIParams {
    model: AnimationTimingModel;
    onChange: (model: AnimationTimingModel) => void;
}
export declare class AnimationTimingUI {
    #private;
    constructor({ model, onChange }: AnimationTimingUIParams);
    element(): Element;
    setModel(model: AnimationTimingModel): void;
    draw(): void;
}
export {};
