//rahhh

const visibletext = document.body.innerText;
fetch('https://raw.githubusercontent.com/Ev-ring/nameblocker-extension/main/first-names.txt')
  .then(res => res.text())
  .then(text => {
    const names = text;

for (txt of visibletext){
    if (txt == 
}

function censorNames(wordList){
//--START OF FUNCTION--
   const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );   

}
