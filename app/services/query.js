var moment = require('moment');
var async = require('async');

exports.refreshQuery = function refreshQuery(session, box) {
  var query = {box:box, type:1, status:1};

  if (app._.indexOf(session.user.autotags[box], 'deleted') > -1 ) query.status = 2;
  if (app._.indexOf(session.user.autotags[box], 'sent') > -1 ) query.isSended = true;
  if (app._.indexOf(session.user.autotags[box], 'received') > -1 ) query.isReceived = true;

  if (session.user.search[box]) {
    query.name = new RegExp(session.user.search[box].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), "i");
  }

  // mime query
  var mime = [];
  if (app._.indexOf(session.user.autotags[box], 'media') > -1 )mime =  app.vm.autotags('media').split(',');
  if (app._.indexOf(session.user.autotags[box], 'documents') > -1 ) mime =  app.vm.autotags('documents').split(',');

  if (mime.length > 0) query.mime = {"$in" : mime};

  // untag query
  if (app._.indexOf(session.user.autotags[box], 'untagged') > -1 ) query.tags = {"$size" : 0};
  

  // boxquery
  if (session.user.boxtags[box]) {
    if (app._.indexOf(session.user.boxtags[box], 'untagged') > -1 ) query.tags = {"$size" : 0};
    else query.tags = {$all: session.user.boxtags[box]};
  }


  // date query
  var date = {};
  if (app._.indexOf(session.user.autotags[box], 'today') > -1 ) {
    date.$gt = moment().add('days', -1).toDate();
    date.$lt = moment().add('days', 1).toDate();
  }
  if (app._.indexOf(session.user.autotags[box], 'lastweek') > -1 ) {
    date.$gt = moment().add('days', -7).toDate();
    date.$lt = moment().add('days', 1).toDate();
  } 

   if (app._.has(date,"$gt")) query.uploadDate = date;

  return query;
};

exports.UsedTags = function(session, boxId, callback) {
  var query = this.refreshQuery(session, boxId),
      reduce = this.TagMapReduce(query);

  StorageObject.TagMapReduce(session.user.id, query, reduce, callback);
};

exports.TagMapReduce = function TagMapReduce(query) {
  var o = {};
  o.map = function() {
    if (!this.tags) return;
      for (index in this.tags) {
          emit(this.tags[index], 1);
      }
    };

  o.reduce = function(previous, current) {
    var count = 0;
    for (index in current) {
      count += current[index];
    }
    return count;
  };

  query.tagsSize =  {$gt:0};
  o.query = query;
  o.out = {replace: "assignTagsResult"};
  return o;
};