function random_int(low, high) {
  if (high === undefined) {
    high = low;
    low = 0;
  }

  return Math.floor(Math.random() * (high - low) + low);
}

function array_random(array) {
  return array[random_int(array.length)];
}

function deg_to_rad(degrees) {
  return (Math.PI * degrees) / 180;
}

function rotate_coordinates(x, y, angle) {
  let rads = deg_to_rad(angle),
    new_x = Math.round(Math.cos(rads) * x - Math.sin(rads) * y);
    new_y = Math.round(Math.sin(rads) * x + Math.cos(rads) * y);

  return {
    x: new_x,
    y: new_y,
  };
}

function clamp(val, low, high, epsilon, debug) {
  epsilon = epsilon || 0.001;

  if (val <= low - epsilon) {
    if (debug) {
      console.log(val + "clamped up to " + low);
    }
    val = low;
  }

  if (val >= high + epsilon) {
    if (debug) {
      console.log(val + "clamped down to " + high);
    }
    val = high;
  }

  return val;
}

function log_all(pre_message, hash) {
  str = "";
  if (pre_message !== undefined) {
    str += pre_message + " -- ";
  }

  for (k in hash) {
    if (hash.hasOwnProperty(k)) {
      str += k + ": " + hash[k] + ", ";
    }
  }

  console.log(str);
}

function throttle(func, wait) {
  var last_time = null;
  return function() {
    var now = performance.now();
    if (last_time === null || now - last_time >= wait) {
      last_time = now;
      func.apply(this, arguments);
    }
  };
}

function timestamp_id (delimiter, resolution) {
  delimiter = delimiter || "_";
  resolution = resolution !== 0 ? (resolution || 3) : 0;
  let id = (performance.timing.navigationStart+performance.now()).toFixed(resolution).split(".").join(delimiter);
  console.log("generated timestamp_id: " + id);
  return id;
}

/* brief notes on epoch time, very grokkable values per digit:
 *
 * 1510075118054.9
 *                +- tens of micro
 *               +-- hundred micro
 *              +--- place marker
 *             +---- milli
 *            +----- tens of milli
 *           +------ hundred milli
 *          +------- seconds
 *         +-------- tens of seconds
 *        +--------- hundred seconds  1.5 minutes
 *       +---------- thou of seconds  16 minutes
 *      +----------- ten thou seconds 166 minutes / 2.6 hours / ~.1 day
 *     +------------ hundred thou sec 1666 minutes / 27 hours / ~daily
 *    +------------- million seconds  16,666 min / 277 hours / ~11 days
 *   +-------------- ten million sec  166,666 min / 2777 hrs / ~115 days
 *  +--------------- 100 million sec  1.6 mil min / 27k hrs / ~1.1k d / 3.17y
 * +---------------- 1 gigasecond     16 mil min / 270k hrs / ~11k d / 31.7y
 *
 */
