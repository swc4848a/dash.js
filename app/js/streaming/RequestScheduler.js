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

     /*
      * RequestScheduler controls the time of calling of functions to be executed on shchedule
      */

    var schedulerModels = [],
        isPeriodicListenerStarted = false,

        /*
         * Calls the execution function only ones for provided date or time interval in milliseconds
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         * @time The date or time interval the executeFunction must be called
         *
         */
        scheduleOnce = function(executeContext, executeFunction, time) {
            if(!executeContext || !executeFunction) return;

            var interval,
                schedulerModel,
                scheduledTask;

            // calculate interval for date
            if (time instanceof Date) {
                interval = new Date() - time;
            } else if (typeof time === 'number') {
            // use as is for number value
                interval = time;
            } else {
            // we cannot use provided time value to continue
                throw "incorrect time value";
            }

            schedulerModel = registerSchedulerModel.call(this, executeContext);
            scheduledTask = createScheduledTask.call(this, schedulerModel, executeFunction, false);
            schedulerModel.setScheduledTask(scheduledTask);
            schedulerModel.setIsScheduled(false);
            executeTaskForTime(schedulerModel, interval);
        },

        /*
         * Executes the scheduled task in provided interval
         *
         * @param schedulerModel
         * @param interval
         *
         */
        executeTaskForTime = function(schedulerModel, interval) {
            var timeoutId = setTimeout(schedulerModel.getScheduledTask(), interval);
            schedulerModel.setExecuteId(timeoutId);
        },

        /*
         * Cancels the scheduled call for executeContex
         *
         * @param executeContext The object to be used as execution context
         *
         */
        unscheduleOnce = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext);

            if (schedulerModel) {
                clearTimeout(schedulerModel.getExecuteId());
                unregisterSchedulerModel(schedulerModel);
            }
        },

        /*
         * Prepares and runs the execution functions to be called on schedule
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         *
         */
        startScheduling = function(executeContext, executeFunction) {
            if(!executeContext || !executeFunction) return;

            // Searching for existing model for the passed context
            var schedulerModel = findSchedulerModel(executeContext),
                scheduledTask;

            // if we have not stored the model yet, do it now
            if (!schedulerModel) {
                schedulerModel = registerSchedulerModel.call(this, executeContext);
            }

            scheduledTask = createScheduledTask.call(this, schedulerModel, executeFunction, true);
            schedulerModel.setScheduledTask(scheduledTask);
            schedulerModel.setIsScheduled(true);
            startPeriodicScheduleListener.call(this, schedulerModel);
            //TODO: for now we have to call executeFunction 'manually' for the first time before it can be called from event listener
            schedulerModel.setLastExecuteTime(new Date());
            executeFunction.call(executeContext);
        },

        /*
         * Creates and stores SchedulerModel object
         *
         * @param executeContext
         */
        registerSchedulerModel = function (executeContext) {
            if(!executeContext) return null;

            var model = this.system.getObject("schedulerModel");
            model.setContext(executeContext);
            schedulerModels.push(model);
            return model;
        },

        /*
         * Removes SchedulerModel from stored list
         *
         * @param schedulerModel The model to be removed from list
         */
        unregisterSchedulerModel = function (schedulerModel) {
            var index = schedulerModels.indexOf(schedulerModel);

            if (index !== -1) {
                schedulerModels.splice(index, 1);
            }
        },

        /*
         * Searches for stored SchedulerModel by executeContex
         *
         * @param executeContext
         */
        findSchedulerModel = function(executeContext) {
            for (var i = 0; i < schedulerModels.length; i++) {
                if (schedulerModels[i].getContext() === executeContext) {
                    return schedulerModels[i];
                }
            }

            return null;
        },

        /*
         * Wraps the execute function in more abstract ScheduledTask for a greater flexibiliy
         *
         * @param schedulerModel
         * @param executeFunction The function to be executed as part of ScheduledTask
         *
         */
        createScheduledTask = function(schedulerModel, executeFunction, isPeriodic) {
            var scheduledTask = function() {
                //TODO: probably we need some threshold for calling executeFunction

                executeFunction.call(schedulerModel.getContext());

                // remember the last execution time for period task or remove model for one-time tasks
                if (isPeriodic) {
                    var now = new Date();
                    schedulerModel.setLastExecuteTime(now);
                } else {
                    unregisterSchedulerModel(schedulerModel);
                }
            };

            return scheduledTask;
        },

        /*
         * Called when the periodic scheduled event occures
         *
         */
        onScheduledTimeOccurred = function() {
            var schedulerModel;

            for (var i = 0; i < schedulerModels.length; i++) {
                schedulerModel = schedulerModels[i];

                if (schedulerModel.getIsScheduled()) {
                    schedulerModel.getScheduledTask().call();
                }
            }
        },

        /*
         * Binds schedule lisstener to corresponding element
         *
         * @param schedulerModel
         *
         */
        startPeriodicScheduleListener = function(schedulerModel) {
            if (isPeriodicListenerStarted) return;

            isPeriodicListenerStarted = true;
            //TODO: we need to find a better way to get correct video element
            var element = schedulerModel.getContext().getVideoModel().getElement();
            this.schedulerExt.attachScheduleListener(element, onScheduledTimeOccurred);
        },

        /*
         * Stops scheduling and executon of scheduled task for executeContext
         *
         * @param executeContext
         *
         */
        stopScheduling = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext);
            if (schedulerModel) {
                schedulerModel.setIsScheduled(false);
                unregisterSchedulerModel(schedulerModel);
                if (schedulerModels.length === 0) {
                    stopPeriodicScheduleListener.call(this, schedulerModel);
                }
            }
        },

        /*
         * Unbinds the schedule listener from corresponding element
         *
         * @param schedulerModel
         *
         */
        stopPeriodicScheduleListener = function(schedulerModel) {
            //TODO: we need to find a better way to get correct video element
            var element = schedulerModel.getContext().getVideoModel().getElement();
            this.schedulerExt.detachScheduleListener(element, onScheduledTimeOccurred);
            isPeriodicListenerStarted = false;
        };

    return {
        system: undefined,
        videoModel: undefined,
        debug: undefined,
        schedulerExt: undefined,

        /*
         * Indicates whether the executeContex has scheduled task or not
         *
         * @param executeContext
         *
         */
        isScheduled: function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext);
            return (!!schedulerModel && schedulerModel.getIsScheduled());
        },

        /*
         * Gets the execution interval for scheduled task of executeContex
         *
         * @param executeContext
         *
         */
        getExecuteInterval: function (executeContext) {
            var schedulerModel = findSchedulerModel(executeContext);
            return (schedulerModel ? schedulerModel.getExecuteInterval() : null);
        },

        startScheduling: startScheduling,
        stopScheduling: stopScheduling,
        // TODO find more appropriate names for these methods
        scheduleOnce: scheduleOnce,
        unscheduleOnce: unscheduleOnce
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};