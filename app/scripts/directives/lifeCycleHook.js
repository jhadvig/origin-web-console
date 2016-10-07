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
        };
        $scope.view.hookExistes = !_.isEmpty($scope.hookParams);

        $scope.lifecycleHookFailurePolicyTypes = [
          "Abort",
          "Retry",
          "Ignore"
        ];
        $scope.hookParams = $scope.hookParams;

        $scope.options = {
          tagImages: _.has($scope.hookParams, 'tagImages'),
          execNewPod: _.has($scope.hookParams, 'execNewPod')
        };

        var setHookParams = function(path, defaultValue) {
          _.set($scope.hookParams, path, _.get($scope.hookParams, path, defaultValue));
        };

        var setImageOptions = function(imageData) {
          var istag = {};
          if (!_.isEmpty(imageData)) {
            istag = {namespace: imageData.namespace || $scope.namespace, imageStream: imageData.name.split(':')[0], tagObject: {tag: imageData.name.split(':')[1]}};
          } else {
            istag = {namespace: $scope.namespace, imageStream: "", tagObject: {tag: ""}};
          }
          return istag;
        };

        $scope.addHook = function() {
          if ($scope.removedHookParams) {
            $scope.hookParams = $scope.removedHookParams;
            $scope.view.hookExistes = true;
            return;
          }
          $scope.hookParams = {};
          $scope.removedHookParams = {};

          setHookParams(['failurePolicy'], "Abort");

          setHookParams(['execNewPod', 'command'], []);
          setHookParams(['execNewPod', 'env'], []);
          setHookParams(['execNewPod', 'volumes'], []);
          setHookParams(['execNewPod', 'containerName'], $scope.availableContainers[0] || "");

          setHookParams(['tagImages', '0', 'containerName'], $scope.availableContainers[0] || "");
          setHookParams(['tagImages', '0', 'to'], {});

          $scope.istagHook = setImageOptions(_.head($scope.hookParams.tagImages).to);
          $scope.view.hookExistes = true;

          $scope.$watch("istagHook.tagObject.tag", function() {
            if (_.isEmpty($scope.istagHook.tagObject)) {
              return;
            }
            // Assamble image name when tag changes
            _.set($scope.hookParams, ['tagImages', '0', 'to', 'namespace'], $scope.istagHook.namespace);
            _.set($scope.hookParams, ['tagImages', '0', 'to', 'name'], $scope.istagHook.imageStream + ':' + $scope.istagHook.tagObject.tag);
          });

          $scope.$watch("options.tagImages", function(value) {
            if(value) {
              $scope.hookParams.tagImages = $scope.hookParams.tagImages || $scope.removedHookParams.tagImages;
            } else {
              $scope.removedHookParams.tagImages = $scope.hookParams.tagImages;
              delete $scope.hookParams.tagImages;
            }
          });

          $scope.$watch("options.execNewPod", function(value) {
            if(value) {
              $scope.hookParams.execNewPod = $scope.hookParams.execNewPod || $scope.removedHookParams.execNewPod;
            } else {
              $scope.removedHookParams.execNewPod = $scope.hookParams.execNewPod;
              delete $scope.hookParams.execNewPod;
            }
          });
        };

        $scope.removeHook = function() {
          $scope.removedHookParams = $scope.hookParams;
          delete $scope.hookParams;
          $scope.view.hookExistes = false;
        };
      }
    };
  });
