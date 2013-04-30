var _fs = require('fs')
  , _rmdir = require('rmdir')
  , root = process.cwd();

var localPath = exports.localpath = function(path) {
 return root + path;
};

exports.file = {
  create: function(path) {
    return _fs.createWriteStream(localPath(path));
  }
};

exports.compress = {
  extract: function(path){
    var spawn = require('child_process').spawn; 
    return spawn('zip', ['-1rj', '-', localPath(path)]);
  }
};

exports.directory = {
  create: function(path) {
    var dirs = path.split('/')
      , index = ''
      , self = this;

    try {
      if (!dirs[0].length) dirs.splice(0,1);
      dirs.forEach(function(dir) {
        index += '/' + dir 
         if (!self.exists(localPath(index))) {
           _fs.mkdirSync(localPath(index));
        }
      });
     }
    catch (ex) { throw ex }
    return path;
  },
  remove: function(path) {
    try { 
      if (path.indexOf('/') == -1)path = '/' + path;
      if (this.exists(localPath(path)))
        _rmdir(localPath(path), function(err, dir, files) {}); 
    }
     catch (ex) { throw ex}
     return path;
  },
  exists: function(path) {
    return _fs.existsSync(path);
  }
};