const averageWordsPerMinute = 220;

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function formatReadTime(wordCount) {
  const minutes = Math.max(1, Math.ceil(wordCount / averageWordsPerMinute));
  return `${minutes} phút đọc`;
}

function updateReadTime() {
  const article = document.querySelector(".post-article");
  const readTimeNode = document.querySelector("[data-read-time]");

  if (!article || !readTimeNode) {
    return;
  }

  const text = article.innerText || article.textContent || "";
  const wordCount = countWords(text);
  readTimeNode.textContent = formatReadTime(wordCount);
}

window.addEventListener("load", updateReadTime);
