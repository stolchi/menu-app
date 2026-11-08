import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicCategoryDto } from '@/shared/api/generated/model';

export const sectionId = (categoryId: string) => `category-${categoryId}`;

/** Sticky tabs that jump to a category, and follow along as the page is scrolled. */
export function CategoryTabs({
  categories,
}: {
  categories: PublicCategoryDto[];
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id.replace('category-', ''));
      },
      // A thin band just below the tabs: whichever section crosses it is current.
      { rootMargin: '-72px 0px -85% 0px' },
    );
    for (const { id } of categories) {
      const section = document.getElementById(sectionId(id));
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [categories]);

  // Moves only the tabs: scrolling an element into view could also move the page.
  useEffect(() => {
    const tabs = bar.current;
    const tab = tabs?.querySelector<HTMLElement>('[aria-current="true"]');
    if (tabs && tab) {
      tabs.scrollLeft =
        tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2;
    }
  }, [activeId]);

  return (
    <nav
      ref={bar}
      aria-label={t('menu.categories')}
      className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2.5 [scrollbar-width:none]"
    >
      {categories.map((category) => {
        const active = category.id === activeId;
        return (
          <a
            key={category.id}
            href={`#${sectionId(category.id)}`}
            aria-current={active}
            onClick={() => setActiveId(category.id)}
            className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}
          >
            {category.name}
          </a>
        );
      })}
    </nav>
  );
}
