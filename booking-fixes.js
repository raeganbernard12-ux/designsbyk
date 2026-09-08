(()=>{
  const $=(s,r=document)=>r.querySelector(s);
  let timer=null;

  function showToast(message){
    const el=$("#toast");
    if(!el)return;
    el.textContent=message;
    el.classList.add("show");
    setTimeout(()=>el.classList.remove("show"),2600);
  }

  function selectedServices(){
    try{return JSON.parse(sessionStorage.getItem("dbk_selected")||"[]")}catch(_){return []}
  }

  function hasBookableBase(){
    return selectedServices().some(s=>s?.category==="hands"||s?.category==="toes");
  }

  function patchPrices(){
    const title=$("#app .page-title");
    if(title?.textContent?.trim()==="Build your appointment"){
      const intro=title.nextElementSibling;
      if(intro?.classList?.contains("muted")) intro.textContent="Choose a hands service, a toes service, or both. Then add nail art and extras if you like.";
      const firstChip=$("#app .service-rule-chip");
      if(firstChip) firstChip.textContent="🤎 Hands or toes";
    }

    const btn=$("#toSchedule");
    if(!btn||btn.dataset.toesBookingFixed==="1")return;
    btn.dataset.toesBookingFixed="1";
    btn.onclick=()=>{
      if(!hasBookableBase()){
        showToast("Choose a hands or toes service before continuing.");
        return;
      }
      const scheduleBtn=$(".bottom-nav [data-view='schedule']")||$("[data-view='schedule']");
      if(!scheduleBtn)return;
      scheduleBtn.click();
      setTimeout(()=>{
        const continueBtn=$("#continueBooking");
        if(continueBtn&&!continueBtn.disabled) continueBtn.click();
      },120);
    };
  }

  function ensureStyles(){
    if($("#dbk-booking-fix-styles"))return;
    const style=document.createElement("style");
    style.id="dbk-booking-fix-styles";
    style.textContent=`
      @media (max-width:640px){
        .sticky-summary{
          display:grid!important;
          grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
          gap:12px 14px!important;
          align-items:center!important;
          overflow:hidden!important;
          padding:16px!important;
        }
        .sticky-summary>span{min-width:0!important;}
        .sticky-summary .estimate-time{padding-left:14px!important;border-left:1px solid rgba(255,255,255,.45)!important;}
        .sticky-summary #toSchedule{
          grid-column:1/-1!important;
          width:100%!important;
          max-width:100%!important;
          min-width:0!important;
          white-space:normal!important;
          overflow-wrap:anywhere!important;
          text-align:center!important;
          line-height:1.15!important;
          font-size:18px!important;
          padding:13px 16px!important;
          margin:0!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply(){ensureStyles();patchPrices()}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,45)}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("click",()=>setTimeout(schedule,35),true);
  window.addEventListener("DOMContentLoaded",schedule);
  setTimeout(schedule,250);
})();