(function(){
  'use strict';
  function text(id){var el=document.getElementById(id);return el?el.value.trim():''}
  function generated(){return [text('brand'),text('type'),text('color')].filter(Boolean).join(' - ')}
  function sync(){var label=document.getElementById('label');var preview=document.getElementById('generatedLabelPreview');if(label)label.value=generated();if(preview)preview.textContent=generated()||'Brand - Type - Color'}
  function init(){
    var form=document.getElementById('colorForm'),label=document.getElementById('label');if(!form||!label)return;
    var wrapper=label.closest('label');if(wrapper){wrapper.classList.add('generated-label-field');wrapper.firstChild.textContent='Generated Label';label.readOnly=true;label.tabIndex=-1}
    if(wrapper&&!document.getElementById('generatedLabelHelp')){var help=document.createElement('small');help.id='generatedLabelHelp';help.textContent='Automatically created from Brand - Type - Color.';wrapper.appendChild(help)}
    ['brand','type','color'].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',sync)});
    form.addEventListener('submit',sync,true);
    var observer=new MutationObserver(sync);observer.observe(form,{attributes:true,subtree:true,attributeFilter:['class']});
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
