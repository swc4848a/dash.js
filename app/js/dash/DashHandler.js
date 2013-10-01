/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
Dash.dependencies.DashHandler = function () {
    "use strict";

    var index = -1,
        isDynamic,
        type,

        replaceNumberForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Number$").join(v);
        },

        replaceTimeForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Time$").join(v);
        },

        replaceBandwidthForTemplate = function (url, value) {
            var v = value.toString();
            return url.split("$Bandwidth$").join(v);
        },

        replaceIDForTemplate = function (url, value) {
            if (value === null || url.indexOf("$RepresentationID$") === -1) { return url; }
            var v = value.toString();
            return url.split("$RepresentationID$").join(v);
        },

        getRequestUrl = function (destination, baseURL) {
            var url;

            if (destination === baseURL) {
                url = destination;
            } else if (destination.indexOf("http://") !== -1) {
                url = destination;
            } else {
                url = baseURL + destination;
            }

            return url;
        },

        getInit = function (representation) {
            var deferred = Q.defer(),
                request = null,
                initialization = null,
                url = null,
                range = null,
                self = this;

            self.debug.log("Getting the initialization request.");

            if (representation.segmentInfo.hasOwnProperty("media")) {
                if (representation.segmentInfo.hasOwnProperty("initialization")) {
                    initialization = representation.segmentInfo.initialization;
                    initialization = replaceBandwidthForTemplate(initialization, representation.bandwidth);
                    initialization = replaceIDForTemplate(initialization, representation.id);
                }
            } else if (representation.segmentInfo.hasOwnProperty("SegmentURL") &&
                       representation.segmentInfo.hasOwnProperty("Initialization") &&
                       representation.segmentInfo.Initialization.hasOwnProperty("sourceURL")) {
                initialization = representation.segmentInfo.Initialization.sourceURL;
            } else if (representation.segmentInfo.hasOwnProperty("Initialization") &&
                       representation.segmentInfo.Initialization.hasOwnProperty("range")) {
                initialization = representation.BaseURL;
                range = representation.segmentInfo.Initialization.range;
            } else if (representation.mimeType &&
                       self.manifestExt.getIsTextTrack(representation.mimeType)) {
                initialization = representation.BaseURL;
                range = 0;
            } else {
                // Go out and find the initialization.
                url = representation.BaseURL;
                self.baseURLExt.loadInitialization(url).then(
                    function (theRange) {
                        self.debug.log("Got an initialization.");
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.streamType = type;
                        request.type = "Initialization Segment";
                        request.url = getRequestUrl(url, representation.BaseURL);
                        request.range = theRange;
                        deferred.resolve(request);
                    },
                    function () {
                        //alert("Error loading initialization.");
                        self.errHandler.downloadError("Error loading initialization.");
                    }
                );
            }

            if (initialization && initialization.length > 0) {
                self.debug.log("Got an initialization.");
                request = new MediaPlayer.vo.SegmentRequest();
                request.streamType = type;
                request.type = "Initialization Segment";
                request.url = getRequestUrl(initialization, representation.BaseURL);
                request.range = range;
                deferred.resolve(request);
            }

            return deferred.promise;
        },

        isMediaFinished = function (representation) { // TODO
            var fDuration,
                fTimescale,
                fLength,
                sDuration,
                startNumber,
                idx,
                isFinished = false;

            this.debug.log("Checking for stream end...");
            if (isDynamic) {
                this.debug.log("Live never ends! (TODO)");
                // TODO : Check the contents of the last box to signal end.
                isFinished = false;
            } else if (representation.segments !== null) {
                this.debug.log("Segments: " + index + " / " + representation.segments.length);
                isFinished = (index >= representation.segments.length);
            } else if (representation.hasOwnProperty("media") && !representation.segmentInfo.hasOwnProperty("SegmentTimeline")) {
                fTimescale = 1;
                startNumber = 1;
                sDuration = Math.floor(representation.adaptation.period.duration); // Disregard fractional seconds.  TODO : Is this ok?  The logic breaks if we don't do this...

                if (representation.segmentInfo.hasOwnProperty("duration")) {
                    fDuration = representation.segmentInfo.duration;

                    if (representation.segmentInfo.hasOwnProperty("timescale")) {
                        fTimescale = representation.segmentInfo.timescale;
                    }

                    if (representation.segmentInfo.hasOwnProperty("startNumber")) {
                        startNumber = representation.segmentInfo.startNumber;
                    }

                    fLength = (fDuration / fTimescale);
                    idx = index - startNumber;
                    this.debug.log("SegmentTemplate: " + fLength + " * " + idx + " = " + (fLength * idx) + " / " + sDuration);
                    isFinished = ((fLength * idx) >= sDuration);
                }
            }

            return Q.when(isFinished);
        },

        segmentFromPresentationTime = function (representation, index, duration, timescale) {
            var self = this,
                seg,
                presentationStartTime,
                presentationEndTime;

            presentationStartTime = (index - 1) * duration;
            presentationEndTime = self.timelineConverter.calcPresentationTimeFromMediaTime(index * duration, representation);

            seg = new Dash.vo.Segment();

            seg.timescale = timescale;
            seg.duration = duration;
            seg.presentationStartTime = presentationStartTime;

            seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation);

            seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, isDynamic);
            seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, isDynamic);

            // at this wall clock time, the video element currentTime should be seg.presentationStartTime
            seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg);

            seg.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation);

            return seg;
        },

        getSegmentsFromList = function (representation) {
            var segments = [],
                list = representation.segmentInfo,
                i,
                len,
                seg,
                s,
                duration,
                start = 1;

            if (list.hasOwnProperty("startNumber")) {
                start = list.startNumber;
            }

            duration = list.duration / list.timescale;

            for (i = 0, len = list.SegmentURL_asArray.length; i < len; i += 1) {
                s = list.SegmentURL_asArray[i];

                seg = segmentFromPresentationTime.call(
                    this,
                    representation,
                    start + i,
                    duration,
                    list.timescale);

                seg.replacementTime = (start + i - 1) * list.duration;
                seg.media = s.media;
                seg.mediaRange = s.mediaRange;
                seg.index = s.index;
                seg.indexRange = s.indexRange;

                segments.push(seg);
                seg = null;
            }

            return Q.when(segments);
        },

        getSegmentsFromTemplate = function (representation) {
            var segments = [],
                template = representation.segmentInfo,
                i,
                len,
                seg = null,
                start = 1,
                duration,
                fTimescale = 1,
                url = null;

            if (template.hasOwnProperty("startNumber")) {
                start = template.startNumber;
            }

            // default to 1 if not present
            if (template.hasOwnProperty("timescale")) {
                fTimescale = template.timescale;
            }

            duration = template.duration / fTimescale;

            len = representation.adaptation.period.duration / duration;

            for (i = 0;i < len; i += 1) {

                seg = segmentFromPresentationTime.call(
                    this,
                    representation,
                    start + i,
                    duration,
                    fTimescale);

                seg.replacementTime = (start + i - 1) * template.duration;
                url = template.media;
                url = replaceNumberForTemplate(url, start + i);
                url = replaceTimeForTemplate(url, seg.replacementTime);
                seg.media = url;

                segments.push(seg);
                seg = null;
            }

            return Q.when(segments);
        },

        getSegmentsFromTimeline = function (representation) {
            var self = this,
                template = representation.segmentInfo,
                timeline = template.SegmentTimeline,
                segments = [],
                fragments,
                frag,
                i,
                len,
                j,
                repeat,
                seg,
                time = 0,
                endTime = 0,
                presentationEndTime = 0,
                count = 1,
                fTimescale = 1,
                url;

            if (template.hasOwnProperty("startNumber")) {
                count = template.startNumber;
            }

            // default to 1 if not present
            if (template.hasOwnProperty("timescale")) {
                fTimescale = template.timescale;
            }

            fragments = timeline.S_asArray;
            for (i = 0, len = fragments.length; i < len; i += 1) {
                frag = fragments[i];
                repeat = 0;
                if (frag.hasOwnProperty("r")) {
                    repeat = frag.r;
                }

                for (j = 0; j <= repeat; j += 1) {

                    if (frag.hasOwnProperty("t")) {
                        time = frag.t;
                    }
                    endTime = time + frag.d;

                    presentationEndTime = self.timelineConverter.calcPresentationTimeFromMediaTime(endTime / fTimescale, representation);

                    seg = new Dash.vo.Segment();

                    seg.timescale = fTimescale;
                    seg.duration = frag.d / seg.timescale;
                    seg.mediaStartTime = time / seg.timescale;

                    seg.presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(seg.mediaStartTime, representation);

                    seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, isDynamic);
                    seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, isDynamic);

                    // at this wall clock time, the video element currentTime should be seg.presentationStartTime
                    seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg);

                    seg.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation);

                    seg.replacementTime = time;
                    url = template.media;
                    url = replaceNumberForTemplate(url, count);
                    url = replaceTimeForTemplate(url, seg.replacementTime);
                    seg.media = url;

                    segments.push(seg);
                    seg = null;

                    time = endTime;
                    count += 1;
                }
            }

            return Q.when(segments);
        },

        getSegmentsFromSource = function (representation) {
            var url = representation.BaseURL,
                range = null;

            if (representation.segmentInfo.hasOwnProperty("indexRange")) {
                range = representation.segmentInfo.indexRange;
            }

            return this.baseURLExt.loadSegments(url, range);
        },

        getSegments = function (representation) {
            var segmentPromise,
                self = this;

            // Already figure out the segments.
            if (representation.segments !== null) {
                segmentPromise = Q.when(representation.segments);
            } else {
                if (representation.segmentInfo.hasOwnProperty("SegmentTimeline")) {
                    segmentPromise = getSegmentsFromTimeline.call(self, representation);
                } else if (representation.segmentInfo.hasOwnProperty("media")) {
                    segmentPromise = getSegmentsFromTemplate.call(self, representation);
                } else if (representation.segmentInfo.hasOwnProperty("SegmentURL")) {
                    segmentPromise = getSegmentsFromList.call(self, representation);
                } else {
                    segmentPromise = getSegmentsFromSource.call(self, representation);
                }
            }

            return segmentPromise;
        },

        getIndexForSegments = function (time, segments) {
            var segmentLastIdx = segments.length - 1,
                idx = -1,
                frag,
                ft,
                fd,
                i;

            if (segments && segments.length > 0) {
                for (i = segmentLastIdx; i >= 0; i--) {
                    frag = segments[i];
                    ft = frag.presentationStartTime;
                    fd = frag.duration;

                    if (i === (segmentLastIdx) && time > (ft + fd)) {
                        idx = segmentLastIdx;
                        break;
                    } else if (time >= ft && time <= (ft + fd)) {
                        idx = i;
                        break;
                    } else if (i === 0 && time < ft) {
                        idx = 0;
                        break;
                    }
                }
            }

            if (idx === -1) {
                console.log("Couldn't figure out a time!");
                console.log("Time: " + time);
                console.log(segments);
            }

            // TODO : This is horrible.
            // Temp fix for SegmentTimeline refreshes.
            //if (idx === -1) {
            //    idx = 0;
            //}

            /*
            if (segments && segments.length > 0) {
                idx = 0;
                ft = segments[0].startTime / segments[0].timescale;
                frag = null;

                while (ft <= time && (idx + 1) < segments.length) {
                    frag = segments[idx];
                    ft += frag.duration / frag.timescale;
                    idx += 1;
                }
                idx -= 1;
            }
            */

            return Q.when(idx);
        },

        getRequestForSegment = function (index, segment, representation) {
            if (segment === null || segment === undefined) {
                return Q.when(null);
            }

            var request = new MediaPlayer.vo.SegmentRequest(),
                url;

            url = getRequestUrl(segment.media, representation.BaseURL);
            url = replaceNumberForTemplate(url, index + 1);
            url = replaceTimeForTemplate(url, segment.replacementTime);
            url = replaceBandwidthForTemplate(url, representation.bandwidth);
            url = replaceIDForTemplate(url, representation.id);

            request.streamType = type;
            request.type = "Media Segment";
            request.url = url;
            request.range = segment.mediaRange;
            request.startTime = segment.presentationStartTime;
            request.duration = segment.duration;
            request.timescale = segment.timescale;

            return Q.when(request);
        },

        getForTime = function (representation, time) {
            var deferred,
                request,
                segment,
                self = this;

            self.debug.log("Getting the request for time: " + time);

            deferred = Q.defer();
            getSegments.call(self, representation).then(
                function (segments) {
                    var segmentsPromise;

                    self.debug.log("Got segments.");
                    self.debug.log(segments);
                    self.debug.log("Got a list of segments, so dig deeper.");
                    representation.segments = segments;
                    segmentsPromise = getIndexForSegments.call(self, time, segments);
                    return segmentsPromise;
                }
            ).then(
                function (newIndex) {
                    self.debug.log("Index for time " + time + " is " + newIndex);
                    index = newIndex;

                    return isMediaFinished.call(self, representation);
                }
            ).then(
                function (finished) {
                    var requestPromise = null;

                    self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        segment = representation.segments[index];
                        requestPromise = getRequestForSegment.call(self, index, segment, representation);
                    }

                    return requestPromise;
                }
            ).then(
                function (request) {
                    self.debug.log("Got a request.");
                    self.debug.log(request);
                    deferred.resolve(request);
                }
            );

            return deferred.promise;
        },

        getNext = function (representation) {
            var deferred,
                request,
                segment,
                self = this;

            self.debug.log("Getting the next request.");

            if (index === -1) {
                throw "You must call getSegmentRequestForTime first.";
            }

            index += 1;
            self.debug.log("New index: " + index);

            deferred = Q.defer();

            isMediaFinished.call(self, representation).then(
                function (finished) {
                    self.debug.log("Stream finished? " + finished);
                    if (finished) {
                        request = new MediaPlayer.vo.SegmentRequest();
                        request.action = request.ACTION_COMPLETE;
                        self.debug.log("Signal complete.");
                        self.debug.log(request);
                        deferred.resolve(request);
                    } else {
                        getSegments.call(self, representation).then(
                            function (segments) {
                                var segmentsPromise;

                                self.debug.log("Got segments.");
                                self.debug.log(segments);
                                representation.segments = segments;
                                segment = representation.segments[index];
                                segmentsPromise = getRequestForSegment.call(self, index, segment, representation);
                                return segmentsPromise;
                            }
                        ).then(
                            function (request) {
                                self.debug.log("Got a request.");
                                self.debug.log(request);
                                deferred.resolve(request);
                            }
                        );
                    }
                }
            );

            return deferred.promise;
        },

        getSegmentCountForDuration = function (representation, requiredDuration) {
            var self = this,
                deferred = Q.defer(),
                segmentDuration,
                segmentCount = 0;

            if (requiredDuration <= 0) {
                return Q.when(segmentCount);
            }

            getSegments.call(self, representation).then(
                function (segments) {
                    segmentDuration = segments[0].duration;
                    segmentCount = Math.ceil((requiredDuration + (segmentDuration / 2)) / segmentDuration);
                    deferred.resolve(segmentCount);
                }
            );

            return deferred.promise;
        },

        getCurrentTime = function (representation) {
            if (index === -1) {
                return Q.when(0);
            }

            var self = this,
                time,
                bufferedIndex,
                deferred = Q.defer();

            // get the last time again to be safe
            bufferedIndex = index; // - 1;
            if (bufferedIndex < 0) {
                bufferedIndex = 0;
            }

            getSegments.call(self, representation).then(
                function (segments) {
                    if (bufferedIndex >= segments.length) {
                        bufferedIndex = segments.length - 1;
                    }

                    time = segments[bufferedIndex].presentationTime;

                    deferred.resolve(time);
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        baseURLExt: undefined,
        manifestModel: undefined,
        manifestExt:undefined,
        errHandler: undefined,
        timelineConverter: undefined,

        getType: function () {
            return type;
        },

        setType : function (value) {
            type = value;
        },

        getIsDynamic: function () {
            return isDynamic;
        },
        setIsDynamic: function (value) {
            isDynamic = value;
        },

        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getCurrentTime: getCurrentTime,
        getSegmentCountForDuration: getSegmentCountForDuration
    };
};

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};
