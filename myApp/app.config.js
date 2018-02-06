angular.
  module('nightlifeApp').
  config(['$locationProvider' ,'$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.html5Mode(true);

      $routeProvider.
        when('/', {
          template: '<search-result></search-result>'
        }).
        otherwise('/');
    }
  ]);