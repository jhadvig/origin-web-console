'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:EditDeploymentConfigController
 * @description
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('EditDeploymentConfigController', function ($scope, $routeParams, $uibModal, DataService, BreadcrumbsService, SecretsService, ProjectsService, $filter, ApplicationGenerator, Navigate, $location, AlertMessageService, SOURCE_URL_PATTERN, keyValueEditorUtils) {

    $scope.projectName = $routeParams.project;
    $scope.deploymentConfig = null;
    $scope.alerts = {};
    $scope.emptyMessage = "Loading...";
    $scope.options = {};
    $scope.view = {
      advancedOptions: false
    }
    // $scope.pullSecrets = [];
    $scope.breadcrumbs = BreadcrumbsService.getBreadcrumbs({
      name: $routeParams.name,
      kind: $routeParams.kind,
      namespace: $routeParams.project,
      subpage: 'Edit',
      includeProject: true
    });

    $scope.deploymentConfigStrategyTypes = [
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
        $scope.context = context;
        DataService.get("deploymentconfigs", $routeParams.deploymentconfig, context).then(
          // success
          function(deploymentConfig) {
            $scope.deploymentConfig = deploymentConfig;

            $scope.breadcrumbs = BreadcrumbsService.getBreadcrumbs({
              object: deploymentConfig,
              project: project,
              subpage: 'Edit',
              includeProject: true
            });

            $scope.updatedDeploymentConfig = angular.copy($scope.deploymentConfig);
            $scope.containersName = _.map($scope.deploymentConfig.spec.template.spec.containers, 'name');
            // $scope.containersName = [''].concat(_.map($scope.deploymentConfig.spec.template.spec.containers, 'name'));

            $scope.containersDataMap = associateContainerWithData($scope.deploymentConfig.spec.template.spec.containers);
            $scope.triggersDataMap = associatetTriggersWithTag($scope.deploymentConfig.spec.triggers);
            $scope.pullSecrets = $scope.deploymentConfig.spec.template.spec.imagePullSecrets || [{name: ''}];
            $scope.volumes = _.map($scope.deploymentConfig.spec.template.spec.volumes, 'name');

            $scope.strategyData = angular.copy($scope.deploymentConfig.spec.strategy);
            $scope.strategyType = $scope.strategyData.type;
            $scope.originalStrategy = $scope.strategyData.type;
            $scope.displayedParams = getParamsString($scope.strategyData.type);
            // $scope.anyHooksDefined = _.has($scope.strategyData[$scope.displayedParams], 'pre') || _.has($scope.strategyData[$scope.displayedParams], 'mid') || _.has($scope.strategyData[$scope.displayedParams], 'post');
            
            DataService.list("secrets", context, function(secrets) {
              var secretsByType = SecretsService.groupSecretsByType(secrets);
              // Add empty option to the image/source secrets
              $scope.secretsByType = _.each(secretsByType, function(secretsArray) {
                secretsArray.unshift("");
              });
            });

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

    var associatetTriggersWithTag = function(triggers) {
      var triggersData = [];
      var imageChangeTriggers = _.filter(triggers, {type: 'ImageChange'});
      if (imageChangeTriggers) {
        $scope.options.hasDeploymentTriggers = true;
        _.each(imageChangeTriggers, function(trigger) {
          var triggerFromData = trigger.imageChangeParams.from;
          triggersData.push({
            data: trigger,
            istag: {namespace: triggerFromData.namespace || $scope.projectName, imageStream: triggerFromData.name.split(':')[0], tagObject: {tag: triggerFromData.name.split(':')[1]}}
          });
        })
      } else {
        $scope.options.hasDeploymentTriggers = false;
        triggersData.push({
          istag: {namespace: $scope.namespace, imageStream: "", tagObject: {tag: ""}}
        });
      }

      return triggersData;
    };

    var associateContainerWithData = function(containers) {
      var containersDataMap = {};
      _.each(containers, function(container) {
        containersDataMap[container.name] = 
        {
          envVars: container.env || [],
          imageName: container.image
        }
      });
      return containersDataMap;
    };

    $scope.strategyChange = function(pickedStrategy) {
      var pickedStrategyParams = getParamsString(pickedStrategy);
      switch (true) {
        case isRollingRecreateSwitch(pickedStrategy):

          if (!_.has($scope.strategyData, pickedStrategyParams)) {
            var modalInstance = $uibModal.open({
              animation: true,
              templateUrl: 'views/modals/confirm.html',
              controller: 'ConfirmModalController',
              resolve: {
                modalConfig: function() {
                  return {
                    alerts: $scope.alerts,
                    message: "Move the existing " + $scope.originalStrategy + " strategy parameters into " + pickedStrategy + " strategy parameters?",
                    details: "Moving will remove " + $scope.originalStrategy + " strategy parameters after the you save your changes.",
                    okButtonText: "Move",
                    okButtonClass: "btn-primary",
                    cancelButtonText: "Preserve"
                  };
                }
              }
            });

            modalInstance.result.then(function () {
              // Move parameters that belong to the origial strategy to the picked one.
              $scope.strategyData[pickedStrategyParams] = $scope.strategyData[getParamsString($scope.originalStrategy)];
              $scope.paramsMoved = getParamsString($scope.originalStrategy);
              postStrategyChange(pickedStrategy);
            }, function() {
              // Create empty parameters for the newly picked strategy
              $scope.strategyData[pickedStrategyParams] = {};
              postStrategyChange(pickedStrategy);
            });
          } else {
            postStrategyChange(pickedStrategy);
          }
          break;
        default:
          if (!_.has($scope.strategyData, pickedStrategyParams)) {
            if (pickedStrategy !== 'Custom') {
              $scope.strategyData[pickedStrategyParams] = {};
            } else {
              $scope.strategyData[pickedStrategyParams] = {
                image: "",
                command: [],
                environment: []
              }
            }
            
          }
          postStrategyChange(pickedStrategy);
          break;
      }
    };

    var postStrategyChange = function(pickedStrategy) {
      $scope.displayedParams = getParamsString(pickedStrategy);
      // $scope.anyHooksDefined = _.has($scope.strategyData[$scope.displayedParams], 'pre') || _.has($scope.strategyData[$scope.displayedParams], 'mid') || _.has($scope.strategyData[$scope.displayedParams], 'post');
    };

    var getParamsString = function(strategyType) {
      return strategyType.toLowerCase() + 'Params';
    }

    var updateEnvVars = function(pathToEnvs) {
      pathToEnvs = keyValueEditorUtils.compactEntries(pathToEnvs);
    };

    var isRollingRecreateSwitch = function(pickedStrategy) {
      return (pickedStrategy !== 'Custom' && pickedStrategy !== $scope.originalStrategy);
    };

    $scope.save = function() {
      console.log($scope.strategyData);
      console.log($scope.paramsMoved);
      return;
      $scope.disableInputs = true;

      // Update envVars for each container
      _.each($scope.containersDataMap, function(containerData, containerName) {
        var matchingContainer = _.find($scope.updatedDeploymentConfig.spec.template.spec.containers, function(o) { return o.name === containerName});
        matchingContainer.env = keyValueEditorUtils.compactEntries(containerData.envVars);
      });

      $scope.updatedDeploymentConfig.spec.template.spec.imagePullSecrets

      // Remove parameters of previously set strategy, if user moved 
      if ($scope.paramsMoved && isRollingRecreateSwitch($scope.strategyData.type)) {
        delete $scope.strategyData[getParamsString($scope.originalStrategy)];
      }
      if (_.has($scope.strategyData), [$scope.displayedParams, 'pre', 'execNewPod', 'env']) {
        updateEnvVars($scope.strategyData[$scope.displayedParams].pre.execNewPod.env);
      }
      $scope.updatedDeploymentConfig.spec.strategy = $scope.strategyData;


      DataService.update("deploymentconfigs", $scope.updatedDeploymentConfig.metadata.name, $scope.updatedDeploymentConfig, $scope.context).then(
        function() {
          AlertMessageService.addAlert({
            name: $scope.updatedDeploymentConfig.metadata.name,
            data: {
              type: "success",
              message: "Deployment Config " + $scope.updatedDeploymentConfig.metadata.name + " was successfully updated."
            }
          });
          $location.path(Navigate.resourceURL($scope.updatedDeploymentConfig, "Deployment Config", $scope.updatedDeploymentConfig.metadata.namespace));
        },
        function(result) {
          $scope.disableInputs = false;

          $scope.alerts["save"] = {
            type: "error",
            message: "An error occurred updating the " + $scope.updatedDeploymentConfig.metadata.name + "Deployment Config",
            details: $filter('getErrorDetails')(result)
          };
        }
      );

    };

    $scope.$on('$destroy', function(){
      DataService.unwatchAll(watches);
    });
  });
