'use client';
import { PageHeader } from '@/components/ui';
import { SimpleCrud } from '../SimpleCrud';
import { useL } from '../AdminShell';

export default function NoticesAdmin() {
  const L = useL();
  return (
    <div className="space-y-4">
      <PageHeader title={L('নোটিশ প্রকাশ', 'Publish notices')} />
      <SimpleCrud table="notices" order="published_at" ascending={false} defaults={{ is_published: true, published_at: new Date().toISOString() }} fields={[
        { key: 'title_bn', label: 'শিরোনাম (বাংলা)', required: true },
        { key: 'title_en', label: 'Title (English)', required: true },
        { key: 'body_bn', label: 'বিস্তারিত (বাংলা)', type: 'textarea' },
        { key: 'body_en', label: 'Details (English)', type: 'textarea', showInTable: false },
        { key: 'published_at', label: L('প্রকাশের সময়', 'Publish time'), type: 'datetime' },
        { key: 'is_published', label: L('প্রকাশিত', 'Published'), type: 'bool' },
      ]} />
    </div>
  );
}
