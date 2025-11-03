import 'antd/dist/reset.css';
import './globals.css';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export const metadata = {
  title: '开席啦供应链管理系统',
  description: '公司内部供应商管理与报价单生成工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#ff8a00',
              colorPrimaryHover: '#ff9e2a',
              colorPrimaryActive: '#e67800',
              controlHeight: 44,
              borderRadiusLG: 12,
              boxShadowSecondary: '0 6px 20px rgba(0,0,0,0.08)'
            },
            components: {
              Layout: {
                triggerBg: 'rgba(255,255,255,0.30)',
                triggerColor: '#ff8a00',
                siderBg: 'transparent',
              },
              Menu: {
                itemSelectedColor: '#ff8a00',
                itemSelectedBg: 'rgba(255,138,0,0.10)',
                itemHoverBg: 'rgba(255,138,0,0.06)',
                itemActiveBg: 'rgba(255,138,0,0.12)',
                itemHeight: 44,
              },
              Button: {
                primaryShadow: 'none',
              },
              Card: {
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
              },
              Table: {
                headerBg: 'rgba(255,138,0,0.06)',
                headerColor: '#5a5a5a',
                rowHoverBg: 'rgba(255,138,0,0.06)'
              },
              Modal: {
                headerBg: 'transparent',
                contentBg: 'rgba(255,255,255,0.85)'
              }
            },
          }}
        >
          <App>
            {children}
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
