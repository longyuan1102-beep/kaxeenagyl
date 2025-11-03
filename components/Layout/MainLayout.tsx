'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const { message, notification } = App.useApp();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: '供应商管理',
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: '产品管理',
    },
    {
      key: '/import',
      icon: <ImportOutlined />,
      label: '产品导入',
    },
    {
      key: '/quotes',
      icon: <FileTextOutlined />,
      label: '报价单',
    },
    {
      key: '/company',
      icon: <BankOutlined />,
      label: '公司抬头',
    },
    {
      key: '/users',
      icon: <UsergroupAddOutlined />,
      label: '用户管理',
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
          onClick={({ key }) => {
            const isOwner = user?.role === 'OWNER';
            if ((key === '/company' || key === '/users') && !isOwner) {
              notification.warning({
                message: '无权限操作',
                description: '当前账号无权限访问此功能，请联系管理员',
                placement: 'topRight',
                key: 'no-permission',
                duration: 3,
              });
              return;
            }
            if (pathname !== key) {
              router.push(key);
            }
          }}
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
