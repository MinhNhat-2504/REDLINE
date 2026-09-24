import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export function PageTransition({ pageKey, direction = 1, home = false, children }: { pageKey: string; direction?: number; home?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <div className="page-transition-frame">
      {!reduced && (
        <motion.span
          key={`${pageKey}-streak`}
          className="page-transition-streak"
          aria-hidden="true"
          initial={{ opacity: 0, scaleX: 0, originX: direction >= 0 ? 0 : 1 }}
          animate={{ opacity: [0, .85, 0], scaleX: [0, 1, 1] }}
          transition={{ duration: .48, times: [0, .45, 1], ease: "easeOut" }}
        />
      )}
      <motion.div
        key={pageKey}
        className="page-transition-content"
        // Replace immediately so rapid navigation never queues stale pages.
        // Home has viewport-fixed chapter navigation, so don't transform it.
        initial={reduced ? false : { opacity: 0.3, x: home ? 0 : Math.sign(direction) * 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
