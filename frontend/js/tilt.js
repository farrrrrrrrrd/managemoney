/**
 * RIED 3D Perspective Tilt & Specular Physics
 * Gives Bento cards and virtual cards realistic claymorphic 3D depth on mouse move.
 */

export function initCardTilt(selector = '[data-tilt]') {
  const elements = document.querySelectorAll(selector);

  elements.forEach((el) => {
    let bounds = el.getBoundingClientRect();
    const maxTilt = parseFloat(el.getAttribute('data-tilt-max')) || 12;

    const onMouseEnter = () => {
      bounds = el.getBoundingClientRect();
      el.style.transition = 'transform 0.1s ease-out, box-shadow 0.15s ease-out';
    };

    const onMouseMove = (e) => {
      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const xPct = (mouseX / bounds.width) - 0.5;
      const yPct = (mouseY / bounds.height) - 0.5;

      const rotateX = (-yPct * maxTilt).toFixed(2);
      const rotateY = (xPct * maxTilt).toFixed(2);

      el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

      // Dynamic specular highlight shine
      const shine = el.querySelector('.tilt-shine');
      if (shine) {
        shine.style.background = `radial-gradient(circle at ${(xPct + 0.5) * 100}% ${(yPct + 0.5) * 100}%, rgba(255,255,255,0.25) 0%, transparent 60%)`;
      }
    };

    const onMouseLeave = () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease';
      el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      const shine = el.querySelector('.tilt-shine');
      if (shine) {
        shine.style.background = 'transparent';
      }
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
  });
}
