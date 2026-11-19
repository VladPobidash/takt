import type { FormItem, ResolvedSection } from "@takt/format";
import { useApp } from "../app-context.tsx";
import { sectionAnchor } from "./SectionTile.tsx";

/** The form of the song as one row of blocks, sized by bars × repeats. Tapping a block scrolls to the section. */
export function FormTimeline(props: {
  form: FormItem[];
  sections: ResolvedSection[];
  /** While auto-scroll runs: the section being played. Earlier ones fade, this one is underlined. */
  current?: number | null;
  /** Called instead of scrolling when a block is tapped while auto-scroll runs. */
  onJump?: (section: number) => void;
}) {
  const { t } = useApp();
  const current = props.current ?? null;
  return (
    <nav aria-label={t("song.form")} className="flex gap-1 px-3">
      {props.form.map((item) => {
        const section = props.sections[item.section];
        const now = current === item.section;
        return (
          <button
            type="button"
            key={item.section}
            data-section={item.type}
            aria-label={section?.name}
            aria-current={now ? "step" : undefined}
            onClick={() => {
              if (current !== null && props.onJump) props.onJump(item.section);
              else
                document
                  .getElementById(sectionAnchor(item.section))
                  ?.scrollIntoView({ block: "start", behavior: "smooth" });
            }}
            className={`flex h-[30px] min-w-6 items-end overflow-hidden rounded-block border-b-[3px] bg-tile px-1 text-[11px] font-extrabold text-ink ${
              now ? "border-signal" : "border-transparent"
            } ${current !== null && item.section < current ? "opacity-45" : ""}`}
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
