// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/legacy/legacy.js';
import {assertNotNullOrUndefined} from '../../../../front_end/core/platform/platform.js';

describe('Vector', () => {
  it('can be instantiated without issues', () => {
    const vector = new UI.Geometry.Vector(1, 2, 3);
    assert.strictEqual(vector.x, 1, 'x value was not set correctly');
    assert.strictEqual(vector.y, 2, 'y value was not set correctly');
    assert.strictEqual(vector.z, 3, 'z value was not set correctly');
  });

  it('is able to return the length', () => {
    const vector = new UI.Geometry.Vector(1, 2, 3);
    assert.strictEqual(vector.length(), 3.7416573867739413, 'length was not returned correctly');
  });

  it('is able to be normalized if the length was above epsilon', () => {
    const vector = new UI.Geometry.Vector(1, 2, 3);
    vector.normalize();
    assert.strictEqual(vector.x, 0.2672612419124244, 'x value was not set correctly');
    assert.strictEqual(vector.y, 0.5345224838248488, 'y value was not set correctly');
    assert.strictEqual(vector.z, 0.8017837257372732, 'z value was not set correctly');
    assert.strictEqual(vector.length(), 1, 'length was not returned correctly');
  });

  it('does not normalize if the length was below epsilon', () => {
    const vector = new UI.Geometry.Vector(0.000001, 0.000002, 0.000003);
    vector.normalize();
    assert.strictEqual(vector.x, 0.000001, 'x value was changed');
    assert.strictEqual(vector.y, 0.000002, 'y value was changed');
    assert.strictEqual(vector.z, 0.000003, 'z value was changed');
    assert.strictEqual(vector.length(), 0.0000037416573867739415, 'length was not returned correctly');
  });
});

describe('Point', () => {
  it('can be instantiated without issues', () => {
    const point = new UI.Geometry.Point(1, 2);
    assert.strictEqual(point.x, 1, 'x value was not set correctly');
    assert.strictEqual(point.y, 2, 'y value was not set correctly');
  });

  it('is able to return distanct to a certain point', () => {
    const p1 = new UI.Geometry.Point(0, 0);
    const p2 = new UI.Geometry.Point(0, 1);
    const p3 = new UI.Geometry.Point(1, 0);
    const p4 = new UI.Geometry.Point(3, 4);
    assert.strictEqual(p1.distanceTo(p2), 1, 'distance to the first point was not returned correctly');
    assert.strictEqual(p1.distanceTo(p3), 1, 'distance to the second point was not returned correctly');
    assert.strictEqual(p1.distanceTo(p4), 5, 'distance to the third point was not returned correctly');
  });

  it('is able to be scaled to a certain value', () => {
    const point = new UI.Geometry.Point(1, 2);
    const scaledPoint = point.scale(2);
    assert.strictEqual(scaledPoint.x, 2, 'x was not scaled correctly');
    assert.strictEqual(scaledPoint.y, 4, 'y was not scaled correctly');
  });

  it('is able to be projected on a point that is not the origin', () => {
    const p1 = new UI.Geometry.Point(1, 2);
    const p2 = new UI.Geometry.Point(3, 4);
    const projectedPoint = p1.projectOn(p2);
    assert.strictEqual(projectedPoint.x, 1.32, 'x was not projected correctly');
    assert.strictEqual(projectedPoint.y, 1.76, 'y was not projected correctly');
  });

  it('is able to be projected on a point that is the origin', () => {
    const p1 = new UI.Geometry.Point(1, 2);
    const p2 = new UI.Geometry.Point(0, 0);
    const projectedPoint = p1.projectOn(p2);
    assert.strictEqual(projectedPoint.x, 0, 'x was not projected correctly');
    assert.strictEqual(projectedPoint.y, 0, 'y was not projected correctly');
  });

  it('can be represented as a string', () => {
    const point = new UI.Geometry.Point(1.23, 4.56);
    assert.strictEqual(point.toString(), '1.23, 4.56', 'string representation was not returned correctly');
  });
});

describe('CubicBezier', () => {
  it('can be instantiated without issues', () => {
    const p1 = new UI.Geometry.Point(1, 2);
    const p2 = new UI.Geometry.Point(3, 4);
    const cubicBezier = new UI.Geometry.CubicBezier(p1, p2);
    assert.strictEqual(cubicBezier.controlPoints[0].x, 1, 'x value for the first point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[0].y, 2, 'y value for the first point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[1].x, 3, 'x value for the second point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[1].y, 4, 'y value for the second point was not set correctly');
  });

  it('is able to return a cubic bezier from a valid string', () => {
    const testText = 'linear';
    const cubicBezier = UI.Geometry.CubicBezier.parse(testText);
    assertNotNullOrUndefined(cubicBezier);
    assert.strictEqual(cubicBezier.controlPoints[0].x, 0, 'x value for the first point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[0].y, 0, 'y value for the first point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[1].x, 1, 'x value for the second point was not set correctly');
    assert.strictEqual(cubicBezier.controlPoints[1].y, 1, 'y value for the second point was not set correctly');
  });

  it('returns null from an invalid string', () => {
    const testText = 'invalid text';
    const cubicBezier = UI.Geometry.CubicBezier.parse(testText);
    assert.isNull(cubicBezier, 'function did not return null');
  });

  it('is able to evaluate a number to a point', () => {
    const p1 = new UI.Geometry.Point(1, 2);
    const p2 = new UI.Geometry.Point(3, 4);
    const cubicBezier = new UI.Geometry.CubicBezier(p1, p2);
    const resultPoint = cubicBezier.evaluateAt(5);
    assert.strictEqual(resultPoint.x, -535, 'x value for the resulting point was not set correctly');
    assert.strictEqual(resultPoint.y, -595, 'y value for the resulting point was not set correctly');
  });

  it('is able to be represented as CSS text with raw values', () => {
    const p1 = new UI.Geometry.Point(1, 2);
    const p2 = new UI.Geometry.Point(3, 4);
    const cubicBezier = new UI.Geometry.CubicBezier(p1, p2);
    const cssText = cubicBezier.asCSSText();
    assert.strictEqual(cssText, 'cubic-bezier(1, 2, 3, 4)', 'cubic bezier was not represented correctly as CSS text');
  });

  it('is able to be represented as CSS text with a keyword value', () => {
    const p1 = new UI.Geometry.Point(0.25, 0.1);
    const p2 = new UI.Geometry.Point(0.25, 1);
    const cubicBezier = new UI.Geometry.CubicBezier(p1, p2);
    const cssText = cubicBezier.asCSSText();
    assert.strictEqual(cssText, 'ease', 'cubic bezier was not represented correctly as CSS text');
  });
});

describe('EulerAngles', () => {
  it('can be instantiated without issues', () => {
    const eulerAngles = new UI.Geometry.EulerAngles(1, 2, 3);
    assert.strictEqual(eulerAngles.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(eulerAngles.beta, 2, 'beta value was not set correctly');
    assert.strictEqual(eulerAngles.gamma, 3, 'gamma value was not set correctly');
  });

  it('is able to return Euler angles from an identity rotation matrix', () => {
    const matrix = new DOMMatrix();
    const result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 0, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 0, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');
  });

  function matrixWithZXYRotation(alpha: number, beta: number, gamma: number): DOMMatrix {
    return new DOMMatrix().rotate(0, 0, alpha).rotate(beta, 0, 0).rotate(0, gamma, 0);
  }

  it('is able to return Euler angles from a rotation matrix', () => {
    let matrix, result;

    matrix = matrixWithZXYRotation(0, 1, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 0, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 1, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 0, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 0, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 2, 0);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 2, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 2, 3);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 2, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 3, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, -2, -3);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -2, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, -3, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, -2, 3);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -2, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 3, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 2, -3);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 2, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, -3, 'gamma value was not set correctly');
  });

  it('returns canonicalized Euler angles when a Gimbal lock occurs', () => {
    let matrix, result;

    matrix = matrixWithZXYRotation(30, 90, 45);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 75, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(30, -90, 45);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 345, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(30, -90, -45);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 75, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(0, 90, 45);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 45, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(0, 90, -45);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 315, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(45, 90, 0);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 45, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(0, 90, 0);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 0, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(0, -90, 0);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 0, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -90, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 0, 'gamma value was not set correctly');
  });

  it('returns Euler angles inside the allowed Device Orientation intervals', () => {
    let matrix, result;

    matrix = matrixWithZXYRotation(1, 2, 90);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 181, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 178, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, -90, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 2, -91);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 181, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 178, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 89, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(360, 1, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 0, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 1, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(-1, 1, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 359, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 1, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, -181, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, 179, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');

    matrix = matrixWithZXYRotation(1, 180, 2);
    result = UI.Geometry.EulerAngles.fromDeviceOrientationRotationMatrix(matrix);
    assert.strictEqual(result.alpha, 1, 'alpha value was not set correctly');
    assert.strictEqual(result.beta, -180, 'beta value was not set correctly');
    assert.strictEqual(result.gamma, 2, 'gamma value was not set correctly');
  });
});

describe('Size', () => {
  it('can be instantiated without issues', () => {
    const size = new UI.Geometry.Size(1, 2);
    assert.strictEqual(size.width, 1, 'width value was not set correctly');
    assert.strictEqual(size.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another smaller size', () => {
    const size1 = new UI.Geometry.Size(3, 4);
    const size2 = new UI.Geometry.Size(1, 2);
    const resultSize = size1.clipTo(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another larger size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const resultSize = size1.clipTo(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('returns the original size if nothing was passed to the clipTo function', () => {
    const size = new UI.Geometry.Size(1, 2);
    const resultSize = size.clipTo();
    assert.strictEqual(resultSize.width, 1, 'width value was not set correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be scaled to a different size', () => {
    const size = new UI.Geometry.Size(1, 2);
    const resultSize = size.scale(2);
    assert.strictEqual(resultSize.width, 2, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to check if it is equal to another size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(1, 2);
    const result1 = size1.isEqual(size2);
    const result2 = size1.isEqual(size3);
    assert.isFalse(result1, 'size2 was considered equal');
    assert.isTrue(result2, 'size3 was not considered equal');
  });

  it('is able to change width to the max value given a size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const resultSize = size1.widthToMax(size2);
    assert.strictEqual(resultSize.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change width to the max value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const resultSize = size1.widthToMax(5);
    assert.strictEqual(resultSize.width, 5, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const resultSize = size1.addWidth(size2);
    assert.strictEqual(resultSize.width, 4, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const resultSize = size1.addWidth(5);
    assert.strictEqual(resultSize.width, 6, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const resultSize = size1.heightToMax(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const resultSize = size1.heightToMax(5);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 5, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a size', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const resultSize = size1.addHeight(size2);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 6, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const resultSize = size1.addHeight(5);
    assert.strictEqual(resultSize.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.height, 7, 'height value was not scaled correctly');
  });
});

describe('Constraints', () => {
  it('can be instantiated without issues', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const constraints = new UI.Geometry.Constraints(size1, size2);
    assert.strictEqual(constraints.minimum.width, 1, 'size1 width value was not set correctly');
    assert.strictEqual(constraints.minimum.height, 2, 'size1 height value was not set correctly');
    assert.strictEqual(constraints.preferred.width, 3, 'size2 width value was not set correctly');
    assert.strictEqual(constraints.preferred.height, 4, 'size2 height value was not set correctly');
  });

  it('thows an error if instantiated with a minimum size that is larger than the the preferred size', () => {
    const size1 = new UI.Geometry.Size(3, 4);
    const size2 = new UI.Geometry.Size(1, 2);
    assert.throws(() => new UI.Geometry.Constraints(size1, size2), Error, 'Minimum size is greater than preferred.');
  });

  it('sets minimum and preferred to UI.Geometry.Size(0, 0) if no values were given to the constructor', () => {
    const constraints = new UI.Geometry.Constraints();
    assert.strictEqual(constraints.minimum.width, 0, 'size1 width value was not set correctly');
    assert.strictEqual(constraints.minimum.height, 0, 'size1 height value was not set correctly');
    assert.strictEqual(constraints.preferred.width, 0, 'size2 width value was not set correctly');
    assert.strictEqual(constraints.preferred.height, 0, 'size2 height value was not set correctly');
  });

  it('is able to check if it is equal to another constraint', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(5, 6);
    const size4 = new UI.Geometry.Size(7, 8);
    const constraints1 = new UI.Geometry.Constraints(size1, size2);
    const constraints2 = new UI.Geometry.Constraints(size3, size4);
    const constraints3 = new UI.Geometry.Constraints(size1, size2);
    assert.isFalse(constraints1.isEqual(constraints2), 'constraints2 was considered equal');
    assert.isTrue(constraints1.isEqual(constraints3), 'constraints3 was not considered equal');
  });

  it('is able to change widths to the max value given a constraint', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(5, 6);
    const size4 = new UI.Geometry.Size(7, 8);
    const constraints1 = new UI.Geometry.Constraints(size1, size2);
    const constraints2 = new UI.Geometry.Constraints(size3, size4);
    const resultSize = constraints1.widthToMax(constraints2);
    assert.strictEqual(resultSize.minimum.width, 5, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 7, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change widths to the max value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const constraints = new UI.Geometry.Constraints(size1, size2);
    const resultSize = constraints.widthToMax(5);
    assert.strictEqual(resultSize.minimum.width, 5, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 5, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to increase widths by a certain value given a constraint', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(5, 6);
    const size4 = new UI.Geometry.Size(7, 8);
    const constraints1 = new UI.Geometry.Constraints(size1, size2);
    const constraints2 = new UI.Geometry.Constraints(size3, size4);
    const resultSize = constraints1.addWidth(constraints2);
    assert.strictEqual(resultSize.minimum.width, 6, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 10, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to increase widths by a certain value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const constraints = new UI.Geometry.Constraints(size1, size2);
    const resultSize = constraints.addWidth(5);
    assert.strictEqual(resultSize.minimum.width, 6, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 8, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change heights to the max value given a constraint', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(5, 6);
    const size4 = new UI.Geometry.Size(7, 8);
    const constraints1 = new UI.Geometry.Constraints(size1, size2);
    const constraints2 = new UI.Geometry.Constraints(size3, size4);
    const resultSize = constraints1.heightToMax(constraints2);
    assert.strictEqual(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 6, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 8, 'height value was not scaled correctly');
  });

  it('is able to change heights to the max value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const constraints = new UI.Geometry.Constraints(size1, size2);
    const resultSize = constraints.heightToMax(5);
    assert.strictEqual(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 5, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 5, 'height value was not scaled correctly');
  });

  it('is able to increase heights by a certain value given a constraint', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const size3 = new UI.Geometry.Size(5, 6);
    const size4 = new UI.Geometry.Size(7, 8);
    const constraints1 = new UI.Geometry.Constraints(size1, size2);
    const constraints2 = new UI.Geometry.Constraints(size3, size4);
    const resultSize = constraints1.addHeight(constraints2);
    assert.strictEqual(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 8, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 12, 'height value was not scaled correctly');
  });

  it('is able to increase heights by a certain value given a number', () => {
    const size1 = new UI.Geometry.Size(1, 2);
    const size2 = new UI.Geometry.Size(3, 4);
    const constraints = new UI.Geometry.Constraints(size1, size2);
    const resultSize = constraints.addHeight(5);
    assert.strictEqual(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.minimum.height, 7, 'height value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.strictEqual(resultSize.preferred.height, 9, 'height value was not scaled correctly');
  });
});

describe('scalarProduct', () => {
  it('returns the scalar product for two vectors', () => {
    const vector1 = new UI.Geometry.Vector(1, 2, 3);
    const vector2 = new UI.Geometry.Vector(4, 5, 6);
    const result = UI.Geometry.scalarProduct(vector1, vector2);
    assert.strictEqual(result, 32, 'the scalar product was not calculated correctly');
  });
});

describe('crossProduct', () => {
  it('returns the cross product for two vectors', () => {
    const vector1 = new UI.Geometry.Vector(1, 2, 3);
    const vector2 = new UI.Geometry.Vector(4, 5, 6);
    const result = UI.Geometry.crossProduct(vector1, vector2);
    assert.strictEqual(result.x, -3, 'x value for the resulting vector was not set correctly');
    assert.strictEqual(result.y, 6, 'y value for the resulting vector was not set correctly');
    assert.strictEqual(result.z, -3, 'z value for the resulting vector was not set correctly');
  });
});

describe('subtract', () => {
  it('returns the difference between two vectors', () => {
    const vector1 = new UI.Geometry.Vector(1, 2, 3);
    const vector2 = new UI.Geometry.Vector(4, 5, 6);
    const result = UI.Geometry.subtract(vector1, vector2);
    assert.strictEqual(result.x, -3, 'x value for the resulting vector was not set correctly');
    assert.strictEqual(result.y, -3, 'y value for the resulting vector was not set correctly');
    assert.strictEqual(result.z, -3, 'z value for the resulting vector was not set correctly');
  });
});

describe('multiplyVectorByMatrixAndNormalize', () => {
  it('returns the vector multiplied by a matrix and normalized', () => {
    const vector = new UI.Geometry.Vector(1, 2, 3);
    const matrix = new WebKitCSSMatrix();
    const result = UI.Geometry.multiplyVectorByMatrixAndNormalize(vector, matrix);
    assert.strictEqual(result.x, 1, 'x value for the resulting vector was not set correctly');
    assert.strictEqual(result.y, 2, 'y value for the resulting vector was not set correctly');
    assert.strictEqual(result.z, 3, 'z value for the resulting vector was not set correctly');
  });
});

describe('calculateAngle', () => {
  it('returns the angle between two vectors', () => {
    const vector1 = new UI.Geometry.Vector(1, 2, 3);
    const vector2 = new UI.Geometry.Vector(4, 5, 6);
    const result = UI.Geometry.calculateAngle(vector1, vector2);
    assert.strictEqual(result, 12.933154491899135, 'angle returned was not correct');
  });
});

describe('boundsForTransformedPoints', () => {
  it('returns the bounds for transformed points', () => {
    const matrix = new WebKitCSSMatrix();
    const result = UI.Geometry.boundsForTransformedPoints(matrix, [1, 2, 3], {minX: 5, maxX: 6, minY: 7, maxY: 8});
    assert.strictEqual(result.minX, 1, 'minX was calculated incorrectly');
    assert.strictEqual(result.maxX, 6, 'maxX was calculated incorrectly');
    assert.strictEqual(result.minY, 2, 'minY was calculated incorrectly');
    assert.strictEqual(result.maxY, 8, 'maxY was calculated incorrectly');
  });

  describe('degreesToRadians', () => {
    it('converts degrees to radians correctly', () => {
      assert.strictEqual(UI.Geometry.degreesToRadians(45), 0.7853981633974483);
      assert.strictEqual(UI.Geometry.degreesToRadians(180), 3.141592653589793);
    });
  });

  describe('degreesToGradians', () => {
    it('converts degrees to gradians correctly', () => {
      assert.strictEqual(UI.Geometry.degreesToGradians(45), 50);
      assert.strictEqual(UI.Geometry.degreesToGradians(180), 200);
    });
  });

  describe('degreesToTurns', () => {
    it('converts degrees to turns correctly', () => {
      assert.strictEqual(UI.Geometry.degreesToTurns(45), 0.125);
      assert.strictEqual(UI.Geometry.degreesToTurns(180), 0.5);
    });
  });

  describe('radiansToDegrees', () => {
    it('converts radians to degrees correctly', () => {
      assert.strictEqual(UI.Geometry.radiansToDegrees(1), 57.29577951308232);
      assert.strictEqual(UI.Geometry.radiansToDegrees(1.5), 85.94366926962348);
    });
  });

  describe('radiansToGradians', () => {
    it('converts radians to gradians correctly', () => {
      assert.strictEqual(UI.Geometry.radiansToGradians(1), 63.66197723675813);
      assert.strictEqual(UI.Geometry.radiansToGradians(1.5), 95.4929658551372);
    });
  });

  describe('radiansToTurns', () => {
    it('converts radians to turns correctly', () => {
      assert.strictEqual(UI.Geometry.radiansToTurns(1), 0.15915494309189535);
      assert.strictEqual(UI.Geometry.radiansToTurns(1.5), 0.238732414637843);
    });
  });

  describe('gradiansToRadians', () => {
    it('converts gradians to radians correctly', () => {
      assert.strictEqual(UI.Geometry.gradiansToRadians(50), 0.7853981633974483);
      assert.strictEqual(UI.Geometry.gradiansToRadians(200), 3.141592653589793);
    });
  });

  describe('turnsToRadians', () => {
    it('converts turns to radians correctly', () => {
      assert.strictEqual(UI.Geometry.gradiansToRadians(0.5), 0.007853981633974483);
      assert.strictEqual(UI.Geometry.gradiansToRadians(1), 0.015707963267948967);
    });
  });
});
