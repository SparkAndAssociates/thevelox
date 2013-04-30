var request = require('request');

var Keystone = module.exports = function(options) {
  this.host = options.host;
  this.tenantId = options.tenantId;
  this.options = { headers: {} }
};

function setAuth(credential, callback) {
  var self = this;
  self.options.method = 'POST';
  self.options.body = JSON.stringify({ auth : { tenantName: "service",  passwordCredentials: credential }});
  self.options.uri = self.host + '/tokens';
  self.options.headers['Content-Type'] = 'application/json';

  request(self.options, function(err, res, body) {
    if (err) return callback(err);

    var result = JSON.parse(body)
      , config = {};

    if (result.error) callback(result, null);
    else {
      result = result.access;
      config.authorized = true;
      config.storageUrl = result.serviceCatalog[0].endpoints[0].publicURL;
      config.authToken = result.token.id;
      config.expires = new Date(result.token.expires);
      config.id = result.user.id;
      config.name = credential.username;
      callback(null, config);
    }
  });
}

Keystone.prototype.users = function(admin, callback) {
  var options = this.options;
  options.method = "GET";
  options.uri = this.host + '/users';
  options.headers['X-Auth-Token'] = admin.authToken;
  options.headers['Content-Type'] = 'application/json';
  return request(options, callback)
};

Keystone.prototype.updateUser = function(admin, user, callback) {
  var options = this.options;
  options.method = "PUT";
  options.uri = this.host + '/users/'+ user.id;
  options.headers['X-Auth-Token'] = admin.authToken;
  options.headers['Content-Type'] = 'application/json';
  options.body = JSON.stringify({"user":{"name": user.username, "password": user.password, "tenantId": tenantId, "enabled":true}});
  return request(options, callback)
};

Keystone.prototype.deleteUser = function(admin, user, callback) {
  var options = this.options;
  options.method = "DELETE";
  options.uri = this.host + '/users/'+ user;
  options.headers['X-Auth-Token'] = admin.authToken;
  //options.headers['Content-Type'] = 'application/json';
  return request(options, callback)
};

Keystone.prototype.operatorTokens = function(callback) {
  if(global.keystoneOperator && global.keystoneOperator.expires > new Date()){
    callback(null, global.keystoneOperator);
  } 
  else{
    var credential = { username: "swift", password: "swiftadmin" };
    return setAuth.call(this, credential, function(err, config){
      global.keystoneOperator = config;
      callback(null, global.keystoneOperator);
    });
  }
};

Keystone.prototype.memberTokens = function(credential, callback) {
  setAuth.call(this, credential, callback)
};

Keystone.prototype.createUser = function(admin, user, callback) {
  var options = this.options;
  options.method = "POST";
  options.uri = this.host + '/users';
  options.headers['X-Auth-Token'] = admin.authToken;
  options.headers['Content-Type'] = 'application/json';
  options.body = JSON.stringify({"user":{"name": user.username, "password": user.password, "tenantId": tenantId, "enabled":true}});
  return request(options, callback)
};