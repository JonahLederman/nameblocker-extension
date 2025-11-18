//rahhh
let nameList = [];
fetch(chrome.runtime.getURL('first-names.txt'))
  .then(result => result.text())
  .then(text => {
    nameList = text.split(/\r?\n/).filter(Boolean); // array of names
    censorNames(nameList);
    observeDOMChanges(nameList); // incase of dynamically loaded content
  })
  .catch(error => {
    console.error("Failed to load name list", error);
  });
//to toggle it on and off
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        if (changes.enabled.newValue) {
            censorNames(nameList);
        } else {
            location.reload(); // or undo the spans
        }
    }
});


//MutationObserver function for dynamically loaded pages
//Should add some kind of cooldown
function observeDOMChanges(nameList) {
    const observer = new MutationObserver(() => {
        censorNames(nameList);
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


function censorNames(nameList){
//--START OF FUNCTION--
   const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );   
    let node;
    while (node = walker.nextNode()) {
      const words = node.textContent.split(/(\W+)/);
      // /(W+) keeps punctuation but allows word-by-word detection
      
    let changed = false;
      
    const newWords = words.map(word => {
      if (nameList.includes(word)) {
        changed = true;
        return `<span style="background:black;color:black">${word}</span>`;
      }
      return word;
    });
    //if text is changed, safely replace it so it doesnt destroy the webpage
    if (changed) {
      const span = document.createElement("span");
      span.innerHTML = newWords.join("");
      node.parentNode.replaceChild(span, node);
    }
  }
//--END OF FUNCTION--
}
