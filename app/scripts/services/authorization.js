'use strict';

angular.module("openshiftConsole")
  .factory("AuthorizationService", function($q, Logger, $interval, DataService, APIService){
    function AuthorizationService() {
      this.rules = null;
      this.intervalTimer = null;
      this.forceReload = false;
      this.canICreateSomeResource = false;
      this.projectNameRules = null;
    }

    var normalizeRules = function(rules) {
      var normalizedRules = {};
      _.each(rules, function(rule) {
        _.each(rule.resources, function(resource) {
          // console.log(rule.apiGroups);
          normalizedRules[resource] = rule.verbs;
        });
      });
      return normalizedRules;
    };

    AuthorizationService.prototype.getProjectRules = function(projectName) {
      var self = this;
      var deferred = $q.defer();
      if (!self.rules || projectName !== self.projectNameRules) {
        // Making an API call to get the rules if:
        // - no rules are cached
        // - when need to force update the rules
        // - when switching between projects
        Logger.log("AuthorizationService, loading user rules");
        console.log("AuthorizationService, loading user rules");
        if (self.forceReload) {
          self.setForceReload(false);
        }
        if (!self.intervalTimer) {
          // Force rules reload every 10 minutes
          self.intervalTimer = $interval(function () {
            self.setForceReload(true);
          }, 600000);
        }
        self.projectNameRules = projectName;
        var object = {kind: "SelfSubjectRulesReview",
                      apiVersion: "v1"
                    };
        DataService.create('selfsubjectrulesreviews', null, object, {namespace: projectName}).then(
          function(data) {
            self.rules = normalizeRules(data.status.rules);
            deferred.resolve(data.status.rules);
          }, function() {
            self.rules = null;
            deferred.reject(null);
        });
      } else {
        // Using cached data.
        Logger.log("AuthorizationService, using cached rules");
        console.log("AuthorizationService, using cached rules");
        self.rules = self.getRules();
        deferred.resolve(self.rules);
      }
      return deferred.promise;
    };

    // Method to determine if user can perform specified action on a resource.
    // If resource is not specified, all resources will be checked if the action
    // can be performed.
    AuthorizationService.prototype.canI = function(resource, verb) {
      var rules = this.getRules();
      if (rules) {
        if (resource) {
          return _.contains(rules[resource], verb);
        } else {
          return _.some(rules, function(verbs) {
            return _.contains(verbs, verb);
          });
        }
      } else {
        return false;
      }
    };

    AuthorizationService.prototype.setForceReload = function(bool) {
      this.forceReload = bool;
    };

    AuthorizationService.prototype.getRules = function() {
      return this.rules;
    };

    return new AuthorizationService();
  });
