import { createButtonCarousel, type ButtonCarouselItem } from "button-carousel";

// Public, freely-usable demo assets — no local binaries required.
const IMAGE_SEEDS = ["sunset", "forest", "harbor", "canyon", "orchid", "glacier", "lagoon"];

function image(seed: string): ButtonCarouselItem {
  return {
    type: "image",
    src: `https://picsum.photos/seed/${seed}/400/300`,
    alt: `${seed} photo`,
  };
}

const GIF_SRC = "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif";
const VIDEO_SRC = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const VIDEO_POSTER = "https://picsum.photos/seed/flower-poster/400/300";

function gif(seed = "earth"): ButtonCarouselItem {
  return { type: "gif", src: GIF_SRC, alt: `${seed} gif` };
}

function video(seed = "flower"): ButtonCarouselItem {
  return { type: "video", src: VIDEO_SRC, poster: VIDEO_POSTER, alt: `${seed} video` };
}

function tenMixedItems(): ButtonCarouselItem[] {
  const items: ButtonCarouselItem[] = [];
  for (let i = 0; i < 10; i++) {
    const kind = i % 3;
    if (kind === 0) items.push(image(IMAGE_SEEDS[i % IMAGE_SEEDS.length] + "-" + i));
    else if (kind === 1) items.push(gif("earth-" + i));
    else items.push(video("flower-" + i));
  }
  return items;
}

interface SectionConfig {
  title: string;
  description: string;
  items: ButtonCarouselItem[];
  initialIndex?: number;
}

const sections: SectionConfig[] = [
  {
    title: "Just Images",
    description: "A carousel containing multiple image items only.",
    items: IMAGE_SEEDS.slice(0, 5).map((seed) => image(seed)),
  },
  {
    title: "Single Image",
    description: "A carousel containing exactly 1 image.",
    items: [image("single-image")],
  },
  {
    title: "Single Video",
    description: "A carousel containing exactly 1 video.",
    items: [video("single-video")],
  },
  {
    title: "Single GIF",
    description: "A carousel containing exactly 1 GIF.",
    items: [gif("single-gif")],
  },
  {
    title: "Mixed Media",
    description: "A carousel using all 3 media modes: image, GIF, and video.",
    items: [image("mixed-image"), gif("mixed-gif"), video("mixed-video")],
  },
  {
    title: "Mixed Media — 10 Items",
    description:
      "A carousel using 10 total items, mixing images, GIFs, and videos. Click different buttons to see the active state animate and shift.",
    items: tenMixedItems(),
  },
  {
    title: "photos 4",
    description: "A carousel containing 4 images.",
    items: IMAGE_SEEDS.slice(0, 4).map((seed) => image(seed)),
  },
  {
    title: "photos 5",
    description: "A carousel containing 5 images.",
    items: IMAGE_SEEDS.slice(0, 5).map((seed) => image(seed)),
  },
  {
    title: "photos 6",
    description: "A carousel containing 6 images.",
    items: IMAGE_SEEDS.slice(0, 6).map((seed) => image(seed)),
  },
];

const sectionsRoot = document.getElementById("sections");

if (!sectionsRoot) {
  throw new Error("#sections root element not found");
}

for (const section of sections) {
  const sectionEl = document.createElement("section");
  sectionEl.className = "demo-section";

  const heading = document.createElement("h2");
  heading.textContent = section.title;
  sectionEl.appendChild(heading);

  const description = document.createElement("p");
  description.className = "description";
  description.textContent = section.description;
  sectionEl.appendChild(description);

  const slot = document.createElement("div");
  slot.className = "demo-carousel-slot";
  sectionEl.appendChild(slot);

  sectionsRoot.appendChild(sectionEl);

  createButtonCarousel({
    container: slot,
    items: section.items,
    initialIndex: section.initialIndex ?? 0,
  });
}
