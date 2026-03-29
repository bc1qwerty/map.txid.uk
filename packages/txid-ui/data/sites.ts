export interface SiteItem {
  label: string;
  url: string;
  host: string;
  icon: string;
  name: { ko: string; en: string; ja: string };
}

export const sites: SiteItem[] = [
  {
    label: 'txid', url: 'https://txid.uk', host: 'txid.uk',
    icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    name: { ko: '탐색기', en: 'Explorer', ja: '探索' },
  },
  {
    label: 'tools', url: 'https://tools.txid.uk', host: 'tools.txid.uk',
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    name: { ko: '도구', en: 'Tools', ja: 'ツール' },
  },
  {
    label: 'map', url: 'https://map.txid.uk', host: 'map.txid.uk',
    icon: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
    name: { ko: '지도', en: 'Map', ja: '地図' },
  },
  {
    label: 'portfolio', url: 'https://portfolio.txid.uk', host: 'portfolio.txid.uk',
    icon: '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    name: { ko: '포트폴리오', en: 'Portfolio', ja: '資産' },
  },
  {
    label: 'tx', url: 'https://tx.txid.uk', host: 'tx.txid.uk',
    icon: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    name: { ko: '전송', en: 'TX', ja: '送金' },
  },
  {
    label: 'learn', url: 'https://learn.txid.uk', host: 'learn.txid.uk',
    icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    name: { ko: '배우기', en: 'Learn', ja: '学習' },
  },
  {
    label: 'sim', url: 'https://sim.txid.uk', host: 'sim.txid.uk',
    icon: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    name: { ko: '시뮬레이터', en: 'Simulator', ja: 'シミュレータ' },
  },
  {
    label: 'macro', url: 'https://macro.txid.uk', host: 'macro.txid.uk',
    icon: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    name: { ko: '매크로', en: 'Macro', ja: 'マクロ' },
  },
  {
    label: 'apps', url: 'https://apps.txid.uk', host: 'apps.txid.uk',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    name: { ko: '앱모음', en: 'Apps', ja: 'アプリ' },
  },
];
