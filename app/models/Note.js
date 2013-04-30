function NoteMapReduce(query) {
  var o = {};

  o.map = function() {
    if (!this.box) return;
    emit(this.box, 1);
  };

  o.reduce = function(previous, current) {
    var count = 0;
    for (index in current) {
      count += current[index];
    }
    return count;
  };

  o.query = query;
  o.out = {replace: "unreadNote"};

  return o;
}

Note.UnreadNote = function UnreadNote(userId, callback) {
	var query = {members: {$in: [userId]}}
	  , reduce = NoteMapReduce(query);

  Note.mapReduce(reduce, function(err, models, stats) {
    models.find({}, function(err, result) {
      callback(null, result);
    });
  });
};



// exports.UnreadNote = function(userId, callback){
//   var query = {members: {$in: [userId]}},
//       reduce = this.NoteMapReduce(query);

//   Note.mapReduce(reduce, function(err, models, stats){
//     models.find({}, function(err, result){
//       callback(null, result)
//     });
//   });
// }

// exports.NoteMapReduce = function NoteMapReduce(query) {
//   var o = {};
//     o.map = function() {
//     if (!this.box) return;
//      emit(this.box, 1)
//     };

//   o.reduce = function(previous, current) {
//     var count = 0;
//     for (index in current) {
//       count += current[index];
//     }
//     return count;
//   };
//   o.query = query;
//   o.out = {replace: "unreadNote"};
//   return o;
// }