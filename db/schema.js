
customSchema(function () {
  var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

  var tagSchema = new Schema({
      id: ObjectId
    , name: String
    , count: Number
  });

  var tag = mongoose.model('Tag', tagSchema);
  tag.modelName = 'Tag';
  module.exports['Tag'] = tag;

  var customTagsSchema = new Schema({
      _id: String
    , tags : [Schema.Types.Mixed]
  });
 
  var customTags = mongoose.model('CutstomTag', customTagsSchema);
  customTags.modelName = 'CutstomTag';
  module.exports['CutstomTag'] = customTags;

  var projectsSchema = new Schema({
      name: String
    , host: String
    , members: [String]
    , container: String
    , projecttags: [{id: ObjectId, name: String}]
    , createDate: Date
    , lastModifyDate: Date
    , status: Number
  });

  var projectcontainer = mongoose.model('Proj', projectsSchema);
  projectcontainer.modelName = 'Proj';
  module.exports['Proj'] = projectcontainer;

  var boxSchema = new Schema({
      owner: String
    , members: [String]
    , swift: {
      tenant: { 
          id: String 
        , name: String
      } 
      , container: {
          name: String
        , ACL: {
            readUsers: [String]
          , writeUsers: [String]
        }
      }
    }
    , name: String
    , description : String
    , tags: [{id:String, name: String, count: Number}]
    , size: Number
    , fileLength: Number
    , createDate: Date
    , lasModifyDate: Date
    , type: Number //0: public read write  1: public write 2: public read 3: share 4: private
    , status: Number
    , linkInfo: {
      subject: String,
      message: String,
      isEnabled: Boolean,
      password: String,
      recipient: [String] 
    }
  });

  var boxCotainer = mongoose.model('Box', boxSchema);
  boxCotainer.modelName = 'Box';
  module.exports['Box'] = boxCotainer;

  var userSchema = new Schema({
      _id: String
    , name: String
    , username: String
    , email: String
    , createDate: Date
    , status: Number
    , availableSize: Number
    , locale: String
    , notifications: {received: Boolean, sent: Boolean, note: Boolean, nospace: Boolean, invited: Boolean, expired: Boolean}
    , email_sent_flags: {nospace: Date}
    , preference: {theme: String, viewtype: String, conflict: String, layout: String, dispname: String, timezone: String}
  });

  var userObject = mongoose.model('User', userSchema);
  userObject.modelName = 'User';
  module.exports['User'] = userObject;

  var storageObjectSchema = new Schema({
      box: String
    , members: [String]
    , container: String
    , ext: String
    , name: String
    , mime: String
    , size: Number
    , description: String
    , images: Schema.Types.Mixed // width, heigth, thumbnails
    , tags: [String]
    , tagsSize: Number
    , status: Number
    , type: Number //1: member insert, 2: public insert 
    , uploadDate: Date
    , lastModifyDate: Date
    , lastModifyUser: String
    , lastModifyUsername: String
    , author: String
    , authorName: String
    , isSended: Boolean
    , isReceived: Boolean
    , public: Schema.Types.Mixed 
    , versions: [Schema.Types.Mixed]
    , link: String
    , scribd: {id: String, key: String, password: String}
  });

var acidentListSchema = new Schema({
    user: Schema.Types.Mixed,
    boxes: [Schema.Types.Mixed],
    files: [Schema.Types.Mixed]
  });
  var acidentList = mongoose.model('Acident', acidentListSchema);
  acidentList.modelName = 'Acident';
  module.exports['Acident'] = acidentList;


  var publicObjectSchema = new Schema({
    subject: String,
    message: String,
    expire: Number,
    created: Date,
    password: String,
    recipient: [String],
    downloadLink: String,
    status: Number, //1: live 2: delete 3: delete 4: expired
    fileRef: [{type: Schema.Types.ObjectId, ref: 'StorageObject'}]
  });


  var storageObject = mongoose.model('StorageObject', storageObjectSchema);
  storageObject.modelName = 'StorageObject';
  module.exports['StorageObject'] = storageObject;

  var publicObject = mongoose.model('PublicObject', publicObjectSchema);
  publicObject.modelName = 'PublicObject';
  module.exports['PublicObject'] = publicObject;

  var logSchema = new Schema({
      head: String
    , type: String
    , where: Schema.Types.Mixed
    , when: Date
    , who: Schema.Types.Mixed
    , how: String
    , args : Schema.Types.Mixed // DELETEME
    , what : Schema.Types.Mixed
  });

  var log = mongoose.model('History', logSchema);
  log.modelName = 'History';
  module.exports['History'] = log;

  var fileSchema = new Schema({
      owner: String
    , container: String
    , name: String
    , ext: String
    , mime: String
    , size: String
    , width: Number
    , height: Number
    , uploadDate: Date
    , lastModifyDate: Date
    , lastModifyUser: String
    , lastModifyUsername: String
    , thumbnail : Buffer
    , autotags: [String]
    , usertags:[String]
    , author: String
    , authorName: String
    , status: Number
    , isSended: Boolean
  });

  var objects = mongoose.model('FileObject', fileSchema);
  objects.modelName = 'FileObject';
  module.exports['FileObject'] = objects;

  var noteSchema = new Schema({
      box: String
    , user: Schema.Types.Mixed
    , files: [String]
    , members: [String]
    , theme: String
    , rotate: String
    , text: String
    , top: Number
    , left: Number
    , created: Date
  });

  var notes = mongoose.model('Note', noteSchema);
  notes.modelName = 'Note';
  module.exports['Note'] = notes;

  var privateObjectSchema = new Schema({
      owner: String
    , container: String
    , name: String
    , ext: String
    , mime: String
    , size: String
    , width: Number
    , height: Number
    , uploadDate: Date
    , lastModifyDate: Date
    , lastModifyUser: String
    , lastModifyUsername: String
    , thumbnail : Buffer
    , autotags: [String]
    , usertags:[String]
    , author: String
    , authorName: String
    , status: Number
    , isSended: Boolean
  });

  var privateObject = mongoose.model('PrivateObject', privateObjectSchema);
  privateObject.modelName = 'PrivateObject';
  module.exports['PrivateObject'] = privateObject;

  var publicObjectSchema = new Schema({
      owner: String
    , subject: String
    , password: String
    , message: String
    , container: String
    , downloadLink: String
    , name: String
    , ext: String
    , mime: String
    , size: String
    , width: Number
    , height: Number
    , uploadDate: Date
    , lastModifyDate: Date
    , lastModifyUser: String
    , lastModifyUsername: String
    , thumbnail : Buffer
    , author: String
    , authorName: String
    , status: Number
  });

  var publicObject = mongoose.model('PublicObject', publicObjectSchema);
  publicObject.modelName = 'PublicObject';
  module.exports['PublicObject'] = publicObject;

  var shareObjectSchema = new Schema({
      projectId: String
    , container: String
    , name: String
    , ext: String
    , mime: String
    , size: String
    , width: Number
    , height: Number
    , uploadDate: Date
    , lastModifyDate: Date
    , lastModifyUser: String
    , lastModifyUsername: String
    , thumbnail: Buffer
    , author: String
    , authorName: String
    , status: Number
  });

  var shareObject = mongoose.model('ShareObject', shareObjectSchema);
  shareObject.modelName = 'ShareObject';
  module.exports['ShareObject'] = shareObject;

});




