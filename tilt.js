(function () {
  // Skip on touch/non-hover devices and when reduced motion is preferred
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var card = document.querySelector('.card-container');
  if (!card) return;

  var maxTilt = 8;

  card.addEventListener('mousemove', function (e) {
    var rect = card.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var centerX = rect.width / 2;
    var centerY = rect.height / 2;

    var rotateX = ((y - centerY) / centerY) * -maxTilt;
    var rotateY = ((x - centerX) / centerX) * maxTilt;

    card.style.transform =
      'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';

    // Position the glare overlay
    card.style.setProperty('--mouse-x', ((x / rect.width) * 100) + '%');
    card.style.setProperty('--mouse-y', ((y / rect.height) * 100) + '%');
  });

  card.addEventListener('mouseleave', function () {
    // Slow spring-back on leave
    card.style.transition = 'transform 0.4s ease-out, box-shadow 0.3s ease';
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
  });

  card.addEventListener('mouseenter', function () {
    // Fast tracking while hovering
    card.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s ease';
  });
})();
