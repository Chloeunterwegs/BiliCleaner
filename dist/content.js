(()=>{"use strict";({481:function(e,t){var o=this&&this.__awaiter||function(e,t,o,n){return new(o||(o=Promise))((function(i,r){function l(e){try{d(n.next(e))}catch(e){r(e)}}function c(e){try{d(n.throw(e))}catch(e){r(e)}}function d(e){var t;e.done?i(e.value):(t=e.value,t instanceof o?t:new o((function(e){e(t)}))).then(l,c)}d((n=n.apply(e,t||[])).next())}))};Object.defineProperty(t,"__esModule",{value:!0});const n="[B站评论过滤器]";let i=0,r=0,l=!0,c=!1,d=!1,a=!1,s=0;function u(e){var t;if(console.log(`${n} 开始检查元素:`,{element:e,classes:e.className,attributes:Array.from(e.attributes).map((e=>`${e.name}=${e.value}`))}),e.getAttribute("data-v-fb1914c6"))return console.log(`${n} 命中数据属性过滤规则: data-v-fb1914c6`),!0;const o=['use[href="#palette-ad"]',".bili-video-card__info--ad",'[class*="creative-ad"]','[class*="ad-report"]','[href*="cm.bilibili.com"]'];for(const t of o){const o=e.querySelector(t);if(o)return console.log(`${n} 命中广告标记:`,{selector:t,matchedElement:o}),!0}const i=['use[href*="channel-movie"]','use[href*="channel-zhishi"]','use[href*="channel-zongyi"]','use[href*="channel-live"]','use[href*="channel-documentary"]','use[href*="channel-manhua"]','[href*="bangumi"]','[href*="cheese"]','[href*="variety"]','[href*="manga.bilibili.com"]'];for(const t of i){const o=e.querySelector(t);if(o)return console.log(`${n} 命中分类标记:`,{selector:t,matchedElement:o,href:o.getAttribute("href")}),!0}const r=e.querySelector(".badge .floor-title");if(r){const e=r.textContent||"";if(e.includes("纪录片")||e.includes("漫画"))return console.log(`${n} 命中标题文本:`,{text:e,element:r}),!0}const l=[".living",'use[href*="channel-live"]','a[href*="live.bilibili.com"]','a[href*="/live/"]'];for(const t of l){const o=e.querySelector(t);if(o)return console.log(`${n} 命中直播标记:`,{selector:t,matchedElement:o}),!0}const c=e.querySelector(".badge");return c&&(null===(t=c.textContent)||void 0===t?void 0:t.includes("直播"))?(console.log(`${n} 命中直播文本`),!0):(console.log(`${n} 元素通过检查，不需要隐藏`),!1)}const f=document.createElement("style");function m(e,t){let o;return(...n)=>{clearTimeout(o),o=setTimeout((()=>e(...n)),t)}}f.textContent="\n  .recommended-swipe {\n    display: none !important;\n  }\n\n  .filtered-video {\n    display: none !important;\n  }\n\n  /* 使用grid布局自动填充空缺 */\n  .feed-card, .bili-feed {\n    display: grid !important;\n    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;\n    gap: 20px !important;\n    padding: 0 20px !important;\n  }\n\n  .bili-video-card:not(.filtered-video) {\n    margin: 0 !important;\n    width: 100% !important;\n  }\n",document.head.appendChild(f);const h=new Set;function v(e){var t,c,d,a;l&&!h.has(e)&&(console.log(`${n} 开始处理视频卡片:`,{card:e,title:null===(c=null===(t=e.querySelector(".bili-video-card__info--tit"))||void 0===t?void 0:t.textContent)||void 0===c?void 0:c.trim(),uploader:null===(a=null===(d=e.querySelector(".bili-video-card__info--author"))||void 0===d?void 0:d.textContent)||void 0===a?void 0:a.trim()}),u(e)?(e.remove(),h.add(e),r++,console.log(`${n} 已移除内容:`,{card:e,reason:"匹配过滤规则"})):(h.add(e),i++),function(){o(this,void 0,void 0,(function*(){try{yield chrome.storage.local.set({filterStats:{processedCount:i,filteredCount:r,isActive:l}}),console.log(`${n} 统计数据已更新:`,{processedCount:i,filteredCount:r,isActive:l})}catch(e){console.error(`${n} 更新统计失败:`,e)}}))}())}function g(){const e=document.querySelectorAll(".bili-video-card:not(.hidden)");if(s=e.length,0===s&&!d&&!a){const e=window.innerHeight,t=document.documentElement.scrollHeight;window.scrollY+e+200>=t?(console.log(`${n} 当前页面无合格视频，触发懒加载`),function(){d=!0;const e=document.querySelector(".feed-load-anchor");if(e){const t=new IntersectionObserver((o=>{o.forEach((o=>{o.isIntersecting&&(console.log(`${n} 触发加载更多`),e.scrollIntoView(),t.disconnect(),setTimeout((()=>{document.querySelectorAll(".bili-video-card").length===s&&(console.log(`${n} 未检测到新内容加载，可能已到达底部`),a=!0),d=!1}),3e3))}))}),{root:null,rootMargin:"100px",threshold:.1});t.observe(e)}else console.log(`${n} 未找到加载触发点，可能已到达底部`),a=!0,d=!1}()):console.log(`${n} 等待用户滚动以加载更多内容`)}}function b(){if(!l)return;const e=document.querySelectorAll([".bili-video-card:not([data-filtered])",".feed-card:not([data-filtered])",".floor-card:not([data-filtered])"].join(","));if(0===e.length)return;let t=0;requestAnimationFrame((function o(){const n=Math.min(t+10,e.length);for(let o=t;o<n;o++){const t=e[o];v(t),t.setAttribute("data-filtered","true")}t=n,t<e.length?requestAnimationFrame(o):g()}))}const p=m((e=>{console.log(`${n} 检测到页面变化:`,{mutationsCount:e.length,timestamp:(new Date).toISOString()});const t=new Set;e.forEach((e=>{console.log(`${n} 处理变更:`,{type:e.type,addedNodes:e.addedNodes.length,target:e.target}),e.addedNodes.forEach((e=>{if(e instanceof Element){const o=e.querySelectorAll([".bili-video-card:not([data-filtered])",".feed-card:not([data-filtered])",".floor-card:not([data-filtered])"].join(","));console.log(`${n} 找到新卡片:`,{count:o.length,cards:Array.from(o).map((e=>{var t,o,n,i;return{title:null===(o=null===(t=e.querySelector(".bili-video-card__info--tit"))||void 0===t?void 0:t.textContent)||void 0===o?void 0:o.trim(),uploader:null===(i=null===(n=e.querySelector(".bili-video-card__info--author"))||void 0===n?void 0:n.textContent)||void 0===i?void 0:i.trim()}}))}),o.forEach((e=>t.add(e)))}}))})),t.size>0&&(console.log(`${n} 开始处理新片:`,{count:t.size,timestamp:(new Date).toISOString()}),requestAnimationFrame((()=>{t.forEach((e=>{v(e),e.setAttribute("data-filtered","true")})),console.log(`${n} 完成新卡片处理:`,{processedCount:h.size,timestamp:(new Date).toISOString()}),g()})))}),100);function y(){return o(this,void 0,void 0,(function*(){if(!window.location.pathname.match(/^\/($|index.html|video|space|search)/))return void console.log(`${n} 不是目标页面，插件不工作`);console.log(`${n} 插件启动`);const{hideNav:e=!1}=yield chrome.storage.local.get("hideNav");c=e,$(c),b(),console.log(`${n} 启动内容监听器`),new MutationObserver(p).observe(document.body,{childList:!0,subtree:!0,attributes:!1}),console.log(`${n} 内容监听器已启动`)}))}function $(e){e?document.body.classList.add("hide-nav"):document.body.classList.remove("hide-nav")}chrome.runtime.onMessage.addListener(((e,t,o)=>("TOGGLE_FILTER"===e.type&&(l=e.enabled,console.log(`${n} 过滤器状态更新:`,l),l&&b(),o({success:!0})),!0))),"loading"===document.readyState?document.addEventListener("DOMContentLoaded",y):y(),chrome.runtime.onMessage.addListener(((e,t,o)=>{"toggleNav"===e.type&&(c=e.value,$(c),o({success:!0}))})),new MutationObserver((e=>{for(const t of e)"childList"===t.type&&t.addedNodes.forEach((e=>{e instanceof HTMLElement&&(u(e)&&e.remove(),e.querySelectorAll(".bili-video-card, .floor-single-card").forEach((e=>{u(e)&&e.remove()})))}))})).observe(document.body,{childList:!0,subtree:!0}),document.querySelectorAll(".bili-video-card, .floor-single-card").forEach((e=>{u(e)&&(e.style.display="none")})),window.addEventListener("scroll",m((()=>{l&&g()}),200))}})[481](0,{})})();