'use client';

import { useState, useEffect, useRef } from 'react';
import { Table, Button, Input, Space, Modal, Form, Card, App, Select, Row, Col, Descriptions } from 'antd';
import { SUPPLIER_CATEGORIES, formatCategoryLabel } from '@/app/constants/supplierCategories';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CopyOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  category?: string;
  note: string;
  status: string;
}

export default function SuppliersPage() {
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewVisible, setViewVisible] = useState(false);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [searchPhone, setSearchPhone] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [form] = Form.useForm();
  const { message, notification } = App.useApp();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});
    loadSuppliers();
  }, []);

  const loadSuppliers = async (opts?: { name?: string; category?: string; phone?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    try {
      const params: any = {};
      if (opts?.name) params.name = opts.name;
      if (opts?.category) params.category = opts.category;
      if (opts?.phone) params.phone = opts.phone;
      params.page = opts?.page ?? currentPage;
      params.pageSize = opts?.pageSize ?? pageSize;
      const res = await axios.get('/api/suppliers', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        // 兼容旧返回格式
        setSuppliers(data);
        setTotal(data.length);
      } else {
        setSuppliers(data.items || []);
        setTotal(Number(data.total) || 0);
        setCurrentPage(Number(data.page) || 1);
        setPageSize(Number(data.pageSize) || pageSize);
      }
    } catch (error) {
      // 首次进入页面时，避免弹窗干扰；静默处理加载失败
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 根据筛选条件重新加载数据
    loadSuppliers({
      name: searchName || undefined,
      category: filterCategory || undefined,
      phone: searchPhone || undefined,
      page: 1,
      pageSize,
    });
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName, filterCategory, searchPhone, pageSize]);

  const handleAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleView = async (id: string) => {
    setViewLoading(true);
    try {
      const res = await axios.get(`/api/suppliers/${id}`);
      setViewing(res.data);
      setViewVisible(true);
    } catch (error) {
      message.error('加载详情失败');
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (record: Supplier) => {
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (user?.role === 'ASSISTANT') {
      message.error('无权限操着');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个供应商吗？',
      onOk: async () => {
        try {
          await axios.delete(`/api/suppliers/${id}`);
          message.success('删除成功');
          loadSuppliers();
        } catch (error: any) {
          message.error(error?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSupplier) {
        await axios.patch(`/api/suppliers/${editingSupplier.id}`, values);
        message.success('更新成功');
      } else {
        await axios.post('/api/suppliers', values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadSuppliers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 72,
      render: (_: any, __: Supplier, index: number) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (text: string, record: Supplier) => (
        <a
          className="text-[var(--primary-color)] hover:underline"
          href={`/suppliers/${record.id}`}
        >
          {text}
        </a>
      ),
    },
    {
      title: '联系人',
      dataIndex: 'contact',
      key: 'contact',
      width: 120,
      ellipsis: true,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      ellipsis: true,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      ellipsis: true,
      render: (v: string) => (
        <span className="text-orange-500">{formatCategoryLabel(v)}</span>
      ),
    },
    {
      title: '开户行',
      dataIndex: 'bankName',
      key: 'bankName',
      width: 160,
      ellipsis: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 320,
      render: (v: string) => (
        <div className="whitespace-normal break-words">{v}</div>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      width: 260,
      render: (v: string) => (
        <div className="whitespace-normal break-words">{v}</div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Supplier) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleView(record.id)} />
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">供应商管理</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增供应商
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <Input.Search
              allowClear
              placeholder="搜索名称"
              onSearch={(v) => setSearchName(v.trim())}
              onChange={(e) => setSearchName(e.target.value)}
              value={searchName}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="类别筛选"
              value={filterCategory}
              onChange={(v) => setFilterCategory(v)}
              style={{ width: 240 }}
              options={SUPPLIER_CATEGORIES.map(c => ({ value: c.label, label: formatCategoryLabel(c.label) }))}
            />
            <Input.Search
              allowClear
              placeholder="搜索电话"
              onSearch={(v) => setSearchPhone(v.trim())}
              onChange={(e) => setSearchPhone(e.target.value)}
              value={searchPhone}
              style={{ width: 200 }}
            />
            <Button onClick={() => { setSearchName(''); setFilterCategory(undefined); setSearchPhone(''); }}>重置</Button>
          </div>

          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="id"
            loading={loading}
            size="middle"
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
              loadSuppliers({
                name: searchName || undefined,
                category: filterCategory || undefined,
                phone: searchPhone || undefined,
                page: nextPage,
                pageSize: nextSize,
              });
            }}
          />
        </Card>

        <Modal
          title={editingSupplier ? '编辑供应商' : '新增供应商'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
          width={720}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* 基本信息 */}
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: true, message: '请输入供应商名称' }]}
            >
              <Input placeholder="请输入供应商名称" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="contact" label="联系人">
                  <Input placeholder="请输入联系人" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label="电话">
                  <Input placeholder="请输入电话" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="category" label="类别">
                  <Select
                    placeholder="请选择类别"
                    options={SUPPLIER_CATEGORIES.map(c => ({ value: c.label, label: formatCategoryLabel(c.label) }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="address" label="地址">
                  <Input placeholder="请输入地址" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bankName" label="开户行">
                  <Input placeholder="请输入开户行" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bankAccountName" label="开户名">
                  <Input placeholder="请输入开户名" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="bankAccountNumber" label="卡号">
                  <Input placeholder="请输入卡号" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="note" label="备注">
              <Input.TextArea rows={3} placeholder="请输入备注" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="查看供应商"
          open={viewVisible}
          onCancel={() => setViewVisible(false)}
          footer={null}
          width={720}
          confirmLoading={viewLoading}
        >
          {viewing && (
            <Descriptions bordered column={2} size="middle">
              <Descriptions.Item label="名称">{viewing.name}</Descriptions.Item>
              <Descriptions.Item label="类别">{viewing.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系人">{viewing.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="电话">{viewing.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>{viewing.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="开户行">
                <Space>
                  {viewing.bankName || '-'}
                  {viewing.bankName ? (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      try {
                        navigator.clipboard.writeText(String(viewing.bankName));
                        message.success('开户行已复制');
                      } catch (e) {
                        message.error('复制失败');
                      }
                    }} />
                  ) : null}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="开户名">
                <Space>
                  {viewing.bankAccountName || '-'}
                  {viewing.bankAccountName ? (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      try {
                        navigator.clipboard.writeText(String(viewing.bankAccountName));
                        message.success('开户名已复制');
                      } catch (e) {
                        message.error('复制失败');
                      }
                    }} />
                  ) : null}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="卡号" span={2}>
                <Space>
                  {viewing.bankAccountNumber || '-'}
                  {viewing.bankAccountNumber ? (
                    <Button size="small" icon={<CopyOutlined />} onClick={() => {
                      try {
                        navigator.clipboard.writeText(String(viewing.bankAccountNumber));
                        message.success('卡号已复制');
                      } catch (e) {
                        message.error('复制失败');
                      }
                    }} />
                  ) : null}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{viewing.note || '-'}</Descriptions.Item>
            </Descriptions>
          )}
          {viewing && (
            <div className="mt-3">
              <Button size="small" icon={<CopyOutlined />} onClick={() => {
                const bn = viewing.bankName || '';
                const an = viewing.bankAccountName || '';
                const num = viewing.bankAccountNumber || '';
                const text = `开户行：${bn}\n开户名：${an}\n卡号：${num}`.trim();
                try {
                  navigator.clipboard.writeText(text);
                  message.success('银行信息已复制');
                } catch (e) {
                  message.error('复制失败');
                }
              }}>
                复制银行信息
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
