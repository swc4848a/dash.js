// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc.
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

//This file contains valid MPD strings


	var testUrl,testBaseUrl,parser,manifestRes,server,context,isActual = true;
	var mock,fakeServer;
	var invalidSource="http://127.0.0.1:3000/test/js/utils/hostedFiles/Manifestg.mpd";


	testUrl = "http://sampleurl/test.mpd";
	testBaseUrl = "http://sampleurl/";
	testVideoUrl = "http://sampleurl/mp4-main-multi-h264bl_low-1.m4s";
 
	setTimeout(initialize,10);

	
	function  Isloaded()
	{
		if(isActual)
		{
			//This funciton makes actual call with live url once
			ActualRequest();
			isActual = false;
		}
	}
 
 
	//Function to get response from live url
	//Assigns the live response to fake server with appropriate urls
	function ActualRequest()
	{
		//Base url to get the manifest data
		var source="http://dashdemo.edgesuite.net/envivio/dashpr/clear/Manifest.mpd";
		
		//Segment url from different mpd - will be changed later when we get a sample mpd with segment url and mpd size being small
		var segmentSource = "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-h264bl_low-1.m4s";
		
		var reqStatus,segStatus;
		
		//Two request calls one for manifest content and other for Segment content
		reqStatus = callRequest(source);
		segStatus = callRequest(segmentSource);
		
		if(reqStatus)
		{
			//assigns the stub url which will be referred in all the test methods and it will be through fake server
			reqStatus.url = testUrl;
			//assigns the stub segment url
			segStatus.url=testVideoUrl;
			
			//Creates a fake server and assigns urls and responses.
			fakeServer = sinon.fakeServer.create();
			fakeServer.autoRespond = true;
			//fakeServer.fakeHTTPMethods = true;
			
			//manifest stub url and response assigned to fake server
			fakeServer.respondWith(reqStatus.url,reqStatus.responseText);
			
			if(segStatus)
			{
				//segment stub url and response assigned to fake server
				fakeServer.respondWith(segStatus.url,segStatus.response);
			}
			fakeServer.respond();
		}
		
		
		//Parser class is called to create the parser objects
		//Urls and baseUrls assigned are stub urls.
		//Globally assigned to be used in all the test methods		
		var parser = system.getObject("parser");
		parser.parse(reqStatus.responseText, testBaseUrl).then(
		function (manifest) {
			manifest.mpdUrl = testUrl;					
			
			//Contructs a Adaptation set with above segment url
			//Segment Url appends with base url and testVideoUrl is generated 			
			var objSubSegmentList=[],objSubSegmentUrl=[],objSegmentUrl=[],objSegmentList=[];
			objSubSegmentUrl.media="mp4-main-multi-h264bl_low-1.m4s";
			objSegmentUrl.push(objSubSegmentUrl);
			
			objSubSegmentList.timescale="1000";
			objSubSegmentList.duration="10000";
			objSubSegmentList.SegmentURL=objSegmentUrl;
			objSegmentList.push(objSubSegmentList);
			
			var objRepresentation=[];
            var objSubRepresentation=[];
			objSubRepresentation.id="3";
			objSubRepresentation.codec="avc1.4d401f";
			objSubRepresentation.mimeType="text/vtt";
			objSubRepresentation.width="480";
			objSubRepresentation.height="360";
			objSubRepresentation.startWithSAP="1";
			objSubRepresentation.bandwidth="178351";
			objSubRepresentation.SegmentList=objSegmentList;
			objSubRepresentation.SegmentList_asArray=objSegmentList;
			objRepresentation.push(objSubRepresentation);
			
			var objAdap={};
			objAdap.segmentAlignment="true";
			objAdap.maxWidth="1920";
			objAdap.maxHeight="1080";
			objAdap.maxFrameRate="25";
			objAdap.par="16:9";
			objAdap.Representation=objRepresentation;
			objAdap.Representation_asArray = objRepresentation;	
            manifest.Period.AdaptationSet.push(objAdap);
			
			manifestRes = manifest;	
		});
	 }
	 
	 
	//Method to make call to live server
	function callRequest(url) {
        var xmlhr;

        if (window.XMLHttpRequest) {
            xmlhr = new XMLHttpRequest();
        } else {
            xmlhr = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhr.open("GET", url, false);
        xmlhr.send();
		return xmlhr;
    }
	 
 function initialize()
 {
    if(window.location.href.indexOf("runner.html")>0){
        system = new dijon.System();
        system.mapValue("system", system); 
        system.mapOutlet("system");
        context = new Dash.di.DashContext();
        system.injectInto(context);
        objManifestLoader=system.getObject('manifestLoader');
        Isloaded();
    }
     else
    {
		baseUrl="http://127.0.0.1:3000/test/js/utils/hostedFiles/";
		source= "http://127.0.0.1:3000/test/js/utils/hostedFiles/Manifest.mpd";
		audioUrl="http://127.0.0.1:3000/test/js/utils/hostedFiles/1.m4s";
    }
 }
 
 