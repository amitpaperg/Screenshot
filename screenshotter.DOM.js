/*
 *  Blipshot
 *  Screenshotter.DOM.js
 *  Half of the screenshotter algorithm. See Screenshotter.js for the other half.
 *
 *  ==========================================================================================
 *  
 *  Copyright (c) 2010-2012, Davide Casali.
 *  All rights reserved.
 *  
 *  Redistribution and use in source and binary forms, with or without modification, are 
 *  permitted provided that the following conditions are met:
 *  
 *  Redistributions of source code must retain the above copyright notice, this list of 
 *  conditions and the following disclaimer.
 *  Redistributions in binary form must reproduce the above copyright notice, this list of 
 *  conditions and the following disclaimer in the documentation and/or other materials 
 *  provided with the distribution.
 *  Neither the name of the Baker Framework nor the names of its contributors may be used to 
 *  endorse or promote products derived from this software without specific prior written 
 *  permission.
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES 
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT 
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, 
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, 
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 *  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT 
 *  LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 *  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

(function() {
  
  var shared = {};
  var totalAds = 0;
  var curAdIndex = 0;
  var curAds;
  
  // ****************************************************************************************** SCREENSHOT SEQUENCE
  function screenshotPrep(shared) {
    // do we have any ads on the page?
    curAds = $(".creative-ad");
    totalAds = 0;
    if (curAds[0]) {
      // reset globals
      totalAds = $(".creative-ad").length;
      curAdIndex = 0;
      shared.lastAdCapture = false;

      // add a capture div wrapper
      $(document.body).append('<div id="ad-capture-wrapper" style="position: absolute; height: ' + window.document.body.scrollHeight + 'px; width: 100%; top: 0px; left: 0px; background: #fff; z-index: 566666;"><div id="ad-capture-container" style="margin-top:50px; margin-left:10px"></div></div>');
    } else {
      alert("A visisble Ad was not found. Go to All Sizes View and make sure list view is ON");
    }
  }

  // 1
  function screenshotBegin(shared) {
    console.log("Begin Screenshotting Ads- index:"+curAdIndex);

    // display the ad to capture
    $("#ad-capture-container").html($(curAds[curAdIndex]).html());
        
    // save co-ordinates of visible ad
    shared.adLeft = $("#ad-capture-container").offset().left;
    shared.adTop = $("#ad-capture-container").offset().top;
    shared.adInnerHeight = $(curAds[curAdIndex]).innerHeight(); 
    shared.adInnerWidth = $(curAds[curAdIndex]).innerWidth();

    // increment index for next round
    curAdIndex = curAdIndex+1;
    shared.lastAdCapture = (curAdIndex >= totalAds);

    // screenshot the ad
    setTimeout(function() { screenshotVisibleArea(shared); }, 100);
  }
  
  // 2
  function screenshotVisibleArea(shared) {
    chrome.extension.sendMessage({ action: 'screenshotVisibleArea', shared: shared });
  }
 
  // 5
  function screenshotReturn(shared) {
    function pad2(str) { if ((str + "").length == 1) return "0" + str; return "" + str; }

    var zip = new JSZip();
    zip.file("Hello.txt", "Hello World\n");
    //var content;
    var filename;
    for (var i=0; i<shared.imageDataURLs.length; i++) {
      var d = new Date();
      var timestamp = '' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDay()) + '-' + pad2(d.getHours()) + '' + pad2(d.getMinutes()) + '';
      filename = "pageshot of '" + normalizeFileName(shared.tab.title) + "' @ " + timestamp;
      var blob = dataURItoBlob(shared.imageDataURLs[i]);

      zip.file("foo-"+i+'.png', blob, {base64: true});
    }

    // generate zip file
    zip.generateAsync({type:"base64"})
    .then(function(content) {
        // see FileSaver.js
        $("#ad-capture-container").append("<a href='data:application/zip;base64,"+content+"'>Download ZipFile</a>")
    });
    
    
    /*
    // ****** Add DOM Elements to Page
    var div = window.document.createElement('div');
    div.id = "blipshot";
    div.innerHTML = '<div id="blipshot-dim" style="position: absolute !important; height: ' + window.document.body.scrollHeight + 'px !important; width: 100% !important; top: 0px !important; left: 0px !important; background: #000000 !important; opacity: 0.66 !important; z-index: 666666 !important;"> </div>';
    div.innerHTML += '<p style="margin: 20px; position: absolute; top: 35px; right: 0; z-index: 666667 !important;"><img id="blipshot-img" alt="' + filename + '" src="' +  blobURL + '" max-width= "400" /></p>';
    window.document.body.appendChild(div);
    */
    /*
    // ****** Add Event Listeners
    function actionRemoveDiv() {
      // Closes the extension overlays.
      var blipshotdiv = window.document.getElementById('blipshot');
      if (blipshotdiv) blipshotdiv.parentElement.removeChild(blipshotdiv);
      
      // Cleanup
      window.webkitURL.revokeObjectURL(blobURL);
    }
    function actionDrag(e) {
      e.dataTransfer.setData("DownloadURL", "image/png:" + filename + ".png:" + blobURL);
    }
    */
    //window.document.getElementById('blipshot-dim').addEventListener("click", actionRemoveDiv);
    //window.document.getElementById('blipshot-img').addEventListener("dragstart", actionDrag);
  }
  
  // ****************************************************************************************** EVENT MANAGER / HALF
  function eventManagerInit() {
    /****************************************************************************************************
     * This function prepares the internal plugin callbacks to bounce between the plugin and DOM side.
     * It's initialized right after declaration.
     */
    var self = this;
    chrome.extension.onMessage.addListener(function(e) {
        switch (e.action) {
          case "screenshotPrep": screenshotPrep(e.shared); break;
          case "screenshotBegin": screenshotBegin(e.shared); break;
          case "screenshotReturn": screenshotReturn(e.shared); break;
        }
    });
  }
  eventManagerInit(); // Init
  
  // ****************************************************************************************** SUPPORT
  function dataToBlobURL(dataURL) {
    /****************************************************************************************************
     * Converts a data:// URL (i.e. `canvas.toDataURL("image/png")`) to a blob:// URL.
     * This allows a shorter URL and a simple management of big data objects.
     * 
     * Contributor: Ben Ellis <https://github.com/ble>
     */
    var parts = dataURL.match(/data:([^;]*)(;base64)?,([0-9A-Za-z+/]+)/);
    
    // Assume base64 encoding
    var binStr = atob(parts[3]);
    
    // Convert to binary in ArrayBuffer
    var buf = new ArrayBuffer(binStr.length);
    var view = new Uint8Array(buf);
    for(var i = 0; i < view.length; i++)
      view[i] = binStr.charCodeAt(i);

    // Create blob with mime type, create URL for it
    var blob = new Blob([view], {'type': parts[1]});
    var URL = webkitURL.createObjectURL(blob);
    
    return URL;
  }

  function dataURItoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}
  
  function normalizeFileName(string) {
    out = string;
    //out = out.replace(/"/, '\''); // To avoid collision with DOM attribute
    //out = out.replace(/\/\?<>\\:\*\|/, '-'); // Windows safe
    out = out.replace(/[^a-zA-Z0-9_\-+,;'!?$£@&%()\[\]=]/g, " ").replace(/ +/g, " "); // Hard replace
    return out;
  }
})();
