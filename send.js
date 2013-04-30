#!/usr/bin/env node

var fs = require('fs')
  , config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'))
  , app = require('railway').createServer(config.secure)
  , clog = require('clog')
  , email = require('emailjs');


var from = config.email.from;
var server = email.server.connect(config.email.server);

function sendEmail(users) {
  // 파일 수신 알림 이메일 발송
  var user = users.pop();
  if (!user) return clog.info('All email sended!');

  var titles = {
    'ko-KR': '2013년 5월 31일(금)로 Velox의 클로즈 베타 서비스 운영이 종료됩니다.',
    'en-US': 'End-of-Velox\'s Cloed Beta Serivce Notice.',
    'ja-JP': '題目：2013年5月31日（金）にVeloxのベータサービスの運営が終了します。'
  };

  var messages = {
    'ko-KR': [
      user.name + ' 님 안녕하세요.',
      '2013년 5월 31일(금)로 Velox( https://thevelox.com ) 서비스 운영이 종료됩니다. 그 동안 Velox를 이용해주신 여러분께 진심으로 감사의 말씀 드립니다. Velox를 통해 보다 편리하고 효율적인 협업을 할 수 있도록 도와드리고자 노력했으나, 끝까지 여러분의 관심과 기대에 부응하지 못해 송구스러운 마음입니다.',
      '여러분께서 업로드하셨던 파일들은 2013년 5월 31일까지 다운로드할 수 있으며, 종전과 같이 정상적으로 서비스를 이용하실 수 있습니다. 필요한 파일들은 이 기간 동안에 모두 다운로드하여 주시면 감사하겠습니다. 2013년 5월 1일(수)부터는 회원가입 기능이 중단되며, 서비스가 종료된 후 Velox 서버에 등록된 파일들은 일괄적으로 초기화됩니다.',
      '아울러, Velox 프로젝트는 오픈소스로 전향되며, SPARK & ASSOCIATES는 프로젝트가 지속적으로 발전할 수 있도록 지원할 것입니다. 2013년 4월 30일(화)에 GitHub( https://github.com/SparkAndAssociates )를 통해 공개하도록 하겠습니다.',
      '감사합니다.'
    ],

    'en-US': [
      'Dear ' + user.name + '.',
      'Please note that Velox\'s Closed Beta Service is being terminated.',
      'On June 1, 2013 at 06:00 am, Velox service will close. We appreciate your use of the service until now. The service will be operational until May 31. Files that you have uploaded can be downloaded until May 31.',
      'Please download all your necessary files while the service is available. New accounts will no longer be accepted beginning May 1. After terminating the service, all data will be wiped ( https://thevelox.com ).',
      'Moreover, please note that Velox project will be open sourced, and we will continue supporting the development of Velox and other Spark & Associates projects. We aim to open source Velox on GitHub( https://github.com/SparkAndAssociates ) by April 30, 2013.',
      'Have a nice day,\nVelox.'
    ],

    'ja-JP': [
      user.name + ' さん',
      'お世話になります。',
      'さて、2013年5月31日（金）にVelox( https://thevelox.com )のサービスの運営が終了します。その間Veloxを利用してくださった皆様に心より感謝申し上げます。Veloxを用いて、より便利で効率的なコラボレーションを行うように助けてあげる為努力をしましたが、最後まで皆さんの関心と期待に応えることができず申し訳ない気持ちです。',
      '皆さんがアップロードしておりましたファイルは2013年5月31日までダウンロードすることができ、従来のように正常的にサービスを利用することができます。必要なファイルはこの期間中に全てダウンロードして頂ければ幸いです。2013年5月1日（水）からは会員登録機能が中止され、サービスが終了した後、Veloxサーバーに登録されたファイルは一括して初期化されます。',
      '尚、Veloxプロジェクトはオープンソースに転向され、SPARK＆ASSOCIATESはプロジェクトが持続的に発展できるようにサポート致します。2013年4月30日（火）にGitHub( https://github.com/SparkAndAssociates )で公開致します。ありがとうございます。',
      'ありがとうございます。'
    ]
  };

  clog.info('sending email to ' + user.email + ' (' + user.locale + ') and ' + users.length + ' left ...');

  server.send({
    from: from, 
    to: user.email,
    subject: titles[user.locale],
    text: messages[user.locale].join('\n\n')
  }, function(err, message) {
    clog.log(err || message);
  });
  
  setTimeout(function() {
    sendEmail(users);
  }, 5000)
}


User.find('*', function(err, users) {
  var _users = [];

  users.forEach(function(user) {
    if (user.email && user.email.match('@') || user.name.match('@')) {
      if (user.email != 'juhee0712@nate.com')
        _users.push({
          name: user.username || user.name,
          locale: user.locale || user.email.match(/co\.kr|naver.com|nate.com|daum.net|korea.com/) && 'ko-KR' || 'en-US',
          email: user.email
        });
    }
  });

  clog.info('total users: ' + _users.length);
  sendEmail(_users);
});