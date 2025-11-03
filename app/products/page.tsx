'use client';

import { useState, useEffect, useRef } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, Card, App, Upload, Radio, InputNumber, Divider, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface Product {
  id: string;
  name: string;
  spec: string;
  price: number;
  leadDays: number;
  supplier: { id: string; name: string };
  quantity?: number;
  description?: string | null;
  images?: { id: string; imageUrl: string; sort: number }[];
}

interface Supplier {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const { message, notification } = App.useApp();
  const didInit = useRef(false);
  const [coverFiles, setCoverFiles] = useState<any[]>([]);
  const [detailFiles, setDetailFiles] = useState<any[]>([]);
  const [viewVisible, setViewVisible] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  // 请求取消与防抖
  const productsAbortRef = useRef<AbortController | null>(null);
  const reloadDebounceRef = useRef<number | null>(null);

  // 系统默认产品占位图（加载失败或无图时使用）
  const DEFAULT_PRODUCT_IMAGE = 'https://placehold.co/160x160?text=Product';

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});
    loadProducts();
    loadSuppliers();
  }, []);

  const loadProducts = async (opts?: { search?: string; supplierId?: string; page?: number; pageSize?: number }) => {
    setLoading(true);
    try {
      // 取消上一请求，避免竞态与不必要的渲染
      if (productsAbortRef.current) {
        productsAbortRef.current.abort();
      }
      const controller = new AbortController();
      productsAbortRef.current = controller;
      const res = await axios.get('/api/products', {
        params: {
          search: opts?.search ?? undefined,
          supplierId: opts?.supplierId ?? undefined,
          page: opts?.page ?? currentPage,
          pageSize: opts?.pageSize ?? pageSize,
        },
        signal: controller.signal,
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setProducts(data);
        setTotal(data.length);
      } else {
        setProducts(data.items || []);
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

  const loadSuppliers = async () => {
    try {
      const res = await axios.get('/api/suppliers');
      setSuppliers(res.data.items || res.data);
    } catch (error) {
      // 初次进入页面时，避免弹窗干扰；静默处理加载失败
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setCoverFiles([]);
    setDetailFiles([]);
    setModalVisible(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    // 预填充已有图片：首张为封面，其余为详情图
    const sorted = Array.isArray(record.images) ? [...record.images].sort((a:any,b:any)=>a.sort-b.sort) : [];
    const cover = sorted[0];
    const details = sorted.slice(1);
    const toUploadItem = (img: any) => ({
      uid: img.id,
      name: '图片',
      status: 'done' as const,
      // 统一使用相对路径，Next 已通过 rewrites 将 /uploads 代理到后端
      url: img.imageUrl,
      existingId: img.id,
    });
    setCoverFiles(cover ? [toUploadItem(cover)] : []);
    setDetailFiles(details.map(toUploadItem));
    setModalVisible(true);
  };

  const handleView = async (id: string) => {
    setViewLoading(true);
    try {
      const res = await axios.get(`/api/products/${id}`);
      setViewing(res.data);
      setViewVisible(true);
    } catch (error) {
      message.error('加载详情失败');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role === 'ASSISTANT') {
      message.error('无权限操着');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个产品吗？',
      onOk: async () => {
        try {
          await axios.delete(`/api/products/${id}`);
          message.success('删除成功');
          loadProducts();
        } catch (error: any) {
          message.error(error?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  useEffect(() => {
    // 根据筛选条件重新加载数据（300ms 防抖）
    if (reloadDebounceRef.current) {
      window.clearTimeout(reloadDebounceRef.current);
    }
    reloadDebounceRef.current = window.setTimeout(() => {
      loadProducts({ search: searchText || undefined, supplierId: filterSupplierId || undefined, page: 1, pageSize });
      setCurrentPage(1);
    }, 300);
    return () => {
      if (reloadDebounceRef.current) {
        window.clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
      }
    };
  }, [searchText, filterSupplierId, pageSize]);

  // 组件卸载时取消未完成请求
  useEffect(() => {
    return () => {
      if (productsAbortRef.current) {
        productsAbortRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        supplierId: values.supplierId,
        name: values.name,
        spec: values.spec,
        price: values?.price !== undefined ? Number(values.price) : undefined,
        leadDays: values?.leadDays !== undefined ? Number(values.leadDays) : undefined,
        quantity: values?.quantity !== undefined && values.quantity !== null ? Number(values.quantity) : undefined,
        description: values?.description ? String(values.description) : undefined,
        note: values?.note ? String(values.note) : undefined,
      };
      let productId = editingProduct?.id;
      if (editingProduct) {
        const res = await axios.patch(`/api/products/${editingProduct.id}`, payload);
        productId = res.data?.id || editingProduct.id;
        message.success('更新成功');
      } else {
        const res = await axios.post('/api/products', payload);
        productId = res.data?.id;
        message.success('创建成功');
      }

      // 上传新增图片（后端接口：POST /api/products/:id/images）
      const uploadOne = async (file: any, sort: number) => {
        if (!file?.originFileObj || !productId) return;
        const formData = new FormData();
        formData.append('file', file.originFileObj as File);
        await axios.post(`/api/products/${productId}/images?sort=${sort}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      };

      const newCoverFiles = coverFiles.filter(f => !!f.originFileObj);
      const newDetailFiles = detailFiles.filter(f => !!f.originFileObj);
      let nextSort = (editingProduct?.images?.length || 0);
      for (let i = 0; i < newCoverFiles.length; i++) {
        await uploadOne(newCoverFiles[i], nextSort++);
      }
      for (let j = 0; j < newDetailFiles.length; j++) {
        await uploadOne(newDetailFiles[j], nextSort++);
      }

      setModalVisible(false);
      loadProducts();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 72,
      render: (_: any, __: Product, index: number) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: any[]) => {
        const url = images && images.length ? images.sort((a,b)=>a.sort-b.sort)[0].imageUrl : null;
        // 直接使用相对路径或远程绝对路径
        const src = url ? url : DEFAULT_PRODUCT_IMAGE;
        return (
          <Image
            src={src}
            alt="cover"
            width={40}
            height={40}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback={DEFAULT_PRODUCT_IMAGE}
            preview={false}
          />
        );
      },
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Product) => (
        <button
          className="text-[var(--primary-color)] hover:underline bg-transparent border-none p-0 cursor-pointer"
          onClick={() => handleEdit(record)}
        >
          {text}
        </button>
      ),
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec',
    },
    {
      title: '供应商',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
    },
    {
      title: '产品介绍',
      dataIndex: 'description',
      key: 'description',
      render: (desc: any) => {
        const s = typeof desc === 'string' ? desc : '';
        if (!s) return '-';
        const short = s.length > 24 ? s.slice(0, 24) + '…' : s;
        return <span title={s}>{short}</span>;
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (n: any) => {
        const v = typeof n === 'number' ? n : parseInt(n);
        if (Number.isNaN(v) || !Number.isFinite(v)) return '-';
        return v;
      },
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (price: any) => {
        const n = typeof price === 'number' ? price : parseFloat(price);
        if (Number.isNaN(n) || !Number.isFinite(n)) return '-';
        return `¥${n.toFixed(2)}`;
      },
    },
    {
      title: '提前预定天数',
      dataIndex: 'leadDays',
      key: 'leadDays',
      render: (days: any) => {
        const d = typeof days === 'number' ? days : parseInt(days);
        if (Number.isNaN(d) || !Number.isFinite(d)) return '-';
        return `${d} 天`;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Product) => (
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
            <h1 className="text-2xl font-bold text-gray-800">产品管理</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增产品
            </Button>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <Input.Search
              allowClear
              placeholder="搜索产品名称"
              onSearch={(v) => setSearchText(v.trim())}
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder="筛选供应商"
              value={filterSupplierId}
              onChange={(v) => setFilterSupplierId(v)}
              style={{ width: 220 }}
            >
              {suppliers.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
            <Button onClick={() => { setSearchText(''); setFilterSupplierId(undefined); }}>重置</Button>
          </div>

          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            loading={loading}
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
              loadProducts({
                search: searchText || undefined,
                supplierId: filterSupplierId || undefined,
                page: nextPage,
                pageSize: nextSize,
              });
            }}
          />
        </Card>

        <Modal
          title={editingProduct ? '编辑产品' : '新增产品'}
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
              name="supplierId"
              label="供应商"
              rules={[{ required: true, message: '请选择供应商' }]}
            >
              <Select placeholder="请选择供应商">
                {suppliers.map(s => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="name"
              label="产品名称"
              rules={[{ required: true, message: '请输入产品名称' }]}
            >
              <Input placeholder="请输入产品名称" />
            </Form.Item>

            <Form.Item
              name="spec"
              label="规格"
              rules={[{ required: true, message: '请选择规格' }]}
            >
              <Radio.Group>
                {['台','架','张','袋','箱','瓶','条','副'].map(u => (
                  <Radio key={u} value={u}>{u}</Radio>
                ))}
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="price"
              label="单价"
              rules={[{ required: true, message: '请输入单价' }]}
            >
              <Input type="number" placeholder="请输入单价" step="0.01" />
            </Form.Item>

            <Form.Item
              name="leadDays"
              label="提前预定天数（可选）"
              rules={[{
                validator: (_, value) => {
                  if (value === undefined || value === null || value === '') return Promise.resolve();
                  const n = Number(value);
                  if (Number.isFinite(n) && n >= 0) return Promise.resolve();
                  return Promise.reject(new Error('请输入不小于 0 的数字'));
                },
              }]}
            >
              <Input type="number" placeholder="请输入天数" />
            </Form.Item>

            <Form.Item
              name="quantity"
              label="数量"
              rules={[
                { required: true, message: '请输入数量' },
                {
                  validator: (_, value) => {
                    if (value === undefined || value === null || value === '') {
                      return Promise.reject(new Error('请输入数量'));
                    }
                    const n = Number(value);
                    if (Number.isInteger(n) && n >= 1) return Promise.resolve();
                    return Promise.reject(new Error('数量必须为不小于 1 的整数'));
                  },
                },
              ]}
            >
              <InputNumber min={1} placeholder="请输入数量" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="description"
              label="产品介绍"
            >
              <Input.TextArea rows={3} placeholder="请输入产品介绍" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="产品封面">
                <Upload
                  className="small-picture-card"
                  listType="picture-card"
                  beforeUpload={() => false}
                  fileList={coverFiles}
                  maxCount={1}
                  onChange={({ fileList }) => setCoverFiles(fileList)}
                  onPreview={(file:any)=>{ if (file.url) window.open(file.url); }}
                  onRemove={async (file:any)=>{
                    if (file.existingId) {
                      try {
                        await axios.delete(`/api/products/images/${file.existingId}`);
                        setCoverFiles(prev=>prev.filter(f=>f.uid!==file.uid));
                        setEditingProduct(prev=> prev ? ({...prev, images: (prev.images||[]).filter((img:any)=>img.id!==file.existingId)}) : prev);
                        message.success('封面已删除');
                      } catch (e) {
                        message.error('删除封面失败');
                        return false;
                      }
                    }
                    return true;
                  }}
                >
                  {coverFiles.length >= 1 ? null : <div>上传封面</div>}
                </Upload>
              </Form.Item>

              <Form.Item label="产品详情图（可多张）">
                <Upload
                  className="small-picture-card"
                  multiple
                  listType="picture-card"
                  beforeUpload={() => false}
                  fileList={detailFiles}
                  onChange={({ fileList }) => setDetailFiles(fileList)}
                  onPreview={(file:any)=>{ if (file.url) window.open(file.url); }}
                  onRemove={async (file:any)=>{
                    if (file.existingId) {
                      try {
                        await axios.delete(`/api/products/images/${file.existingId}`);
                        setDetailFiles(prev=>prev.filter(f=>f.uid!==file.uid));
                        setEditingProduct(prev=> prev ? ({...prev, images: (prev.images||[]).filter((img:any)=>img.id!==file.existingId)}) : prev);
                        message.success('图片已删除');
                      } catch (e) {
                        message.error('删除失败');
                        return false;
                      }
                    }
                    return true;
                  }}
                >
                  <div>上传图片</div>
                </Upload>
              </Form.Item>
            </div>
          </Form>
        </Modal>

        <Modal
          title="查看产品"
          open={viewVisible}
          onCancel={() => setViewVisible(false)}
          footer={<Button onClick={() => setViewVisible(false)}>关闭</Button>}
          width={800}
        >
          {viewLoading ? (
            <div>加载中...</div>
          ) : viewing ? (
            <div>
              <div className="flex gap-4 items-start">
                <div>
                  {Array.isArray(viewing.images) && viewing.images.length ? (
                    <Image
                      // 使用相对路径，避免硬编码后端域名
                      src={(viewing.images.sort((a:any,b:any)=>a.sort-b.sort)[0].imageUrl || '')}
                      alt="cover"
                      width={160}
                      height={160}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback={DEFAULT_PRODUCT_IMAGE}
                    />
                  ) : (
                    <Image
                      src={DEFAULT_PRODUCT_IMAGE}
                      alt="cover"
                      width={160}
                      height={160}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      fallback={DEFAULT_PRODUCT_IMAGE}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">产品名称：</span>{viewing.name}</div>
                    <div><span className="text-gray-500">规格：</span>{viewing.spec}</div>
                    <div><span className="text-gray-500">供应商：</span>{viewing.supplier?.name}</div>
                    <div><span className="text-gray-500">单价：</span>{`¥${Number(viewing.price).toFixed(2)}`}</div>
                    <div><span className="text-gray-500">提前预定天数：</span>{viewing.leadDays} 天</div>
                    <div><span className="text-gray-500">数量：</span>{viewing.quantity ?? '-'}</div>
                  </div>
                </div>
              </div>
              <Divider />
              <div className="text-sm">
                <div className="mb-2 text-gray-500">产品介绍：</div>
                <div className="whitespace-pre-wrap">{viewing.description || '-'}</div>
              </div>
              {Array.isArray(viewing.images) && viewing.images.length ? (
                <>
                  <Divider />
                  <div className="text-sm text-gray-500 mb-2">产品详情图（点击缩略图可放大）：</div>
                  <div className="flex flex-wrap gap-6 items-center">
                    <Image.PreviewGroup>
                      {viewing.images.sort((a:any,b:any)=>a.sort-b.sort).map((img:any)=>{
                        const src = img.imageUrl;
                        return (
                          <Image
                            key={img.id}
                            src={src}
                            alt="pic"
                            width={120}
                            height={120}
                            style={{ objectFit: 'cover', borderRadius: 6 }}
                            fallback={DEFAULT_PRODUCT_IMAGE}
                          />
                        );
                      })}
                    </Image.PreviewGroup>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div>暂无数据</div>
          )}
        </Modal>
      </div>
    </MainLayout>
  );
}
