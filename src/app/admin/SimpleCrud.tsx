'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Modal, Spinner } from '@/components/ui';
import { useL } from './AdminShell';

export type Field = {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'datetime' | 'intlist' | 'blueprint';
  options?: { value: string | number; label: string }[];
  required?: boolean; showInTable?: boolean;
};

type Row = Record<string, unknown> & { id: number | string };
const BP_KEYS = ['bangla', 'english', 'gk', 'nursing'] as const;
const BP_LABEL: Record<string, string> = { bangla: 'বাংলা', english: 'English', gk: 'GK', nursing: 'Nursing' };

function display(v: unknown, f: Field) {
  if (v === null || v === undefined || v === '') return '—';
  if (f.type === 'bool') return v ? '✓' : '✗';
  if (f.type === 'select') return f.options?.find((o) => String(o.value) === String(v))?.label ?? String(v);
  if (f.type === 'datetime') return new Date(String(v)).toLocaleString();
  if (Array.isArray(v)) return v.join(', ');
  if (f.type === 'blueprint' && typeof v === 'object') return Object.entries(v as Record<string, number>).map(([k, n]) => `${k} ${n}`).join(' · ');
  const s = String(v);
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

export function SimpleCrud({ table, fields, defaults, order = 'id', ascending = true, filter, title }: {
  table: string; fields: Field[]; defaults: Record<string, unknown>; order?: string; ascending?: boolean;
  filter?: { key: string; value: unknown }; title?: string;
}) {
  const L = useL();
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const fKey = filter?.key;
  const fVal = filter?.value as string | undefined;
  const load = useCallback(async () => {
    let q = sb.from(table).select('*').order(order, { ascending }).limit(500);
    if (fKey) q = q.eq(fKey, fVal as string);
    const { data, error } = await q;
    if (error) setErr(error.message); else setRows(data as Row[]);
  }, [sb, table, order, ascending, fKey, fVal]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!edit) return;
    setBusy(true); setErr('');
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      let v = edit[f.key];
      if (f.type === 'number') v = v === '' || v === null || v === undefined ? null : Number(v);
      if (f.type === 'intlist') v = typeof v === 'string' ? (v.trim() ? v.split(',').map((x) => Number(x.trim())).filter(Number.isFinite) : null) : v;
      if (f.type === 'datetime') v = v ? new Date(String(v)).toISOString() : null;
      if (f.type === 'blueprint') {
        const b = (v ?? {}) as Record<string, number>;
        const clean = Object.fromEntries(BP_KEYS.map((k) => [k, Math.max(0, Number(b[k]) || 0)]));
        v = Object.values(clean).some((n) => n > 0) ? clean : null;
      }
      if (f.type === 'select' && f.options && typeof f.options[0]?.value === 'number') v = v === '' || v === null ? null : Number(v);
      if (f.type === 'text' || f.type === 'textarea') v = typeof v === 'string' ? v.trim() || null : v;
      payload[f.key] = v;
    }
    if (filter) payload[filter.key] = filter.value;
    // a new row: leave empty boxes out so the database fills in its own default (e.g. a count that starts at 0)
    if (!edit.id) for (const k of Object.keys(payload)) if (payload[k] === null) delete payload[k];
    const { error } = edit.id
      ? await sb.from(table).update(payload).eq('id', edit.id as string)
      : await sb.from(table).insert(payload);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(null); load();
  }

  async function remove(id: Row['id']) {
    if (!confirm(L('মুছে ফেলবেন? এটি ফেরত আনা যাবে না।', 'Delete this? This cannot be undone.'))) return;
    const { error } = await sb.from(table).delete().eq('id', id as string);
    if (error) setErr(error.message); else load();
  }

  const cols = fields.filter((f) => f.showInTable !== false);
  const dtLocal = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 16) : '');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {title && <h2 className="font-semibold text-ink">{title}</h2>}
        <button className="btn-primary ml-auto" onClick={() => setEdit({ ...defaults })}><Plus className="h-4 w-4" />{L('নতুন', 'New')}</button>
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!rows ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs text-ink-soft">
              <tr>{cols.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2">{c.label}</th>)}<th /></tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  {cols.map((c) => <td key={c.key} className="px-3 py-2 align-top">{display(r[c.key], c)}</td>)}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="rounded-lg p-1.5 text-brand-700 hover:bg-brand-50" onClick={() => setEdit({ ...r })} aria-label="edit"><Pencil className="h-4 w-4" /></button>
                    <button className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(r.id)} aria-label="delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-ink-soft" colSpan={cols.length + 1}>—</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal wide open={!!edit} onClose={() => !busy && setEdit(null)}>
        {edit && (
          <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
            <h3 className="text-lg font-bold text-ink">{edit.id ? L('এডিট', 'Edit') : L('নতুন যোগ', 'Add new')}</h3>
            {fields.map((f) => {
              const v = edit[f.key];
              const set = (val: unknown) => setEdit({ ...edit, [f.key]: val });
              return (
                <div key={f.key}>
                  {f.type === 'bool' ? (
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!!v} onChange={(e) => set(e.target.checked)} />{f.label}</label>
                  ) : (
                    <>
                      <label className="label">{f.label}{f.required && ' *'}</label>
                      {f.type === 'textarea' ? <textarea className="input min-h-[80px]" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
                        : f.type === 'select' ? (
                          <select className="input" value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
                            {!f.required && <option value="">—</option>}
                            {f.options?.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                          </select>
                        ) : f.type === 'datetime' ? <input type="datetime-local" className="input" value={dtLocal(v)} onChange={(e) => set(e.target.value)} />
                        : f.type === 'blueprint' ? (
                          <div className="grid grid-cols-4 gap-2">
                            {BP_KEYS.map((k) => (
                              <label key={k} className="text-xs text-ink-soft">{BP_LABEL[k]}
                                <input className="input mt-1" type="number" min={0} value={String(((v ?? {}) as Record<string, number>)[k] ?? '')}
                                  onChange={(e) => set({ ...((v ?? {}) as Record<string, number>), [k]: e.target.value === '' ? 0 : Number(e.target.value) })} />
                              </label>
                            ))}
                          </div>
                        )
                        : f.type === 'intlist' ? <input className="input" placeholder="1, 2, 3" value={Array.isArray(v) ? v.join(', ') : String(v ?? '')} onChange={(e) => set(e.target.value)} />
                        : <input className="input" type={f.type === 'number' ? 'number' : 'text'} step="any" value={String(v ?? '')} onChange={(e) => set(e.target.value)} required={f.required} />}
                    </>
                  )}
                </div>
              );
            })}
            {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{err}</p>}
            <div className="flex gap-2 pt-2">
              <button className="btn-ghost flex-1" onClick={() => setEdit(null)} disabled={busy}>{L('বাতিল', 'Cancel')}</button>
              <button className="btn-primary flex-1" onClick={save} disabled={busy}>{busy ? '…' : L('সংরক্ষণ', 'Save')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
