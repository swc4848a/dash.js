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
 MediaPlayer.dependencies.StreamController = function () {
    "use strict";

    /*
     * StreamController aggregates all streams defined as Period sections in the manifest file
     * and implements corresponding logic to switch between them.
     */

    var streams = [],
        activeStream,
        //TODO set correct value for threshold
        STREAM_BUFFER_END_THRESHOLD = 4,
        STREAM_END_THRESHOLD = 3,
        autoPlay = true,
        deferredSwitch= null,
        timeupdateListener,
        seekingListener,
        progressListener,

        play = function () {
            activeStream.play();
        },

        pause = function () {
            activeStream.pause();
        },

        seek = function (time) {
            activeStream.seek(time);
        },

        /*
         * Replaces the currently displayed <video> with a new data and corresponding <video> element.
         *
         * @param fromVideoModel Currently used video data
         * @param toVideoModel New video data to be displayed
         *
         * TODO - move method to appropriate place - VideoModelExtensions??
         */
        switchVideoModel = function (fromVideoModel, toVideoModel) {
            var activeVideoElement = fromVideoModel.getElement(),
                newVideoElement = toVideoModel.getElement();

            if (!newVideoElement.parentNode) {
                activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
            }

            // We use width property to hide/show video element because when using display="none"/"block" playback
            // sometimes stops after switching.
            activeVideoElement.style.width = "0px";
            newVideoElement.style.width = "100%";

            copyVideoProperties(activeVideoElement, newVideoElement);
            detachVideoEvents.call(this, fromVideoModel);
            attachVideoEvents.call(this, toVideoModel);

            return Q.when(true);
        },

        attachVideoEvents = function (videoModel) {
            videoModel.listen("seeking", seekingListener);
            videoModel.listen("progress", progressListener);

            if (getNextStream()) {
                videoModel.listen("timeupdate", timeupdateListener);
            }
            this.manifestUpdater.startUpdating(videoModel, activeStream.getPeriodInfo());
        },

        detachVideoEvents = function (videoModel) {
            videoModel.unlisten("seeking", seekingListener);
            videoModel.unlisten("progress", progressListener);
            videoModel.unlisten("timeupdate", timeupdateListener);
        },

        copyVideoProperties = function (fromVideoElement, toVideoElement) {
            ["controls", "loop", "muted", "playbackRate", "volume"].forEach( function(prop) {
                toVideoElement[prop] = fromVideoElement[prop];
            });
        },

        /*
         * Called when more data is buffered.
         * Used to determine the time current stream is almost buffered and we can start buffering of the next stream.
         * TODO move to ???Extensions class
         */
        onProgress = function() {

            var ranges = activeStream.getVideoModel().getElement().buffered;

            // nothing is buffered
            if (!ranges.length) {
                return;
            }

            // In case a real buffered value exceeds current position move it to be able to start playback after period switching
            if (activeStream.getVideoModel().getCurrentTime() < ranges.start(0)) {
                activeStream.getVideoModel().setCurrentTime(ranges.start(0));
            }

            var lastRange = ranges.length -1,
                bufferEndTime = ranges.end(lastRange),
                remainingBufferDuration = (activeStream.getStartTime() + activeStream.getDuration()) - bufferEndTime;

            if (remainingBufferDuration < STREAM_BUFFER_END_THRESHOLD) {
                activeStream.getVideoModel().unlisten("progress", progressListener);
                onStreamBufferingEnd();
            }
        },

        /*
         * Called when current playback positon is changed.
         * Used to determine the time current stream is finished and we should switch to the next stream.
         * TODO move to ???Extensions class
         */
        onTimeupdate = function() {
            // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new period starts
            // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
            if (activeStream.getVideoModel().getElement().seeking) return;

            var streamEndTime  = activeStream.getStartTime() + activeStream.getDuration(),
                currentTime = activeStream.getVideoModel().getCurrentTime();

            // check if stream end is reached
            if (streamEndTime - currentTime < STREAM_END_THRESHOLD) {
                switchStream.call(this, activeStream, getNextStream());
            }
        },

        /*
         * Called when Seeking event is occured.
         * TODO move to ???Extensions class
         */
        onSeeking = function() {
            var seekingTime = activeStream.getVideoModel().getCurrentTime(),
                seekingStream = getStreamForTime(seekingTime);

            if (seekingStream && seekingStream !== activeStream) {
                switchStream.call(this, activeStream, seekingStream, seekingTime);
            }
        },

        /*
         * Handles the current stream buffering end moment to start the next stream buffering
         */
        onStreamBufferingEnd = function() {
            var nextStream = getNextStream();
            if (nextStream) {
                nextStream.initPlayback();
            }
        },

        getNextStream = function() {
            var nextIndex = activeStream.getPeriodIndex() + 1;
            return (nextIndex < streams.length) ? streams[nextIndex] : null;
        },

        getStreamForTime = function(time) {
            var duration = 0,
                stream = null,
                ln = streams.length;

            if (ln > 0) {
                duration += streams[0].getStartTime();
            }

            for (var i = 0; i < ln; i++) {
                stream = streams[i];
                duration += stream.getDuration();

                if (time < duration) {
                    return stream;
                }
            }
        },

        //  TODO move to ???Extensions class
        createVideoModel = function() {
            var model = this.system.getObject("videoModel"),
                video = document.createElement("video");
            model.setElement(video);
            return model;
        },

        switchStream = function(from, to, seekTo) {

            if(!from || !to || from === to) return;

            var self = this;

            Q.when(deferredSwitch || true).then(
                function() {
                    from.pause();
                    activeStream = to;

                    deferredSwitch = switchVideoModel.call(self, from.getVideoModel(), to.getVideoModel());

                    if (seekTo) {
                        seek(from.getVideoModel().getCurrentTime());
                    } else {
                        activeStream.initPlayback();
                    }

                    play();
                }
            );
        },

        composeStreams = function() {
            var self = this,
                manifest = self.manifestModel.getValue(),
                deferred = Q.defer(),
                updatedStreams = [],
                pLen,
                sLen,
                pIdx,
                sIdx,
                period,
                stream;

            self.manifestExt.getMpd(manifest).then(
                function(mpd) {
                    self.manifestExt.getRegularPeriods(manifest, mpd).then(
                        function(periods) {
                            for (pIdx = 0, pLen = periods.length; pIdx < pLen; pIdx += 1) {
                                period = periods[pIdx];
                                for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                                    // If the stream already exists we just need to update the values we got from the updated manifest
                                    if (streams[sIdx].getId() === period.id) {
                                        stream = streams[sIdx];
                                        updatedStreams.push(stream.updateData(period));
                                    }
                                }
                                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                                if (!stream) {
                                    stream = self.system.getObject("stream");
                                    stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                                    stream.initProtection();
                                    stream.setAutoPlay(autoPlay);
                                    stream.load(manifest, period);
                                    streams.push(stream);
                                }
                                stream = null;
                            }

                            // If the active stream has not been set up yet, let it be the first Stream in the list
                            if (!activeStream) {
                                activeStream = streams[0];
                                attachVideoEvents.call(self, activeStream.getVideoModel());
                            }

                            Q.all(updatedStreams).then(
                                function() {
                                    deferred.resolve();
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        manifestHasUpdated = function() {
            composeStreams.call(this);
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,

        setup: function() {
            this.system.mapHandler("manifestUpdated", undefined, manifestHasUpdated.bind(this));
            timeupdateListener = onTimeupdate.bind(this);
            progressListener = onProgress.bind(this);
            seekingListener = onSeeking.bind(this);
        },

        getManifestExt: function () {
            return activeStream.getManifestExt();
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        load: function (url) {
            var self = this;

            self.manifestLoader.load(url).then(
                function(manifest) {
                    self.manifestModel.setValue(manifest);
                }
            );
        },

        reset: function () {

            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream.getVideoModel());
            }

            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.reset();
            }

            streams = [];
            this.manifestUpdater.stopUpdating();
        },

        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};
