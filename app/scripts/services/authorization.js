'use strict';

angular.module("openshiftConsole")
  .factory("AuthorizationService", function($q, $log, $interval, DataService, APIService){
    function AuthorizationService() {
      this.rules = null;
      this.intervalTimer = null;
      this.forceReload = false;
      this.canCreateSomeResource = false;
      this.wasCanCreateSomeResourceSet = false;
      this.projectNameRules = null;
    }

    AuthorizationService.prototype.reviewUserRules = function($scope) {
      var self = this;
      var projectName = (!_.isUndefined($scope.project)) ? $scope.project.metadata.name : null;
      self.getProjectRules(projectName).then(
        function(userRulesLoaded) {
          if (userRulesLoaded) {
            $scope.canI = self.setPageRules($scope.canI);
          } else {
            $scope.alerts["rules"] = {
              type: "error",
              message: "Failed to load users rules."
            };
          }
        });
    };

    AuthorizationService.prototype.getProjectRules = function(ns) {
      var self = this;
      var deferred = $q.defer();
      if (!self.rules || self.forceReload || self.projectNameRules !== ns) {
        // Making an API call to get the rules if:
        // - no rules are cached
        // - when need to force update the rules(eg. switching from projects page to  project overview)
        // - when switching between projects
        $log.debug("AuthorizationService, loading user rules");
        if (self.forceReload) {
          self.setForceReload(false);
        }
        if (!self.intervalTimer) {
          // Force rules reload every 5 minutes
          self.intervalTimer = $interval(function () {
            self.setForceReload(true);
          }, 300000);
        }
        self.projectNameRules = ns;
        var object = {kind: "SelfSubjectRulesReview",
                      apiVersion: "v1"
                    };
        DataService.create('selfsubjectrulesreviews', null, object, {namespace: ns}).then(
          function(data) {
            self.rules = data.status.rules;
            deferred.resolve(true);
          }, function() {
            self.rules = null;
            deferred.resolve(false);
        });
      } else {
        // Using cached data.
        $log.debug("AuthorizationService, using cached rules");
        deferred.resolve(true);
      }
      return deferred.promise;
    };

    // Will traverse through all the user rules and determine what actions on the current page is user able to do.
    // In case no page rules are set, function will determine whether user can create some resources on the page
    // to know if the 'Add to Project' btn should be shown.
    AuthorizationService.prototype.setPageRules = function(pageRules) {
      var self = this;
      var canCreate = false;

      if (pageRules) {
        _.each(this.rules, function(rule) {
          _.each(pageRules, function(verbs, resource) {
            if (_.indexOf(rule.resources, resource) !== -1) {
              _.each(verbs, function(value, verb) {
                if (_.indexOf(rule.verbs, verb) !== -1) {
                  pageRules[resource][verb] = true;
                }
              });
            }
          });
          // It's enough if user can create just one type of resource. No need to check for more resources.
          if (!canCreate && _.indexOf(rule.verbs, "create") !== 1) {
            self.canCreateSomeResource = true;
            self.wasCanCreateSomeResourceSet = true;
            pageRules.createSomeResource = true;
          }
        });
      } else {
        // If there are no page rules to check, just use previously set 'wasCanCreateSomeResourceSet' attribute 
        // whether user can create some resources. If the attribute isn't cached set it by going through all the
        // rules. 
        if (self.wasCanCreateSomeResourceSet) {
          pageRules = {
            createSomeResource: self.canCreateSomeResource
          };
        } else {
          _.each(this.rules, function(rule) {
            if (!canCreate && _.indexOf(rule.verbs, "create") !== 1) {
              self.canCreateSomeResource = true;
              self.wasCanCreateSomeResourceSet = true;
              pageRules = {
                createSomeResource: self.canCreateSomeResource
              };
            }
          });
        }
      }

      return pageRules;
    };

    AuthorizationService.prototype.setForceReload = function(bool) {
      this.forceReload = bool;
    };

    AuthorizationService.prototype.getForceReload = function() {
      return this.forceReload; 
   };

    AuthorizationService.prototype.clearAll = function() {
      this.rules = null;
      this.forceReload = false;
      this.canCreateSomeResource = false;
      this.wasCanCreateSomeResourceSet = false;
      this.projectNameRules = null;
      $interval.cancel(this.intervalTimer);
    };

    // Determine whether a single action on a specified resource can be performed by user. The review result will be
    // added into the $scope.canI variable.
    // In case a resource shall to be added into the $scope.canI variable under a different unique name(eg. not as a 
    // resource kind) but a different unique name(eg. namespace), use the 'identifier' parameter.  
    AuthorizationService.prototype.canI = function(ns, verb, kind, $scope, identifier) {
      var kindObject = _.find(APIService.availableKinds(true), function(obj) {return obj.kind === kind;});
      var resource = APIService.kindToResource(kind);
      var object = {
        kind:"SubjectAccessReview",
        apiVersion:"v1",
        verb: verb,
        resource: resource,
        namespace: ns
      };
      if (kindObject.group) {
        object.resourceAPIGroup = kindObject.group;
      }
      identifier = identifier || resource;
      if (!$scope.canI) {
        $scope.canI = {};
      }
      if (!$scope.canI[identifier]) {
        $scope.canI[identifier] = {};
      }
      DataService.create('subjectaccessreviews', null, object, {namespace:ns}).then(
        function(data) {
          $scope.canI[identifier][verb] = data.allowed;
        }, function() {
          $scope.canI[identifier][verb] = false;
        });
    };

    return new AuthorizationService();
  });
