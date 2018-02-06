/* globals angular */
angular
  .module('searchResult')
  .component('searchResult', {
    templateUrl : "/search/search.tempelate.html",
    controller: function seachResultController($rootScope, $http){
      var self = this;
      var resEnd = false;
      var search = false;
      var previousTerm;
      self.term = null
      self.result = null
      self.list = null
      self.grouped= []
      $rootScope.getTerm = function display() {
        self.term = angular.copy($rootScope.term);
        previousTerm =  self.term
        if (self.term != undefined && search === false || previousTerm !== self.term){
          getData()
          self.grouped = [];
          search = true
        }
      }
      function getData(){
          $http({
            method : "post",
            url : "/search/"+self.term
          }).then(function(response) {
            self.result = response.data
            $http({
              method : "post",
              url : "/allresults"
            }).then(function(response) {
              self.list = response.data
              self.result.forEach(function(business){
                var temp = self.list.filter(function(a){
                  return a._id === business.id
                })
                if (temp.length !== 0){
                  self.grouped.push({business : business, record: temp[0]})
                } else {             
                  self.grouped.push({business : business, record: {total: "0"}})
                }
              })
              search === false;
            })
          });
        }
      self.going = function(event){
        if (resEnd === false){
          resEnd = true
          $http({
            method : "post",
            url : "/update/"+$(event.target.id).selector+"/"+self.term
          }).then(function(response) {
            if (response.data === "login"){
              window.open("https://where-you-at.glitch.me/login", "_parent")
            } else {
              event.target.innerHTML = response.data
              resEnd = false;
            }
          });
        }
      }
      function check(){
        $http({
            method : "post",
            url : "/check"
          }).then(function(response) {
            if (response.data !== "not logged"){
              self.term = response.data
              previousTerm = self.term
              getData();
            }
          });
      }
      check();
    }
  })