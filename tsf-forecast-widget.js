
(function(){
  var apiURL = (window.TSF_API_URL) || (function(){
    var meta = document.querySelector('meta[name="tsf-api-url"]');
    return meta ? meta.getAttribute('content') : 'http://localhost:8000';
  })();

  function el(tag, props, children){
    var e = document.createElement(tag);
    if(props){
      Object.keys(props).forEach(function(k){
        if(k === 'style'){
          Object.assign(e.style, props.style || {});
        } else if (k === 'class'){
          e.className = props[k];
        } else {
          e.setAttribute(k, props[k]);
        }
      });
    }
    (children || []).forEach(function(c){
      if(typeof c === 'string'){ e.appendChild(document.createTextNode(c)); }
      else if(c){ e.appendChild(c); }
    });
    return e;
  }

  var box = el('div', { id:'tsf-widget', style: {
    position:'fixed', right:'16px', bottom:'16px', width:'320px', zIndex: 2147483647,
    background:'#fff', border:'1px solid #ddd', borderRadius:'12px', boxShadow:'0 6px 20px rgba(0,0,0,0.15)',
    fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', padding:'14px'
  }});

  var title = el('div', { style:{fontWeight:'600', marginBottom:'8px', fontSize:'14px'}}, ['TSF Forecast Control']);
  var btn = el('button', { style:{
    padding:'8px 12px', fontSize:'14px', borderRadius:'8px', border:'1px solid #999', cursor:'pointer', background:'#f7f7f7'
  }}, ['Run Forecast']);
  var status = el('div', { style:{marginTop:'10px', fontSize:'13px', color:'#333'}}, ['Status: idle']);
  var barWrap = el('div', { style:{marginTop:'8px', width:'100%', height:'10px', background:'#eee', borderRadius:'6px', overflow:'hidden', display:'none'}});
  var bar = el('div', { style:{height:'100%', width:'0%', background:'#4a90e2'}});
  barWrap.appendChild(bar);
  var pct = el('div', { style:{fontSize:'12px', marginTop:'4px', color:'#333', display:'none'}}, ['0%']);
  var dl = el('button', { style:{
    display:'none', marginTop:'10px', padding:'8px 12px', fontSize:'14px', borderRadius:'8px', border:'1px solid #4a90e2', cursor:'pointer', background:'#eaf2fd', color:'#0b57d0'
  }}, ['Download Classical CSV']);

  box.appendChild(title);
  box.appendChild(btn);
  box.appendChild(status);
  box.appendChild(barWrap);
  box.appendChild(pct);
  box.appendChild(dl);
  document.body.appendChild(box);

  var jobId = null;
  var timer = null;

  function setProgress(v){
    bar.style.width = (v||0) + '%';
    pct.textContent = (v||0) + '%';
  }

  function poll(){
    if(!jobId) return;
    fetch(apiURL + '/forecast/status/' + jobId).then(function(r){ return r.json(); }).then(function(data){
      status.textContent = 'Status: ' + (data.status || 'unknown');
      if(typeof data.progress === 'number'){
        setProgress(data.progress);
      }
      if(data.status === 'completed'){
        clearInterval(timer); timer = null;
        dl.style.display = 'inline-block';
      }
      if(data.status === 'error'){
        clearInterval(timer); timer = null;
        status.textContent = 'Status: error';
      }
    }).catch(function(){
      // ignore transient errors
    });
  }

  btn.addEventListener('click', function(){
    btn.disabled = true;
    btn.textContent = 'Running…';
    status.textContent = 'Status: queued';
    barWrap.style.display = 'block';
    pct.style.display = 'block';
    setProgress(0);
    dl.style.display = 'none';
    jobId = null;
    fetch(apiURL + '/forecast/classical/run', { method:'POST' })
      .then(function(r){ return r.json(); })
      .then(function(data){
        jobId = data.job_id;
        status.textContent = 'Status: ' + (data.status || 'queued');
        if(timer) clearInterval(timer);
        timer = setInterval(poll, 1000);
      })
      .catch(function(){
        status.textContent = 'Status: failed to start';
        btn.disabled = false;
        btn.textContent = 'Run Forecast';
      });
  });

  dl.addEventListener('click', function(){
    if(!jobId) return;
    window.location.href = apiURL + '/forecast/download/' + jobId;
    btn.disabled = false;
    btn.textContent = 'Run Forecast';
  });
})();
