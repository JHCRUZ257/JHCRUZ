/* Sitio estático: navegación, contacto y utilidades locales. Sin servicios externos. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const body = document.body;
  const site = body.dataset.site;
  const email = body.dataset.email;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  if (menu && nav) {
    body.dataset.enhanced = 'true';
    const close = focus => { nav.dataset.open = 'false'; menu.setAttribute('aria-expanded', 'false'); if (focus) menu.focus(); };
    menu.addEventListener('click', () => { const open = nav.dataset.open !== 'true'; nav.dataset.open = String(open); menu.setAttribute('aria-expanded', String(open)); });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.dataset.open === 'true') close(true); });
    document.addEventListener('click', event => { if (nav.dataset.open === 'true' && !event.target.closest('.site-header')) close(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 800) close(false); });
  }
  for (const link of document.querySelectorAll('[data-link]')) {
    const value = window.SITE_LINKS && window.SITE_LINKS[link.dataset.link];
    if (typeof value !== 'string' || !value.trim()) continue;
    try { const url = new URL(value.trim()); if (['http:', 'https:'].includes(url.protocol) && url.hostname) { link.href = url.href; link.hidden = false; link.target = '_blank'; link.rel = 'noopener noreferrer'; } } catch (_) { /* Un enlace sin configurar permanece oculto. */ }
  }
  const contact = $('contact-form');
  if (contact) contact.addEventListener('submit', event => {
    event.preventDefault();
    if (!contact.reportValidity()) return;
    const name = contact.elements.name.value.trim(), subject = contact.elements.subject.value.trim(), message = contact.elements.message.value.trim();
    if (!name || !message) { $('contact-status').textContent = 'Escribe tu nombre y tu mensaje antes de preparar el correo.'; return; }
    const text = `Hola,\n\nSoy ${name}.\n\n${message}\n\nGracias.`;
    $('contact-status').textContent = 'El correo está preparado. Tu aplicación de correo debe abrirse para que lo revises y lo envíes. También puedes usar el correo directo de esta página.';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  });
  const trim = (value, max = 220) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2200-12-31') return false;
    const [y,m,d] = value.split('-').map(Number), date = new Date(Date.UTC(y,m-1,d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d;
  }
  const prettyDate = value => validDate(value) ? value.split('-').reverse().join('/') : 'Sin fecha';
  const utcDay = value => { const p = value.split('-').map(Number); return Date.UTC(p[0],p[1]-1,p[2]); };
  const dateFromUTC = value => new Date(value).toISOString().slice(0,10);
  function node(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
  function button(label, action, id, danger = false) { const el = node('button', label, 'quiet-button' + (danger ? ' danger' : '')); el.type = 'button'; el.dataset.action = action; el.dataset.id = id; return el; }
  const status = text => { if ($('tool-status')) $('tool-status').textContent = text; };
  let storageWarning = '';
  function readStore(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { storageWarning = 'No se pudo recuperar el almacenamiento local. Puedes seguir trabajando y descargar una copia.'; return null; } }
  function writeStore(key, data, message) { try { localStorage.setItem(key, JSON.stringify(data)); status(message || 'Cambios guardados en este navegador.'); } catch (_) { status('El navegador no permitió guardar los cambios. Conserva el trabajo descargando una copia antes de salir.'); } }
  function download(text, name, type) { const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const link = node('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const cell = value => { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g,'""') + '"'; };
  const csv = rows => '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  function jsonDownload(data, name) { download(JSON.stringify(data,null,2), name+'-'+today()+'.json', 'application/json;charset=utf-8'); }
  function setEmpty(empty, hasRows, filtered, heading, detail) { empty.hidden = hasRows; if (!hasRows) { empty.querySelector('h3').textContent = filtered ? 'No hay resultados con este filtro.' : heading; empty.querySelector('p').textContent = filtered ? 'Prueba otro filtro para ver los registros guardados.' : detail; } }
  function uniqueIds(rows) { const seen = new Set(); return rows.map(row => { if (!row.id || seen.has(row.id)) row.id = uid(); seen.add(row.id); return row; }); }
  function importJSON(id, validator, apply) {
    const input = $(id); if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0]; if (!file) return;
      try {
        if (file.size > 2500000) throw new Error('La copia supera el límite de 2,5 MB.');
        const data = validator(JSON.parse(await file.text()));
        if (!window.confirm('Recuperar esta copia reemplazará los registros actuales. Descarga una copia antes si quieres conservarlos. ¿Continuar?')) { status('La recuperación se canceló. Tus registros siguen igual.'); return; }
        apply(data);
      } catch (error) { status('No se recuperó la copia. ' + (error && error.message ? error.message : 'Revisa que sea un archivo JSON exportado desde esta herramienta.')); }
      finally { input.value = ''; }
    });
  }

  if (site === 'eber' && $('journal-form')) {
    const key='ibero_nov2026_eber_bitacora_v2',form=$('journal-form'),list=$('journal-list');
    const tags=['IA','Organización','Aprendizaje','Prueba de herramienta','Otra'],states=['En curso','Documentada'];let entries=[],editing=null;
    function cleanEntry(value){
      if(!value||typeof value!=='object'||!validDate(value.date)||!trim(value.title,160)||!trim(value.objective,1800)||!trim(value.trial,2200)||!tags.includes(value.tag)||!states.includes(value.state))return null;
      return{id:trim(value.id,80)||uid(),date:value.date,title:trim(value.title,160),tag:value.tag,objective:trim(value.objective,1800),trial:trim(value.trial,2200),finding:trim(value.finding,2200),next:trim(value.next,1800),state:value.state};
    }
    const saved=readStore(key);if(saved&&saved.site==='eber'&&Array.isArray(saved.entries))entries=uniqueIds(saved.entries.slice(0,500).map(cleanEntry).filter(Boolean));
    const packet=()=>({schema:2,site:'eber',exported_at:new Date().toISOString(),entries});const persist=message=>writeStore(key,packet(),message);
    function resetEditor(){editing=null;form.reset();form.elements.date.value=today();$('save-entry').textContent='Guardar nota ＋';$('editor-title').textContent='Registrar una prueba';$('cancel-edit').hidden=true;}
    function render(){
      const documented=entries.filter(e=>e.state==='Documentada').length;$('total-count').textContent=String(entries.length);$('documented-count').textContent=String(documented);$('pending-count').textContent=String(entries.length-documented);
      const search=$('search-notes').value.trim().toLocaleLowerCase('es'),tag=$('filter-tag').value;
      const visible=entries.filter(e=>(tag==='all'||e.tag===tag)&&(!search||[e.title,e.objective,e.trial,e.finding,e.next,e.tag].join(' ').toLocaleLowerCase('es').includes(search))).sort((a,b)=>b.date.localeCompare(a.date));
      $('visible-count').textContent=visible.length+' '+(visible.length===1?'nota':'notas');list.textContent='';
      for(const entry of visible){
        const card=node('article',undefined,'journal-card'),head=node('div',undefined,'journal-card-head');head.appendChild(node('time',prettyDate(entry.date)));head.children[0].setAttribute('datetime',entry.date);head.appendChild(node('span',entry.tag,'badge'));card.appendChild(head);card.appendChild(node('h3',entry.title));
        const details=node('dl',undefined,'journal-details');for(const [label,prop] of [['01 / Objetivo','objective'],['02 / Qué probé','trial'],['03 / Qué encontré','finding'],['04 / Siguiente acción','next']]){details.appendChild(node('dt',label));details.appendChild(node('dd',entry[prop]||'Por completar.'));}card.appendChild(details);card.appendChild(node('p',entry.state,'journal-state'));
        const controls=node('div',undefined,'record-actions');controls.appendChild(button('Editar','edit',entry.id));controls.appendChild(button(entry.state==='Documentada'?'Reabrir':'Marcar documentada','document',entry.id));controls.appendChild(button('Eliminar','delete',entry.id,true));card.appendChild(controls);list.appendChild(card);
      }
      setEmpty($('empty-state'),visible.length>0,entries.length>0,'Tu primera página está en blanco.','Piensa en algo que quieras aprender. Registra una prueba y vuelve cuando tengas un hallazgo.');
      for(const id of ['export-txt','export-json','clear-entries'])$(id).disabled=!entries.length;
    }
    form.addEventListener('submit',event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const raw={id:editing||uid()};for(const name of ['date','title','tag','objective','trial','finding','next','state'])raw[name]=form.elements[name].value;
      const draft=cleanEntry(raw);if(!draft){status('Completa una fecha válida, un título, el objetivo y lo que probaste.');return;}
      if(!editing&&entries.length>=500){status('La bitácora admite hasta 500 notas. Descarga una copia antes de reorganizarla.');return;}
      if(editing)entries=entries.map(e=>e.id===editing?draft:e);else entries.push(draft);
      resetEditor();persist('Nota guardada. Puedes completar el hallazgo cuando termines la prueba.');render();form.elements.title.focus();
    });
    $('cancel-edit').addEventListener('click',()=>{resetEditor();status('Edición cancelada.');});
    $('search-notes').addEventListener('input',render);$('filter-tag').addEventListener('change',render);
    list.addEventListener('click',event=>{
      const target=event.target.closest('button[data-action]');if(!target)return;const entry=entries.find(e=>e.id===target.dataset.id);if(!entry)return;
      if(target.dataset.action==='delete'){entries=entries.filter(e=>e.id!==entry.id);if(editing===entry.id)resetEditor();persist('Nota eliminada.');render();}
      if(target.dataset.action==='document'){entry.state=entry.state==='Documentada'?'En curso':'Documentada';if(editing===entry.id)resetEditor();persist('Estado de la nota actualizado.');render();}
      if(target.dataset.action==='edit'){editing=entry.id;for(const name of ['date','title','tag','objective','trial','finding','next','state'])form.elements[name].value=entry[name];$('save-entry').textContent='Guardar cambios';$('editor-title').textContent='Editar una prueba';$('cancel-edit').hidden=false;form.elements.title.focus();status('Editando una nota. Guarda los cambios o cancela para volver.');}
    });
    $('clear-entries').addEventListener('click',()=>{if(!entries.length||!window.confirm('¿Vaciar todas las notas? Descarga una copia JSON para recuperarlas después.'))return;entries=[];resetEditor();persist('La bitácora quedó vacía.');render();});
    $('export-txt').addEventListener('click',()=>{
      const text='BITÁCORA DE APRENDIZAJE\nEber Hernandez\nExportación: '+prettyDate(today())+'\n\n'+entries.map(e=>`${e.title}\n${prettyDate(e.date)} · ${e.tag} · ${e.state}\n\nOBJETIVO\n${e.objective}\n\nQUÉ PROBÉ\n${e.trial}\n\nQUÉ ENCONTRÉ\n${e.finding||'Por completar.'}\n\nSIGUIENTE ACCIÓN\n${e.next||'Por completar.'}`).join('\n\n'+'—'.repeat(45)+'\n\n');download(text,'bitacora-'+today()+'.txt','text/plain;charset=utf-8');status('Notas preparadas en un archivo de texto.');
    });
    $('export-json').addEventListener('click',()=>{jsonDownload(packet(),'bitacora');status('Copia JSON preparada para recuperar tus notas.');});
    importJSON('import-json',value=>{if(!value||value.site!=='eber'||value.schema!==2||!Array.isArray(value.entries)||value.entries.length>500)throw new Error('El archivo no es una copia compatible de esta bitácora.');const rows=value.entries.map(cleanEntry);if(rows.some(e=>!e))throw new Error('La copia contiene notas incompletas o fechas no válidas.');return uniqueIds(rows);},rows=>{entries=rows;$('search-notes').value='';$('filter-tag').value='all';resetEditor();persist('Copia recuperada: '+entries.length+' notas.');render();});
    resetEditor();render();if(storageWarning)status(storageWarning);
  }

})();
