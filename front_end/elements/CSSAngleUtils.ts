// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

export const degreesToGradients = (deg: number): number => deg / 9 * 10;
export const degreesToRadians = (deg: number): number => deg / 180 * Math.PI;
export const degreesToTurns = (deg: number): number => deg / 360;

export const getAngleFromDegree = (deg: number, targetUnit: AngleUnit): number => {
  switch (targetUnit) {
    case AngleUnit.Grad:
      return degreesToGradients(deg);
    case AngleUnit.Rad:
      return degreesToRadians(deg);
    case AngleUnit.Turn:
      return degreesToTurns(deg);
  }

  return deg;
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
