let ipv4Bootstrap = null;
let ipv6Bootstrap = null;
let dnsBootstrap = null;

async function fetchBootstrap(name) {
  const res = await fetch(`https://data.iana.org/rdap/${name}.json`);
  return res.json();
}

async function getIpv4Bootstrap() {
  if (!ipv4Bootstrap) ipv4Bootstrap = await fetchBootstrap('ipv4');
  return ipv4Bootstrap;
}

async function getIpv6Bootstrap() {
  if (!ipv6Bootstrap) ipv6Bootstrap = await fetchBootstrap('ipv6');
  return ipv6Bootstrap;
}

async function getDnsBootstrap() {
  if (!dnsBootstrap) dnsBootstrap = await fetchBootstrap('dns');
  return dnsBootstrap;
}

function isIPv4(s) {
  const parts = s.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function ipv4InCidr(ip, cidr) {
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

function expandIPv6Groups(ip) {
  let allParts;
  if (ip.includes('::')) {
    const [head, tail] = ip.split('::');
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail ? tail.split(':').filter(Boolean) : [];
    const missing = 8 - headParts.length - tailParts.length;
    const zeros = new Array(Math.max(missing, 0)).fill('0');
    allParts = [...headParts, ...zeros, ...tailParts];
  } else {
    allParts = ip.split(':');
  }
  return allParts.map((p) => parseInt(p || '0', 16));
}

function ipv6ToBigInt(ip) {
  return expandIPv6Groups(ip).reduce((acc, g) => (acc << 16n) + BigInt(g), 0n);
}

function ipv6InCidr(ip, cidr) {
  const [range, bitsStr] = cidr.split('/');
  const bits = BigInt(Number(bitsStr));
  const full = (1n << 128n) - 1n;
  const mask = bits === 0n ? 0n : (full << (128n - bits)) & full;
  return (ipv6ToBigInt(ip) & mask) === (ipv6ToBigInt(range) & mask);
}

function findIpService(bootstrap, ip, isV6) {
  for (const [cidrs, urls] of bootstrap.services) {
    for (const cidr of cidrs) {
      if (isV6 ? ipv6InCidr(ip, cidr) : ipv4InCidr(ip, cidr)) {
        return urls.find((u) => u.startsWith('https://')) || urls[0];
      }
    }
  }
  return null;
}

function findDomainService(bootstrap, domain) {
  const tld = domain.split('.').pop().toLowerCase();
  for (const [tlds, urls] of bootstrap.services) {
    if (tlds.map((x) => x.toLowerCase()).includes(tld)) {
      return urls.find((u) => u.startsWith('https://')) || urls[0];
    }
  }
  return null;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('query') || '').trim();

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isV6 = query.includes(':');
  const isIp = isIPv4(query) || isV6;

  try {
    const base = isIp
      ? findIpService(await (isV6 ? getIpv6Bootstrap() : getIpv4Bootstrap()), query, isV6)
      : findDomainService(await getDnsBootstrap(), query);

    if (!base) {
      return new Response(JSON.stringify({ error: 'No RDAP server found for this query' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const path = isIp ? `ip/${query}` : `domain/${query}`;
    const rdapUrl = base.endsWith('/') ? base + path : `${base}/${path}`;

    const res = await fetch(rdapUrl, { headers: { Accept: 'application/rdap+json' } });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: 'RDAP lookup failed', status: res.status, bodyPreview: text.slice(0, 300) }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'RDAP lookup failed', debug: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
