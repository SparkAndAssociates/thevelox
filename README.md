# "Are you still using a public storage cloud for sharing corporate confidential data?"
Data produced within a company should be stored/managed internally and shared only to authorized users in an appropriate manner. Combining the accessibility and scalability of cloud with a high-level of security achieved by deploying the service on-premise, Velox provides advanced work environment to corporates who wants to enable efficient collaboration among employees with a high-level of security.

## Features
* **File Management via Web**: Users can sign-up for an account at Velox, log-in to the service, upload and tag files, and share files with colleagues by using any web browser. Velox service is easily accessible with any devices such as mobile and desktop, and authorized contents can be downloaded and opened anytime. Convenient file access and sharing for users with proper authorization will enrich the corporate work environment.
* **Efficient Collaboration**: Collaboration is one of the main reason why we developed Velox. All employees within a company can share files anytime anywhere with whom they need to collaborate. There is no need to painfully search files using folder browsers and no need to be confused about which file is the latest version while sending/receiving files with same file names but with different contents via e-mail. Experience the Velox service, specifically designed for efficient collaboration.
* **Easy File Sharing**: The most important task during collaboration is file sharing. Velox users can share the relevant files for each project to the respective project members. The shared files will be never shown to unauthorized users. When there is a need to share files with external members, you can create a temporary link to securely send/receive selected files using Velox.
* **Log History**: Security is as important, no less than as sharing and collaboration. Corporate confidential data should only be accessed by authorized users. Velox uses SSL to send/receive data over Internet and keeps all log data regarding who accessed and made what modification to which data on when and where. By connecting to Active Directory/LDAP that were already in use, Velox will provide authorization service in conjunction with you existing single sign-on system. 
* **Administration Tools**: Velox includes the cloud storage infrastructure and provides usage analytics service. It provides statistical information on how much storage is used by each user and how much storage is used in total over time. With this information, administrators can plan ahead for in-time maintenance and service as well as necessary storage capacity expansion. Additionally, upcoming features – currently under development – will provide supports for storage capacity expansion and settings as well as monitoring disk defect and server failure, thereby allowing enterprises to operate Velox service without deep technical expertise requirements.

### Enterprise Cloud Storage Solution
Velox is an all-in-one enterprise storage solution integrated with cloud storage infrastructure. It is built for an enterprise-level private cloud storage and provides flexible interface to the storage service. Velox is specifically designed to enable efficient file sharing among internal/external users. Corporate confidential data such as blueprints, product specs, and financial data should be handled discreetly, and storing such data at a public storage cloud can be a security threat. 

* Can store virtually unlimited amount of unstructured data
* Enables efficient collaboration by sharing files among internal colleagues and external members
* Can access data anytime anywhere by using any web browser
* Easy to operate and maintain the service by using administration tools
* Maintain a high-level of security by using a private cloud service
* No need to store corporate confidential data at external service providers’ storage

## Getting Started

### Requirements
* Node.js 0.8.x (Linux based)
* OpenStack Object Storage (SWIFT)
* MongoDB
* Redis

### Installation
```
git clone git@github.com:SparkAndAssociates/thevelox.git
npm update
node server.js
```

### Configuring
edit ./config/config.json
```
{

  // websocket server
  "socket": {
    "hostname": "your.websocketserver.com",
    "port": 6831
  },

  // redis server
  "redis": {
    "host": "your.redisserver.com",
    "port": 6379
  },

  // keystone auth
  "keystone": {
    "host": "https://your.keystonehost.com/v2.0",
    "tenantId": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  },

  // email client
  "email": {
    "from": "Velox<noreply@thevelox.com>",
    "server": {
      "user": "your@emailaddress.com", 
      "password": "password", 
      "host": "smtp.email.com", 
      "ssl": true
    }
  },

  // google analytics track code
  "trackCode": "UA-XXXXXXXX-X",

  // bitly account
  "bitly": {
    "user": "username",
    "key": "X_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

edit ./config/database.json
```
{
  "development": { 
      "driver"  : "mongoose"
    , "host"    : "your.mongoserver.com"
    , "database": "velox"
    , "username": "username"
    , "password": "password"
  },

  "production": {
      "driver"  : "mongoose"
    , "host"    : "your.mongoserver.com"
    , "database": "velox"
    , "username": "username"
    , "password": "password"
  }
}
```

## Development

### Version
Velox는 다음과 같은 버전 식별자를 따릅니다.
> `major.minor[.maintenance[.revision]]`

### Testing
운영 서버에 릴리즈 전에 개발 모드에서만 나타나는 'URL Crash Test Suite' 실행했을 때 서비스가 죽지 않고 오류를 발생하는지 반드시 확인해야 합니다. 그리고 운영 서버에 릴리즈 되면, 다음의 기능이 올바로 수행되는지도 확인해 주세요.

### Roadmap
* 다양한 클라우드 스토리지 지원
* 서비스 관리환경 제공
* 웹기반 파일 업로더 제공
* 폴더 생성 가능


## Change Log

### 1.0.1
* `FIXED` Style error on IE.
* `FIXED` Touch device detection.
* `FIXED` Document preview in IE.
* `ADDED` Validation email for sendbox.
* `FIXED` Sent files auto tag filtering.
* `FIXED` Error handling in production mode.
* `ADDED` Send notification to enterd email address when create share link.
* `ADDED` Check available size when file copy.
* `ADDED` Sort boxes by create_date of copy dialog.
* `ADDED` Option of new item or version for file copy.
* `ADDED` Change password function of settings.
* `ADDED` Email varification for sigin up.
* `ADDED` Duplication check for sigin up.

### 1.0.0
* `ADDED` Error page.
* `FIXED` Infinite redirectiton error of delivery.
* `ADDED` Email notifications of settings.
* `ADDED` Validation fail dialog for some actions and multiple download.
* `FIXED` Infinity confirm email on external share when using password and email.
* `ADDED` Language resource for confirm messages.
* `IMPROVED` Download confirm processed by size (100MB)
* `FIXED` Label 'add version' to 'replace(add version)' for ko, ja.
* `IMPROVED` Sexy confirm and alert dialog.
* `FIXED` Conflict option adjusted in settings.
* `FIXED` Document preivew display positon for small screen size.
* `ADDED` Language resources for front page (en, ja).
* `ADDED` Enable secure protect options for sendbox.
* `ADDED` Enable expire option for external file share.
* `ADDED` Token based email verification.
* `ADDED` Enable secure protect options for external file share.

### 0.9.13
* `ADDED` Features and privacy policy document on front page.
* `ADDED` 'How to using the velox' documents in help.
* `FIXED` 'overflow:auto' scroll issue on old mobile borwser.
* `FIXED` Mobile browser detection.
* `IMPROVED` Page loading speed much faster.
* `ADDED` Select text for specific area.
* `ADDED` Adjust conflict confirm setting.
* `ADDED` Copy as 'new item' or 'add version' option in copy dialog.
* `ADDED` Script compile and marge when server start on production mode.
* `ADDED` Localization for delivery actions.
* `ADDED` Access restrictions for send in delivery.
* `ADDED` Document preivew using scribd client API.
* `ADDED` Scribd Platform API binding for Node.JS.
* `ADDED` Expand share and export link options.

### 0.9.12
* `FIXED` Add/remove box update by socket.
* `FIXED` Multiple send file when retry upload.
* `ADDED` Loading indicator for white background and themes.
* `ADDED` Pop welocme message on sign up.
* `FIXED` Signup submit error in iOS.
* `IMPROVED` Using async module for parallel processing.
* `ADDED` Swipe motion for iOS.
* `ADDED` HTML5 shiv for less than IE9.
* `ADDED` Support timezone.
* `IMPROVED` Keyboard navigation.
* `ADDED` Autocroll lastest selected item when change view type.
* `ADDED` Keyboard shortcuts binding.
* `FIXED` Crash by regexp error when file upload.
* `ADDED` Share focus with selection of another user in same box.
* `ADDED` Check new notepaper on start.
* `ADDED` History messate for notepaper.
* `FIXED` Change image to dummy when additional upload.
* `FIXED` Multiple upload for mobile(iOS Only).
* `IMPROVED` Search keyword in special character.
* `FIXED` Prevew for video in panels.
* `IMPROVED` Change much shorten UUID for generic routes.
* `ADDED` Middleware service for octet-stream.
* `ADDED` More mime-types.
* `IMPROVED` Quick-preivew in thumbnail for videos.
* `IMPROVED` Thumbnail generation speed much faster.
* `ADDED` Generate thumbnail for Adobe acrobat/photoshop and videos.

### 0.9.11
* `FIXED` "Query not found" when cancel search.
* `FIXED` Auto orientation thumbnail for photos.
* `FIXED` Wrong image size of gif thumbnail.
* `ADDED` Test-suite for crashed by routes.
* `ADDED` Perform case-insensitive matching of filename search.
* `FIXED` Cluster hang by giving priority to process EXIT event.
* `FIXED` Search error when input special character.
* `FIXED` Crash in save settings and receive_link.
* `FIXED` Error in signup when duplicate username.
* `ADDED` Running server on multi-core with production mode.
* `ADDED` Notification when new notepaper in box.
* `FIXED` Apply display name option in edit panel.
* `ADDED` Save more properties of settings.
* `FIXED` Some history messages.
* `ADDED` Show recevie link in archives.
* `FIXED` Reset auto-tags in archives.
* `FIXED` Layout error on production mode.
* `FIXED` Change a label to 'Share Box' of 'Project Box'.
* `IMPROVED` Serving static files through NginX on production.
* `ADDED` Production and development mode.
* `IMPROVED` Using Redis Store to store session.
* `ADDED` Automatically resize the box tabs.
* `FIXED` Broken share link page style for IE.
* `FIXED` Broken file name when download.
* `ADDED` Service on thevelox.com domain.
* `FIXED` Change some label to 'Organizer/Attendee' of 'Owner/Members'.
* `ADDED` Find more item in outher pages for attach in note.
* `ADDED` Adjust automatically person settings.

### 0.9.10
* `ADDED` Atom feed for histories.
* `ADDED` History for file log.
* `ADDED` Color themes in settings.
* `ADDED` Special invite mode in sign up.
* `FIXED` Crash when push history data.
* `IMPROVED` Kindly error messages for sign up.
* `IMPROVED` Window resize calculation much faster.
* `FIXED` Wrong update data in notepaper.
* `FIXED` Disable manage tags when open temporary box.
* `ADDED` Auto fix position for notepaper.
* `FIXED` Create share link connection timeout.
* `FIXED` Multiple Download connection timeout.
* `ADDED` Forward thevelox.com domain.
* `FIXED` Download file name.
* `ADDED` Display unread notepaper in share box.
* `ADDED` Create notepaper in share box.
* `ADDED` Notepaper communication controller.
* `FIXED` Update box name error.
* `FIXED` Add/remove box notification.

### 0.9.9a
* `FIXED` Redirect signin when session closed on ajax.
* `FIXED` Upload cancel error.
* `FIXED` Twice upload item in safari on windows.
* `FIXED` Update count init error on box.
* `FIXED` Disable tag tool when not available tags.
* `FIXED` Display version number error.
* `FIXED` Language ​​inspection for japanese.
* `ADDED` History for file actions.
* `ADDED` Generate unique filename for duplicate items.
* `ADDED` Google analytics tracking code.
* `ADDED` Remember the create share links.
* `FIXED` Sign in error when type incorrect value.
* `IMPROVED` Close temporary box interaction.
* `IMPROVED` Display upload item when use of refresh or tag filter.
* `IMPROVED` Item selection speed much faster.
* `IMPROVED` For mobile device style.
* `IMPROVED` Using stable network service.
* `ADDED` Toggle tags filter action for mobile.
* `ADDED` Dropdown menu for shard boxes when connect mobile.
* `IMPROVED` Change URI Schima for shorten.

### 0.9.8
* `FIXED` Save settings error in IE.
* `FIXED` Open preview error in bottom panels.
* `FIXED` Crash when create share link.
* `FIXED` Avaible space display.
* `FIXED` Version item error.
* `FIXED` Assign tag action.
* `IMPROVED` Language for english and korean.
* `FIXED` Crash when file upload.
* `ADDED` Shorten URL for share links and boxes.
* `ADDED` Always pop overlays to modal mode.
* `FIXED` Vaild enable copy button.
* `IMPROVED` Create link dialog to be a panel.
* `FIXED` Style for mobile and window. 
* `FIXED` Crash when save settings in IE.
* `FIXED` Sign in and sign up error in IE9.
* `IMPROVED` Show auto section preview item when move next or previous.

### 0.9.7
* `ADDED` Tooltip for toolbar buttons.
* `ADDED` Valid enough free space.
* `FIXED` Socket.IO secure connection issue.
* `ADDED` Support upload for Internet Explorer.
* `FIXED` Search input style for non-webkit browser.
* `ADDED` Support mobile browser.
* `ADDED` Localization for korean and japanese.
* `ADDED` Manage archived box controls.
* `ADDED` Capacity exceeded message.
* `FIXED` Initialization error with socket connect.
* `FIXED` UI Style for windows OS.
* `FIXED` Upload item visible issue.
* `FIXED` Some wrong words.
* `FIXED` Empty tag name issue.

### 0.9.6
* `ADDED` Upload item auto assigned tag.
* `ADDED` Read and save private settings.
* `FIXED` No display item on invited user.
* `FIXED` Thumbnail image type issue.
* `FIXED` Search filter error.
* `ADDED` localization for korean(part of).
* `ADDED` Ready for localization system.
* `FIXED` 'returnUrl is not defined' error on the sign in page.
* `IMPROVED` Auto resize preview.
* `IMPROVED` Preview navigation.
* `FIXED` Visible indicator on copy process.
* `FIXED` Support upload for the IE.

### 0.9.5
* `FIXED` WebSocket ready.
* `FIXED` Preview generation issue.
* `FIXED` Retry upload issue.
* `IMPROVED` File upload logic.
* `FIXED` Archived box display error in CopyTo dialog.
* `FIXED` Box owner name in CopyTo dialog.
* `FIXED` Undefined sendbox link in firefox.
* `FIXED` Bypassed socket.io port for NginX websocket issue.
* `ADDED` Delete/restore items notification.
* `ADDED` Invited or banned box notification.
* `ADDED` remove notify icon when refresh.
* `ADDED` Display placeholder for IE. (Polyfill)

### 0.9.4
* `ADDED` Valid tab count for invite user's share box.
* `ADDED` URL redirection when has no session id.
* `IMPROVED` Autotag filtering performance.
* `FIXED` Error on filtering autotag with time.
* `FIXED` Apply tag error.
* `ADDED` New or Version item notification.
* `ADDED` Include sendbox to online users count.
* `ADDED` Display online users count in same box.
* `ADDED` Socket.io realtime communication module.

### 0.9.3
* `FIXED` File size is NaN of list
* `FIXED` Change account form
* `FIXED` Tag activation error in share box
* `FIXED` Manage share button display
* `FIXED` Change SSL payload engine
* `IMPROVED` Integrate reverse-proxy performances

### 0.9.2
* `FIXED` Valid form for manage share.
* `IMPROVED` Change user add UI for manage share.
* `FIXED` Update share name whan you change.
* `ADDED` Expire date for create for link(doesn't work).
* `IMPROVED` Tab interface for settings
* `ADDED` Items pagination.
* `IMPROVED` Update DB schema(file object).
* `IMPROVED` Tag filtering performance.
* `ADDED` 'Subscribe history feed' button in properties panel.

### 0.9.1
* `IMPROVED` Delivery URLs is shorten.
* `FIXED` Static files cached issue.
* `IMPROVED` Support IE 8.0.
* `FIXED` Failed thumbnail display error.
* `ADDED` Display conflict items count where the title of the dialog.
* `FIXED` 'Apply all' checkbox visible error.
* `IMPROVED` Routing for exchange controller.
* `ADDED` 'Watched' filter(doesn't work).
* `ADDED` Release note.
* `ADDED` Share box remove tool.
* `IMPROVED` Display user name in CopyTo dialog.
* `ADDED` Valid sharebox exceeds limit 5.

### 0.9.0
* `ADDED` Support SSL protocol
* `ADDED` File Conflict Confirm.
* `FIXED` Conflict confirm bug where a add version in properties panel.
* `IMPROVED` Stabilizing for data CRUD.
* `IMPROVED` Change DB Schema.
* `FIXED` Sorry, All data initialization.

### 0.8.7
* `ADDED` Properties Panel에서 파일 Versioning.
* `FIXED` 'Manage Box' dialog display error.
* `FIXED` Received download filename(hash) error.
* `FIXED` Display new box tab error when submit create box.
* `IMPROVED` Properties filename 수정 실시간 반영.
* `IMPROVED` Available space display.
* `FIXED` Some display an incorrect text.

### 0.8.6
* `ADDED` File search function.
* `ADDED` Private settings dialog.
* `ADDED` Help dialog(availble soon).
* `FIXED` Single file download error.
* `IMPROVED` User add interface on manage box dialog.
* `ADDED` Copy to box function.

### 0.8.5
* `ADDED` Sendbox - 외부 사용자로부터 파일 전송 기능.
* `ADDED` Copy/Recive Link/Share Link 다이얼로그 메시지.
* `IMPROVED` Box 생성/관리 다이얼로그 UI 변경.
* `IMPROVED` 서비스 시작시 Temp 파일 자동 삭제.
* `FIXED` Copy/Recive Link/Share Link 호스트 이름.
* `IMPROVED` 업로드 타임아웃 오류 타이머 위치 변경.
* `ADDED` README.md file.

### 0.8.4
* `ADDED` 서비스 관리 UI.
* `FIXED` 공유 문제.
* `FIXED` Thumbnail 출력 오류.
* `FIXED` 업로드 프로그래스 오류 출력 오류.
* `IMPROVED` 데이터베이스 스키마 변경.
* `FIXED` 개인/프로젝트 컨테이너 구분 오류.
* `IMPROVED` Sign in/Sign up 유효성 검사.
* `FIXED` 파일 업로드 문제 해결.
* `IMPROVED` 파일 업로드 타임아웃 제거.

### 0.8.3
* `ADDED` Sign in/Sign up input placeholder.
* `FIXED` 다중 파일 다운로드 오류.
* `IMPROVED` 스핀 이미지 색상 변경.

### 0.8.2
* `IMPROVED` 태그 관리 UI 변경.
* `FIXED` 업로드 타임아웃 오류 타이머.
* `FIXED` 업로드 버튼 액티베이션 오류.
* `FIXED` Redmine 이슈 2개 해결.
* `ADDED` 공유 스토리지 생성 기능.

### 0.8.1
* `ADDED` 태그 순서 변경 실시간 반영.
* `FIXED` Post 다운로드 오류(ZIP).
* `ADDED` 복사 다이얼로그 작성.
* `IMPROVED` 태그 편집 인터페이스 변경(OK, Cancel 버튼 제거).
* `FIXED` Redmine 이슈 5개 해결.

### 0.8.0
* `IMPROVED` 데이터베이스 스키마 변경.
* `FIXED` 업로드 오류.
* `ADDED` Deleted 태구(휴지통) 구현.
* `ADDED` No Result 메시지.
* `ADDED` 드래그 & 드롭 파일업로드 지원.
* `ADDED` 업로드 취소 버튼.
* `ADDED` 업로드 타임아웃 오류 출력.
* `ADDED` 업로드 충돌 다이얼로그 작성.
* `ADDED` 업로드 재시도 버튼.
* `FIXED` 태그 생성 오류.
* `FIXED` Redmine 이슈 14개 해결.

### 0.7.5
* `ADDED` 회원 가입 기능.
* `ADDED` ImageMagick을 이용한 프리뷰 생성.
* `ADDED` Mime-Type 지원 확대.
* `FIXED` 시간순 소팅 오류.
* `IMPROVED` Properties 패널로 정보 통합.
* `ADDED` 이미지 미리보기 구현.
* `ADDED` 태그 필터링 구현.
* `IMPROVED` 데이터베이스 스키마 업데이트.
* `ADDED` 공유링크 생성 다이얼로그 작성.
* `IMPROVED` 업로드 패널 제거.
* `IMPROVED` 업로드 프로그래스 재작성.
* `ADDED` 태그 편집내역 실시간 반영.
* `ADDED` 아이콘 셋 변경.
* `ADDED` exchange 컨트롤러 작성.

### 0.7.0
* `ADDED` 사용자 태그 필터링 기능.
* `ADDED` 시스템 태그 필터링 기능.
* `ADDED` 버전 정보 출력.
* `IMPROVED` 업로드 UI 변경.
* `IMPROVED` 모든 기능에 다중 선택 지원.
* `ADDED` iPad/iPhone 지원.
* `ADDED` 마지막 View Mode 유지.
* `ADDED` 로그아웃 구현.
* `ADDED` 태그 생성 기능.
* `ADDED` 태그 수정 기능.
* `ADDED` 태그 순서 변경 기능.

### 0.6.0
* `ADDED` Sign up page.
* `ADDED` Thumbnail preview function.
* `ADDED` Rescaling preivew images.
* `ADDED` Mime-Type table for auto analyze.
* `ADDED` Upload progress bar display.
* `IMPROVED` Sign in page composition.
* `ADDED` Create database table using MongoDB.
* `IMPROVED` User interface customization.

### > 0.5.0
* `IMPROVED` Convert to railway box.
* `IMPROVED` Apply everyauth login module.
* `IMPROVED` All user interface renual.
* `ADDED` Sign in function.
* `ADDED` Display swift object and container.
* `ADDED` Manage tags interface.
* `IMPROVED` Modulize Swift.
* `ADDED` Upload file function.
* `ADDED` Download file function.
* `ADDED` Delete file function.

### 0.1.0
* `ADDED` Prototype (POC)
