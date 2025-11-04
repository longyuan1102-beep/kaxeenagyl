'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, Avatar, Dropdown, App } from 'antd';
import {
  DashboardOutlined,
  ShopOutlined,
  AppstoreOutlined,
  ImportOutlined,
  FileTextOutlined,
  BankOutlined,
  UserOutlined,
  LogoutOutlined,
  UsergroupAddOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';

const { Header, Sider } = Layout;

interface MainLayoutProps {
  user: any;
  children: React.ReactNode;
}

export default function MainLayout({ user, children }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { message } = App.useApp();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard" prefetch>仪表盘</Link>,
    },
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: <Link href="/suppliers" prefetch>供应商管理</Link>,
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: <Link href="/products" prefetch>产品管理</Link>,
    },
    {
      key: '/import',
      icon: <ImportOutlined />,
      label: <Link href="/import" prefetch>产品导入</Link>,
    },
    {
      key: '/quotes',
      icon: <FileTextOutlined />,
      label: <Link href="/quotes" prefetch>报价单</Link>,
    },
    {
      key: '/company',
      icon: <BankOutlined />,
      label: <Link href="/company" prefetch>公司抬头</Link>,
      disabled: user?.role !== 'OWNER',
    },
    {
      key: '/users',
      icon: <UsergroupAddOutlined />,
      label: <Link href="/users" prefetch>用户管理</Link>,
      disabled: user?.role !== 'OWNER',
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      message.success('登出成功');
      router.replace('/login');
    } catch (error) {
      message.error('登出失败');
    }
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '个人信息',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '登出',
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') {
        handleLogout();
      }
      if (key === 'profile') {
        router.replace('/profile');
      }
    },
  };

  const rootKey = '/' + (pathname?.split('/')[1] || '');
  const availableKeys = [
    '/dashboard',
    '/suppliers',
    '/products',
    '/import',
    '/quotes',
    ...(user?.role === 'OWNER' ? ['/company', '/users'] : []),
  ];
  const selectedKey = availableKeys.includes(rootKey) ? rootKey : undefined;

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className="glass-card"
        width={220}
        trigger={
          <div className="sider-trigger-strong">
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
            <span>{collapsed ? '展开侧栏' : '收起侧栏'}</span>
          </div>
        }
      >
        <div className="h-16 flex items-center justify-center text-primary-500 font-bold text-lg whitespace-nowrap truncate">
          {collapsed ? 'SMS' : '开席啦供应链管理系统'}
        </div>
        <Menu
          theme="light"
          selectedKeys={selectedKey ? [selectedKey] : []}
          mode="inline"
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header className="glass-card bg-white/30 backdrop-blur-md flex items-center justify-end px-6">
          <Dropdown menu={userMenu} placement="bottomRight">
            <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
              <Avatar className="mr-2" icon={<UserOutlined />} />
              <span className="text-gray-700">{user?.email}</span>
            </div>
          </Dropdown>
        </Header>

        <Layout className="p-6">
          {children}
        </Layout>
      </Layout>
    </Layout>
  );
}
