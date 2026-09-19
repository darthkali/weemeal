import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.tsx'],
        include: ['**/*.test.{ts,tsx}'],
        exclude: ['node_modules', '.next', 'src'],
        env: {
            AUTH_SECRET: 'test-secret-not-for-production',
            AUTH_MODE: 'local',
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['node_modules', '.next', '**/*.config.*'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
