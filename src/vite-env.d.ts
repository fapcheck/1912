/// <reference types="vite/client" />

// 👇 Добавляем декларации модулей, чтобы TypeScript не ругался при сборке
declare module 'react-syntax-highlighter';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/json';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/css';
declare module 'react-syntax-highlighter/dist/esm/languages/prism/bash';
declare module 'react-syntax-highlighter/dist/esm/styles/prism';