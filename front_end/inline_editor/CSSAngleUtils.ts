// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

import {CSSAngleRegex} from './CSSAngleRegex.js';

export const enum AngleUnit {
  Deg = 'deg',
  Grad = 'grad',
  Rad = 'rad',
  Turn = 'turn',
}

export const parseText = (text: string): {value: number, unit: AngleUnit}|null => {
  const result = text.match(CSSAngleRegex);
  if (!result || !result.groups) {
    return null;
  }

  return {
    value: Number(result.groups.value),
    unit: result.groups.unit as AngleUnit,
  };
};

export const getAngleFromDegrees = (deg: number, targetUnit: AngleUnit): number => {
  switch (targetUnit) {
    case AngleUnit.Grad:
      return UI.Geometry.degreesToGradians(deg);
    case AngleUnit.Rad:
      return UI.Geometry.degreesToRadians(deg);
    case AngleUnit.Turn:
      return UI.Geometry.degreesToTurns(deg);
  }

  return deg;
};

export const getRadiansFromAngle = (angle: number, unit: AngleUnit): number => {
  switch (unit) {
    case AngleUnit.Deg:
      return UI.Geometry.degreesToRadians(angle);
    case AngleUnit.Grad:
      return UI.Geometry.gradiansToRadians(angle);
    case AngleUnit.Turn:
      return UI.Geometry.turnsToRadians(angle);
  }

  return angle;
};

export const get2DTranslationsForAngle =
    (angle: number, unit: AngleUnit, radius: number): {translateX: number, translateY: number} => {
      const angleInRadians = getRadiansFromAngle(angle, unit);
      return {
        translateX: Math.sin(angleInRadians) * radius,
        translateY: -Math.cos(angleInRadians) * radius,
      };
    };

export const roundAngleByUnit = (angle: number, unit: AngleUnit): number => {
  switch (unit) {
    case AngleUnit.Deg:
    case AngleUnit.Grad:
      // Round to nearest whole unit.
      return Math.round(angle);
    case AngleUnit.Rad:
      // Allow up to 4 decimals.
      return Math.round(angle * 10000) / 10000;
    case AngleUnit.Turn:
      // Allow up to 2 decimals.
      return Math.round(angle * 100) / 100;
    default:
      return angle;
  }
};
