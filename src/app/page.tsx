import { SKKNProvider } from '@/context/SKKNContext';
import LeftPanel from '@/components/LeftPanel';
import CenterPanel from '@/components/CenterPanel';
import TOCPanel from '@/components/TOCPanel';

export default function Home() {
  return (
    <SKKNProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>
        {/* Left Panel - Form (wider) */}
        <div style={{ width: '370px', flexShrink: 0, borderRight: '1px solid #2a3547', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LeftPanel />
        </div>
        {/* Center Panel - Document Preview (narrower) */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CenterPanel />
        </div>
        {/* Right Panel - TOC (wider) */}
        <div style={{ width: '310px', flexShrink: 0, borderLeft: '1px solid #2a3547', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TOCPanel />
        </div>
      </div>
    </SKKNProvider>
  );
}
