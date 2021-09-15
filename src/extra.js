export function addGoogleAnalitics() {
  if (process.env.GOOGLE_ANALYTICS_ID) {
        (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
        ga('create', process.env.GOOGLE_ANALYTICS_ID, 'auto');
        ga('send', 'pageview');
  }
}

export function addPureChat() {
  if (process.env.PURE_CHAT_ID) {
    window.purechatApi = { l: [], t: [], on: function () { this.l.push(arguments); } };
    (function () { var done = false; var script = document.createElement('script'); script.async = true; script.type = 'text/javascript'; script.src = 'https://app.purechat.com/VisitorWidget/WidgetScript'; document.getElementsByTagName('HEAD').item(0).appendChild(script); script.onreadystatechange = script.onload = function (e) { if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) { var w = new PCWidget({c: process.env.PURE_CHAT_ID, f: true }); done = true; } }; })();
  }

}
