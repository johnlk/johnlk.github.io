
(function () {
  var router = new Router([
    new Route('Home', 'home.html'),
    new Route('PrivacyPolicy', 'privacy-policy.html'),
    // posts
    new Route('3-22-2020', '3-22-2020.html', true),
    new Route('4-12-2020', '4-12-2020.html', true),
    new Route('4-18-2020', '4-18-2020.html', true),
  ]);

  router.init();
}());
