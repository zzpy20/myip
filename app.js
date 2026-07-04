let latestWhoami = null;
let loadFailed = false;

function row(label, value) {
  const div = document.createElement('div');
  div.className = 'row';
  div.innerHTML = `<div class="label">${label}</div><div class="value">${value ?? '—'}</div>`;
  return div;
}

function hostnameBadge(hostname) {
  if (!hostname) return `<span class="badge none">${t('none')}</span>`;
  return hostname;
}

function render() {
  const rowsEl = document.getElementById('rows');
  const locEl = document.getElementById('location-rows');

  if (loadFailed) {
    rowsEl.innerHTML = '';
    rowsEl.appendChild(row(t('error'), null));
    return;
  }

  if (!latestWhoami) {
    rowsEl.innerHTML = '';
    rowsEl.appendChild(row(t('loading'), null));
    return;
  }

  const data = latestWhoami;
  rowsEl.innerHTML = '';
  locEl.innerHTML = '';

  rowsEl.appendChild(row(data.version || 'IP', `<span class="badge ok">${t('supported')}</span>`));
  rowsEl.appendChild(row(t('address'), data.ip));
  rowsEl.appendChild(row(t('hostname'), hostnameBadge(data.hostname)));
  rowsEl.appendChild(row(t('isp'), data.isp));
  rowsEl.appendChild(row(t('organization'), data.organization));
  rowsEl.appendChild(row(t('asn'), data.asn));

  locEl.appendChild(row(t('country'), data.country));
  locEl.appendChild(row(t('region'), data.region));
  locEl.appendChild(row(t('city'), data.city));
  locEl.appendChild(row(t('postalCode'), data.postalCode));
  locEl.appendChild(row(t('timezone'), data.timezone));
  locEl.appendChild(
    row(t('coordinates'), data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : null)
  );
  locEl.appendChild(row(t('edgeColo'), data.colo));
}

async function loadWhoami() {
  render();

  try {
    const res = await fetch('/api/whoami');
    latestWhoami = await res.json();
  } catch {
    loadFailed = true;
  }

  render();
}

window.onLangChange = render;

loadWhoami();
