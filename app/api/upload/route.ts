import {createHash} from 'node:crypto';
const recent=new Map<string,number[]>();
export async function POST(req:Request){
 try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Cross-origin uploads are not allowed.'},{status:403});
 const identity=req.headers.get('oai-authenticated-user-id')||'private-owner';const now=Date.now();const times=(recent.get(identity)||[]).filter(t=>now-t<60000);if(times.length>=60)return Response.json({error:'Upload rate limit reached. Wait a minute and retry.'},{status:429});times.push(now);recent.set(identity,times);
 const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
 if(!cloud||!key||!secret)return Response.json({error:'Image hosting is not configured. Add the three Cloudinary environment variables listed in Settings.'},{status:503});
 if(Number(req.headers.get('content-length'))>11*1024*1024)throw Error('Image exceeds 10 MB.');
 const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>10*1024*1024||!file.size)throw Error('Select an image smaller than 10 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 if(!jpg&&!png)throw Error('Invalid image content. Only JPEG and PNG are allowed.');
 const digest=createHash('sha256').update(bytes).digest('hex');const timestamp=Math.floor(Date.now()/1000);const public_id=`meesho/${digest}`;
 const signature=createHash('sha1').update(`overwrite=false&public_id=${public_id}&timestamp=${timestamp}${secret}`).digest('hex');
 const body=new FormData();body.set('file',new Blob([bytes],{type:jpg?'image/jpeg':'image/png'}),'image.'+(jpg?'jpg':'png'));for(const [k,v] of Object.entries({api_key:key,timestamp:String(timestamp),public_id,overwrite:'false',signature}))body.set(k,v);
 const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`,{method:'POST',body});const data=await response.json() as any;
 if(!response.ok||!data.secure_url)throw Error(data.error?.message||'Upload failed. Retry this image.');
 const url=new URL(data.secure_url);if(url.hostname!=='res.cloudinary.com'||url.protocol!=='https:')throw Error('Unexpected storage URL.');
 const check=await fetch(url,{method:'HEAD'});if(!check.ok||!check.headers.get('content-type')?.startsWith('image/'))throw Error('Uploaded image is not publicly readable. Retry.');
 return Response.json({url:url.href,publicVerified:true,meeshoVerified:false});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Upload failed.'},{status:400});}
}
