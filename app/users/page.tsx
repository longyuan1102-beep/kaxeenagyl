'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Modal, Form, Input, Select, Card, Space, App } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  role: string;
  status: string;
}

export default function UsersPage() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setUser(data);
        if (data.role !== 'OWNER') {
          router.replace('/dashboard');
        }
      })
      .catch(() => {});

    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (error) {
      message.error('加载用户列表失败');
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
      await axios.post('/api/users', values);
      message.success('创建成功');
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个用户吗？',
      onOk: async () => {
        try {
          await axios.delete(`/api/users/${id}`);
          message.success('删除成功');
          loadUsers();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => role === 'OWNER' ? '主用户' : '辅助用户',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => status === 'ACTIVE' ? '启用' : '停用',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space>
          <Button icon={<LockOutlined />} onClick={() => { setResetUserId(record.id); resetForm.resetFields(); setResetVisible(true); }} />
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
            <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增用户
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>

        <Modal
          title="新增用户"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={() => form.submit()}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱' },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>

            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select placeholder="请选择角色">
                <Select.Option value="OWNER">主用户</Select.Option>
                <Select.Option value="ASSISTANT">辅助用户</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="重置密码"
          open={resetVisible}
          onCancel={() => setResetVisible(false)}
          onOk={() => resetForm.submit()}
        >
          <Form
            layout="vertical"
            form={resetForm}
            onFinish={async (values) => {
              try {
                if (!resetUserId) return;
                await axios.post(`/api/users/${resetUserId}/reset-password`, { newPassword: values.newPassword });
                setResetVisible(false);
                message.success('密码已重置');
              } catch (error: any) {
                message.error(error?.response?.data?.message || '重置失败');
              }
            }}
          >
            <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少6位' }]}> 
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
}
