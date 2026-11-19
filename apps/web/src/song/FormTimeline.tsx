import type { FormItem, ResolvedSection } from "@takt/format";
import { useApp } from "../app-context.tsx";
import { sectionAnchor } from "./SectionTile.tsx";

/** The form of the song as one row of blocks, sized by bars × repeats. Tapping a block scrolls to the section. */
export function FormTimeline({
  form,
  sections,
}: {
  form: FormItem[];
  sections: ResolvedSection[];
}) {
  const { t } = useApp();
  return (
    <nav aria-label={t("song.form")} className="flex gap-1 px-3">
      {form.map((item) => {
        const section = sections[item.section];
        return (
          <button
            type="button"
            key={item.section}
            data-section={item.type}
            aria-label={section?.name}
            onClick={() =>
              document
                .getElementById(sectionAnchor(item.section))
                ?.scrollIntoView({ block: "start", behavior: "smooth" })
            }
            className="flex h-[30px] min-w-6 items-end overflow-hidden rounded-block bg-tile px-1 pb-0.5 text-[11px] font-extrabold text-ink"
            style={{ flex: `${Math.max(1, item.bars * item.repeat)} 1 0` }}
          >
            {item.abbr}
          </button>
        );
      })}
    </nav>
  );
}

/** The 4 px form strip used in list rows. */
export function MiniFormStrip({ form }: { form: FormItem[] }) {
  return (
    <div aria-hidden="true" className="flex h-1 gap-0.5">
      {form.map((item) => (
        <span
          key={item.section}
          data-section={item.type}
          className="bg-strip"
          style={{ flex: `${Math.max(1, item.bars * item.repeat)} 1 0` }}
        />
      ))}
    </div>
  );
}
