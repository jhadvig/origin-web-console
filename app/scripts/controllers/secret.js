'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:SecretController
 * @description
 * # ProjectController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('SecretController', function ($routeParams, $scope, AlertMessageService, DataService, ProjectsService, Navigate) {
    $scope.projectName = $routeParams.project;
    $scope.secretName = $routeParams.secret;
    $scope.showSecret = false;

    $scope.alerts = $scope.alerts || {};
    $scope.emptyMessage = "Loading...";

    $scope.breadcrumbs = [
      {
        title: "Secrets",
        link: "project/" + $routeParams.project + "/browse/secrets"
      },
      {
        title: $scope.secretName
      }
    ];

    AlertMessageService.getAlerts().forEach(function(alert) {
      $scope.alerts[alert.name] = alert.data;
    });

    AlertMessageService.clearAlerts();

    var decodeSecretData = function() {
      var decodedSecretData = {};
      var serverName;

      _.each($scope.secret.data, function(encodedData, paramName) {
        var decodedData = window.atob(encodedData);
        switch (paramName) {
          case ".dockercfg":
            decodedData = JSON.parse(decodedData);
            _.each(decodedData, function(data, serverName) {
              decodedSecretData[serverName] = {
                username: data.username,
                password: data.password,
                email: data.email
              }
            });
            break;
          case ".dockerconfigjson":

            decodedData = JSON.parse(decodedData);
            _.each(decodedData.auths, function(data, serverName) {
              var usernamePassword = window.atob(data.auth).split(":");
              decodedSecretData[serverName] = {
                username: usernamePassword[0],
                password: usernamePassword[1],
                email: data.email
              };
            });
            break;
          default:
            decodedSecretData[paramName] = window.atob(encodedData);
            break;
        }
      });
      return decodedSecretData;
    };

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        $scope.context = context;

        DataService.get("secrets", $scope.secretName, context).then(
          function(secret) {
            $scope.secret = secret;
            $scope.decodedSecretData = decodeSecretData();
            $scope.loaded = true;
          },
          function() {
            Navigate.toErrorPage("Cannot create from template: the specified template could not be retrieved.");
          });
    }));
  });
