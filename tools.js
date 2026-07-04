const tabWhois = document.getElementById('tab-whois');
const tabDns = document.getElementById('tab-dns');
const panelWhois = document.getElementById('panel-whois');
const panelDns = document.getElementById('panel-dns');

tabWhois.addEventListener('click', () => {
  tabWhois.classList.add('active');
  tabDns.classList.remove('active');
  panelWhois.style.display = '';
  panelDns.style.display = 'none';
});

tabDns.addEventListener('click', () => {
  tabDns.classList.add('active');
  tabWhois.classList.remove('active');
  panelDns.style.display = '';
  panelWhois.style.display = 'none';
});

document.getElementById('whois-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('whois-query').value.trim();
  const result = document.getElementById('whois-result');
  result.textContent = 'Looking up…';

  try {
    const isAsn = /^AS?\d+$/i.test(query);
    const url = isAsn
      ? `/api/asn?asn=${encodeURIComponent(query)}`
      : `/api/whois?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    result.textContent = 'Lookup failed.';
  }
});

document.getElementById('dns-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const domain = document.getElementById('dns-domain').value.trim();
  const type = document.getElementById('dns-type').value;
  const result = document.getElementById('dns-result');
  result.textContent = 'Looking up…';

  try {
    const res = await fetch(`/api/dns?domain=${encodeURIComponent(domain)}&type=${type}`);
    const data = await res.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    result.textContent = 'Lookup failed.';
  }
});
