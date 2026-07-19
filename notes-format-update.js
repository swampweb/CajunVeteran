/* CajunVeteran Phase 1.1 Notes Format Update
   Drop-in runtime helper for cleaner Mobile + Web notes popups.
   Add before </body> on mobile.html and woodworking.html:
   <script src="notes-format-update.js?v=notes11"></script>
*/
(function(){
  if (window.__cvNotesFormatUpdateLoaded) return;
  window.__cvNotesFormatUpdateLoaded = true;

  function esc(v){
    return String(v == null ? '' : v).replace(/[&<>\"]/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];
    });
  }

  function addStyle(){
    if (document.getElementById('cvNotesFormatStyle')) return;
    var style = document.createElement('style');
    style.id = 'cvNotesFormatStyle';
    style.textContent = `
      .cv-note-display{max-height:min(62vh,520px);overflow:auto;border:1px solid rgba(86,142,198,.38);background:#07182a;border-radius:12px;padding:12px;color:#f4f7fb;line-height:1.45;font-size:15px;white-space:normal;}
      .cv-note-card{border:1px solid rgba(240,180,41,.36);background:rgba(240,180,41,.055);border-radius:10px;margin:0 0 10px;overflow:hidden;}
      .cv-note-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:rgba(201,130,50,.18);color:#ffd36a;font-weight:900;letter-spacing:.04em;text-transform:uppercase;font-size:13px;border-bottom:1px solid rgba(240,180,41,.26);}
      .cv-note-card-body{padding:10px;}
      .cv-note-name{font-size:16px;font-weight:900;color:#fff;margin-bottom:4px;}
      .cv-note-meta{font-size:14px;color:#dce8f6;}
      .cv-note-meta b{color:#ffd36a;}
      .cv-note-section{border:1px solid rgba(86,142,198,.28);background:rgba(255,255,255,.035);border-radius:10px;margin:10px 0 0;padding:10px;}
      .cv-note-section-title{color:#ffd36a;font-weight:900;text-transform:uppercase;letter-spacing:.05em;font-size:13px;margin-bottom:6px;}
      .cv-note-section-body{white-space:pre-wrap;color:#f4f7fb;}
      .cv-note-empty{color:#9fb0c4;font-style:italic;}
      .note-modal-text.cv-note-display{white-space:normal;font-size:15px;}
      #notesModal .box{max-height:84vh;overflow:auto;}
      #notesModal #saveNotes.cv-hide-save{display:none!important;}
    `;
    document.head.appendChild(style);
  }

  function plaqueCards(plaques){
    return (Array.isArray(plaques) ? plaques : []).map(function(p, i){
      var name = esc(p.name || 'No name entered');
      var rank = esc(p.rank || 'No rank');
      var month = esc(p.monthPromoted || p.month || p.promoted || 'No promoted month');
      return '<div class="cv-note-card">'
        + '<div class="cv-note-card-head"><span>🏅 Plaque #' + (i + 1) + '</span></div>'
        + '<div class="cv-note-card-body">'
        + '<div class="cv-note-name">' + name + '</div>'
        + '<div class="cv-note-meta"><b>Rank:</b> ' + rank + ' &nbsp;•&nbsp; <b>Promoted:</b> ' + month + '</div>'
        + '</div></div>';
    }).join('');
  }

  function normalizePlaquesFromJob(job){
    if (job && Array.isArray(job.plaques) && job.plaques.length) return job.plaques;
    if (job && (job.plaqueName || job.plaqueRank || job.plaqueMonthPromoted)) {
      return [{ name: job.plaqueName || '', rank: job.plaqueRank || '', monthPromoted: job.plaqueMonthPromoted || '' }];
    }
    return [];
  }

  function renderJobNotesHtml(job){
    var html = '';
    var plaques = normalizePlaquesFromJob(job);
    if (plaques.length) html += plaqueCards(plaques);
    if (job && job.notes) {
      html += '<div class="cv-note-section"><div class="cv-note-section-title">Notes</div><div class="cv-note-section-body">' + esc(job.notes) + '</div></div>';
    }
    if (job && Array.isArray(job.files) && job.files.length) {
      var files = job.files.map(function(f){ return esc(f.name || f.storedName || 'File'); }).join('\n');
      html += '<div class="cv-note-section"><div class="cv-note-section-title">Job Files</div><div class="cv-note-section-body">' + files + '</div></div>';
    }
    return html || '<div class="cv-note-empty">No notes available.</div>';
  }

  function parsePlaqueText(text){
    var lines = String(text || '').split(/\r?\n/).map(function(x){ return x.trim(); }).filter(Boolean);
    var plaques = [];
    var notes = [];
    var current = null;
    lines.forEach(function(line){
      var m = line.match(/^Plaque\s*#?\s*(\d+)\s*:?$/i);
      if (m) {
        current = { name:'', rank:'', monthPromoted:'' };
        plaques.push(current);
        return;
      }
      var idx = line.indexOf(':');
      var label = idx > -1 ? line.slice(0, idx).trim().toLowerCase() : '';
      var val = idx > -1 ? line.slice(idx + 1).trim() : line;
      if (current && label === 'name') current.name = val;
      else if (current && label === 'rank') current.rank = val;
      else if (current && (label === 'month promoted' || label === 'promoted' || label === 'month')) current.monthPromoted = val;
      else notes.push(line);
    });
    return { plaques: plaques.filter(function(p){return p.name || p.rank || p.monthPromoted;}), notes: notes.join('\n') };
  }

  function renderTextNotesHtml(text){
    var parsed = parsePlaqueText(text);
    var html = '';
    if (parsed.plaques.length) html += plaqueCards(parsed.plaques);
    if (parsed.notes) html += '<div class="cv-note-section"><div class="cv-note-section-title">Notes</div><div class="cv-note-section-body">' + esc(parsed.notes) + '</div></div>';
    return html || '<div class="cv-note-empty">No notes available.</div>';
  }

  function setupMobileNotes(){
    var modal = document.getElementById('notesModal');
    var title = document.getElementById('notesTitle');
    var oldBox = document.getElementById('notesText');
    if (!modal || !title || !oldBox || modal.dataset.cvNotesReady === 'true') return;
    modal.dataset.cvNotesReady = 'true';

    if (oldBox.tagName && oldBox.tagName.toLowerCase() === 'textarea') {
      var div = document.createElement('div');
      div.id = 'notesText';
      div.className = 'cv-note-display';
      oldBox.parentNode.replaceChild(div, oldBox);
    } else {
      oldBox.classList.add('cv-note-display');
    }
    var save = document.getElementById('saveNotes');
    if (save) save.classList.add('cv-hide-save');
    document.querySelectorAll('#notesModal [data-close]').forEach(function(b){ if (b.textContent.trim() === 'Cancel') b.textContent = 'Close'; });

    document.addEventListener('click', function(e){
      var btn = e.target.closest && e.target.closest('[data-notes]');
      if (!btn || typeof window.findJob !== 'function') return;
      var job = window.findJob(btn.dataset.notes);
      if (!job) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      title.textContent = 'Notes - ' + (job.id || 'Job');
      document.getElementById('notesText').innerHTML = renderJobNotesHtml(job);
      modal.classList.remove('hidden');
    }, true);
  }

  function setupWebNotes(){
    if (typeof window.openNoteModal !== 'function' || window.openNoteModal.__cvFormatted) return;
    var original = window.openNoteModal;
    window.openNoteModal = function(text){
      addStyle();
      var modal = document.getElementById('noteModal');
      var box = document.getElementById('noteModalText');
      if (!modal || !box) return original(text);
      box.classList.add('cv-note-display');
      box.innerHTML = renderTextNotesHtml(text);
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
    };
    window.openNoteModal.__cvFormatted = true;
  }

  function init(){
    addStyle();
    setupMobileNotes();
    setupWebNotes();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 300);
  setTimeout(init, 1200);
})();
