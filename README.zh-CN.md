[English](README.md) | **简体中文**

# MyIP — 个人 IP 地址检测工具

一个无广告版本的 [ip.sb](https://ip.sb) 个人克隆：显示你的 IP 地址、运营商、ASN
和位置信息，并提供 WHOIS、ASN、DNS 查询工具。无广告、无追踪、不依赖第三方
GeoIP 数据库。

**在线地址：** https://myip.1000600.xyz

## 功能

- **IP 详情卡片** — 地址、主机名（反向 DNS）、运营商、组织、ASN、
  国家/地区/城市、时区、坐标、边缘节点。数据全部来自 Cloudflare 边缘节点自带的
  `cf` 对象，无需任何外部 API 调用。
- **WHOIS / RDAP 查询** — 查询 IP 或域名时，通过 IANA 官方的 bootstrap 文件
  直接路由到正确的区域注册机构（ARIN/RIPE/APNIC/LACNIC/AFRINIC）或域名后缀
  注册局，而不是经过一个会屏蔽 Cloudflare Workers 请求的第三方代理服务。
- **ASN 查询** — 通过 Team Cymru 的 DNS 查询方式获取 ASN 信息（与 DNS
  查询工具使用相同的 DNS-over-HTTPS 技术，避免使用不稳定的第三方 HTTP API）。
- **DNS 记录查询** — 通过 Cloudflare 的 DNS-over-HTTPS 解析器查询
  A/AAAA/MX/TXT/NS/CNAME/SOA 记录。
- **中英文切换** — 语言偏好保存在 `localStorage` 中，未设置时自动跟随浏览器
  语言。国家名称会根据当前语言完整显示（通过 `Intl.DisplayNames` 实现）。
- **结果可读化** — WHOIS/ASN/DNS 的查询结果以表格形式展示，并附带一个可折叠的
  「Raw JSON」区域查看完整原始数据。

## 技术栈

纯 HTML/CSS/JS，无框架、无构建步骤。后端由几个
[Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
（`functions/api/*.js`）组成。

## 项目结构

```
myip/
├── index.html          # IP 详情卡片（首页）
├── tools.html           # WHOIS/ASN + DNS 查询工具
├── style.css
├── app.js                # 渲染 IP 卡片
├── tools.js              # 查询表单/标签页交互逻辑
├── format.js             # 将 RDAP/DNS 的 JSON 转换为可读表格
├── i18n.js                # 中英文翻译 + 国家名称转换
├── functions/api/
│   ├── whoami.js         # 你的 IP/ASN/运营商/位置 + 反向 DNS
│   ├── whois.js           # RDAP 查询（IANA bootstrap 路由）
│   ├── asn.js              # ASN 查询（Team Cymru DNS）
│   └── dns.js               # DNS 记录查询（Cloudflare DoH）
├── deploy.sh              # 部署脚本 — 详见 CACHING.md
├── _headers                # Cloudflare Pages 缓存控制规则
└── wrangler.toml
```

## 本地开发

```bash
wrangler pages dev .
```

## 部署

```bash
./deploy.sh
```

请不要直接调用 `wrangler pages deploy` —— `deploy.sh` 会把当前 git commit 的
哈希值注入静态资源的 URL 中，确保浏览器在每次部署后都不会继续使用缓存的旧版本。
完整原理请参见 [CACHING.zh-CN.md](CACHING.zh-CN.md)。

## 文档

- [CACHING.zh-CN.md](CACHING.zh-CN.md)（[English](CACHING.md)）—
  缓存控制策略说明（git commit 哈希自动版本控制 + `_headers` 文件）：为什么
  需要它、每部分的原理，以及如何在其他静态站点项目中复用这套方案。
