/* MaxChess owner newsletter booklet tools. */
(function(){
 const title=document.getElementById("ownerNewsletterTitle");
 const body=document.getElementById("ownerNewsletterText");
 const status=document.getElementById("ownerNewsletterDraftStatus");
 const make=document.getElementById("ownerNewsletterMakeBooklet");
 const download=document.getElementById("ownerNewsletterDownloadBooklet");
 const clear=document.getElementById("ownerNewsletterClearDraft");
 if(!title||!body||!status)return;
 const key="maxchess_owner_newsletter_booklet_draft_v1";
 try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved){title.value=saved.title||"";body.value=saved.body||"";status.textContent="Draft restored from this device.";}}catch(_e){}
 function save(){try{localStorage.setItem(key,JSON.stringify({title:title.value,body:body.value,updatedAt:new Date().toISOString()}));status.textContent="Draft saved on this device.";}catch(_e){status.textContent="Could not save draft on this device.";}}
 title.addEventListener("input",save);body.addEventListener("input",save);
 function escapeHtml(value){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
 function booklet(){
  const safeTitle=escapeHtml(title.value.trim()||"MaxChess Newsletter");
  const text=body.value.trim();
  if(!text){status.textContent="Type your newsletter first.";body.focus();return null;}
  const paragraphs=text.split(/\n\s*\n/).map(p=>"<p>"+escapeHtml(p).replace(/\n/g,"<br>")+"</p>").join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#eee;color:#202020;font:17px/1.7 Georgia,serif}.page{max-width:780px;min-height:100vh;margin:24px auto;padding:56px clamp(22px,7vw,72px);background:white;box-shadow:0 4px 24px #0002}header{text-align:center;border-bottom:3px double #b28a2e;padding-bottom:24px;margin-bottom:30px}h1{font:800 clamp(30px,6vw,48px)/1.1 system-ui;color:#9a7421}header p{color:#666;font:14px system-ui}p{white-space:normal;margin:0 0 1.2em}footer{border-top:1px solid #ddd;margin-top:42px;padding-top:16px;color:#777;font:12px system-ui}@media print{body{background:white}.page{margin:0;box-shadow:none;max-width:none;min-height:auto;page-break-after:always}}</style>
</head><body><main class="page"><header><h1>${safeTitle}</h1><p>MAXCHESS · THINK FAST. PLAY SMART.</p></header><article>${paragraphs}</article><footer>MaxChess · Free online chess</footer></main></body></html>`;
 }
 function openBooklet(forceDownload){
  const doc=booklet();if(!doc)return;
  const url=URL.createObjectURL(new Blob([doc],{type:"text/html"}));
  if(forceDownload){const a=document.createElement("a");a.href=url;a.download="maxchess-newsletter-booklet.html";document.body.appendChild(a);a.click();a.remove();status.textContent="Booklet download started.";}
  else{const win=window.open(url,"_blank");if(!win){const a=document.createElement("a");a.href=url;a.download="maxchess-newsletter-booklet.html";a.click();}status.textContent="Booklet preview created.";}
  window.setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 if(make)make.addEventListener("click",()=>openBooklet(false));
 if(download)download.addEventListener("click",()=>openBooklet(true));
 if(clear)clear.addEventListener("click",()=>{if(!window.confirm("Clear the saved newsletter draft on this device?"))return;title.value="";body.value="";try{localStorage.removeItem(key);}catch(_e){}status.textContent="Draft cleared.";});
})();