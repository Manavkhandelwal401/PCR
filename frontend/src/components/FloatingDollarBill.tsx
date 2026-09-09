/**
 * @file src/components/FloatingDollarBill.tsx
 * @description Translucent floating dollar bill with scroll-driven reveal
 *              and lightweight horizontal/vertical drift.
 *
 * Dependencies:
 *   - React
 *   - framer-motion
 *
 * File Connections:
 *   - Consumed by src/components/FloatingArtifactsLayer.tsx
 *
 * Design Notes:
 *   - Side bills are more visible.
 *   - Center bills are intentionally more transparent.
 *   - No backdrop blur is used because it softens small typography.
 *   - No continuous scale/rotation is used because it can rasterize text
 *     and make the bill contents appear blurry.
 *   - Motion is limited to positional x/y drift.
 */

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface FloatingDollarBillProps {
  id: string;
  denomination?: string;
  caption?: string;
  subcaption?: string;

  top: string;

  left?: string;
  right?: string;

  /**
   * Places the bill horizontally in the center.
   * When true, left/right positioning is ignored.
   */
  center?: boolean;

  /**
   * Static visual rotation of the bill.
   */
  rotateZ?: number;

  /**
   * Static scale of the bill.
   * This is intentionally not animated continuously.
   */
  scale?: number;

  /**
   * Duration of the floating x/y movement.
   */
  floatDuration?: number;

  /**
   * Delay before floating animation begins.
   */
  delay?: number;

  /**
   * Maximum vertical drift in pixels.
   */
  driftRange?: number;

  /**
   * Base opacity.
   *
   * Recommended:
   * - Side bills: 0.75 - 0.90
   * - Near-center bills: 0.50 - 0.65
   * - Center bills: 0.14 - 0.35
   */
  opacity?: number;

  className?: string;
}

export const FloatingDollarBill: React.FC<FloatingDollarBillProps> = ({
  denomination = '$100',
  caption = 'VIBE CODING DEBT',
  subcaption = 'SERIES 2026 // PRODUCTION OUTAGE COST',

  top,

  left,
  right,
  center = false,

  rotateZ = -6,
  scale = 1,

  floatDuration = 7,
  delay = 0,
  driftRange = 12,

  opacity,

  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  /**
   * A bill without left/right coordinates is treated as centered.
   */
  const isCentered = center || (!left && !right);

  /**
   * Center bills intentionally stay much quieter.
   */
  const baseOpacity = opacity ?? (isCentered ? 0.28 : 0.86);

  /**
   * Hover should increase visibility, but center bills must still
   * remain relatively subtle.
   */
  const hoverOpacity = isCentered
    ? Math.min(baseOpacity + 0.07, 0.42)
    : Math.min(baseOpacity + 0.08, 0.94);

  const positionStyles: React.CSSProperties = {
    top,

    ...(isCentered
      ? {
        left: '50%',
      }
      : {}),

    ...(!isCentered && left
      ? {
        left,
      }
      : {}),

    ...(!isCentered && right
      ? {
        right,
      }
      : {}),

    transformOrigin: 'center center',

    /**
     * Helps the browser keep the layer isolated without introducing
     * blur from CSS filters.
     */
    willChange: shouldReduceMotion ? 'auto' : 'transform',
  };

  return (
    <motion.div
      drag={!shouldReduceMotion}
      dragMomentum={false}
      dragElastic={0.08}
      whileDrag={{
        scale: scale * 1.08,
        rotate: rotateZ + 6,
        zIndex: 60,
        cursor: 'grabbing',
        transition: { duration: 0.15 },
      }}
      style={positionStyles}
      initial={
        shouldReduceMotion
          ? {
            opacity: baseOpacity,
            rotate: rotateZ,
            scale,
            x: isCentered ? '-50%' : 0,
            y: 0,
          }
          : {
            opacity: 0,
            rotate: rotateZ,
            scale,
            x: isCentered ? '-50%' : 0,
            y: 22,
          }
      }
      whileInView={
        shouldReduceMotion
          ? {
            opacity: baseOpacity,
          }
          : {
            opacity: baseOpacity,
            x: isCentered ? '-50%' : 0,
            y: 0,
            transition: {
              opacity: {
                duration: 0.5,
                ease: 'easeOut',
              },
              y: {
                duration: 0.65,
                ease: [0.16, 1, 0.3, 1],
              },
            },
          }
      }
      viewport={{
        once: false,
        margin: '-40px',
      }}
      whileHover={{
        opacity: hoverOpacity,
        scale: scale * (isCentered ? 1.02 : 1.05),
        zIndex: 50,
        transition: {
          duration: 0.22,
          ease: 'easeOut',
        },
      }}
      className={`
        absolute
        select-none
        pointer-events-auto
        cursor-grab
        active:cursor-grabbing
        ${isCentered ? '-translate-x-1/2' : ''}
        ${className}
      `}
      aria-hidden="true"
    >
      {/* =========================================================
          FLOATING MOTION WRAPPER

          Only x/y drift is animated.
          There is intentionally NO continuous rotation or scaling,
          so the small text inside the bill stays much sharper.
         ========================================================= */}

      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
              y: [-driftRange, driftRange, -driftRange],
              x: [
                -driftRange * 0.25,
                driftRange * 0.25,
                -driftRange * 0.25,
              ],
            }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
              duration: floatDuration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }
        }
        style={{
          willChange: shouldReduceMotion ? 'auto' : 'transform',
        }}
      >
        {/* =======================================================
            BILL SURFACE - AUTHENTIC US CURRENCY GREEN COLORWAY
           ======================================================= */}

        <div
          className="
            relative
            h-[104px]
            w-52
            rounded-[3px]
            border
            border-[#4E7756]/75
            bg-gradient-to-br
            from-[#1a3322]/95
            via-[#0e2115]/95
            to-[#14281b]/95
            p-2.5
            text-[#E2EDE4]
            shadow-[0_14px_32px_rgba(0,0,0,0.75),0_0_12px_rgba(78,119,86,0.18)]
            transition-all
            duration-300
            sm:h-[112px]
            sm:w-60
            hover:border-[#7AA983]
            hover:bg-[#12281a]
            hover:shadow-[0_18px_38px_rgba(0,0,0,0.85),0_0_20px_rgba(122,169,131,0.25)]
          "
          style={{
            transform: `rotate(${rotateZ}deg) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* =====================================================
              INTERNAL BORDER - INTAGLIO ENGRAVING STYLE
             ===================================================== */}

          <div
            className="
              relative
              flex
              h-full
              w-full
              flex-col
              justify-between
              overflow-hidden
              rounded-[2px]
              border
              border-dashed
              border-[#365A3E]/80
              p-2
            "
          >
            {/* ===================================================
                WATERMARK
               =================================================== */}

            <div
              className="
                pointer-events-none
                absolute
                inset-0
                flex
                items-center
                justify-center
                opacity-[0.10]
              "
            >
              <span
                className="
                  font-serif
                  text-6xl
                  font-bold
                  tracking-tighter
                  text-[#87B891]
                "
              >
                $
              </span>
            </div>

            {/* ===================================================
                TOP EDGE
               =================================================== */}

            <div
              className="
                relative
                z-10
                flex
                items-center
                justify-between
                font-mono
                text-[8px]
                tracking-widest
                text-[#9EC7A5]
              "
            >
              <div className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-xs font-bold text-[#EAF5EC]">
                  {denomination}
                </span>

                <span className="truncate text-[7px] text-[#7A9E82]">
                  FEDERAL RUNTIME NOTE
                </span>
              </div>

              <span className="shrink-0 font-mono text-[7px] text-[#C4DDC7]">
                #PCR-94827-SEC
              </span>
            </div>

            {/* ===================================================
                CENTER CONTENT
               =================================================== */}

            <div className="relative z-10 my-auto py-0.5 text-center">
              <p
                className="
                  line-clamp-1
                  font-serif
                  text-[11px]
                  font-semibold
                  leading-tight
                  tracking-wide
                  text-[#F0F8F2]
                  sm:text-xs
                "
              >
                {caption}
              </p>

              <div
                className="
                  mx-auto
                  my-1
                  h-px
                  w-14
                  bg-gradient-to-r
                  from-transparent
                  via-[#5A8763]
                  to-transparent
                "
              />

              <p
                className="
                  line-clamp-1
                  font-mono
                  text-[7px]
                  uppercase
                  tracking-wider
                  text-[#A3C9AA]
                "
              >
                {subcaption}
              </p>
            </div>

            {/* ===================================================
                BOTTOM EDGE
               =================================================== */}

            <div
              className="
                relative
                z-10
                flex
                items-center
                justify-between
                gap-2
                font-mono
                text-[7px]
                text-[#7A9E82]
              "
            >
              <span className="truncate">
                LEGAL TENDER FOR ALL PR DEBTS
              </span>

              <span className="shrink-0 text-[10px] font-bold text-[#EAF5EC]">
                {denomination}
              </span>
            </div>
          </div>

          {/* =====================================================
              SUBTLE EDGE GLINT
             ===================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              right-0
              top-0
              h-9
              w-9
              bg-gradient-to-bl
              from-[#A8D4AF]/20
              via-transparent
              to-transparent
            "
          />
        </div>
      </motion.div>
    </motion.div>
  );
};