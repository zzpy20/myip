function isIPv4(s) {
  const parts = s.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
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

  const isIp = isIPv4(query) || query.includes(':');
  const rdapUrl = isIp
    ? `https://rdap.org/ip/${encodeURIComponent(query)}`
    : `https://rdap.org/domain/${encodeURIComponent(query)}`;

  try {
    const res = await fetch(rdapUrl, { headers: { Accept: 'application/rdap+json' } });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'RDAP lookup failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
