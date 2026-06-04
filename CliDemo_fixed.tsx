import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const DEMO_STEPS = [
  '$ echoctl scan --target api.example.com --deep',
  '⟳ Initializing ECHOMEN threat scanner...',
  '📡 Connecting to threat intelligence database...',
  '✓ Connected to threat database (v2.8.1)',
  '',
  '⟳ Phase 1: Endpoint Discovery',
  '  ✓ Found 12 endpoints',
  '  ✓ Analyzing endpoint signatures',
  '',
  '⟳ Phase 2: Vulnerability Scanning',
  '  → GET /api/auth (200 OK)',
  '  → POST /api/users (201 Created)',
  '  → GET /api/admin (403 Forbidden)',
  '  → GET /api/search?q=test (200 OK) ⚠️',
  '',
  '⟳ Phase 3: Dependency Analysis',
  '  ✓ Scanned 127 dependencies',
  '  ⚠️  Found 3 vulnerabilities:',
  '    - lodash@4.17.15 (CVE-2021-23337)',
  '    - express@4.17.1 (Prototype pollution)',
  '    - axios@0.21.1 (SSRF in redirect handling)',
  '',
  '⟳ Phase 4: Security Headers Analysis',
  '  ✗ Missing: Content-Security-Policy',
  '  ✗ Missing: X-Frame-Options',
  '  ✗ Missing: Strict-Transport-Security',
  '  ✓ Present: X-Content-Type-Options',
  '',
  '⟳ Phase 5: Authentication & Authorization',
  '  ⚠️  JWT tokens lack expiration validation',
  '  ⚠️  CORS allows all origins (*)',
  '  ✓ Password hashing: bcrypt (good)',
  '',
  '═══════════════════════════════════════',
  '📊 SCAN RESULTS',
  '═══════════════════════════════════════',
  'Threat Level: HIGH 🔴',
  'Critical Issues: 3',
  'High Priority: 5',
  'Medium Priority: 2',
  'Scan Duration: 3.2s',
  '',
  '💡 TOP RECOMMENDATIONS:',
  '  1. Update lodash to 4.17.21+',
  '  2. Add security headers middleware',
  '  3. Implement CORS whitelist',
  '  4. Add JWT expiration validation',
  '  5. Enable rate limiting on /api/search',
  '',
  '✓ Report saved: .echomen/scan-report-20260423.json',
  '✓ Scan completed successfully',
];

export function CliDemo() {
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [isRunningDemo, setIsRunningDemo] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const runCliDemo = async () => {
    setIsRunningDemo(true);
    setVisibleStepCount(0);

    for (let i = 0; i < DEMO_STEPS.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isMounted.current) return;
      setVisibleStepCount(i + 1);
    }

    if (!isMounted.current) return;
    setIsRunningDemo(false);
  };

  const cliOutput = DEMO_STEPS.slice(0, visibleStepCount);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
        Interactive Threat Scanner Demo
      </h2>
      <p className="text-muted-foreground mb-8 text-lg">
        See ECHOMEN's CLI in action. Click below to run a live threat scanning simulation.
      </p>

      {/* CLI Terminal */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-mono text-muted-foreground">Terminal</span>
        </div>

        <div className="bg-card p-6 font-mono text-sm h-96 overflow-y-auto">
          {cliOutput.length === 0 && !isRunningDemo && (
            <div className="text-muted-foreground text-center py-20">
              <p>Click "Run Demo" to start the threat scanning simulation</p>
            </div>
          )}

          {cliOutput.map((line, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`py-1 ${
                line.includes('✓') ? 'text-green-500' :
                line.includes('⚠️') ? 'text-yellow-500' :
                line.includes('❌') || line.includes('✗') ? 'text-red-500' :
                line.includes('$') ? 'text-primary font-bold' :
                'text-foreground'
              }`}
            >
              {line}
            </motion.div>
          ))}

          {isRunningDemo && (
            <div className="text-primary animate-pulse">
              ▌
            </div>
          )}
        </div>
      </div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-6"
      >
        <Button
          size="lg"
          onClick={runCliDemo}
          disabled={isRunningDemo}
          className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-semibold"
        >
          {isRunningDemo ? 'Running Demo...' : 'Run Threat Scan Demo'}
        </Button>
      </motion.div>
    </div>
  );
}
