"use strict";

angular.module("openshiftConsole")

  .directive("oscSourceSecrets", function($uibModal, SecretsService) {
    return {
      restrict: 'E',
      scope: {
        pickedSecrets: "=model",
        secretsByType: '=',
        strategyType: '=',
        type: "@",
        displayType: "@",
        namespace: "=",
        alerts: '=',
        serviceAccountToLink: '@'
      },
      templateUrl: 'views/directives/osc-source-secrets.html',
      controller: function($scope) {

        $scope.canAddSourceSecret = function() {
          var lastSecret = _.last($scope.pickedSecrets);
          return ($scope.strategyType === "Custom") ? (!_.isEmpty(lastSecret.secretSource.name) && !_.isEmpty(lastSecret.mountPath)) : (!_.isEmpty(lastSecret.secret.name) && !_.isEmpty(lastSecret.destinationDir));
        };

        $scope.setLastSecretsName = function(secretName) {
          var lastSecret = _.last($scope.pickedSecrets);
          ($scope.strategyType === "Custom") ? lastSecret.secretSource.name = secretName : lastSecret.secret.name = secretName;
        };

        $scope.addSourceSecret = function() {
          ($scope.strategyType === "Custom") ? $scope.pickedSecrets.push({secretSource: {name: ""}, mountPath: ""}) : $scope.pickedSecrets.push({secret: {name: ""}, destinationDir: ""});
        };

        $scope.removeSecret = function(index) {
          if ($scope.pickedSecrets.length === 1) {
            $scope.pickedSecrets = ($scope.strategyType === "Custom") ? [{secretSource: {name: ""}, mountPath: ""}] : [{secret: {name: ""}, destinationDir: ""}];
            return;
          }
          $scope.pickedSecrets.splice(index,1);
          $scope.secretsForm.$setDirty();
        };
      },
      link: function($scope) {
        $scope.openCreateSecretModal = function() {
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
              $scope.setLastSecretsName(newestSecret);
            });
          });
        };
      }
    };
  });
