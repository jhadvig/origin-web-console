'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:BuildConfigController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('BuildConfigController', function ($scope, $routeParams, DataService, ProjectsService, BuildsService, $filter, LabelFilter, AlertMessageService, AuthorizationService) {
    $scope.projectName = $routeParams.project;
    $scope.buildConfigName = $routeParams.buildconfig;
    $scope.buildConfig = null;
    $scope.labelSuggestions = {};
    $scope.alerts = {};
    $scope.breadcrumbs = [
      {
        title: "Builds",
        link: "project/" + $routeParams.project + "/browse/builds"
      },
      {
        title: $routeParams.buildconfig
      }
    ];
    $scope.emptyMessage = "Loading...";

    $scope.canI = {
      "buildconfigs/instantiate": {
        create: false
      },
      buildconfigs: {
        update: false,
        delete: false
      }
    };

    AlertMessageService.getAlerts().forEach(function(alert) {
      $scope.alerts[alert.name] = alert.data;
    });
    AlertMessageService.clearAlerts();

    $scope.aceLoaded = function(editor) {
      var session = editor.getSession();
      session.setOption('tabSize', 2);
      session.setOption('useSoftTabs', true);
      editor.$blockScrolling = Infinity;
    };

    var orderByDate = $filter('orderObjectsByDate');
    var watches = [];

    ProjectsService
      .get($routeParams.project)
      .then(_.spread(function(project, context) {
        $scope.project = project;
        AuthorizationService.reviewUserRules($scope);
        DataService.get("buildconfigs", $routeParams.buildconfig, context).then(
          // success
          function(buildConfig) {
            $scope.loaded = true;
            $scope.buildConfig = buildConfig;
            $scope.paused = BuildsService.isPaused($scope.buildConfig);

            if ($scope.buildConfig.spec.source.images) {
              $scope.imageSources = $scope.buildConfig.spec.source.images;
              $scope.imageSourcesPaths = [];
              $scope.imageSources.forEach(function(imageSource) {
                $scope.imageSourcesPaths.push($filter('destinationSourcePair')(imageSource.paths));
              });
            }

            // If we found the item successfully, watch for changes on it
            watches.push(DataService.watchObject("buildconfigs", $routeParams.buildconfig, context, function(buildConfig, action) {
              if (action === "DELETED") {
                $scope.alerts["deleted"] = {
                  type: "warning",
                  message: "This build configuration has been deleted."
                };
              }
              $scope.buildConfig = buildConfig;
              $scope.paused = BuildsService.isPaused($scope.buildConfig);
            }));
          },
          // failure
          function(e) {
            $scope.loaded = true;
            $scope.alerts["load"] = {
              type: "error",
              message: e.status === 404 ? "This build configuration can not be found, it may have been deleted." : "The build configuration details could not be loaded.",
              details: e.status === 404 ? "Any remaining build history for this build will be shown." : "Reason: " + $filter('getErrorDetails')(e)
            };
          }
        );

      watches.push(DataService.watch("builds", context, function(builds, action, build) {
        $scope.emptyMessage = "No builds to show";
        if (!action) {
          $scope.unfilteredBuilds = builds.by("metadata.name");
        } else if (build.metadata.labels && build.metadata.labels.buildconfig === $routeParams.buildconfig) {
          var buildName = build.metadata.name;
          switch (action) {
            case 'ADDED':
            case 'MODIFIED':
              $scope.unfilteredBuilds[buildName] = build;
              break;
            case 'DELETED':
              delete $scope.unfilteredBuilds[buildName];
              break;
          }
        }

        $scope.builds = LabelFilter.getLabelSelector().select($scope.unfilteredBuilds);
        updateFilterWarning();
        LabelFilter.addLabelSuggestionsFromResources($scope.unfilteredBuilds, $scope.labelSuggestions);
        LabelFilter.setLabelSuggestions($scope.labelSuggestions);

        // Sort now to avoid sorting on every digest loop.
        $scope.orderedBuilds = orderByDate($scope.builds, true);
        $scope.latestBuild = $scope.orderedBuilds.length ? $scope.orderedBuilds[0] : null;
      },
      // params object for filtering
      {
        // http is passed to underlying $http calls
        http: {
          params: {
            labelSelector: 'buildconfig='+$scope.buildConfigName
          }
        }
      }));

        function updateFilterWarning() {
          if (!LabelFilter.getLabelSelector().isEmpty() && $.isEmptyObject($scope.builds) && !$.isEmptyObject($scope.unfilteredBuilds)) {
            $scope.alerts["builds"] = {
              type: "warning",
              details: "The active filters are hiding all builds."
            };
          }
          else {
            delete $scope.alerts["builds"];
          }
        }

        LabelFilter.onActiveFiltersChanged(function(labelSelector) {
          // trigger a digest loop
          $scope.$apply(function() {
            $scope.builds = labelSelector.select($scope.unfilteredBuilds);
            $scope.orderedBuilds = orderByDate($scope.builds, true);
            $scope.latestBuild = $scope.orderedBuilds.length ? $scope.orderedBuilds[0] : null;
            updateFilterWarning();
          });
        });

        $scope.startBuild = function() {
          BuildsService.startBuild($scope.buildConfig.metadata.name, context, $scope);
        };

        $scope.$on('$destroy', function(){
          DataService.unwatchAll(watches);
        });

    }));
  });
