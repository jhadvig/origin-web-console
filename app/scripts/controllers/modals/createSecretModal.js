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

    $scope.postCreateAction = function(newSecret) {
      $uibModalInstance.close(newSecret);
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  });
