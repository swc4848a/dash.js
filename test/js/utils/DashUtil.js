// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
// Copyright (c) 2013, Microsoft Open Technologies, Inc.
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

var element, player, video, stream, system, context, mpd, counter, seekCounter, count, tdID, stalled, isPaused, isSeeking, chkTimeout, currentDate, intervalID, refreshId, testMode, testModeList, csvContent, playbackCounter, RowElems, runTestFlag, lastTime, endCheckCount, testPhaseDuration, lastTimeDuplicate,isIE;
$(document).ready(function testLoad() {

	csvContent = 'data:text/csv;charset=utf-8,';
	document.getElementById('files').addEventListener('change', handleFileSelect, false);

	var isChrome = !!window.chrome;
	var isIE = false || document.documentMode;
	if (isIE) {
		document.getElementById('txtfileUploader').style.visibility = "visible";
		document.getElementById('btnImport').style.visibility = "visible";
	} else if (isChrome) {
		document.getElementById('files').style.visibility = "visible";
	} else {}

	testModeList = document.getElementById('myList');
	testMode = testModeList.options[testModeList.selectedIndex].text;
	runTestFlag = false;
	counter = 0;
	intervalID = 0;
	mpd = new Array();
	mpd = setMPD(mpd);
	RowElems = $('#tbMPD tbody tr').clone();
	Rows = $(RowElems).clone();

	createRowsForMPD();
	initialisation(0);
});

/**Create dynamic rows for table*/
function createRowsForMPD() {

	for (var i = Rows.length; i < mpd.length; i++) {
		createRow(i);
	}
}

function createRow(i) {
	var RowItem = Rows.eq(0);
	RowItem.attr('id', i);
	RowItem.find('td').eq(1).attr('id', 'VideoPlayer' + i);
	RowItem.find('td').eq(0).text('MPD' + (i + 1));
	RowItem.find('td:nth-child(2) div:nth-child(1)').attr('id', 'Video' + i);
	RowItem.find('td:nth-child(2) div:nth-child(1)').attr('class', 'ClassVideo' + i);
	RowItem.find('td:nth-child(2) div:nth-child(2)').attr('id', 'MPDUrl' + i);
	RowItem.find('td:nth-child(2) div:nth-child(2)').attr('value', mpd[i]);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(1)').attr('id', 'play' + i);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(1)').attr('value', '');
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(1)').html("");
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(2)').attr('id', 'pause' + i);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(2)').attr('value', '');
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(2)').html("");
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(3)').attr('id', 'seek' + i);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(3)').attr('value', '');
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(3)').html("");
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(4)').attr('id', 'stall' + i);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(4)').attr('value', '');
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(4)').html("");
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(5)').attr('id', 'error' + i);
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(5)').attr('value', '');
	RowItem.find('td:nth-child(2) div:nth-child(3) div:nth-child(5)').html("");
	RowItem.find('td:nth-child(3) input').eq(0).attr('id', 'RunTest' + i);
	RowItem.find('td:nth-child(3) input').eq(0).text("Run Test");
	RowItem.find('td:nth-child(3) input').eq(1).attr('id', "Delete" + i);
	RowItem.find('td:nth-child(3) input').eq(1).text("Delete");

	RowItem.find('td:nth-child(3) div:nth-child(1) input[type="button"]').removeAttr("onclick").click(function (e) {
		runTest(this.id);
	});

	RowItem.find('td:nth-child(3) div:nth-child(2) input[type="button"]').removeAttr("onclick").click(function (e) {
		deleteRow(this.id);
	});

	RowItem.appendTo('#tbMPD tbody');
	Rows = $(RowElems).clone();
	$('#ClassVideo' + i).hide();

	$('#Video' + i).hide();
	$('#MPDUrl' + i).html(mpd[i]);
}

function teardown() {
	if (!!player) {
		$('#MPDUrl' + counter).text($('#MPDUrl' + counter).text() + "\n Duration: " + (element).duration);
		
		if (stalled === true) {
			$('#stall' + counter).html('Video was stalled');
		} else {
			$('#stall' + counter).html('Video was not stalled');
		}

		$('#Video'+counter).hide();
		$('#Video' + counter).children().eq(0).remove();

		player.reset();
		player = null;
	}

	seekCounter = 0;
	endCheckCount = 0;
	playbackCounter = 0;
	lastTimeDuplicate = 0;
	count = 0;
	lastTime = 0;
	stalled = false;
	isPaused = false;
	isSeeking = false;
}

/** Initialise the variables*/
function initialisation(rowID) {
	teardown();
	$('#Video' + rowID).show();

	system = new dijon.System();
	system.mapValue('system', system);
	system.mapOutlet('system');
	context = new Dash.di.DashContext();
	system.injectInto(context);
	element = document.createElement('video');

	var videoDiv = document.querySelector('.ClassVideo' + (rowID));
	videoDiv.appendChild(element);
	if (counter != rowID) {
		$('#ClassVideo' + rowID).show();
		$('#Video' + rowID).show();
		$('#play' + rowID).html("");
		$('#seek' + rowID).html("");
		$('#stall' + rowID).html("");
		$('#pause' + rowID).html("");
	} else {
		if ($('#Video' + rowID).children().length > 1) {
			$('#Video' + rowID).children().eq(0).remove();
			$('#play' + rowID).html("");
			$('#seek' + rowID).html("");
			$('#stall' + rowID).html("");
			$('#pause' + rowID).html("");
		}
		if (counter == rowID) {
			$('#Video' + (rowID - 1)).remove();
			if ($('#Video' + rowID).children().length > 1) {
				$('#Video' + rowID).children().eq(0).remove();
				$('#play' + rowID).html("");
				$('#seek' + rowID).html("");
				$('#stall' + rowID).html("");
				$('#pause' + rowID).html("");
			}

		}

	}

	counter = rowID;

	$(element).css('width', '100%');
	$(element).css('height', '100%');

	video = system.getObject('videoModel');
	video.setElement($(element)[0]);
	stream = system.getObject('stream');

	try {

		player = new MediaPlayer(context);
		player.startup();

		var mpdID = '#MPDUrl' + rowID,
			onError = function (e) {
				var message = "null";
				if (e) {
					message = "source=" + e.error;
					if (e.event.hasOwnProperty("id")) {
						message += ", id=" + e.event.id;
					}
					if (e.event.hasOwnProperty("request")) {
						message += ", status=" + e.event.request.status;
					}
					if (e.event.hasOwnProperty("message")) {
						message += ", " + e.event.message;
					}
					if (typeof e.event === "string") {
						message += ", " + e.event;
					}
				}
				$("error"+rowID).text("Error: " + message);
			};

		$(mpdID).text(mpd[rowID]);

		player.addEventListener("error", onError.bind(this));

		player.autoPlay = true;
		player.attachView(element);
		player.attachSource(mpd[rowID]);

		intervalID = setInterval(time, 1000);

	} catch (err) {
		tdID = "#play" + counter;
		$(tdID).html(err.message);
	}

}

/** Onclick of RunTest button*/
function runTest(id) {
	runTestFlag = true;
	$('#Video'+counter).hide();
	$('#' + id).live('click', function () {
		initialisation($(this).closest('tr').attr('id'));
	});
}

/** Onclick of delete button*/
function deleteRow(id) {
	var rowID;
	$('#' + id).live('click', function () {
		$(this).closest('tr').remove();
		mpd[rowID] = null;
	});

}

/** Load the next MPD in MPDList.js*/
function loadNextMPD() {
	clearInterval(intervalID);
	teardown();
	if (runTestFlag === false) {
		var prevRow = $('#' + counter);
		var intCounter = parseInt(counter);
		if ((intCounter + 1) != mpd.length) {
			var nextRowID = prevRow.next().attr('id');
			initialisation(nextRowID);
		}
		if ((intCounter + 1) === mpd.length) {
			$('#Video'+counter).remove();
			document.getElementById('btnExportToJSON').disabled = false;
			return;
		}
	}
}
/** Capture the test run results*/
function time() {
	if (!player) {
		return;
	}
	try {
		tdID = '#play' + counter;
		$(tdID).html('Playing video at ' + (element).currentTime);

		tdID = '#stall' + counter;
		if (video.isStalled && !isSeeking && !isPaused && count > 0) {
			stalled = true;
			$(tdID).html('Video is stalled');
		} else {
			$(tdID).html('');
		}

		if ((element).ended) {
			tdID = '#play' + counter;
			$(tdID).html('Play event success, at: ' + (element).currentTime);
			loadNextMPD();
			return;
		}

		if (testMode == 'Automation') {

			(element).removeAttribute('controls');
			testPhaseDuration = Math.min((element).duration / 4, 10);

			if (count == 0 && !isPaused && (element).currentTime >= testPhaseDuration) {
				(element).pause();
				isPaused = true;
			}
			else if (count == 1 && !isSeeking) {
				(element).currentTime = (element).duration - (testPhaseDuration * 2);
				isSeeking = true;
			}
			else {
				if (isPaused) {
					isPaused = false;
					count++;
					tdID = '#pause' + counter;
					if ((element).paused) {
						$(tdID).html('Paused event success, at: ' + (element).currentTime);
					} else {
						$(tdID).html('Paused event failed, at: ' + (element).currentTime);
					}
					(element).play();
				}
				if (isSeeking) {
					tdID = '#seek' + counter;
					count++;
					if ((element).seeking) {
						$(tdID).html('Seeking event called');
					}
					checkSeek();
				}
			}
		} else {
			if ((element).paused) {
				tdID = '#pause' + counter;
				$(tdID).html('Paused event success, at: ' + (element).currentTime);
			} else if ((element).seeking) {
				tdID = '#seek' + counter;
				$(tdID).html('Seek event success, at: ' + (element).currentTime);
			} else if ((element).error) {
				//do something
			} else {
				//do something
			}
		}
		checkPlayBackRate();
		lastTime = (element).currentTime;
	} catch (err) {
		//(err.message);
	}
}

/** Check if seek is working*/
function checkSeek() {
	tdID = '#seek' + counter;
	if ((element).duration - (element).currentTime < (testPhaseDuration * 1.5)) {
		$(tdID).html('Seeking event success, at: ' + (element).currentTime);
		isSeeking = false;
	}
}

/** Check if video is playing*/
function checkPlayBackRate() {

	if (lastTime === (element).currentTime) {
		if (playbackCounter === 0) {
			lastTimeDuplicate = lastTime;
		}
		playbackCounter++;
		if (lastTimeDuplicate === lastTime) {
			if (playbackCounter > 30) {
				playbackCounter = 0;
				$("#play" + counter).html("Play event timed out beyond 30 seconds, play stopped: " + (element).currentTime);
				loadNextMPD();
				return;
			}
		} else {
			playbackCounter = 0;
		}
	} else {
		playbackCounter = 0;
	}
}

function stopTest() {
	(element).pause();
	clearInterval(intervalID);
}

function resumeTest() {
	(element).play();
	intervalID = setInterval(time, 1000);
}

function clearTest(){

}
function appendLogMsg(tableDivId) {
	var msg = $(tableDivId).html();
	if (msg.trim().length != 0)
		csvContent += msg + ' \n';
}

/** Add MPD to the table*/
function addMPD() {

	loadPopupBox();

	$('#popupBoxClose').click(function () {
		unloadPopupBox();
	});

	$('#container').click(function () {
		unloadPopupBox();
	});

}

function unloadPopupBox() {
	$('#popup_box').fadeOut("very fast");

}

function loadPopupBox() {
	$('#popup_box').fadeIn("fast");
	document.getElementById('AddMPDTextArea').setAttribute("value", "");
	$('#AddMPDTextArea').val("");
	$('#successMsg').html("");
}

function addMPDData() {
	var textArea = document.getElementById("AddMPDTextArea").value;
	mpd.push(textArea);
	try {
		createRow(mpd.length - 1);
		$('#successMsg').html("MPD successfully added!");
	} catch (err) {
		$('#successMsg').html("Error adding MPD");
	}
}

/** Export data to file*/
function exportToJSON() {
	var blob = new Blob([JSON.stringify(mpd)], {
			type : "text/plain;charset=utf-8"
		});
	saveAs(blob, "DashLog.json");
}

/** Import file data */
function importToTable(contents) {
	//For IE
	if (!!window.MSStream) {
		var filePath = document.getElementById('txtfileUploader').value;
		if (filePath == null || filePath === "Enter the path here" || filePath === "") {
			alert('Please enter a valid path');
		} else {
			contentXML = readFileInIE(filePath);
		}
	}
	//For Chrome
	else {
		contentXML = (new DOMParser()).parseFromString(contents, "text/xml");
	}
	populateTable(contentXML);	
}

function readFileInIE(filename) {
	try {
		var fso = new ActiveXObject("Scripting.FileSystemObject");
		var fh = fso.OpenTextFile(filename, 1, true, false);
		var contents = fh.ReadAll();
		fh.Close();		
		contents=contents.substr(3);
        var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(contents);
        return xmlDoc;
	} catch (exception) {
		return exception.message;
	}
}

function handleFileSelect(evt) {
	var contents,
	jsonString;
	var files = evt.target.files;

	var reader = new FileReader();
	reader.onload = (function (theFile) {
		return function (e) {
			importToTable(e.target.result); 
		};
	})(files[0]);
	reader.readAsText(files[0]);
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}
/** Populate table wit imported contents */
function populateTable(contentXML) {
	var mpdTable = document.getElementById('tbMPD');
	var mpdRows = mpdTable.getElementsByTagName('tr');
	for (var i = 1; i = mpdRows.length - 1; i++) {
		mpdTable.deleteRow(i);
	}
	var contentTag = contentXML.getElementsByTagName("content");
	for (var rowId = 0; rowId < contentTag.length; rowId++) {		
		if (!!window.MSStream)
			mpd[rowId] = contentTag[rowId].childNodes[1].text;
		else
			mpd[rowId] = contentTag[rowId].children[1].innerHTML;
		
		createRow(rowId);
if (!!window.MSStream)
		$('#MPDUrl' + rowId).html(contentTag[rowId].childNodes[1].text);
	else		
		$('#MPDUrl' + rowId).html(contentTag[rowId].children[1].innerHTML);
		$('#play' + rowId).html("");
		$('#pause' + rowId).html("");
		$('#seek' + rowId).html("");
		$('#stall' + rowId).html("");
	}
	$('#MPDUrl0').show();
	$('#play0').show();
	$('#pause0').show();
	$('#seek0').show();
	$('#stall0').show();

	initialisation(0);
}

function textClick() {
	document.getElementById('txtfileUploader').value = "";
}

/** Error logging*/
function logging() {
debugger;
	for (var i = 0; i < mpd.length; i++) {
		csvContent += '=================================================================================';
		csvContent += 'Info';
		csvContent += '=================================================================================';
		csvContent += '\nURL: ' + mpd[i] + '\n';
		tdID = '#MPD' + i + '\n';
		csvContent += 'Status Description: ';
		appendLogMsg('#play' + i);
		appendLogMsg('#pause' + i);
		appendLogMsg('#seek' + i);
		appendLogMsg('#stall' + i);
	}
	csvContent += '====================================================================================';
	csvContent += '====================================================================================';
	var blob = new Blob([csvContent], {
			type : "text/plain;charset=utf-8"
		});
	saveAs(blob, "DashLog.txt");
}

function appendLogMsg(tableDivId) {
	var msg = $(tableDivId).html();
	if (msg.trim().length != 0)
		csvContent += msg + ' \n';
}