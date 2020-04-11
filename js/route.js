
function Route(name, htmlName, isPost) {
  this.name = name;
  this.htmlName = htmlName;
  this.isPost = isPost || false;

  this.isActiveRoute = function(hashedPath) {
    return hashedPath.replace('#', '') === this.name; 
  }
}
