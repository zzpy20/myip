export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const asn = (url.searchParams.get('asn') || '').trim().replace(/^AS/i, '');

  if (!/^\d+$/.test(asn)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid asn parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(`https://api.bgpview.io/asn/${asn}`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'ASN lookup failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
