#!/usr/bin/env node

//require('nodetime').profile();
var fs = require('fs')
  , package = require('./package.json')
  , config = require('./config/config.json')
  , app = module.exports = require('railway').createServer(config.secure)
  , cluster = require('cluster')
  , clog = require('clog')
  , rmdir = require('rmdir')
  , underscore = require('underscore')
  , uglify = require('uglify-js')
  , vm = require('./config/storagetypes/velox-mime');

app.name = package.name;
app.version = package.version;
app.config = config;

// shared modules
app._ = underscore;
app.vm = vm;
app.clog = clog;

function removeTemp(){
  var tempPath = process.cwd() + '/temp/';

  if (!fs.existsSync(tempPath)) {
    console.log('v' + app.version + ' - create temp directory');
    return fs.mkdirSync(tempPath);
  }

  console.log('v' + app.version + ' - remove temp files');
  fs.readdir(tempPath, function(err, files) {
    if (err) console.log(err);
    files.forEach(function(file){
      var filePath = tempPath + file;
      fs.stat(filePath, function(err, stats) {
        if (err) console.log(err);
        else {
          if(stats.isFile()) fs.unlink(filePath);
          else rmdir(filePath, function(err, dir, files){})
        }
      });
    });
  });
}

function buildScript() {
  var srcPath = process.cwd() + '/public/javascripts/'
    , distPath = srcPath + 'dist/'
    , minify = uglify.minify([
      srcPath + 'vendor/socket.io.js',
      //srcPath + 'vendor/prototype.min.js',
      srcPath + 'vendor/effects.js',
      srcPath + 'vendor/dragdrop.js',
      srcPath + 'vendor/controls.js',
      srcPath + 'vendor/scribd.js'
    ]);

  console.log('v' + app.version + ' - build libraries.js');
  if (minify.code) {
    fs.existsSync(distPath + 'libraries.js') && fs.unlinkSync(distPath + 'libraries.js');
    fs.appendFileSync(distPath + 'libraries.js', minify.code);    
  }

  console.log('v' + app.version + ' - build application.js');
  minify = uglify.minify([srcPath + 'extensions.js', srcPath + 'velox.js', srcPath + 'assets.js', srcPath + 'archives.js']);
  if (minify.code) {
    fs.existsSync(distPath + 'application.js') && fs.unlinkSync(distPath + 'application.js');
    fs.appendFileSync(distPath + 'application.js', minify.code);    
  }
}

if (!module.parent) {  

  if (cluster.isMaster && app.settings.env != 'development') {
    removeTemp();
    buildScript();

    var numCPUs = require('os').cpus().length, i, _i;
    for (i = _i = 1; 1 <= numCPUs ? _i <= numCPUs : _i >= numCPUs; i = 1 <= numCPUs ? ++_i : --_i) {
      cluster.fork();
    }

    cluster.on('listening', function(worker, address) {
      console.log('v' + app.version + ' - A worker is now connected to ' + address.address + ':' + address.port);
    });

    cluster.on('exit', function(worker) {
      console.log('v' + app.version + ' - A Worker ' + worker.process.pid + ' (#' + worker.id + ') is died');
      cluster.fork(); // cluster fork again forever
    });
  } else {
    app.listen(config.port);
    app.settings.env == 'development' && removeTemp();
    console.log('v' + app.version + ' - Railway server listening on port %d within %s environment', config.port, app.settings.env);
  }
}