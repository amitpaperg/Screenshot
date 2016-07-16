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
  function screenshotBegin(shared) {
    // do we have any ads on the page?
    curAds = $(".creative-ad");
    totalAds = 0;
    if (curAds[0]) {
      // reset globals
      totalAds = $(".creative-ad").length;
      $("#ad-capture-wrapper").remove();
      curAdIndex = 0;
      shared.imageDataURLs = [];
      shared.lastAdCapture = false;

      // add a capture div wrapper
      $(document.body).append('\
      <div id="ad-capture-wrapper" style="height: ' + window.document.body.scrollHeight + 'px">\
        <div id="ad-capture-header">\
            Capturing Screenshot of Ads - <span id="ad-capture-num">1</span> of '+totalAds+'.\
          </div>\
        <div id="ad-capture-container"></div>\
      </div>');

      // start screenshot of ads
      screenshotNextAd(shared);
    } else {
      alert("I'm sorry. A visisble Ad was not found. Make sure you are on Thunder Creative Management Platform. Open the Ad Editor. Then, go to All Sizes View and make sure list view is ON");
    }
  }

  // 1
  function screenshotNextAd(shared) {
    // display the ad to capture
    $("#ad-capture-container").html($(curAds[curAdIndex]).html());
        
    // save co-ordinates of visible ad
    shared.adLeft = $("#ad-capture-container").offset().left * window.devicePixelRatio;
    shared.adTop = $("#ad-capture-container").offset().top * window.devicePixelRatio;
    shared.adInnerHeight = $("#ad-capture-container").innerHeight() * window.devicePixelRatio; 
    shared.adInnerWidth = $("#ad-capture-container").innerWidth() * window.devicePixelRatio;

    // increment index for next round
    curAdIndex = curAdIndex+1;
    $("#ad-capture-num").text(curAdIndex);
    shared.lastAdCapture = (curAdIndex >= totalAds);

    // screenshot the ad
    setTimeout(function() { screenshotVisibleArea(shared); }, 200);
  }
  
  // 2
  function screenshotVisibleArea(shared) {
    chrome.extension.sendMessage({ action: 'screenshotVisibleArea', shared: shared });
  }
 
  // 5
  function screenshotReturn(shared) {
    function pad2(str) { if ((str + "").length == 1) return "0" + str; return "" + str; }

    var zip = new JSZip();
    var campaignName = $(".topbar-title").text();
    var filename;
    for (var i=0; i<shared.imageDataURLs.length; i++) {
      var blob = dataURItoBlob(shared.imageDataURLs[i]);
      shared.imageDataURLs[i] = null;
      // TODO - list of ad sizes in file names
      zip.file(campaignName+"-"+(i+1)+'.png', blob, {base64: true});
    }
    
    // free up image data urls
    shared.imageDataURLs = [];

    // generate zip file
    zip.generateAsync({type:"base64"})
    .then(function(content) {
        // 
        $("#ad-capture-header").html("Capture Screenshots of Ads - COMPLETE");
        // see FileSaver.js
        $("#ad-capture-container").html("\
        <div class='ad-capture-btn btn-close'>Close</div>\
        <div class='ad-capture-btn btn-primary'>\
          <a href='data:application/zip;base64,"+content+"'>Download ZipFile</a>\
        </div>");

        $(".btn-close").click(function(){
          $("#ad-capture-wrapper").remove();
        });
    });
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
          case "screenshotBegin": screenshotBegin(e.shared); break;
          case "screenshotNextAd": screenshotNextAd(e.shared); break;
          case "screenshotReturn": screenshotReturn(e.shared); break;
        }
    });
  }
  eventManagerInit(); // Init
  
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
