const DNS_TYPE_NAMES = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
};

function vcardField(vcardArray, field) {
  if (!vcardArray || !Array.isArray(vcardArray[1])) return null;
  const entry = vcardArray[1].find((e) => e[0] === field);
  return entry ? entry[3] : null;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildRows(pairs) {
  return pairs
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => `<div class="row"><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div></div>`)
    .join('');
}

function formatAsn(data) {
  if (data.error) return buildRows([['Error', escapeHtml(data.error)]]);
  return buildRows([
    ['ASN', data.asn],
    ['Name', escapeHtml(data.name)],
    ['Country', countryName(data.country)],
    ['Registry', (data.registry || '').toUpperCase()],
    ['Allocated', data.allocated],
  ]);
}

function formatRdap(data) {
  if (data.error) return buildRows([['Error', escapeHtml(data.error)]]);

  const events = (data.events || [])
    .map((e) => `${e.eventAction}: ${formatDate(e.eventDate)}`)
    .map(escapeHtml)
    .join('<br>');

  const entities = (data.entities || [])
    .map((e) => {
      const roles = (e.roles || ['entity']).join(', ');
      const name = vcardField(e.vcardArray, 'fn') || vcardField(e.vcardArray, 'org') || e.handle || '—';
      return `${roles}: ${name}`;
    })
    .map(escapeHtml)
    .join('<br>');

  const cidrs = (data.cidr0_cidrs || [])
    .map((c) => `${c.v4prefix || c.v6prefix}/${c.length}`)
    .join(', ');

  const nameservers = (data.nameservers || []).map((ns) => ns.ldhName).join(', ');
  const status = (data.status || []).join(', ');

  return buildRows([
    ['Domain', data.ldhName],
    ['Handle', data.handle],
    ['Name', data.name],
    ['Range', data.startAddress ? `${data.startAddress} – ${data.endAddress}` : null],
    ['CIDR', cidrs],
    ['Country', countryName(data.country)],
    ['Type', data.type],
    ['Status', escapeHtml(status)],
    ['Nameservers', escapeHtml(nameservers)],
    ['Events', events],
    ['Contacts', entities],
  ]);
}

function formatDns(data) {
  if (data.Status !== 0 && !data.Answer) {
    return buildRows([['Error', 'No records found (DNS status ' + data.Status + ')']]);
  }
  if (!data.Answer || !data.Answer.length) {
    return buildRows([['Result', 'No records found']]);
  }

  const rows = data.Answer.map((a) => {
    const type = DNS_TYPE_NAMES[a.type] || a.type;
    return `<div class="row"><div class="label">${escapeHtml(a.name)} (${type}, TTL ${a.TTL})</div><div class="value">${escapeHtml(a.data)}</div></div>`;
  }).join('');

  return rows;
}
