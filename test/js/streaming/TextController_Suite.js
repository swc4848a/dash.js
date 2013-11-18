
	describe("Text Controller Suite",function(){
		var textController,baseUrl,system,context,manifestExt,data={},flag=false, streams,text,result,periodIndex,buffer,manifestObj,element,video;
		
        beforeEach(function(){
			debugger;
            baseUrl = testBaseUrl;
            system = new dijon.System();
            system.mapValue("system", system);
            system.mapOutlet("system");
			
			periodIndex = 0;
            context = new Dash.di.DashContext();
            system.injectInto(context);
            manifestExt = system.getObject("manifestExt");

			textController = system.getObject("textController");

        });		
		
		it("Get Text Data",function(){
			debugger;
			runs(function(){
				debugger;
				manifestExt.getTextData(manifestRes	,periodIndex).then(function(data)
				{
					debugger;
					expect(data).not.toBe(null);
				});
			});
			
		});
		
		it("Get Text Data Index",function(){	
			runs(function(){
				manifestExt.getTextData(manifestRes,periodIndex).then(function(data)
				{
					manifestExt.getDataIndex(data, manifestRes, periodIndex).then(
					function (index) {
						expect(index).toEqual(2);
					});
				});
			});
		});
		
		it("Get Text Data Mime Type",function(){
			runs(function(){				
				manifestExt.getTextData(manifestRes,periodIndex).then(function(data)
				{
					manifestExt.getMimeType(data).then(
					function (type) {
						expect(type).toContain("text");
					});
				});
			});
		});
		
		it("Create Source Buffer for Text Data",function(){
			var sourceBufferExt,mimeType = "application/mp4";
			sourceBufferExt = system.getObject("sourceBufferExt");
			
			var mediaSource = jasmine.createSpyObj('mediaSource', ['addSourceBuffer']),
			 flag = false,
			success = function(result) {
				 flag = true;
			 },
			 failure = function(error) {
				flag = true;
			 };
			 
			runs(function(){	
				promise = sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
				promise.then(success, failure);
			});
			waitsFor(function(){
				return flag;
			});
			
			runs(function(){
				expect(mediaSource.addSourceBuffer).toHaveBeenCalledWith(mimeType);
			});
		});
		
		it("Attach Buffer for Text Data",function(){
			var sourceBufferExt,mediaSourceExt,mediaSource,codec = "stpp";
			sourceBufferExt = system.getObject("sourceBufferExt");
			mediaSourceExt = system.getObject("mediaSourceExt");
			
			mediaSourceExt.createMediaSource().then(
                function (mediaSourceResult) {
					mediaSource = mediaSourceResult;
					mediaSourceExt.attachMediaSource(mediaSource, video);
					sourceBufferExt.createSourceBuffer(mediaSource, codec).then(function(bufferResult)
					{
						buffer = bufferResult;
						expect(bufferResult.hasOwnProperty('initialize')).toBeTruthy();
					});
				});	
		});
		
		function initStreamData(manifestResult)
		{		

			if (manifestResult.mpdUrl != undefined)
			{		
				streams.setVideoModel(video);	
				streams.load(manifestResult,periodIndex);	
				return streams;
			}
			return streams;		
		}		
	});
