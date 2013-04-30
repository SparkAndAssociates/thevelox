var async = require('async')
  , Keystone = require(app.root + '/app/services/openstack/keystone')
  , Swift = require(app.root + '/app/services/openstack/swift');

var ContainerAuth = function(box, users) {
  var box = box
    , users = users
    , client = new Keystone(app.config.keystone);

  this.SetAcl = function(title, descript, returncallback) {
    async.waterfall([
      function (callback){
        users.names.forEach(function(name, index) {
          User.GetByName(name, function(err, dbUser) {
            users.ids.push(dbUser.id);
            users.acls.push(' service:' + dbUser.name);
            if (index == users.names.length - 1) callback(null);
          });
        });
      },
      function(callback){
        client.operatorTokens(function(err, tokens) {
          var swift = new Swift(tokens);
          swift.SetContainerACL(box.swift.container.name, users.acls.join(','), users.acls.join(','), callback);
        })
      }
    ],
    function(err, _res, _body){
      box.name = title;
      box.description = descript;
      box.members = users.ids;
      box.swift.container.ACL.readUsers = users.names;
      box.swift.container.ACL.writeUsers =  users.names;
      box.save(returncallback)
    });
  };

  this.Create = function(containerName, callback) {
    client.operatorTokens(function(err, tokens) {
      var swift = new Swift(tokens);
      swift.createContainer(containerName, callback);
    });
  };

  this.Close = function(callback) {
    box.status = 2;
    box.save(callback);
  };
};

module.exports = function (box, users) {
  return new ContainerAuth(box, users);
};
