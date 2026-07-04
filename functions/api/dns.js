const ALLOWED_TYPES = new Set(['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR']);

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const domain = (url.searchParams.get('domain') || '').trim();
  const type = (url.searchParams.get('type') || 'A').toUpperCase();

  if (!domain) {
    return new Response(JSON.stringify({ error: 'Missing domain parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'Unsupported record type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' } }
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'DNS lookup failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
