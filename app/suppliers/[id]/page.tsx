"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, Descriptions, Table, App } from 'antd';
import MainLayout from '@/components/Layout/MainLayout';

interface SupplierDetail {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
  note?: string;
  status: string;
  category?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  products?: {
    id: string;
    name: string;
    spec: string;
    price: number;
  }[];
}

export default function SupplierPreviewPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null);
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const { message } = App.useApp();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(setUser)
      .catch(() => {});

    fetch(`/api/suppliers/${params.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(setSupplier)
      .catch(() => message.error('加载供应商详情失败'));
  }, [params.id]);

  const productColumns = [
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    { title: '规格', dataIndex: 'spec', key: 'spec' },
    { title: '价格', dataIndex: 'price', key: 'price', render: (v: number) => `¥${Number(v).toFixed(2)}` },
  ];

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">供应商详情</h1>
          {supplier && (
            <Descriptions bordered column={2} size="middle">
              <Descriptions.Item label="名称">{supplier.name}</Descriptions.Item>
              <Descriptions.Item label="状态">{supplier.status === 'ENABLED' ? '启用' : '停用'}</Descriptions.Item>
              <Descriptions.Item label="联系人">{supplier.contact || '-'}</Descriptions.Item>
              <Descriptions.Item label="电话">{supplier.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="地址" span={2}>{supplier.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="类别">{supplier.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="开户行">{supplier.bankName || '-'}</Descriptions.Item>
              <Descriptions.Item label="开户名">{supplier.bankAccountName || '-'}</Descriptions.Item>
              <Descriptions.Item label="卡号" span={2}>{supplier.bankAccountNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{supplier.note || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        <Card className="glass-card mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">关联产品</h2>
          <Table
            columns={productColumns}
            dataSource={supplier?.products || []}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </MainLayout>
  );
}