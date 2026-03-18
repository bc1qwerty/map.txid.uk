/**
 * global-nav.js — txid.uk 전체 사이트 공통 네비게이션
 * 사용법: <script src="https://apps.txid.uk/global-nav.js" defer></script>
 */
(function () {
  'use strict';

  var SITES = [
    { label: 'txid',      url: 'https://txid.uk',          host: 'txid.uk' },
    { label: 'tools',     url: 'https://tools.txid.uk',    host: 'tools.txid.uk' },
    { label: 'viz',       url: 'https://viz.txid.uk',      host: 'viz.txid.uk' },
    { label: 'stats',     url: 'https://stats.txid.uk',    host: 'stats.txid.uk' },
    { label: 'nodes',     url: 'https://nodes.txid.uk',    host: 'nodes.txid.uk' },
    { label: 'map',       url: 'https://map.txid.uk',      host: 'map.txid.uk' },
    { label: 'portfolio', url: 'https://portfolio.txid.uk',host: 'portfolio.txid.uk' },
    { label: 'tx',        url: 'https://tx.txid.uk',       host: 'tx.txid.uk' },
    { label: 'id',        url: 'https://id.txid.uk',       host: 'id.txid.uk' },
    { label: 'learn',     url: 'https://learn.txid.uk',    host: 'learn.txid.uk' },
    { label: 'sim',       url: 'https://sim.txid.uk',      host: 'sim.txid.uk' },
    { label: 'glossary',  url: 'https://glossary.txid.uk', host: 'glossary.txid.uk' },
    { label: 'macro',     url: 'https://macro.txid.uk',    host: 'macro.txid.uk' },
    { label: 'apps',      url: 'https://apps.txid.uk',     host: 'apps.txid.uk' },
  ];

  var current = window.location.hostname;

  var links = SITES.map(function (s, i) {
    var active = (current === s.host || current === 'localhost') && i === 0
      ? ' txid-nav-active'
      : (current === s.host ? ' txid-nav-active' : '');
    return '<a href="' + s.url + '"' + (active ? ' class="txid-nav-active"' : '') + '>' + s.label + '</a>';
  }).join('<span class="txid-nav-sep">·</span>');

  var html = '<nav id="txid-global-nav">'
    + '<span class="txid-nav-brand">₿</span>'
    + '<span class="txid-nav-sep">|</span>'
    + links
    + '</nav>';

  function inject() {
    if (document.getElementById('txid-global-nav')) return;
    // Load CSS via external file (CSP compliant — no dynamic <style>)
    if (!document.getElementById('txid-global-nav-css')) {
      var link = document.createElement('link');
      link.id = 'txid-global-nav-css';
      link.rel = 'stylesheet';
      link.href = '/global-nav-v2.css';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
})();
