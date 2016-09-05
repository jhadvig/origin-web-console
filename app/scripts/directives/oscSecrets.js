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

          modalInstance.result.then(function() {
            SecretsService.loadSecrets($scope.namespace, $scope.alerts).then(function(secretsByType) {
              var newestSecret = SecretsService.getNewestSecretName();
              // Ensure that the newly created secret is added
              $scope.secretsByType[$scope.type] = _.uniq(secretsByType[$scope.type].concat(newestSecret));
              $scope.pickedSecret.name = newestSecret;
            });
          });
        };
      }
    };
  });
