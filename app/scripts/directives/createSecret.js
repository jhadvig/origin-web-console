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
            authTypes: ["Docker Registry Credentials","Docker Config"]
          },
          source: {
            label: "Source Secret",
            authTypes: ["Basic Authentication", "SSH Key"]
          }
        };

        $scope.secretTypes = _.map($scope.secretAuthTypeMap, 'label');

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
          authType: $scope.secretAuthTypeMap[$scope.type].authTypes[0],
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

        function constructSecretDataAndType(data, authType) {
          var secretType = "";
          var secretData = {};
          switch (authType) {
            case "Basic Authentication":
              secretType = "kubernetes.io/basic-auth";
              secretData = {password: window.btoa(data.password)};
              if (data.username) {
                secretData.username = window.btoa(data.username);
              }
              if (data.gitconfig) {
                secretData[".gitconfig"] = window.btoa(data.gitconfig);
              }
              break;
            case "SSH Key":
              secretType = "kubernetes.io/ssh-auth";
              secretData = {'ssh-privatekey': window.btoa(data.privateKey)};
              if (data.gitconfig) {
                secretData[".gitconfig"] = window.btoa(data.gitconfig);
              }
              break;
            case "Docker Config":
              var encodedConfig = window.btoa(data.dockerConfig);
              if (data.dockerConfig.auths) {
                secretType = "kubernetes.io/dockerconfigjson";
                secretData[".dockerconfigjson"] = encodedConfig;
              } else {
                secretType = "kubernetes.io/dockercfg";
                secretData[".dockercfg"] = encodedConfig;
              }
              break;
            case "Docker Registry Credentials":
              secretType = "kubernetes.io/dockercfg";
              var auth = window.btoa(data.dockerUsername + ":" + data.dockerPassword);
              var configData = {};
              configData[data.dockerServer] = {
                username: data.dockerUsername,
                password: data.dockerPassword,
                email: data.dockerMail,
                auth: auth
              };
              secretData[".dockercfg"] = window.btoa(JSON.stringify(configData));
              break;
          }
          return {data: secretData, type: secretType};
        }

        $scope.create = function() {
          var secretDataAndType = constructSecretDataAndType($scope.newSecret.data, $scope.newSecret.authType);
          DataService.create('secrets', null, {
            apiVersion: "v1",
            kind: "Secret",
            type: secretDataAndType.type,
            metadata: {
              name: $scope.newSecret.data.secretName
            },
            data: secretDataAndType.data
          }, $scope).then(function(secret) { // Success
            if ($scope.newSecret.pickedServiceAccountToLink) {
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
