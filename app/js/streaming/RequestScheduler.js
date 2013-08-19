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
 MediaPlayer.dependencies.RequestScheduler = function () {
    "use strict";

    var schedulerModels = [],

        startScheduling = function(bufferController, callback) {
            if(!bufferController || !callback) return;

            var schedulerModel = findSchedulerModel(bufferController);

            if (!schedulerModel) {
                schedulerModel = registerSchedulerModel.call(this, bufferController);
            }

            schedulerModel.setValidateCallback( wrapValidationCallback.call(this, schedulerModel, callback) );
            schedulerModel.setLastValidateTime(new Date());
            schedulerModel.setIsScheduled(true);
            startValidation.call(this, schedulerModel);
            //TODO: for now we have to call callback 'manually' for the first time before it can be called from event listener
            callback.call(bufferController);
        },

        registerSchedulerModel = function (bufferController) {
             if(!bufferController) return null;

             var model = this.system.getObject("schedulerModel");
             model.setBufferController(bufferController);
             schedulerModels.push(model);
             return model;
        },

        findSchedulerModel = function(bufferController) {
            for (var i = 0; i < schedulerModels.length; i++) {
                if (schedulerModels[i].getBufferController() === bufferController) {
                    return schedulerModels[i];
                }
            }

            return null;
        },

        wrapValidationCallback = function(schedulerModel, callback) {
            return function() {
                //TODO: probably we need some threshold for calling validation callback
                var now = new Date();
                callback.call(schedulerModel.getBufferController());
                schedulerModel.setLastValidateTime(now);
            };
        },

        startValidation = function(schedulerModel) {
            var element = schedulerModel.getBufferController().getVideoModel().getElement(),
                callback = schedulerModel.getValidateCallback();
            this.schedulerExt.startValidation(element, callback);
        },

        stopScheduling = function(bufferController) {
            var schedulerModel = findSchedulerModel(bufferController);
            if (schedulerModel) {
                stopValidation.call(this, schedulerModel);
                schedulerModel.setIsScheduled(false);
            }
        },

        stopValidation = function(schedulerModel) {
            var element = schedulerModel.getBufferController().getVideoModel().getElement(),
                callback = schedulerModel.getValidateCallback();
            this.schedulerExt.stopValidation(element, callback);
        };

    return {
        system: undefined,
        videoModel: undefined,
        debug: undefined,
        schedulerExt: undefined,

        isScheduled: function(bufferController) {
            var schedulerModel = findSchedulerModel(bufferController);
            return (!!schedulerModel && schedulerModel.getIsScheduled());
        },

        getValidateInterval: function (bufferController) {
            var schedulerModel = findSchedulerModel(bufferController);
            return (schedulerModel ? schedulerModel.getValidateInterval() : null);
        },

        startScheduling: startScheduling,
        stopScheduling: stopScheduling
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};