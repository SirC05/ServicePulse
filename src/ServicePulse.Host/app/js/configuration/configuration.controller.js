﻿; (function (window, angular, $, undefined) {
    'use strict';

    function createWorkflowState(optionalStatus, optionalMessage) {
        return {
            status: optionalStatus || 'working',
            message: optionalMessage || 'working'
        };
    }

    function controller(
        $scope,
        $window,
        $timeout,
        configurationService) {

        $scope.model = { endpoints: [] };


        function autoGetEndPoints() {
            configurationService.getData()
                .then(function (response) {
                    if (response.data.length > 0) {
                        // need a map in some ui state for controlling animations
                        var endPoints = response.data.map(function (obj) {
                            var nObj = obj;
                            nObj.workflow_state = createWorkflowState('ready', '');
                            return nObj;
                        });

                        $scope.model.endpoints = endPoints;
                    }

                    
                });
        };

        $scope.update = function (id, monitor) {

            var result = $.grep($scope.model.endpoints, function (e) { return e.id === id; })[0];
            result.workflow_state = createWorkflowState('working', 'Updating');

         
            configurationService.update(id, monitor, 'Updating', 'Update Failed')
                .then(function (message) {
                    result.workflow_state = createWorkflowState('ready', message);
                    result.monitor_heartbeat = monitor;
                }, function (message) {
                    result.workflow_state = createWorkflowState('error', message);
                })
                .finally(function () {
         
                });
        };


        autoGetEndPoints();

    };

    controller.$inject = [
        '$scope',
        '$window',
        '$interval',
        'configurationService'];

    angular.module('configuration')
        .controller('ConfigurationCtrl', controller);

} (window, window.angular, window.jQuery));
