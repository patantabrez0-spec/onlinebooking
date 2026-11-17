(() => {
  const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('roomease-user') || 'null');
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem('roomease-token');
  }

  function setSession(data) {
    localStorage.setItem('roomease-token', data.token);
    localStorage.setItem('roomease-user', JSON.stringify(data.user));
    updateNavigation();
  }

  function clearSession() {
    localStorage.removeItem('roomease-token');
    localStorage.removeItem('roomease-user');
    updateNavigation();
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch {
      throw new Error('Could not reach RoomEase. Check that the server is running.');
    }

    const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && token) clearSession();
      throw new Error(result.message || 'The request could not be completed.');
    }
    return result;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function showMessage(elementId, text, type = 'error') {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = text;
    element.className = `message ${type}`;
  }

  function formatPrice(value) {
    return currency.format(Number(value) || 0);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(value));
  }

  function updateNavigation() {
    const user = getUser();
    document.querySelectorAll('[data-guest-link]').forEach((item) => {
      item.hidden = Boolean(user);
    });
    document.querySelectorAll('[data-user-name]').forEach((item) => {
      item.hidden = !user;
      item.textContent = user ? `Hi, ${user.name}` : '';
    });
    document.querySelectorAll('[data-logout]').forEach((item) => {
      item.hidden = !user;
    });
    document.querySelectorAll('[data-admin-link]').forEach((item) => {
      item.hidden = !user || user.role !== 'admin';
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-logout]');
    if (!button) return;
    clearSession();
    window.location.href = '/';
  });

  updateNavigation();
  window.RoomEase = {
    api,
    clearSession,
    escapeHtml,
    formatDate,
    formatPrice,
    getToken,
    getUser,
    setSession,
    showMessage
  };
})();