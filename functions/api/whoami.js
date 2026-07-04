function reverseIPv4(ip) {
  return ip.split('.').reverse().join('.') + '.in-addr.arpa';
}

function expandIPv6(ip) {
  if (ip.includes('::')) {
    const [head, tail] = ip.split('::');
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = 8 - headParts.length - tailParts.length;
    const zeros = new Array(Math.max(missing, 0)).fill('0');
    return [...headParts, ...zeros, ...tailParts].map((p) => p.padStart(4, '0')).join('');
  }
  return ip.split(':').map((p) => p.padStart(4, '0')).join('');
}

function reverseIPv6(ip) {
  return expandIPv6(ip).split('').reverse().join('.') + '.ip6.arpa';
}

async function ptrLookup(ip) {
  const name = ip.includes(':') ? reverseIPv6(ip) : reverseIPv4(ip);
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=PTR`, {
      headers: { Accept: 'application/dns-json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const answer = (data.Answer || []).find((a) => a.type === 12);
    return answer ? answer.data.replace(/\.$/, '') : null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request }) {
  const cf = request.cf || {};
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const hostname = ip ? await ptrLookup(ip) : null;

  const body = {
    ip: ip || null,
    version: ip.includes(':') ? 'IPv6' : ip ? 'IPv4' : null,
    hostname,
    isp: cf.asOrganization || null,
    organization: cf.asOrganization || null,
    asn: cf.asn ? `AS${cf.asn}` : null,
    country: cf.country || null,
    region: cf.region || null,
    city: cf.city || null,
    postalCode: cf.postalCode || null,
    timezone: cf.timezone || null,
    latitude: cf.latitude || null,
    longitude: cf.longitude || null,
    colo: cf.colo || null,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
