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
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=AS${asn}.asn.cymru.com&type=TXT`,
      { headers: { Accept: 'application/dns-json' } }
    );
    const data = await res.json();
    const answer = (data.Answer || []).find((a) => a.type === 16);

    if (!answer) {
      return new Response(JSON.stringify({ error: 'No ASN record found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TXT payload: "13335 | US | arin | 2010-07-14 | CLOUDFLARENET - Cloudflare, Inc., US"
    const raw = answer.data.replace(/^"|"$/g, '');
    const [asnNum, country, registry, allocated, name] = raw.split('|').map((s) => s.trim());

    return new Response(
      JSON.stringify({ asn: `AS${asnNum}`, name, country, registry, allocated }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ASN lookup failed', debug: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
