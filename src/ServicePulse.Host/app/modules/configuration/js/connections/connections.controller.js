﻿; (function (window, angular, undefined) {
    'use strict';

    function controller(
        connectionsManager,
        $http,
        connectionsStatus) {
        var vm = this;

        var initialServiceControlUrl = connectionsManager.getServiceControlUrl();
        var initialMonitoringUrl = connectionsManager.getMonitoringUrl();

        vm.loadingData = false;
        vm.connectionsStatus = connectionsStatus;
        vm.configuredServiceControlUrl = initialServiceControlUrl;
        vm.configuredMonitoringUrl = initialMonitoringUrl;
        vm.isMonitoringEnabled = vm.configuredMonitoringUrl !== null && vm.configuredMonitoringUrl !== undefined;

        vm.testServiceControlUrl = () => {
            if (vm.configuredServiceControlUrl) {
                vm.testingServiceControl = true;
                $http.get(vm.configuredServiceControlUrl).then(() => {
                    vm.serviceControlValid = true;
                }, (error) => {
                    vm.serviceControlValid = false;
                }).then(() => {
                    vm.testingServiceControl = false;
                });
            }
        };

        vm.testMonitoringUrl = () => {
            if (vm.configuredMonitoringUrl) {
                vm.testingMonitoring = true;
                $http.get(vm.configuredMonitoringUrl).then(() => {
                    vm.monitoringValid = true;
                }, (error) => {
                    vm.monitoringValid = false;
                }).then(() => {
                    vm.testingMonitoring = false;
                });
            }
        };

        vm.save = () => {
            connectionsManager.updateConnections(vm.configuredServiceControlUrl, vm.configuredMonitoringUrl);
        };
    }

    controller.$inject = [
        'connectionsManager',
        '$http',
        'connectionsStatus',
    ];

    angular.module('configuration.connections')
        .controller('connectionsController', controller);

})(window, window.angular);