/*!
 * Middleware - ObjectID Parser
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

var parse = require('url').parse;

/**
 * ObjectID parsor:
 * 
 *  Parse Base64ID to ObjectID in request params,
 *  providing the parsed object as `params.uuid`.
 *
 * @return {Function}
 * @api public
 */

module.exports = function() {

  /**
   * Attempt to match the given params to one of the routes.
   *
   * @param  {ServerRequest} req
   * @param  {Object} routes
   * @return {Array} params
   * @api private
   */
  function match(req, routes) {
    var params = {}
      , method = req.method
      , captures
      , i = 0;
  
    if ('HEAD' == method) method = 'GET';
    if (routes = routes[method.toLowerCase()]) {
      var pathname = parse(req.url).pathname;
      for (var len = routes.length; i < len; ++i) {
        var route = routes[i]
          , keys = route.keys
          , path = route.regexp
          , params = [];

        if (captures = path.exec(pathname)) {
          for (var j = 1, len = captures.length; j < len; ++j) {
            var key = keys[j - 1]
              , val = typeof captures[j] === 'string'
                ? decodeURIComponent(captures[j])
                : captures[j];

            if (key) {
              params[key.name] = val;
            } else {
              params.push(val);
            }
          }
          return params;
        }
      }
    }
    return params;
  }

  return function objectIDParser(req, res, next) {
    if (req._body) return next();

    var routes = req.app.routes.routes
      , params = match(req, routes);

    // uuid in params
    if (!params.uuid) return next();      

    // flag as parsed
    req._body = true;
    // current uuid
    if (24 <= params.uuid.length) {
      console.warn('Deprecated parameter type ObjectID is now using base64ID');
    } else {
      // decode to hex
      params.uuid = new Buffer(params.uuid.replace(/\-/g, '+').replace(/!/g, '/'), 'base64').toString('hex');
      Object.defineProperty(req, "params", {value : params, writable : false});
    }

    next();
  }
};