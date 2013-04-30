/*!
 * Middleware - Octet Stream
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
var fs = require('fs')
  , mime = require('mime')
  , uuid = require('node-uuid');

/**
 * Octet stream:
 * 
 *  Parse octet-stream request bodies,
 *  providing the parsed object as `req.files`.
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function(options){
  options = options || {tempDir: process.cwd() + '/temp/'};

  return function octetStream(req, res, next) {
    if (req._body) return next();

    // check has body
    if (!('transfer-encoding' in req.headers || 'content-length' in req.headers)) return next();

    // ignore GET
    if ('GET' == req.method || 'HEAD' == req.method) return next();

    // check Content-Type
    if ('application/octet-stream' != (req.headers['content-type'] || '').split(';')[0]) return next();

    // check temp directory
    if (!options.tempDir && fs.existsSync(options.tempDir)) return next();

    // flag as parsed
    req._body = true;
    req.files = {};

    /*
    formidable created object
    {
      domain: null,
      size: 2184118,
      path: '/tmp/5b5a9bd810a943ab13215158be0d78a3',
      name: 'image-dn18gbv.jpg',
      type: 'image/jpeg',
      hash: false,
      lastModifiedDate: Sat Dec 01 2012 23:42:15 GMT+0900 (KST),
      length: [Getter],
      filename: [Getter],
      mime: [Getter]
    }
    */

    // parse
    var fp = options.tempDir + uuid.v1()
      , ws = fs.createWriteStream(fp);

    ws.on('error', function(err) {
      next(err);
    });

    ws.on('close', function(err) {
      req.files.file = {
      	type: req.headers['x-content-type'] || mime.lookup(fp),
      	name: decodeURIComponent(req.headers['x-file-name']),
      	size: req.headers['content-length'],
        path: fp 
      };
      next();
    });

    // Writing filedata into writestream
    req.on('data', function(data) {
      ws.write(data);
    });

    req.on('end', function() {
      ws.end();
    });
  }
};