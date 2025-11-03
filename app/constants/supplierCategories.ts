export interface SupplierCategory {
  code: number;
  label: string;
}

export const SUPPLIER_CATEGORIES: SupplierCategory[] = [
  { code: 1, label: '软件系统' },
  { code: 2, label: '硬件设备' },
  { code: 3, label: '仓储设备' },
  { code: 4, label: '干杂粮油' },
  { code: 5, label: '海鲜冻品' },
  { code: 6, label: '预包装食品' },
  { code: 7, label: '用品用具' },
  { code: 8, label: '洗涤消毒' },
  { code: 9, label: '服装箱包' },
  { code: 10, label: '车辆设备' },
];

export const labelToCode = new Map<string, number>(
  SUPPLIER_CATEGORIES.map((c) => [c.label, c.code])
);

export const codeToLabel = new Map<number, string>(
  SUPPLIER_CATEGORIES.map((c) => [c.code, c.label])
);

export const formatCategoryLabel = (label: string) => {
  const code = labelToCode.get(label);
  const codeStr = code !== undefined ? String(code).padStart(2, '0') : '--';
  return `${codeStr} ${label}`;
};