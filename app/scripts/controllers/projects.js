'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:ProjectsController
 * @description
 * # ProjectsController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('ProjectsController', function ($scope, $route, $timeout, $filter, $location, DataService, AuthService, AlertMessageService, Logger, hashSizeFilter, AuthorizationService) {
    $scope.projects = {};
    $scope.alerts = $scope.alerts || {};
    $scope.showGetStarted = false;

    // $scope.canI = {
    //   projectrequests: {
    //     create: false
    //   }
    // };

    AlertMessageService.getAlerts().forEach(function(alert) {
      $scope.alerts[alert.name] = alert.data;
    });
    AlertMessageService.clearAlerts();

    $timeout(function() {
      $('#openshift-logo').on('click.projectsPage', function() {
        // Force a reload. Angular doesn't reload the view when the URL doesn't change.
        $route.reload();
      });
    });

    $scope.$on('deleteProject', function() {
      loadProjects();
    });

    $scope.$on('$destroy', function(){
      // The click handler is only necessary on the projects page.
      $('#openshift-logo').off('click.projectsPage');
    });

    AuthService.withUser().then(function() {
      loadProjects();
    });

    AuthorizationService.setForceReload(true);
    // AuthorizationService.reviewUserRules($scope);

    AuthorizationService.canI(null, "create", "ProjectRequest", $scope);

    function loadProjects() {
      DataService.list("projects", $scope, function(projects) {
        $scope.projects = projects.by("metadata.name");
        $scope.showGetStarted = hashSizeFilter($scope.projects) === 0;
        canIDeleteProjects();
      });
    }

    function canIDeleteProjects() {
      _.each($scope.projects, function(project) {
        var projectName = project.metadata.name;
        AuthorizationService.canI(projectName, "delete", "Project", $scope, projectName);
      });
    }
  });
