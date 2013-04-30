User.Get = function Get(userId, callback) {
  User.findOne({_id: userId}, callback);
};

User.GetByName = function Get(userName, callback) {
  User.findOne({name: userName}, callback);
};

User.ListByIds = function ListByIds(ids, callback){
	User.find({_id:{$in: ids}}, callback);
}