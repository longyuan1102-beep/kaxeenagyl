'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Button, Card, message, Select, Form, Table, Space, Radio, Tooltip, Popconfirm } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import MainLayout from '@/components/Layout/MainLayout';
import axios from 'axios';

interface Supplier {
  id: string;
  name: string;
}

export default function ImportPage() {
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [mode, setMode] = useState<'skip' | 'update'>('skip');
  const [asyncJob, setAsyncJob] = useState<any>(null);
  const [jobProgress, setJobProgress] = useState<any>(null);
  const [jobList, setJobList] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [form] = Form.useForm();
  const [loadHint, setLoadHint] = useState<string | null>(null);
  const didInit = useRef(false);
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => {});

    loadSuppliers();
  }, []);

  // 卸载时清理倒计时定时器
  useEffect(() => {
    setMounted(true);
    return () => {
      if (cooldownTimer.current) {
        window.clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    };
  }, []);

  const loadSuppliers = async () => {
    try {
      const res = await axios.get('/api/suppliers');
      setSuppliers(res.data.items || res.data);
    } catch (error) {
      // 初次进入页面时，避免弹窗干扰；改为轻量的页内提示
      setLoadHint('供应商数据暂不可用，接口未就绪或暂无数据。可稍后重试。');
    }
  };

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setLoading(true);
    try {
      const supplierId = form.getFieldValue('supplierId');
      if (!supplierId) {
        message.warning('请选择供应商');
        if (onError) onError(new Error('缺少供应商'));
        return;
      }
      const formData = new FormData();
      formData.append('file', file as File);
      formData.append('supplierId', supplierId);
      formData.append('mode', mode);
      formData.append('mapping', JSON.stringify(mapping || {}));

      const res = await axios.post('/api/import/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { success, failed, skipped, updated } = res.data || {};
      let msg = `导入完成：成功 ${success} 条，失败 ${failed} 条`;
      if (typeof skipped === 'number') {
        msg += `，跳过 ${skipped} 条`;
      }
      if (typeof updated === 'number' && updated > 0) {
        msg += `，更新 ${updated} 条`;
      }
      message.success(msg);
      
      if (res.data.errors && res.data.errors.length > 0) {
        setPreviewData(res.data);
      }
      
      if (onSuccess) onSuccess(res.data);
    } catch (error: any) {
      message.error(error.response?.data?.message || '导入失败');
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBeforeUpload = async (file: File) => {
    setSelectedFile(file);
    return false; // 阻止自动上传，先预检
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      message.warning('请先选择文件');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post('/api/import/products/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHeaders(res.data.headers || []);
      // 过滤后端建议的 supplier / barcode 映射
      const rawMapping = res.data.mapping || {};
      const filtered: Record<string, string> = {};
      Object.keys(rawMapping || {}).forEach((k) => {
        const v = rawMapping[k];
        if (v !== 'supplier' && v !== 'barcode') filtered[k] = v;
      });
      setMapping(filtered);
      setSampleRows(res.data.sample || []);
      message.success(`预检完成：共 ${res.data.totalRows} 行，显示前 50 行样例`);
      const hdrs: string[] = res.data.headers || [];
      const suspect = hdrs.some((h: string) => /[Ã¥Ã¤Ã¦Ã©Â]/.test(h));
      if (suspect) {
        message.warning('检测到可能的字符乱码（编码问题），后端已自动尝试修复；若仍异常，请将CSV另存为UTF-8或上传XLSX文件');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || '预检失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get('/api/import/template/products.xlsx', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('模板下载失败');
    }
  };

  const startAsyncImport = async () => {
    if (!selectedFile) { message.warning('请先选择文件'); return; }
    const supplierId = form.getFieldValue('supplierId');
    if (!supplierId) { message.warning('请选择供应商'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('supplierId', supplierId);
      formData.append('mode', mode);
      formData.append('mapping', JSON.stringify(mapping || {}));
      const res = await axios.post('/api/import/products/async', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAsyncJob({ id: res.data.jobId });
      message.success('后台导入已开始', 3);
    } catch (err: any) {
      message.error(err.response?.data?.message || '后台导入启动失败', 3);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!asyncJob?.id) return;
    const timer = setInterval(async () => {
      try {
        const res = await axios.get(`/api/import/jobs/${asyncJob.id}`);
        setJobProgress(res.data);
        const status = res.data?.progress?.status || res.data?.job?.status;
        if (status === 'SUCCESS' || status === 'FAILED') {
          clearInterval(timer);
          const { job, progress } = res.data;
          if (status === 'SUCCESS') message.success('后台导入完成'); else message.error('后台导入失败');
          if (progress?.errors?.length > 0) setPreviewData({ errors: progress.errors });
        }
      } catch {}
    }, 1500);
    return () => clearInterval(timer);
  }, [asyncJob?.id]);

  const cancelAsyncImport = async () => {
    if (!asyncJob?.id) return;
    try {
      await axios.post(`/api/import/jobs/${asyncJob.id}/cancel`);
      message.success('已请求取消');
    } catch {}
  };

  const loadJobs = async () => {
    try {
      const res = await axios.get('/api/import/jobs');
      const items = (res.data.items || []) as any[];
      // 预取错误报告文本并生成摘要
      const withPreviews = await Promise.all(items.map(async (item) => {
        if (item.reportUrl) {
          try {
            const txt = await axios.get(`/api/import/jobs/${item.id}/report`, { responseType: 'text' }).then(r => r.data as string);
            // 提取 CSV 中的错误信息列（第 4 列），拼接前几条作为摘要
            const lines = String(txt || '').split(/\r?\n/).filter(Boolean);
            const contentLines = lines.slice(1); // 跳过表头
            const msgs = contentLines.map(l => {
              const cols = l.split(',');
              return cols[3] ? cols[3].trim() : l.trim();
            }).filter(Boolean);
            const full = msgs.slice(0, 5).join('；');
            const preview = full.length > 60 ? (full.slice(0, 60) + '…') : full;
            return { ...item, _reportFull: full || '暂无内容', _reportPreview: preview || '暂无内容' };
          } catch {
            return { ...item, _reportFull: '报告读取失败', _reportPreview: '报告读取失败' };
          }
        }
        return { ...item };
      }));
      setJobList(withPreviews);
    } catch {}
  };

  useEffect(() => { loadJobs(); }, []);

  const columns = [
    {
      title: '行号',
      dataIndex: 'row',
      key: 'row',
    },
    {
      title: '错误码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
    },
    {
      title: '字段',
      dataIndex: 'field',
      key: 'field',
      width: 160,
    },
    {
      title: '错误信息',
      dataIndex: 'message',
      key: 'message',
    },
  ];

  return (
    <MainLayout user={user}>
      <div className="p-6">
        <Card className="glass-card">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">产品导入</h1>

          <Form form={form} layout="vertical" className="max-w-md">
            <Form.Item
              name="supplierId"
              label="选择供应商"
              rules={[{ required: true, message: '请选择供应商' }]}
            >
              <Select placeholder="请选择供应商">
                {suppliers.map(s => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name}
                  </Select.Option>
                ))}
              </Select>
              {loadHint && (
                <div className="text-gray-500 text-xs mt-2">{loadHint}</div>
              )}
            </Form.Item>

            <Form.Item label="重复数据处理策略">
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Radio value="skip">跳过已存在</Radio>
                <Radio value="update">更新现有产品</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="上传文件">
              <Upload
                customRequest={handleUpload}
                accept=".xlsx,.xls,.csv"
                maxCount={1}
                beforeUpload={handleBeforeUpload}
              >
                <Button icon={<UploadOutlined />} loading={loading}>
                  上传 Excel 文件
                </Button>
              </Upload>
              <div className="text-gray-500 text-sm mt-2">
                支持 .xlsx, .xls, .csv 格式
              </div>
              <Space className="mt-3">
                <Button onClick={handlePreview} disabled={!selectedFile}>
                  预检解析
                </Button>
                <Button type="default" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                  下载导入模板
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {headers.length > 0 && (
          <Card className="glass-card mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">字段映射确认</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="w-40 text-gray-700">{h}</div>
                  <Select
                    className="flex-1"
                    value={mapping[h] || undefined}
                    onChange={(val) => setMapping((m) => ({ ...m, [h]: val }))}
                    allowClear
                    placeholder="选择系统字段"
                  >
                    <Select.Option value="name">名称</Select.Option>
                    <Select.Option value="spec">规格</Select.Option>
                    <Select.Option value="price">单价</Select.Option>
                    <Select.Option value="leadDays">提前预定天数</Select.Option>
                    <Select.Option value="quantity">数量</Select.Option>
                    <Select.Option value="description">产品介绍</Select.Option>
                    <Select.Option value="note">备注</Select.Option>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                type="primary"
                loading={importing}
                disabled={importing || cooldown > 0}
                onClick={() => {
                if (!selectedFile) { message.warning('请先选择文件'); return; }
                const supplierId = form.getFieldValue('supplierId');
                if (!supplierId) { message.warning('请选择供应商'); return; }
                // 复用 Upload 的 customRequest 流程进行实际导入
                (async () => {
                  if (cooldown > 0) return;
                  setImporting(true);
                  setLoading(true);
                  try {
                    const formData = new FormData();
                    formData.append('file', selectedFile);
                    formData.append('supplierId', supplierId);
                    formData.append('mode', mode);
                    formData.append('mapping', JSON.stringify(mapping || {}));
                    const res = await axios.post('/api/import/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    const { success, failed, skipped, updated } = res.data || {};
                    let msg = `导入完成：成功 ${success} 条，失败 ${failed} 条`;
                    if (typeof skipped === 'number') msg += `，跳过 ${skipped} 条`;
                    if (typeof updated === 'number' && updated > 0) msg += `，更新 ${updated} 条`;
                    message.success(msg, 3);
                    if (res.data.errors && res.data.errors.length > 0) setPreviewData(res.data);
                    // 启动倒计时，避免重复操作
                    const startCooldown = (seconds: number) => {
                      setCooldown(seconds);
                      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
                      const id = window.setInterval(() => {
                        setCooldown((prev) => {
                          if (prev <= 1) {
                            window.clearInterval(id);
                            cooldownTimer.current = null;
                            return 0;
                          }
                          return prev - 1;
                        });
                      }, 1000);
                      cooldownTimer.current = id;
                    };
                    startCooldown(5);
                  } catch (err: any) {
                    message.error(err.response?.data?.message || '导入失败', 3);
                    // 失败也进行短暂冷却，避免重复提交
                    const startCooldown = (seconds: number) => {
                      setCooldown(seconds);
                      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
                      const id = window.setInterval(() => {
                        setCooldown((prev) => {
                          if (prev <= 1) {
                            window.clearInterval(id);
                            cooldownTimer.current = null;
                            return 0;
                          }
                          return prev - 1;
                        });
                      }, 1000);
                      cooldownTimer.current = id;
                    };
                    startCooldown(5);
                  } finally {
                    setImporting(false);
                    setLoading(false);
                  }
                })();
              }}>
                {cooldown > 0 ? `请稍候（${cooldown}s）` : '确认导入'}
              </Button>
            </div>
            {sampleRows.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">样例预览（前 50 行）</h3>
                {mounted && (
                <Table
                  size="small"
                  pagination={{ pageSize: 10 }}
                  columns={headers.map((h) => ({ title: h, dataIndex: h }))}
                  dataSource={sampleRows.map((r, idx) => {
                    const obj: any = { key: idx };
                    headers.forEach((h, i) => { obj[h] = r[i]; });
                    return obj;
                  })}
                />
                )}
              </div>
            )}
          </Card>
        )}

        {asyncJob?.id && (
          <Card className="glass-card mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">后台导入进度</h2>
            <div className="text-gray-700 mb-2">任务ID：{asyncJob.id}</div>
            <div className="text-gray-700 mb-1">状态：{jobProgress?.progress?.status || jobProgress?.job?.status || 'PENDING'}</div>
            <div className="text-gray-700 mb-1">总数：{jobProgress?.progress?.total ?? '-'}</div>
            <div className="text-gray-700 mb-1">已处理：{jobProgress?.progress?.processed ?? '-'}</div>
            <div className="text-gray-700 mb-1">成功/失败/跳过/更新：{jobProgress?.progress ? `${jobProgress.progress.success}/${jobProgress.progress.failed}/${jobProgress.progress.skipped}/${jobProgress.progress.updated}` : '-'}</div>
            <Space className="mt-3">
              <Button onClick={cancelAsyncImport} danger disabled={(jobProgress?.progress?.status === 'SUCCESS')}>取消导入</Button>
              {jobProgress?.job?.reportUrl && (
                <Button href={`/api/import/jobs/${asyncJob.id}/report`} target="_blank">下载错误报告</Button>
              )}
            </Space>
          </Card>
        )}

        {previewData && previewData.errors && previewData.errors.length > 0 && (
          <Card className="glass-card mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">导入错误</h2>
            {mounted && (
            <Table
              columns={columns}
              dataSource={previewData.errors}
              rowKey="row"
              pagination={false}
              size="small"
            />
            )}
            <div className="mt-3">
              <Button type="default" onClick={startAsyncImport}>改为后台导入</Button>
            </div>
          </Card>
        )}

        <Card className="glass-card mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">导入历史</h2>
          {mounted && (
          <Table
            size="small"
            rowKey={(r) => r.id}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: '文件名', dataIndex: 'fileName' },
              { title: '状态', dataIndex: 'status' },
              { title: '总数', dataIndex: 'total', width: 100 },
              { title: '成功', dataIndex: 'successCount', width: 100 },
              { title: '失败', dataIndex: 'failedCount', width: 100 },
              { title: '时间', dataIndex: 'createdAt' },
              {
                title: '错误报告',
                key: 'report',
                render: (val, record: any) => {
                  if (!record.reportUrl) return '—';
                  const preview = record._reportPreview || '—';
                  const full = record._reportFull || preview;
                  return (
                    <Tooltip title={full} placement="topLeft">
                      <span className="text-gray-700">{preview}</span>
                    </Tooltip>
                  );
                },
              },
              {
                title: '操作',
                key: 'actions',
                width: 100,
                render: (val, record: any) => (
                  <Space>
                    {record.reportUrl && (
                      <a href={`/api/import/jobs/${record.id}/report`} target="_blank" rel="noreferrer">下载</a>
                    )}
                    <Popconfirm title="确认删除该历史记录？" onConfirm={async () => {
                      try {
                        await axios.delete(`/api/import/jobs/${record.id}`);
                        message.success('已删除');
                        loadJobs();
                      } catch {
                        message.error('删除失败');
                      }
                    }}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
            dataSource={jobList}
          />
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
