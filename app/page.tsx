'use client';
import {readTemplates, writeTemplate, type SavedTemplate} from '../lib/saved-templates';
import { imageDigest, uploadDirect } from '../lib/direct-upload';
import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowLeft,Check,ChevronRight,CloudUpload,FileSpreadsheet,Images,Layers3,Settings2,Download,Plus,Trash2,ShieldCheck,FolderOpen,RotateCcw,Save,Search,X,LoaderCircle} from 'lucide-react';
import {populateWorkbook} from '../lib/workbook.mjs';
import {parseModel,rowsFor,defaultTitle,safeFilename,letter} from '../lib/listing.mjs';
type Profile = {
  name: string;
  account: string;
  counter: number;
  templateName?: string;
  marker?: string;
};
type Item={file:File;model:string;url?:string;error?:string;thumb:string};
const fields=['Product title','Model dropdown','Image URL','Product ID','SKU ID'];
export default function Studio(){
 const [step,S]=useState(2),[tab,T]=useState('New listing'),[error,E]=useState(''),[notice,N]=useState(''),[wb,W]=useState<any>(),[filename,F]=useState(''),[sheetName,SN]=useState(''),[header,H]=useState(4),[start,SR]=useState(5),[maps,M]=useState<number[]>([4,24,32,36,37]),[account,A]=useState('EG'),[counter,C]=useState(1),[title,TT]=useState(defaultTitle),[fallback,FB]=useState('Others'),[model,MD]=useState(''),[items,I]=useState<Item[]>([]),[filter,FI]=useState(''),[busy,B]=useState(false),[storage,ST]=useState(false),[profiles,P]=useState<Profile[]>([]),[profile,PN]=useState(''),[marker,MK]=useState('_pexels-'),[allow,AO]=useState(false),[clear,CL]=useState(''),[fixed,FX]=useState(''),[savedHeaders,SH]=useState<string[]>([]);
 const cancel=useRef(false);const excelInput=useRef<HTMLInputElement>(null),imageInput=useRef<HTMLInputElement>(null);
 const [templates,setTemplates]=useState<SavedTemplate[]>([]);
 const [activeProfile,setActiveProfile]=useState('');
 const [assignedTemplate,setAssignedTemplate]=useState('');
 const [templateName,setTemplateName]=useState('');
 const [buffer,setBuffer]=useState<ArrayBuffer>();
 const [restoring,setRestoring]=useState(true);
 const [downloaded,setDownloaded]=useState(false);
 const seller=profiles.find(p=>p.name===activeProfile);
 const listingTemplate=templates.find(t=>t.name===seller?.templateName);
 const editingTemplate=tab==='Excel templates';

 useEffect(()=>{
   let active=true;
   async function restore(){
     try{
       P(JSON.parse(localStorage.getItem('meesho-profiles')||'[]'));
       setActiveProfile(localStorage.getItem('meesho-active-profile')||'');
       const saved=await readTemplates();
       if(active)setTemplates(saved);
     }catch(e){
       if(active)E(`Could not restore saved setup: ${(e as Error).message}`);
     }finally{
       if(active)setRestoring(false);
     }
   }
   void restore();
   fetch('/api/storage').then(r=>r.json()).then(d=>ST((d as {configured:boolean}).configured)).catch(()=>{});
   return ()=>{active=false;};
 },[]);

 useEffect(()=>{
   if(tab!=='New listing')return;
   let active=true;
   if(seller){
     A(seller.account);
     C(seller.counter);
   }
   if(listingTemplate){
     openTemplate(listingTemplate,()=>active).catch(e=>{
       if(active)E(`Could not open saved workbook: ${(e as Error).message}`);
     });
   }
   return ()=>{active=false;};
 },[tab,seller,listingTemplate]);

 useEffect(()=>{
   if(seller)MK(seller.marker||'_pexels-');
 },[seller]);

 async function openTemplate(saved:SavedTemplate,isCurrent=()=>true){
   const ExcelJS=await import('exceljs');
   const book=new ExcelJS.Workbook();
   await book.xlsx.load(saved.buffer);
   if(!isCurrent())return;
   W(book);F(saved.filename);setBuffer(saved.buffer);
   SN(saved.sheetName);H(saved.header);SR(saved.start);M(saved.maps);
   TT(saved.title);FB(saved.fallback);AO(saved.allow);CL(saved.clear);FX(saved.fixed);
   SH(saved.headers);
 }

 function navigate(name:string){
   if(name===tab)return;
   E('');N('');
   if(name==='Excel templates')newTemplate();
   if(name==='New listing')W(undefined);
   if(name==='Seller profiles')editProfile(seller);
   if(name==='New listing')S(2);
   T(name);
 }

 function newTemplate(){
   E('');N('');W(undefined);
   setTemplateName('');setBuffer(undefined);F('');SN('');
   H(4);SR(5);M([4,24,32,36,37]);TT(defaultTitle);FB('Others');
   AO(false);CL('');FX('');SH([]);
   if(excelInput.current)excelInput.current.value='';
 }

 function selectProfile(name:string){
   try{
     localStorage.setItem('meesho-active-profile',name);
     if(name!==activeProfile){W(undefined);setDownloaded(false);S(2);setActiveProfile(name);}
   }catch(e){E((e as Error).message);}
 }

 function editProfile(saved?:Profile){
   PN(saved?.name||'');A(saved?.account??'EG');C(saved?.counter??1);
   setAssignedTemplate(saved?.templateName||'');
 }

 function saveProfile(){
   E('');
   try{
     const name=profile.trim();
     if(!name||!templates.some(t=>t.name===assignedTemplate))throw Error('Enter a profile name and select an Excel template.');
     const existing=profiles.find(p=>p.name===name);
     const next=[...profiles.filter(p=>p.name!==name),{
       ...existing,name,account,counter,templateName:assignedTemplate,marker:existing?.marker||marker
     }];
     localStorage.setItem('meesho-profiles',JSON.stringify(next));
     P(next);
     selectProfile(name);
     N('Seller profile saved on this browser.');
   }catch(e){E((e as Error).message);}
 }

 async function editTemplate(name:string){
   const saved=templates.find(t=>t.name===name);
   if(!saved)return;
   E('');B(true);
   try{
     await openTemplate(saved);
     setTemplateName(name);
   }catch(e){E((e as Error).message);}finally{B(false);}
 }

 async function saveTemplate(){
   E('');
   try{
     const name=templateName.trim();
     if(!name||!buffer||!sheet)throw Error('Enter a template name and upload a workbook.');
     validateMapping();
     if(templates.some(t=>t.name===name)&&!confirm(`Update ${name} for every seller using it?`))return;
     B(true);
     const saved:SavedTemplate={
       name,filename,buffer,sheetName,header,start,maps,title,fallback,allow,clear,fixed,
       headers:maps.map(n=>text(sheet.getCell(header,n).value))
     };
     await writeTemplate(saved);
     setTemplates(current=>[...current.filter(t=>t.name!==name),saved]);
     N('Excel template saved. Assign it under Seller profiles.');
   }catch(e){E((e as Error).message);}finally{B(false);}
 }

 const sheet=wb?.getWorksheet(sheetName);const text=(v:any):string=>v==null?'':typeof v==='object'?(v.text||v.result||v.richText?.map((r:any)=>r.text).join('')||v.formula||''):String(v);
 const validRow=(row:number)=>Number.isInteger(row)&&row>=1&&row<=1048576;
 const cols=editingTemplate?Array.from({length:Math.min(300,Math.max(sheet?.columnCount||40,40))},(_,i)=>({n:i+1,label:`${letter(i+1)} · ${(validRow(header)?text(sheet?.getCell(header,i+1).value):'')||'Untitled'}`})):[];
 const selected=items.filter(it=>!filter||it.model.toLowerCase().includes(filter.toLowerCase())||it.file.name.toLowerCase().includes(filter.toLowerCase()));
 const ready=selected.filter(i=>i.url).length;const models=[...new Set(selected.map(i=>i.model.toLowerCase()))];
 function reset(ask=true){if(ask&&!confirm('Clear this batch? Saved profiles and hosted images will remain.'))return;items.forEach(i=>URL.revokeObjectURL(i.thumb));I([]);FI('');MD('');setDownloaded(false);S(2);E('');N('');}
 async function template(file?:File){if(!file||busy)return;E('');B(true);try{if(!confirm('ExcelJS preserves common styles, formulas, sheets and dropdowns, but advanced Excel features may not survive a round trip. Use a copy and review the output. Continue?'))return;if(file.size>15*1024*1024)throw Error('Template must be smaller than 15 MB.');if(!/\.(xlsx|xls)$/i.test(file.name))throw Error('Choose an .xlsx or .xls template.');const ExcelJS=await import('exceljs');const book=new ExcelJS.Workbook();let buffer=await file.arrayBuffer();if(/\.xls$/i.test(file.name)){if(!confirm('Legacy .xls will be converted to .xlsx. This can lose formatting, dropdowns and other Excel features. Continue only if you accept conversion.'))return;const XLSX=await import('xlsx');const legacy=XLSX.read(buffer);buffer=XLSX.write(legacy,{type:'array',bookType:'xlsx'});N('Legacy template converted. Check all formatting and dropdown settings before use.');}await book.xlsx.load(buffer);if(!book.worksheets.length)throw Error('Workbook has no worksheets.');W(book);setBuffer(buffer);SH([]);F(file.name);SN(book.worksheets[0].name);let best=1,score=0;for(let r=1;r<=Math.min(15,book.worksheets[0].rowCount);r++){let s=0;book.worksheets[0].getRow(r).eachCell((c:any)=>{if(/product|image|sku|model|title|price/i.test(text(c.value)))s++;});if(s>score){score=s;best=r;}}H(best);SR(best+1);N('Template loaded. Verify the detected header and mappings.');}catch(e){E((e as Error).message);}finally{B(false);}}
 function images(files:FileList|File[]|null){if(!files)return;E('');const additions:Item[]=[];const errors:string[]=[];for(const file of Array.from(files)){try{if(file.size>10*1024*1024)throw Error(`${file.name}: larger than 10 MB`);const m=parseModel(file.name,marker);if(items.some(i=>i.file.name===file.name)||additions.some(i=>i.file.name===file.name))throw Error(`${file.name}: duplicate filename`);additions.push({file,model:m,thumb:URL.createObjectURL(file)});}catch(e){errors.push((e as Error).message);}}I(prev=>[...prev,...additions]);if(additions.length&&!model)MD(additions[0].model);if(errors.length)E(errors.join('\n'));}
 function validateMapping(){
   if(!sheet)throw Error('Upload a template first.');
   if(!Number.isInteger(header)||header<1||header>=1048576)throw Error('Choose a valid header row.');
   if(new Set(maps).size!==5||maps.some(m=>!Number.isInteger(m)||m<1||m>16384))throw Error('Choose five separate, valid columns.');
   if(!Number.isInteger(start)||start<=header||start>1048576)throw Error('Starting row must be below the header and within Excel limits.');
 }
 function validate(){validateMapping();if(start+selected.length>1048577)throw Error('The batch exceeds the Excel row limit.');if(!selected.length)throw Error('Select at least one image.');if(models.length!==1)throw Error('This batch contains multiple models. Filter to exactly one model.');if(title.replaceAll('${modelName}',model).length>32767)throw Error('Title exceeds the Excel cell limit of 32,767 characters.');if(!model.trim())throw Error('Enter the model name.');if(selected.some(i=>!i.url))throw Error('Upload all selected images before generating.');if(savedHeaders.length&&maps.some((m,i)=>savedHeaders[i]&&savedHeaders[i]!==text(sheet!.getCell(header,m).value)))throw Error('Saved workbook headers changed. Review the mappings under Excel templates.');}
 function dropdown(book:any){const s=book.getWorksheet(sheetName);const dv=s.getCell(start,maps[1]).dataValidation;if(!dv?.type||dv.type!=='list')return model;const f=dv.formulae?.[0];let vals:string[]=[];if(typeof f==='string'&&f.startsWith('"'))vals=f.slice(1,-1).split(',');else if(typeof f==='string'){let range=f.replace(/^=/,'');const defined=book.definedNames.getRanges(range)?.ranges?.[0];if(defined)range=defined;const parts=range.split('!');const target=parts.length>1?book.getWorksheet(parts[0].replace(/^'|'$/g,'').replaceAll("''","'")):s;const address=parts.at(-1)?.replaceAll('$','');const match=address?.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);if(!target||!match)throw Error('Dropdown source cannot be resolved. Use a supported list or range validation.');for(let r=Number(match[2]);r<=Number(match[4])&&vals.length<20000;r++)vals.push(text(target.getCell(`${match[1]}${r}`).value));}const found=vals.find(v=>v.trim().toLowerCase()===model.trim().toLowerCase());if(found)return found;const other=vals.find(v=>v.trim().toLowerCase()===fallback.trim().toLowerCase());if(!other)throw Error('Fallback is not an allowed dropdown value. Update the fallback.');return other;}
 async function upload() {
  E('');
  if (models.length !== 1) { E('Filter images to a single model first.'); return; }
  B(true);
  cancel.current = false;
  const pending = selected.filter(item => !item.url);
  const update = (item: Item, result: Partial<Item>) => {
   I(previous => previous.map(current => current === item ? { ...current, ...result } : current));
  };

  try {
   for (let offset = 0; offset < pending.length && !cancel.current; offset += 200) {
    const batch = pending.slice(offset, offset + 200);
    const valid: { item: Item; digest: string }[] = [];
    for (const item of batch) {
     if (cancel.current) break;
     try {
      valid.push({ item, digest: await imageDigest(item.file) });
     } catch (error) {
      update(item, { error: (error as Error).message });
     }
    }
    if (cancel.current || !valid.length) continue;

    const response = await fetch('/api/upload/sign', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(valid.map(entry => entry.digest)),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Could not authorize uploads.');

    let next = 0;
    async function uploadNext() {
     while (!cancel.current && next < valid.length) {
      const index = next++;
      const { item } = valid[index];
      try {
       const url = await uploadDirect(item.file, data.cloud, data.uploads[index]);
       update(item, { url, error: undefined });
      } catch (error) {
       update(item, { error: (error as Error).message });
      }
     }
    }
    await Promise.all(Array.from({ length: Math.min(5, valid.length) }, uploadNext));
   }
  } catch (error) {
   E((error as Error).message);
  } finally {
   B(false);
  }
 }
 async function generate(){E('');B(true);try{validate();const ExcelJS=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(buffer!);const s=book.getWorksheet(sheetName)!;const rows=rowsFor(model,account,counter,title,selected.map(i=>i.url!),dropdown(book));let extras:{col:number,value:string}[]=[];for(const line of fixed.split('\n').filter(Boolean)){const match=line.match(/^([A-Za-z]+)=(.*)$/);if(!match)throw Error('Fixed values must use COLUMN=value, one per line.');extras.push({col:columnNumber(match[1]),value:match[2]});}const clearing=clear.split(',').map(v=>v.trim()).filter(Boolean).map(columnNumber);if(extras.some(e=>maps.includes(e.col))||new Set(extras.map(e=>e.col)).size!==extras.length)throw Error('Additional columns conflict with a mapped field.');populateWorkbook(s,{start,maps,rows,clearing,extras,allow,model});const data=await book.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=safeFilename(model)+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setDownloaded(true);N(`${rows.length} rows generated. Workbook downloaded.`);}catch(e){E((e as Error).message);}finally{B(false);}}
 function columnNumber(v:string){if(!/^[a-z]{1,3}$/i.test(v))throw Error('Use valid column letters.');const n=v.toUpperCase().split('').reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);if(n>16384)throw Error('Column exceeds Excel limits.');return n;}
 const steps=['Product images','Review & download'];
 return <div className="shell"><aside><a className="brand" href="/ "><div className="brandIcon"><Layers3 size={23}/></div><span>listing<span className="serif">studio</span><small>FOR MEESHO SELLERS</small></span></a><div className="workspaceLabel">WORKSPACE</div><nav>{[['New listing',Plus],['Seller profiles',FolderOpen],['Excel templates',FileSpreadsheet],['Settings',Settings2]].map(([name,Icon]:any)=><button key={name} className={tab===name?'active':''} disabled={busy||restoring} onClick={()=>navigate(name)}><Icon size={18}/>{name}{name==='New listing'&&<span className="navDot"/>}</button>)}</nav><div className="sideNote"><div className="tinyIcon"><ShieldCheck size={19}/></div><b>Your template. Your control.</b><p>Keep your Excel layout and choose exactly where your listing data goes.</p></div><div className="sideFoot"><span className="avatar">MS</span><div>Seller workspace<small>Private · Just for you</small></div></div></aside>
 <main><header><span>Workspace <ChevronRight size={14}/> {tab}</span><div className="headerRight"><span className="statusDot"/> Private workspace</div></header><div className="content"><div className="eyebrow">LESS SPREADSHEET WORK. MORE SELLING.</div><div className="pageTitle"><div><h1>{tab==='New listing'?'Your next listing starts here.':tab==='Settings'?'Make it work your way.':editingTemplate?'Set up your Excel templates.':'A home for every seller account.'}</h1><p>{tab==='New listing'?'Turn your product images into a ready-to-review Meesho Excel file.':tab==='Settings'?'Connect real image hosting and tune your filename rules.':'Save the settings you use, then pick up where you left off.'}</p></div>{tab==='New listing'&&<button className="subtle" disabled={busy} onClick={()=>reset()}><RotateCcw size={15}/>Reset batch</button>}</div>
 {error&&<div className="alert error" role="alert">{error}<button onClick={()=>E('')}><X size={15}/></button></div>}{notice&&<div className="alert success" role="status">{notice}<button onClick={()=>N('')}><X size={15}/></button></div>}
 {tab==='Seller profiles'?<section className="card">
   <div className="sectionHead"><h2>Seller profiles</h2><span className="tag">Saved on this browser</span></div>
   <p>Link each seller to an Excel template. Multiple sellers can share a template.</p>
   <button className="outline" onClick={()=>editProfile()}>New seller</button>
   <div className="profileList">{profiles.map(p=><div key={p.name}>
     <div><b>{p.name}</b><small>{p.templateName||'Choose a saved template to finish setup'}</small></div>
     <button className="outline" onClick={()=>editProfile(p)}>Edit</button>
     <button aria-label={`Delete ${p.name}`} className="subtle" onClick={()=>{
       if(!confirm(`Delete ${p.name}?`))return;
       try{
         const next=profiles.filter(a=>a.name!==p.name);
         localStorage.setItem('meesho-profiles',JSON.stringify(next));
         P(next);
         if(activeProfile===p.name)selectProfile('');
         if(profile===p.name)editProfile();
       }catch(e){E((e as Error).message);}
     }}><Trash2 size={16}/></button>
   </div>)}</div>
   <label>Profile name<input value={profile} onChange={e=>PN(e.target.value)}/></label>
   <label>Excel template<select value={assignedTemplate} onChange={e=>setAssignedTemplate(e.target.value)}>
     <option value="">Choose a saved template</option>
     {templates.map(t=><option key={t.name}>{t.name}</option>)}
   </select></label>
   {!templates.length&&<button className="outline" onClick={()=>navigate('Excel templates')}>Set up an Excel template</button>}
   <div className="formGrid two">
     <label>Account-specific ID text<input value={account} onChange={e=>A(e.target.value)}/></label>
     <label>Starting counter<input type="number" min="1" value={counter} onChange={e=>C(+e.target.value)}/></label>
   </div>
   <button className="primary" onClick={saveProfile}><Save size={16}/>Save seller profile</button>
 </section>:tab==='Settings'?<section className="card"><div className="sectionHead"><h2>Image hosting</h2><span className={'tag '+(storage?'green':'amber')}>{storage?'Connected':'Setup required'}</span></div><h3>Cloudinary · signed uploads</h3><p>Images are uploaded through the server. API secrets never enter this browser. Configure these environment variables in the hosting environment:</p><pre>CLOUDINARY_CLOUD_NAME{'\n'}CLOUDINARY_API_KEY{'\n'}CLOUDINARY_API_SECRET</pre><p>JPG, JPEG and PNG · 10 MB per image · sequential uploads · successful URLs retained for retries.</p><a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="outline">Open Cloudinary console <ArrowRight size={15}/></a><hr/><label>Filename suffix marker<input value={marker} onChange={e=>MK(e.target.value)}/></label><p className="hint">Default: model_pexels-…_resized.jpg. Numbered files such as Oppo f19s_1.jpg are also supported.</p><div className="callout">Public image retrieval is checked after upload. Actual acceptance must be checked in Meesho’s supported bulk upload flow.</div></section>:<>
 {editingTemplate?<section className="card">
   <div className="sectionHead"><h2>Excel templates</h2><span className="tag">Saved on this browser</span></div>
   <p>Save the workbook and column settings once, then link the template to your sellers.</p>
   <button className="outline" disabled={busy} onClick={newTemplate}>New Excel template</button>
   <div className="profileList">{templates.map(t=><div key={t.name}><b>{t.name}</b>
     <button className="outline" disabled={busy} onClick={()=>editTemplate(t.name)}>Edit</button>
   </div>)}</div>
   <label>Template name<input value={templateName} onChange={e=>setTemplateName(e.target.value)}/></label>
 </section>:<>
   <div className="profileBar"><div className="avatar small">MS</div><div><small>SELLER PROFILE</small>
     <select aria-label="Seller profile" disabled={busy||restoring} value={seller?.name||''} onChange={e=>selectProfile(e.target.value)}>
       <option value="">Choose a seller</option>{profiles.map(p=><option key={p.name}>{p.name}</option>)}
     </select>{listingTemplate&&<small>{listingTemplate.name}</small>}</div>
     <button className="subtle" disabled={busy||restoring} onClick={()=>navigate('Seller profiles')}><Settings2 size={16}/>Manage profiles</button>
   </div>
   {wb&&listingTemplate&&<div className="stepper">{steps.map((name,i)=><button className={step===i+2?'current':step>i+2?'done':''} disabled={busy} onClick={()=>S(i+2)} key={name}><span>{step>i+2?<Check size={14}/>:i+1}</span>{name}{i===0&&<div className="stepLine"/>}</button>)}</div>}
 </>}
 <div className="workGrid"><div className="workMain">
 {!editingTemplate&&(!listingTemplate||!wb)&&<section className="card">
   <p>{restoring?'Loading saved setup…':listingTemplate?'Opening saved workbook…':seller?'Assign an Excel template to this seller under Seller profiles.':'Set up an Excel template and seller profile, then select the seller here.'}</p>
 </section>}
 {editingTemplate&&<><section className="card"><div className="sectionHead"><div><h2>Start with your Excel template</h2><p>Use the original template downloaded from your Meesho account.</p></div></div><input ref={excelInput} type="file" accept=".xlsx,.xls" hidden onChange={e=>template(e.target.files?.[0])}/><div className="dropzone" role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&excelInput.current?.click()} onClick={()=>excelInput.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();template(e.dataTransfer.files[0]);}}><div className="uploadIcon"><FileSpreadsheet size={27}/></div><h3>{filename||'Drop your Meesho template here'}</h3><p>or <b>browse files</b> to get started</p><small>XLSX or XLS · Up to 15 MB</small></div>{wb&&<div className="formGrid"><label>Worksheet<select value={sheetName} onChange={e=>SN(e.target.value)}>{wb.worksheets.map((s:any)=><option key={s.name}>{s.name}</option>)}</select></label><label>Header row<input type="number" min="1" value={header} onChange={e=>H(+e.target.value)}/></label><label>First product row<input type="number" min="1" value={start} onChange={e=>SR(+e.target.value)}/></label></div>}</section><section className="card"><div className="sectionHead"><div><h2>Match your columns</h2><p>Your template can change. Your mapping can too.</p></div><Settings2 size={19}/></div>{!wb?<div className="emptyMapping"><Layers3 size={24}/><div><b>Your columns will appear here</b><p>Upload a template to select the worksheet and map your fields.</p></div></div>:<><div className="mappingTable">{fields.map((field,i)=><label key={field}><span>{field}<small>Required</small></span><select value={maps[i]} onChange={e=>M(maps.map((v,j)=>j===i?+e.target.value:v))}>{cols.map(c=><option value={c.n} key={c.n}>{c.label}</option>)}</select></label>)}</div><div className="tableWrap"><table><thead><tr><th>Row</th>{maps.map((m,i)=><th key={i}>{cols[m-1]?.label}</th>)}</tr></thead><tbody>{[...new Set([header,start,start+1].filter(validRow))].map(r=><tr key={r}><td>{r}</td>{maps.map((m,i)=><td key={i}>{text(sheet?.getCell(r,m).value)||'—'}</td>)}</tr>)}</tbody></table></div></>}</section></>}
 {editingTemplate&&<><section className="card"><div className="sectionHead"><div><h2>Give your listings a consistent voice</h2><p>One title template for every image in this batch.</p></div></div><label>Product title template<textarea rows={6} value={title} onChange={e=>TT(e.target.value)}/></label><p className="hint">Use {'${modelName}'} anywhere in your title. No text is silently shortened.</p><div className="callout"><small>LIVE TITLE PREVIEW · {title.replaceAll('${modelName}',model||'Oppo f19s').length} characters</small><p>{title.replaceAll('${modelName}',model||'Oppo f19s')}</p></div><label>Dropdown fallback<input value={fallback} onChange={e=>FB(e.target.value)}/></label></section><section className="card"><h2>Optional template controls</h2><label>Columns to clear (comma separated)<input value={clear} onChange={e=>CL(e.target.value)} placeholder="B, E"/></label><label>Fixed values (one per line)<textarea value={fixed} onChange={e=>FX(e.target.value)} placeholder={'J=Black\nK=Plastic'}/></label><label className="check"><input type="checkbox" checked={allow} onChange={e=>AO(e.target.checked)}/>Allow overwriting existing content in configured columns</label></section></>}
 {!editingTemplate&&wb&&listingTemplate&&step===2&&<><section className="card"><div className="sectionHead"><div><h2>One model. All your product images.</h2><p>Filter your files, check the model, then upload selected images.</p></div><span className="tag">STEP 01</span></div><input ref={imageInput} type="file" multiple accept=".jpg,.jpeg,.png" hidden onChange={e=>images(e.target.files)}/><div className="dropzone compact" onClick={()=>imageInput.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();images(e.dataTransfer.files);}}><CloudUpload size={30}/><h3>Drop product images or <b>browse files</b></h3><small>JPG, JPEG, PNG · 10 MB per file · One model per batch</small></div><div className="formGrid two"><label>Filter images<input placeholder="Search a model or filename…" value={filter} onChange={e=>FI(e.target.value)}/></label><label>Model name (editable)<input value={model} onChange={e=>MD(e.target.value)}/></label></div><div className="sectionHead"><span>{selected.length} selected · {ready} uploaded</span><button disabled={busy||!selected.length} className="outline" onClick={upload}>{busy?<LoaderCircle size={15} className="spin"/>:<CloudUpload size={16}/>}Upload / retry selected</button>{busy&&<button className="subtle" onClick={()=>{cancel.current=true;}}>Cancel after current</button>}</div><progress value={ready} max={selected.length||1}/>{models.length>1&&<div className="callout">Multiple models detected. Use the filter to select exactly one model.</div>}<div className="imageList">{selected.map(item=><div key={item.file.name}><img src={item.thumb} alt="Product preview"/><div><b>{item.file.name}</b><small>{item.url?'Public URL checked':item.error||`${(item.file.size/1024).toFixed(0)} KB · ${item.model}`}</small></div>{item.url?<Check size={17} color="#588347"/>:null}<button aria-label="Remove image" disabled={busy} className="subtle" onClick={()=>{URL.revokeObjectURL(item.thumb);I(items.filter(i=>i!==item));}}><X size={16}/></button></div>)}</div></section></>}
 {!editingTemplate&&wb&&listingTemplate&&step===3&&<section className="card"><div className="sectionHead"><div><h2>One last look before you download</h2><p>{selected.length} images become {selected.length} product rows.</p></div><span className="tag">STEP 02</span></div><div className="reviewStats"><div><small>MODEL</small><b>{model||'Not selected'}</b></div><div><small>IMAGES HOSTED</small><b>{ready} / {selected.length}</b></div><div><small>STARTING ROW</small><b>{start}</b></div></div><div className="tableWrap"><table><thead><tr><th>Row</th><th>Product title</th><th>Product & SKU ID</th><th>Image URL</th></tr></thead><tbody>{selected.slice(0,50).map((i,n)=><tr key={i.file.name}><td>{start+n}</td><td>{title.replaceAll('${modelName}',model)}</td><td>{model} {account}{counter+n}</td><td>{i.url?<a href={i.url} target="_blank" rel="noreferrer">View image ↗</a>:'Upload required'}</td></tr>)}</tbody></table></div><p className="hint">Preview shows the first 50 rows. Download includes every selected image. Public URLs checked; Meesho acceptance remains unverified.</p><button className="primary" onClick={generate} disabled={busy}><Download size={17}/>Generate & download Excel</button>{downloaded&&<button className="outline" disabled={busy} onClick={()=>reset(false)}>Next item <ArrowRight size={16}/></button>}<p className="hint">Your uploaded template is the source. Only configured cells are populated.</p></section>}
 {editingTemplate?<div className="bottomBar"><span><ShieldCheck size={15}/> Saved in this browser</span>
   <button className="primary" disabled={busy||!wb} onClick={saveTemplate}><Save size={16}/>Save Excel template</button>
 </div>:wb&&listingTemplate&&<div className="bottomBar"><span><ShieldCheck size={15}/> Your template stays in your browser</span><div>
   {step===3?<button className="subtle" disabled={busy} onClick={()=>S(2)}><ArrowLeft size={16}/>Back to images</button>:
     <button className="primary" disabled={busy||!selected.length||ready!==selected.length} onClick={()=>{E('');S(3);}}>Review & download <ArrowRight size={16}/></button>}
 </div></div>}</div>
 <div className="rightRail"><div className="guideCard"><div className="guideTop"><span className="miniLabel">A SMOOTHER WORKFLOW</span><div className="paperArt"><div className="paper"><span/><span/><span/><span/></div><div className="photoTile"><Images size={28}/></div><div className="checkBadge"><Check size={17}/></div></div></div><div className="guideBody"><h3>From images to listings.<br/>Without the busywork.</h3><p>Bring your template. Add your images. We’ll put the right details in the right places.</p><div><Check size={15}/> Flexible column mapping</div><div><Check size={15}/> Matching product & SKU IDs</div><div><Check size={15}/> Original workbook preserved</div></div></div><div className="hostingCard"><div className="sectionHead"><CloudUpload size={20}/><span className={'tag '+(storage?'green':'amber')}>{storage?'Connected':'Setup needed'}</span></div><h3>Image hosting</h3><p>{storage?'Cloudinary is configured for signed image uploads.':'Connect Cloudinary to create stable public image links for your listings.'}</p><button className="textButton" disabled={busy} onClick={()=>navigate('Settings')}>{storage?'View hosting settings':'Set up image hosting'}<ArrowRight size={14}/></button></div><p className="railNote">Made for your workflow.<br/>No Meesho login or password required.</p></div></div></>}
 <footer>Listing Studio <span>Built for a little less busywork.</span><small>Excel in. Listings out.</small></footer></div></main></div>;
}
