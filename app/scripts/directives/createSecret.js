"use strict";

angular.module("openshiftConsole")

  .directive("createSecret", function() {
    return {
      restrict: 'E',
      scope: {
        type: '=',
        serviceAccountToLink: '=',
        namespace: '=',
        alerts: '=',
        postCreateAction: '&',
        cancel: '&'
      },
      templateUrl: 'views/directives/create-secret.html',
      controller: function($scope, $filter, DataService, SecretsService) {

        $scope.secretAuthTypeMap = {
          image: {
            label: "Image Secret",
            authTypes: [
              {
                id: "kubernetes.io/dockercfg",
                label: "Docker Registry Credentials"
              },
              {
                id: "kubernetes.io/dockerconfigjson",
                label: "Docker Config"
              }
            ]
          },
          source: {
            label: "Source Secret",
            authTypes: [
              {
                id: "kubernetes.io/basic-auth",
                label: "Basic Authentication"
              },
              {
                id: "kubernetes.io/ssh-auth",
                label: "SSH Key"
              }
            ]
          }
        };

        $scope.secretTypes = _.keys($scope.secretAuthTypeMap);
        // newSecret format:
        //   - type:                       image || source
        //   - authType:                   image  = ["Credentials","Docker Config"]
        //                                 source = ["Basic Authentication", "SSH Key"]
        //   - data:                       based on the authentication type
        //   - pickedServiceAccountToLink  based on the view in which the directive is used.
        //                                  - if in BC the 'builder' SA if picked automatically
        //                                  - if in DC the 'deployer' SA if picked automatically
        //                                  - else the user will have to pick the SA and type of linking
        //   - linkAs                      user specifies how he wants to link the secret with SA
        //                                  - as a 'secrets'
        //                                  - as a 'imagePullSecret'
        $scope.newSecret = {
          type: $scope.type,
          authType: $scope.secretAuthTypeMap[$scope.type].authTypes[0].id,
          data: {},
          pickedServiceAccountToLink: $scope.serviceAccountToLink || "",
          linkAs: {
            secrets: $scope.type === 'source',
            imagePullSecrets: $scope.type === 'image'
          }
        };

        $scope.addGitconfig = false;

        DataService.list("serviceaccounts", {namespace: $scope.namespace}, function(result) {
          $scope.serviceAccounts = result.by('metadata.name');
          $scope.serviceAccountsNames = _.keys($scope.serviceAccounts);
        },function(result) {
          $scope.error = {
            message: 'Could not load service accounts.',
            details: $filter('getErrorDetails')(result)
          };
        });

        var constructSecret = function(data, authType) {
          var secret = {
            apiVersion: "v1",
            kind: "Secret",
            metadata: {
              name: $scope.newSecret.data.secretName
            },
            type: authType,
            data: {}
          };

          switch (authType) {
            case "kubernetes.io/basic-auth":
              secret.data = {password: window.btoa(data.password)};
              if (data.username) {
                secret.data.username = window.btoa(data.username);
              }
              if (data.gitconfig) {
                secret.data[".gitconfig"] = window.btoa(data.gitconfig);
              }
              break;
            case "kubernetes.io/ssh-auth":
              secret.data = {'ssh-privatekey': window.btoa(data.privateKey)};
              if (data.gitconfig) {
                secret.data[".gitconfig"] = window.btoa(data.gitconfig);
              }
              break;
            case "kubernetes.io/dockerconfigjson":
              var encodedConfig = window.btoa(data.dockerConfig);
              if (JSON.parse(data.dockerConfig).auths) {
                secret.data[".dockerconfigjson"] = encodedConfig;
              } else {
                secret.type = "kubernetes.io/dockercfg";
                secret.data[".dockercfg"] = encodedConfig;
              }
              break;
            case "kubernetes.io/dockercfg":
              var auth = window.btoa(data.dockerUsername + ":" + data.dockerPassword);
              var configData = {};
              configData[data.dockerServer] = {
                username: data.dockerUsername,
                password: data.dockerPassword,
                email: data.dockerMail,
                auth: auth
              };
              secret.data[".dockercfg"] = window.btoa(JSON.stringify(configData));
              break;
          }
          return secret;
        };

        var linkSecretToServiceAccount = function(secret) {
          var updatedSA = angular.copy($scope.serviceAccounts[$scope.newSecret.pickedServiceAccountToLink]);
          if ($scope.newSecret.linkAs.secrets) {
            updatedSA.secrets.push({name: secret.metadata.name});
          }
          if ($scope.newSecret.linkAs.imagePullSecrets) {
            updatedSA.imagePullSecrets.push({name: secret.metadata.name});
          }
          DataService.update('serviceaccounts', $scope.newSecret.pickedServiceAccountToLink, updatedSA, $scope).then(function(sa) {
            $scope.alerts["createAndLink"] = {
              type: "success",
              message: "Secret " + secret.metadata.name + " was created and linked with service account " + sa.metadata.name + "."
            };
          }, function(result){
            $scope.alerts["createAndLink"] = {
              type: "error",
              message: "An error occurred while linking the secret with service account.",
              details: $filter('getErrorDetails')(result)
            };
          });
        };

        $scope.create = function() {
          var newSecret = constructSecret($scope.newSecret.data, $scope.newSecret.authType);
          DataService.create('secrets', null, newSecret, $scope).then(function(secret) { // Success
            if ($scope.newSecret.pickedServiceAccountToLink) {
              linkSecretToServiceAccount(secret);
            } else {
              $scope.alerts["create"] = {
                type: "success",
                message: "Secret " + secret.metadata.name + " was created."
              };
            }
            SecretsService.setNewestSecretName($scope.newSecret.data.secretName);
            $scope.postCreateAction();
          }, function(result) { // Failure
            var alert = {
              type: "error",
              message: "An error occurred creating the secret.",
              details: $filter('getErrorDetails')(result)
            };
            if ($scope.modalAlerts) {
               $scope.modalAlerts["create"] = alert;
             } else {
              $scope.alerts["create"] = alert;
            }
          });
        };
      },
    };
  });
