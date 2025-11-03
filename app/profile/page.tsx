"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/Layout/MainLayout";
import { Card, Skeleton, Form, Input, Button, App } from "antd";
import axios from "axios";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setLoading(false);
        } else {
          router.replace("/login");
        }
      } catch (e) {
        router.replace("/login");
      }
    };
    loadUser();
  }, []);

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          {loading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : (
            <>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800">个人信息</h1>
                <p className="text-gray-600">查看当前登录账号的信息</p>
              </div>
              <div className="space-y-2 text-gray-800">
                <div>
                  <span className="font-semibold">邮箱：</span>
                  <span>{user?.email || "-"}</span>
                </div>
                <div>
                  <span className="font-semibold">角色：</span>
                  <span>{user?.role === "OWNER" ? "主用户" : user?.role === "ASSISTANT" ? "辅助用户" : user?.role || "-"}</span>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-3">修改密码</h2>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={async (values) => {
                    try {
                      if (values.newPassword !== values.confirmPassword) {
                        message.error('两次输入的新密码不一致');
                        return;
                      }
                      await axios.post('/api/auth/change-password', {
                        currentPassword: values.currentPassword,
                        newPassword: values.newPassword,
                      });
                      message.success('密码修改成功');
                      form.resetFields();
                    } catch (error: any) {
                      message.error(error?.response?.data?.message || '密码修改失败');
                    }
                  }}
                  style={{ maxWidth: 420 }}
                >
                  <Form.Item
                    name="currentPassword"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Input.Password placeholder="请输入当前密码" />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '至少6位' }]}
                  >
                    <Input.Password placeholder="请输入新密码" />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={["newPassword"]}
                    rules={[{ required: true, message: '请再次输入新密码' }]}
                  >
                    <Input.Password placeholder="请再次输入新密码" />
                  </Form.Item>
                  <Button type="primary" onClick={() => form.submit()}>保存</Button>
                </Form>
              </div>
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}