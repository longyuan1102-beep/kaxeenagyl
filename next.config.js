/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${serverUrl}/api/:path*`,
      },
      {
        // 统一同源访问上传文件，前端经由 Next 代理到后端
        source: '/uploads/:path*',
        destination: `${serverUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    domains: ['localhost'],
    // 允许后端域名图片加载（Zeabur 后端域名）
    remotePatterns: (() => {
      try {
        const u = new URL(process.env.SERVER_URL || 'http://localhost:3001');
        return [
          {
            protocol: u.protocol.replace(':', ''),
            hostname: u.hostname,
            port: u.port || '',
            pathname: '/**',
          },
        ];
      } catch (e) {
        return [];
      }
    })(),
  },
};

module.exports = nextConfig;
