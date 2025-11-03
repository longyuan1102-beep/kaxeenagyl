'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Card, App, Select } from 'antd';
import { PlusOutlined, EyeOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface Quote {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  status: string;
  createdAt: string;
  currency?: string;
  taxRate?: number;
  items?: Array<{
    quantity: number;
    basePrice: number;
    displayPrice: number;
    rowDelta?: number;
    rowAmount?: number;
  }>;
}

export default function QuotesPage() {
  const [user, setUser] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [exportingMap, setExportingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});

    loadQuotes();
  }, []);

  const loadQuotes = async (opts?: { page?: number; pageSize?: number }) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/quotes', { params: {
        page: opts?.page ?? currentPage,
        pageSize: opts?.pageSize ?? pageSize,
        status: statusFilter,
        customerName: customerFilter || undefined,
      }});
      const data = res.data;
      if (Array.isArray(data)) {
        setQuotes(data);
        setTotal(data.length);
      } else {
        setQuotes(data.items || []);
        setTotal(Number(data.total) || 0);
        setCurrentPage(Number(data.page) || 1);
        setPageSize(Number(data.pageSize) || pageSize);
      }
    } catch (error) {
      message.error('加载报价单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      await axios.post('/api/quotes', values);
      message.success('创建成功');
      setModalVisible(false);
      loadQuotes();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleExport = async (id: string) => {
    if (exportingMap[id]) return; // 防止多次点击
    setExportingMap(prev => ({ ...prev, [id]: true }));
    try {
      const response = await axios.get(`/api/quotes/${id}/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      message.success('导出成功');
      loadQuotes();
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExportingMap(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role === 'ASSISTANT') {
      message.error('无权限操着');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个报价单吗？',
      onOk: async () => {
        try {
          await axios.delete(`/api/quotes/${id}`);
          message.success('删除成功');
          loadQuotes();
        } catch (error: any) {
          message.error(error?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (text: string, record: Quote) => (
        <Link prefetch={false} href={`/quotes/${record.id}`} className="text-[var(--primary-color)] hover:underline">
          {text}
        </Link>
      ),
    },
    {
      title: '币种',
      dataIndex: 'currency',
      key: 'currency',
      width: 80,
    },
    {
      title: '税率',
      dataIndex: 'taxRate',
      key: 'taxRate',
      width: 80,
      render: (v: number) => `${Number(v || 0) * 100}%`,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 160,
    },
    {
      title: '客户电话',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      width: 160,
    },
    {
      title: '客户地址',
      dataIndex: 'customerAddress',
      key: 'customerAddress',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => status === 'DRAFT' ? '草稿' : '已导出',
    },
    {
      title: '价格调整摘要',
      key: 'adjustSummary',
      width: 220,
      render: (_: any, record: Quote) => {
        const items = Array.isArray(record.items) ? record.items : [];
        const baseSubtotal = items.reduce((sum, it) => sum + Number(it.basePrice || 0) * Number(it.quantity || 0), 0);
        const adjSubtotal = items.reduce((sum, it) => sum + Number(it.displayPrice || 0) * Number(it.quantity || 0), 0);
        const diff = adjSubtotal - baseSubtotal;
        const percent = baseSubtotal > 0 ? (diff / baseSubtotal) * 100 : 0;
        const adjustedCount = items.filter(it => Number(it.rowDelta || 0) !== 0 || Number(it.rowAmount || 0) !== 0).length;
        const trend = diff > 0 ? '上浮' : diff < 0 ? '下降' : '不变';
        const parts = [`${percent.toFixed(0)}%`, `¥${diff.toFixed(2)}`];
        const countStr = adjustedCount > 0 ? `（${adjustedCount} 项调整）` : '';
        return items.length ? `${trend}（${parts.join(' / ')}）${countStr}` : '—';
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      width: 220,
      render: (_: any, record: Quote) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/quotes/${record.id}`)}>
            查看
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            loading={!!exportingMap[record.id]}
            onClick={() => handleExport(record.id)}
          >
            导出 PDF
          </Button>
          <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">报价单管理</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新建报价单
            </Button>
          </div>

          <div className="mb-4 flex gap-3 items-center">
            <Input
              placeholder="按客户名称搜索"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 180 }}
              options={[
                { label: '草稿', value: 'DRAFT' },
                { label: '已导出', value: 'EXPORTED' },
              ]}
            />
            <Button type="primary" onClick={() => loadQuotes()}>查询</Button>
            <Button onClick={() => { setCustomerFilter(''); setStatusFilter(undefined); loadQuotes({ page: 1, pageSize }); }}>重置</Button>
          </div>

          <Table
            size="small"
            columns={[
              {
                title: '序号',
                key: 'index',
                width: 72,
                render: (_: any, __: Quote, index: number) => (currentPage - 1) * pageSize + index + 1,
              },
              ...columns,
            ]}
            dataSource={quotes}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 30, 50],
            }}
            onChange={(pagination) => {
              const { current, pageSize: ps } = pagination;
              const nextPage = current || 1;
              const nextSize = ps || pageSize;
              setCurrentPage(nextPage);
              setPageSize(nextSize);
              loadQuotes({ page: nextPage, pageSize: nextSize });
            }}
          />
        </Card>

        <Modal
          title="新建报价单"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="customerName"
              label="客户名称"
              rules={[{ required: true, message: '请输入客户名称' }]}
            >
              <Input placeholder="请输入客户名称" />
            </Form.Item>

            <Form.Item
              name="currency"
              label="币种"
              initialValue="CNY"
            >
              <Input placeholder="请输入币种" />
            </Form.Item>

            <Form.Item
              name="taxRate"
              label="税率"
              initialValue={0}
            >
              <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="customerPhone"
              label="联系电话"
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>

            <Form.Item
              name="customerAddress"
              label="客户地址"
            >
              <Input placeholder="请输入客户地址" />
            </Form.Item>

            <Form.Item name="note" label="备注">
              <Input.TextArea rows={3} placeholder="请输入备注" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
