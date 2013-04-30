var async = require('async')

Box.MyBox = function MyBox(userId, callback) {
  Box.find({members:{$in: [userId]}, status:1}).sort('-type').sort('createDate').select('name owner type tags').exec(callback);
};

Box.Get = function Get(boxId, callback) {
  Box.findOne({_id: boxId}, callback);
};

Box.GetByOwner = function GetByOwner(boxId, ownerId, callback) {
  Box.findOne({_id: boxId, owner: ownerId}, callback);
};

Box.GetByAuth = function GetByAuth(boxId, userId, callback) {
  Box.findOne({_id: boxId, members: {$in:[userId]}}, callback);
};

Box.GetByAuthAndName = function GetByAuthAndName(boxName, userId, callback) {
  Box.findOne({members: {$in: [userId]}, name: boxName}, callback); 
};

Box.GetFromMember = function GetFromMember(boxId, userId, callback) {
  Box.findOne({_id: boxId, members: {$in: [userId]}}, callback);
};

Box.listProjects = function listProjects(userId, callback){
  Box.find({members:{$in: [userId] }, type:3}).sort('-createDate').exec(callback);
};

Box.ListByAuth = function ListByAuth (selectedboxId, userId, returnCallback){
  var selectProp = 'name owner type tags status'
  async.parallel([
    function(callback){
      var query =  selectedboxId? {_id: selectedboxId , members: {$in: [userId]}} : {owner: userId, type: 4};
      Box.findOne(query).select(selectProp).exec(callback);
    },
    function(callback){
      Box.find({members: {$in: [userId]}, status: 1}).sort('-type').sort('createDate').select(selectProp).exec(callback);
    }
  ],
  function(err, results){
    if(err || !results[0] || !results[1].length) return returnCallback(err || new Error('Box not found'), null, null);
    if(results[0].type == 3 && results[0].status == 2) results[1].push(results[0]);
      
    returnCallback(null, results[0], results[1])
  });
};