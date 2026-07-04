function row(label, value) {
  const div = document.createElement('div');
  div.className = 'row';
  div.innerHTML = `<div class="label">${label}</div><div class="value">${value ?? '—'}</div>`;
  return div;
}

function hostnameBadge(hostname) {
  if (!hostname) return '<span class="badge none">None</span>';
  return hostname;
}

async function loadWhoami() {
  const rowsEl = document.getElementById('rows');
  const locEl = document.getElementById('location-rows');
  rowsEl.appendChild(row('Status', 'Loading…'));

  try {
    const res = await fetch('/api/whoami');
    const data = await res.json();
    rowsEl.innerHTML = '';

    rowsEl.appendChild(row(data.version || 'IP', `<span class="badge ok">Supported</span>`));
    rowsEl.appendChild(row('Address', data.ip));
    rowsEl.appendChild(row('Hostname', hostnameBadge(data.hostname)));
    rowsEl.appendChild(row('ISP', data.isp));
    rowsEl.appendChild(row('Organization', data.organization));
    rowsEl.appendChild(row('ASN', data.asn));

    locEl.appendChild(row('Country', data.country));
    locEl.appendChild(row('Region', data.region));
    locEl.appendChild(row('City', data.city));
    locEl.appendChild(row('Postal Code', data.postalCode));
    locEl.appendChild(row('Timezone', data.timezone));
    locEl.appendChild(
      row('Coordinates', data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : null)
    );
    locEl.appendChild(row('Edge Colo', data.colo));
  } catch (err) {
    rowsEl.innerHTML = '';
    rowsEl.appendChild(row('Error', 'Failed to load IP info'));
  }
}

loadWhoami();
