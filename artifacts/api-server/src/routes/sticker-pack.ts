import { gzipSync } from "node:zlib";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PACK_TITLE = "GoldAce 6-7";
const STICKERS = [
  { file: "01.json", emoji: "🏈" },
  { file: "02.json", emoji: "🎾" },
  { file: "03.json", emoji: "🏀" },
] as const;
const YELLOW_PACK_TITLE = "GoldAce Sticker Pack";
const YELLOW_STICKERS = [
  { file: "01.tgs", emoji: "😍" },
  { file: "02.tgs", emoji: "😬" },
  { file: "03.tgs", emoji: "🏴" },
  { file: "04.tgs", emoji: "🤨" },
  { file: "05.tgs", emoji: "🎲" },
] as const;

type TelegramOk<T> = { ok: true; result: T };
type TelegramError = { ok: false; error_code: number; description: string };
type TelegramResponse<T> = TelegramOk<T> | TelegramError;

type TelegramBot = {
  id: number;
  username?: string;
};

type TelegramUpdate = {
  message?: { from?: { id: number } };
  callback_query?: { from?: { id: number } };
};

type TelegramSticker = { file_id: string };
type TelegramStickerSet = { stickers: TelegramSticker[] };

class TelegramRequestError extends Error {
  constructor(
    readonly method: string,
    readonly status: number,
    readonly description: string,
  ) {
    super(`Telegram ${method} failed: ${description}`);
  }
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return token;
}

async function telegramJson<T>(
  method: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${getBotToken()}/${method}`,
    payload
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      : undefined,
  );
  const result = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !result.ok) {
    throw new TelegramRequestError(
      method,
      response.status,
      result.ok ? "Unknown Telegram error" : result.description,
    );
  }
  return result.result;
}

async function telegramForm<T>(method: string, form: FormData): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${getBotToken()}/${method}`,
    { method: "POST", body: form },
  );
  const result = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !result.ok) {
    throw new TelegramRequestError(
      method,
      response.status,
      result.ok ? "Unknown Telegram error" : result.description,
    );
  }
  return result.result;
}

function asUploadBlob(file: Buffer): Blob {
  const bytes = new Uint8Array(file.byteLength);
  bytes.set(file);
  return new Blob([bytes.buffer], { type: "application/gzip" });
}

function cleanAnimation(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cleanAnimation);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const cleaned = Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      cleanAnimation(child),
    ]),
  ) as Record<string, unknown>;

  if (Array.isArray(cleaned.layers)) {
    cleaned.layers = cleaned.layers.filter((layer) => {
      if (!layer || typeof layer !== "object") return true;
      const layerRecord = layer as Record<string, unknown>;
      const layerName = String(layerRecord.nm ?? "");
      return (
        layerRecord.ty !== 5 &&
        !/(raika|goldace|acegold|embedded|lettering|cover|name)/i.test(
          layerName,
        )
      );
    });
  }

  return cleaned;
}

function assetDirectory(): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "artifacts/mockup-sandbox/public/images/goldace",
    ),
    path.resolve(process.cwd(), "../mockup-sandbox/public/images/goldace"),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../mockup-sandbox/public/images/goldace",
    ),
  ];
  return (
    candidates.find((candidate) =>
      existsSync(path.join(candidate, STICKERS[0].file)),
    ) ?? candidates[0]
  );
}

function customAssetDirectory(): string {
  const candidates = [
    path.resolve(
      process.cwd(),
      "artifacts/mockup-sandbox/public/images/goldace-custom",
    ),
    path.resolve(
      process.cwd(),
      "../mockup-sandbox/public/images/goldace-custom",
    ),
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../mockup-sandbox/public/images/goldace-custom",
    ),
  ];
  return (
    candidates.find((candidate) =>
      existsSync(path.join(candidate, YELLOW_STICKERS[0].file)),
    ) ?? candidates[0]
  );
}

async function loadCleanTgs(file: string): Promise<Buffer> {
  const source = JSON.parse(
    await readFile(path.join(assetDirectory(), file), "utf8"),
  );
  const cleaned = cleanAnimation(source);
  const serialized = JSON.stringify(cleaned);

  if (/(raika|goldace|acegold)/i.test(serialized)) {
    throw new Error(`Embedded name remained in cleaned animation ${file}`);
  }

  return gzipSync(Buffer.from(serialized, "utf8"));
}

async function loadYellowTgs(file: string): Promise<Buffer> {
  return readFile(path.join(customAssetDirectory(), file));
}

async function findTelegramUserId(): Promise<number> {
  const updates = await telegramJson<TelegramUpdate[]>("getUpdates", {
    limit: 100,
    timeout: 0,
  });

  for (const update of [...updates].reverse()) {
    const userId =
      update.message?.from?.id ?? update.callback_query?.from?.id;
    if (userId) return userId;
  }

  throw new Error(
    "No Telegram user was found. Send /start to the bot, then publish again.",
  );
}

async function stickerSetExists(
  shortName: string,
): Promise<TelegramStickerSet | null> {
  try {
    return await telegramJson<TelegramStickerSet>("getStickerSet", {
      name: shortName,
    });
  } catch (error) {
    if (
      error instanceof TelegramRequestError &&
      error.status === 400 &&
      /not found|invalid sticker set|stickerset_invalid/i.test(
        error.description,
      )
    ) {
      return null;
    }
    throw error;
  }
}

async function createStickerSet(
  userId: number,
  shortName: string,
  files: Buffer[],
  stickers: ReadonlyArray<{ emoji: string }>,
  title: string,
): Promise<void> {
  const form = new FormData();
  form.set("user_id", String(userId));
  form.set("name", shortName);
  form.set("title", title);
  form.set("sticker_format", "animated");
  form.set(
    "stickers",
    JSON.stringify(
      stickers.map(({ emoji }, index) => ({
        sticker: `attach://sticker_${index}`,
        format: "animated",
        emoji_list: [emoji],
      })),
    ),
  );

  files.forEach((file, index) => {
    form.set(
      `sticker_${index}`,
      asUploadBlob(file),
      `${index + 1}.tgs`,
    );
  });

  await telegramForm("createNewStickerSet", form);
}

async function replaceExistingStickerSet(
  userId: number,
  shortName: string,
  existing: TelegramStickerSet,
  files: Buffer[],
  stickers: ReadonlyArray<{ emoji: string }>,
): Promise<void> {
  // Add the new files before removing the old ones so Telegram never sees an
  // empty sticker set during a replacement.
  for (const [index, file] of files.entries()) {
    const form = new FormData();
    form.set("user_id", String(userId));
    form.set("name", shortName);
    form.set(
      "sticker",
      JSON.stringify({
        sticker: "attach://file",
        format: "animated",
        emoji_list: [stickers[index].emoji],
      }),
    );
    form.set(
      "file",
      asUploadBlob(file),
      `${index + 1}.tgs`,
    );
    await telegramForm("addStickerToSet", form);
  }

  for (const sticker of existing.stickers) {
    await telegramJson("deleteStickerFromSet", { sticker: sticker.file_id });
  }
}

router.post("/sticker-pack/publish", async (req, res) => {
  try {
    const bot = await telegramJson<TelegramBot>("getMe");
    if (!bot.username) {
      throw new Error("The Telegram bot does not have a username");
    }

    const userId = await findTelegramUserId();
    const shortName = `goldace67_by_${bot.username}`;
    const files = await Promise.all(
      STICKERS.map(({ file }) => loadCleanTgs(file)),
    );
    const existing = await stickerSetExists(shortName);

    if (existing) {
      await replaceExistingStickerSet(userId, shortName, existing, files, STICKERS);
    } else {
      await createStickerSet(userId, shortName, files, STICKERS, PACK_TITLE);
    }

    req.log.info(
      { shortName, stickerCount: files.length, replaced: Boolean(existing) },
      "Published clean Telegram sticker pack",
    );
    res.json({
      ok: true,
      title: PACK_TITLE,
      shortName,
      stickerCount: files.length,
      replaced: Boolean(existing),
      packUrl: `https://t.me/addstickers/${shortName}`,
      embeddedNamesRemoved: true,
    });
  } catch (error) {
    req.log.error({ err: error }, "Telegram sticker pack publish failed");
    const message =
      error instanceof Error ? error.message : "Sticker pack publish failed";
    const status = /TELEGRAM_BOT_TOKEN/.test(message) ? 503 : 502;
    res.status(status).json({ ok: false, message });
  }
});

router.post("/sticker-pack/publish-yellow", async (req, res) => {
  try {
    const bot = await telegramJson<TelegramBot>("getMe");
    if (!bot.username) {
      throw new Error("The Telegram bot does not have a username");
    }

    const userId = await findTelegramUserId();
    const shortName = `goldacestickerpack_by_${bot.username.toLowerCase()}`;
    const files = await Promise.all(
      YELLOW_STICKERS.map(({ file }) => loadYellowTgs(file)),
    );
    const existing = await stickerSetExists(shortName);

    if (existing) {
      await replaceExistingStickerSet(
        userId,
        shortName,
        existing,
        files,
        YELLOW_STICKERS,
      );
    } else {
      await createStickerSet(
        userId,
        shortName,
        files,
        YELLOW_STICKERS,
        YELLOW_PACK_TITLE,
      );
    }

    req.log.info(
      { shortName, stickerCount: files.length, replaced: Boolean(existing) },
      "Published yellow mascot sticker pack",
    );
    res.json({
      ok: true,
      title: YELLOW_PACK_TITLE,
      shortName,
      stickerCount: files.length,
      replaced: Boolean(existing),
      packUrl: `https://t.me/addstickers/${shortName}`,
      sourceStickersEdited: 5,
      mascotReplaced: true,
      yellowThemeApplied: true,
    });
  } catch (error) {
    req.log.error({ err: error }, "Yellow mascot sticker pack publish failed");
    const message =
      error instanceof Error
        ? error.message
        : "Yellow mascot sticker pack publish failed";
    const status = /TELEGRAM_BOT_TOKEN/.test(message) ? 503 : 502;
    res.status(status).json({ ok: false, message });
  }
});

export default router;