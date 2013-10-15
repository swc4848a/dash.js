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
MediaPlayer.dependencies.ManifestUpdater = function () {
    "use strict";

    var minBufferTime,
        period,
        lastUpdateTime,
        deferredUpdate,
        estimatedUpdateTime,

        checkForUpdate = function() {
            var currentTime = Math.floor(this.videoModel.getCurrentTime());

            if (isUpdateRequired.call(this, currentTime)) {
                lastUpdateTime = currentTime;
                update.call(this);
            }
        },

        isUpdateRequired = function(currentTime) {
            return ((currentTime !== lastUpdateTime) && (estimatedUpdateTime - currentTime) < minBufferTime);
        },

        update = function() {
            var self = this,
                manifest,
                url;
            // The manifest should not update until the previous update has completed. A promise postpones the update
            // until is is resolved. For the first time the promise does not exist yet, so pass 'true' instead.
            Q.when(deferredUpdate ? deferredUpdate.promise : true).then(
                function() {
                    deferredUpdate = Q.defer();
                    manifest = self.manifestModel.getValue();
                    url = manifest.mpdUrl;

                    if (manifest.hasOwnProperty("Location")) {
                        url = manifest.Location;
                    }

                    self.debug.log("Refresh manifest @ " + url);

                    self.manifestLoader.load(url).then(
                        function (manifestResult) {
                            self.manifestModel.setValue(manifestResult);
                            self.debug.log("Manifest has been refreshed.");
                            self.debug.log(manifestResult);
                        }
                    );
                }
            );
        },

        onStreamsComposed = function() {
            // When streams are ready we can consider manifest update completed. Resolve the update promise and get ready for another update
            if (deferredUpdate) {
                deferredUpdate.resolve();
            }
            this.startUpdating(this.videoModel, period);
        };

    return {
        debug: undefined,
        system: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        timelineConverter: undefined,

        setup: function() {
            checkForUpdate = checkForUpdate.bind(this);
            // Listen to streamsReady event to be aware that the streams have been composed
            this.system.mapHandler("streamsComposed", undefined, onStreamsComposed.bind(this));
        },

        startUpdating: function(videoModel, periodInfo) {
            var manifest = this.manifestModel.getValue(),
                minimumUpdatePeriod,
                mpdLoadedTime;

            period = periodInfo;

            if (manifest && manifest.hasOwnProperty("minimumUpdatePeriod") && videoModel) {
                minimumUpdatePeriod = parseFloat(manifest.minimumUpdatePeriod);
                minBufferTime = manifest.minBufferTime;
                mpdLoadedTime = manifest.mpdLoadedTime;
                estimatedUpdateTime = this.timelineConverter.calcPresentationTimeFromWallTime(mpdLoadedTime, period, true) + minimumUpdatePeriod;
                if (videoModel !== this.videoModel) {
                    this.stopUpdating();
                    this.videoModel = videoModel;
                    this.videoModel.listen("timeupdate", checkForUpdate);
                }
            }
        },

        stopUpdating: function() {
            if (this.videoModel) {
                this.videoModel.unlisten("timeupdate", checkForUpdate);
                this.videoModel = null;
            }
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};