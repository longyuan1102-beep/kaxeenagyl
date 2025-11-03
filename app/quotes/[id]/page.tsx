'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Table, Button, Input, InputNumber, Form, Space, Modal, Select, message } from 'antd';
import { formatCategoryLabel } from '@/app/constants/supplierCategories';
import { SaveOutlined, DownloadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface QuoteItem {
  id: string;
  product: {
    name: string;
    spec: string;
    supplier: { name: string };
  };
  quantity: number;
  basePrice: number;
  rowDelta: number;
  rowAmount: number;
  displayPrice: number;
}

interface Quote {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  currency?: string;
  taxRate?: number;
  note?: string;
  items: QuoteItem[];
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  // 为行内编辑添加防抖，避免频繁 PATCH 造成卡顿
  const qtyDebounceMap = useRef<Record<string, number>>({});
  const percentDebounceMap = useRef<Record<string, number>>({});
  const amountDebounceMap = useRef<Record<string, number>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string | undefined>();
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [supplierOptions, setSupplierOptions] = useState<{ label: string; value: string }[]>([]);
  const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [leadDaysFilter, setLeadDaysFilter] = useState<number | undefined>();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // 统一的 formatter/parser，避免类型推断问题与解析异常
  const percentFormatter = (val: string | number | null | undefined) => {
    if (val === undefined || val === null || val === '') return '';
    return `${val}%`;
  };
  const percentParser = (val: string | number | null | undefined) => {
    const str = String(val ?? '').replace(/\s+/g, '').replace(/%/g, '');
    const num = Number(str);
    return Number.isFinite(num) ? num : 0;
  };
  const moneyFormatter = (val: string | number | null | undefined) => {
    if (val === undefined || val === null || val === '') return '';
    return `¥ ${val}`;
  };
  const moneyParser = (val: string | number | null | undefined) => {
    const num = Number(String(val ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) ? num : 0;
  };

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});

    loadQuote();
  }, [params.id]);

  // 卸载时清理所有定时器，避免内存泄漏
  useEffect(() => {
    return () => {
      Object.values(qtyDebounceMap.current).forEach((tid) => tid && window.clearTimeout(tid));
      Object.values(percentDebounceMap.current).forEach((tid) => tid && window.clearTimeout(tid));
      Object.values(amountDebounceMap.current).forEach((tid) => tid && window.clearTimeout(tid));
      qtyDebounceMap.current = {};
      percentDebounceMap.current = {};
      amountDebounceMap.current = {};
    };
  }, []);

  const loadQuote = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/quotes/${params.id}`);
      setQuote(res.data);
      form.setFieldsValue({
        customerName: res.data.customerName,
        currency: res.data.currency || 'CNY',
        taxRate: res.data.taxRate || 0,
        customerPhone: res.data.customerPhone || '',
        customerAddress: res.data.customerAddress || '',
        note: res.data.note || '',
      });
    } catch (error) {
      message.error('加载报价单失败');
      router.push('/quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await axios.patch(`/api/quotes/${params.id}`, values);
      message.success('保存成功');
      // 保存成功后返回列表页
      router.push('/quotes');
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/quotes/${params.id}/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${params.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const columns = [
    {
      title: '产品名称',
      dataIndex: ['product', 'name'],
      key: 'productName',
    },
    {
      title: '规格',
      dataIndex: ['product', 'spec'],
      key: 'spec',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: QuoteItem) => (
        <InputNumber
          min={0}
          value={Number(quantity)}
          onChange={(val) => {
            const v = Number(val || 0);
            const tid = qtyDebounceMap.current[record.id];
            if (tid) window.clearTimeout(tid);
            qtyDebounceMap.current[record.id] = window.setTimeout(() => {
              axios.patch(`/api/quotes/items/${record.id}`, { quantity: v })
                .then(() => loadQuote())
                .catch(() => message.error('更新数量失败'));
            }, 400);
          }}
        />
      ),
    },
    {
      title: '原价',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: any) => `¥${Number(price || 0).toFixed(2)}`,
    },
    {
      title: '报价',
      dataIndex: 'displayPrice',
      key: 'displayPrice',
      render: (price: any) => `¥${Number(price || 0).toFixed(2)}`,
    },
    {
      title: '价格调整',
      key: 'priceAdjust',
      render: (_: any, record: QuoteItem) => {
        const percentRaw = Number(record.rowDelta || 0) * 100;
        const percent = Number.isFinite(percentRaw) ? percentRaw : 0;
        const amountRaw = Number(record.rowAmount || 0);
        const amount = Number.isFinite(amountRaw) ? amountRaw : 0;
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <InputNumber
              min={-100}
              max={100}
              step={1}
              value={Number(percent.toFixed(0))}
              formatter={percentFormatter}
              parser={percentParser}
              style={{ width: 110 }}
              onChange={(val) => {
                const v = Number(val || 0) / 100;
                const tid = percentDebounceMap.current[record.id];
                if (tid) window.clearTimeout(tid);
                percentDebounceMap.current[record.id] = window.setTimeout(() => {
                  axios.patch(`/api/quotes/items/${record.id}`, { rowDelta: v })
                    .then(() => loadQuote())
                    .catch(() => message.error('更新百分比失败'));
                }, 400);
              }}
            />
            <InputNumber
              step={0.01}
              value={amount}
              formatter={moneyFormatter}
              parser={moneyParser}
              style={{ width: 120 }}
              onChange={(val) => {
                const v = Number(val || 0);
                const tid = amountDebounceMap.current[record.id];
                if (tid) window.clearTimeout(tid);
                amountDebounceMap.current[record.id] = window.setTimeout(() => {
                  axios.patch(`/api/quotes/items/${record.id}`, { rowAmount: v })
                    .then(() => loadQuote())
                    .catch(() => message.error('更新加减金额失败'));
                }, 400);
              }}
            />
          </div>
        );
      },
    },
    {
      title: '调整说明',
      key: 'adjustNote',
      render: (_: any, record: QuoteItem) => {
        const percent = Number(record.rowDelta || 0) * 100;
        const amount = Number(record.rowAmount || 0);
        const trend = percent > 0 ? '上浮' : percent < 0 ? '下降' : amount !== 0 ? (amount > 0 ? '加价' : '减价') : '不变';
        const percentStr = percent !== 0 ? `${percent.toFixed(0)}%` : '';
        const amountStr = amount !== 0 ? `¥${amount.toFixed(2)}` : '';
        const parts = [percentStr, amountStr].filter(Boolean).join(' / ');
        return parts ? `${trend}（${parts}）` : '—';
      },
    },
    {
      title: '小计',
      key: 'subtotal',
      render: (_: any, record: QuoteItem) =>
        `¥${(Number(record.displayPrice) * Number(record.quantity)).toFixed(2)}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: QuoteItem) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => {
          axios.delete(`/api/quotes/items/${record.id}`)
            .then(() => { message.success('删除成功'); loadQuote(); })
            .catch(() => message.error('删除失败'));
        }} />
      ),
    },
  ];

  // 使用期过滤变化时，基于已加载的产品重新生成选项（必须在早期声明，避免与条件返回造成 Hook 次数不一致）
  useEffect(() => {
    if (!allProducts.length) return;
    const existingIds = new Set<string>((quote?.items || []).map((it: any) => it?.product?.id).filter(Boolean));
    const options = allProducts
      .filter((p: any) => {
        const days = typeof p?.leadDays === 'number' ? p.leadDays : Number.MAX_SAFE_INTEGER;
        return leadDaysFilter === undefined ? true : Number(days) <= Number(leadDaysFilter);
      })
      .map((p: any) => ({
        label: `${existingIds.has(p.id) ? '已在本报价单 | ' : ''}${p.name} / ${p.spec} / ¥${Number(p.price).toFixed(2)} / 使用期${typeof p.leadDays === 'number' ? p.leadDays : '-'}天`,
        value: p.id,
        disabled: existingIds.has(p.id),
      }));
    setProductOptions(options);
    // 清空不再可见的已选项
    setSelectedProducts((prev) => prev.filter((id) => options.some((opt) => opt.value === id)));
  }, [leadDaysFilter, allProducts, quote]);

  if (!quote) return null;

  const subtotal = quote.items.reduce((sum, item) => {
    return sum + Number(item.displayPrice) * Number(item.quantity);
  }, 0);
  const taxRate = Number(quote.taxRate || 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // 添加产品弹窗：打开并预加载供应商类别
  const openAddModal = async () => {
    setAddModalVisible(true);
    try {
      const res = await axios.get('/api/suppliers', { params: { page: 1, pageSize: 500 } });
      const items = res.data?.items || [];
      // 显式声明类型，避免 TS 对推断的 any[] 报错
      const uniq: string[] = Array.from(
        new Set<string>(
          items
            .map((s: any) => s?.category as string)
            .filter((c: string) => Boolean(c))
        ),
      );
      setCategories(uniq);
    } catch (e) {
      // 忽略错误，保持空列表
    }
  };

  // 选择供应商类别后，加载该类别下的供应商
  const handleCategoryChange = async (val?: string) => {
    setCategory(val);
    setSupplierId(undefined);
    setSupplierOptions([]);
    setProductOptions([]);
    setSelectedProducts([]);
    // 切换类别时清空使用期筛选，避免误过滤导致看不到产品
    setLeadDaysFilter(undefined);
    if (!val) return;
    try {
      const res = await axios.get('/api/suppliers', { params: { page: 1, pageSize: 500, category: val } });
      const items = res.data?.items || [];
      setSupplierOptions(items.map((s: any) => ({ label: s.name, value: s.id })));
    } catch (e) {
      message.error('加载供应商失败');
    }
  };

  // 选择供应商后，加载其产品列表
  const handleSupplierChange = async (val?: string) => {
    setSupplierId(val);
    setProductOptions([]);
    setAllProducts([]);
    setSelectedProducts([]);
    // 切换供应商时清空使用期筛选，避免误过滤导致看不到产品
    setLeadDaysFilter(undefined);
    if (!val) return;
    try {
      const res = await axios.get('/api/products', { params: { page: 1, pageSize: 1000, supplierId: val } });
      const items = res.data?.items || [];
      setAllProducts(items);
      const existingIds = new Set<string>((quote?.items || []).map((it: any) => it?.product?.id).filter(Boolean));
      const options = items
        .filter((p: any) => {
          const days = typeof p?.leadDays === 'number' ? p.leadDays : Number.MAX_SAFE_INTEGER;
          return leadDaysFilter === undefined ? true : Number(days) <= Number(leadDaysFilter);
        })
        .map((p: any) => ({
          label: `${existingIds.has(p.id) ? '已在本报价单 | ' : ''}${p.name} / ${p.spec} / ¥${Number(p.price).toFixed(2)} / 使用期${typeof p.leadDays === 'number' ? p.leadDays : '-'}天`,
          value: p.id,
          disabled: existingIds.has(p.id),
        }));
      setProductOptions(options);
    } catch (e) {
      message.error('加载产品失败');
    }
  };


  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">报价单详情</h1>
              <p className="text-gray-600">{quote.code}</p>
            </div>
            <Space>
              <Button icon={<SaveOutlined />} onClick={handleSave}>
                保存
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                导出 PDF
              </Button>
            </Space>
          </div>

          <div className="mb-4">
            <Form layout="inline" form={form}>
              <Form.Item name="customerName" label="客户名称">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item name="currency" label="币种">
                <Input style={{ width: 120 }} />
              </Form.Item>
              <Form.Item name="taxRate" label="税率">
                <InputNumber min={0} max={1} step={0.01} />
              </Form.Item>
              <Form.Item name="customerPhone" label="联系电话">
                <Input style={{ width: 180 }} />
              </Form.Item>
              <Form.Item name="customerAddress" label="客户地址">
                <Input style={{ width: 240 }} />
              </Form.Item>
              <Form.Item name="note" label="备注">
                <Input style={{ width: 240 }} />
              </Form.Item>
            </Form>
          </div>

          <Table
            columns={columns}
            dataSource={quote.items}
            rowKey="id"
            pagination={false}
          />

          <div className="mt-4 text-right">
            <p className="text-lg">
              <span className="mr-6">小计：¥{subtotal.toFixed(2)}</span>
              <span className="mr-6">税额：¥{tax.toFixed(2)}</span>
              <strong>总计：¥{total.toFixed(2)}</strong>
            </p>
          </div>
        </Card>

        <Card className="glass-card mt-4">
          <div className="mb-2 flex justify-between items-center">
            <h2 className="text-xl font-bold">添加报价项</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>添加产品</Button>
          </div>
          <Modal
            title="添加产品"
            open={addModalVisible}
            onCancel={() => setAddModalVisible(false)}
            onOk={() => addForm.submit()}
            width={520}
          >
            <Form form={addForm} layout="vertical" onFinish={async (values) => {
              try {
                const qty = Number(values.quantity || 1);
                const percent = Number(values.rowDeltaPercent || 0);
                const delta = percent / 100;
                const amount = Number(values.rowAmount || 0);
                const payload = (selectedProducts || []).map(pid => ({ productId: pid, quantity: qty, rowDelta: delta, rowAmount: amount }));
                if (!payload.length) {
                  message.error('请至少选择一个产品');
                  return;
                }
                await axios.post(`/api/quotes/${params.id}/items`, payload);
                message.success('添加成功');
                setAddModalVisible(false);
                addForm.resetFields();
                setCategory(undefined);
                setSupplierId(undefined);
                setSupplierOptions([]);
                setProductOptions([]);
                setSelectedProducts([]);
                loadQuote();
              } catch (e) {
                message.error('添加失败');
              }
            }}>
              <Form.Item label="供应商类别">
                <Select
                  allowClear
                  placeholder="请选择类别"
                  value={category}
                  onChange={handleCategoryChange}
                  options={(categories || []).map(c => ({ label: formatCategoryLabel(c), value: c }))}
                />
              </Form.Item>
              <Form.Item label="供应商">
                <Select
                  allowClear
                  placeholder="请选择供应商"
                  value={supplierId}
                  onChange={handleSupplierChange}
                  options={supplierOptions}
                />
              </Form.Item>
              <Form.Item label="使用期筛选（最大提前天数）">
                <InputNumber
                  min={0}
                  step={1}
                  placeholder="按最大提前天数过滤"
                  style={{ width: '100%' }}
                  value={leadDaysFilter}
                  onChange={(val) => setLeadDaysFilter(typeof val === 'number' ? val : undefined)}
                />
              </Form.Item>
              <Form.Item label="产品（可多选）">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="请选择产品"
                  value={selectedProducts}
                  onChange={(vals) => setSelectedProducts(vals as string[])}
                  options={productOptions}
                />
              </Form.Item>
              <Form.Item name="quantity" label="数量" initialValue={1}>
                <InputNumber min={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="rowDeltaPercent" label="价格调整（百分比）" initialValue={0}>
                <InputNumber
                  min={-100}
                  max={100}
                  step={1}
                  style={{ width: '100%' }}
                  formatter={percentFormatter}
                  parser={percentParser}
                />
              </Form.Item>
              <Form.Item name="rowAmount" label="价格调整（加减金额）" initialValue={0}>
                <InputNumber
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </div>
    </MainLayout>
  );
}
