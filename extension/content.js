// Runs on every YouTube page — listens for requests from the popup

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_VIDEO_URL") {
    // Works for regular watch pages AND YouTube Shorts
    const url = window.location.href;
    const isVideo =
      url.includes("youtube.com/watch?") ||
      url.includes("youtube.com/shorts/");
    sendResponse({ url: isVideo ? url : null });
  }
  return true; // keep channel open for async
});
