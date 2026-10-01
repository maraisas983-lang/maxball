(function (root) {
  'use strict';

  function installInputLifecycle({ target, document, reset }) {
    const onVisibility = () => { if (document.hidden) reset(); };
    target.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      target.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  root.MaxballInput = Object.freeze({ installInputLifecycle });
})(globalThis);
