/*!
 * Velox - sendbox.js
 * Joon Kyoung(@firejune)
 * Copyright(c) 2013 Spark & Associates Inc.
 * MIT Licensed
 */

var previousEmailValue = "";
var Dropbox = {
  initialize: function() {
    new Form.Element.Observer("drop_file", 0.5, function(b, a) {
      if (a != "") {
        $("file_upload_submit").removeAttribute("disabled")
      } else {
        $("file_upload_submit").writeAttribute("disabled", "disabled")
      }
    });

    new Form.Element.Observer("drop_email", 2, function(b, a) {
      setTimeout(function() {
        validateEmail()
      }, 2000);
    });

    var splited = $('upload').action.split('/');

    this.boxId = splited[splited.length - 1];
    this.socket = io.connect(socketUrl, {secure: location.protocol == 'https:'});
    this.socket.emit('join', {action: 'updateConnections', guid: this.boxId});
  },
  uploadAgain: function() {
    ["upload-status-wrapper", "upload-status"].each(Element.hide);
    $("details_form").setStyle({
      opacity: "0",
      height: "0px",
      marginTop: "0px"
    });
    $("content").setStyle({
      height: "auto"
    });
    $("upload").show();
    new Ajax.Request("/dropbox/reset_upload")
  }
};

var UploadProgressMethods = {
  uploadProgress: function(e, c) {
    c == c || {};
    c = Object.extend({
      interval: 2000,
      progressBar: "progressbar",
      progressUrl: "/progress",
      start: function() {},
      uploading: function() {},
      complete: function() {},
      success: function() {},
      error: function() {},
      prototypePath: "/javascripts/vendor/prototype.legacy.js",
      uploadProgressPath: "/javascripts/vendor/prototype.js",
      timer: ""
    }, c);

    if (Prototype.Browser.WebKit && top.document == document) {
      iframe = document.createElement("iframe");
      iframe.name = "progressFrame";
      $(iframe).setStyle({
        width: "0",
        height: "0",
        position: "absolute",
        top: "-3000px"
      });

      document.body.appendChild(iframe);

      var g = iframe.contentWindow.document;
      g.open();
      g.write("<html><head></head><body></body></html>");
      g.close();

      var a = g.body;
      var f = g.createElement("script");
      f.src = c.prototypePath;
      f.onload = function() {
        var b = g.createElement("script");
        b.src = c.uploadProgressPath;
        a.appendChild(b)
      };
      a.appendChild(f)
    }

    Event.observe(e, "submit", function(event) {
      /*
      var b = "";
      for(i = 0; i < 32; i++) {
        b += Math.floor(Math.random() * 16).toString(16)
      }
      c.uuid = b;
      */

      var email = $('drop_email').setStyle({border: 'normal'});
      var error = $("email_validation_error");
              
      if (!email.readAttribute('readonly')) {
        validateEmail();

        if (error.visible()) {
          $('drop_email').setStyle({border: '1px solid red'});
          event.stop();
          return false;
        }        
      }

      c.start();
      /*
      if (old_id = /X-Progress-ID=([^&]+)/.exec($(this).readAttribute("action"))) {
        var d = $(this).readAttribute("action").replace(old_id[1], b);
        $(this).writeAttribute("action", d)
      } else {
        $(this).writeAttribute("action", $(this).readAttribute("action") + "?X-Progress-ID=" + b)
      }
      
      var h = Prototype.Browser.WebKit ? progressFrame.Prototype.uploadProgress : Prototype.uploadProgress;
      c.timer = window.setInterval(function() {
        h(this, c)
      }, c.interval)
      */
    })

  }
};

Element.addMethods(UploadProgressMethods);

PrototypeUploadProgressMethods = {
  uploadProgress: function(b, a) {
    new Ajax.Request(a.progressUrl, {
      method: "get",
      parameters: "X-Progress-ID=" + a.uuid,
      onSuccess: function(e) {
        var c = e.responseText.evalJSON();
        c.percents = Math.floor((c.received / c.size) * 100);
        if (c.state == "uploading") {
          var d = Prototype.Browser.WebKit ? parent.document.getElementById(a.progressBar) : $(a.progressBar);
          d.setStyle({
            width: Math.floor(c.percents) + "%"
          });
          a.uploading(c)
        }
        if ((c.state == "uploading" && c.received == c.size)) {
          c.state = "done"
        }
        if (c.state == "done" || c.state == "error") {
          window.clearTimeout(a.timer);
          a.complete(c, a.timer)
        }
        if (c.state == "done") {
          a.success(c)
        }
        if (c.state == "error") {
          a.error(c)
        }
      }
    })
  }
};

Object.extend(Prototype, PrototypeUploadProgressMethods);

function echeck(f) {
  var a = "@";
  var b = ".";
  var e = f.indexOf(a);
  var c = f.length;
  var d = f.indexOf(b);
  if ( (f.indexOf(a) == -1)
    || (f.indexOf(a) == -1 || f.indexOf(a) == 0 || f.indexOf(a) == c)
    || (f.indexOf(b) == -1 || f.indexOf(b) == 0 || f.indexOf(b) == c)
    || (f.indexOf(a, (e + 1)) != -1)
    || (f.substring(e - 1, e) == b || f.substring(e + 1, e + 2) == b)
    || (f.indexOf(b, (e + 2)) == -1)
    || (f.indexOf(" ") != -1) ) {
    return false
  }
  return true
}

function validateEmail() {
  var a = $("drop_email");
  var b = $("email_validation_error");

  if ((a.value == null) || (a.value == "")) {
    b.update("Please enter your email.");
    b.show();
    return
  }

  if (echeck(a.value) == false) {
    b.update("This is not a valid email.");
    b.show();
    return
  }

  b.hide();
}

function initializeUploadProgress() {
  var b = "";
  var a;

  $("upload").uploadProgress({
    progressBar: "progressbar",
    start: function() {
      uplStarting();
      $("UploadStatus1").innerHTML = "Uploading..."
    },
    uploading: function(c) {
      $("UploadStatus1").innerHTML = "Uploaded " + c.percents + "%"
    },
    complete: function(c, d) {
      a = d;
      window.clearTimeout(a)
    },
    success: function() {
      $("UploadStatus1").innerHTML = "Processing upload...";
      getProcessingStatus.delay(2)
    },
    error: function(c) {
      window.clearTimeout(a);
      $("upload-status-wrapper").hide();
      if (c.status == "413") {
        $("after-upload-failed").down("p.wrong").hide();
        $("after-upload-failed").down("p.size").show();
        $("upload-finish-message").update('Your Upload is to big! <a href="#" onclick="Dropbox.uploadAgain(); return false;" style="color: #000;">Try with a smaller file</a>');
        Effect.Appear("upload-finish-message");
      } else {
        $("after-upload-failed").down("p.wrong").show();
        $("after-upload-failed").down("p.size").hide();
        $("upload-finish-message").update("");
      }
      $("before-upload").hide();
      Effect.Appear("upload-finish-functions");
      Effect.Appear("after-upload-failed");
    },
    prototypePath: "/javascripts/vendor/prototype.legacy.js",
    uploadProgressPath: "/javascripts/vendor/prototype.js"
  });
}

function getProcessingStatus() {
  new Ajax.Request("/dropbox/processing_status", {
    method: "get",
    onComplete: function(a) {
      evalProcessingStatus(a.responseText.evalJSON())
    },
    on504: function() {
      getProcessingStatus.delay(2)
    }
  })
}

function evalProcessingStatus(b) {
  var a = $H(b);
  if (b == null && !$("confirmation_hint").visible()) {
    getProcessingStatus.delay(3)
  }

  if (a.get("state") == "processing") {
    $("UploadStatus1").innerHTML = a.get("message");
    getProcessingStatus.delay(2)
  }

  if (a.get("state") == "finished") {
    uplFinished("Upload complete")
  }

  if (a.get("state") == "completed") {
    $("confirmation_mail").update(a.get("message"));
    showConfirmHint()
  }

  if (a.get("state") == "email-failed") {
    showEmailFailedNotice()
  }

  if (a.get("state") == "failed") {
    uplFinished(a.get("message"));
    processTimer = "";
    window.clearTimeout(processTimer)
  }
}

function uplFinished(success) {
  $("upload-status-wrapper").hide();
  $("upload-finish-message").innerHTML = "";
  Effect.Appear("upload-finish-message");
  $("before-upload").hide();

  if ($('drop_email').readAttribute('readonly')) {
    Effect.Appear("after-upload-success");
    Dropbox.socket.emit('message', {action: 'notifyNewItem', guid: Dropbox.boxId});
  } else {
    Effect.Appear("after-upload");
  }
}

function uplStarting() {
  $("upload").hide();
  $("upload-finish-message").innerHTML = "";
  $("after-upload-failed").hide();

  $("before-upload").show();

  ["upload-status-wrapper", "upload-status"].each(Element.show);
  /*
  $("content").morph({
    height: "660px"
  });

  $("details_form").morph({
    height: "430px"
  }, {
    afterFinish: function() {
      Engine.isMSIE ? $("details_form").setStyle({
        display: "block"
      }) : $("details_form").appear()
    }
  })
  */
}

function onSetFile() {
  $("submit-button").disabled = false;
  ["options", "keynote-warning"].each(Element.hide);
  if ($("document_file").value.match(/\.zip$/i)) $("options").show();
  ["document_title", "document_title_label"].each(Element.show)
}

function showConfirmHint() {
  ["upload", "details_form", "upload-status"].each(Element.hide);

  $("content").morph({height: "180px"});

  Engine.isMSIE ? $("confirmation_hint").setStyle({
    display: "block"
  }) : $("confirmation_hint").show();

  $("confirmation_hint").morph({opacity: "1"});
}

function showEmailFailedNotice() {
  ["upload", "details_form", "upload-status"].each(Element.hide);

  $("content").morph({height: "180px"});
  $("confirmation-success").hide();
  $("confirmation-failure").show();

  Engine.isMSIE ? $("confirmation_hint").setStyle({
    display: "block"
  }) : $("confirmation_hint").show();

  $("confirmation_hint").morph({opacity: "1"});
}

document.observe("dom:loaded", function() {
  if (!enabledDropbox) return;
  Dropbox.initialize();
  initializeUploadProgress()
});