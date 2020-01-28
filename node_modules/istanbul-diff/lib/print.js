"use strict";

var regressed = false;
var chalk = require('chalk');
var allMetrics = 'lines statements functions branches'.split(' ');
var out = {};
var _ = require('lodash');


/**
 * pretty print difference in coverage
 *
 * @param diff {object} - the diff'd hash
 * @param options {object} -
 *   nocolor {boolean} - don't use ANSI colors in output message
 *   nomotivate {boolean} - don't add motivation message
 *   detail {string} - comma separated list of: lines,statements,functions,branches
 *   recurse {boolean} - recurse through sub folders
 *   single {boolean} - indicates single coverage report (i.e., not a diff!)
 * @returns {msg: String, regressed: Boolean}
 */
function print(diff, options) {
  options = Object.assign({}, options || {});
  var detail = options.detail || 'lines',
    sep = options.recurse ? '\n' : '',
    deltaText = options.single ? '' : ' delta',
    details, msg, result;

  if (!diff) return {};
  if (detail === true) {
    details = allMetrics;
  } else if (detail) {
    details = detail.split(',');
  }

  chalk.enabled = !options.nocolor;

  // detail means two or more metrics
  if (details.length > 1) {
    var collect = {};
    details.map(function(what) {
      options.next = 0;
      out = {};
      return getMsg(print_item(diff, what, options), sep, true);
    })
      .forEach(function(result) {
        if (typeof result === 'string' && result) {
          console.log(result);
          return;
        }
        Object.keys(result).forEach(function(path) {
          if (!collect[path]) collect[path] = [];
          collect[path].push(result[path]);
        })
      });

    msg = `Coverage${deltaText}:${sep}  ` + (Object.keys(collect).map(function(path) {
      return collect[path].join(', ') + ` (${path})`;
      }).join('\n  ') || 'No change');

  } else {
    delete options.detail;
    msg = print_item(diff, details[0], options) || 'No change';
  }

  result = {
    msg: typeof msg === 'string' ? msg : getMsg(msg, sep),
    regressed: regressed
  };

  // reset
  regressed = false;
  out = {};

  return result;
}

// list like {'app/' : 'blah blah'}
function getMsg(list, sep, invert) {
  var text = '';
  if (invert || typeof list === 'string') return list;
  for (var key in list) {
    text += `${out[key]} (${key})${sep || ''}`;
  }
  return text;
}

function print_item(diff, what, options) {
  var key = 'total',
    item = (!options.next && diff[key]) || diff[key = Object.keys(diff)[options.next || 0]],
    next = function(result) {
      if (result) out[key] = result;
      if (options.recurse && (!options.depth || options.next < options.depth)) {
        print_item(diff, what, options);
      }
      return out;
    };

  if (!item) return '';
  if (options.recurse) {
    options.next = 1 + (options.next || 0);
  }

  // --pick formats
  //    --pick lines.pct
  if (typeof(item) === 'number') return _out({pct: item}, options.pick);

  //   --pick lines
  var name = options.pick;
  delete options.pick;
  if ('pct' in item) return _out(item, name);

  if (!_(allMetrics).includes(what)) return 'No such coverage metric: ' + what;
  if (!item || !(what in item)) {
    return next(options.brief ? null : '=' + what); //'No coverage difference in ' + what);
  }

  var metric = item[what];
  return _out(metric, what);


  function _out(metric, metricName) {
    var
      delta = getDelta(metric),
      inc = delta > 0,
      dir = options.single ? '' : inc ? ' increased' : ' decreased',
      sign = inc && !options.single ? '+' : '',
      A = Math.abs,
      c = inc ? chalk.green : chalk.red,
      compliment = !options.nomotivate ? ' ' + getCompliment(inc) : '',
      pickTmpl = c(`Coverage${dir} ${sign}${delta} for ${metricName}.`) + compliment,
      detailTmpl = metric.pct ?
        c(`${sign}${metric.pct}% (${metric.covered || A(metric.total)}) ${metricName}`) :
        c(`${sign}${delta} ${metricName}`),
      simpleTmpl = (metric.pct ?
        c(`Coverage${dir} ${sign}${metric.pct}% (${metric.covered || A(metric.total)}) ${metricName}.`) :
        c(`Coverage${dir} ${sign}${delta} ${metricName}.`)) + compliment,
      result = options.pick ? pickTmpl : options.detail ? detailTmpl : simpleTmpl;

    regressed = regressed || !inc;
    return next(result);
  }
}

function getDelta(diff) {
  // some of these diffs maybe undefined (i.e., they were the same)
  // so we look at the next possible delta.
  return diff.pct || diff.covered || diff.total;
}

function getCompliment(good) {
  var nicejob = require('nicejob');
  return good ? nicejob() + '.' : nicejob.not() + '!';
}

print.compliment = getCompliment;

module.exports = print;