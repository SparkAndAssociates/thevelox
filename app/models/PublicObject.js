PublicObject.FindByIdsWithBox = function FindByIdsWithBox(userId, boxId, fileIds, callback) {
  Box.GetByAuth(boxId, userId, function(err, box){
    if (err) return callback(err);
    if (box){
      PublicObject.find({box: box.id, _id: {$in: fileIds}}, function(err, files){
        if (err) return callback(err);
        callback(null, box, files);
      });
    }
    else callback(new Error("not found"), null);
  });
};