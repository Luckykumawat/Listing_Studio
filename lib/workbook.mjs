/** @param {any} sheet @param {{start:number,maps:number[],rows:any[],clearing?:number[],extras?:{col:number,value:string}[],allow?:boolean,model?:string}} config */
export function populateWorkbook(sheet,{start,maps,rows,clearing=[],extras=[],allow=false,model=''}){
 if(new Set(maps).size!==5||maps.some(m=>!Number.isInteger(m)||m<1||m>16384)||!Number.isInteger(start)||start<1)throw Error('Invalid mappings or starting row.');
 const affected=[...maps,...clearing,...extras.map(e=>e.col)];
 for(let i=0;i<rows.length;i++)for(const col of affected){const cell=sheet.getCell(start+i,col);if(cell.isMerged)throw Error('Output intersects merged cells. Choose another data range.');if(cell.value!=null&&!allow)throw Error(`Existing content at ${cell.address}. Enable overwrite after reviewing the template.`);}
 rows.forEach((row,i)=>{for(const col of clearing)sheet.getCell(start+i,col).value=null;const vals=[row.title,row.model,row.url,row.id,row.id];maps.forEach((col,j)=>{const c=sheet.getCell(start+i,col),source=sheet.getCell(start,col);if(i&&Object.keys(c.style).length===0)c.style=JSON.parse(JSON.stringify(source.style));if(i&&source.dataValidation?.type)c.dataValidation=JSON.parse(JSON.stringify(source.dataValidation));c.value=vals[j];});extras.forEach(e=>{sheet.getCell(start+i,e.col).value=e.value.replaceAll('${modelName}',model);});});
}
