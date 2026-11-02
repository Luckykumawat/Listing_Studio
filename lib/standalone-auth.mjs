/** @param {Request} request @param {{APP_USERNAME?:string,APP_PASSWORD?:string}} env */
export async function checkStandaloneAuth(request,env){
 if(!env.APP_USERNAME||!env.APP_PASSWORD)return new Response('Listing Studio is not configured. Add APP_USERNAME and APP_PASSWORD as Worker secrets.',{status:503,headers:{'Cache-Control':'no-store'}});
 const auth=request.headers.get('authorization')||'';
 let actual='';try{if(auth.startsWith('Basic '))actual=atob(auth.slice(6));}catch{}
 const expected=`${env.APP_USERNAME}:${env.APP_PASSWORD}`;
 const enc=new TextEncoder();const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(actual)),crypto.subtle.digest('SHA-256',enc.encode(expected))]);
 const aa=new Uint8Array(a),bb=new Uint8Array(b);let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
 if(diff)return new Response('Sign in to Listing Studio.',{status:401,headers:{'WWW-Authenticate':'Basic realm="Listing Studio", charset="UTF-8"','Cache-Control':'no-store'}});
 return null;
}
