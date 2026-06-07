import { siteConfig } from "@/lib/site";

// Temporary landing — replaced by the full homepage in Pass 4.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex max-w-xl flex-col items-center gap-6">
        <span className="font-mono text-eyebrow tracking-widest text-muted uppercase">
          Building
        </span>
        <h1 className="text-h1 font-display">{siteConfig.name}</h1>
        <p className="text-body-lg text-muted">{siteConfig.description}</p>
      </div>
    </main>
  );
}
