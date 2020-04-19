
function Router(routes) {
  this.routes = routes;
  this.rootElem = document.getElementById('app');

  this.init = function() {
    var r = this.routes;

    (function(scope, r) { 
      window.addEventListener('hashchange', function () {
        scope.hasChanged(scope, r);
      });
    })(this, r);

    this.hasChanged(this, r);
  }

  this.hasChanged = function(scope, routes) {
    routes.forEach((route) => {
      if (route.isActiveRoute(window.location.hash.substr(1)) || route.name === 'Home') {
        scope.goToRoute(route);
      }
    });
  }

  this.goToRoute = function(route) {
    (function(scope) { 
      var url = `${route.isPost ? 'posts/' : 'views/'}${route.htmlName}`;
      var xhttp = new XMLHttpRequest();


      xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          scope.rootElem.innerHTML = this.responseText;
          window.scrollTo(0,0);
          $('script[src="js/prism.js"]').remove();
          $('body').append('<script src="js/prism.js"></script>');
        }
      };
      xhttp.open('GET', url, true);
      xhttp.send();
    })(this);
  }

}
