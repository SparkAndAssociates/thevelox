/* Popup */
var Popup = {
  options: {
    height: 500,
    width: 471
  },
  popups: [],
  open: function(b, j) {
    Object.extend(this.options, j || {});
    var d = document.viewport.getDimensions();
    var a = window.screenX || window.screenLeft || 0;
    var h = window.screenY || window.screenTop || 0;
    var e = h + (d.height / 2 - this.options.height / 2) >> 0;
    var c = a + (d.width / 2 - this.options.width / 2) >> 0;
    var g = this.options.name || "velox_popup_" + (new Date().getTime());
    var f = this.popups[g];
    if(f && !f.closed) {
      f.focus()
    } else {
      this.popups[g] = window.open(b, g, "toolbar=0,scrollbars=1,location=0,status=0,menubar=0,top=" + e + ",left=" + c + ",resizable=1,width=" + this.options.width + ",height=" + this.options.height)
    }
  },
  close: function() {
    this.close()
  },
  resizeToElement: function(b) {
    var b = $(b);
    var c = b.getDimensions();
    var a = 0;
    if(Prototype.Browser.WebKit) {
      a = 69
    } else {
      if(Prototype.Browser.Gecko) {
        a = 69
      } else {
        if(Prototype.Browser.IE) {
          a = 75
        }
      }
    }(function() {
      window.resizeTo(c.width, c.height + a)
    }).delay(0.01)
  }
};