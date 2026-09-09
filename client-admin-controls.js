(()=>{
  const CLIENT_API='https://flcxvuwfizemnmknlfed.supabase.co/functions/v1/designsbyk-client-admin';
  let currentClient=null,timer=null;
  const toast=msg=>{const el=document.querySelector('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)};

  function decorate(){
    const modal=document.querySelector('#modal');
    const form=modal?.querySelector('#clientForm');
    if(!modal||modal.hidden||!form||!currentClient)return;
    if(!form.querySelector('.dbk-client-identity-note')){
      const note=document.createElement('div');
      note.className='notice dbk-client-identity-note';
      note.innerHTML='🔒 <b>Unique client details</b><br><span>Each client must have their own contact number and email address. Duplicate numbers or emails are blocked automatically.</span>';
      form.prepend(note);
    }
    if(modal.querySelector('#dbkDeleteClient'))return;
    const section=document.createElement('div');
    section.className='section';
    section.innerHTML=`<div class="notice" style="margin-bottom:12px"><b>Delete client account</b><br><span>This removes their login, messages, reviews and nailfies. Appointment and invoice history stays in Kirsten's studio records.</span></div><button type="button" class="btn danger" id="dbkDeleteClient">Delete client</button>`;
    form.after(section);
    section.querySelector('#dbkDeleteClient').onclick=async()=>{
      const name=currentClient.name||'this client';
      if(!confirm(`Delete ${name}'s client account?\n\nTheir appointment and invoice history will remain in Kirsten's studio records.`))return;
      const btn=section.querySelector('#dbkDeleteClient');
      btn.disabled=true;btn.textContent='Deleting client…';
      try{
        const token=localStorage.getItem('dbk_token')||'';
        const r=await fetch(CLIENT_API,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({action:'delete_client',id:currentClient.id})});
        const j=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(j.error||'Could not delete client.');
        toast(`${name} deleted.`);
        setTimeout(()=>location.assign('/?view=account'),300);
      }catch(err){toast(err.message||'Could not delete client.');btn.disabled=false;btn.textContent='Delete client'}
    };
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-client]');
    if(button){
      const name=button.querySelector('strong')?.textContent?.trim()||'Client';
      currentClient={id:button.dataset.client,name};
      clearTimeout(timer);timer=setTimeout(decorate,60);
    }
  },true);

  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorate,50)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});

  window.addEventListener('unhandledrejection',e=>{
    const msg=String(e.reason?.message||'');
    if(/already registered to another client|duplicate key value/i.test(msg)){
      e.preventDefault();
      toast(/email/i.test(msg)?'That email address is already used by another client.':'That contact number is already used by another client.');
    }
  });
})();