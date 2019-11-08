// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {log} from 'util';

const {assert} = chai;

import {Vector, Point, CubicBezier, EulerAngles, Size, Insets, Rect, Constraints, scalarProduct, crossProduct, subtract, multiplyVectorByMatrixAndNormalize, calculateAngle, boundsForTransformedPoints} from '../../../../front_end/ui/Geometry.js';

describe('Vector', () => {
  it('can be instantiated without issues', () => {
    const vector = new Vector(1, 2, 3);
    assert.equal(vector.x, 1, 'x value was not set correctly');
    assert.equal(vector.y, 2, 'y value was not set correctly');
    assert.equal(vector.z, 3, 'z value was not set correctly');
  });

  it('is able to return the length', () => {
    const vector = new Vector(1, 2, 3);
    assert.equal(vector.length(), 3.7416573867739413, 'length was not returned correctly');
  });

  it('is able to be normalized if the length was above epsilon', () => {
    const vector = new Vector(1, 2, 3);
    vector.normalize();
    assert.equal(vector.x, 0.2672612419124244, 'x value was not set correctly');
    assert.equal(vector.y, 0.5345224838248488, 'y value was not set correctly');
    assert.equal(vector.z, 0.8017837257372732, 'z value was not set correctly');
    assert.equal(vector.length(), 1, 'length was not returned correctly');
  });

  it('does not normalize if the length was below epsilon', () => {
    const vector = new Vector(0.000001, 0.000002, 0.000003);
    vector.normalize();
    assert.equal(vector.x, 0.000001, 'x value was changed');
    assert.equal(vector.y, 0.000002, 'y value was changed');
    assert.equal(vector.z, 0.000003, 'z value was changed');
    assert.equal(vector.length(), 0.0000037416573867739415, 'length was not returned correctly');
  });
});

describe('Point', () => {
  it('can be instantiated without issues', () => {
    const point = new Point(1, 2);
    assert.equal(point.x, 1, 'x value was not set correctly');
    assert.equal(point.y, 2, 'y value was not set correctly');
  });

  it('is able to return distanct to a certain point', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(0, 1);
    const p3 = new Point(1, 0);
    const p4 = new Point(3, 4);
    assert.equal(p1.distanceTo(p2), 1, 'distance to the first point was not returned correctly');
    assert.equal(p1.distanceTo(p3), 1, 'distance to the second point was not returned correctly');
    assert.equal(p1.distanceTo(p4), 5, 'distance to the third point was not returned correctly');
  });

  it('is able to be scaled to a certain value', () => {
    const point = new Point(1, 2);
    const scaledPoint = point.scale(2);
    assert.equal(scaledPoint.x, 2, 'x was not scaled correctly');
    assert.equal(scaledPoint.y, 4, 'y was not scaled correctly');
  });

  it('is able to be projected on a point that is not the origin', () => {
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    const projectedPoint = p1.projectOn(p2);
    assert.equal(projectedPoint.x, 1.32, 'x was not projected correctly');
    assert.equal(projectedPoint.y, 1.76, 'y was not projected correctly');
  });

  it('is able to be projected on a point that is the origin', () => {
    const p1 = new Point(1, 2);
    const p2 = new Point(0, 0);
    const projectedPoint = p1.projectOn(p2);
    assert.equal(projectedPoint.x, 0, 'x was not projected correctly');
    assert.equal(projectedPoint.y, 0, 'y was not projected correctly');
  });

  it('can be represented as a string', () => {
    const point = new Point(1.23, 4.56);
    assert.equal(point.toString(), '1.23, 4.56', 'string representation was not returned correctly');
  });
});

describe('CubicBezier', () => {
  it('can be instantiated without issues', () => {
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    const cubicBezier = new CubicBezier(p1, p2);
    assert.equal(cubicBezier.controlPoints[0].x, 1, 'x value for the first point was not set correctly');
    assert.equal(cubicBezier.controlPoints[0].y, 2, 'y value for the first point was not set correctly');
    assert.equal(cubicBezier.controlPoints[1].x, 3, 'x value for the second point was not set correctly');
    assert.equal(cubicBezier.controlPoints[1].y, 4, 'y value for the second point was not set correctly');
  });

  it('is able to return a cubic bezier from a valid string', () => {
    const testText = 'linear';
    const cubicBezier = CubicBezier.parse(testText);
    assert.equal(cubicBezier.controlPoints[0].x, 0, 'x value for the first point was not set correctly');
    assert.equal(cubicBezier.controlPoints[0].y, 0, 'y value for the first point was not set correctly');
    assert.equal(cubicBezier.controlPoints[1].x, 1, 'x value for the second point was not set correctly');
    assert.equal(cubicBezier.controlPoints[1].y, 1, 'y value for the second point was not set correctly');
  });

  it('returns null from an invalid string', () => {
    const testText = 'invalid text';
    const cubicBezier = CubicBezier.parse(testText);
    assert.isNull(cubicBezier, 'function did not return null');
  });

  it('is able to evaluate a number to a point', () => {
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    const cubicBezier = new CubicBezier(p1, p2);
    const resultPoint = cubicBezier.evaluateAt(5);
    assert.equal(resultPoint.x, -535, 'x value for the resulting point was not set correctly');
    assert.equal(resultPoint.y, -595, 'y value for the resulting point was not set correctly');
  });

  it('is able to be represented as CSS text with raw values', () => {
    const p1 = new Point(1, 2);
    const p2 = new Point(3, 4);
    const cubicBezier = new CubicBezier(p1, p2);
    const cssText = cubicBezier.asCSSText();
    assert.equal(cssText, 'cubic-bezier(1, 2, 3, 4)', 'cubic bezier was not represented correctly as CSS text');
  });

  it('is able to be represented as CSS text with a keyword value', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(1, 1);
    const cubicBezier = new CubicBezier(p1, p2);
    const cssText = cubicBezier.asCSSText();
    assert.equal(cssText, 'linear', 'cubic bezier was not represented correctly as CSS text');
  });
});

describe('EulerAngles', () => {
  it('can be instantiated without issues', () => {
    const eulerAngles = new EulerAngles(1, 2, 3);
    assert.equal(eulerAngles.alpha, 1, 'alpha value was not set correctly');
    assert.equal(eulerAngles.beta, 2, 'beta value was not set correctly');
    assert.equal(eulerAngles.gamma, 3, 'gamma value was not set correctly');
  });

  it('is able to return a rotate 3D string', () => {
    const eulerAngles = new EulerAngles(1, 2, 3);
    const result = eulerAngles.toRotate3DString();
    assert.equal(
        result, 'rotate3d(0,1,0,1deg) rotate3d(-1,0,0,2deg) rotate3d(0,-0.03489949670250097,0.9993908270190958,3deg)',
        'function did not return the correct rotate 3D string');
  });

  it('is able to return an euler angles from rotation matrix', () => {
    const matrix = new WebKitCSSMatrix();
    const result = EulerAngles.fromRotationMatrix(matrix);
    assert.equal(result.alpha, 0, 'alpha value was not set correctly');
    assert.equal(result.beta, 0, 'beta value was not set correctly');
    assert.equal(result.gamma, 0, 'gamma value was not set correctly');
  });
});

describe('Size', () => {
  it('can be instantiated without issues', () => {
    const size = new Size(1, 2);
    assert.equal(size.width, 1, 'width value was not set correctly');
    assert.equal(size.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another smaller size', () => {
    const size1 = new Size(3, 4);
    const size2 = new Size(1, 2);
    const resultSize = size1.clipTo(size2);
    assert.equal(resultSize.width, 1, 'width value was not set correctly');
    assert.equal(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be clipped to another larger size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const resultSize = size1.clipTo(size2);
    assert.equal(resultSize.width, 1, 'width value was not set correctly');
    assert.equal(resultSize.height, 2, 'height value was not set correctly');
  });

  it('returns the original size if nothing was passed to the clipTo function', () => {
    const size = new Size(1, 2);
    const resultSize = size.clipTo();
    assert.equal(resultSize.width, 1, 'width value was not set correctly');
    assert.equal(resultSize.height, 2, 'height value was not set correctly');
  });

  it('can be scaled to a different size', () => {
    const size = new Size(1, 2);
    const resultSize = size.scale(2);
    assert.equal(resultSize.width, 2, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to check if it is equal to another size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(1, 2);
    const result1 = size1.isEqual(size2);
    const result2 = size1.isEqual(size3);
    assert.isFalse(result1, 'size2 was considered equal');
    assert.isTrue(result2, 'size3 was not considered equal');
  });

  it('is able to change width to the max value given a size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const resultSize = size1.widthToMax(size2);
    assert.equal(resultSize.width, 3, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change width to the max value given a number', () => {
    const size1 = new Size(1, 2);
    const resultSize = size1.widthToMax(5);
    assert.equal(resultSize.width, 5, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const resultSize = size1.addWidth(size2);
    assert.equal(resultSize.width, 4, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to increase width by a certain value given a number', () => {
    const size1 = new Size(1, 2);
    const resultSize = size1.addWidth(5);
    assert.equal(resultSize.width, 6, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 2, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const resultSize = size1.heightToMax(size2);
    assert.equal(resultSize.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change height to the max value given a number', () => {
    const size1 = new Size(1, 2);
    const resultSize = size1.heightToMax(5);
    assert.equal(resultSize.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 5, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a size', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const resultSize = size1.addHeight(size2);
    assert.equal(resultSize.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 6, 'height value was not scaled correctly');
  });

  it('is able to increase height by a certain value given a number', () => {
    const size1 = new Size(1, 2);
    const resultSize = size1.addHeight(5);
    assert.equal(resultSize.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.height, 7, 'height value was not scaled correctly');
  });
});

describe('Insets', () => {
  it('can be instantiated without issues', () => {
    const insets = new Insets(1, 2, 3, 4);
    assert.equal(insets.left, 1, 'left value was not set correctly');
    assert.equal(insets.top, 2, 'top value was not set correctly');
    assert.equal(insets.right, 3, 'right value was not set correctly');
    assert.equal(insets.bottom, 4, 'bottom value was not set correctly');
  });

  it('is able to check if it is equal to another Insets', () => {
    const insets1 = new Insets(1, 2, 3, 4);
    const insets2 = new Insets(5, 6, 7, 7);
    const insets3 = new Insets(1, 2, 3, 4);
    const result1 = insets1.isEqual(insets2);
    const result2 = insets1.isEqual(insets3);
    assert.isFalse(result1, 'insets2 was considered equal');
    assert.isTrue(result2, 'insets3 was not considered equal');
  });
});

describe('Rect', () => {
  it('can be instantiated without issues', () => {
    const rect = new Rect(1, 2, 3, 4);
    assert.equal(rect.left, 1, 'left value was not set correctly');
    assert.equal(rect.top, 2, 'top value was not set correctly');
    assert.equal(rect.width, 3, 'width value was not set correctly');
    assert.equal(rect.height, 4, 'height value was not set correctly');
  });

  it('is able to check if it is equal to another Rect', () => {
    const rect1 = new Rect(1, 2, 3, 4);
    const rect2 = new Rect(5, 6, 7, 7);
    const rect3 = new Rect(1, 2, 3, 4);
    const result1 = rect1.isEqual(rect2);
    const result2 = rect1.isEqual(rect3);
    assert.isFalse(result1, 'rect2 was considered equal');
    assert.isTrue(result2, 'rect3 was not considered equal');
  });

  it('is able to be scaled to a certain value', () => {
    const rect = new Rect(1, 2, 3, 4);
    const resultRect = rect.scale(2);
    assert.equal(resultRect.left, 2, 'left value was not set correctly');
    assert.equal(resultRect.top, 4, 'top value was not set correctly');
    assert.equal(resultRect.width, 6, 'width value was not set correctly');
    assert.equal(resultRect.height, 8, 'height value was not set correctly');
  });

  it('is able to return a size consisting of the height and width of the rectangle', () => {
    const rect = new Rect(1, 2, 3, 4);
    const result = rect.size();
    assert.equal(result.width, 3, 'width value was not set correctly');
    assert.equal(result.height, 4, 'height value was not set correctly');
  });

  it('is able to return a rectangle relative to an origin', () => {
    const rect = new Rect(5, 6, 7, 8);
    const origin = new Rect(1, 2, 3, 4);
    const result = rect.relativeTo(origin);
    assert.equal(result.left, 4, 'left value was not set correctly');
    assert.equal(result.top, 4, 'top value was not set correctly');
    assert.equal(result.width, 7, 'width value was not set correctly');
    assert.equal(result.height, 8, 'height value was not set correctly');
  });

  it('is able to return a rectangle rebased to an origin', () => {
    const rect = new Rect(5, 6, 7, 8);
    const origin = new Rect(1, 2, 3, 4);
    const result = rect.rebaseTo(origin);
    assert.equal(result.left, 6, 'left value was not set correctly');
    assert.equal(result.top, 8, 'top value was not set correctly');
    assert.equal(result.width, 7, 'width value was not set correctly');
    assert.equal(result.height, 8, 'height value was not set correctly');
  });
});

describe('Constraints', () => {
  it('can be instantiated without issues', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const constraints = new Constraints(size1, size2);
    assert.equal(constraints.minimum.width, 1, 'size1 width value was not set correctly');
    assert.equal(constraints.minimum.height, 2, 'size1 height value was not set correctly');
    assert.equal(constraints.preferred.width, 3, 'size2 width value was not set correctly');
    assert.equal(constraints.preferred.height, 4, 'size2 height value was not set correctly');
  });

  it('thows an error if instantiated with a minimum size that is larger than the the preferred size', () => {
    const size1 = new Size(3, 4);
    const size2 = new Size(1, 2);
    assert.throws(() => new Constraints(size1, size2), Error, 'Minimum size is greater than preferred.');
  });

  it('sets minimum and preferred to Size(0, 0) if no values were given to the constructor', () => {
    const constraints = new Constraints();
    assert.equal(constraints.minimum.width, 0, 'size1 width value was not set correctly');
    assert.equal(constraints.minimum.height, 0, 'size1 height value was not set correctly');
    assert.equal(constraints.preferred.width, 0, 'size2 width value was not set correctly');
    assert.equal(constraints.preferred.height, 0, 'size2 height value was not set correctly');
  });

  it('is able to check if it is equal to another constraint', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(5, 6);
    const size4 = new Size(7, 8);
    const constraints1 = new Constraints(size1, size2);
    const constraints2 = new Constraints(size3, size4);
    const constraints3 = new Constraints(size1, size2);
    assert.isFalse(constraints1.isEqual(constraints2), 'constraints2 was considered equal');
    assert.isTrue(constraints1.isEqual(constraints3), 'constraints3 was not considered equal');
  });

  it('is able to change widths to the max value given a constraint', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(5, 6);
    const size4 = new Size(7, 8);
    const constraints1 = new Constraints(size1, size2);
    const constraints2 = new Constraints(size3, size4);
    const resultSize = constraints1.widthToMax(constraints2);
    assert.equal(resultSize.minimum.width, 5, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 7, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change widths to the max value given a number', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const constraints = new Constraints(size1, size2);
    const resultSize = constraints.widthToMax(5);
    assert.equal(resultSize.minimum.width, 5, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 5, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to increase widths by a certain value given a constraint', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(5, 6);
    const size4 = new Size(7, 8);
    const constraints1 = new Constraints(size1, size2);
    const constraints2 = new Constraints(size3, size4);
    const resultSize = constraints1.addWidth(constraints2);
    assert.equal(resultSize.minimum.width, 6, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 10, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to increase widths by a certain value given a number', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const constraints = new Constraints(size1, size2);
    const resultSize = constraints.addWidth(5);
    assert.equal(resultSize.minimum.width, 6, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 2, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 8, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 4, 'height value was not scaled correctly');
  });

  it('is able to change heights to the max value given a constraint', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(5, 6);
    const size4 = new Size(7, 8);
    const constraints1 = new Constraints(size1, size2);
    const constraints2 = new Constraints(size3, size4);
    const resultSize = constraints1.heightToMax(constraints2);
    assert.equal(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 6, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 8, 'height value was not scaled correctly');
  });

  it('is able to change heights to the max value given a number', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const constraints = new Constraints(size1, size2);
    const resultSize = constraints.heightToMax(5);
    assert.equal(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 5, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 5, 'height value was not scaled correctly');
  });

  it('is able to increase heights by a certain value given a constraint', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const size3 = new Size(5, 6);
    const size4 = new Size(7, 8);
    const constraints1 = new Constraints(size1, size2);
    const constraints2 = new Constraints(size3, size4);
    const resultSize = constraints1.addHeight(constraints2);
    assert.equal(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 8, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 12, 'height value was not scaled correctly');
  });

  it('is able to increase heights by a certain value given a number', () => {
    const size1 = new Size(1, 2);
    const size2 = new Size(3, 4);
    const constraints = new Constraints(size1, size2);
    const resultSize = constraints.addHeight(5);
    assert.equal(resultSize.minimum.width, 1, 'width value was not scaled correctly');
    assert.equal(resultSize.minimum.height, 7, 'height value was not scaled correctly');
    assert.equal(resultSize.preferred.width, 3, 'width value was not scaled correctly');
    assert.equal(resultSize.preferred.height, 9, 'height value was not scaled correctly');
  });
});

describe('scalarProduct', () => {
  it('returns the scalar product for two vectors', () => {
    const vector1 = new Vector(1, 2, 3);
    const vector2 = new Vector(4, 5, 6);
    const result = scalarProduct(vector1, vector2);
    assert.equal(result, 32, 'the scalar product was not calculated correctly');
  });
});

describe('crossProduct', () => {
  it('returns the cross product for two vectors', () => {
    const vector1 = new Vector(1, 2, 3);
    const vector2 = new Vector(4, 5, 6);
    const result = crossProduct(vector1, vector2);
    assert.equal(result.x, -3, 'x value for the resulting vector was not set correctly');
    assert.equal(result.y, 6, 'y value for the resulting vector was not set correctly');
    assert.equal(result.z, -3, 'z value for the resulting vector was not set correctly');
  });
});

describe('subtract', () => {
  it('returns the difference between two vectors', () => {
    const vector1 = new Vector(1, 2, 3);
    const vector2 = new Vector(4, 5, 6);
    const result = subtract(vector1, vector2);
    assert.equal(result.x, -3, 'x value for the resulting vector was not set correctly');
    assert.equal(result.y, -3, 'y value for the resulting vector was not set correctly');
    assert.equal(result.z, -3, 'z value for the resulting vector was not set correctly');
  });
});

describe('multiplyVectorByMatrixAndNormalize', () => {
  it('returns the vector multiplied by a matrix and normalized', () => {
    const vector = new Vector(1, 2, 3);
    const matrix = new WebKitCSSMatrix();
    const result = multiplyVectorByMatrixAndNormalize(vector, matrix);
    assert.equal(result.x, 1, 'x value for the resulting vector was not set correctly');
    assert.equal(result.y, 2, 'y value for the resulting vector was not set correctly');
    assert.equal(result.z, 3, 'z value for the resulting vector was not set correctly');
  });
});

describe('calculateAngle', () => {
  it('returns the angle between two vectors', () => {
    const vector1 = new Vector(1, 2, 3);
    const vector2 = new Vector(4, 5, 6);
    const result = calculateAngle(vector1, vector2);
    assert.equal(result, 12.933154491899135, 'angle returned was not correct');
  });
});

describe('boundsForTransformedPoints', () => {
  it('returns the bounds for transformed points', () => {
    const matrix = new WebKitCSSMatrix();
    const result = boundsForTransformedPoints(matrix, [1, 2, 3], {minX: 5, maxX: 6, minY: 7, maxY: 8});
    assert.equal(result.minX, 1, 'minX was calculated incorrectly');
    assert.equal(result.maxX, 6, 'maxX was calculated incorrectly');
    assert.equal(result.minY, 2, 'minY was calculated incorrectly');
    assert.equal(result.maxY, 8, 'maxY was calculated incorrectly');
  });
});
