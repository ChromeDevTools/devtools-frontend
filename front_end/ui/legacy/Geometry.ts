/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as SDK from '../../core/sdk/sdk.js';

const EPS = 1e-5;

export class Vector {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): void {
    const length = this.length();
    if (length <= EPS) {
      return;
    }

    this.x /= length;
    this.y /= length;
    this.z /= length;
  }
}

export class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  distanceTo(p: Point): number {
    return Math.sqrt(Math.pow(p.x - this.x, 2) + Math.pow(p.y - this.y, 2));
  }

  projectOn(line: Point): Point {
    if (line.x === 0 && line.y === 0) {
      return new Point(0, 0);
    }
    return line.scale((this.x * line.x + this.y * line.y) / (Math.pow(line.x, 2) + Math.pow(line.y, 2)));
  }

  scale(scalar: number): Point {
    return new Point(this.x * scalar, this.y * scalar);
  }

  toString(): string {
    return Math.round(this.x * 100) / 100 + ', ' + Math.round(this.y * 100) / 100;
  }
}

export class CubicBezier {
  controlPoints: Point[];
  constructor(point1: Point, point2: Point) {
    this.controlPoints = [point1, point2];
  }

  static parse(text: string): CubicBezier|null {
    const keywordValues = SDK.CSSMetadata.CubicBezierKeywordValues;
    const value = text.toLowerCase().replace(/\s+/g, '');
    if (keywordValues.has(value)) {
      return CubicBezier.parse((keywordValues.get(value) as string));
    }
    const bezierRegex = /^cubic-bezier\(([^,]+),([^,]+),([^,]+),([^,]+)\)$/;
    const match = value.match(bezierRegex);
    if (match) {
      const control1 = new Point(parseFloat(match[1]), parseFloat(match[2]));
      const control2 = new Point(parseFloat(match[3]), parseFloat(match[4]));
      return new CubicBezier(control1, control2);
    }
    return null;
  }

  evaluateAt(t: number): Point {
    function evaluate(v1: number, v2: number, t: number): number {
      return 3 * (1 - t) * (1 - t) * t * v1 + 3 * (1 - t) * t * t * v2 + Math.pow(t, 3);
    }

    const x = evaluate(this.controlPoints[0].x, this.controlPoints[1].x, t);
    const y = evaluate(this.controlPoints[0].y, this.controlPoints[1].y, t);
    return new Point(x, y);
  }

  asCSSText(): string {
    const raw = 'cubic-bezier(' + this.controlPoints.join(', ') + ')';
    const keywordValues = SDK.CSSMetadata.CubicBezierKeywordValues;
    for (const [keyword, value] of keywordValues) {
      // We special case `linear` in here as we
      // treat `linear` keyword as a CSSLinearEasingModel.
      // We return its full value instead of the keyword
      // since otherwise it will be parsed as a CSSLinearEasingModel
      // instead of a cubic bezier.
      if (raw === value && keyword !== 'linear') {
        return keyword;
      }
    }
    return raw;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly Regex =
      /((cubic-bezier\([^)]+\))|\b(linear(?![-\(])|ease-in-out|ease-in|ease-out|ease)\b)|(linear\([^)]+\))/g;
}

export const LINEAR_BEZIER = new CubicBezier(new Point(0, 0), new Point(1, 1));

export class EulerAngles {
  alpha: number;
  beta: number;
  gamma: number;

  constructor(alpha: number, beta: number, gamma: number) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
  }

  /**
   * Derives orientation angles from a rotation matrix.
   *
   * The angles alpha, beta and gamma are in the [0, 360), [-180, 180) and
   * [-90, 90) intervals respectively, as specified in the Device Orientation
   * spec (https://w3c.github.io/deviceorientation/#deviceorientation).
   *
   * The Euler angles derived here follow a Z-X'-Y'' sequence.
   *
   * In particular we compute the decomposition of a given rotation matrix r
   * such that
   *    r = rz(alpha) * rx(beta) * ry(gamma)
   * where rz, rx and ry are rotation matrices around z, x and y axes in the
   * world coordinate reference frame respectively. The reference frame
   * consists of three orthogonal axes x, y, z where x points East, y points
   * north and z points upwards perpendicular to the ground plane. The computed
   * angles alpha, beta and gamma are in degrees and clockwise-positive when
   * viewed along the positive direction of the corresponding axis. Except for
   * the special case when the beta angle is +-90 these angles uniquely
   * define the orientation of a mobile device in 3D space. The
   * alpha-beta-gamma representation resembles the yaw-pitch-roll convention
   * used in vehicle dynamics, however it does not exactly match it. One of the
   * differences is that the 'pitch' angle beta is allowed to be within [-180,
   * 180). A mobile device with pitch angle greater than 90 could
   * correspond to a user lying down and looking upward at the screen.
   */
  static fromDeviceOrientationRotationMatrix(rotationMatrix: DOMMatrixReadOnly): EulerAngles {
    let alpha, beta, gamma;

    // A few implementation notes:
    // - This code has been ported from Chromium's
    //   //services/device/generic_sensor/orientation_util.cc at commit
    //   1be837b6f142.
    //
    // - Since |rotationMatrix| contains non-integer numbers, directly
    //   comparing them to 0 will not be accurate, so we use |_Eps| to check if
    //   some numbers are close enough to 0.
    //
    // - The C++ code in Chromium uses a std::vector<double> to represent a 3x3
    //   rotation matrix in row-major order. |rotationMatrix| is a 4x4 matrix
    //   defined in column-major order, so |rotationMatrix.m13| here
    //   corresponds to |r[8]| in the original C++ code.
    //
    // - There are rounding errors and approximations in the floating-point
    //   arithmetics below, but it does not interfere with the use cases in
    //   DevTools (i.e. angles that are mostly within the allowed intervals). A
    //   rotation around the Z axis by 360 degrees will correctly return
    //   alpha=0, but a rotation around the Z axis by 360 * 20000000000000000
    //   will return alpha=~75 degrees, for example.
    if (Math.abs(rotationMatrix.m33) < EPS) {    // m33 == 0
      if (Math.abs(rotationMatrix.m13) < EPS) {  // m13 == 0, cos(beta) == 0
        // Gimbal lock discontinuity: in the Z-X'-Y'' angle system used here, a
        // rotation of 90 or -90 degrees around the X axis (beta) causes a
        // Gimbal lock, which we handle by always setting gamma = 0 and
        // handling the rotation in alpha.
        alpha = Math.atan2(rotationMatrix.m12, rotationMatrix.m11);
        beta = (rotationMatrix.m23 > 0) ? (Math.PI / 2) : -(Math.PI / 2);  // beta = +-pi/2
        gamma = 0;                                                         // gamma = 0
      } else if (rotationMatrix.m13 > 0) {                                 // cos(gamma) == 0, cos(beta) > 0
        alpha = Math.atan2(-rotationMatrix.m21, rotationMatrix.m22);
        beta = Math.asin(rotationMatrix.m23);  // beta [-pi/2, pi/2]
        gamma = -(Math.PI / 2);                // gamma = -pi/2
      } else {                                 // cos(gamma) == 0, cos(beta) < 0
        alpha = Math.atan2(rotationMatrix.m21, -rotationMatrix.m22);
        beta = -Math.asin(rotationMatrix.m23);
        beta += (beta > 0 || Math.abs(beta) < EPS) ? -Math.PI : Math.PI;   // beta [-pi,-pi/2) U (pi/2,pi)
        gamma = -(Math.PI / 2);                                            // gamma = -pi/2
      }
    } else if (rotationMatrix.m33 > 0) {  // cos(beta) > 0
      alpha = Math.atan2(-rotationMatrix.m21, rotationMatrix.m22);
      beta = Math.asin(rotationMatrix.m23);                         // beta (-pi/2, pi/2)
      gamma = Math.atan2(-rotationMatrix.m13, rotationMatrix.m33);  // gamma (-pi/2, pi/2)
    } else {                                                        // cos(beta) < 0
      alpha = Math.atan2(rotationMatrix.m21, -rotationMatrix.m22);
      beta = -Math.asin(rotationMatrix.m23);
      beta += (beta > 0 || Math.abs(beta) < EPS) ? -Math.PI : Math.PI;   // beta [-pi,-pi/2) U (pi/2,pi)
      gamma = Math.atan2(rotationMatrix.m13, -rotationMatrix.m33);       // gamma (-pi/2, pi/2)
    }

    // alpha is in [-pi, pi], make sure it is in [0, 2*pi).
    if (alpha < -EPS) {
      alpha += 2 * Math.PI;  // alpha [0, 2*pi)
    }

    // We do not need a lot of precision in degrees. Arbitrarily set it to 6
    // digits after the decimal point. In most use cases, this may be rounded
    // even further in SensorsView and when passing these degrees to CSS.
    alpha = Number(radiansToDegrees(alpha).toFixed(6));
    beta = Number(radiansToDegrees(beta).toFixed(6));
    gamma = Number(radiansToDegrees(gamma).toFixed(6));

    return new EulerAngles(alpha, beta, gamma);
  }
}

export const scalarProduct = function(u: Vector, v: Vector): number {
  return u.x * v.x + u.y * v.y + u.z * v.z;
};

export const crossProduct = function(u: Vector, v: Vector): Vector {
  const x = u.y * v.z - u.z * v.y;
  const y = u.z * v.x - u.x * v.z;
  const z = u.x * v.y - u.y * v.x;
  return new Vector(x, y, z);
};

export const subtract = function(u: Vector, v: Vector): Vector {
  const x = u.x - v.x;
  const y = u.y - v.y;
  const z = u.z - v.z;
  return new Vector(x, y, z);
};

export const multiplyVectorByMatrixAndNormalize = function(v: Vector, m: DOMMatrix): Vector {
  const t = v.x * m.m14 + v.y * m.m24 + v.z * m.m34 + m.m44;
  const x = (v.x * m.m11 + v.y * m.m21 + v.z * m.m31 + m.m41) / t;
  const y = (v.x * m.m12 + v.y * m.m22 + v.z * m.m32 + m.m42) / t;
  const z = (v.x * m.m13 + v.y * m.m23 + v.z * m.m33 + m.m43) / t;
  return new Vector(x, y, z);
};

export const calculateAngle = function(u: Vector, v: Vector): number {
  const uLength = u.length();
  const vLength = v.length();
  if (uLength <= EPS || vLength <= EPS) {
    return 0;
  }
  const cos = scalarProduct(u, v) / uLength / vLength;
  if (Math.abs(cos) > 1) {
    return 0;
  }
  return radiansToDegrees(Math.acos(cos));
};

export const degreesToRadians = function(deg: number): number {
  return deg * Math.PI / 180;
};

export const degreesToGradians = function(deg: number): number {
  return deg / 9 * 10;
};

export const degreesToTurns = function(deg: number): number {
  return deg / 360;
};

export const radiansToDegrees = function(rad: number): number {
  return rad * 180 / Math.PI;
};

export const radiansToGradians = function(rad: number): number {
  return rad * 200 / Math.PI;
};

export const radiansToTurns = function(rad: number): number {
  return rad / (2 * Math.PI);
};

export const gradiansToRadians = function(grad: number): number {
  return grad * Math.PI / 200;
};

export const turnsToRadians = function(turns: number): number {
  return turns * 2 * Math.PI;
};

export const boundsForTransformedPoints = function(matrix: DOMMatrix, points: number[], aggregateBounds?: {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
}): {
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
} {
  if (!aggregateBounds) {
    aggregateBounds = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity};
  }
  if (points.length % 3) {
    console.warn('Invalid size of points array');
  }
  for (let p = 0; p < points.length; p += 3) {
    let vector: Vector = new Vector(points[p], points[p + 1], points[p + 2]);
    vector = multiplyVectorByMatrixAndNormalize(vector, matrix);
    aggregateBounds.minX = Math.min(aggregateBounds.minX, vector.x);
    aggregateBounds.maxX = Math.max(aggregateBounds.maxX, vector.x);
    aggregateBounds.minY = Math.min(aggregateBounds.minY, vector.y);
    aggregateBounds.maxY = Math.max(aggregateBounds.maxY, vector.y);
  }
  return aggregateBounds;
};

export class Size {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clipTo(size?: Size|null): Size {
    if (!size) {
      return this;
    }
    return new Size(Math.min(this.width, size.width), Math.min(this.height, size.height));
  }

  scale(scale: number): Size {
    return new Size(this.width * scale, this.height * scale);
  }

  isEqual(size: Size|null): boolean {
    return size !== null && this.width === size.width && this.height === size.height;
  }

  widthToMax(size: number|Size): Size {
    return new Size(Math.max(this.width, (typeof size === 'number' ? size : size.width)), this.height);
  }

  addWidth(size: number|Size): Size {
    return new Size(this.width + (typeof size === 'number' ? size : size.width), this.height);
  }

  heightToMax(size: number|Size): Size {
    return new Size(this.width, Math.max(this.height, (typeof size === 'number' ? size : size.height)));
  }

  addHeight(size: number|Size): Size {
    return new Size(this.width, this.height + (typeof size === 'number' ? size : size.height));
  }
}

export class Constraints {
  minimum: Size;
  preferred: Size;
  constructor(minimum?: Size, preferred?: Size|null) {
    this.minimum = minimum || new Size(0, 0);

    this.preferred = preferred || this.minimum;

    if (this.minimum.width > this.preferred.width || this.minimum.height > this.preferred.height) {
      throw new Error('Minimum size is greater than preferred.');
    }
  }

  isEqual(constraints: Constraints|null): boolean {
    return constraints !== null && this.minimum.isEqual(constraints.minimum) &&
        this.preferred.isEqual(constraints.preferred);
  }

  widthToMax(value: number|Constraints): Constraints {
    if (typeof value === 'number') {
      return new Constraints(this.minimum.widthToMax(value), this.preferred.widthToMax(value));
    }
    return new Constraints(this.minimum.widthToMax(value.minimum), this.preferred.widthToMax(value.preferred));
  }

  addWidth(value: number|Constraints): Constraints {
    if (typeof value === 'number') {
      return new Constraints(this.minimum.addWidth(value), this.preferred.addWidth(value));
    }
    return new Constraints(this.minimum.addWidth(value.minimum), this.preferred.addWidth(value.preferred));
  }

  heightToMax(value: number|Constraints): Constraints {
    if (typeof value === 'number') {
      return new Constraints(this.minimum.heightToMax(value), this.preferred.heightToMax(value));
    }
    return new Constraints(this.minimum.heightToMax(value.minimum), this.preferred.heightToMax(value.preferred));
  }

  addHeight(value: number|Constraints): Constraints {
    if (typeof value === 'number') {
      return new Constraints(this.minimum.addHeight(value), this.preferred.addHeight(value));
    }
    return new Constraints(this.minimum.addHeight(value.minimum), this.preferred.addHeight(value.preferred));
  }
}
