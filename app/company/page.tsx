'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Upload, App, Image } from 'antd';
import { useRouter } from 'next/navigation';
import { SaveOutlined, UploadOutlined } from '@ant-design/icons';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface CompanyProfile {
  id: string;
  nameCn: string;
  nameEn: string;
  bankAccount: string;
  bankName: string;
  phone: string;
  logoUrl: string;
}

export default function CompanyPage() {
  const [user, setUser] = useState<any>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');

  const toAbsolute = (url?: string) => {
    if (!url) return '';
    return /^(https?:)?\/\//.test(url) ? url : `http://localhost:3001${url}`;
  };

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

    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await axios.get('/api/company-profile');
      form.setFieldsValue(res.data);
      if (res.data?.logoUrl) {
        setLogoUrl(res.data.logoUrl);
      }
    } catch (error) {
      message.error('加载公司信息失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      await axios.put('/api/company-profile', values);
      message.success('保存成功');
    } catch (error) {
      message.error('保存失败');
    }
  };

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">公司抬头配置</h1>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="max-w-2xl"
          >
            {/* 上传并保存公司 Logo */}
            <Form.Item label="Logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Upload
                  showUploadList={false}
                  customRequest={async ({ file, onSuccess, onError }) => {
                    try {
                      setUploading(true);
                      const formData = new FormData();
                      formData.append('file', file as File);
                      const res = await axios.post('/api/company-profile/logo', formData, {
                        withCredentials: true,
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      const url = res.data.logoUrl || res.data?.logoUrl || res.data?.data?.logoUrl;
                      if (url) {
                        form.setFieldsValue({ logoUrl: url });
                        setLogoUrl(url);
                      }
                      message.success('Logo 上传并保存成功');
                      setUploading(false);
                      onSuccess && onSuccess(res.data);
                    } catch (err: any) {
                      setUploading(false);
                      message.error('Logo 上传失败');
                      onError && onError(err);
                    }
                  }}
                >
                  <Button loading={uploading} icon={<UploadOutlined />}>上传 Logo</Button>
                </Upload>
                {/* 预览当前 Logo */}
                {logoUrl ? (
                  <img
                    src={toAbsolute(logoUrl)}
                    alt="Logo"
                    width={60}
                    height={60}
                    style={{ objectFit: 'contain', borderRadius: '50%', border: '1px solid #eee' }}
                    onError={() => setLogoUrl('')}
                  />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid #eee' }} />
                )}
              </div>
            </Form.Item>
            {/* 隐藏字段用于保存 logoUrl 到表单 */}
            <Form.Item name="logoUrl" style={{ display: 'none' }}>
              <Input type="hidden" />
            </Form.Item>

            <Form.Item
              name="nameCn"
              label="公司中文名"
              rules={[{ required: true, message: '请输入公司中文名' }]}
            >
              <Input placeholder="请输入公司中文名" />
            </Form.Item>

            <Form.Item
              name="nameEn"
              label="公司英文名"
              rules={[{ required: true, message: '请输入公司英文名' }]}
            >
              <Input placeholder="请输入公司英文名" />
            </Form.Item>

            <Form.Item
              name="bankAccount"
              label="银行账号"
              rules={[{ required: true, message: '请输入银行账号' }]}
            >
              <Input placeholder="请输入银行账号" />
            </Form.Item>

            <Form.Item
              name="bankName"
              label="开户行"
              rules={[{ required: true, message: '请输入开户行' }]}
            >
              <Input placeholder="请输入开户行" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="联系电话"
              rules={[{ required: true, message: '请输入联系电话' }]}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </MainLayout>
  );
}
