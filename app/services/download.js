var moment = require('moment')
  , fsUtil = require(app.root + '/app/utils/fs')
  , Swift = require(app.root + '/app/services/openstack/swift');

exports.multiple = function multipleDownload(user, files, res, callback) {
  //var containerName = 'africa'; // file object 에서 가져오도록 변경
  var path = '/temp/' + user.name +'/'+ moment().unix()
    , swift = new Swift(user)
    , index = 0;

  fsUtil.directory.create(path);
  files.forEach(function(file) {
    swift.download(file).on('end', function() {
      if (++index == files.length) {
        var zip = fsUtil.compress.extract(path);
        zip.stdout.on('data', function(buffer) {
          res.write(buffer);
        }); 

        zip.on('exit', function() {
          res.end();
          fsUtil.directory.remove(path);
          callback && callback();
        });

        zip.on('error', function(err) {
          fsUtil.directory.remove(path);
          callback && callback(err);
        });
      }
    }).pipe(fsUtil.file.create(path +'/'+ file.name));
  });
};

exports.single = function singleDownload(user, file) {
  // /var containerName = 'africa'; // file object 에서 가져오도록 변경
  var swift = new Swift(user);
  return swift.download(file)
};