(function(){
  var el = document.querySelector('script[data-ga-id]');
  if (!el) return;
  var id = el.getAttribute('data-ga-id');
  if (!id) return;
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', id);
})();
