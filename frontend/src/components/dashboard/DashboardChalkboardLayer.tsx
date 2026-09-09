/**
 * @file src/components/dashboard/DashboardChalkboardLayer.tsx
 * @description Ambient chalkboard diagrams and code fragments tailored for the Dashboard background.
 * Lighter, softer chalk dust with gentle blurred whitish-emerald typography and engineering motifs.
 */

import React from 'react';

export const DashboardChalkboardLayer: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none overflow-hidden text-[#E4F2E7]"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* =========================================================================
          ZONE: TOP HORIZON (y: 20px - 220px)
          - Left, Left-Center, Center, Center-Right, Right
         ========================================================================= */}

      {/* 1. Far Left - Memory Address & AST Invariant */}
      <div className="absolute top-[35px] left-[3%] opacity-[0.09] blur-[5px] rotate-[-4deg]">
        <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-[#A7F3D0]">
          0x7FFF08A2: [FRAME_POINTER]
        </span>
        <div className="font-mono text-xs opacity-75 mt-0.5">
          *auth_descriptor -&gt; VALID | AST_LEAF_NODE
        </div>
      </div>

      {/* 2. Left-Center - Kafka Pipeline & Ingest Workers SVG */}
      <svg
        className="absolute top-[45px] left-[20%] w-[380px] h-[190px] opacity-[0.07] blur-[5.5px] stroke-current fill-none rotate-[-2deg]"
        viewBox="0 0 420 200"
      >
        <rect x="15" y="25" width="110" height="50" rx="5" strokeWidth="2" strokeDasharray="6 4" />
        <text x="28" y="55" fontSize="12" stroke="none" fill="currentColor" fontWeight="700">
          [INGEST:WORKER]
        </text>
        <path d="M125 50 L175 50" strokeWidth="2" />
        <circle cx="205" cy="50" r="26" strokeWidth="2" strokeDasharray="5 3" />
        <text x="188" y="54" fontSize="10" stroke="none" fill="currentColor" fontWeight="800">
          KAFKA
        </text>
        <path d="M231 50 L275 22" strokeWidth="1.6" />
        <path d="M231 50 L275 48" strokeWidth="1.6" />
        <path d="M231 50 L275 75" strokeWidth="1.6" />
        <rect x="275" y="12" width="90" height="20" rx="3" strokeWidth="1.4" />
        <text x="285" y="26" fontSize="9" stroke="none" fill="currentColor">syntax_ast()</text>
        <rect x="275" y="38" width="90" height="20" rx="3" strokeWidth="1.4" />
        <text x="285" y="52" fontSize="9" stroke="none" fill="currentColor">logic_agent()</text>
        <rect x="275" y="65" width="90" height="20" rx="3" strokeWidth="1.4" />
        <text x="285" y="79" fontSize="9" stroke="none" fill="currentColor">sec_invar()</text>
      </svg>

      {/* 3. Center - Big Chalk Complexity Formula */}
      <div className="absolute top-[28px] left-[45%] -translate-x-1/2 opacity-[0.08] blur-[4.5px] rotate-[1.5deg]">
        <span className="font-serif text-4xl sm:text-6xl font-light italic tracking-tight text-[#E4F2E7]">
          O(N) = Σ(AST_λ) × 4
        </span>
      </div>

      {/* 4. Center-Right - Static Analysis Rule & Cyclomatic Complexity */}
      <div className="absolute top-[50px] left-[66%] opacity-[0.08] blur-[5px] rotate-[-2.5deg]">
        <div className="font-mono text-base sm:text-lg font-bold tracking-tight text-[#6EE7B7]">
          CYCLOMATIC: M = E - N + 2P
        </div>
        <p className="font-mono text-xs opacity-75 mt-1 tracking-widest">
          ASSERT(PARSER_STATE == CLEAN)
        </p>
      </div>

      {/* 5. Far Right - Compiler AST Flags & Pointer math */}
      <div className="absolute top-[30px] right-[3%] opacity-[0.085] blur-[5px] rotate-[3deg] text-right">
        <span className="font-serif text-3xl sm:text-4xl italic font-semibold text-[#D1FAE5]">
          λ(invariants) → 100%
        </span>
        <div className="font-mono text-xs opacity-70 mt-1">
          P99_LATENCY: ~840ms | OPT_O3
        </div>
      </div>

      {/* =========================================================================
          ZONE: MID-UPPER LEVEL (y: 220px - 440px)
         ========================================================================= */}

      {/* 6. Far Left - Mutex & Thread Concurrency Lock Code */}
      <div className="absolute top-[240px] left-[2%] max-w-sm opacity-[0.08] blur-[5px] rotate-[3deg]">
        <pre className="text-xs sm:text-sm font-mono leading-relaxed text-[#D6EADB]">
{`synchronized(mutex_a) {
  acquire_lock(&session_tbl);
  atomic_cas(&flag, 0, 1);
}
// Zero-trust verification`}
        </pre>
      </div>

      {/* 7. Left-Center - Cache Miss & Memory Latency */}
      <div className="absolute top-[280px] left-[24%] opacity-[0.075] blur-[5.5px] rotate-[-3deg]">
        <span className="font-mono text-lg sm:text-xl font-bold tracking-wider text-[#A7F3D0]">
          *CACHE_MISS (P99 penalty)
        </span>
        <div className="font-serif text-sm italic opacity-80 mt-1">
          L1/L2 Unified → Direct L3 Hit
        </div>
      </div>

      {/* 8. Center - Multi-Agent Neural Consensus Topology SVG */}
      <svg
        className="absolute top-[250px] left-[50%] -translate-x-1/2 w-[360px] h-[180px] opacity-[0.07] blur-[5.5px] stroke-current fill-none rotate-[1deg]"
        viewBox="0 0 380 160"
      >
        <circle cx="50" cy="40" r="18" strokeWidth="1.8" />
        <circle cx="50" cy="110" r="18" strokeWidth="1.8" />
        <circle cx="180" cy="75" r="20" strokeWidth="2" />
        <circle cx="310" cy="75" r="22" strokeWidth="2.2" />
        <line x1="68" y1="40" x2="160" y2="75" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="68" y1="110" x2="160" y2="75" strokeWidth="1.5" />
        <line x1="200" y1="75" x2="288" y2="75" strokeWidth="2" />
        <text x="250" y="125" fontSize="11" stroke="none" fill="currentColor" fontWeight="700">
          CONSENSUS 4/4
        </text>
      </svg>

      {/* 9. Center-Right - Information Entropy Formula */}
      <div className="absolute top-[260px] left-[70%] opacity-[0.08] blur-[5px] rotate-[3.5deg]">
        <div className="font-serif text-3xl sm:text-5xl italic text-[#D1FAE5]">
          H(X) = - Σ P(x) log₂ P(x)
        </div>
        <div className="font-mono text-xs opacity-75 mt-1 tracking-wider">
          ENTROPY_INDEX: LOW_VOLATILITY
        </div>
      </div>

      {/* 10. Far Right - Finite State Machine / Node Audit Cycle */}
      <svg
        className="absolute top-[240px] right-[2%] w-[330px] h-[160px] opacity-[0.07] blur-[5px] stroke-current fill-none rotate-[-2deg]"
        viewBox="0 0 350 140"
      >
        <circle cx="45" cy="70" r="28" strokeWidth="1.8" />
        <text x="30" y="74" fontSize="9" stroke="none" fill="currentColor" fontWeight="700">INIT</text>
        <path d="M73 70 L145 70" strokeWidth="1.8" strokeDasharray="4 3" />
        <circle cx="175" cy="70" r="28" strokeWidth="1.8" />
        <text x="153" y="74" fontSize="9" stroke="none" fill="currentColor" fontWeight="700">AUDITED</text>
        <path d="M203 70 L275 70" strokeWidth="1.8" strokeDasharray="4 3" />
        <circle cx="305" cy="70" r="30" strokeWidth="2.2" />
        <circle cx="305" cy="70" r="25" strokeWidth="1.2" />
        <text x="282" y="74" fontSize="9" stroke="none" fill="currentColor" fontWeight="700">PASS</text>
      </svg>

      {/* =========================================================================
          ZONE: SCREEN CENTER & MID-LOWER (y: 440px - 680px)
         ========================================================================= */}

      {/* 11. Far Left - Cryptographic HMAC Hash & Buffer Verification */}
      <div className="absolute top-[470px] left-[3%] max-w-sm opacity-[0.08] blur-[5px] rotate-[-3deg]">
        <pre className="text-xs sm:text-sm font-mono leading-relaxed text-[#D6EADB]">
{`bool verify_jwt(Buffer* b) {
  HMAC_Init(&ctx, KEY, 32);
  return crypto_memcmp(a, b, 32) == 0;
}`}
        </pre>
        <span className="font-mono text-[11px] text-[#A7F3D0] tracking-widest">
          // ZERO-TRUST INVARIANT PASS
        </span>
      </div>

      {/* 12. Left-Center - Memory Malloc Hex Dump */}
      <div className="absolute top-[510px] left-[22%] opacity-[0.075] blur-[5.5px] rotate-[2.5deg]">
        <pre className="text-xs sm:text-sm font-mono leading-relaxed text-[#6EE7B7]">
{`0x7FFF089A: malloc(sizeof(PR_DIFF))
0x7FFF0880: *auth_descriptor -> NULL
-----------------------------------
YoungGen GC overflow detected`}
        </pre>
      </div>

      {/* 13. Dead Center - Giant Abstract Math & Branch Function */}
      <div className="absolute top-[470px] left-[50%] -translate-x-1/2 opacity-[0.075] blur-[5.5px] rotate-[-1deg] text-center">
        <span className="font-serif text-5xl sm:text-7xl italic font-light text-[#E4F2E7]">
          λ(x, y) → x² + y² - ε
        </span>
        <div className="font-mono text-sm tracking-widest text-[#A7F3D0] mt-1 font-semibold">
          DIFF_KERNEL::STATIC_EVALUATION
        </div>
      </div>

      {/* 14. Center-Right - Hardware Cache Hierarchy Box */}
      <svg
        className="absolute top-[480px] left-[68%] w-[330px] h-[170px] opacity-[0.07] blur-[5px] stroke-current fill-none rotate-[2deg]"
        viewBox="0 0 340 160"
      >
        <rect x="20" y="15" width="130" height="32" rx="3" strokeWidth="1.6" strokeDasharray="4 2" />
        <text x="38" y="36" fontSize="10" stroke="none" fill="currentColor" fontWeight="600">L1 INSTRUCTION</text>
        <rect x="20" y="55" width="130" height="32" rx="3" strokeWidth="1.6" />
        <text x="48" y="76" fontSize="10" stroke="none" fill="currentColor" fontWeight="600">L2 UNIFIED</text>
        <rect x="20" y="95" width="130" height="36" rx="3" strokeWidth="2" />
        <text x="40" y="118" fontSize="10" stroke="none" fill="currentColor" fontWeight="700">L3 SHARED CACHE</text>
        <path d="M150 71 L240 100" strokeWidth="1.6" />
        <text x="210" y="125" fontSize="10" stroke="none" fill="currentColor">HIT: 1.2ns</text>
      </svg>

      {/* 15. Far Right - Pull Request DAG Commit Branch */}
      <svg
        className="absolute top-[490px] right-[3%] w-[340px] h-[160px] opacity-[0.08] blur-[5px] stroke-current fill-none rotate-[-2.5deg]"
        viewBox="0 0 340 140"
      >
        <line x1="20" y1="50" x2="310" y2="50" strokeWidth="2.2" />
        <path d="M70 50 C 100 50, 100 100, 140 100 L 220 100 C 250 100, 250 50, 280 50" strokeWidth="1.8" strokeDasharray="5 3" />
        <circle cx="40" cy="50" r="4.5" fill="currentColor" />
        <circle cx="70" cy="50" r="4.5" fill="currentColor" />
        <circle cx="140" cy="100" r="4.5" fill="currentColor" />
        <circle cx="190" cy="100" r="4.5" fill="currentColor" />
        <circle cx="280" cy="50" r="6" fill="currentColor" />
        <text x="110" y="125" fontSize="10" stroke="none" fill="currentColor" fontWeight="700">
          PR_MERGED #142 (VERIFIED)
        </text>
      </svg>

      {/* =========================================================================
          ZONE: LOWER BASE REGION (y: 700px - 950px)
         ========================================================================= */}

      {/* 16. Far Left - AST Tree Token Parsing Formula */}
      <div className="absolute top-[730px] left-[3%] opacity-[0.08] blur-[5px] rotate-[2deg]">
        <span className="font-serif text-3xl sm:text-5xl italic font-light text-[#D1FAE5]">
          AST(Tree) = ∮(Token_i) d(Scope)
        </span>
        <div className="font-mono text-xs opacity-75 mt-1">
          LEXER_DISPATCH: 100% COVERAGE
        </div>
      </div>

      {/* 17. Left-Center - Thread Safe CAS atomic instruction */}
      <div className="absolute top-[750px] left-[23%] opacity-[0.075] blur-[5.5px] rotate-[-2deg]">
        <pre className="text-xs sm:text-sm font-mono leading-relaxed text-[#A7F3D0]">
{`Assert(lock_hierarchy(A, B) == STRICT);
p_resolve(token_hash);
atomic_cas(&flag, 0, 1);`}
        </pre>
      </div>

      {/* 18. Center - Big Chalk Code Review Quality Vector */}
      <div className="absolute top-[720px] left-[50%] -translate-x-1/2 opacity-[0.08] blur-[5px] rotate-[1.5deg] text-center">
        <span className="font-mono text-2xl sm:text-4xl font-bold tracking-widest text-[#E4F2E7]">
          [INSPECTION_AUDIT: CLEAN]
        </span>
        <p className="font-mono text-xs tracking-widest text-[#6EE7B7] mt-1">
          SECURITY_SCORE: 10/10 &bull; ZERO_CIRCULAR_WAIT &bull; NO_ESCAPE_ANALYSIS_FAIL
        </p>
      </div>

      {/* 19. Center-Right - Groq Parallel 4-Agent Pipeline Latency */}
      <div className="absolute top-[740px] left-[71%] opacity-[0.08] blur-[5px] rotate-[-3deg]">
        <div className="font-mono text-base sm:text-xl font-bold text-[#A7F3D0]">
          GROQ_4_AGENTS::PARALLEL_DISPATCH
        </div>
        <div className="font-serif text-sm italic opacity-80 mt-1">
          mean_latency: 840ms | AST tokens: 4,096/req
        </div>
      </div>

      {/* 20. Far Right - Coordinate Wave / Vector Time Axis */}
      <svg
        className="absolute top-[720px] right-[3%] w-[330px] h-[150px] opacity-[0.075] blur-[5px] stroke-current fill-none rotate-[2deg]"
        viewBox="0 0 340 140"
      >
        <path d="M20 120 L310 120" strokeWidth="2" />
        <path d="M20 30 L20 120" strokeWidth="2" />
        <path d="M20 110 Q 100 20, 180 80 T 310 40" strokeWidth="1.8" strokeDasharray="4 3" />
        <text x="270" y="112" fontSize="10" stroke="none" fill="currentColor">t (latency ms)</text>
      </svg>
    </div>
  );
};

export default DashboardChalkboardLayer;
