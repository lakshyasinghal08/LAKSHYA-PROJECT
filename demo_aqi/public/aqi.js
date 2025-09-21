// Simple frontend fetcher for FastAPI readings
(function () {
  async function fetchLatest() {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = 'Checking...';
    }
    try {
      const res = await fetch('http://localhost:5000/readings', { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const reading = await res.json();

      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val ?? '-');
      };

      setText('pm10', reading.pm10);
      setText('pm25', reading.pm25);
      setText('co2', reading.co2);
      setText('humidity', reading.humidity);
      setText('temperature', reading.temperature);

      if (statusEl) {
        statusEl.textContent = 'Backend Connected';
        statusEl.style.background = '#16a34a';
      }
    } catch (e) {
      console.error(e);
      if (statusEl) {
        statusEl.textContent = 'Backend Disconnected';
        statusEl.style.background = '#b91c1c';
      }
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('refresh');
    if (btn) btn.addEventListener('click', fetchLatest);
    fetchLatest();
  });
})();
