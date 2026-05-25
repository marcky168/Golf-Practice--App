import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Golf Practice OS",
    short_name: "Golf OS",
    description: "Deliberate golf practice — Quick Block, Session Builder, Transfer, Games.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F2E9",
    theme_color: "#0F5132",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      // Recommended: Generate PNG versions (192x192, 512x512, maskable 512) from the SVG
      // using any online SVG to PNG converter or tools like https://progressier.com or https://realfavicongenerator.net
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["sports", "health", "productivity"],
    shortcuts: [
      {
        name: "Quick Block",
        short_name: "Block",
        url: "/practice/block",
      },
      {
        name: "Random / Transfer",
        short_name: "Transfer",
        url: "/practice/random",
      },
    ],
  };
}
