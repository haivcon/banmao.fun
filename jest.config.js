const { existsSync } = require('node:fs');
const { join } = require('node:path');

const testsRoot = join(__dirname, '__tests__');
const fallbackRoot = join(__dirname, '.github');

/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: [existsSync(testsRoot) ? testsRoot : fallbackRoot],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^../lib/(.*)$': '<rootDir>/lib/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                module: 'commonjs',
                target: 'ES2020',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
            },
        }],
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
};

module.exports = config;
