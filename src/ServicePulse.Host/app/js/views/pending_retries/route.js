﻿; (function (window, angular, undefined) {
    'use strict';

    function routeProvider($routeProvider) {
        $routeProvider.when('/pendingRetries', {
            data: {
                pageTitle: 'Pending Retries'
            },
            templateUrl: 'js/views/pending_retries/view.html',
            controller: 'pendingRetriesController',
            controllerAs: 'vm'
        });
    };

    routeProvider.$inject = [
        '$routeProvider'
    ];

    angular.module('sc')
        .config(routeProvider);

}(window, window.angular));