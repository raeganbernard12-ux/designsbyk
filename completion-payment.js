(()=>{
  const MAIN_API='https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-api';
  const PAYMENT_API='https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-admin-payments';
  const nativeFetch=window.fetch.bind(window);
  let adminData=null,memberData=null,guestData=null,timer=null;

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
    if(response.ok&&['admin_data','me','guest_lookup'].includes(action)){
      response.clone().json().then(data=>{
        if(action==='admin_data')adminData=data;
        if(action==='me')memberData=data;
        if(action==='guest_lookup')guestData=data;
        scheduleDecorate();
      }).catch(()=>{});
    }
    return response;
  };

  const money=n=>`${Number(n||0).toLocaleString()} TTD`;
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));
  const depositPaid=b=>b?.receipt_path?Number(b.deposit_amount||0):0;
  const totalDue=b=>Number(b?.estimated_total||0)+Number(b?.late_fee||0);
  const finalPaid=b=>Number(b?.balance_paid_amount||0);
  const balanceDue=b=>Math.max(0,totalDue(b)-depositPaid(b)-finalPaid(b));

  function toast(msg){
    const el=document.querySelector('#toast');
    if(!el)return;
    el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);
  }

  function findBookingById(id){return adminData?.bookings?.find(b=>String(b.id)===String(id))||null}
  function allBookings(){
    const rows=[...(adminData?.bookings||[]),...(memberData?.bookings||[]),...(guestData?.booking?[guestData.booking]:[])];
    const seen=new Set();return rows.filter(b=>b?.id&&!seen.has(String(b.id))&&seen.add(String(b.id)));
  }
  function findBookingFromText(text){return allBookings().find(b=>String(text||'').includes(String(b.reference||'')))||null}

  function openCompletionModal(booking){
    const modal=document.querySelector('#modal');if(!modal)return;
    const total=totalDue(booking),deposit=depositPaid(booking),alreadyFinal=finalPaid(booking),outstanding=Math.max(0,total-deposit-alreadyFinal);
    modal.innerHTML=`<div class="modal-box"><button class="icon-btn modal-close" aria-label="Close">×</button><div class="eyebrow">Complete appointment</div><h2>Confirm final balance</h2><p class="muted"><b>${escapeHtml(booking.full_name)}</b><br>${escapeHtml(booking.reference)}</p><div class="invoice-summary"><div><small>Appointment total</small><strong>${money(total)}</strong></div><div><small>Deposit paid</small><strong>${money(deposit)}</strong></div><div><small>Outstanding balance</small><strong>${money(outstanding)}</strong></div></div><div class="notice section">Before this appointment can be marked completed, enter the remaining balance received from the client. The paid invoice will be emailed automatically.</div><form class="form section" id="dbkCompletionForm"><label class="field">Balance payment received (TTD)<input type="number" name="amount" min="0" max="${outstanding}" step="1" value="${outstanding}" required></label><button class="btn dark" type="submit">✓ Complete & send paid invoice</button></form></div>`;
    modal.hidden=false;
    modal.querySelector('.modal-close').onclick=()=>{modal.hidden=true;modal.innerHTML=''};
    modal.querySelector('#dbkCompletionForm').onsubmit=async e=>{
      e.preventDefault();
      const form=e.currentTarget,button=form.querySelector('button[type=submit]'),amount=Math.round(Number(new FormData(form).get('amount')));
      if(amount!==outstanding){toast(`Outstanding balance is ${money(outstanding)}.`);return}
      button.disabled=true;button.textContent='Completing appointment…';
      try{
        const token=localStorage.getItem('dbk_token')||'';
        const r=await nativeFetch(PAYMENT_API,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({action:'record_balance_and_complete',bookingId:booking.id,amount})});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(j.error||'Could not complete the appointment.');
        modal.hidden=true;modal.innerHTML='';
        toast(`Appointment completed. ${money(amount)} final balance recorded.`);
        setTimeout(()=>document.querySelector('[data-view="account"]')?.click(),250);
      }catch(err){toast(err.message||'Could not complete the appointment.');button.disabled=false;button.textContent='✓ Complete & send paid invoice'}
    };
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-booking][data-status="completed"]');
    if(!button)return;
    const booking=findBookingById(button.dataset.booking);
    if(!booking)return;
    e.preventDefault();e.stopImmediatePropagation();
    openCompletionModal(booking);
  },true);

  function decorateInvoiceCard(card,booking){
    const totals=card.querySelector('.invoice-totals');if(!totals)return;
    const existing=totals.querySelector('.dbk-final-payment-row');existing?.remove();
    const balance=totals.querySelector('.balance');
    if(finalPaid(booking)>0&&balance){
      const row=document.createElement('div');row.className='dbk-final-payment-row paid';row.innerHTML=`<span>Final balance paid</span><b>− ${money(finalPaid(booking))}</b>`;balance.before(row);
    }
    const strong=balance?.querySelector('strong');if(strong)strong.textContent=money(balanceDue(booking));
  }

  function decorateEnhancedInvoice(box,booking){
    const old=box.querySelector('.dbk-final-payment-row');old?.remove();
    const balance=box.querySelector('.dbk-app-invoice-row.balance');
    if(finalPaid(booking)>0&&balance){
      const row=document.createElement('div');row.className='dbk-app-invoice-row paid dbk-final-payment-row';row.innerHTML=`<span>Final balance paid</span><b>− ${money(finalPaid(booking))}</b>`;balance.before(row);
    }
    const strong=balance?.querySelector('strong');if(strong)strong.textContent=money(balanceDue(booking));
  }

  function decorateAdminMoney(card,booking){
    card.querySelectorAll('.appointment-money > span').forEach(span=>{
      const label=span.querySelector('small')?.textContent?.trim().toLowerCase()||'';
      if(label==='balance'){const b=span.querySelector('b');if(b)b.textContent=money(balanceDue(booking))}
    });
    if(finalPaid(booking)>0){
      const moneyBox=card.querySelector('.appointment-money');
      if(moneyBox&&!moneyBox.querySelector('.dbk-final-paid-summary')){
        const span=document.createElement('span');span.className='dbk-final-paid-summary';span.innerHTML=`<small>Final balance paid</small><b>${money(finalPaid(booking))}</b>`;moneyBox.appendChild(span);
      }
    }
  }

  function decorateSummary(){
    if(!adminData?.bookings)return;
    document.querySelectorAll('.invoice-summary').forEach(summary=>{
      const label=[...summary.querySelectorAll('small')].find(x=>x.textContent?.trim().toLowerCase()==='balances due');
      const strong=label?.parentElement?.querySelector('strong');
      if(strong){
        const rows=adminData.bookings.filter(b=>!['cancelled','declined'].includes(b.status));
        strong.textContent=money(rows.reduce((n,b)=>n+balanceDue(b),0));
      }
    });
  }

  function decorate(){
    document.querySelectorAll('.invoice-card').forEach(card=>{const b=findBookingFromText(card.textContent);if(b)decorateInvoiceCard(card,b)});
    document.querySelectorAll('.dbk-app-invoice').forEach(box=>{const b=findBookingFromText(box.textContent);if(b)decorateEnhancedInvoice(box,b)});
    document.querySelectorAll('.admin-appointment-card').forEach(card=>{const b=findBookingFromText(card.textContent);if(b)decorateAdminMoney(card,b)});
    decorateSummary();
  }
  function scheduleDecorate(){clearTimeout(timer);timer=setTimeout(decorate,70)}
  new MutationObserver(scheduleDecorate).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(scheduleDecorate,60),true);
  setTimeout(scheduleDecorate,350);
})();