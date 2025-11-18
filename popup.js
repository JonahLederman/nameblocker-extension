document.getElementById("toggle").addEventListener("click", () => {
  chrome.storage.local.get("enabled", ({ enabled }) => {
    const newState = !enabled;
    chrome.storage.local.set({ enabled: newState }, () => {
      alert("Name Blocker " + (newState ? "enabled" : "disabled"));
    });
  });
});
