'use client';
import { useEffect, useState, type RefObject } from 'react';
import { kingTaskFromLocation, type KingTask } from './king-task-navigation';

export function useKingNavigation(header: RefObject<HTMLElement | null>) {
  const [activeSection, setActiveSection] = useState<KingTask>('king-studio');
  useEffect(() => {
    const page = header.current?.closest<HTMLElement>('.king-page');
    if (!page) return;
    let frame = 0;
    const sync = (reveal = false) => {
      const hash = window.location.hash;
      const task = kingTaskFromLocation(hash, window.location.search);
      setActiveSection(task);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        let parent: HTMLElement | null = target;
        while (parent && parent !== page) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
          parent = parent.parentElement;
        }
        if (reveal) (target ?? document.getElementById(`panel-${task}`))?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    };
    const onLocation = () => sync(true);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#king-"]');
      if (!anchor) return;
      const hash = anchor.getAttribute('href')!;
      if (!['#king-studio', '#king-mint', '#king-lookup', '#king-guide', '#king-faq', '#king-contracts'].includes(hash)) return;
      event.preventDefault();
      if (window.location.hash !== hash) window.history.pushState(null, '', hash);
      sync(true);
    };
    const resize = new ResizeObserver(() => {
      page.style.setProperty('--king-header-offset', `${(header.current?.offsetHeight ?? 100) + 24}px`);
    });
    if (header.current) resize.observe(header.current);
    page.addEventListener('click', onClick);
    window.addEventListener('hashchange', onLocation);
    window.addEventListener('popstate', onLocation);
    sync(Boolean(window.location.hash));
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      page.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onLocation);
      window.removeEventListener('popstate', onLocation);
      page.style.removeProperty('--king-header-offset');
    };
  }, [header]);
  return activeSection;
}
