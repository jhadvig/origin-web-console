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
        $scope.istagHook = {};
        $scope.removedHookParams = {};

        $scope.actionType = _.has($scope.hookParams, 'tagImages') ? "tagImages" : "execNewPod";

        var setImageOptions = function(imageData) {
          var istag = {};
          if (!_.isEmpty(imageData)) {
            istag = {namespace: imageData.namespace || $scope.namespace, imageStream: imageData.name.split(':')[0], tagObject: {tag: imageData.name.split(':')[1]}};
          } else {
            istag = {namespace: $scope.namespace, imageStream: "", tagObject: {tag: ""}};
          }
          return istag;
        };

        var setParam = function(path, defaultValue) {
          _.set($scope.hookParams, path, _.get($scope.hookParams, path, defaultValue));
        };
        
        var setHookParams = function() {
          setParam(['failurePolicy'], "Abort");
          if ($scope.actionType === "execNewPod") {
            if (_.has($scope.removedHookParams, 'execNewPod')) {
              $scope.hookParams.execNewPod = $scope.removedHookParams.execNewPod;
              return;
            }
            setParam(['execNewPod', 'command'], []);
            setParam(['execNewPod', 'env'], []);
            setParam(['execNewPod', 'volumes'], []);
            setParam(['execNewPod', 'containerName'], $scope.availableContainers[0] || "");
          } else {
            if (_.has($scope.removedHookParams, 'tagImages')) {
              $scope.hookParams.tagImages = $scope.removedHookParams.tagImages;
              return;
            }
            setParam(['tagImages', '0', 'containerName'], $scope.availableContainers[0] || "");
            setParam(['tagImages', '0', 'to'], {});
            $scope.istagHook = setImageOptions(_.head($scope.hookParams.tagImages).to);
          }
        };

        setHookParams();

        $scope.addHook = function() {
          if (!_.isEmpty($scope.removedHookParams)) {
            $scope.hookParams = $scope.removedHookParams;
            $scope.view.hookExistes = true;
            return;
          }
          $scope.hookParams = {};
          setHookParams();
          $scope.view.hookExistes = true;
        };

        $scope.removeHook = function() {
          $scope.removedHookParams = $scope.hookParams;
          delete $scope.hookParams;
          $scope.view.hookExistes = false;
          $scope.editForm.$setDirty();
        };

        $scope.actionTypeChange = function(actionType) {
          $scope.actionType = actionType;
          if (actionType === 'execNewPod') {

            $scope.removedHookParams['tagImages'] = $scope.hookParams.tagImages;
            delete $scope.hookParams.tagImages;
          } else {
            $scope.removedHookParams['execNewPod'] = $scope.hookParams.execNewPod;
            delete $scope.hookParams.execNewPod;
          }
          setHookParams();
          console.log($scope.hookParams);
        };

        $scope.$watch("istagHook.tagObject.tag", function() {
          if (!_.has($scope.istagHook, ['tagObject', 'tag'])) {
            return;
          }
          // Assamble image name when tag changes
          _.set($scope.hookParams, ['tagImages', '0', 'to', 'kind'], 'ImageStreamTag');
          _.set($scope.hookParams, ['tagImages', '0', 'to', 'namespace'], $scope.istagHook.namespace);
          _.set($scope.hookParams, ['tagImages', '0', 'to', 'name'], $scope.istagHook.imageStream + ':' + $scope.istagHook.tagObject.tag);
        });
      }
    };
  });
