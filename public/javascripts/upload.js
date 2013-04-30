/*!
 * Velox - upload.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

if (!window.console) console = {
  log: function() {},
  info: function() {},
  warn: function() {},
  error: function() {}
};

console.info('jQuery: ', $.noConflict().fn.jquery);
console.info('Underscore.js: ', _.VERSION);
console.info('Backbone.js: ', Backbone.VERSION);

/*! ----------------------------------------------------------------------------
 * upload.js
 * --------------------------------------------------------------------------- */
var Upload = {
  mode: {
    //safariwindows: jQuery.browser.webkit && (navigator.platform.search("Win") != -1) && (navigator.vendor.search("Apple") != -1),
    legacy: !(typeof File!=="undefined") && !("multiple" in document.createElement("input")),
    iOS: /ipad|iphone|ipod/i.test(navigator.userAgent.toLowerCase()),
    chunked: typeof File !== "undefined" && typeof File.prototype.slice !== "undefined"
  },

  initialize: function() {
    this.inProgress = false;
    this.files = new Upload.FileCollection();

    if (this.mode.legacy) {
      this.form = new Upload.Views.LegacyForm({el: "#upload-form"});
      this.queue = new Upload.Views.LegacyQueue()
    } else {
      this.form = new Upload.Views.Form({el: "#upload-form"});
      this.queue = new Upload.Views.Queue()
    }

    if (this.mode.chunked) Upload.slice = function(b, c, a) { return b.slice(c, a); }

    this.method = jQuery(this.form.el).attr('method');
    this.action = parent.Assets.filesUrl + 'upload';

    this.chunkSize = 1024 * 1024 * 1024 * 4;

    this.files.bind("add", Upload.handleUpload);
  },

  handleUpload: function() {
    Upload.files.unbind("add", Upload.handleUpload);

    if (Upload.files.length) {
      Upload.inProgress = true;
      var a = Upload.files.first();
      a.bind("complete", Upload.handleUpload);
      a.bind("change:available_space", Upload.updateQuota);
      a.upload();
      Upload.files.remove(a);
    } else {
      Upload.handleQueueFinished();
    }
  },

  handleQueueFinished: function() {
    Upload.inProgress = false;
    Upload.files.bind("add", Upload.handleUpload)
  },

  updateQuota: function(a, b) {
    parent.$("usage-info").update(b + " available")
  }
};

Upload.FileCollection = Backbone.Collection.extend({
  getUniqueFileName: function(file, idx) {
    var splited = file.name.split('.')
      , ext = splited.length > 1 ? splited[splited.length - 1] : ''
      , hash = (new Date().getTime()-1000*60*60*24*365*42).toString(36);

    if (splited.length > 1) splited.pop();
    return splited.join('.') + '-' + hash + (idx || '') + '.' + ext;
  },

  addFiles: function(files) {  
    var self = this; 

    if (Upload.mode.iOS) {
      _(files).each(function(file, idx) {
        if (!file.type.match('image/')) return;
        file._name = self.getUniqueFileName(file, idx);
      });
    }

    if (Upload.actionId) {
      _(files).each(function(file) {
        if (file.size < 1) return;
        self.add(new Upload.File(file));
      });
      return false;
    }

    // conflict confirm
    var filenames = [];
    _(files).each(function(file) {
      filenames.push(file._name || file.name || file.fileName);
    });

    parent.Assets.startUpload();
    parent.Assets.confirmConflict(filenames.join(','), function(results) {
      _(files).each(function(file, idx) {
        //console.log(file, results);
        if (results && results[file.name]) {
          if (results[file.name].action == 'new') {
            //file._name = self.getUniqueFileName(file, idx);
          } else {
            file.versionId = results[file.name].action == 'version' && results[file.name]._id;
          }
        }

        if (file.size < 1) return;
        self.add(new Upload.File(file));
      });
    });
  }
});

Upload.File = Backbone.Model.extend({
  initialize: function(file) {
    this.set({
      file: file,
      name: this.cleanName(file._name || file.name || file.fileName)
    });
    this._initialize(file.versionId)
  },

  _initialize: function(versionId) {
    if (Upload.actionId) {
      versionId = Upload.actionId;
      Upload.actionId = '';
    }
    this.errorTries = 0;
    this.startTime = 0;
    this.versionId = versionId;
    this.loadedBytes = 0;
    this.totalBytes = 0;
    this.timeLeft = I18n.t("upload.time_left_calc");
    this.bind("change:status", _.bind(this.onStatusChange, this));
    this.set({
      id: "",
      status: "queued",
      message: I18n.t("upload.queued")
    });
  },

  upload: function() {
    this.set({status: "active"});
    var b = this.get("file");
    var c = this.xhr = new XMLHttpRequest();
    var a = c.upload;
    if (!b) return;
    c.addEventListener("load", _.bind(this.onLoad, this), false);
    a.addEventListener("progress", _.bind(this.onProgress, this), false);
    c.addEventListener("error", _.bind(this.onError, this), false);
    c.addEventListener("abort", _.bind(this.onAbort, this), false);
    c.open(Upload.method, Upload.action + (this.versionId ?  '/' + this.versionId : '') + '?t=' + (new Date().getTime()), true);
    this.setDefaultHeaders(c, b);

    c.send(b);
  },

  onProgress: function(a) {
    this.set({
      message: this.formatProgessStatus(a.total, a.loaded),
      percent: this.formatProgress(a.total, a.loaded)
    })
  },

  onError: function(a) {
    if (Upload.mode.iOS) return; // WTF?
    if (a.target.status == 0) this.errorTries = 5;
    this._onError(_.bind(this.upload, this));
  },

  _onError: function(a) {
    if (++this.errorTries < 5) {
      this.set({
        status: "error",
        message: I18n.t("upload.retrying")
      });
      _.delay(a, 5000);
    } else {
      this.set({
        status: "error",
        message: I18n.t("upload.fatal_error")
      })
    }
  },

  onAbort: function(a) {
    this.set({
      status: "error",
      message: I18n.t("upload.cancelled")
    });
    this.removeEventListeners(a)
  },

  onLoad: function(c) {
    var a = {};
    try {
      a = jQuery.parseJSON(c.target.responseText);
      this.setData(a);
      this.cleanup(c)
    } catch(b) {
      this.onError(c)
    }
  },

  onStatusChange: function(b, a) {
    switch(a) {
    case "active":
      this.startTime = this.getTime();
      this.checkAppoxTimeLeft(1000);
      break;
    case "complete":
      // this.triggerComplete();
    default:
      clearInterval(this.tlInterval);
      break
    }
  },

  checkAppoxTimeLeft: function(a) {
    clearInterval(this.tlInterval);
    this.tlInterval = setInterval(_.bind(this.approximateTimeLeft, this), a)
  },

  cleanup: function(a) {
    this.removeEventListeners(a)
  },

  removeEventListeners: function(a) {
    var b = a.target;
    b.removeEventListener("load", _.bind(this.onLoad, this), false);
    if (b.upload) {
      b.upload.removeEventListener("progress", _.bind(this.onProgress, this), false);
      b.upload.removeEventListener("error", _.bind(this.onError, this), false);
      b.upload.removeEventListener("abort", _.bind(this.onAbort, this), false)
    }
    this.xhr = null
  },

  cancel: function() {
    this.xhr && this.xhr.abort()
  },

  retry: function() {
    this.upload()
  },

  setDefaultHeaders: function(xhr, file) {
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file._name || file.name || file.fileName));
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("Content-Disposition", 'attachment; filename="' + encodeURIComponent(file._name || file.name || file.fileName) + '"');
  },

  setData: function(a) {
    if (a) {
      this.set(a);
      this.set({percent: "100%"});
      if (a.status == "complete") this.unbindAndClear();
    } else {
      this.set({
        status: "error",
        message: I18n.t("upload.unknown_error")
      });
    }
  },

  unbindAndClear: function() {
    clearInterval(this.tlInterval);
    this.unbind();
    this.clear();
  },

  triggerComplete: function() {
    this.trigger("complete", this);
  },

  getTime: function() {
    return new Date().getTime()
  },

  formatProgress: function(b, a) {
    return parseInt((a / b) * 100, 10) + "%"
  },

  formatProgessStatus: function(c, b) {
    var a = this;
    this.totalBytes = c;
    this.loadedBytes = b;
    this.total = this.total || this.humanSize(c);
    return a.humanSize(b)  + '<span>/' + a.total + '</span> <span>' + this.timeLeft + '</span>';
  },

  calculateSpeed: function(c) {
    var b = (this.prevLoadedBytes || 0);
    var a = (this.loadedBytes - b) / (c / 1000);
    this.prevLoadedBytes = this.loadedBytes;
    return "(" + this.humanSize(a) + "/sec)";
  },

  approximateTimeLeft: function() {
    var f = this.totalBytes;
    var c = this.loadedBytes;
    var a = this.getTime() - this.startTime;
    var d = ((f - c) / (c / a));
    var h = Math.floor((d / 1000) % 60);
    var b = Math.floor((d / (1000 * 60)) % 60);
    var g = Math.floor((d / (1000 * 60 * 60)) % 24);
    var j = "";
    var e;

    if (g) {
      e = 10000;
      j += g + " hr ";
    }

    if (b) {
      if (!g) e = 2000;
      j += b + " min ";
    }

    if (h && !g) {
      if (!b) e = 1000;
      j += h + " sec";
    }

    if (g || b || h) {
      j = I18n.t("upload.time_left", {time: j});
    } else j = "";

    if (e) {
      this.checkAppoxTimeLeft(e);
      j += this.calculateSpeed(e);
    }

    this.timeLeft = j
  },

  humanSize: function(b, d) {
    var e = ["B", "KB", "MB", "GB"];
    var a = [0, 0, 2, 2];
    var c = 0;
    while(b > 1024 && c < e.length - 1) {
      ++c;
      b = Math.round((b / 1024) * 100) / 100
    }
    return(b.toFixed(a[c])) + " " + e[c];
  },

  cleanName: function(a) {
    return a.replace(/.*\\/, "");
  }
});

Upload.LegacyFile = Upload.File.extend({
  initialize: function(a) {
    this.set({
      input: a,
      name: this.cleanName(a.value)
    });
    this._initialize()
  },
  upload: function() {
    this.set({
      status: "active",
      message: I18n.t("upload.starting")
    });
    this.trigger("upload", this);
    //this.bind("checkProgess", _.bind(this.getProgress, this));
    //this.getProgress()
  },
  onAbort: function() {
    this.set({
      status: "error",
      message: I18n.t("upload.cancelled")
    });
    this.unbind("checkProgess")
  },
  onProgress: function(b, a) {
    this.set({
      message: this.formatProgessStatus(b, a),
      percent: this.formatProgress(b, a)
    })
  },
  getProgress: function() {
    var a = this;
    var b = "/upload/progress";
    $.get(b, function(c) {
      var d = c.state;
      var e = (d == "starting") ? 500 : 2000;
      if(d == "uploading") {
        a.onProgress(c.size, c.received)
      } else {
        if(d == "error") {}
      }
      if(d == "starting" || d == "uploading") {
        _.delay(_.bind(a.trigger, a), e, "checkProgess")
      }
    })
  },
  onLoad: function(c) {
    var a = {};
    try {
      a = $.parseJSON(c);
      this.setData(a)
    } catch(b) {
      this.unbind("checkProgess");
      this.onError()
    }
  }
});


Upload.Views = {};
Upload.Views.Form = Backbone.View.extend({
  events: {
    "click a": "selectFiles",
    change: "onFilesSelected"
  },
  initialize: function() {
    //if(Upload.mode.safariwindows) this.$("input.file")[0].addEventListener("change", this.onFilesSelected, false);
  },
  changeMode: function(multiple) {
    this.$("input.file")[0].multiple = multiple;
  },
  onFilesSelected: function(b) {
    var a = b.target.files;
    Upload.files.addFiles(a);
  },
  removeHandleUpload: function() {
    Upload.files.unbind("add", this.handleUpload)
  },
  selectFiles: function(a) {
    a.preventDefault && a.preventDefault();
    this.$("input.file").click();
  }
});

Upload.Views.LegacyForm = Upload.Views.Form.extend({
  events: {
    //submit: "cancelSubmit"
  },
  initialize: function() {
    this.addLegacyChangeEvent();
  },
  onFilesSelected: function(a) {
    jQuery(a.target).unbind("change");
    parent.Assets.startUpload();
    parent.Assets.confirmConflict(a.target.value.replace(/.*\\/, ""), function(results) {
      Upload.files.add(new Upload.LegacyFile(a.target));
    });
  },
  addLegacyChangeEvent: function() {
    this.$("input.file").change(_.bind(this.onFilesSelected, this));
  },
  reset: function() {
    this.$("input.file")[0].value = '';
    this.addLegacyChangeEvent()
  },
  cancelSubmit: function(a) {
    return false
  }
});

Upload.Views.Queue = Backbone.View.extend({
  tagName: "ul",
  id: "upload-queue",

  initialize: function() {
    Upload.files.bind("add", _.bind(this.onFileQueued, this));
  },

  onQueueEnd: function() {
    jQuery("input.file")[0].value = '';
    parent.Assets.finishUpload();
    //parent.Assets.nothingHappened = true;
    //parent.Assets.refresh();
  },

  createUploadItem: function(model) {
    var item = parent.Assets[model.versionId ? 'addNewVersion' : 'addNewItem'](model, model.versionId);
    
    item.down('.retry').observe('click', function(event) {
      //model.triggerComplete();
      model.retry();

      item.removeClassName('error');
      event.preventDefault()
    });

    model.bind("change:percent", function() {
      item.removeClassName('error');

      var percent = model.get("percent");
      item.down('.bar').style.width = percent;

      if (percent == '100%') {
        //errorTimeout && clearTimeout(errorTimeout);
        item.addClassName('pending');
        item.down('.msg').update('Verifying...');
      }
    });

    model.bind("change:message", function() {
      item.down('.msg') && item.down('.msg').update(model.get("message"));
    });

    model.bind("change:name", function(c, b) {
      item.down('.a-title').down().update(b);
    });

    model.bind("change:mime", function(c, b) {
      var img = item.down('img');
      img.writeAttribute('rel', "/images/mime/public." + b +'.gif');
    });

    model.bind("change:thumb", function(c, b) {
      var img = item.down('img');
      img.src = b;
      // 서버로 ㅂ터 수신받은 이미지 주소를 대입후 오류 발생시 더미 이미지로 보정
      img.errorTries = 0;
      img.observe('error', function() {
        if (img.errorTries > 2) return;
        img.src = img.readAttribute('rel');  
        img.style = '';
        img.errorTries++;
      });
    });

    model.bind("change:version", function(c, b) {
      item.down('.version').addClassName('ver-' + b).writeAttribute('v.' + b).update(b);
    });

    return item;
  },

  cancelUpload: function(model, item) {
    model.triggerComplete();
    model.unbindAndClear();
    model.cancel();

    Upload.files.remove(model);
    parent.Assets.cancelUpload(item);
  },

  onFileQueued: function(model) {
    var item = this.createUploadItem(model)
      , self = this;

    item.down('.cancel').observe('click', function(event) {
      self.cancelUpload(model, item);
      event.preventDefault();
    });

    model.bind("change:status", function(b, a) {
      console.log('change:status', b, a);

      if (a == "complete") {
        // end upload
        model.triggerComplete();
        parent.Assets.completeUpload(item, model, b.id);
        if (!Upload.files.length) self.onQueueEnd();
        return this;
      }

      if (a == "error") {
        item.addClassName('error');
        return this;
      }
      
      // start upload
      if (a == 'active') {
        item.addClassName('uploading');
        return this;
      }
    });

  }
});


Upload.Views.LegacyQueue = Upload.Views.Queue.extend({
  initForm: function(model) {
    var a = jQuery("body");
    a.append('<iframe name="iframe-' + model.cid + '" id="iframe-' + model.cid + '" width="0" height="0" frameborder="0" style="border: none; display: none; visibility: hidden;"></iframe>');
    
    this.form = a.find("#upload-form").attr('action', Upload.action).attr('target', 'iframe-' + model.cid);
    //if (model) Upload.form.reset();

    this.iframe = this.form.find("iframe");
    this.iframe.bind("load", _.bind(this.onLoad, this));
  },

  onFileQueued: function(model) {
    var item = this.createUploadItem(model)
      , self = this;

    item.down('.cancel').observe('click', function(event) {
      self.cancelUpload(model, item);
      event.preventDefault();
      Upload.form.reset();
    });

    model.bind("change:status", function(b, a) {
      console.log('change:status', b, a);
      if (a == "complete") {
        // end upload
        model.triggerComplete();
        parent.Assets.completeUpload(item, model);
        if (!Upload.files.length) {
          self.onQueueEnd();
          Upload.form.reset();
        }
        return this;
      }

      if (a == "error") {
        item.addClassName('error');
        return this;
      }

      // start upload
      if (a == 'active') {
        item.addClassName('uploading').addClassName('multipart');
        return this;
      }
    });

    model.bind("upload", function() {
      // Error: Access is denied (IE-only)
      self.form.submit();
    });

    model.bind("complete", function() {
      if(self.iframe) {
        self.iframe.unbind();
        self.form.attr('target', '');
        self.iframe = null;
      }
    });

    this.initForm(model);
  },
  onLoad: function(b) {
    var a = jQuery(b.target).contents().find("body").html();
    if(a.length) this.model.onLoad(a)
  },
  cancel: function(a) {
    this.model.onAbort();
    this.cleanup();
    this.initForm();
    a.preventDefault()
  }
});

(function() {
  var overlay = '<div id="drop-box-overlay">Drop files to upload...</div>';

  function initDnD(element) {
    element.insert(overlay);
  	overlay = parent.$("drop-box-overlay").hide();

    // Add drag handling to target elements
  	element.observe("dragenter", function(event) {
    	element.fx && element.fx.state == 'running' && element.fx.cancel();
      element.fx = new parent.Effect.Appear(overlay, {duration: 0.1, to: 0.5});
  	}, false);

  	overlay.observe("dragleave", function(event) {
  	  var el = event.element();
  	  if (el && el != overlay) return;
  	  element.fx && element.fx.state == 'running' && element.fx.cancel();
    	element.fx = new parent.Effect.Fade(overlay, {duration: 0.1});
  	}, false);
  	overlay.observe("dragover", noopHandler, false);
  	
  	// Add drop handling
  	overlay.observe("drop", onDrop, false);
  }

  function noopHandler(evt) {
  	evt.stopPropagation();
  	evt.preventDefault();
  }

  function onDrop(evt) {
  	// Consume the event.
  	noopHandler(evt);
  	
  	// Hide overlay
  	overlay.fade({duration: 0.1});

  	Upload.form.changeMode(true);
  	Upload.files.addFiles(evt.dataTransfer.files);
  }

  Upload.initialize();
  parent.Assets.selectFiles = function(event, id) {
    Upload.actionId = id || null;
    Upload.form.changeMode(!id);
    Upload.form.selectFiles(event);
  };

	parent.Assets.initDropArea(initDnD);

})();

window.onbeforeunload = function() { 
  if (Upload.inProgress)
    return "File upload in progress, are you sure?";
}