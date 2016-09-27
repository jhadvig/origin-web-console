"use strict";

angular.module("openshiftConsole")

  .directive("oscSecrets", function($uibModal, SecretsService) {
    return {
      restrict: 'E',
      scope: {
        pickedSecret: "=model",
        secretsByType: '=',
        namespace: "=",
        displayType: "@",
        type: "@",
        alerts: '=',
        serviceAccountToLink: '@'
      },
      templateUrl: 'views/directives/osc-secrets.html',
      link: function($scope) {

        $scope.openCreateSecretModal = function() {
          $scope.newSecret = {};
          var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'views/modals/create-secret.html',
            controller: 'CreateSecretModalController',
            scope: $scope
          });

          modalInstance.result.then(function(newSecret) {
            SecretsService.loadSecrets($scope.namespace, $scope.alerts).then(function(secretsByType) {
              $scope.secretsByType[$scope.type] = secretsByType[$scope.type];
              $scope.pickedSecret.name = newSecret.metadata.name;
            });
          });
        };
      }
    };
  });
