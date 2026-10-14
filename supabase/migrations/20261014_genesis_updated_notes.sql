begin;
update public.scent_layers set stage='TOPNOTEN / LIGHT', notes='Bergamot · Roze peper · Kardemom' where slug='light';
update public.scent_layers set stage='HARTNOTEN / LIFE', notes='Vijgenblad · Vijg · Iris · Oranjebloesem' where slug='life';
update public.scent_layers set stage='BASISNOTEN / EARTH', notes='Sandelhout · Cederhout · Ambrette-musk · Zachte amber · Een vleugje vanille' where slug='earth';
commit;
select slug, stage, notes from public.scent_layers order by number;
