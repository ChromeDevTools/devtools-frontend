// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

export const CSSAngleRegex = /(?<value>[+-]?\d*\.?\d+)(?<unit>deg|grad|rad|turn)/;

export const enum AngleUnit {
  DEG = 'deg',
  GRAD = 'grad',
  RAD = 'rad',
  TURN = 'turn',
}

export interface Angle {
  value: number;
  unit: AngleUnit;
}

export const parseText = (text: string): Angle|null => {
  const result = text.match(CSSAngleRegex);
  if (!result?.groups) {
    return null;
  }

  return {
    value: Number(result.groups.value),
    unit: result.groups.unit as AngleUnit,
  };
};

export const getAngleFromRadians = (rad: number, targetUnit: AngleUnit): Angle => {
  let value = rad;
  switch (targetUnit) {
    case AngleUnit.GRAD:
      value = UI.Geometry.radiansToGradians(rad);
      break;
    case AngleUnit.DEG:
      value = UI.Geometry.radiansToDegrees(rad);
      break;
    case AngleUnit.TURN:
      value = UI.Geometry.radiansToTurns(rad);
      break;
  }

  return {
    value,
    unit: targetUnit,
  };
};

export const getRadiansFromAngle = (angle: Angle): number => {
  switch (angle.unit) {
    case AngleUnit.DEG:
      return UI.Geometry.degreesToRadians(angle.value);
    case AngleUnit.GRAD:
      return UI.Geometry.gradiansToRadians(angle.value);
    case AngleUnit.TURN:
      return UI.Geometry.turnsToRadians(angle.value);
  }

  return angle.value;
};

export const get2DTranslationsForAngle = (angle: Angle, radius: number): {translateX: number, translateY: number} => {
  const radian = getRadiansFromAngle(angle);
  return {
    translateX: Math.sin(radian) * radius,
    translateY: -Math.cos(radian) * radius,
  };
};

export const roundAngleByUnit = (angle: Angle): Angle => {
  let roundedValue = angle.value;

  switch (angle.unit) {
    case AngleUnit.DEG:
    case AngleUnit.GRAD:
      // Round to nearest whole unit.
      roundedValue = Math.round(angle.value);
      break;
    case AngleUnit.RAD:
      // Allow up to 4 decimals.
      roundedValue = Math.round(angle.value * 10000) / 10000;
      break;
    case AngleUnit.TURN:
      // Allow up to 2 decimals.
      roundedValue = Math.round(angle.value * 100) / 100;
      break;
    default:
      Platform.assertNever(angle.unit, `Unknown angle unit: ${angle.unit}`);
  }

  return {
    value: roundedValue,
    unit: angle.unit,
  };
};

export const getNextUnit = (currentUnit: AngleUnit): AngleUnit => {
  switch (currentUnit) {
    case AngleUnit.DEG:
      return AngleUnit.GRAD;
    case AngleUnit.GRAD:
      return AngleUnit.RAD;
    case AngleUnit.RAD:
      return AngleUnit.TURN;
    default:
      return AngleUnit.DEG;
  }
};

export const convertAngleUnit = (angle: Angle, newUnit: AngleUnit): Angle => {
  if (angle.unit === newUnit) {
    return angle;
  }
  const radian = getRadiansFromAngle(angle);
  return getAngleFromRadians(radian, newUnit);
};

export const getNewAngleFromEvent = (angle: Angle, event: MouseEvent|KeyboardEvent): Angle|undefined => {
  const direction = UI.UIUtils.getValueModificationDirection(event);
  if (direction === null) {
    return;
  }
  let diff = direction === 'Up' ? Math.PI / 180 : -Math.PI / 180;
  if (event.shiftKey) {
    diff *= 10;
  }

  const radian = getRadiansFromAngle(angle);
  return getAngleFromRadians(radian + diff, angle.unit);
};
