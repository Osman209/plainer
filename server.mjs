import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

export function createServer({env=process.env,fetchImpl=fetch}={}) {
  const providers = {
    openai: {key:env.OPENAI_API_KEY,model:env.OPENAI_MODEL},
    anthropic: {key:env.ANTHROPIC_API_KEY,model:env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'}
  };
  let active=0;
  return http.createServer(async(req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
    // Local personal-use server, intentionally not a public paid API proxy.
    const expectedHost=`127.0.0.1:${res.socket.localPort}`;
    const alternateHost=`localhost:${res.socket.localPort}`;
    if (![expectedHost,alternateHost].includes(req.headers.host)) return send(403,{error:'Invalid host'});
    if (req.headers.origin && ![`http://${expectedHost}`,`http://${alternateHost}`].includes(req.headers.origin)) return send(403,{error:'Cross-origin requests are not allowed'});
    const path=new URL(req.url,`http://${expectedHost}`).pathname;
    if(req.method==='GET' && ['/pdf.worker.min.mjs','/pdf.min.mjs','/mammoth.browser.js'].includes(path)) {
      try {const asset=await readFile(new URL('.'+path,import.meta.url));res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(asset);}catch{send(404,{error:'Build the page first'});}return;
    }
    if(req.method==='GET' && path==='/api/config') return send(200,{providers:Object.fromEntries(Object.entries(providers).map(([name,p])=>[name,!!(p.key&&p.model)]))});
    if(req.method==='GET' && (path==='/' || path==='/index.html')) {
      try {const html=await readFile(new URL('./index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(html);}catch{send(500,{error:'Build the page first: npm run build'});}return;
    }
    if(req.method!=='POST' || path!=='/api/review') return send(404,{error:'Not found'});
    if(!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'JSON required'});
    if(active>=2) return send(429,{error:'Another review is running. Try again shortly.'});
    active++;
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),120000);
    const cancel=()=>{if(!res.writableEnded)ctrl.abort();};
    res.on('close',cancel);
    try {
      let body='';
      for await (const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>250000) {send(413,{error:'Passage is too large. Review a shorter section.'});return;}}
      let input;try{input=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON'});}
      if(!input || !Object.hasOwn(providers,input.provider) || typeof input.system!=='string' || !Array.isArray(input.messages) || input.messages.length!==1 || input.messages[0]?.role!=='user' || typeof input.messages[0]?.content!=='string' || !input.messages[0].content.trim()) return send(400,{error:'Invalid review request'});
      const p=providers[input.provider];
      if(!p.key || !p.model) return send(503,{error:'Set the provider API key and model in .env, then restart the server.'});
      const limit=Math.min(8000,Math.max(100,Number(input.max_tokens)||4000));
      const openai=input.provider==='openai';
      const upstream=await fetchImpl(openai?'https://api.openai.com/v1/responses':'https://api.anthropic.com/v1/messages',{
        method:'POST',signal:ctrl.signal,
        headers:openai?{'Content-Type':'application/json',Authorization:`Bearer ${p.key}`}:{'Content-Type':'application/json','x-api-key':p.key,'anthropic-version':'2023-06-01'},
        body:JSON.stringify(openai?{model:p.model,instructions:input.system,input:input.messages,max_output_tokens:limit,store:false}:{model:p.model,system:input.system,messages:input.messages,max_tokens:limit})
      });
      if(!upstream.ok) return send(upstream.status===429?429:502,{error:`${openai?'OpenAI':'Claude'} returned ${upstream.status}. Check the model, API key, balance and rate limits.`});
      const data=await upstream.json();
      if(data.status==='incomplete' || data.stop_reason==='max_tokens') return send(422,{error:'The model response was cut short. Review a shorter section.'});
      const text=openai?(data.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join(''):(data.content||[]).filter(part=>part.type==='text').map(part=>part.text).join('');
      if(!text) return send(422,{error:'The model returned no text. Try a different passage or model.'});
      send(200,{content:[{type:'text',text}]});
    }catch(error){if(!res.destroyed)send(error.name==='AbortError'?504:502,{error:error.name==='AbortError'?'Review timed out. Try a shorter section.':'Could not reach the model provider.'});}
    finally{active--;clearTimeout(timer);res.off('close',cancel);}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||3000);
  createServer().listen(port,'127.0.0.1',()=>console.log(`Plainer: http://127.0.0.1:${port}`));
}
