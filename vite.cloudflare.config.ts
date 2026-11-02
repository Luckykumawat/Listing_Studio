import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';

// Standalone deployment from GitHub; the existing Sites configuration is separate.
export default defineConfig({
 plugins:[vinext(),cloudflare({
  viteEnvironment:{name:'rsc',childEnvironments:['ssr']},
  inspectorPort:false,
  config:{
   name:'listing-studio',
   main:'./worker/cloudflare.ts',
   compatibility_date:'2026-05-15',
   compatibility_flags:['nodejs_compat'],
   assets:{binding:'ASSETS',run_worker_first:true},
   observability:{enabled:true},
  },
 })],
});
