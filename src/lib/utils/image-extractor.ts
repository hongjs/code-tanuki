export function extractImageUrls(text: string): string[] {
  if (!text) return [];

  const urls: string[] = [];

  // Match markdown images: ![alt](url)
  const markdownRegex = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  // Match HTML img tags: <img src="url"> or <img src='url'>
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = htmlRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  // Deduplicate
  return [...new Set(urls)];
}
