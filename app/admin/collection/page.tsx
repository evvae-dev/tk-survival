'use client';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ChapterFlow from '@/components/event-admin/ChapterFlow';
export default function Page(){return <ReactFlowProvider><ChapterFlow/></ReactFlowProvider>;}
