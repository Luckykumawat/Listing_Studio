import handler from 'vinext/server/fetch-handler';
import {checkStandaloneAuth} from '../lib/standalone-auth.mjs';
type Env={APP_USERNAME?:string;APP_PASSWORD?:string;ASSETS?:Fetcher};
export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext){
  const denied=await checkStandaloneAuth(request,env);if(denied)return denied;
  const pathname=new URL(request.url).pathname;
  if(env.ASSETS&&(pathname.startsWith('/_next/static/')||pathname==='/favicon.svg')){
   const asset=await env.ASSETS.fetch(request);const guarded=new Response(asset.body,asset);guarded.headers.set('Cache-Control','private, no-store');return guarded;
  }
  // Never trust Sites identity headers supplied by an external visitor.
  const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-user-'))headers.delete(key);
  const response=await handler.fetch(new Request(request,{headers}),env,ctx);
  const secured=new Response(response.body,response);secured.headers.set('Cache-Control','private, no-store');secured.headers.set('X-Content-Type-Options','nosniff');return secured;
 }
};
