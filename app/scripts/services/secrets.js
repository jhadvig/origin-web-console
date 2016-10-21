'use strict';

angular.module("openshiftConsole")
  .factory("SecretsService", function(){

    var groupSecretsByType = function(secrets) {
      var secretsByType = {
        source: [],
        image: []
      };

      _.each(secrets.by('metadata.name'), function(secret) {
        switch (secret.type) {
          case 'kubernetes.io/basic-auth':
          case 'kubernetes.io/ssh-auth':
          case 'Opaque':
            secretsByType.source.push(secret);
            break;
          case 'kubernetes.io/dockercfg':
          case 'kubernetes.io/dockerconfigjson':
            secretsByType.image.push(secret);
            break;
        }
      });      
      return secretsByType;
    };

    var decodeDockercfg = function(decodedData) {
      var decodedSecretData = {};
      decodedData = JSON.parse(decodedData);
      _.each(decodedData, function(data, serverName) {
        decodedSecretData[serverName] = {
          username: data.username,
          password: data.password,
          email: data.email
        };
      });
      return decodedSecretData;
    };

    var decodeDockerconfigjson = function(decodedData) {
      var decodedSecretData = {};
      decodedData = JSON.parse(decodedData);
      _.each(decodedData.auths, function(data, serverName) {
        var usernamePassword = window.atob(data.auth).split(":");
        decodedSecretData[serverName] = {
          username: usernamePassword[0],
          password: usernamePassword[1],
          email: data.email
        };
      });
      return decodedSecretData;
    };

    var decodeSecretData = function(secretData) {
      var decodedSecretData = {};
      _.each(secretData, function(encodedData, paramName) {
        var decodedData = window.atob(encodedData);
        switch (paramName) {
          case ".dockercfg":
            decodedSecretData[paramName] = decodeDockercfg(decodedData);
            break;
          case ".dockerconfigjson":
            decodedSecretData[paramName] = decodeDockerconfigjson(decodedData);
            break;
          default:
            decodedSecretData[paramName] = window.atob(encodedData);
            break;
        }
      });
      return decodedSecretData;
    };

    return {
      groupSecretsByType: groupSecretsByType,
      decodeSecretData: decodeSecretData
    };
  });
