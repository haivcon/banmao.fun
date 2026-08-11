import "server-only";import{createNonceStore}from"./nonce";export const aiNonceStore=createNonceStore({ttlMs:5*60_000});
