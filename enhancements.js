(()=>{
  const MAIN_API="https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-api";
  const WELCOME_API="https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-welcome";
  const nativeFetch=window.fetch.bind(window);
  let accountData=null,guestData=null,routeApplied=false;

  const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const digits=v=>String(v||"").replace(/\D/g,"");
  const money=n=>`${Number(n||0).toLocaleString()} TTD`;
  const statusLabel=s=>({pending:"Pending",awaiting_deposit:"Awaiting deposit",payment_review:"Deposit under review",confirmed:"Approved",completed:"Completed",declined:"Declined",cancelled:"Cancelled"})[s]||s;
  const defaultPass=(name,phone)=>{const parts=String(name||"").trim().split(/\s+/).filter(Boolean),last=parts.at(-1)||"",tail=digits(phone).slice(-4);return `${last}${tail}`};

  function parseAction(input,init){
    try{
      const url=typeof input==="string"?input:input?.url||"";
      if(!url.includes("/functions/v1/designsbyk-api"))return null;
      const raw=init?.body;
      if(typeof raw!=="string")return null;
      const body=JSON.parse(raw);
      return {action:body.action||"",body};
    }catch(_){return null}
  }

  window.fetch=async function(input,init){
    const meta=parseAction(input,init);
    const response=await nativeFetch(input,init);
    if(meta){
      response.clone().json().then(data=>{
        if(!response.ok)return;
        if(meta.action==="me")accountData=data;
        if(meta.action==="guest_lookup")guestData=data;
        if(meta.action==="register"&&data?.token){
          nativeFetch(WELCOME_API,{method:"POST",headers:{authorization:`Bearer ${data.token}`,"content-type":"application/json"},body:"{}"}).catch(()=>{});
        }
        scheduleDecorate();
      }).catch(()=>{});
    }
    return response;
  };

  document.addEventListener("submit",e=>{
    const form=e.target;
    if(!(form instanceof HTMLFormElement)||form.id!=="authForm")return;
    const register=document.querySelector('[data-mode="register"].active');
    if(!register)return;
    const name=form.elements.fullName?.value||"",phone=form.elements.phone?.value||"",pw=form.elements.password;
    if(pw){
      const generated=defaultPass(name,phone);
      pw.value=generated.length>=8?generated:generated+"K".repeat(8-generated.length);
    }
  },true);

  function updateRegistrationUi(){
    const form=document.querySelector("#authForm");
    if(!form)return;
    const pw=form.elements.password,label=pw?.closest("label.field"),isRegister=!!document.querySelector('[data-mode="register"].active');
    if(!pw||!label)return;
    let note=form.querySelector(".dbk-auto-password-note");
    if(isRegister){
      label.style.display="none";
      pw.required=false;
      pw.removeAttribute("minlength");
      if(!note){
        note=document.createElement("div");
        note.className="notice dbk-auto-password-note";
        note.innerHTML="🧸 <b>Your password is created automatically.</b><br><span>Your welcome email will include your contact-number login and your exact password.</span>";
        label.after(note);
      }
    }else{
      label.style.display="grid";
      pw.required=true;
      pw.setAttribute("minlength","4");
      note?.remove();
    }
  }

  function routeToRequestedView(){
    if(routeApplied)return;
    const view=new URLSearchParams(location.search).get("view");
    if(!view)return;
    const button=document.querySelector(`[data-view="${CSS.escape(view)}"]`);
    if(button){routeApplied=true;setTimeout(()=>button.click(),80)}
  }

  function invoiceHtml(b,compact=false){
    const services=Array.isArray(b?.services)?b.services:[];
    const total=Number(b?.estimated_total||0)+Number(b?.late_fee||0);
    const depositApproved=["confirmed","completed"].includes(b?.status)?Number(b?.deposit_amount||0):0;
    const depositSubmitted=b?.receipt_path?Number(b?.deposit_amount||0):0;
    const balance=Math.max(0,total-depositApproved);
    const date=b?.slot_date?new Date(`${b.slot_date}T12:00:00`).toLocaleDateString("en",{weekday:"short",month:"short",day:"numeric",year:"numeric"}):"";
    return `<section class="dbk-app-invoice ${compact?"compact":""}"><div class="dbk-app-invoice-head"><div><small>DESIGNS BY K INVOICE</small><h3>${escapeHtml(b?.reference||"Invoice")}</h3></div><span class="status ${escapeHtml(b?.status||"")}">${escapeHtml(statusLabel(b?.status||""))}</span></div><div class="dbk-app-invoice-date">${escapeHtml(date)}${b?.slot_time?` · ${escapeHtml(b.slot_time)}`:""}</div><div class="dbk-app-invoice-services">${services.length?services.map(s=>`<div><span>${escapeHtml(s.label||s.name||"Service")}</span><b>${money(s.price||0)}</b></div>`).join(""):`<div><span>Appointment services</span><b>${money(b?.estimated_total||0)}</b></div>`}</div>${Number(b?.late_fee||0)>0?`<div class="dbk-app-invoice-row"><span>Late fee</span><b>${money(b.late_fee)}</b></div>`:""}<div class="dbk-app-invoice-row total"><span>Total</span><b>${money(total)}</b></div>${depositSubmitted&&!depositApproved?`<div class="dbk-app-invoice-row submitted"><span>Deposit submitted for review</span><b>${money(depositSubmitted)}</b></div>`:""}<div class="dbk-app-invoice-row paid"><span>Deposit approved</span><b>− ${money(depositApproved)}</b></div><div class="dbk-app-invoice-row balance"><span>Balance due</span><strong>${money(balance)}</strong></div></section>`;
  }

  function openInvoice(b){
    const modal=document.querySelector("#modal");
    if(!modal)return;
    modal.innerHTML=`<div class="modal-box"><button class="icon-btn modal-close" aria-label="Close">×</button><div class="eyebrow">Appointment invoice</div><h2>${escapeHtml(b.reference||"Invoice")}</h2>${invoiceHtml(b)}</div>`;
    modal.hidden=false;
    modal.querySelector(".modal-close")?.addEventListener("click",()=>{modal.hidden=true;modal.innerHTML=""});
  }

  function decorateAccountInvoices(){
    if(!accountData?.bookings)return;
    document.querySelectorAll("#app .booking-card").forEach(card=>{
      if(card.querySelector(".dbk-view-invoice"))return;
      const booking=accountData.bookings.find(b=>String(card.textContent||"").includes(String(b.reference||"")));
      if(!booking||card.hasAttribute("data-client-invoice"))return;
      const btn=document.createElement("button");
      btn.type="button";btn.className="btn secondary dbk-view-invoice";btn.textContent="🧾 View invoice";
      btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openInvoice(booking)});
      card.appendChild(btn);
    });
  }

  function decorateGuestInvoice(){
    if(!guestData?.booking)return;
    const modal=document.querySelector("#modal");
    if(!modal||modal.hidden||modal.querySelector(".dbk-guest-invoice"))return;
    if(!String(modal.textContent||"").includes(String(guestData.booking.reference||"")))return;
    const wrap=document.createElement("div");
    wrap.className="dbk-guest-invoice section";
    wrap.innerHTML=`<div class="eyebrow">Your invoice</div>${invoiceHtml(guestData.booking,true)}`;
    const box=modal.querySelector(".modal-box")||modal.firstElementChild;
    box?.appendChild(wrap);
  }

  let decorateTimer=null;
  function scheduleDecorate(){
    clearTimeout(decorateTimer);
    decorateTimer=setTimeout(()=>{updateRegistrationUi();routeToRequestedView();decorateAccountInvoices();decorateGuestInvoice()},40);
  }
  new MutationObserver(scheduleDecorate).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class","hidden"]});
  document.addEventListener("click",()=>setTimeout(scheduleDecorate,30),true);
  window.addEventListener("DOMContentLoaded",scheduleDecorate);
  setTimeout(scheduleDecorate,250);
})();