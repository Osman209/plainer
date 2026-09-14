const FILE_TEXT={
 en:{title:'Start with your document',hint:'Drop a PDF, Word (.docx) or text file here, or choose a file. Up to 10 MB. Extracted text is appended to your draft.',choose:'Choose file',loading:'Reading file…',remove:'Dismiss file',type:'Choose a PDF, DOCX or TXT file. Older DOC files must be saved as DOCX first.',size:'The file exceeds 10 MB.',empty:'No readable text found. Scanned PDFs need text recognition first.',failed:'Could not read this file. It may be damaged or password protected.',many:'Choose one file at a time.',privacy:'Files are read in your browser. Text is sent to the selected service only when you start a review.'},
 ar:{title:'ابدأ بمستندك',hint:'اسحب ملف PDF أو Word (.docx) أو ملفًا نصيًا هنا، أو اختر ملفًا. الحد الأقصى ١٠ ميجابايت. يُضاف النص إلى مسودتك.',choose:'اختيار ملف',loading:'جارٍ قراءة الملف…',remove:'إزالة اسم الملف',type:'اختر ملف PDF أو DOCX أو TXT. احفظ ملفات DOC القديمة بصيغة DOCX أولًا.',size:'حجم الملف أكبر من ١٠ ميجابايت.',empty:'لم نعثر على نص قابل للقراءة. ملفات الصور الممسوحة تحتاج تحويل الصور إلى نص أولًا.',failed:'تعذرت قراءة الملف. قد يكون تالفًا أو محميًا بكلمة مرور.',many:'اختر ملفًا واحدًا في كل مرة.',privacy:'تُقرأ الملفات داخل متصفحك. يُرسل النص للخدمة المختارة عند بدء المراجعة فقط.'}
};
async function extractFile(file){
 const ext=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx','txt'].includes(ext))throw Error('type');
 if(file.size>10*1024*1024)throw Error('size');
 if(ext==='txt')return file.text();
 const data=await file.arrayBuffer();
 if(ext==='docx')return (await mammoth.extractRawText({arrayBuffer:data})).value;
 const {getDocument,GlobalWorkerOptions}=await import('./pdf.min.mjs');
 GlobalWorkerOptions.workerSrc='./pdf.worker.min.mjs';
 const task=getDocument({data,isEvalSupported:false});
 task.onPassword=()=>task.destroy();
 try{const pdf=await task.promise, pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   pages.push(content.items.map(item=>('str' in item?item.str+(item.hasEOL?'\n':' '):'')).join(''));
   page.cleanup();
  }
  return pages.join('\n\n');
 }finally{await task.destroy();}
}
function FileImport({lang,disabled,onText}){
 const t=FILE_TEXT[lang],input=React.useRef(null),lock=React.useRef(false);
 const [busy,setBusy]=React.useState(false),[name,setName]=React.useState(''),[error,setError]=React.useState(''),[drag,setDrag]=React.useState(false);
 async function read(files){
  if(disabled||lock.current||!files.length)return;
  if(files.length!==1){setError('many');return;}
  lock.current=true;setBusy(true);setError('');
  try{const value=await extractFile(files[0]);if(!value.trim())throw Error('empty');onText(value);setName(files[0].name);}
  catch(e){setError(['size','type','empty'].includes(e.message)?e.message:'failed');}
  finally{lock.current=false;setBusy(false);if(input.current)input.current.value='';}
 }
 return <div className={'file-zone'+(drag?' dragging':'')} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);read(e.dataTransfer.files);}} aria-busy={busy}>
  <div><h2>{t.title}</h2><p>{t.hint}</p><small>{t.privacy}</small></div>
  <input ref={input} type="file" accept=".pdf,.docx,.txt" hidden onChange={e=>read(e.target.files)}/>
  <button disabled={disabled||busy} onClick={()=>input.current.click()}>{busy?t.loading:t.choose}</button>
  {name&&<p className="file-name"><bdi>{name}</bdi> <button onClick={()=>setName('')}>{t.remove}</button></p>}
  {error&&<p role="alert">{t[error]}</p>}
 </div>;
}
