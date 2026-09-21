'use client';
import { useEffect, useState, type RefObject } from 'react';

const sectionIds = ['king-studio', 'king-mint', 'king-guide', 'king-contracts'];

export function useKingNavigation(header: RefObject<HTMLElement | null>) {
  const [activeSection, setActiveSection] = useState('');
  useEffect(() => {
    const page = header.current?.closest<HTMLElement>('.king-page');
    if (!page) return;
    let frame = 0;
    let headerHeight = header.current?.offsetHeight ?? 100;
    const update = () => {
      frame = 0;
      const sections = sectionIds.map(id => document.getElementById(id)).filter((node): node is HTMLElement => node !== null);
      const offset = header.current && getComputedStyle(header.current).position === 'sticky' ? headerHeight + 40 : 40;
      const current = sections.filter(node => node.getBoundingClientRect().top <= offset)
        .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
      setActiveSection(current?.id ?? '');
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(() => {
      headerHeight = header.current?.offsetHeight ?? 100;
      page.style.setProperty('--king-header-offset', `${headerHeight + 32}px`);
      schedule();
    });
    if (header.current) resize.observe(header.current);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!motion.matches) entry.target.animate(
          [{ opacity: .65, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 420, easing: 'ease-out' },
        );
        reveal.unobserve(entry.target);
      });
    }, { threshold: .08 });
    page.querySelectorAll('.king-section-heading, .king-info-card, .king-metrics').forEach(node => reveal.observe(node));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      reveal.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      page.style.removeProperty('--king-header-offset');
    };
  }, [header]);
  return activeSection;
}
