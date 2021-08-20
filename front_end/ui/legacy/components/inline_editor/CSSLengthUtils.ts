// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum LengthUnit {
  // absolute units
  PIXEL = 'px',
  CENTIMETER = 'cm',
  MILLIMETER = 'mm',
  INCH = 'in',
  PICA = 'pc',
  POINT = 'pt',

  // relative units
  CH = 'ch',
  EM = 'em',
  REM = 'rem',
  VH = 'vh',
  VW = 'vw',
  VMIN = 'vmin',
  VMAX = 'vmax',
}

export const LENGTH_UNITS = [
  LengthUnit.PIXEL,
  LengthUnit.CENTIMETER,
  LengthUnit.MILLIMETER,
  LengthUnit.INCH,
  LengthUnit.PICA,
  LengthUnit.POINT,
  LengthUnit.CH,
  LengthUnit.EM,
  LengthUnit.REM,
  LengthUnit.VH,
  LengthUnit.VW,
  LengthUnit.VMIN,
  LengthUnit.VMAX,
] as const;

export const CSSLengthRegex = new RegExp(`(?<value>[+-]?\\d*\\.?\\d+)(?<unit>${LENGTH_UNITS.join('|')})`);

export interface Length {
  value: number;
  unit: LengthUnit;
}

export const parseText = (text: string): Length|null => {
  const result = text.match(CSSLengthRegex);
  if (!result || !result.groups) {
    return null;
  }

  return {
    value: Number(result.groups.value),
    unit: result.groups.unit as LengthUnit,
  };
};
