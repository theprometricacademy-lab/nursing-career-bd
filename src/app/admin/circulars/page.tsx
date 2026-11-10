'use client';
import { useState } from 'react';
import { Copy, Upload } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase/client';
import { SimpleCrud } from '../SimpleCrud';
import { useL } from '../AdminShell';

function PdfUploader() {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  async function upload(f: File) {
    setBusy(true); setErr(''); setUrl('');
    const ext = (f.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from('circulars').upload(path, f, { contentType: f.type, upsert: false });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setUrl(sb.storage.from('circulars').getPublicUrl(path).data.publicUrl);
  }
  return (
    <div className="card space-y-2 p-4">
      <div className="font-semibold text-ink">সার্কুলারের PDF / ছবি আপলোড</div>
      <p className="text-sm text-ink-soft">ফাইল আপলোড করলে একটা লিংক পাবেন। সেটা কপি করে নিচের ফর্মের &quot;PDF / ছবির লিংক&quot; ঘরে বসান। (PDF, JPG, PNG — সর্বোচ্চ ১০ MB)</p>
      <label className="btn-ghost cursor-pointer">
        <Upload className="h-4 w-4" />{busy ? 'আপলোড হচ্ছে…' : 'ফাইল বেছে নিন'}
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </label>
      {url && (
        <div className="flex items-center gap-2 rounded-xl bg-mint-50 p-2 text-xs text-mint-700">
          <span className="min-w-0 flex-1 break-all">{url}</span>
          <button className="rounded-lg p-1.5 hover:bg-mint-100" onClick={() => navigator.clipboard.writeText(url)} aria-label="copy"><Copy className="h-4 w-4" /></button>
        </div>
      )}
      {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

export default function CircularsAdmin() {
  const L = useL();
  return (
    <div className="space-y-4">
      <PageHeader title={L('চাকরির সার্কুলার', 'Job circulars')} sub={L('সাইটের পাশের প্যানেল ও /circulars পেজে দেখাবে। আবেদনের শেষ তারিখ পার হলে নিজে থেকেই "আবেদন শেষ" দেখাবে।', 'Shown in the side panel and on /circulars. Closes automatically after the deadline.')} />
      <PdfUploader />
      <SimpleCrud table="circulars" order="apply_end" ascending={false} defaults={{ is_published: true, job_type: 'permanent' }} fields={[
        { key: 'title_bn', label: 'শিরোনাম', required: true },
        { key: 'org_bn', label: 'নিয়োগকারী প্রতিষ্ঠান', required: true },
        { key: 'apply_end', label: 'আবেদনের শেষ সময়', type: 'datetime' },
        { key: 'total_posts', label: 'মোট পদ', type: 'number' },
        { key: 'is_published', label: 'প্রকাশিত', type: 'bool' },
        { key: 'slug', label: 'URL নাম (ইংরেজিতে, যেমন senior-staff-nurse-2027; খালি রাখলে নিজে তৈরি হবে)', showInTable: false },
        { key: 'ministry_bn', label: 'মন্ত্রণালয় / বিভাগ', showInTable: false },
        { key: 'recruiter_bn', label: 'নিয়োগ পরীক্ষা নেবে (যেমন পিএসসি)', showInTable: false },
        { key: 'post_name_bn', label: 'পদের নাম ও সংখ্যা', showInTable: false },
        { key: 'grade_bn', label: 'গ্রেড', showInTable: false },
        { key: 'salary_bn', label: 'বেতন', showInTable: false },
        { key: 'job_type', label: 'চাকরির ধরন', type: 'select', required: true, showInTable: false, options: [
          { value: 'permanent', label: 'সরকারি · স্থায়ী' }, { value: 'temporary', label: 'সরকারি · রাজস্ব খাত (অস্থায়ী পদ)' },
          { value: 'contract', label: 'চুক্তিভিত্তিক' }, { value: 'commission', label: 'কমিশন (সশস্ত্র বাহিনী)' },
        ] },
        { key: 'qualification_bn', label: 'শিক্ষাগত যোগ্যতা', type: 'textarea', showInTable: false },
        { key: 'age_limit_bn', label: 'বয়সসীমা', showInTable: false },
        { key: 'fee_bn', label: 'আবেদন ফি', showInTable: false },
        { key: 'details_bn', label: 'অন্যান্য তথ্য', type: 'textarea', showInTable: false },
        { key: 'exam_info_bn', label: 'পরীক্ষার হালনাগাদ (তারিখ, ফল ইত্যাদি)', type: 'textarea', showInTable: false },
        { key: 'circular_no', label: 'বিজ্ঞপ্তি নম্বর', showInTable: false },
        { key: 'publish_at', label: 'প্রকাশের তারিখ', type: 'datetime', showInTable: false },
        { key: 'apply_start', label: 'আবেদন শুরু', type: 'datetime', showInTable: false },
        { key: 'apply_url', label: 'আবেদনের লিংক', showInTable: false },
        { key: 'official_url', label: 'অফিসিয়াল ওয়েবসাইট', showInTable: false },
        { key: 'pdf_url', label: 'PDF / ছবির লিংক', showInTable: false },
        { key: 'source_name', label: 'সূত্রের নাম (যেমন প্রথম আলো)', showInTable: false },
        { key: 'source_url', label: 'সূত্রের লিংক', showInTable: false },
      ]} />
    </div>
  );
}
