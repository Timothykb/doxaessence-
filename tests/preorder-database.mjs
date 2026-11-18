// Optional isolated PostgreSQL verification. Requires @electric-sql/pglite installed outside production.
// Example: PGLITE_MODULE_PATH=/tmp/doxa-preorder-dbcheck/node_modules/@electric-sql/pglite/dist/index.js node tests/preorder-database.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec("create role anon;create role authenticated;create role service_role;create function public.is_doxa_admin() returns boolean language sql as $$ select true $$;");
 for(const name of ['20261028_commerce.sql','20261028_site_content.sql','20261028_checkout.sql','20261029_checkout_operations.sql','20261029_checkout_test_mode.sql','20261029_checkout_product_reference.sql','20261030_preorders.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.exec("update public.doxa_checkout_settings set merchant_email='owner@example.invalid' where id=1;");
 await db.exec(await readFile(new URL('../supabase/preorder-verification.sql',import.meta.url),'utf8'));
 const {rows}=await db.query('select live,enabled,sale_mode from public.doxa_site cross join public.doxa_checkout_settings');
 assert.deepEqual(rows,[{live:false,enabled:false,sale_mode:'regular'}]);
 assert.equal((await db.query('select count(*)::integer as count from public.doxa_orders')).rows[0].count,0);
 console.log('PASS: actual PostgreSQL migrations, legacy gates preserved, acknowledgement enforced in database, allocation reserved once, immutable dispatch/specification/returns on paid order, two pre-order mail jobs, paid replay idempotent, no public RPC permission, rollback leaves no order or live checkout.');
}finally{await db.close();}
