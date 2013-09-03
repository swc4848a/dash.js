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
MediaPlayer.dependencies.FragmentController = function () {
    "use strict";

    var fragmentModels = [],

        notify = function() {
            var ln = fragmentModels.length,
                model;
            // Execute the callback for each stored model
            for (var i = 0; i < ln; i++) {
                model = fragmentModels[i];
                model.getUpdateCallback().call(model.getContext());
            }
        },

        findModel = function(bufferController) {
            for (var i = 0; i < fragmentModels.length; i++) {
                if (fragmentModels[i].getContext() == bufferController) {
                    return fragmentModels[i];
                }
            }

            return null;
        };

    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,

        process: function (bytes) {
            var result = null;

            if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
                result = new Uint8Array(bytes);
            }

            return Q.when(result);
        },

        attachBufferController: function(bufferController, updateCallback) {
            if(!bufferController) return null;
            // Wrap the buffer controller into model and store it to track the loading state and notify about state changes
            var model = this.system.getObject("fragmentModel");
            model.setContext(bufferController);
            model.setUpdateCallback(updateCallback);
            fragmentModels.push(model);
            return model;
        },

        detachBufferController: function(bufferController) {
            var idx = fragmentModels.indexOf(bufferController);
            // If we have the model for the given buffer just remove it from array
            if (idx > -1) {
                fragmentModels.splice(idx, 1);
            }
        },

        isActiveRequestsCompleted: function() {
            var isCompleted = true,
                ln = fragmentModels.length;

            // Search through all buffer controllers and look if any of them is still loading the current fragment
            for (var i = 0; i < ln; i++) {
                if (fragmentModels[i].getIsLoading()) {
                    isCompleted = false;
                    break;
                }
            }

            return isCompleted;
        },

        setLoadingStateForBufferController: function(bufferController, isLoading) {
            var fragmentModel = findModel(bufferController);

            if (fragmentModel) {
                fragmentModel.setIsLoading(isLoading);
                // If all the buffer controllers have completed loading the current fragment notify them all
                if (this.isActiveRequestsCompleted()) {
                    notify();
                }
            }
        },

        isFragmentLoaded: function(bufferController, request) {
            var self = this,
                isLoaded = false,
                fragmentModel = findModel(bufferController),
                requests = fragmentModel ? fragmentModel.getRequests() : null,
                ln = requests ? requests.length : null,
                req,
                i;

            if (!fragmentModel || !requests || !ln) {
                return isLoaded;
            }

            for (i = 0; i < ln; i++) {
                req = requests[i];
                if (req.startTime === request.startTime) {
                    self.debug.log(request.streamType + " Fragment already loaded for time: " + request.startTime);
                    if (req.url === request.url) {
                        self.debug.log(request.streamType + " Fragment url already loaded: " + request.url);
                        isLoaded = true;
                        break;
                    } else {
                        fragmentModel.removeRequest(request);
                    }
                }
            }


            return isLoaded;
        },

        executeRequest: function (bufferController, request, successCallback, errorCallback, streamEndCallback) {
            var self = this,
                fragmentModel = findModel(bufferController);

            if (!fragmentModel || !request) {
                return;
            }

            if (request.type.toLowerCase() !== "initialization segment") {
                fragmentModel.addRequest(request);
            }

            switch (request.action) {
                case "complete":
                    streamEndCallback.call(fragmentModel.getContext());
                    break;
                case "download":
                    self.fragmentLoader.load(request).then(successCallback.bind(fragmentModel.getContext(), request),
                        errorCallback.bind(fragmentModel.getContext(), request));
                    break;
                default:
                    self.debug.log("Unknown request action.");
            }
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};