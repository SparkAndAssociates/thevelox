var query = require(app.root + '/app/services/query');

StorageObject.list = function list(query, page,  callback) {
  StorageObject.find(query).sort("-uploadDate").select('name ext size mime uploadDate author versions images scribdId').skip((page-1)*100).limit(100).execFind(callback);
};

StorageObject.ObjectTagCount = function ObjectTagCount(reduce, callback) {
  StorageObject.mapReduce(reduce, callback);
};

StorageObject.BoxTagsCount = function SetBoxTagsCount(boxId, callback) {
  var query = {box: boxId, type:1}
    , reduce = query.TagMapReduce(query);
  StorageObject.mapReduce(reduce, callback);
};

StorageObject.Get = function Get(fileId, callback) {
  StorageObject.findOne({_id: fileId}, callback);
};

StorageObject.GetWithBox = function GetByAuth(userId, boxId, fileId, callback){
  Box.GetByAuth(boxId, userId, function(err, box){
    if (err) return callback(err);
    if (box){
      StorageObject.findOne({box: box.id, _id: fileId}, function(err, file){
        if (err) return callback(err);
        callback(null, box, file);
      });
    }
    else callback(new Error("not found"), null);
  });
};

StorageObject.ListWithBox = function ListByAuth(userId, boxId, callback){
  Box.GetByAuth(boxId, userId, function(err, box){
    if (err) return callback(err);
    if (box){
      StorageObject.find({box: box.id}, function(err, files){
        if (err) return callback(err);
        callback(null, box, files);
      });
    }
    else callback(new Error("not found"), null);
  });
};

StorageObject.FindWithRegex = function FindWithRegex(box, file, callback) {
  // get filename
  var splited = file.name.split('.')
    , ext = splited.length > 1 ? splited[splited.length - 1] : '';
  if (splited.length > 1 && ext) splited.pop();

  // escape regexp characters
  var regExp = splited.join('.').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  
  // find file
  StorageObject.find({box: box, ext: file.ext, name: new RegExp(regExp)}, callback);
};

StorageObject.GetFormBox = function GetFormBox(boxId, fileId, callback) {
  StorageObject.findOne({_id: fileId, box: boxId}, callback);
};

StorageObject.GetFormUser = function GetFormUser(fileId, userId, callback) {
  StorageObject.findOne({_id: fileId}, callback);
};

StorageObject.FindByNames = function FindByNames(boxId, names, callback) {
  StorageObject.find({box:boxId, name:{$in: names}, status:1}, callback);
};

StorageObject.FindByIdsWithBox = function FindByIdsWithBox(userId, boxId, fileIds, callback) {
  Box.GetByAuth(boxId, userId, function(err, box){
    if (err) return callback(err);
    if (box) {
      StorageObject.find({box: box.id, _id: {$in: fileIds}}, function(err, files){
        if (err) return callback(err);
        callback(null, box, files);
      });
    }
    else callback(new Error("not found"), null);
  })
};

StorageObject.FindByIdsWithoutAuth = function FindByIdsWithBox(boxId, fileIds, callback) {
   StorageObject.find({box: boxId, _id: {$in: fileIds}}, callback);
};


StorageObject.CountByQuery = function CountByQuery(query, callback) {
  StorageObject.count(query, callback);
};

StorageObject.TagMapReduce = function TagMapReduce(userId, query, reduce, callback) {
  User.Get(userId, function(err, user) {
    if (err) return callback(err);
    StorageObject.mapReduce(reduce, function(err, model, stats) {
      model.find({}, function(err, files) {
        if (err) return callback(err);
        var usedTags = [];
        if (files) {
          files.forEach(function(file) {
            usedTags.push(file._id);
          });
        }
        callback(null, user.availableSize, usedTags);
      });
    });
  });
};