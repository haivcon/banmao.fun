import { Database, Sparkles, Layers, Wallet, ShieldCheck, Crown } from "lucide-react";
import type { KingCopy } from "./i18n";
export default function KingSections({ t, section = 'all' }: { t: KingCopy; section?: 'all' | 'features' | 'help' }) {
  const features = [[Database, t.feature1, t.feature1Desc], [Sparkles, t.feature2, t.feature2Desc], [Layers, t.feature3, t.feature3Desc]] as const;
  const steps = [[Wallet, t.step1, t.step1Desc], [ShieldCheck, t.step2, t.step2Desc], [Crown, t.step3, t.step3Desc]] as const;
  return <>
    {section !== 'help' && <section className="king-section" aria-labelledby="king-features-title">
      <h2 id="king-features-title">{t.featuresTitle}</h2>
      <div className="king-feature-grid">{features.map(([Icon, title, description]) => <article className="king-info-card" key={title}><Icon aria-hidden="true" size={24} /><h3>{title}</h3><p>{description}</p></article>)}</div>
    </section>}
    {section !== 'features' && <div className="king-help-grid"><section id="king-guide" className="king-section" aria-labelledby="king-guide-title">
      <div className="king-section-heading"><div><h2 id="king-guide-title">{t.guide}</h2><p>{t.guideDesc}</p></div><a className="king-secondary-link" href="#king-mint">{t.mint} ↗</a></div>
      <ol className="king-step-grid">{steps.map(([Icon, title, description], i) => <li className="king-info-card" key={title}><div className="king-step-top"><span>0{i + 1}</span><Icon aria-hidden="true" size={21} /></div><div className="king-step-copy"><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
    </section>
    <section id="king-faq" className="king-section king-faq" aria-labelledby="king-faq-title"><h2 id="king-faq-title">{t.faqTitle}</h2>{[[t.faq1, t.faq1Answer], [t.faq2, t.faq2Answer], [t.faq3, t.faq3Answer]].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    </div>}
  </>;
}
