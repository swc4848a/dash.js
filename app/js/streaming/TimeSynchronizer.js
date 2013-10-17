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
 MediaPlayer.dependencies.TimeSynchronizer = function () {
    "use strict";

    var getTimeDifferenceWithServer = function(serverUrl) {
        var request = new XMLHttpRequest(),
            deferred = Q.defer(),
            loaded = false,
            timeDifference = 0,
            requestStartTime = new Date(),
            requestEndTime,
            serverTime,
            clientTime;

        request.open("HEAD", serverUrl, true);

        request.onloadend = function () {
            if (!loaded) {
                deferred.reject("Error getting time difference.");
            }
        };

        request.onload = function () {
            loaded = true;
            requestEndTime = new Date();
            // The Date general-header field represents the date and time at which the message was originated.
            // It is supposed to be a mandatory header.
            // We need this value to know the server time to be able to calculate the time offset beetween the client and the server.
            serverTime = request.getResponseHeader("Date");

            // SyncTimeOffset is a difference between the time on the client and the time on the server.
            // We do not know the exact time that was on the client when the server set Date header, but we know that it
            // should be some time in the interval betweeen the time the client had sent a request and the time the response was loaded.
            // We use the middle of this interval to get the approximate value of the client time.
            if (serverTime) {
                clientTime = (requestEndTime.getTime() - ((requestEndTime.getTime() - requestStartTime.getTime()) / 2)) / 1000;
                serverTime = (new Date(serverTime)).getTime() / 1000;
                timeDifference = (clientTime - serverTime);
            }

            deferred.resolve(timeDifference);
        };

        request.onerror = function () {
            deferred.reject("Error getting time difference.");
        };

        request.send();

        return deferred.promise;
    };

    return {
        system: undefined,
        debug: undefined,

        getTimeDifferenceWithServer: getTimeDifferenceWithServer
    };
};

MediaPlayer.dependencies.TimeSynchronizer.prototype = {
    constructor: MediaPlayer.dependencies.TimeSynchronizer
};