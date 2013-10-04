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

MediaPlayer.dependencies.FragmentModel = function () {
    "use strict";

    var context,
        executedRequests = [],
        currentRequest,
        startLoadingCallback,
        successLoadingCallback,
        errorLoadingCallback,
        cancelLoadingCallback,
        streamEndCallback,

        loadCurrentFragment = function() {
            var now = new Date(),
                start = currentRequest.availabilityStartTime,
                end = currentRequest.availabilityEndTime;

            if (now < start) {
                // The availability start time exceeds the current wall-clock time, we should wait until the fragment is available
                cancelLoadingCallback.call(context);
            } else if (now < end) {
                // We are about to start loading the fragment, so execute the corresponding callback
                startLoadingCallback.call(context);
                this.fragmentLoader.load(currentRequest).then(successLoadingCallback.bind(context, currentRequest),
                    errorLoadingCallback.bind(context, currentRequest));
            } else {
                // The current wall-clock time exceeds the availability end time, so the fragment is not available any more, do not schedule it again
                executedRequests.push(currentRequest);
                currentRequest = null;
                cancelLoadingCallback.call(context);
            }
        },

        removeExecutedRequest = function(request) {
            var idx = executedRequests.indexOf(request);

            if (idx !== -1) {
                executedRequests.splice(idx, 1);
            }
        };

    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,

        setContext: function(value) {
            context = value;
        },

        getContext: function() {
            return context;
        },

        setCurrentRequest: function(value) {
            currentRequest = value;
        },

        setCallbacks: function(onLoadingStart, onLoadingSuccess, onLoadingError, onLoadingCancel, onStreamEnd) {
            startLoadingCallback = onLoadingStart;
            streamEndCallback = onStreamEnd;
            cancelLoadingCallback = onLoadingCancel;

            successLoadingCallback = function(request, response) {
                if (currentRequest.type.toLowerCase() !== "initialization segment") {
                    executedRequests.push(currentRequest);
                }
                currentRequest = null;
                onLoadingSuccess.call(context, request, response);
            };

            errorLoadingCallback = function(response) {
                currentRequest = null;
                onLoadingError.call(context, response);
            };
        },

        isFragmentLoaded: function(request) {
            var self = this,
                isLoaded = false,
                ln = executedRequests.length,
                req;

            for (var i = 0; i < ln; i++) {
                req = executedRequests[i];
                if (request.startTime === req.startTime) {
                    self.debug.log(request.streamType + " Fragment already loaded for time: " + request.startTime);
                    if (request.url === req.url) {
                        self.debug.log(request.streamType + " Fragment url already loaded: " + request.url);
                        isLoaded = true;
                        break;
                    } else {
                        // remove overlapping segement of a different quality
                        removeExecutedRequest(request);
                    }
                }
            }

            return isLoaded;
        },

        isReady: function() {
            return context.isReady();
        },

        getOverdueRequests: function() {
            var now = new Date(),
                overdueRequests = [],
                len = executedRequests.length,
                endTime,
                i;

            for (i = 0; i < len; i +=1) {
                endTime = executedRequests[i].availabilityEndTime;
                if (now > endTime) {
                    overdueRequests.push(executedRequests[i]);
                }
            }

            return overdueRequests;
        },

        executeCurrentRequest: function() {
            if (!currentRequest) return;

            switch (currentRequest.action) {
                case "complete":
                    // Stream has completed, execute the correspoinding callback
                    streamEndCallback.call(context);
                    break;
                case "download":
                    loadCurrentFragment.call(this);
                    break;
                default:
                    this.debug.log("Unknown request action.");
            }
        }
    };
};

MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
};