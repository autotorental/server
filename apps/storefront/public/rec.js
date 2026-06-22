(function () {
  try {
    if (window.__atrRec) return; window.__atrRec = 1;
    if (navigator.doNotTrack === "1") return;
    var sid = sessionStorage.getItem("atr_sid");
    if (!sid) { sid = "rec_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9); sessionStorage.setItem("atr_sid", sid); }
    var API = "https://api.autotorental.com";
    var PK = "pk_b9c89660573c5c7d3f54d11eb3132be59d6d919d4bb40c98b14877a2048feea1";
    function start() {
      var rec = (window.rrweb && window.rrweb.record) || window.rrwebRecord;
      if (!rec) return;
      var buf = [];
      rec({ emit: function (e) { buf.push(e); }, maskAllInputs: true, maskTextClass: "atr-mask", blockClass: "atr-no-rec", sampling: { mousemove: 60, scroll: 150, media: 800 } });
      function flush() {
        if (!buf.length) return;
        var batch = buf.splice(0, buf.length);
        try { fetch(API + "/store/rec", { method: "POST", keepalive: true, headers: { "content-type": "application/json", "x-publishable-api-key": PK }, body: JSON.stringify({ session_id: sid, events: batch, path: location.pathname }) }).catch(function () {}); } catch (e) {}
      }
      setInterval(flush, 5000);
      addEventListener("pagehide", flush); addEventListener("beforeunload", flush);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
    }
    if (window.rrweb && window.rrweb.record) start();
    else { var s = document.createElement("script"); s.src = "/rrweb.min.js"; s.defer = true; s.onload = start; document.head.appendChild(s); }
  } catch (e) {}
})();
