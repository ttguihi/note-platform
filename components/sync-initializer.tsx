// components/sync-initializer.tsx (新建客户端组件)
'use client';
import { useEffect } from 'react';
import { SyncManager } from '@/lib/sync-manager';

export default function SyncInitializer() {
    useEffect(() => {
        SyncManager.init();
        SyncManager.sync(); // 每次加载页面尝试同步一次
    }, []);

    return null;
}