'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function Home() {
  const router = useRouter();
  const navigatedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
        });
        const target = response.ok ? '/dashboard' : '/login';
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          router.replace(target);
        }
      } catch (error) {
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          router.replace('/login');
        }
      }
    };

    checkAuth();
    return () => {
      controller.abort();
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <Spin size="large" />
    </div>
  );
}
