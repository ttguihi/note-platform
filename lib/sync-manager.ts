// lib/sync-manager.ts
import { initDB, SyncOperation } from './indexeddb';
import { createNote, updateNote, deleteNote } from '@/app/actions';

export const SyncManager = {
    // 添加操作到队列
    async enqueue(op: Omit<SyncOperation, 'id' | 'timestamp'>) {
        const db = await initDB();
        await db.add('syncQueue', {
            ...op,
            timestamp: Date.now(),
        });

        // 如果在线，立即尝试触发同步
        if (navigator.onLine) {
            this.sync();
        }
    },

    // 核心同步逻辑
    async sync() {
        if (!navigator.onLine) return;

        const db = await initDB();
        const allOps = await db.getAll('syncQueue');

        if (allOps.length === 0) return;

        console.log(`[SyncManager] 开始处理 ${allOps.length} 个任务...`);

        for (const op of allOps) {
            try {
                const formData = new FormData();
                // 将普通 JSON 对象转回 FormData
                if (op.data) {
                    Object.keys(op.data).forEach(key => {
                        // 特殊处理 tags 数组转字符串
                        if (key === 'tags' && Array.isArray(op.data[key])) {
                            formData.append(key, op.data[key].join(','));
                        } else {
                            formData.append(key, op.data[key]);
                        }
                    });
                }
                // 确保 ID 存在 (用于 update/delete)
                if (op.noteId) formData.append('id', op.noteId);

                if (op.type === 'CREATE') {
                    await createNote(formData);
                } else if (op.type === 'UPDATE') {
                    await updateNote(formData);
                } else if (op.type === 'DELETE') {
                    await deleteNote(op.noteId);
                }

                // 同步成功后，从队列移除
                await db.delete('syncQueue', op.id!);
                console.log(`[SyncManager] 任务完成: ${op.type} ${op.noteId}`);
            } catch (error) {
                console.error(`[SyncManager] 任务失败 (ID: ${op.noteId}):`, error);
                // 遇到错误跳出循环，等待下次重试，防止阻塞
                break;
            }
        }
    },

    // 初始化监听
    init() {
        if (typeof window === 'undefined') return;
        window.addEventListener('online', () => {
            console.log("🌐 网络已恢复，正在同步数据...");
            this.sync();
        });
    }
};