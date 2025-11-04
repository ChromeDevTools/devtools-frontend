import type * as Platform from '../core/platform/platform.js';
import type * as UI from '../ui/legacy/legacy.js';
type WidgetConstructor = Platform.Constructor.AbstractConstructor<UI.Widget.Widget | HTMLElement>;
type ViewFunctionLike = (input: any, output: any, target: HTMLElement) => void;
type FindViewFunction<ParametersT extends readonly unknown[]> = ParametersT extends [infer Head, ...infer Tail] ? Head extends ViewFunctionLike ? Head : FindViewFunction<Tail> : never;
type ViewFunction<WidgetConstructorT extends WidgetConstructor> = FindViewFunction<Required<ConstructorParameters<WidgetConstructorT>>>;
type ViewFunctionParameters<WidgetConstructorT extends WidgetConstructor> = Parameters<ViewFunction<WidgetConstructorT>>;
type ViewInput<WidgetConstructorT extends WidgetConstructor> = ViewFunctionParameters<WidgetConstructorT>[0];
type ViewOutput<WidgetConstructorT extends WidgetConstructor> = ViewFunctionParameters<WidgetConstructorT>[1];
interface ViewStubExtensions<WidgetConstructorT extends WidgetConstructor> extends sinon.SinonSpy<[ViewInput<WidgetConstructorT>, ViewOutput<WidgetConstructorT>, HTMLElement], void> {
    input: ViewInput<WidgetConstructorT>;
    nextInput: Promise<ViewInput<WidgetConstructorT>>;
    callCount: number;
}
export type ViewFunctionStub<WidgetConstructorT extends WidgetConstructor> = ViewFunction<WidgetConstructorT> & ViewStubExtensions<WidgetConstructorT>;
export declare function createViewFunctionStub<WidgetConstructorT extends WidgetConstructor>(_constructor: WidgetConstructorT, outputValues?: ViewOutput<WidgetConstructorT>): ViewFunctionStub<WidgetConstructorT>;
export {};
