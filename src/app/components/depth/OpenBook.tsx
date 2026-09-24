import type { CSSProperties, ReactNode } from "react";

// Two pages folded toward a dark gutter over a leather cover, with stacked
// sheets underneath for thickness. Changing `pageKey` remounts the spread so
// the right page flips in (rl-page-flip) while the left page fades in.
export function OpenBook({ pageKey, image, imageCaption, imageTitle, eyebrow, title, children, action, folio }: {
  pageKey: string | number;
  image: string;
  imageCaption: string;
  imageTitle: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  folio: string;
}) {
  return (
    <div className="rl-book">
      <div className="cover" aria-hidden="true" />
      <span className="ribbon" aria-hidden="true" />
      <div className="spread" key={pageKey}>
        <div className="pg left">
          <img src={image} alt="" aria-hidden="true" />
          <span className="rule" aria-hidden="true" />
          <div className="cap">{imageCaption}<b>{imageTitle}</b></div>
          <span className="folio">{folio} · L</span>
        </div>
        <div className="pg right">
          <span className="rule" aria-hidden="true" />
          <div className="wc">
            <span>{eyebrow}</span>
            <h3>{title}</h3>
            {children}
            {action}
          </div>
          <span className="folio">{folio} · R</span>
        </div>
      </div>
      <div className="sheets" aria-hidden="true">
        {[0, 1, 2, 3].map(n => <i key={n} style={{ "--n": n } as CSSProperties} />)}
      </div>
    </div>
  );
}
