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
MediaPlayer.dependencies.TimelineConverter = function () {
    "use strict";

    var calcAvailabilityTimeFromPresentationTime = function (presentationTime, isDynamic, calculateEnd) {
            var availabilityTime = NaN,
                manifest  = this.manifestModel.getValue();

            if (isDynamic) {
                availabilityTime = new Date(manifest.availabilityStartTime.getTime() + (presentationTime * 1000));
                //The Segment availability end time of a Media Segment is the sum of
                // the Segment availability start time, the MPD duration of the Media Segment
                // and the value of the attribute MPD@timeShiftBufferDepth
                if (calculateEnd) {
                    //@timeShiftBufferDepth specifies the duration of the time shifting buffer that is guaranteed
                    // to be available for a Media Presentation with type 'dynamic'.
                    // When not present, the value is infinite.
                    if (manifest.hasOwnProperty("timeShiftBufferDepth")) {
                        availabilityTime = new Date(availabilityTime.getTime() + manifest.timeShiftBufferDepth * 1000);
                    } else {
                        availabilityTime = Number.POSITIVE_INFINITY;
                    }
                }
            } else {
                // in static mpd, all segments are available at the same time
                if (manifest.hasOwnProperty("availabilityStartTime")) {
                    availabilityTime = new Date(manifest.availabilityStartTime.getTime());
                } else {
                    availabilityTime = new Date(manifest.mpdLoadedTime.getTime());
                }
            }

            return availabilityTime;
        },

        calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, isDynamic);
        },

        calcAvailabilityEndTimeFromPresentationTime = function (presentationTime, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, isDynamic, true);
        },

        calcPresentationTimeFromWallTime = function (wallTime, firstPeriodInfo, isDynamic) {
            var suggestedPresentationDelay = 0,
                periodAvailabilityStartTime = 0,
                presentationTime = NaN,
                manifest  = this.manifestModel.getValue();

            if (isDynamic) {

                if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
                    suggestedPresentationDelay = manifest.suggestedPresentationDelay;
                }

                periodAvailabilityStartTime = calcAvailabilityTimeFromPresentationTime.call(this, firstPeriodInfo.start - suggestedPresentationDelay, isDynamic);

                presentationTime = (wallTime.getTime() - periodAvailabilityStartTime.getTime()) / 1000;
            }

            return presentationTime;
        },

        calcPresentationTimeFromMediaTime = function (mediaTime, periodInfo, segmentBase) {
            var fTimescale = 1,
                presentationOffset = 0;

            if (segmentBase.hasOwnProperty("timescale")) {
                fTimescale = segmentBase.timescale;
            }

            if (segmentBase.hasOwnProperty("presentationTimeOffset")) {
                presentationOffset = segmentBase.presentationTimeOffset / fTimescale;
            }

            return (periodInfo.start - presentationOffset) + mediaTime;
        },

        calcMediaTimeFromPresentationTime = function (presentationTime, periodInfo, segmentBase) {
            var fTimescale = 1,
                presentationOffset = 0;

            if (segmentBase.hasOwnProperty("timescale")) {
                fTimescale = segmentBase.timescale;
            }

            if (segmentBase.hasOwnProperty("presentationTimeOffset")) {
                presentationOffset = segmentBase.presentationTimeOffset / fTimescale;
            }

            return periodInfo.start + presentationTime + presentationOffset;
        },

        calcWallTimeForSegment = function (segment, isDynamic) {
            var suggestedPresentationDelay = 0,
                displayStartTime = 0,
                wallTime = null,
                manifest  = this.manifestModel.getValue();

            if (isDynamic) {
                if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
                    suggestedPresentationDelay = manifest.suggestedPresentationDelay;
                }

                displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;

                wallTime = new Date(segment.availabilityStartTime.getTime() + (displayStartTime * 1000));
            }

            return wallTime;
        },

        calcMSETimeOffset = function (periodInfo, segmentBase) {
            var fTimescale = 1,
                presentationOffset = 0;

            if (segmentBase.hasOwnProperty("timescale")) {
                fTimescale = segmentBase.timescale;
            }

            if (segmentBase.hasOwnProperty("presentationTimeOffset")) {
                presentationOffset = segmentBase.presentationTimeOffset / fTimescale;
            }

            return periodInfo.start - presentationOffset;
        };

    return {
        system: undefined,
        debug: undefined,
        manifestModel: undefined,

        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset
    };
};

MediaPlayer.dependencies.TimelineConverter.prototype = {
    constructor: MediaPlayer.dependencies.TimelineConverter
};