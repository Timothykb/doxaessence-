begin;
-- Owner requested the name The Genesis and a bottle-only amber visual.
-- Keep historic paid-order snapshots and the currently published website unchanged.
update public.doxa_products set name='The Genesis'
where id=(select product_id from public.doxa_checkout_settings where id=1);
update public.doxa_site set draft=draft||jsonb_build_object(
 'product_name','The Genesis',
 'preorder_image','/images/the-genesis-light-gold-ivory.png',
 'preorder_image_alt','The Genesis perfume bottle with light golden liquid'),updated_at=now() where id=1;
update public.doxa_site set draft=draft||jsonb_build_object('hero_image','/images/the-genesis-light-gold-ivory.png','hero_image_alt','The Genesis perfume bottle with light golden liquid')
where id=1 and (draft->>'hero_image' is null or draft->>'hero_image' in ('/images/genesis-packshot.png','/images/genesis-packshot-v2.png'));
update public.doxa_site set draft=draft||jsonb_build_object('bottle_image','/images/the-genesis-light-gold-ivory.png','bottle_image_alt','The Genesis perfume bottle with light golden liquid')
where id=1 and (draft->>'bottle_image' is null or draft->>'bottle_image' in ('/images/genesis-bottle.png','/images/genesis-bottle-v2.png'));
commit;
