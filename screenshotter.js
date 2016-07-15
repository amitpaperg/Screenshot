/*
 *  Blipshot
 *  Screenshotter.js
 *  Half of the screenshotter algorithm. See Screenshotter.DOM.js for the other half.
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

var Screenshotter = {
  
  shared: {
    adLeft: 0,
    adTop: 0,
    adInnerHeight: 0,
    adInnerWidth: 0,   
    
    tab: {
      id: 0,
      url: "",
      title: "",
      hasVscrollbar: false
    }
  },
  
  // ****************************************************************************************** SCREENSHOT SEQUENCE START
  
  // 0
  grab: function(e) {
    /****************************************************************************************************
     * It's a chaos: the ball must bounce between background and script content since the first
     * can grab and the second can access the DOM (scroll)
     *
     * So the call stack is:
     *    grab (bg)
     *      screenshotBegin (script)
     *      loop {
     *        screenshotVisibleArea (bg)
     *        screenshotScroll (script)
     *      }
     *      screenshotEnd (bg)
     *      screenshotReturn (script)
     */ 
    var self = this;
    
    // ****** Reset screenshot container
    this.imageDataURLPartial = [];

    console.log("Begining Screenshot capture - BG Task");
    
    // ****** Get tab data
    chrome.windows.getCurrent(function(win) {
      chrome.tabs.getSelected(win.id, function(tab) {
        self.shared.tab = tab;
        
        // ****** Check if everything's is in order.
        var parts = tab.url.match(/https?:\/\/chrome.google.com\/?.*/);
        if (parts !== null) {
          alert("\n\n\nI'm sorry.\n\nDue to security restrictions \non the Google Chrome Store, \nBlipshot can't run here.\n\nTry on any other page. ;)\n\n\n");
          return false;
        }
        
        // ****** Begin!
        chrome.tabs.sendMessage(self.shared.tab.id, { action: 'blanketStyleSet', property: 'position', from: 'fixed', to: 'absolute' });
        self.screenshotBegin(self.shared);
      });
    });
  },
  
  // 1
  screenshotBegin: function(shared) { chrome.tabs.sendMessage(this.shared.tab.id, { action: 'screenshotBegin', shared: shared }); },
  
  // 2
  screenshotVisibleArea: function(shared) {
    var self = this;
    console.log("called screenshot visisble area");
    chrome.tabs.captureVisibleTab(null, { format: "png" /* png, jpeg */, quality: 100 }, function(dataUrl) {
      if (dataUrl) {
        // Grab successful
        var canvas = window.document.createElement('canvas');
        canvas.width = shared.adInnerWidth;
        canvas.height = shared.adInnerHeight;

        var adImage = new Image();
        adImage.src = dataUrl;
        canvas.getContext("2d").drawImage(adImage, shared.adLeft, shared.adTop, shared.adInnerWidth, shared.adInnerHeight, 0, 0, shared.adInnerWidth, shared.adInnerHeight);
        shared.imageDataURL = canvas.toDataURL("image/png");
        self.screenshotReturn(shared);

        UI.status('azure', "make");
        console.log("captured visisble tab");
       
      } else {
        // Grab failed, warning
        // To handle issues like permissions - https://github.com/folletto/Blipshot/issues/9
        alert("\n\n\nI'm sorry.\n\nIt seems Thunder Ad Capture wasn't able to grab the screenshot of the active tab.\n\nPlease check the extension permissions.\n\nIf the problem persists contact me at \nhttp://github.com/folletto/Blipshot/issues\n\n\n");
        return false;
      }
    });
  },

  // 5
  screenshotReturn: function(shared) {
    UI.status('green', "done", 3000);
    chrome.tabs.sendMessage(this.shared.tab.id, { action: 'blanketStyleRestore', property: 'position' });
    chrome.tabs.sendMessage(this.shared.tab.id, { action: 'screenshotReturn', shared: shared });
  },
  
  // ****************************************************************************************** EVENT MANAGER / HALF
  eventManagerInit: function() {
    /****************************************************************************************************
     * This function prepares the internal plugin callbacks to bounce between the plugin and DOM side.
     * It's initialized at the end of this file.
     */
    var self = this;
    chrome.extension.onMessage.addListener(function(e) {
        switch (e.action) {
          case "grab": self.grab(); break;
          case "screenshotVisibleArea": self.screenshotVisibleArea(e.shared); break;
          case "screenshotEnd": self.screenshotEnd(e.shared); break;
        }
    });
  }
}

/* \/ Initialize callback listeners */
Screenshotter.eventManagerInit();
/* /\ Initialize callback listeners */