'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Statistic, Row, Col, Card } from 'antd';
import { DollarOutlined, ShopOutlined, AppstoreOutlined, FileTextOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';

const { Content } = Layout;

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    suppliers: 0,
    products: 0,
    quotes: 0,
    totalValue: 0,
  });

  useEffect(() => {
    // 获取用户信息
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});

    // 获取统计数据（真实接口）
    fetch('/api/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStats({
          suppliers: Number(data?.suppliers) || 0,
          products: Number(data?.products) || 0,
          quotes: Number(data?.quotes) || 0,
          totalValue: Number(data?.totalValue) || 0,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <MainLayout user={user}>
      <Content className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
          <p className="text-gray-600">欢迎回来，{user?.email}</p>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="glass-card">
              <Statistic
                title="供应商"
                value={stats.suppliers}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#ff8a00' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="glass-card">
              <Statistic
                title="产品"
                value={stats.products}
                prefix={<AppstoreOutlined />}
                valueStyle={{ color: '#ff8a00' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="glass-card">
              <Statistic
                title="报价单"
                value={stats.quotes}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#ff8a00' }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="glass-card">
              <Statistic
                title="总价值"
                value={stats.totalValue}
                prefix={<DollarOutlined />}
                precision={2}
                valueStyle={{ color: '#ff8a00' }}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </MainLayout>
  );
}
