const translations = {
  en: {
    navHome: 'Home',
    navTools: 'Tools',
    footer: 'Personal tool — no ads, no tracking.',
    connectivity: 'Connectivity',
    location: 'Location',
    supported: 'Supported',
    none: 'None',
    address: 'Address',
    hostname: 'Hostname',
    isp: 'ISP',
    organization: 'Organization',
    asn: 'ASN',
    country: 'Country',
    region: 'Region',
    city: 'City',
    postalCode: 'Postal Code',
    timezone: 'Timezone',
    coordinates: 'Coordinates',
    edgeColo: 'Edge Colo',
    loading: 'Loading…',
    error: 'Failed to load IP info',
    tabWhois: 'WHOIS / ASN',
    tabDns: 'DNS Lookup',
    whoisPlaceholder: 'IP address, domain, or ASN (e.g. AS13335)',
    whoisHint: 'Looks up RDAP/WHOIS data for an IP or domain, or ASN details if you enter an AS number.',
    dnsPlaceholder: 'Domain, e.g. example.com',
    dnsHint: "Queries DNS records via Cloudflare's DNS-over-HTTPS resolver.",
    lookup: 'Lookup',
    lookingUp: 'Looking up…',
    lookupFailed: 'Lookup failed.',
  },
  zh: {
    navHome: '首页',
    navTools: '工具',
    footer: '个人工具 — 无广告，无追踪。',
    connectivity: '连接信息',
    location: '位置信息',
    supported: '支持',
    none: '无',
    address: '地址',
    hostname: '主机名',
    isp: '运营商',
    organization: '组织',
    asn: 'ASN',
    country: '国家',
    region: '地区',
    city: '城市',
    postalCode: '邮政编码',
    timezone: '时区',
    coordinates: '坐标',
    edgeColo: '边缘节点',
    loading: '加载中…',
    error: '获取 IP 信息失败',
    tabWhois: 'WHOIS / ASN 查询',
    tabDns: 'DNS 查询',
    whoisPlaceholder: 'IP 地址、域名或 ASN（如 AS13335）',
    whoisHint: '查询 IP 或域名的 RDAP/WHOIS 信息；输入 AS 号码则查询 ASN 详情。',
    dnsPlaceholder: '域名，例如 example.com',
    dnsHint: '通过 Cloudflare DNS-over-HTTPS 解析器查询 DNS 记录。',
    lookup: '查询',
    lookingUp: '查询中…',
    lookupFailed: '查询失败。',
  },
};

function getLang() {
  return localStorage.getItem('myip-lang') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');
}

function t(key) {
  const lang = getLang();
  return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
}

function updateSwitcherUI() {
  const lang = getLang();
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function setLang(lang) {
  localStorage.setItem('myip-lang', lang);
  applyTranslations();
  updateSwitcherUI();
  if (typeof window.onLangChange === 'function') window.onLangChange();
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  updateSwitcherUI();
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
});
