'use client';
import { PageHeader } from '@/components/ui';
import { SimpleCrud } from '../SimpleCrud';
import { useL } from '../AdminShell';

export default function CouponsAdmin() {
  const L = useL();
  return (
    <div className="space-y-4">
      <PageHeader title={L('ডিসকাউন্ট কুপন', 'Discount coupons')} />
      <SimpleCrud table="coupons" order="created_at" ascending={false} defaults={{ discount_type: 'percent', value: 10, is_active: true }} fields={[
        { key: 'code', label: L('কোড', 'Code'), required: true },
        { key: 'discount_type', label: L('ধরন', 'Type'), type: 'select', required: true, options: [{ value: 'percent', label: '%' }, { value: 'fixed', label: '৳ fixed' }] },
        { key: 'value', label: L('পরিমাণ', 'Value'), type: 'number', required: true },
        { key: 'max_uses', label: L('সর্বোচ্চ ব্যবহার', 'Max uses'), type: 'number' },
        { key: 'used_count', label: L('ব্যবহৃত', 'Used'), type: 'number' },
        { key: 'expires_at', label: L('মেয়াদ শেষ', 'Expires'), type: 'datetime' },
        { key: 'is_active', label: L('চালু', 'Active'), type: 'bool' },
        { key: 'featured', label: L('হোম পেজের নোটিশ বোর্ডে দেখাও', 'Show on home notice board'), type: 'bool' },
      ]} />
    </div>
  );
}
