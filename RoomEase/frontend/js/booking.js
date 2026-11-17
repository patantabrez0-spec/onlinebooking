(() => {
  const app = window.RoomEase;
  let selectedRoom = null;

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function requireUser() {
    if (!app.getToken()) {
      window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return null;
    }
    try {
      const { user } = await app.api('/api/auth/me');
      return user;
    } catch (error) {
      app.clearSession();
      window.location.href = '/login.html';
      return null;
    }
  }

  function updateEstimate(form) {
    const output = document.getElementById('booking-total');
    if (!output || !selectedRoom) return;
    const checkIn = form.elements.checkIn.value;
    const checkOut = form.elements.checkOut.value;
    const nights = (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000;
    if (!checkIn || !checkOut || !Number.isInteger(nights) || nights < 1) {
      output.textContent = 'Select valid dates to estimate your total.';
      return;
    }
    output.textContent = `${nights} ${nights === 1 ? 'night' : 'nights'} · ${app.formatPrice(selectedRoom.pricePerNight * nights)} total`;
  }

  async function setupBookingForm() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    if (!await requireUser()) return;

    const roomId = new URLSearchParams(window.location.search).get('room');
    if (!roomId) {
      document.getElementById('booking-room').innerHTML = '<p class="empty-state">Choose a <a href="/rooms.html">room to book</a> first.</p>';
      form.hidden = true;
      return;
    }

    try {
      const result = await app.api(`/api/rooms/${encodeURIComponent(roomId)}`);
      selectedRoom = result.room;
      document.getElementById('booking-room').innerHTML = `<div class="booking-room-info">
        <p class="room-location">${app.escapeHtml(selectedRoom.location)}</p>
        <h2>${app.escapeHtml(selectedRoom.name)}</h2>
        <p><strong>${app.formatPrice(selectedRoom.pricePerNight)}</strong> / night · up to ${Number(selectedRoom.capacity)} guests</p>
      </div>`;
      const today = localDateString(new Date());
      form.elements.checkIn.min = today;
      form.elements.checkOut.min = today;
      form.elements.guests.max = selectedRoom.capacity;
      form.elements.guests.value = Math.min(Number(form.elements.guests.value), selectedRoom.capacity);
    } catch (error) {
      form.hidden = true;
      app.showMessage('booking-message', error.message);
    }

    form.addEventListener('input', () => updateEstimate(form));
    form.elements.checkIn.addEventListener('change', () => {
      form.elements.checkOut.min = form.elements.checkIn.value || localDateString(new Date());
      if (form.elements.checkOut.value && form.elements.checkOut.value <= form.elements.checkIn.value) {
        form.elements.checkOut.value = '';
      }
      updateEstimate(form);
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity() || !selectedRoom) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      app.showMessage('booking-message', '');
      try {
        await app.api('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            roomId: selectedRoom._id,
            checkIn: form.elements.checkIn.value,
            checkOut: form.elements.checkOut.value,
            guests: Number(form.elements.guests.value)
          })
        });
        window.location.href = '/my-bookings.html?created=1';
      } catch (error) {
        app.showMessage('booking-message', error.message);
        button.disabled = false;
      }
    });
  }

  function bookingCard(booking, isAdmin = false) {
    const room = booking.room || {};
    const user = booking.user || {};
    const cancelButton = booking.status === 'cancelled' || booking.status === 'completed'
      ? ''
      : `<button class="button button-outline button-small" data-cancel-booking="${app.escapeHtml(booking._id)}">Cancel booking</button>`;
    const adminStatus = isAdmin
      ? `<label class="status-control">Status<select data-booking-status="${app.escapeHtml(booking._id)}">
          ${['pending', 'confirmed', 'cancelled', 'completed'].map((status) => `<option value="${status}" ${status === booking.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select></label><p class="booking-guest">Guest: ${app.escapeHtml(user.name || 'Unknown')} · ${app.escapeHtml(user.email || '')}</p>`
      : '';
    return `<article class="booking-card">
      <div class="booking-card-main">
        <p class="room-location">${app.escapeHtml(room.location || '')}</p>
        <h3>${app.escapeHtml(room.name || 'Room unavailable')}</h3>
        ${adminStatus}
        <p class="booking-dates">${app.formatDate(booking.checkIn)} – ${app.formatDate(booking.checkOut)} · ${Number(booking.guests)} ${Number(booking.guests) === 1 ? 'guest' : 'guests'}</p>
        <p class="booking-total">${app.formatPrice(booking.totalPrice)} <span>total</span></p>
      </div>
      <div class="booking-card-side"><span class="status-badge status-${app.escapeHtml(booking.status)}">${app.escapeHtml(booking.status)}</span>${cancelButton}</div>
    </article>`;
  }

  async function loadMyBookings() {
    const container = document.getElementById('bookings-list');
    if (!container) return;
    if (!await requireUser()) return;
    try {
      const { bookings } = await app.api('/api/bookings');
      container.innerHTML = bookings.length
        ? bookings.map((booking) => bookingCard(booking)).join('')
        : '<div class="empty-state"><h2>No bookings yet</h2><p>Your next favorite stay is waiting to be found.</p><a class="button" href="/rooms.html">Explore rooms</a></div>';
    } catch (error) {
      container.innerHTML = '';
      app.showMessage('booking-message', error.message);
    }
  }

  function resetRoomForm(form) {
    form.reset();
    form.elements.roomId.value = '';
    document.getElementById('room-form-title').textContent = 'Add a room';
    document.getElementById('cancel-edit').hidden = true;
  }

  function setRoomForm(form, room) {
    form.elements.roomId.value = room._id;
    form.elements.name.value = room.name;
    form.elements.description.value = room.description;
    form.elements.location.value = room.location;
    form.elements.pricePerNight.value = room.pricePerNight;
    form.elements.capacity.value = room.capacity;
    form.elements.imageUrl.value = room.imageUrl || '';
    form.elements.amenities.value = room.amenities.join(', ');
    document.getElementById('room-form-title').textContent = 'Edit room';
    document.getElementById('cancel-edit').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function setupAdmin() {
    const form = document.getElementById('room-form');
    if (!form) return;
    const user = await requireUser();
    if (!user) return;
    if (user.role !== 'admin') {
      document.querySelector('main').innerHTML = '<section class="empty-state"><h1>Administrator access required</h1><p>This page is only available to RoomEase administrators.</p><a class="button" href="/rooms.html">Explore rooms</a></section>';
      return;
    }

    let rooms = [];
    async function refreshAdminData() {
      try {
        const [roomResult, bookingResult] = await Promise.all([
          app.api('/api/rooms/admin'),
          app.api('/api/bookings?all=true')
        ]);
        rooms = roomResult.rooms;
        const roomContainer = document.getElementById('admin-rooms');
        roomContainer.innerHTML = rooms.length
          ? rooms.map((room) => `<article class="admin-room">
              <div><h3>${app.escapeHtml(room.name)}</h3><p>${app.escapeHtml(room.location)} · ${app.formatPrice(room.pricePerNight)} / night · ${room.available ? 'Listed' : 'Unlisted'}</p></div>
              <div class="form-actions"><button class="button button-outline button-small" data-edit-room="${app.escapeHtml(room._id)}">Edit</button><button class="button button-danger button-small" data-delete-room="${app.escapeHtml(room._id)}" ${room.available ? '' : 'disabled'}>Unlist</button></div>
            </article>`).join('')
          : '<p class="empty-state">No rooms yet. Add your first room using the form.</p>';
        const bookingContainer = document.getElementById('admin-bookings');
        bookingContainer.innerHTML = bookingResult.bookings.length
          ? bookingResult.bookings.map((booking) => bookingCard(booking, true)).join('')
          : '<p class="empty-state">There are no bookings yet.</p>';
      } catch (error) {
        app.showMessage('admin-message', error.message);
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const roomId = form.elements.roomId.value;
      const body = {
        name: form.elements.name.value.trim(),
        description: form.elements.description.value.trim(),
        location: form.elements.location.value.trim(),
        pricePerNight: Number(form.elements.pricePerNight.value),
        capacity: Number(form.elements.capacity.value),
        imageUrl: form.elements.imageUrl.value.trim(),
        amenities: form.elements.amenities.value.split(',').map((item) => item.trim()).filter(Boolean)
      };
      try {
        await app.api(roomId ? `/api/rooms/${encodeURIComponent(roomId)}` : '/api/rooms', {
          method: roomId ? 'PUT' : 'POST',
          body: JSON.stringify(body)
        });
        resetRoomForm(form);
        app.showMessage('admin-message', 'Room saved successfully.', 'success');
        await refreshAdminData();
      } catch (error) {
        app.showMessage('admin-message', error.message);
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById('cancel-edit').addEventListener('click', () => resetRoomForm(form));
    document.addEventListener('click', async (event) => {
      const editButton = event.target.closest('[data-edit-room]');
      if (editButton) {
        const room = rooms.find((item) => item._id === editButton.dataset.editRoom);
        if (room) setRoomForm(form, room);
        return;
      }
      const deleteButton = event.target.closest('[data-delete-room]');
      if (deleteButton) {
        if (!window.confirm('Unlist this room? Existing bookings will remain in the system.')) return;
        deleteButton.disabled = true;
        try {
          await app.api(`/api/rooms/${encodeURIComponent(deleteButton.dataset.deleteRoom)}`, { method: 'DELETE' });
          app.showMessage('admin-message', 'Room unlisted.', 'success');
          await refreshAdminData();
        } catch (error) {
          app.showMessage('admin-message', error.message);
          deleteButton.disabled = false;
        }
        return;
      }
      const cancelButton = event.target.closest('[data-cancel-booking]');
      if (cancelButton) {
        try {
          await app.api(`/api/bookings/${encodeURIComponent(cancelButton.dataset.cancelBooking)}/cancel`, { method: 'PATCH' });
          await refreshAdminData();
        } catch (error) {
          app.showMessage('admin-message', error.message);
        }
      }
    });

    document.addEventListener('change', async (event) => {
      const select = event.target.closest('[data-booking-status]');
      if (!select) return;
      try {
        await app.api(`/api/bookings/${encodeURIComponent(select.dataset.bookingStatus)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: select.value })
        });
        await refreshAdminData();
      } catch (error) {
        app.showMessage('admin-message', error.message);
      }
    });

    await refreshAdminData();
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-cancel-booking]');
    if (!button || document.getElementById('room-form')) return;
    if (!window.confirm('Cancel this booking?')) return;
    button.disabled = true;
    try {
      await app.api(`/api/bookings/${encodeURIComponent(button.dataset.cancelBooking)}/cancel`, { method: 'PATCH' });
      app.showMessage('booking-message', 'Booking cancelled.', 'success');
      await loadMyBookings();
    } catch (error) {
      app.showMessage('booking-message', error.message);
      button.disabled = false;
    }
  });

  setupBookingForm();
  loadMyBookings();
  setupAdmin();
})();