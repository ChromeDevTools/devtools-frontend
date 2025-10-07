import {
	blue,
	green,
	yellow,
	red,
} from 'yoctocolors';
import isUnicodeSupported from 'is-unicode-supported';

const _isUnicodeSupported = isUnicodeSupported();

export const info = blue(_isUnicodeSupported ? 'ℹ' : 'i');
export const success = green(_isUnicodeSupported ? '✔' : '√');
export const warning = yellow(_isUnicodeSupported ? '⚠' : '‼');
export const error = red(_isUnicodeSupported ? '✖' : '×');
