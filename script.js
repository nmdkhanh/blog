const navToggle = document.querySelector(".nav-toggle");
const navLinks = [...document.querySelectorAll(".nav-link")];
const sections = [...document.querySelectorAll("main section[id]")];
const postCount = document.getElementById("postCount");
const latestPosts = document.getElementById("latestPosts");
const subscribeForm = document.querySelector(".subscribe-form");
const bookShelf = document.getElementById("bookShelf");
const shelfPrev = document.getElementById("shelfPrev");
const shelfNext = document.getElementById("shelfNext");
let revealObserver;

navToggle?.addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("menu-open");
  });
});

function updateActiveSection() {
  const offset = window.scrollY + window.innerHeight * 0.28;
  let current = sections[0]?.id;

  sections.forEach((section) => {
    if (offset >= section.offsetTop) {
      current = section.id;
    }
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${current}`;
    link.classList.toggle("active", isActive);
  });
}

function handleTilt(event) {
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  const px = (event.clientX - bounds.left) / bounds.width;
  const py = (event.clientY - bounds.top) / bounds.height;
  const rotateY = (px - 0.5) * 10;
  const rotateX = (0.5 - py) * 10;

  card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
}

function resetTilt(event) {
  event.currentTarget.style.transform = "";
}

function attachTilt() {
  document.querySelectorAll(".story-card").forEach((card) => {
    card.addEventListener("pointermove", handleTilt);
    card.addEventListener("pointerleave", resetTilt);
  });
}

function setupReveal() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((node) => {
    revealObserver.observe(node);
  });
}

shelfPrev?.addEventListener("click", () => {
  bookShelf.scrollBy({ left: -260, behavior: "smooth" });
});

shelfNext?.addEventListener("click", () => {
  bookShelf.scrollBy({ left: 260, behavior: "smooth" });
});

subscribeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
});

function updatePostCount(totalPosts) {
  postCount?.replaceChildren(document.createTextNode(String(totalPosts).padStart(2, "0")));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPosts(posts) {
  updatePostCount(posts.length);

  if (!latestPosts) {
    return;
  }

  if (posts.length === 0) {
    latestPosts.innerHTML = '<p class="empty-state reveal is-visible">Chua co bai viet nao trong thu muc posts.</p>';
    return;
  }

  latestPosts.innerHTML = posts
    .slice(0, 3)
    .map(
      (post) => `
        <a class="story-card tilt-card reveal story-link" href="${escapeHtml(post.href)}">
          <div class="story-image" style="background-image: url('${escapeHtml(post.coverImage || "assets/thumb-scholar.png")}')"></div>
          <div class="story-body">
            <span class="story-tag">${escapeHtml(post.category || "Bai viet")}</span>
            <h3>${escapeHtml(post.title || "")}</h3>
            <p>${escapeHtml(post.excerpt || "")}</p>
            <div class="story-meta">
              <span>${escapeHtml(post.displayDate || "")}</span>
              <span>${escapeHtml(post.readTime || "")}</span>
            </div>
          </div>
        </a>
      `
    )
    .join("");
}

function renderReadingList(books) {
  if (!bookShelf) {
    return;
  }

  if (books.length === 0) {
    bookShelf.innerHTML = '<p class="empty-state reveal is-visible">Chua co sach nao trong thu muc reading-list.</p>';
    return;
  }

  bookShelf.innerHTML = books
    .map((book) => {
      const imageStyle = book.coverImage
        ? ` style="background-image: url('${escapeHtml(book.coverImage)}')"`
        : "";
      const coverText = String(book.coverText || book.title || "")
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br />");

      return `
        <article class="book-card reveal">
          <div class="book-cover ${escapeHtml(book.coverStyle || "light")}"${imageStyle}>${coverText}</div>
          <h3>${escapeHtml(book.title || "")}</h3>
          <p>${escapeHtml(book.author || "")}</p>
        </article>
      `;
    })
    .join("");
}

async function loadCollections() {
  try {
    const [postsResponse, booksResponse] = await Promise.all([
      fetch("/api/posts"),
      fetch("/api/reading-list"),
    ]);

    if (!postsResponse.ok || !booksResponse.ok) {
      throw new Error("API response failed");
    }

    const posts = await postsResponse.json();
    const books = await booksResponse.json();

    renderPosts(posts);
    renderReadingList(books);
    attachTilt();
    setupReveal();
  } catch {
    updatePostCount(0);

    if (latestPosts) {
      latestPosts.innerHTML =
        '<p class="empty-state reveal is-visible">Khong the tai bai viet. Hay mo site bang local server thay vi mo file HTML truc tiep.</p>';
    }

    if (bookShelf) {
      bookShelf.innerHTML =
        '<p class="empty-state reveal is-visible">Khong the tai tu sach. Hay mo site bang local server thay vi mo file HTML truc tiep.</p>';
    }
  }
}

window.addEventListener("scroll", () => {
  updateActiveSection();
});

window.addEventListener("load", () => {
  updateActiveSection();
  loadCollections();
  setupReveal();
});
