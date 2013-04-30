/*!
 * Service - ImageMagick Thumbnail generator
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */
 
var im = require('imagemagick');

module.exports = function(path, file, save, callback) {
  var options = { 
      srcPath: path,
      quality: 0.7,
      format: 'jpg',
      height: 256,
      width: 256
    };

  // identify
  im.identify(['-format', '%m %z %w %h %b %f', path], function(err, info) {
    if (err) return callback(err);

    var temp = info.split(' ');
    info ={
			type: temp[0],
			depth: temp[1],
			width: temp[2] * 1,
			height: temp[3] * 1,
			size: temp[4],
			name: temp.slice(5).join(' ').replace(/(\r\n|\n|\r)/gm,'')
	  };

    file.images.width = info.width;
    file.images.height = info.height;

    // resize
    im.resize(options, save);
  });
}