export const defaultTitle='Back Case & Cover For ${modelName}, ${modelName} Mobile Back Cover, ${modelName} Back Case, ${modelName} Cover, ${modelName} Phone Cover, ${modelName} MOBILE CASE';
export function parseModel(name,marker='_pexels-') {
 if(!marker.trim())throw Error('Filename marker cannot be empty.');const clean=name.trim(); if(!/\.(jpe?g|png)$/i.test(clean)) throw Error('Use JPG, JPEG or PNG images.');
 const base=clean.replace(/\.(jpe?g|png)$/i,''); const idx=base.toLowerCase().indexOf(marker.toLowerCase());
 const model=(idx>=0?base.slice(0,idx):base.replace(/_\d+$/,'')).replace(/\s+/g,' ').trim();
 if(!model || model===base && idx<0) throw Error('Unrecognized filename. Use model_1.jpg or model_pexels-…_resized.jpg.');
 return model;
}
export function batchModel(names,marker){const models=names.map(n=>parseModel(n,marker));if(new Set(models.map(m=>m.toLowerCase())).size!==1)throw Error('Mixed models detected. Filter this batch to one model.');return models[0];}
export function rowsFor(model,account,start,title,urls,dropdown){if(!model.trim()||!account.trim()||!Number.isSafeInteger(start)||start<1||!urls.length)throw Error('Model, account text, valid counter and images are required.');if(/\$\{(?!modelName\})/.test(title))throw Error('Unsupported title placeholder.');return urls.map((url,i)=>{if(!/^https:\/\//.test(url))throw Error('Every image needs a public HTTPS URL.');return {title:title.replaceAll('${modelName}',model),model:dropdown,url,id:`${model} ${account}${start+i}`};});}
export function safeFilename(model){return model.replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,150)||'Meesho listing';}
export function letter(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
