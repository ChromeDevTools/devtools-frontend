import iterateJsdoc, {getSettings, parseComment} from './iterateJsdoc.js';

export = {
  default: iterateJsdoc as typeof iterateJsdoc,
  getSettings: getSettings as typeof getSettings,
  parseComment: parseComment as typeof parseComment
};
