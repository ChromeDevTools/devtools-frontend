// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../core/platform/platform.js';
import type * as UI from '../ui/legacy/legacy.js';

type WidgetConstructor = Platform.Constructor.AbstractConstructor<UI.Widget.Widget|HTMLElement>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViewFunctionLike = (input: any, output: any, target: HTMLElement) => void;

type FindViewFunction<ParametersT extends readonly unknown[]> = ParametersT extends [infer Head, ...infer Tail] ?
    Head extends ViewFunctionLike ? Head : FindViewFunction<Tail>:
    never;

type ViewFunction<WidgetConstructorT extends WidgetConstructor> =
    FindViewFunction<Required<ConstructorParameters<WidgetConstructorT>>>;

type ViewFunctionParameters<WidgetConstructorT extends WidgetConstructor> =
    Parameters<ViewFunction<WidgetConstructorT>>;

type ViewInput<WidgetConstructorT extends WidgetConstructor> = ViewFunctionParameters<WidgetConstructorT>[0];

type ViewOutput<WidgetConstructorT extends WidgetConstructor> = ViewFunctionParameters<WidgetConstructorT>[1];

interface ViewStubExtensions<WidgetConstructorT extends WidgetConstructor> extends
    sinon.SinonSpy<[ViewInput<WidgetConstructorT>, ViewOutput<WidgetConstructorT>, HTMLElement], void> {
  input: ViewInput<WidgetConstructorT>;
  nextInput: Promise<ViewInput<WidgetConstructorT>>;
  callCount: number;
}

interface InternalViewStubExtensions<WidgetConstructorT extends WidgetConstructor> extends
    ViewStubExtensions<WidgetConstructorT> {
  invoked?: (input: ViewInput<WidgetConstructorT>) => void;
}

export type ViewFunctionStub<WidgetConstructorT extends WidgetConstructor> =
    ViewFunction<WidgetConstructorT>&ViewStubExtensions<WidgetConstructorT>;

export function createViewFunctionStub<WidgetConstructorT extends WidgetConstructor>(
    _constructor: WidgetConstructorT,
    outputValues?: ViewOutput<WidgetConstructorT>,
    ): ViewFunctionStub<WidgetConstructorT> {
  const result: InternalViewStubExtensions<WidgetConstructorT> =
      sinon.fake(
          (input: ViewInput<WidgetConstructorT>, output: ViewOutput<WidgetConstructorT>, _target: HTMLElement) => {
            result.input = input;
            if (output && outputValues) {
              Object.assign(output, outputValues);
            }
            result.invoked?.(input);
          }) as ViewFunctionStub<WidgetConstructorT>;
  Object.defineProperty(result, 'nextInput', {
    get() {
      return new Promise<ViewInput<WidgetConstructorT>>(resolve => {
        result.invoked = resolve;
      });
    }
  });
  return result as ViewFunctionStub<WidgetConstructorT>;
}
