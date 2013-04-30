var moment = require('moment')
  , validator = require('validator');

module.exports = {
  _sanitize: validator.sanitize,
  _file: function(file, boxId, single, ctrl) {
    var isVertical = false
      , hasPreview = file.images && file.images.thumbnail && file.images.thumbnail.buffer.length
      , ver = file.versions && file.versions.length + 1 || 1
      , type = this._mime(file.mime)
      , thumb = 'icon'
      , style = ''
      , zoom = single ? 17 : 5
      , src = '/images/asset.gif'
      , rel = '/images/mime/public.' + type + '.gif'
      , withPreview = false;

    if (hasPreview) {
      var orientation = file.images.orientation || ''
        , width = file.images.width
        , height = file.images.height;

      if (orientation.match(/RightTop|LeftBottom/)) {
        width = file.images.height;
        height = file.images.width;
      }

      var isVertical = width < height
        , offset = ((isVertical ? width / height : height / width ) * zoom).toFixed(2);

      withPreview = (
             type == 'video'
          //|| type == 'document'
          //|| file.mime == 'application/pdf'
          || file.mime == 'image/vnd.adobe.photoshop'
          || !file.mime && file.ext == 'psd' //DELETEME
        ) ? false : true;

      thumb = type == 'video' ? 'waiting video' : isVertical ? 'vertical' : '';
      rel = (ctrl && '/' + ctrl + '/' || '/assets/') + boxId +'/thumbnail/' + file.id;
      style = (isVertical ? 'width:' + offset : 'height:' + offset) + 'em';
      
      // 기존 썸네일 갱신
      /*
      if (type == 'video') {
        src = '/images/generating-preview.gif';
        style = '';
      }
      */
    }

    return {
        ver: ver
      , src: src
      , rel: rel
      , style: style
      , thumb: thumb
      , preview: withPreview
      , asset: withPreview && 'with-preview' || ''
    };
  },
  _encode64: function(id) {
    return new Buffer(id.toString(), 'hex')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '!') || id;
  },
  _decode64: function(id) {
    return new Buffer(id
      .replace(/\-/g, '+')
      .replace(/!/g,  '/')
    , 'base64').toString('hex') || id;
  },
  _name: function(obj, dispname, last) {
    return !last && (dispname == 'realname' && (obj.authorName || obj.username) || obj.author || obj.name)
        || (dispname == 'realname' && obj.lastModifyUsername || obj.lastModifyUser)
        || null;
  },
  _size: function (size) {
    var negative = this._negative(size);
    if (negative) size *= -1;

    var i = 0;
    while(1023 < size) {
      size /= 1024;
      ++i;
    }

    return (negative ? '-' : '') + (i ? size.toFixed(2) + ["", " KB", " MB", " GB", " TB"][i] : size + " bytes");
  },
  _negative: function(size) {
    return size < 0;
  },
  _commify: function(n) {
    var reg = /(^[+-]?\d+)(\d{3})/;   // 정규식
    n += '';                          // 숫자를 문자열로 변환
  
    while (reg.test(n))
      n = n.replace(reg, '$1' + ',' + '$2');
  
    return n;
  },
  _zone: function(date, zone) {
    if (isNaN(zone)) zone = 540;
    var date = moment(new Date(date))
      , offset = date.zone(date) + zone
      , method = offset < 0 ? 'subtract' : 'add';

    return date[method]('minutes', Math.abs(offset));
  },
  _calendar: function(date, locale, zone) {
    moment.lang(locale.split('-')[0]);
    return this._zone(date, zone).calendar();
  },
  _format: function(date, locale, zone) {
    moment.lang(locale.split('-')[0]);
    return this._zone(date, zone).format('YYYY-MM-DD hh:mm A');
  },
  _when : function (date, locale, zone) {
    moment.lang(locale.split('-')[0]);
    return this._zone(date, zone).fromNow();
  },
  _mime : function(contentType) {
    return app.vm.lookup(contentType);
  }
};