(()=>{
  const PAYMENT_API='https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-admin-payments';
  const nativeFetch=window.fetch.bind(window);
  let adminData=null, timer=null;

  function parseAction(input,init){
    try{
      const url=typeof input==='string'?input:input?.url||'';
      if(!url.includes('/functions/v1/designsbyk-api')||typeof init?.body!=='string')return '';
      return JSON.parse(init.body)?.action||'';
    }catch(_){return ''}
  }

  window.fetch=async function(input,init){
    const action=parseAction(input,init);
    const response=await nativeFetch(input,init);
    if(action==='admin_data'&&response.ok){
      response.clone().json().then(data=>{adminData=data;scheduleDecorate()}).catch(()=>{});
    }
    return response;
  };

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]))}
  function money(n){return `${Number(n||0).toLocaleString()} TTD`}
  function toast(msg){
    const el=document.querySelector('#toast');
    if(!el)return;
    el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800);
  }

  function openCashModal(booking){
    const modal=document.querySelector('#modal');
    if(!modal)return;
    const total=Number(booking.estimated_total||0)+Number(booking.late_fee||0);
    const suggested=Math.min(Math.max(Number(booking.deposit_amount||100),100),total);
    modal.innerHTML=`<div class="modal-box"><button class="icon-btn modal-close" aria-label="Close">×</button><div class="eyebrow">Cash payment</div><h2>Record client deposit</h2><p class="muted"><b>${escapeHtml(booking.full_name)}</b><br>${escapeHtml(booking.reference)} · Appointment total ${money(total)}</p><div class="notice">Use this when the client paid the deposit in cash directly to Kirsten. Saving it will mark the deposit as received and confirm the appointment.</div><form class="form section" id="dbkCashDepositForm"><label class="field">Cash deposit amount (TTD)<input type="number" name="amount" min="100" max="${total}" step="1" value="${suggested}" required></label><button class="btn dark" type="submit">💵 Save cash deposit</button></form></div>`;
    modal.hidden=false;
    modal.querySelector('.modal-close').onclick=()=>{modal.hidden=true;modal.innerHTML=''};
    modal.querySelector('#dbkCashDepositForm').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget,button=form.querySelector('button[type=submit]'),amount=Number(new FormData(form).get('amount'));
      button.disabled=true;button.textContent='Saving cash deposit…';
      try{
        const token=localStorage.getItem('dbk_token')||'';
        const r=await nativeFetch(PAYMENT_API,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({action:'record_cash_deposit',bookingId:booking.id,amount})});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(j.error||'Could not record the cash deposit.');
        modal.hidden=true;modal.innerHTML='';
        toast(`Cash deposit of ${money(amount)} recorded.`);
        setTimeout(()=>document.querySelector('[data-view="account"]')?.click(),250);
      }catch(err){toast(err.message||'Could not record cash deposit.');button.disabled=false;button.textContent='💵 Save cash deposit'}
    };
  }

  function findBooking(card){
    const text=String(card.textContent||'');
    return adminData?.bookings?.find(b=>text.includes(String(b.reference||'')))||null;
  }

  function decorate(){
    if(!adminData?.bookings)return;
    document.querySelectorAll('.appointment-admin-list .admin-appointment-card').forEach(card=>{
      const booking=findBooking(card);if(!booking)return;
      const cash=String(booking.receipt_path||'').startsWith('legacy://cash/');
      if(cash){
        const waiting=card.querySelector('.deposit-waiting');
        if(waiting){waiting.className='notice';waiting.innerHTML=`💵 <b>Cash deposit recorded:</b> ${money(booking.deposit_amount||0)}`}
      }
      if(['pending','awaiting_deposit','payment_review'].includes(booking.status)&&!card.querySelector('.dbk-cash-deposit-btn')){
        const actions=card.querySelector('.appointment-actions')||card.querySelector('.actions');
        if(actions){
          const btn=document.createElement('button');
          btn.type='button';btn.className='btn secondary dbk-cash-deposit-btn';btn.textContent='💵 Record cash deposit';
          btn.onclick=e=>{e.preventDefault();e.stopPropagation();openCashModal(booking)};
          actions.prepend(btn);
        }
      }
    });
  }

  function scheduleDecorate(){clearTimeout(timer);timer=setTimeout(decorate,60)}
  new MutationObserver(scheduleDecorate).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(scheduleDecorate,50),true);
})();