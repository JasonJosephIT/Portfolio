// Art pieces from src/data/art.json, each with its imported image (width/height come from the file).
import art from "@/data/art.json";

const images = import.meta.glob<{ default: ImageMetadata }>("/src/assets/art/*.jpg", { eager: true });

export const pieces = art.pieces.map((p) => ({ ...p, img: images[`/src/assets/art/${p.image.src}`].default }));
export const selected = art.selected.map((s) => pieces.find((p) => p.slug === s)!);
