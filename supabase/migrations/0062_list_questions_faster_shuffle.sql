-- Question bank list (list_questions) was the heaviest query on the site: about 65 ms of CPU per page, most of it
-- spent sorting 11,000 md5 text hashes twice. An integer hash gives the same stable per-seed shuffle in about 28 ms.
-- Applied on 14 Nov 2026 by patching the live definition (the rest of the function is unchanged):

do $do$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'list_questions';
  if position('md5(q.id::text || p_seed::text)' in d) > 0 then
    d := replace(d, 'md5(q.id::text || p_seed::text)', 'hashint8(q.id::bigint * 1000003 + p_seed)');
    execute d;
  end if;
end $do$;
