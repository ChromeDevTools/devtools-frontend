// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as UI from '../ui/legacy/legacy.js';

type WidgetConstructor = abstract new (...args: any[]) => UI.Widget.Widget|HTMLElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViewFunctionLike = ((input: any, output: any, target: HTMLElement) => void)|undefined;

// clang-format off
type FindViewFunction<ParametersT extends readonly unknown[]> =
    ParametersT[0] extends ViewFunctionLike ? ParametersT[0] :
    ParametersT[1] extends ViewFunctionLike ? ParametersT[1] :
    ParametersT[2] extends ViewFunctionLike ? ParametersT[2] :
    ParametersT[3] extends ViewFunctionLike ? ParametersT[3] :
    ParametersT[4] extends ViewFunctionLike ? ParametersT[4] :
    ParametersT[5] extends ViewFunctionLike ? ParametersT[5] :
    ParametersT[6] extends ViewFunctionLike ? ParametersT[6] :
    ParametersT[7] extends ViewFunctionLike ? ParametersT[7] :
    ParametersT[8] extends ViewFunctionLike ? ParametersT[8] :
    ParametersT[9] extends ViewFunctionLike ? ParametersT[9] :
    never;

type ViewFunction<WidgetConstructorT extends WidgetConstructor> =
    FindViewFunction<ConstructorParameters<WidgetConstructorT>>;

type ViewFunctionParameters<WidgetConstructorT extends WidgetConstructor> =
    Parameters<ViewFunction<WidgetConstructorT>>;

export type ViewInput<WidgetConstructorT extends WidgetConstructor> =
    ViewFunctionParameters<WidgetConstructorT>[0];

export type ViewOutput<WidgetConstructorT extends WidgetConstructor> =
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {} extends ViewFunctionParameters<WidgetConstructorT>[1] ? never :
    ViewFunctionParameters<WidgetConstructorT>[1];
// clang-format on

export type ViewFunctionStub<WidgetConstructorT extends WidgetConstructor> = ViewFunction<WidgetConstructorT>&{
  input: ViewInput<WidgetConstructorT>,
  nextInput: Promise<ViewInput<WidgetConstructorT>>,
  callCount: number,
};

export function createViewFunctionStub<WidgetConstructorT extends WidgetConstructor>(
    constructor: WidgetConstructorT,
    outputValues?: ViewOutput<WidgetConstructorT>): ViewFunctionStub<WidgetConstructorT> {
  const result: ViewFunctionStub<WidgetConstructorT> =
      ((input: ViewInput<WidgetConstructorT>, output: ViewOutput<WidgetConstructorT>, _target: HTMLElement) => {
        ++result.callCount;
        result.input = input;
        if (output && outputValues) {
          Object.assign((output as object), outputValues);
        }
        result.invoked?.(input);
      }) as ViewFunctionStub<WidgetConstructorT>;
  result.callCount = 0;
  Object.defineProperty(result, 'nextInput', {
    get() {
      return new Promise<ViewInput<WidgetConstructorT>>(resolve => {
        result.invoked = resolve;
      });
    }
  });
  return result;
}
