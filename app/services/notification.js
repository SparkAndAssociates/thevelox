var email = require('emailjs');

function Notifications() {
  this.from = app.config.email.from;
  this.server = email.server.connect(app.config.email.server);
};

Notifications.prototype = {
  _findBox: function(boxId, callback) {
    Box.findOne({_id: boxId}, function(err, box) {
      if (err || !box) return console.error(err || 'email notification error: box not found');
      callback(box);
    });
  },

  _getBoxAndOwner: function(boxId, callback) {
    this._findBox(boxId, function(box) {
      User.findOne({_id: box.owner}, function(err, user) {
        if (err || !user) return console.error(err || 'email notification error: user not found');
        callback(user, box);  
      });
    });
  },

  _getBoxAndMembers: function(boxId, callback) {
    this._findBox(boxId, function(box) {
      User.find({_id: {$in: box.members}}, function(err, users) {
        if (err || !users) return console.error(err || 'email notification error: users not found');
        callback(users, box);  
      });
    });
  },

  _basicValidate: function(user, mode) {
    // 환경 설정 변수
    if (!user.notifications) user.notifications = {};
 
    // 알림설정이 되어 있음
    var valid = !!user.notifications[mode];

    // 이메일 정보가 있고 올바름
    if (!user.email || !user.email.match('@')) {
      valid = false;
      console.error('email notification error: user\'s email is not valid');
    }

    return valid;
  },

  // 외부 사용자로부터 파일을 받았을 때
  received: function(host, boxId, from) {
    // 일단, 박스 주인 한테만 발송
    // FIXME: 구글에서 자동 스팸 필터링 처리됨
    this._getBoxAndOwner(boxId, function(user, box) {

      if (!this._basicValidate(user, 'received')) return;

      // 파일 수신 알림 이메일 발송
      this.server.send({
        from: this.from, 
        to: user.email,
        subject: 'You\'ve got a new item added from ' + box.name + ' share box',
        text: [
          'This is a velox notification,',
          'You\'ve got a new item added from ' + box.name + ' share box by ' + (from || 'Unknown') + ', please check your velox.',
          (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/assets/' + box.id,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, function(err, message) {
        console.log(err || message);
      });

    }.bind(this));
  },

  // 보낸 파일의 링크 유효 기간이 만료 되었을 때
  expired: function(host, boxId, data) {
    // 일단, 박스 주인 한테만 발송
    this._getBoxAndOwner(boxId, function(user, box) {

      if (!this._basicValidate(user, 'expired')) return;

      // 기간 만료 알림 이메일 발송
      this.server.send({
        from: this.from, 
        to: user.email,
        subject: 'Expired share item ' + data.subject,
        text: [
          'This is a velox notification,',
          data.subject + ' is expired, please check your velox.',
          (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/assets/' + box.id,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, function(err, message) {
        console.log(err || message);
      });

    }.bind(this));
  },

  // 외부 사용자에게 보낸 파일이 다운로드 되었을 때
  sent: function(host, boxId, external, from) {
    this._getBoxAndOwner(boxId, function(user, box) {

      if (!this._basicValidate(user, 'sent')) return;
    
      this.server.send({
        from: this.from, 
        to: user.email,
        subject: 'Successfuly sent ' + external.subject,
        text: [
          'This is a velox notification,',
          external.subject + ' sent successfuly to ' + (from || 'sombody') + ', please check your velox.',
          (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/assets/' + box.id,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, function(err, message) {
        console.log(err || message);
      });

    }.bind(this));
  },

  // 저장 공간이 가득 찼을 때
  nospace: function(host, user, sessionUser) {

    if (!this._basicValidate(user, 'nospace')) return;
    if (!user.email_sent_flags) user.email_sent_flags = {};

    // 용량 초과 알림 메일 발송
    if ((!sessionUser || user.id != sessionUser.id) // 자신이 아닌 다른사람이 업로드
      && user.availableSize < 1 // 참여자한 사용자의 용량이 남지 않음
      && (!user.email_sent_flags.nospace || new Date - user.email_sent_flags.nospace > 86400000 * 7) // 보낸적이 없거나 보낸지 7일이 지남
    ) { 

      user.email_sent_flags.nospace = new Date;
      user.save();

      this.server.send({
        from: this.from, 
        to: user.email,
        subject: 'Your cloud storage is full',
        text: [
          'This is a velox notification,',
          'Your cloud storage is full!, please check your velox.',
          (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/signin',
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, function(err, message) {
        console.log(err || message);
      });
    }
  },

  // 공유박스에 초대받았을 때
  invited: function(host, box, users, sessionUser) {
    users.names.forEach(function(name) {
      User.GetByName(name, function(err, user) {

        if (!this._basicValidate(user, 'invited') || box.members.indexOf(user.id) != -1) return;

        this.server.send({
          from: this.from, 
          to: user.email,
          subject: 'You\'ve been invited from ' + box.name + ' share box',
          text: [
            'This is a velox notification,',
            'You\'ve been invited from ' + box.name + ' share box of ' + sessionUser.name + ', please check your velox.',
            (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/assets/' + box.id,
            'Have a nice day,\nVelox.'
          ].join('\n\n')
        }, function(err, message) {
          console.log(err || message);
        });

      }.bind(this));
    }.bind(this));
  },

  // 공유박스에 새로운 메모가 스여졌을 때
  noted: function(host, boxId, sessionUser) {
    this._getBoxAndMembers(boxId, function(users, box) {
      var emails = [];
      users.forEach(function(user) {
        if (!this._basicValidate(user, 'note') || user.id == sessionUser.id) return;
        emails.push(user.email);
      }.bind(this));

      this.server.send({
        from: this.from, 
        to: emails.join(', '),
        subject: 'You\'ve get a new message form ' + sessionUser.name,
        text: [
          'This is a velox notification,',
          'You\'ve get a new message form ' + sessionUser.name + ', please check your velox.',
          (app.settings.env == 'development' ? 'http://' + host : 'https://thevelox.com') + '/assets/' + box.id,
          'Have a nice day,\nVelox.'
        ].join('\n\n')
      }, function(err, message) {
        console.log(err || message);
      });
    }.bind(this));
  }
};

module.exports = new Notifications;