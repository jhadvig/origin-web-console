"use strict";

angular.module("openshiftConsole")

  .directive("oscWebhookTriggers", function(
    $uibModal,
    $filter,
    APIService) {

    return {
      restrict: 'E',
      scope: {
        webhookSecrets: "=",
        namespace: "=",
        type: "@",
        webhookTriggers: "=",
        form: '='
      },
      templateUrl: 'views/directives/osc-webhook-triggers.html',
      controller: function($scope) {
        $scope.secretsVersion = APIService.getPreferredVersion('secrets');
        $scope.webhookTypesOptions = [{
          type: 'github',
          label: 'GitHub'
        }, {
          type: 'gitlab',
          label: 'GitLab'
        }, {
          type: 'bitbucket',
          label: 'Bitbucket'
        }, {
          type: 'generic',
          label: 'Generic'
        }];

        // Check if the webhook trigger contains only deprecated secret format.
        $scope.isDeprecated = function(trigger) {
          var triggerSecretData = $filter('getWebhookSecretData')(trigger);
          if (_.has(triggerSecretData, 'secret') && !_.has(triggerSecretData, 'secretReference.name')) {
            return true;
          }
          return false;
        };

        $scope.togglePassword = function(index) {
          var deprecatedInputField = $('.add-webhook-row .deprecated-secret input')[index];
          $(deprecatedInputField).attr('type') === 'password' ? $(deprecatedInputField).attr('type', 'text') : $(deprecatedInputField).attr('type', 'password');
        };

        $scope.removeWebhookTrigger = function(index) {
          if ($scope.webhookTriggers.length === 1) {
            var lonelyTrigger = _.first($scope.webhookTriggers);
            lonelyTrigger.lastTriggerType = "";
            lonelyTrigger.data = {
              type: ""
            };
          } else {
            $scope.webhookTriggers.splice(index,1);
          }
          $scope.form.$setDirty();
        };

        // Check if new or modified webhook trigger is a duplicate. If so, show a warning under the appropriate trigger
        var duplicityCheck = function(trigger) {
          var matchingTriggers = _.filter($scope.webhookTriggers, function(wehbookTrigger) {
            return _.isEqual(wehbookTrigger.data, trigger.data);
          });
          if (matchingTriggers.length > 1) {
            trigger.isDuplicit = true;
            return;
          }
          trigger.isDuplicit = false;
        };

        // When user changes the webhook trigger type move the secret data from the old one to the new one.
        $scope.triggerTypeChange = function(trigger) {
          var lastTriggerType = _.toLower(trigger.lastTriggerType);
          var newTriggerType = _.toLower(trigger.data.type);

          trigger.data = _.mapKeys(trigger.data, function(value, key) {
            if (key === lastTriggerType) {
              return newTriggerType;
            }
            return key;
          });
          trigger.lastTriggerType = trigger.data.type;
          duplicityCheck(trigger);
        };

        $scope.triggerSecretChange = function(trigger) {
          duplicityCheck(trigger);
        };

        var addWebhookTrigger = function() {
          $scope.webhookTriggers.push({
            lastTriggerType: "",
            data: {
              type: ""
            }
          });
        };

        // Check last trigger if it's type and secret are selected.
        $scope.checkLastAndAddNew = function() {
          var lastTrigger = _.last($scope.webhookTriggers);
          var lastTriggerSecretData = $filter('getWebhookSecretData')(lastTrigger);
          if (lastTrigger.data.type && (lastTriggerSecretData.secret || lastTriggerSecretData.secretReference.name)) {
            addWebhookTrigger();
          }
        };

        if (_.isEmpty($scope.webhookTriggers)) {
          addWebhookTrigger();
        }

        $scope.openCreateWebhookSecretModal = function() {
          var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'views/modals/create-secret.html',
            controller: 'CreateSecretModalController',
            scope: $scope
          });

          modalInstance.result.then(function(newSecret) {
            // Add the created secret into the webhook secret array
            $scope.webhookSecrets.push(newSecret);
          });
        };
      }
    };
  });
