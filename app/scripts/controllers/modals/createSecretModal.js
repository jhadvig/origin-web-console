'use strict';
/* jshint unused: false */

/**
 * @ngdoc function
 * @name openshiftConsole.controller:CreateSecretModalController
 * @description
 * # CreateSecretModalController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('CreateSecretModalController', function ($scope, $uibModalInstance) {
    $scope.modalAlerts = {};

    $scope.postCreateAction = function() {
      $uibModalInstance.close('create');
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  });
