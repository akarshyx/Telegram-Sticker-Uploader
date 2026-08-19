import { useEffect, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web";

const stickers = [
  { file: "01.tgs", label: "Sticker 01" },
  { file: "02.tgs", label: "Sticker 02" },
  { file: "03.tgs", label: "Sticker 03" },
  { file: "04.tgs", label: "Sticker 04" },
  { file: "05.tgs", label: "Sticker 05" },
];

async function readTgsAnimation(file: string): Promise<unknown> {
  const response = await fetch(
    `/__mockup/images/goldace-custom/${file}?v=1`,
  );
  if (!response.ok) throw new Error("Sticker preview unavailable");

  if (!("DecompressionStream" in window)) {
    throw new Error("This browser cannot preview animated TGS stickers");
  }

  const compressed = await response.arrayBuffer();
  const decompressed = await new Response(
    new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
  return JSON.parse(new TextDecoder().decode(decompressed));
}

function AnimatedSticker({ file, label }: { file: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let animation: AnimationItem | null = null;
    let disposed = false;

    readTgsAnimation(file)
      .then((animationData) => {
        if (disposed || !containerRef.current) return;
        animation = lottie.loadAnimation({
          animationData,
          autoplay: true,
          container: containerRef.current,
          loop: true,
          renderer: "svg",
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
          },
        });
        animation.goToAndPlay(Math.min(70, animation.totalFrames - 1), true);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      animation?.destroy();
    };
  }, [file]);

  return (
    <div
      style={{
        alignItems: "center",
        aspectRatio: "1",
        background:
          "radial-gradient(circle at 50% 40%, rgba(255,255,255,.96), rgba(244,229,190,.72) 60%, rgba(218,173,73,.3))",
        border: "1px solid rgba(137, 92, 20, .18)",
        borderRadius: 28,
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-label={label}
        ref={containerRef}
        style={{
          bottom: 0,
          left: 0,
          opacity: failed ? 0 : 1,
          position: "absolute",
          right: 0,
          top: 0,
          width: "100%",
        }}
      />
      {failed ? (
        <div
          style={{
            color: "#8e691d",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            position: "absolute",
          }}
        >
          Preview unavailable
        </div>
      ) : null}
      <span
        style={{
          background: "rgba(255, 250, 239, .86)",
          border: "1px solid rgba(137, 92, 20, .14)",
          borderRadius: 999,
          bottom: 12,
          color: "#8e691d",
          fontFamily: "Inter, sans-serif",
          fontSize: 10,
          fontWeight: 700,
          left: 12,
          letterSpacing: ".14em",
          padding: "6px 9px",
          position: "absolute",
          textTransform: "uppercase",
        }}
      >
        Gold finish
      </span>
    </div>
  );
}

export function GoldAce() {
  const [publishState, setPublishState] = useState<
    "idle" | "publishing" | "success" | "error"
  >("idle");
  const [publishMessage, setPublishMessage] = useState("");

  async function publishPack(): Promise<void> {
    setPublishState("publishing");
    setPublishMessage("");
    try {
      const response = await fetch("/api/sticker-pack/publish-yellow", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        packUrl?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ?? "Telegram could not publish the sticker pack",
        );
      }
      setPublishState("success");
      setPublishMessage(
        data.packUrl
          ? `Published cleanly. Open ${data.packUrl}`
          : "Published cleanly to Telegram.",
      );
    } catch (error) {
      setPublishState("error");
      setPublishMessage(
        error instanceof Error ? error.message : "Publish failed",
      );
    }
  }

  return (
    <main
      style={{
        background:
          "linear-gradient(135deg, #24180a 0%, #4b2e0e 42%, #1c140b 100%)",
        boxSizing: "border-box",
        color: "#fffaf0",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        minHeight: "100vh",
        padding: "clamp(28px, 6vw, 72px)",
      }}
    >
      <div style={{ margin: "0 auto", maxWidth: 1180 }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            marginBottom: 52,
          }}
        >
          <div
            style={{
              color: "#f1c75b",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: ".22em",
              textTransform: "uppercase",
            }}
          >
            Sticker pack preview
          </div>
          <div
            style={{
              border: "1px solid rgba(241, 199, 91, .45)",
              borderRadius: 999,
              color: "#f1c75b",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".12em",
              padding: "8px 12px",
              textTransform: "uppercase",
            }}
          >
            Preview only
          </div>
        </div>

        <section
          style={{
            alignItems: "end",
            display: "grid",
            gap: 28,
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(260px, .95fr)",
            marginBottom: 54,
          }}
        >
          <div>
            <p
              style={{
                color: "#f1c75b",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: ".12em",
                margin: "0 0 16px",
                textTransform: "uppercase",
              }}
            >
              GoldAce Sticker Pack
            </p>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(48px, 8vw, 94px)",
                fontWeight: 400,
                letterSpacing: "-.06em",
                lineHeight: ".9",
                margin: 0,
              }}
            >
              GoldAce
            </h1>
            <p
              style={{
                color: "rgba(255, 250, 240, .72)",
                fontSize: 17,
                lineHeight: 1.6,
                margin: "28px 0 0",
                maxWidth: 540,
              }}
            >
              A five-sticker animated pack rebuilt around the penguin mascot
              from your reference. The edited TGS files keep the original
              motion while giving the pack a polished navy, white, and gold
              finish.
            </p>
          </div>
          <div
            style={{
              borderLeft: "1px solid rgba(241, 199, 91, .28)",
              color: "rgba(255, 250, 240, .68)",
              fontSize: 13,
              lineHeight: 1.7,
              paddingLeft: 24,
            }}
          >
            <div style={{ color: "#fffaf0", fontWeight: 700 }}>
              Custom pack
            </div>
              <div style={{ marginBottom: 18 }}>Five edited TGS stickers</div>
            <div style={{ color: "#fffaf0", fontWeight: 700 }}>
              Transformation
            </div>
            <div>Penguin mascot artwork applied</div>
            <div>Pack title: GoldAce Sticker Pack</div>
          </div>
        </section>

        <section
          style={{
            alignItems: "center",
            border: "1px solid rgba(241, 199, 91, .28)",
            borderRadius: 20,
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            marginBottom: 22,
            padding: "18px 20px",
          }}
        >
          <div>
            <div style={{ color: "#fffaf0", fontWeight: 700 }}>
              Ready to publish
            </div>
            <div
              style={{
                color: "rgba(255, 250, 240, .62)",
                fontSize: 13,
                marginTop: 5,
              }}
            >
              The five edited TGS files are ready to upload to Telegram.
            </div>
            {publishMessage ? (
              <div
                style={{
                  color:
                    publishState === "error" ? "#ffb5a7" : "#f1c75b",
                  fontSize: 12,
                  marginTop: 8,
                  overflowWrap: "anywhere",
                }}
              >
                {publishMessage}
              </div>
            ) : null}
          </div>
          <button
            disabled={publishState === "publishing"}
            onClick={() => void publishPack()}
            style={{
              background:
                publishState === "publishing" ? "#6e5220" : "#f1c75b",
              border: 0,
              borderRadius: 999,
              color: "#24180a",
              cursor: publishState === "publishing" ? "wait" : "pointer",
              fontWeight: 800,
              minWidth: 152,
              padding: "12px 18px",
            }}
            type="button"
          >
            {publishState === "publishing"
              ? "Publishing…"
              : "Publish sticker pack"}
          </button>
        </section>

        <section
          aria-label="GoldAce Sticker Pack previews"
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          {stickers.map((sticker) => (
            <AnimatedSticker
              file={sticker.file}
              key={sticker.file}
              label={sticker.label}
            />
          ))}
        </section>

        <footer
          style={{
            borderTop: "1px solid rgba(241, 199, 91, .2)",
            color: "rgba(255, 250, 240, .55)",
            fontSize: 12,
            marginTop: 34,
            paddingTop: 18,
          }}
        >
            The Telegram upload creates the pack title “GoldAce Sticker Pack” and
            replaces the pack contents when it already exists.
        </footer>
      </div>
    </main>
  );
}