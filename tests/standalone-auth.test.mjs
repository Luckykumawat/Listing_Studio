import {test} from 'node:test';import assert from 'node:assert/strict';import {checkStandaloneAuth} from '../lib/standalone-auth.mjs';
const env={APP_USERNAME:'fixture-user',APP_PASSWORD:'fixture-pass'};
test('standalone hosting fails closed without credentials',async()=>{assert.equal((await checkStandaloneAuth(new Request('https://app.test'),{})).status,503);});
test('standalone hosting challenges missing and incorrect login',async()=>{for(const authorization of ['', 'Basic broken','Basic '+btoa('bad:login')]){const r=await checkStandaloneAuth(new Request('https://app.test',{headers:{authorization}}),env);assert.equal(r.status,401);assert.match(r.headers.get('www-authenticate'),/Basic/);}});
test('standalone hosting accepts the configured login',async()=>{assert.equal(await checkStandaloneAuth(new Request('https://app.test',{headers:{authorization:'Basic '+btoa('fixture-user:fixture-pass')}}),env),null);});
