var request = require('request');

var Swift = module.exports = function(tokens) {
  this.options = { headers: {}};
  if (tokens) {
    this.host = tokens.storageUrl;
    this.options.headers['X-Auth-Token'] = tokens.authToken;
    //if (.body) this.options.body = JSON.stringify(options.body);
  }
};

function extend(obj1, obj2) {
  //var obj = {};
  return obj1;
}

Swift.prototype.getContainers = function(callback) {
  var options = this.options;
  options.method = "GET";
  options.uri = this.host +'?format=json'
  return request(options, callback);
};

Swift.prototype.getContainer = function(container, callback) {
  var options = this.options;
  options.method = "GET";
  options.uri = this.host +'/'+ container+'?format=json';
  return request(options, callback);
};

Swift.prototype.Containerinfo = function(container, callback) {
  var options = this.options;
  options.method = "HEAD";
  options.uri = this.host +'/'+ container;
  return request(options, callback);
};

Swift.prototype.createContainer = function(container, callback) {
  var options = this.options;
  options.method = "PUT";
  options.uri = this.host  +'/'+ container;
  return request(options, callback);
};

Swift.prototype.copyObject = function(dest, source, callback) {
  var options = this.options;
  options.method = "PUT";
  options.headers['X-Copy-From'] = '/'+ source.container +'/'+ source.file;
  options.uri = this.host  +'/'+ dest.container +'/'+ dest.file;
  return request(options, callback);
};

Swift.prototype.removeContainer = function(container, callback) {
  var options = this.options;
  options.method = "DELETE";
  options.uri = this.host  +'/'+ container;
  return request(options, callback);
};

Swift.prototype.SetContainerACL = function(container, read, write, callback) {
  var options = this.options;
  options.method = "PUT";
  options.uri = this.host  +'/'+ container;
  if (read) options.headers['X-Container-Read'] = read;
  if (write) options.headers['X-Container-Write'] = write;
  return request(options, callback);
};

Swift.prototype.download = function(file, callback) {
  var options = this.options;
  options.method = "GET";
  options.uri = this.host +'/'+ file.container +'/'+ file.id
  return request(options, callback);
};

Swift.prototype.SetHeaders = function(file, headers, callback) {
  var options = this.options;
  options.method = "PUT";
  //options.headers.push(headers);
  options.uri = this.host +'/'+ file.container +'/'+ file.id
  app._.extend(options.headers, headers)
  return request(options, callback);
};

//req.headers['content-disposition']
Swift.prototype.upload = function(file, callback) {
  var options = this.options;
  options.method = "PUT";
  options.headers['content-disposition'] =  'attachment; filename="' + encodeURIComponent(file.name) + '"';
  options.uri = this.host +'/'+ file.container +'/'+ file.id;
  return request(options, callback);
};

Swift.prototype.export = function(file, callback) {
  var options = this.options;
  options.method = "PUT";
  options.uri = this.host +'/'+ file.container +'/'+ file.id
  options.headers['Content-Disposition'] = 'attachment; filename="velox.zip"';
  options.headers['Content-Type'] = file.mime;
  return request(options, callback);
};

Swift.prototype.deleteObject = function(file, callback) {
  var options = this.options;
  options.method = "DELETE";
  options.uri = this.host +'/'+ file.container +'/'+ file.id
  return request(options, callback);
};