//rahhh

const visibletext = document.body.innerText;
const nameList = fetch('https://github.com/first-names.txt')
.then(response => response.json())
      .then(data => {
        console.log('User created:', data);
      })
      .catch(error => {
        console.error('Error creating user:', error);
      });

for (txt of visibletext){
    if (txt == 
}
  
