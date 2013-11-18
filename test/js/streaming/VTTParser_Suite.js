
	describe("VTT Parser", function () {
		var result,vttParserObj,system,context,data;
		beforeEach(function(){
			system = new dijon.System();
			system.mapValue("system", system);
			system.mapOutlet("system");
			context = new Dash.di.DashContext();
			system.injectInto(context);
			vttParserObj = system.getObject('vttParser');
			data = "\r\n10:15-->11:15-->Test Data-->\r\n12:15-->01:15-->Test Data2-->\r\n02:15-->03:15-->Test Data3";			
		});
		
		it("Check Caption size with null input",function(){		
			vttParserObj.parse("").then(function(result){
				expect(result.length).toEqual(0);
			});
		});	
		
		it("Check Caption size with actual input",function(){		
			vttParserObj.parse(data).then(function(result){
				expect(result.length).toEqual(3);
			});
		});
		
		it("Check start time with actual input",function(){		
			vttParserObj.parse(data).then(function(result){
				expect(isNaN(result[0].start)).not.toBeTruthy();
			});
		});
		
		it("Check end time with actual input",function(){		
			vttParserObj.parse(data).then(function(result){
				expect(isNaN(result[0].end)).not.toBeTruthy();
			});
		});
		
		it("Check end time with actual input",function(){		
			vttParserObj.parse(data).then(function(result){
				expect(result[0].data).toContain("Test Data");
			});
		});
		
	});
