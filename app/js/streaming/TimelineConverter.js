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

    var calcAvailabilityTimeFromPresentationTime = function (presentationTime, mpd, isDynamic, calculateEnd) {
            var availabilityTime = NaN;

            if (calculateEnd) {
                //@timeShiftBufferDepth specifies the duration of the time shifting buffer that is guaranteed
                // to be available for a Media Presentation with type 'dynamic'.
                // When not present, the value is infinite.
                if (isDynamic && mpd.timeShiftBufferDepth) {
                    availabilityTime = new Date(mpd.availabilityStartTime.getTime() + ((presentationTime + mpd.timeShiftBufferDepth) * 1000));
                } else {
                    availabilityTime = mpd.availabilityEndTime;
                }
            } else {
                if (isDynamic) {
                    availabilityTime = new Date(mpd.availabilityStartTime.getTime() + (presentationTime * 1000));
                } else {
                // in static mpd, all segments are available at the same time
                    availabilityTime = mpd.availabilityStartTime;
                }
            }

            return availabilityTime;
        },

        calcSyncTimeOffset = function(mpd) {
            // SyncTimeOffset is a difference between the time on the client and the time on the server. The mpdServerSentTime
            // is the date at which the server started sending the manifest.
            // We do not know the exact time that was on the client when the server set mpdServerSentTime, but we know that it
            // should be some time in the interval betweeen the time the client had sent a request and the time the manifest was loaded.
            // This interval is the mpdLoadingTime. We use the middle of this interval to get the approximate value of the client time.
            var manifest = mpd.manifest,
                mpdClientTime = (manifest.mpdLoadedTime.getTime() / 1000) - (manifest.mpdLoadingTime / 2),
                mpdServerTime = manifest.mpdServerSentTime.getTime() / 1000;

            return (mpdClientTime - mpdServerTime);
        },

        calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
        },

        calcAvailabilityEndTimeFromPresentationTime = function (presentationTime, mpd, isDynamic) {
            return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, true);
        },

        calcPresentationStartTime = function (period) {
            var presentationStartTime,
                isDynamic;

            isDynamic = period.mpd.manifest.type === "dynamic";

            if (isDynamic) {
                presentationStartTime = calcPresentationTimeFromWallTime.call(this, period.mpd.manifest.mpdLoadedTime, period, isDynamic);
            } else {
                presentationStartTime = period.start;
            }

            return presentationStartTime;
        },

        calcPresentationTimeFromWallTime = function (wallTime, period, isDynamic) {
            var periodAvailabilityStartTime = calcAvailabilityStartTimeFromPresentationTime.call(this, period.start, period.mpd, isDynamic),
                suggestedPresentationDelay = period.mpd.suggestedPresentationDelay * 1000;

            return ((wallTime.getTime() - periodAvailabilityStartTime.getTime() - suggestedPresentationDelay) / 1000);
        },

        calcPresentationTimeFromMediaTime = function (mediaTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart - presentationOffset) + mediaTime;
        },

        calcMediaTimeFromPresentationTime = function (presentationTime, representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart + presentationOffset + presentationTime);
        },

        calcWallTimeForSegment = function (segment, isDynamic) {
            var suggestedPresentationDelay,
                displayStartTime,
                wallTime;

            if (isDynamic) {
                suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
                displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
                wallTime = new Date(segment.availabilityStartTime.getTime() + (displayStartTime * 1000));
            }

            return wallTime;
        },

        calcMSETimeOffset = function (representation) {
            var periodStart = representation.adaptation.period.start,
                presentationOffset = representation.presentationTimeOffset;

            return (periodStart - presentationOffset);
        };

    return {
        system: undefined,
        debug: undefined,

        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPresentationStartTime: calcPresentationStartTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset,
        calcSyncTimeOffset: calcSyncTimeOffset
    };
};

MediaPlayer.dependencies.TimelineConverter.prototype = {
    constructor: MediaPlayer.dependencies.TimelineConverter
};