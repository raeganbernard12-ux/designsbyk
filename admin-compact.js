(()=>{
  const nativeFetch=window.fetch.bind(window);
  let adminData=null,scheduled=null;

  function parseAction(input,init){
    try{
      const url=typeof input==='string'?input:input?.url||'';
      if(!url.includes('/functions/v1/designsbyk-api'))return null;
      if(typeof init?.body!=='string')return null;
      return JSON.parse(init.body)?.action||'';
    }catch(_){return null}
  }

  window.fetch=async function(input,init){
    const action=parseAction(input,init);
    const response=await nativeFetch(input,init);
    if(action==='admin_data'&&response.ok){
      response.clone().json().then(data=>{adminData=data;scheduleDecorate()}).catch(()=>{});
    }
    return response;
  };

  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));
  function serviceSummary(b){
    const services=Array.isArray(b?.services)?b.services:[];
    if(!services.length)return 'Appointment';
    const labels=services.map(s=>s.label||s.name).filter(Boolean);
    if(!labels.length)return 'Appointment';
    return labels.length===1?labels[0]:`${labels[0]} + ${labels.length-1} more`;
  }
  function dateTime(b){
    const d=b?.slot_date?new Date(`${b.slot_date}T12:00:00`):null;
    const date=d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}):'';
    return `${date}${b?.slot_time?` · ${b.slot_time}`:''}`;
  }

  function decorate(){
    if(!adminData?.bookings)return;
    document.querySelectorAll('.appointment-admin-list .admin-appointment-card').forEach(card=>{
      if(card.dataset.compactified==='1')return;
      const booking=adminData.bookings.find(b=>String(card.textContent||'').includes(String(b.reference||'')));
      if(!booking)return;
      const original=card.innerHTML;
      card.dataset.compactified='1';
      card.classList.add('dbk-compact-shell');
      card.innerHTML=`<details class="dbk-compact-appointment"><summary><span class="dbk-compact-name">${escapeHtml(booking.full_name||'Client')}</span><span class="dbk-compact-service">${escapeHtml(serviceSummary(booking))}</span><span class="dbk-compact-datetime">${escapeHtml(dateTime(booking))}</span><span class="dbk-compact-chevron">⌄</span></summary><div class="dbk-compact-details">${original}</div></details>`;
    });
  }

  function scheduleDecorate(){
    clearTimeout(scheduled);
    scheduled=setTimeout(decorate,50);
  }
  new MutationObserver(scheduleDecorate).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(scheduleDecorate,40),true);
})();