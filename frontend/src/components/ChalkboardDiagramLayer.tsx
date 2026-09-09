/**
 * @file src/components/ChalkboardDiagramLayer.tsx
 * @description Giant, scattered, heavily-blurred chalk diagrams, equations, and code fragments across the entire landing page.
 *
 * Dependencies:
 *   - React
 *
 * Purpose:
 *   Recreates the exact atmospheric chalkboard background seen in the reference screenshot:
 *   - Oversized / Large elements (3xl, 5xl text, wide SVG diagrams)
 *   - Heavily blurred (blur-[3px] to blur-[5px]) for that authentic soft chalk dust aesthetic
 *   - Calibrated transparency (opacity 0.16 - 0.24) so it lives completely in the background
 *   - Randomly scattered across the full canvas height and width without strict left/right columns
 *   - Real development & engineering motifs: big-O formulas, CPU cache lines, concurrency locks, AST trees, memory pointers
 */

import React from 'react';

export const ChalkboardDiagramLayer: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none overflow-hidden text-[#D6EADB]"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* ----------------------------------------------------------------
          1. TOP HERO REGION: Giant Complexity Math & Memory Address
         ---------------------------------------------------------------- */}

      {/* Giant Chalk Formula - Top Center/Left */}
      <div className="absolute top-[60px] left-[8%] opacity-[0.11] blur-[6px] rotate-[-4deg]">
        <span className="font-serif text-5xl sm:text-7xl font-light italic tracking-tight">
          O(N) = Σ(AST_λ) × 4
        </span>
      </div>

      {/* Chalk Distributed Pipeline SVG Diagram - Top Right/Center */}
      <svg
        className="absolute top-[120px] right-[5%] w-[580px] h-[320px] opacity-[0.09] blur-[7px] stroke-current fill-none rotate-[3deg]"
        viewBox="0 0 500 280"
      >
        <rect x="20" y="40" width="140" height="80" rx="6" strokeWidth="2.5" strokeDasharray="8 5" />
        <text x="35" y="85" fontSize="14" stroke="none" fill="currentColor" fontWeight="700">
          [INGEST:WORKER]
        </text>

        {/* Vector stream */}
        <path d="M160 80 L230 80" strokeWidth="2.5" />
        <path d="M220 73 L235 80 L220 87" strokeWidth="2.5" />

        <circle cx="270" cy="80" r="35" strokeWidth="2.5" strokeDasharray="6 4" />
        <text x="245" y="86" fontSize="13" stroke="none" fill="currentColor" fontWeight="800">
          KAFKA
        </text>

        {/* Multi-agent forks */}
        <path d="M305 80 L360 35" strokeWidth="2" />
        <path d="M305 80 L360 65" strokeWidth="2" />
        <path d="M305 80 L360 95" strokeWidth="2" />
        <path d="M305 80 L360 125" strokeWidth="2" />

        <rect x="360" y="22" width="115" height="28" rx="4" strokeWidth="1.8" />
        <text x="375" y="40" fontSize="11" stroke="none" fill="currentColor">
          logic_agent()
        </text>

        <rect x="360" y="52" width="115" height="28" rx="4" strokeWidth="1.8" />
        <text x="375" y="70" fontSize="11" stroke="none" fill="currentColor">
          syntax_ast()
        </text>

        <rect x="360" y="82" width="115" height="28" rx="4" strokeWidth="1.8" />
        <text x="375" y="100" fontSize="11" stroke="none" fill="currentColor">
          perf_p99()
        </text>

        <rect x="360" y="112" width="115" height="28" rx="4" strokeWidth="1.8" />
        <text x="375" y="130" fontSize="11" stroke="none" fill="currentColor">
          sec_invar()
        </text>

        {/* Big Chalk Axis Graph */}
        <path d="M30 240 L450 240" strokeWidth="2.5" />
        <path d="M30 160 L30 240" strokeWidth="2.5" />
        <path d="M30 230 Q 150 140, 260 210 T 450 170" strokeWidth="2.2" strokeDasharray="5 5" />
        <text x="400" y="230" fontSize="12" stroke="none" fill="currentColor">
          t (ms)
        </text>
      </svg>

      {/* ----------------------------------------------------------------
          2. MID-HERO & BEHIND HEADLINE: Oversized Abstract Chalk Geometry & Code
         ---------------------------------------------------------------- */}

      {/* Giant Memory Address & Hex Dump - Left Center */}
      <div className="absolute top-[380px] left-[3%] opacity-[0.09] blur-[7px] rotate-[-7deg]">
        <pre className="text-xl sm:text-2xl font-mono leading-relaxed">
{`0x7FFF08A2: [FRAME_POINTER]
0x7FFF089A: malloc(sizeof(PR_DIFF))
0x7FFF0880: *auth_descriptor -> NULL
-----------------------------------
P99_LATENCY: ~14.2ms | RSS: 1.4GB
YoungGen GC overflow detected`}
        </pre>
      </div>

      {/* Giant State Machine / AST Cycle - Center/Right behind Diff */}
      <svg
        className="absolute top-[520px] left-[38%] w-[560px] h-[300px] opacity-[0.08] blur-[8px] stroke-current fill-none rotate-[5deg]"
        viewBox="0 0 500 240"
      >
        <circle cx="80" cy="100" r="42" strokeWidth="2.5" />
        <text x="50" y="106" fontSize="13" stroke="none" fill="currentColor" fontWeight="700">
          INIT_NODE
        </text>

        <path d="M122 100 L210 100" strokeWidth="2.2" strokeDasharray="6 4" />
        
        <circle cx="250" cy="100" r="42" strokeWidth="2.5" />
        <text x="225" y="106" fontSize="13" stroke="none" fill="currentColor" fontWeight="700">
          PARSED
        </text>

        <path d="M292 100 L380 100" strokeWidth="2.2" strokeDasharray="6 4" />

        <circle cx="420" cy="100" r="44" strokeWidth="2.8" />
        <circle cx="420" cy="100" r="38" strokeWidth="1.5" />
        <text x="390" y="106" fontSize="12" stroke="none" fill="currentColor" fontWeight="700">
          VALIDATED
        </text>

        {/* Failed Rollback Loop Arc */}
        <path d="M250 142 Q 250 215, 80 142" strokeWidth="2" strokeDasharray="4 4" />
        <text x="140" y="195" fontSize="12" stroke="none" fill="currentColor">
          on_syntax_err -&gt; rollback()
        </text>
      </svg>

      {/* ----------------------------------------------------------------
          3. DIFF REGION & MID-PAGE: Giant Thread Concurrency Code & CPU Topology
         ---------------------------------------------------------------- */}

      {/* Giant Mutex Deadlock Thread Code - Center / Bottom of Hero */}
      <div className="absolute top-[880px] left-[15%] max-w-xl opacity-[0.10] blur-[6.5px] rotate-[-2deg]">
        <pre className="text-lg sm:text-2xl font-mono leading-relaxed">
{`synchronized(mutex_a) {
  acquire_lock(&session_tbl);
  // Circular wait hazard detected
  synchronized(mutex_b) {
    p_resolve(token_hash);
    atomic_cas(&flag, 0, 1);
  }
}
Assert(lock_hierarchy(A, B) == STRICT);`}
        </pre>
      </div>

      {/* Chalk Hardware Cache Hierarchy - Right Flank */}
      <svg
        className="absolute top-[1020px] right-[4%] w-[480px] h-[280px] opacity-[0.09] blur-[7px] stroke-current fill-none rotate-[6deg]"
        viewBox="0 0 420 240"
      >
        <rect x="40" y="20" width="160" height="44" rx="4" strokeWidth="2" strokeDasharray="5 3" />
        <text x="60" y="47" fontSize="13" stroke="none" fill="currentColor" fontWeight="600">
          L1 INSTRUCTION
        </text>

        <rect x="40" y="75" width="160" height="44" rx="4" strokeWidth="2" />
        <text x="75" y="102" fontSize="13" stroke="none" fill="currentColor" fontWeight="600">
          L2 UNIFIED
        </text>

        <rect x="40" y="130" width="160" height="48" rx="4" strokeWidth="2.2" />
        <text x="70" y="159" fontSize="14" stroke="none" fill="currentColor" fontWeight="700">
          L3 SHARED CACHE
        </text>

        {/* Cache Miss Arrow */}
        <path d="M200 95 L310 140" strokeWidth="2" />
        <text x="315" y="145" fontSize="12" stroke="none" fill="currentColor">
          *CACHE_MISS (P99 penalty)
        </text>
      </svg>

      {/* ----------------------------------------------------------------
          4. AGENTS CHAPTER: Giant Mathematical Models, Entropy & Consensus Graph
         ---------------------------------------------------------------- */}

      {/* Giant Entropy Formula - Right Center */}
      <div className="absolute top-[1380px] right-[8%] opacity-[0.10] blur-[6px] rotate-[-5deg]">
        <div className="font-serif text-4xl sm:text-6xl italic">
          H(X) = - Σ P(x) log₂ P(x)
        </div>
        <p className="font-mono text-sm tracking-widest mt-2">
          CYCLOMATIC COMPLEXITY: M = E - N + 2P
        </p>
      </div>

      {/* Multi-Agent Neural Consensus Topology - Left Flank of Agents */}
      <svg
        className="absolute top-[1480px] left-[3%] w-[520px] h-[340px] opacity-[0.09] blur-[7px] stroke-current fill-none rotate-[4deg]"
        viewBox="0 0 460 300"
      >
        <circle cx="60" cy="70" r="22" strokeWidth="2" />
        <circle cx="60" cy="150" r="22" strokeWidth="2" />
        <circle cx="60" cy="230" r="22" strokeWidth="2" />

        <circle cx="230" cy="110" r="25" strokeWidth="2.2" />
        <circle cx="230" cy="190" r="25" strokeWidth="2.2" />

        <circle cx="400" cy="150" r="28" strokeWidth="2.8" />

        {/* Mesh Network Connections */}
        <line x1="82" y1="70" x2="205" y2="110" strokeWidth="1.6" strokeDasharray="5 4" />
        <line x1="82" y1="70" x2="205" y2="190" strokeWidth="1.6" />
        <line x1="82" y1="150" x2="205" y2="110" strokeWidth="1.6" />
        <line x1="82" y1="150" x2="205" y2="190" strokeWidth="1.6" strokeDasharray="5 4" />
        <line x1="82" y1="230" x2="205" y2="110" strokeWidth="1.6" />
        <line x1="82" y1="230" x2="205" y2="190" strokeWidth="1.6" strokeDasharray="5 4" />

        <line x1="255" y1="110" x2="372" y2="150" strokeWidth="2" />
        <line x1="255" y1="190" x2="372" y2="150" strokeWidth="2" />

        <text x="320" y="220" fontSize="13" stroke="none" fill="currentColor" fontWeight="700">
          CONSENSUS 4/4 SIGNED
        </text>
      </svg>

      {/* ----------------------------------------------------------------
          5. FOOTER & CONVERSION REGION: Giant Git DAG Tree & Security Kernel Code
         ---------------------------------------------------------------- */}

      {/* Giant Security Kernel Check Code - Left Center */}
      <div className="absolute top-[1980px] left-[10%] max-w-xl opacity-[0.09] blur-[7px] rotate-[-4deg]">
        <pre className="text-xl sm:text-2xl font-mono leading-relaxed">
{`bool verify_jwt_payload(Buffer* b) {
  if (b->size < HEADER_LEN) return ERR_CORRUPT;
  HMAC_SHA256_CTX ctx;
  HMAC_Init(&ctx, SECRET_KEY, 32);
  return crypto_memcmp(computed, b->sig, 32) == 0;
}
// Zero-trust verification verified`}
        </pre>
      </div>

      {/* Giant Git DAG Commit Topology - Right Center */}
      <svg
        className="absolute top-[2180px] right-[6%] w-[540px] h-[300px] opacity-[0.10] blur-[7px] stroke-current fill-none rotate-[3deg]"
        viewBox="0 0 460 250"
      >
        {/* Main Git Trunk */}
        <line x1="40" y1="70" x2="420" y2="70" strokeWidth="3" />

        {/* Feature Branch Curve */}
        <path d="M100 70 C 140 70, 140 160, 200 160 L 320 160 C 370 160, 370 70, 400 70" strokeWidth="2.5" strokeDasharray="6 4" />

        {/* Commits */}
        <circle cx="60" cy="70" r="7" fill="currentColor" />
        <circle cx="100" cy="70" r="7" fill="currentColor" />
        <circle cx="200" cy="160" r="6" fill="currentColor" />
        <circle cx="260" cy="160" r="6" fill="currentColor" />
        <circle cx="320" cy="160" r="6" fill="currentColor" />
        <circle cx="400" cy="70" r="9" fill="currentColor" />

        <text x="180" y="200" fontSize="13" stroke="none" fill="currentColor" fontWeight="700">
          PULL_REQUEST #142 (MERGED CLEAN)
        </text>
      </svg>

      {/* Faint Chalk Dust Streaks Random Across Canvas */}
      <div className="absolute top-[2650px] left-[25%] opacity-[0.08] blur-[8px] rotate-[-2deg]">
        <span className="font-serif text-5xl italic">
          λ(x, y) → x² + y² - ε
        </span>
      </div>

    </div>
  );
};
