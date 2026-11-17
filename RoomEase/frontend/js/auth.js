(() => {
  const app = window.RoomEase;
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  async function submitAuthForm(form, endpoint) {
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    app.showMessage('auth-message', '');

    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await app.api(`/api/auth/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      app.setSession(result);
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const safePath = requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
        ? requestedPath
        : '';
      window.location.href = safePath || (result.user.role === 'admin' ? '/admin.html' : '/my-bookings.html');
    } catch (error) {
      app.showMessage('auth-message', error.message);
      button.disabled = false;
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (loginForm.reportValidity()) submitAuthForm(loginForm, 'login');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (registerForm.reportValidity()) submitAuthForm(registerForm, 'register');
    });
  }
})();