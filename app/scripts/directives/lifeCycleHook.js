"use strict";

angular.module("openshiftConsole")

  .directive("lifeCycleHook", function() {
    return {
      restrict: 'E',
      scope: {
        type: "@",
        hookParams: "=model",
        availableVolumes: "=",
        availableContainers: "=",
        namespace: "="
      },
      templateUrl: 'views/directives/life-cycle-hook.html',
      controller: function($scope) {
        $scope.view = {
          isDisabled: false
        }
        $scope.view.hookExistes = !_.isEmpty($scope.hookParams);

        $scope.lifecycleHookFailurePolicyTypes = [
          "Abort",
          "Retry",
          "Ignore"
        ];
        $scope.hookParams = $scope.hookParams || {};

        $scope.options = {
          tagImageHook: _.has($scope.hookParams, 'tagImages'),
          execNewPod: _.has($scope.hookParams, 'execNewPod')
        };

        var setHookParams = function(path, defaultValue) {
          _.set($scope.hookParams, path, _.get($scope.hookParams, path, defaultValue));
        }

        var setImageOptions = function(imageData) {
          var istag = {};
          if (!_.isEmpty(imageData)) {
            istag = {namespace: imageData.namespace || $scope.namespace, imageStream: imageData.name.split(':')[0], tagObject: {tag: imageData.name.split(':')[1]}};
          } else {
            istag = {namespace: $scope.namespace, imageStream: "", tagObject: {tag: ""}};
          }
          return istag;
        };

        setHookParams(['failurePolicy'], "Abort");

        setHookParams(['execNewPod', 'command'], []);
        setHookParams(['execNewPod', 'env'], []);
        setHookParams(['execNewPod', 'volumes'], []);
        setHookParams(['execNewPod', 'containerName'], "");

        setHookParams(['tagImages', '0', 'containerName'], "");
        setHookParams(['tagImages', '0', 'to'], {});

        $scope.istagHook = setImageOptions(_.head($scope.hookParams.tagImages).to);

        $scope.$watch("istagHook.tagObject.tag", function() {
          if (_.isEmpty($scope.istagHook.tagObject)) {
            return;
          }
          // Assamble image name when tag changes
          _.set($scope.hookParams, ['tagImages', '0', 'to', 'namespace'], $scope.istagHook.namespace);
          _.set($scope.hookParams, ['tagImages', '0', 'to', 'name'], $scope.istagHook.imageStream + ':' + $scope.istagHook.tagObject.tag);
        });
      }
    };
  });
