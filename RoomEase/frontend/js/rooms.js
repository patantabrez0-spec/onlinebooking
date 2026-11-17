(() => {
  const app = window.RoomEase;

  function roomCard(room) {
    const image = room.imageUrl
      ? `<img src="${app.escapeHtml(room.imageUrl)}" alt="${app.escapeHtml(room.name)}" loading="lazy">`
      : '<div class="room-placeholder" aria-hidden="true"><span>R</span></div>';
    return `<article class="room-card">
      <a class="room-image" href="/room-details.html?id=${encodeURIComponent(room._id)}">${image}<span class="image-tag">RoomEase stay</span></a>
      <div class="room-card-body">
        <p class="room-location">${app.escapeHtml(room.location)}</p>
        <h3><a href="/room-details.html?id=${encodeURIComponent(room._id)}">${app.escapeHtml(room.name)}</a></h3>
        <p class="room-description">${app.escapeHtml(room.description)}</p>
        <div class="room-card-footer"><span><strong>${app.formatPrice(room.pricePerNight)}</strong> / night</span><a class="text-link" href="/room-details.html?id=${encodeURIComponent(room._id)}">View stay →</a></div>
      </div>
    </article>`;
  }

  async function fetchRooms(query = '') {
    return (await app.api(`/api/rooms${query}`)).rooms;
  }

  async function loadFeaturedRooms() {
    const container = document.getElementById('featured-rooms');
    if (!container) return;
    try {
      const rooms = await fetchRooms();
      container.innerHTML = rooms.length
        ? rooms.slice(0, 3).map(roomCard).join('')
        : '<p class="empty-state">No rooms are listed yet. Check back soon.</p>';
    } catch (error) {
      container.innerHTML = '';
      app.showMessage('featured-message', error.message);
    }
  }

  async function loadRooms(search = '') {
    const container = document.getElementById('room-list');
    if (!container) return;
    container.innerHTML = '<p class="muted">Loading rooms...</p>';
    app.showMessage('room-message', '');
    try {
      const rooms = await fetchRooms(search);
      document.getElementById('room-count').textContent = `${rooms.length} ${rooms.length === 1 ? 'stay' : 'stays'}`;
      container.innerHTML = rooms.length
        ? rooms.map(roomCard).join('')
        : '<p class="empty-state">No rooms match those filters. Try changing your search.</p>';
    } catch (error) {
      container.innerHTML = '';
      app.showMessage('room-message', error.message);
    }
  }

  async function loadRoomDetails() {
    const container = document.getElementById('room-detail');
    if (!container) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      container.innerHTML = '<p class="empty-state">Choose a room from <a href="/rooms.html">available stays</a>.</p>';
      return;
    }

    try {
      const { room } = await app.api(`/api/rooms/${encodeURIComponent(id)}`);
      const image = room.imageUrl
        ? `<img src="${app.escapeHtml(room.imageUrl)}" alt="${app.escapeHtml(room.name)}">`
        : '<div class="room-placeholder detail-placeholder" aria-hidden="true"><span>R</span></div>';
      const amenities = room.amenities.length
        ? room.amenities.map((amenity) => `<span class="amenity">${app.escapeHtml(amenity)}</span>`).join('')
        : '<span class="muted">Ask us about room amenities.</span>';
      container.innerHTML = `<article class="room-detail-card">
        <div class="detail-image">${image}</div>
        <div class="detail-copy">
          <p class="room-location">${app.escapeHtml(room.location)}</p>
          <h1>${app.escapeHtml(room.name)}</h1>
          <p class="detail-description">${app.escapeHtml(room.description)}</p>
          <p class="capacity-line">Comfortably hosts <strong>${Number(room.capacity)} ${Number(room.capacity) === 1 ? 'guest' : 'guests'}</strong></p>
          <div class="amenities">${amenities}</div>
          <div class="detail-book-row"><p class="detail-price"><strong>${app.formatPrice(room.pricePerNight)}</strong><span> / night</span></p><a class="button" href="/booking.html?room=${encodeURIComponent(room._id)}">Book this room</a></div>
        </div>
      </article>`;
    } catch (error) {
      container.innerHTML = '';
      app.showMessage('room-message', error.message);
    }
  }

  const searchForm = document.getElementById('room-search');
  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const params = new URLSearchParams();
      for (const [key, value] of new FormData(searchForm).entries()) {
        if (String(value).trim()) params.set(key, String(value).trim());
      }
      loadRooms(params.size ? `?${params}` : '');
    });
    loadRooms();
  }

  loadFeaturedRooms();
  loadRoomDetails();
})();