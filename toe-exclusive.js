(()=>{
  let enforcing=false;
  function isToeSection(section){
    if(!section)return false;
    const heading=section.querySelector('h3')?.textContent?.trim().toLowerCase()||'';
    return heading.includes('toe');
  }
  function relabelToeSections(){
    document.querySelectorAll('.service-group').forEach(section=>{
      if(!isToeSection(section))return;
      const helper=section.querySelector('h3 + .muted');
      if(helper)helper.textContent='Choose one';
    });
  }
  document.addEventListener('click',e=>{
    if(enforcing)return;
    const button=e.target.closest?.('[data-service]');
    if(!button)return;
    const section=button.closest('.service-group');
    if(!isToeSection(section))return;
    const clickedId=button.dataset.service;
    setTimeout(()=>{
      const currentSection=[...document.querySelectorAll('.service-group')].find(s=>isToeSection(s)&&s.querySelector(`[data-service="${CSS.escape(clickedId)}"]`));
      if(!currentSection)return;
      const selected=[...currentSection.querySelectorAll('[data-service].selected')];
      if(selected.length<=1)return;
      enforcing=true;
      try{
        selected.filter(x=>x.dataset.service!==clickedId).forEach(x=>x.click());
      } finally {
        enforcing=false;
      }
    },20);
  },true);
  const run=()=>setTimeout(relabelToeSections,30);
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('DOMContentLoaded',run);
  run();
})();