/*!
 * Service - FFMPEG Thumbnail generator
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
 
var ffmpeg = require('fluent-ffmpeg')
  , gm = require('gm');
 
module.exports = function(path, file, save, callback) {
  var count = 10
    , temp = process.cwd() + '/temp/'
    , identify = new ffmpeg.Metadata(path);

  // identify
  identify.get(function(metadata, err) {
    if (err) return callback(err);

    file.images.width = metadata.video.resolution.w;
    file.images.height = metadata.video.resolution.h;

    // thumb
    new ffmpeg({source: path}).withSize('128x?').takeScreenshots(count, temp, function(err, filenames) {
      if (err) return callback(err);

      // append
      var quickPreview = gm(temp + filenames.shift());
      for (var i = 0; i < filenames.length; i++) quickPreview.append(temp + filenames[i], true);
      quickPreview.stream(save);
    });
  });
};