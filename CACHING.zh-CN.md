[English](CACHING.md) | **简体中文**

# 浏览器缓存问题：本项目如何避免内容过时

写给未来的自己，也方便日后在其他静态站点项目中复用。记录了我们遇到的问题、
叠加使用的两种解决方案，以及为什么两者缺一不可。

## 问题

每次部署之后，浏览器（Safari 和 Chrome 都出现过）仍然会继续使用
`index.html`、`tools.html` 或某个 `.js` 文件的旧缓存 —— 即使服务器已经有了新内容，
即使服务器当时已经在返回 `Cache-Control: public, max-age=0, must-revalidate`。
浏览器并不总是严格遵守「重新验证」这个约定，尤其是在标签页恢复、前进/后退导航、
以及磁盘缓存复用这些场景下。只靠 cache 头去指望浏览器「做正确的事」，可靠性
不够。

最终的解决办法是叠加两种彼此独立的手段：一种让 JS/CSS 的「过时」在结构上
*根本不可能发生*（通过 URL 本身做缓存失效处理），另一种则明确告诉链路上的每一层
缓存（浏览器、CDN、代理）应该如何对待每一类文件（`_headers` 文件）。

## 方案一：通过带版本号的 URL 实现缓存失效

**核心原理：** 浏览器缓存的 key 是完整的 URL，包括查询字符串（query
string）。在浏览器看来，`app.js?v=abc123` 和 `app.js?v=def456` 是两个完全独立
的缓存条目 —— 所以只要 URL 变了，就不存在「变旧」这回事。这从根本上绕开了浏览器
缓存策略的各种 bug/怪癖，因为浏览器根本没有被要求去复用或重新验证任何东西 ——
它看到的就是一个从未请求过的全新 URL。

**为什么不手动把 `?v=1`、`?v=2` 依次递增？** 这样做是可行的，但你必须记得每次
部署都手动改一下，很容易忘记（这个项目里我们就忘了两次）。真正的解法是：让版本号
自动从 git commit 的哈希值生成，因为「有新的 commit」本身就已经代表「内容变了」。

**先有鸡还是先有蛋的问题：** 如果你把 commit 哈希直接写进一个受 git 追踪的文件
再提交，那么这次提交的哈希值是在文件最终内容确定*之前*就已经计算好的 —— 也就是说
文件里写的哈希值永远会落后一个 commit，而且每次提交都会因为要更新这个版本号而
去改动 HTML 文件，让提交历史变得很乱。

**我们采用的解法：** 在提交到 git 的源文件里保留一个占位符
（`?v=__VERSION__`），只有在部署时才把真正的 commit 哈希替换进一份*临时*副本 ——
这份替换后的内容永远不会被提交。

`index.html` / `tools.html`（git 中实际保存的内容）：
```html
<script src="app.js?v=__VERSION__"></script>
```

`deploy.sh`：
```bash
#!/bin/bash
set -e
cd "$(dirname "$0")"

VERSION=$(git rev-parse --short HEAD)
FILES=(index.html tools.html)

restore() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak" ] && mv "$f.bak" "$f"
  done
}
trap restore EXIT

for f in "${FILES[@]}"; do
  cp "$f" "$f.bak"
  sed -i '' "s/__VERSION__/$VERSION/g" "$f"
done

wrangler pages deploy . --project-name myip --branch main "$@"
```

运行 `./deploy.sh` 时实际发生的事情：
1. 把 `index.html`/`tools.html` 备份为 `.bak`。
2. 把真实文件里的 `__VERSION__` 替换成当前的短 commit 哈希（例如
   `019121c`）。
3. 执行部署 —— 这时 Cloudflare 实际返回的是 `app.js?v=019121c`。
4. `trap restore EXIT` 会在部署成功或失败后都把占位符文件恢复回去，所以命令
   结束后立刻执行 `git status` 会看到工作区是干净的 —— 替换后的哈希值永远
   不会被提交进 git。

最终效果：每一次 commit 都会自动获得一套永久可缓存、且带有唯一版本标识的资源
URL，不需要任何手动维护，也不会给提交历史增加噪音。

## 方案二：`_headers` 文件

**这是什么：** 项目根目录下一个名为 `_headers` 的纯文本文件。不需要任何构建
步骤 —— Cloudflare Pages 会在部署时读取这个文件，并把里面列出的 HTTP 响应头
附加到匹配的路径上。（Netlify 也支持同样格式的文件，以后如果用到可以参考。）

**语法：** 单独一行写路径匹配规则，紧接着用缩进写若干行 `Header: value`，
应用于该路径。

我们项目里的内容：
```
/
  Cache-Control: no-cache

/tools
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/tools.html
  Cache-Control: no-cache

/app.js
  Cache-Control: public, max-age=31536000, immutable

/tools.js
  Cache-Control: public, max-age=31536000, immutable

/format.js
  Cache-Control: public, max-age=31536000, immutable

/i18n.js
  Cache-Control: public, max-age=31536000, immutable

/style.css
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: no-store
```

**每个指令实际的含义**（这部分是最值得记住的 —— 这几个名字其实很容易让人
误解）：
- `no-cache` —— 别被名字骗了，它其实*允许*缓存。它的意思是「可以缓存，但每次
  使用前都要先跟服务器重新验证」（通过 `If-None-Match`/ETag 发起条件请求）。如果
  内容没变，服务器会回复 `304 Not Modified`，浏览器就直接复用缓存内容 ——
  速度快、不用重新下载，但每次都确认过是最新的。用在 HTML 页面上，因为它们
  每次部署都可能变化，所以我们始终希望浏览器去检查一下。
- `no-store` —— 最严格的一种。这个响应*完全不缓存*，在任何地方、任何时候都
  不缓存。用在 `/api/*` 上，因为 IP/WHOIS/DNS 查询都是实时数据 —— 如果 WHOIS
  的查询结果被缓存了，你切换 VPN 之后看到的可能还是旧的网络信息。
- `public, max-age=31536000, immutable` —— 缓存一整年，甚至都不用去问服务器
  内容是否还有效。`immutable` 是浏览器专用的提示（尤其是 Firefox/Safari），
  连「强制刷新」时的重新验证请求都会跳过。这样做之所以安全，*唯一*的原因是
  这个 URL 本身已经会随着每次部署通过 `?v=<hash>` 变化 —— 根本不存在「需要让
  它失效」这件事，因为内容一旦变化，URL 就一定跟着变化。

**为什么两种方案都要保留，而不是只选一个：** 带版本号的 URL 对静态资源来说是
更强的保证（它不依赖任何缓存实现是否「表现正确」），但它只能解决你能控制、
并且通过 URL 引用的那些文件的问题 —— 它解决不了 *HTML 本身*（也就是你导航
到的、引用了这些文件的那个页面）的问题。`_headers` 正好补上了这个缺口，同时也
管控了浏览器版本号这个技巧覆盖不到的「中间层缓存」（比如 Cloudflare 自己的
边缘缓存、企业代理等）。两者合起来的效果是：HTML 每次都会重新验证，JS/CSS/
静态资源完全不需要重新验证，而 API 响应在任何地方都不会被缓存。

## 如何在未来的项目里复用这套方案

1. 复制 `deploy.sh`，把 `FILES=(...)` 改成你项目里实际引用了带版本号资源的
   那些 HTML 文件，并调整 `--project-name` 参数。
2. 在这些 HTML 文件里，给你自己控制的每一个 `<script src>` 和 `<link href>`
   都加上 `?v=__VERSION__`。
3. 复制 `_headers` 文件，把里面的资源文件名改成你项目对应的文件名，保持同样
   的三层模式：HTML 入口用 `no-cache`，带版本号的静态资源用 `immutable`，
   任何实时/API 路由用 `no-store`。
4. 部署时用 `./deploy.sh`，而不要直接调用 `wrangler pages deploy`。
5. 把 `*.bak`（deploy.sh 产生的临时备份文件）加进 `.gitignore`。

不需要任何构建工具、打包器或框架 —— 这套方案适用于任何纯 HTML/JS/CSS 的
静态站点。
