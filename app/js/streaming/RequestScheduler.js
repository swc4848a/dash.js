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
        PERIODICALLY_EXECUTED_TASK = 0,
        WALL_TIME_TRIGGERED_TASK = 1,
        PLAYER_TIME_TRIGGERED_TASK = 2,

        /*
         * Calls the execution function only ones for provided date or time interval in milliseconds
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         * @time The date or time interval the executeFunction must be called
         *
         */
        setTriggerForPlayerTime = function(executeContext, executeFunction, dueTime) {
            if(!executeContext || !executeFunction) return;

            var schedulerModel;

            schedulerModel = registerSchedulerModel.call(this, executeContext, PLAYER_TIME_TRIGGERED_TASK);
            schedulerModel.setScheduledTask(executeFunction);
            schedulerModel.setIsScheduled(true);
            schedulerModel.setExecuteTime(dueTime);
        },

        /*
         * Cancels the scheduled call for executeContex
         *
         * @param executeContext The object to be used as execution context
         *
         */
        removeTriggerForPlayerTime = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PLAYER_TIME_TRIGGERED_TASK);

            if (schedulerModel) {
                unregisterSchedulerModel(schedulerModel);
            }
        },

        /*
         * Calls the execution function at the provided wall click time
         *
         * @param executeContext The object to be used as execution context
         * @param executeFunction The function to be executed on schedule
         * @time The wall click time at which the executeFunction must be called
         *
         */
        setTriggerForWallTime = function(executeContext, executeFunction, wallTime) {
            if(!executeContext || !executeFunction) return;

            var executeTimeout = wallTime.getTime() - (new Date()).getTime(),
                executeId,
                schedulerModel;

            schedulerModel = registerSchedulerModel.call(this, executeContext, WALL_TIME_TRIGGERED_TASK);
            schedulerModel.setScheduledTask(executeFunction);
            executeId = setTimeout(function() {
                schedulerModel.executeScheduledTask();
                unregisterSchedulerModel(schedulerModel);
            }, executeTimeout);
            schedulerModel.setExecuteId(executeId);
        },

        /*
         * Cancels the scheduled call for executeContex
         *
         * @param executeContext The object to be used as execution context
         *
         */
        removeTriggerForWallTime = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, WALL_TIME_TRIGGERED_TASK);

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
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_EXECUTED_TASK);

            // if we have not stored the model yet, do it now
            if (!schedulerModel) {
                schedulerModel = registerSchedulerModel.call(this, executeContext, PERIODICALLY_EXECUTED_TASK);
            }

            schedulerModel.setScheduledTask(executeFunction);
            schedulerModel.setIsScheduled(true);
            startPeriodicScheduleListener.call(this);
            //TODO: for now we have to call executeFunction 'manually' for the first time before it can be called from event listener
            executeFunction.call(executeContext);
        },

        /*
         * Creates and stores SchedulerModel object
         *
         * @param executeContext
         */
        registerSchedulerModel = function (executeContext, type) {
            if(!executeContext) return null;

            var model = this.system.getObject("schedulerModel");
            model.setContext(executeContext);
            model.setType(type);
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
        findSchedulerModel = function(executeContext, type) {
            for (var i = 0; i < schedulerModels.length; i++) {
                if (schedulerModels[i].getContext() === executeContext && schedulerModels[i].getType() === type) {
                    return schedulerModels[i];
                }
            }

            return null;
        },

        now = function() {
            return this.videoModel.getCurrentTime();
        },

        /*
         * Called when the periodic scheduled event occures
         *
         */
        onScheduledTimeOccurred = function() {
            runScheduledTasks.call(this);
        },

        runScheduledTasks = function() {
            var self = this,
                schedulerModel,
                type,
                now,
                due;

            for (var i = 0; i < schedulerModels.length; i++) {
                schedulerModel = schedulerModels[i];

                if (!schedulerModel.getIsScheduled()) {
                    continue;
                }

                type = schedulerModel.getType();

                if (type === PERIODICALLY_EXECUTED_TASK) {
                    schedulerModel.executeScheduledTask();
                    continue;
                }

                if (type === PLAYER_TIME_TRIGGERED_TASK) {
                    now = self.videoModel.getCurrentTime();
                    due = schedulerModel.getExecuteTime();
                    self.debug.log("scheduledTask - now: " + now + ", due: " + due);

                    if (now <= due) {
                        continue;
                    }

                    schedulerModel.executeScheduledTask();
                    schedulerModel.setIsScheduled(false);
                }
            }
        },

        /*
         * Binds schedule lisstener to corresponding element
         *
         * @param schedulerModel
         *
         */
        startPeriodicScheduleListener = function() {
            if (isPeriodicListenerStarted) return;

            isPeriodicListenerStarted = true;
            var element = this.videoModel.getElement();
            this.schedulerExt.attachScheduleListener(element, onScheduledTimeOccurred.bind(this));
            this.schedulerExt.attachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
        },

        /*
         * Stops scheduling and executon of scheduled task for executeContext
         *
         * @param executeContext
         *
         */
        stopScheduling = function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_EXECUTED_TASK);
            if (schedulerModel) {
                unregisterSchedulerModel(schedulerModel);
                if (schedulerModels.length === 0) {
                    stopPeriodicScheduleListener.call(this);
                }
            }
        },

        /*
         * Unbinds the schedule listener from corresponding element
         *
         * @param schedulerModel
         *
         */
        stopPeriodicScheduleListener = function() {
            var element = this.videoModel.getElement();
            this.schedulerExt.detachScheduleListener(element, onScheduledTimeOccurred.bind(this));
            this.schedulerExt.detachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
            isPeriodicListenerStarted = false;
        },

        onUpdateSchedule = function() {
            rescheduleTasks.call(this);
            runScheduledTasks.call(this);
        },

        /*
         * Sets all the SchedulerModels to scheduled state to be ready to be executed again
         */
        rescheduleTasks = function() {
            for (var i = 0; i < schedulerModels.length; i++) {
                schedulerModels[i].setIsScheduled(true);
            }
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
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_EXECUTED_TASK);
            return (!!schedulerModel && schedulerModel.getIsScheduled());
        },

        /*
         * Gets the execution interval for scheduled task of executeContex
         *
         * @param executeContext
         *
         */
        getExecuteInterval: function (executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_EXECUTED_TASK);
            return (schedulerModel ? schedulerModel.getExecuteInterval() : null);
        },

        now: now,
        startScheduling: startScheduling,
        stopScheduling: stopScheduling,
        setTriggerForPlayerTime: setTriggerForPlayerTime,
        setTriggerForWallTime: setTriggerForWallTime,
        removeTriggerForPlayerTime: removeTriggerForPlayerTime,
        removeTriggerForWallTime: removeTriggerForWallTime
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};