/*!
 * Service - GraphicMagick Thumbnail generator
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
 
var gm = require('gm');

module.exports = function(path, file, save, callback) {
  var saveWriteStream = this.saveWriteStream.bind(this);

  if (file.mime == 'application/pdf') path = path + '[0]';

  // identify
  gm(path).identify(function(err, data) {
    if (!data.size) return;
    file.images.width = data.size.width;
    file.images.height = data.size.height;
    file.images.orientation = data.Orientation;

  // orientation
  }).autoOrient().stream(function(err, stdout, stderr) {
    if (err) return callback(err);

    // resize
    gm(stdout).setFormat('jpg').quality(70).resize('256', '256').stream(save);
  });
};