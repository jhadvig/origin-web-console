'use strict';

angular.module("openshiftConsole")
  .factory("SecretsService", function($q, $filter, DataService){

    var newestSecret;

    var setNewestSecretName = function(secretName) {
      newestSecret = secretName;
    };

    var getNewestSecretName = function() {
       return newestSecret;
    };

    var loadSecrets = function(projectName, $scope) {
      var deferred = $q.defer();
      var secretsByType = {
        source: [""],
        image: [""]
      };

      DataService.list("secrets", {namespace: projectName}, function(secrets) {
        _.each(secrets.by('metadata.name'), function(secret) {
          switch (secret.type) {
            case 'kubernetes.io/basic-auth':
            case 'kubernetes.io/ssh-auth':
            case 'Opaque':
              secretsByType.source.push(secret.metadata.name);
              break;
            case 'kubernetes.io/dockercfg':
            case 'kubernetes.io/dockerconfigjson':
              secretsByType.image.push(secret.metadata.name);
              break;
          }
        });
        deferred.resolve(secretsByType);
      },function(result) {
        $scope.alerts["loadSecrets"] = {
          type: "error",
          message: "Could not load secrets.",
          details: "Reason: " + $filter('getErrorDetails')(result)
        };
        deferred.resolve(secretsByType);
      });
      return deferred.promise;
    };

    return {
      loadSecrets: loadSecrets,
      setNewestSecretName: setNewestSecretName,
      getNewestSecretName: getNewestSecretName
    };
  });
