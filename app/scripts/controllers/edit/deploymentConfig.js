'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:EditDeploymentConfigController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('EditDeploymentConfigController', function ($scope, $routeParams, DataService, ProjectsService, $filter, ApplicationGenerator, Navigate, $location, AlertMessageService, SOURCE_URL_PATTERN, keyValueEditorUtils) {

    $scope.projectName = $routeParams.project;
    $scope.deploymentConfig = null;
    $scope.alerts = {};
    $scope.emptyMessage = "Loading...";
    $scope.options = {};

    $scope.breadcrumbs = [
      {
        title: $routeParams.project,
        link: "project/" + $routeParams.project
      },
      {
        title: "Deployments",
        link: "project/" + $routeParams.project + "/browse/deployments"
      },
      {
        title: $routeParams.deploymentconfig,
        link: "project/" + $routeParams.project + "/browse/deployments/" + $routeParams.deploymentconfig
      },
      {
      title: "Edit"
      }
    ];

    $scope.deploymtnyConfigStrategyTypes = [
      "Recreate",
      "Rolling",
      "Custom"
    ];


    AlertMessageService.getAlerts().forEach(function(alert) {
      $scope.alerts[alert.name] = alert.data;
    });
    AlertMessageService.clearAlerts();
    var watches = [];

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;

        // Update project breadcrumb with display name.
        $scope.breadcrumbs[0].title = $filter('displayName')(project);

        DataService.get("deploymentconfigs", $routeParams.deploymentconfig, context).then(
          // success
          function(deploymentConfig) {
            $scope.deploymentConfig = deploymentConfig;
            $scope.updatedDeploymentConfig = angular.copy($scope.deploymentConfig);


            // If we found the item successfully, watch for changes on it
            watches.push(DataService.watchObject("deploymentconfigs", $routeParams.deploymentconfig, context, function(deploymentConfig, action) {
              if (action === 'MODIFIED') {
                $scope.alerts["updated/deleted"] = {
                  type: "warning",
                  message: "This deployment configuration has changed since you started editing it. You'll need to copy any changes you've made and edit again."
                };
              }
              if (action === "DELETED") {
                $scope.alerts["updated/deleted"] = {
                  type: "warning",
                  message: "This deployment configuration has been deleted."
                };
                $scope.disableInputs = true;
              }
              $scope.deploymentConfig = deploymentConfig;
            }));
            $scope.loaded = true;
          },
          // failure
          function(e) {
            $scope.loaded = true;
            $scope.alerts["load"] = {
              type: "error",
              message: "The deployment configuration details could not be loaded.",
              details: "Reason: " + $filter('getErrorDetails')(e)
            };
          }
        );
      })
    );

    // $scope.aceLoaded = function(editor) {
    //   var session = editor.getSession();
    //   session.setOption('tabSize', 2);
    //   session.setOption('useSoftTabs', true);
    //   editor.$blockScrolling = Infinity;
    // };

    $scope.save = function() {
      $scope.disableInputs = true;
    };

    $scope.$on('$destroy', function(){
      DataService.unwatchAll(watches);
    });
  });
