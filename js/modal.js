function confirmAction({title='Confirm',message='',details='',confirmText='Delete',danger=true}={}){
  return new Promise(resolve=>{
    let wrap=document.getElementById('cvConfirmModal');
    if(!wrap){
      wrap=document.createElement('div');wrap.id='cvConfirmModal';wrap.className='modal-backdrop';
      wrap.innerHTML='<div class="confirm-modal"><h3 id="cvConfirmTitle"></h3><div class="modal-body"><div id="cvConfirmMessage"></div><div id="cvConfirmDetails" class="muted-note" style="margin-top:10px"></div></div><div class="modal-actions"><button class="btn clear" id="cvConfirmCancel">Cancel</button><button class="btn danger" id="cvConfirmOk">Delete</button></div></div>';
      document.body.appendChild(wrap);
    }
    document.getElementById('cvConfirmTitle').textContent=title;
    document.getElementById('cvConfirmMessage').innerHTML=message;
    document.getElementById('cvConfirmDetails').textContent=details;
    const ok=document.getElementById('cvConfirmOk');ok.textContent=confirmText;ok.className=danger?'btn danger':'btn primary';
    wrap.classList.add('show');
    const close=v=>{wrap.classList.remove('show'); ok.onclick=null; document.getElementById('cvConfirmCancel').onclick=null; resolve(v)};
    ok.onclick=()=>close(true);document.getElementById('cvConfirmCancel').onclick=()=>close(false);wrap.onclick=e=>{if(e.target===wrap)close(false)};
  });
}

function toast(message,type='ok'){let t=document.getElementById('cvToast');if(!t){t=document.createElement('div');t.id='cvToast';t.style.cssText='position:fixed;right:18px;bottom:55px;z-index:9999;padding:11px 14px;border:1px solid #9a6b24;border-radius:7px;background:#17130d;color:#f5e8d4;box-shadow:0 12px 30px #0008;font-weight:800';document.body.appendChild(t)}t.textContent=message;t.style.borderColor=type==='err'?'#c23b32':'#9a6b24';t.hidden=false;clearTimeout(t._timer);t._timer=setTimeout(()=>t.hidden=true,2800)}
