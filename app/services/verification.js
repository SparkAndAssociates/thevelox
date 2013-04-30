var crypto = require('crypto')
  , redis = require( 'redis' )
  , email = require('emailjs');

function Verification() {
  this.from = app.config.email.from;
  this.server = email.server.connect(app.config.email.server);
  this.redis = redis.createClient(app.config.redis.port, app.config.redis.host);
};

Verification.prototype = {
  protect: function(session, external) {
    // already login in velox
    if (session.user) return false;

    // passed password
    if (session.passed != external.id && external.password) return true;
    
    // passed email varification
    if (session.verified != external.id && external.recipient && external.recipient.length) return true;

    return false;
  },

  pass: function(token, callback) {
    this.redis.get("email_tokens", function(err, tokens) {
  
      var now = new Date().getTime();
      tokens = JSON.parse(tokens || '{}');

      //remove expired tokens
      Object.keys(tokens).forEach(function(key){
        if (tokens[key].expire < now) delete tokens[key];
      });

      if (tokens[token]) {
        callback(err, tokens[token]);
        delete tokens[token];
        this.redis.set("email_tokens", JSON.stringify(tokens));
      } else {
        callback(new Error('This token is expired.'), tokens[token]);
      }

    }.bind(this));
  },

  send: function(options, callback) {
    var now = new Date().getTime()
      , token = crypto.createHash('md5').update("" + now).digest("hex");

    this.redis.get("email_tokens", function(err, tokens) {
      tokens = JSON.parse(tokens || '{}');
      tokens[token] = options;
      tokens[token].expire = now + 1000 * 60 * 60 * 24;

      //remove expired tokens
      Object.keys(tokens).forEach(function(key){
        if (tokens[key].expire < now) delete tokens[key];
      });

      this.redis.set("email_tokens", JSON.stringify(tokens));

      this.server.send({
        from: this.from, 
        to: options.email,
        subject: 'Verify your email address',
        text: [
          'Please click the link below to verify your email address.',
          (app.settings.env == 'development' ? 'http://' + options.host : 'https://thevelox.com') + options.path + token,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, callback);
    }.bind(this));
  },

  notify: function(options, callback) {
    var now = new Date().getTime()
      , token = crypto.createHash('md5').update("" + now).digest("hex");

    this.redis.get("email_tokens", function(err, tokens) {
      tokens = JSON.parse(tokens || '{}');
      tokens[token] = options;
      tokens[token].expire = now + 1000 * 60 * 60 * 24;

      //remove expired tokens
      Object.keys(tokens).forEach(function(key){
        if (tokens[key].expire < now) delete tokens[key];
      });

      this.redis.set("email_tokens", JSON.stringify(tokens));

      this.server.send({
        from: this.from, 
        to: options.email,
        subject: 'You\'ve been invited from ' + options.from + ' share',
        text: [
          'This is a velox notification,',
          'You\'ve been invited from ' + options.from + ' share of "' + options.subject + '", please check this link.',
          (app.settings.env == 'development' ? 'http://' + options.host : 'https://thevelox.com') + options.path + token,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, callback);
      
    }.bind(this));
  }
};

module.exports = new Verification;